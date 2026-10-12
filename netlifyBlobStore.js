/* Persistent data for Netlify Functions. The Netlify runtime gives each
   function invocation a fresh /tmp, so — like vercelBlobStore.js does on
   Vercel — every API request loads the JSON data files from Netlify Blobs
   into /tmp first, then any fs.writeFileSync calls made while handling the
   request are tracked and persisted back to Blobs just before the response
   is sent. Locally (plain `node server.js`) this module stays dormant and
   the app keeps using the data/ directory on disk. */

import { AsyncLocalStorage } from 'node:async_hooks'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { getStore } from '@netlify/blobs'

export const isNetlifyRuntime = Boolean(
  process.env.NETLIFY ||
    process.env.NETLIFY_DEV ||
    process.env.NETLIFY_BLOBS_CONTEXT ||
    process.env.SITE_ID,
)

function moduleDirectory() {
  try {
    return dirname(fileURLToPath(import.meta.url))
  } catch {
    // Bundled to CJS (Netlify esbuild): import.meta.url is empty — fall back
    // to cwd; on Netlify the data directory comes from /tmp regardless.
    return process.cwd()
  }
}

const projectRoot = moduleDirectory()
const localDataDir = resolve(process.env.DATA_DIR || join(projectRoot, 'data'))
const dataDir = isNetlifyRuntime
  ? join(tmpdir(), 'school-management-system-data')
  : localDataDir

// Must run before vercelBlobStore.js is evaluated (server.js imports this
// module first) so every module that calls getDataDirectory() resolves to
// the /tmp copy while running on Netlify.
if (isNetlifyRuntime) {
  process.env.DATA_DIR = dataDir
}

const STORE_NAME = 'school-management-system-data'
const requestContext = new AsyncLocalStorage()
const originalWriteFileSync = fs.writeFileSync
let writeTrackingInstalled = false
let requestQueue = Promise.resolve()
let storeInstance = null

function dataStore() {
  if (!storeInstance) {
    storeInstance = getStore({ name: STORE_NAME, consistency: 'strong' })
  }
  return storeInstance
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
  if (writeTrackingInstalled || !isNetlifyRuntime) return
  writeTrackingInstalled = true
  fs.writeFileSync = function writeFileSyncWithBlobTracking(filePath, data, ...options) {
    const result = originalWriteFileSync.call(this, filePath, data, ...options)
    const context = requestContext.getStore()
    const relativePath = getDataRelativePath(filePath)
    if (context && relativePath) {
      context.writes.set(relativePath, {
        body: Buffer.isBuffer(data) ? data : Buffer.from(String(data)),
      })
    }
    return result
  }
}

async function loadBlobData() {
  const store = dataStore()

  await fs.promises.rm(dataDir, { recursive: true, force: true })
  await fs.promises.mkdir(dataDir, { recursive: true })

  const etags = new Map()
  const { blobs } = await store.list()
  for (const blob of blobs || []) {
    const entry = await store.getWithMetadata(blob.key, { type: 'arrayBuffer' })
    if (!entry || !entry.data) {
      throw new Error(`Could not read persistent data file "${blob.key}".`)
    }
    const localPath = resolve(dataDir, blob.key)
    const localRelative = relative(dataDir, localPath)
    if (
      !localRelative ||
      localRelative === '..' ||
      localRelative.startsWith(`..${sep}`)
    ) {
      throw new Error('Netlify Blobs returned an invalid data path.')
    }
    await fs.promises.mkdir(dirname(localPath), { recursive: true })
    await fs.promises.writeFile(localPath, Buffer.from(entry.data))
    etags.set(blob.key, entry.etag)
  }

  return etags
}

function isConditionalWriteFailure(error) {
  return /precondition|onlyIf|etag|condition|conflict|412/i.test(String(error?.message || ''))
}

async function persistBlobWrites(context) {
  const store = dataStore()
  for (const [key, file] of context.writes) {
    const etag = context.etags.get(key)
    try {
      const result = await store.set(
        key,
        file.body,
        etag ? { onlyIfMatch: etag } : { onlyIfNew: true },
      )
      if (result && result.etag) context.etags.set(key, result.etag)
    } catch (error) {
      if (isConditionalWriteFailure(error)) {
        const conflict = new Error('Data changed during this request. Nothing was overwritten; reload and try again.')
        conflict.status = 409
        throw conflict
      }
      throw error
    }
  }
  context.writes.clear()
}

export function netlifyBlobDataMiddleware(req, res, next) {
  if (!isNetlifyRuntime || !req.path.startsWith('/api/') || req.path === '/api/health') {
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
              console.error('Netlify Blobs persistence failed:', error?.message || error)
              if (res.headersSent) {
                release()
                return res.end()
              }
              res.status(error.status || 503)
              return sendJson({
                error: error.status === 409
                  ? error.message
                  : 'Could not save data to Netlify Blobs. No successful save was confirmed.',
              })
            })
        }
        next()
      })
    })
    .catch((error) => {
      console.error('Netlify Blobs initialization failed:', error?.message || error)
      release()
      next(error)
    })
}
