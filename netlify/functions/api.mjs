import serverless from 'serverless-http'
import { connectLambda } from '@netlify/blobs'
import app from '../../server.js'

const expressHandler = serverless(app)

export async function handler(event, context) {
  // Lambda-compat functions receive the Blobs context on the event; without
  // handing it to the SDK every store call throws MissingBlobsEnvironmentError.
  if (event?.blobs) {
    let payload = null
    try {
      payload = JSON.parse(Buffer.from(event.blobs, 'base64').toString('utf8'))
    } catch {
      payload = null
    }
    try {
      connectLambda(event)
      // connectLambda keeps only {deployID, edgeURL: url, siteID, token} and
      // drops url_uncached, so strong-consistency reads throw
      // BlobsConsistencyError. Merge the uncached URL back into the stored
      // context (base64 JSON in NETLIFY_BLOBS_CONTEXT).
      const uncached = payload?.url_uncached || payload?.url
      if (uncached) {
        const fromGlobal = typeof globalThis.netlifyBlobsContext === 'string' && globalThis.netlifyBlobsContext
          ? globalThis.netlifyBlobsContext
          : null
        const encoded = fromGlobal || process.env.NETLIFY_BLOBS_CONTEXT
        if (encoded) {
          const storeContext = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))
          if (storeContext && !storeContext.uncachedEdgeURL) {
            storeContext.uncachedEdgeURL = uncached
            const reencoded = Buffer.from(JSON.stringify(storeContext)).toString('base64')
            if (fromGlobal) globalThis.netlifyBlobsContext = reencoded
            process.env.NETLIFY_BLOBS_CONTEXT = reencoded
          }
        }
      }
    } catch {
      /* malformed platform payload — let the store surface its own error */
    }
  }
  // netlify.toml rewrites /api/* to this function; the original client URL
  // stays available in rawUrl. Normalise the path so Express always sees
  // the real /api/* route (no-op when Netlify already forwards it).
  try {
    const original = new URL(event.rawUrl)
    if (original.pathname && original.pathname !== event.path) {
      event = { ...event, path: original.pathname }
    }
  } catch {
    /* keep the event as provided */
  }
  return expressHandler(event, context)
}
