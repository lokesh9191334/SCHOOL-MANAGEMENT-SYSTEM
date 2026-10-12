import { getApiAuthHeaders } from './apiAuth'

const API = '/api/face'

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
  if (res && res.status === 401) {
    return body?.error || 'Your session expired. Sign in again.'
  }
  if (!body) return res.statusText || 'Request failed'
  return body.error || body.message || JSON.stringify(body)
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options)
  } catch {
    throw new Error('Cannot reach API server. Check the internet connection or run “npm run server”.')
  }
}

export async function fetchMyFace() {
  const res = await safeFetch(`${API}/me`, { headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body || { enrolled: false }
}

export async function enrollMyFace({ descriptors, photoThumb }) {
  const res = await safeFetch(`${API}/me`, {
    method: 'POST',
    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ descriptors, photoThumb }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function removeMyFace() {
  const res = await safeFetch(`${API}/me`, { method: 'DELETE', headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function markFaceAttendance({ descriptor, location, device }) {
  const res = await safeFetch(`${API}/attendance`, {
    method: 'POST',
    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ descriptor, location, device }),
  })
  const body = await parseResponse(res)
  if (!res.ok && !(body && body.matched === false)) throw new Error(buildErrorMessage(body, res))
  return body || { matched: false, error: 'Scan could not be completed.' }
}

export async function fetchStaffAttendance(date) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : ''
  const res = await safeFetch(`${API}/attendance${qs}`, { headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body || { date: '', summary: null, roster: [], records: [] }
}
