import { AsyncLocalStorage } from 'node:async_hooks'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { BlobPreconditionFailedError, get, list, put } from '@vercel/blob'

const isVercelRuntime = Boolean(process.env.VERCEL)
const projectRoot = dirname(fileURLToPath(import.meta.url))
const localDataDir = resolve(process.env.DATA_DIR || join(projectRoot, 'data'))
const dataDir = isVercelRuntime
  ? join(tmpdir(), 'school-management-system-data')
  : localDataDir
const blobPrefix = 'school-management-system/data/'
const requestContext = new AsyncLocalStorage()
const originalWriteFileSync = fs.writeFileSync
let writeTrackingInstalled = false
let requestQueue = Promise.resolve()

if (isVercelRuntime) {
  process.env.DATA_DIR = dataDir
}

export function getDataDirectory() {
  return dataDir
}

export function hasVercelBlobCredentials() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  )
}

function getDataRelativePath(filePath) {
  if (typeof filePath !== 'string') return null
  const relativePath = relative(dataDir, resolve(filePath))
  if (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    resolve(filePath) === dataDir
  ) {
    return null
  }
  return relativePath.split(sep).join('/')
}

function installWriteTracking() {
  if (writeTrackingInstalled || !isVercelRuntime) return
  writeTrackingInstalled = true
  fs.writeFileSync = function writeFileSyncWithBlobTracking(filePath, data, ...options) {
    const result = originalWriteFileSync.call(this, filePath, data, ...options)
    const context = requestContext.getStore()
    const relativePath = getDataRelativePath(filePath)
    if (context && relativePath) {
      context.writes.set(`${blobPrefix}${relativePath}`, {
        body: Buffer.isBuffer(data) ? data : Buffer.from(String(data)),
      })
    }
    return result
  }
}

async function loadBlobData() {
  if (!hasVercelBlobCredentials()) {
    throw new Error('Connect a private Vercel Blob store to this project before using the API.')
  }

  await fs.promises.rm(dataDir, { recursive: true, force: true })
  await fs.promises.mkdir(dataDir, { recursive: true })

  const etags = new Map()
  let cursor
  do {
    const page = await list({ prefix: blobPrefix, limit: 1000, cursor })
    for (const blob of page.blobs) {
      const stored = await get(blob.pathname, { access: 'private', useCache: false })
      if (!stored || stored.statusCode !== 200) {
        throw new Error(`Could not read persistent data file "${blob.pathname}".`)
      }
      const relativePath = blob.pathname.slice(blobPrefix.length)
      const localPath = resolve(dataDir, relativePath)
      const localRelative = relative(dataDir, localPath)
      if (
        !localRelative ||
        localRelative === '..' ||
        localRelative.startsWith(`..${sep}`)
      ) {
        throw new Error('Vercel Blob returned an invalid data path.')
      }
      await fs.promises.mkdir(dirname(localPath), { recursive: true })
      const bytes = Buffer.from(await new Response(stored.stream).arrayBuffer())
      await fs.promises.writeFile(localPath, bytes)
      etags.set(blob.pathname, blob.etag)
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  return etags
}

async function persistBlobWrites(context) {
  for (const [pathname, file] of context.writes) {
    const etag = context.etags.get(pathname)
    try {
      const blob = await put(pathname, file.body, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: Boolean(etag),
        contentType: 'application/json',
        ...(etag ? { ifMatch: etag } : {}),
      })
      context.etags.set(pathname, blob.etag)
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) {
        const conflict = new Error('Data changed during this request. Nothing was overwritten; reload and try again.')
        conflict.status = 409
        throw conflict
      }
      throw error
    }
  }
  context.writes.clear()
}

export function vercelBlobDataMiddleware(req, res, next) {
  if (!isVercelRuntime || !req.path.startsWith('/api/') || req.path === '/api/health') {
    next()
    return
  }

  const previousRequest = requestQueue
  let releaseRequest
  requestQueue = new Promise((resolveRequest) => {
    releaseRequest = resolveRequest
  })
  let released = false
  const release = () => {
    if (released) return
    released = true
    releaseRequest()
  }
  res.once('finish', release)
  res.once('close', release)

  previousRequest
    .then(async () => {
      const context = { etags: await loadBlobData(), writes: new Map() }
      installWriteTracking()
      requestContext.run(context, () => {
        const sendJson = res.json.bind(res)
        let responseStarted = false
        res.json = (body) => {
          if (responseStarted) return sendJson(body)
          responseStarted = true
          return persistBlobWrites(context)
            .then(() => sendJson(body))
            .catch((error) => {
              console.error('Vercel Blob persistence failed:', error?.message || error)
              if (res.headersSent) {
                release()
                return res.end()
              }
              res.status(error.status || 503)
              return sendJson({
                error: error.status === 409
                  ? error.message
                  : 'Could not save data to Vercel Blob. No successful save was confirmed.',
              })
            })
        }
        next()
      })
    })
    .catch((error) => {
      console.error('Vercel Blob initialization failed:', error?.message || error)
      release()
      next(error)
    })
}
