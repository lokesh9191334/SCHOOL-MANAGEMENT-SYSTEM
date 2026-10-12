import serverless from 'serverless-http'
import { connectLambda } from '@netlify/blobs'
import app from '../../server.js'

const expressHandler = serverless(app)

export async function handler(event, context) {
  // Lambda-compat functions receive the Blobs context on the event; without
  // handing it to the SDK every store call throws MissingBlobsEnvironmentError.
  if (event?.blobs) {
    try {
      connectLambda(event)
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
