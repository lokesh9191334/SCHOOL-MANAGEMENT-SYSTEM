import { getAuthUser } from '../utils/session'

const API = '/api/login-tracks'

function authHeaders() {
  const user = getAuthUser()
  return { 'x-auth-email': user?.email || '' }
}

async function parseResponse(res) {
  const txt = await res.text()
  if (!txt) return null
  try {
    return JSON.parse(txt)
  } catch {
    throw new Error('Invalid JSON response from server')
  }
}

function buildErrorMessage(body, res) {
  if (res && (res.status === 502 || res.status === 503 || res.status === 504)) {
    return 'API server is not running. Start it with: npm run server (or use npm run dev:all).'
  }
  if (res && (res.status === 401 || res.status === 403)) {
    return body?.error || 'Admin access required for login tracks.'
  }
  if (!body) return res.statusText || 'Request failed'
  return body.error || body.message || JSON.stringify(body)
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options)
  } catch {
    throw new Error('Cannot reach API server. Run “npm run server” in another terminal (port 5000).')
  }
}

export async function fetchTracks(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) qs.set(key, String(value))
  })
  const res = await safeFetch(`${API}?${qs.toString()}`, { headers: authHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body || { events: [], summary: null }
}

export async function fetchTracksSummary() {
  const res = await safeFetch(`${API}/summary`, { headers: authHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function reviewTrack(id, reviewer) {
  const res = await safeFetch(`${API}/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ reviewer }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function fetchAnalytics() {
  const res = await safeFetch(`${API}/analytics`, { headers: authHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function fetchDevices() {
  const res = await safeFetch(`${API}/devices`, { headers: authHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body?.devices || []
}

export async function setDeviceTrust({ email, fingerprint, trust }) {
  const res = await safeFetch(`${API}/devices/trust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ email, fingerprint, trust }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function fetchWatchlist() {
  const res = await safeFetch(`${API}/watchlist`, { headers: authHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body?.watchlist || []
}

export async function updateWatchlist({ ip, action, note }) {
  const res = await safeFetch(`${API}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ ip, action, note }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}
