import app from '../server.js'

export default function apiHandler(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost')
  const route = requestUrl.searchParams.get('__route')

  if (!route || route.includes('..') || route.includes('\\')) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Invalid API route.' }))
    return
  }

  requestUrl.searchParams.delete('__route')
  const query = requestUrl.searchParams.toString()
  req.url = `/api/${route}${query ? `?${query}` : ''}`
  return app(req, res)
}
