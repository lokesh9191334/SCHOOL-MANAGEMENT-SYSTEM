import { AsyncLocalStorage } from 'node:async_hooks'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { BlobPreconditionFailedError, get, list, put } from '@vercel/blob'

const isVercelRuntime = Boolean(process.env.VERCEL)

function moduleDirectory() {
  try {
    return dirname(fileURLToPath(import.meta.url))
  } catch {
    // Bundled to CJS (Netlify esbuild): import.meta.url is empty — fall back
    // to cwd; this module stays inactive outside the Vercel runtime anyway.
    return process.cwd()
  }
}

const projectRoot = moduleDirectory()
const localDataDir = resolve(process.env.DATA_DIR || join(projectRoot, 'data'))
const dataDir = isVercelRuntime
  ? join(tmpdir(), 'school-management-system-data')
  : localDataDir
const blobPrefix = 'school-management-system/data/'
const requestContext = new AsyncLocalStorage()
const originalWriteFileSync = fs.writeFileSync
let writeTrackingInstalled = false
let requestQueue = Promise.resolve()
const BLOB_CACHE_TTL_MS = 4000
const storeCache = { loadedAt: 0, etags: new Map() }

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

function localPathForBlob(pathname) {
  const relativePath = pathname.slice(blobPrefix.length)
  const localPath = resolve(dataDir, relativePath)
  const localRelative = relative(dataDir, localPath)
  if (
    !localRelative ||
    localRelative === '..' ||
    localRelative.startsWith(`..${sep}`)
  ) {
    return null
  }
  return localPath
}

async function downloadBlob(blob, etags) {
  const stored = await get(blob.pathname, { access: 'private', useCache: false })
  if (!stored || stored.statusCode !== 200) {
    throw new Error(`Could not read persistent data file "${blob.pathname}".`)
  }
  const localPath = localPathForBlob(blob.pathname)
  if (!localPath) {
    throw new Error('Vercel Blob returned an invalid data path.')
  }
  await fs.promises.mkdir(dirname(localPath), { recursive: true })
  const bytes = Buffer.from(await new Response(stored.stream).arrayBuffer())
  await fs.promises.writeFile(localPath, bytes)
  etags.set(blob.pathname, blob.etag)
}

async function mapLimit(items, limit, fn) {
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex]
      nextIndex += 1
      await fn(item)
    }
  })
  await Promise.all(workers)
}

async function loadBlobData() {
  if (!hasVercelBlobCredentials()) {
    throw new Error('Connect a private Vercel Blob store to this project before using the API.')
  }

  // Warm instances serve from memory; only a list() + changed blobs otherwise.
  if (storeCache.loadedAt && Date.now() - storeCache.loadedAt < BLOB_CACHE_TTL_MS) {
    return new Map(storeCache.etags)
  }

  if (!storeCache.loadedAt) {
    await fs.promises.rm(dataDir, { recursive: true, force: true })
    await fs.promises.mkdir(dataDir, { recursive: true })
  }

  const etags = new Map()
  const changed = []
  let cursor
  do {
    const page = await list({ prefix: blobPrefix, limit: 1000, cursor })
    for (const blob of page.blobs) {
      const localPath = localPathForBlob(blob.pathname)
      if (
        localPath &&
        storeCache.etags.get(blob.pathname) === blob.etag &&
        fs.existsSync(localPath)
      ) {
        etags.set(blob.pathname, blob.etag)
        continue
      }
      changed.push(blob)
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  await mapLimit(changed, 6, (blob) => downloadBlob(blob, etags))
  storeCache.loadedAt = Date.now()
  storeCache.etags = etags
  return new Map(etags)
}

async function persistBlobWrites(context) {
  await Promise.all(
    [...context.writes].map(async ([pathname, file]) => {
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
        storeCache.etags.set(pathname, blob.etag)
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) {
          const conflict = new Error('Data changed during this request. Nothing was overwritten; reload and try again.')
          conflict.status = 409
          throw conflict
        }
        throw error
      }
    }),
  )
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
