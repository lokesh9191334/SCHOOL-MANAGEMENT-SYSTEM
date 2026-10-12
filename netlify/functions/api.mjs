import serverless from 'serverless-http'
import app from '../../server.js'

const expressHandler = serverless(app)

export async function handler(event, context) {
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
