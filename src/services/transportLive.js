import { getApiAuthHeaders } from './apiAuth'

const API = '/api/transport'

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
    return body?.error || 'API server is not running. Start it with: npm run server (or use npm run dev:all).'
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

export async function fetchTrackingKeys() {
  const res = await safeFetch(`${API}/tracking-keys`, { headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return Array.isArray(body) ? body : []
}

export async function createTrackingKey(payload) {
  const res = await safeFetch(`${API}/tracking-keys`, {
    method: 'POST',
    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function updateTrackingKey(id, patch) {
  const res = await safeFetch(`${API}/tracking-keys/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(patch),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function setTrackingKeyActive(id, active) {
  return updateTrackingKey(id, { active })
}

/* ---- daily WhatsApp delivery ---- */

export async function fetchWhatsAppStatus() {
  const res = await safeFetch(`${API}/whatsapp/status`, { headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body || { configured: false, missing: [], recent: [] }
}

export async function sendTrackingKeyNow(id) {
  const res = await safeFetch(`${API}/tracking-keys/${encodeURIComponent(id)}/send-now`, {
    method: 'POST',
    headers: getApiAuthHeaders(),
  })
  const body = await parseResponse(res)
  if (!res.ok) {
    const error = new Error(buildErrorMessage(body, res))
    error.status = res.status
    error.missing = Array.isArray(body?.missing) ? body.missing : []
    throw error
  }
  return body
}

export async function removeTrackingKey(id) {
  const res = await safeFetch(`${API}/tracking-keys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getApiAuthHeaders(),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function fetchLiveVehicles() {
  const res = await safeFetch(`${API}/live`, { headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body || { vehicles: [], staleAfterSec: 150, now: Date.now() }
}

export async function fetchOverspeedAlerts() {
  const res = await safeFetch(`${API}/overspeed`, { headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body || { alerts: [], limitKmh: 55 }
}

export async function respondOverspeedAlert(id, note = '') {
  const res = await safeFetch(`${API}/overspeed/${encodeURIComponent(id)}/respond`, {
    method: 'POST',
    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ note }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

/** Driver & vehicle records saved by the transport modules (read-only pick lists). */
export async function fetchTransportDirectory() {
  const readList = async (recordsKey) => {
    try {
      const res = await safeFetch(`/api/records/${encodeURIComponent(recordsKey)}`, { headers: getApiAuthHeaders() })
      const body = await parseResponse(res)
      return Array.isArray(body) ? body : []
    } catch {
      return []
    }
  }
  const [drivers, vehicles] = await Promise.all([
    readList('sms_mod_transport_drivers'),
    readList('sms_mod_transport_vehicles'),
  ])
  return { drivers, vehicles }
}

/* ---- public driver endpoints (key is the capability, no login) ---- */

export async function fetchTrackInfo(key) {
  const res = await safeFetch(`/api/track/${encodeURIComponent(key)}`, { headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) {
    const error = new Error(buildErrorMessage(body, res))
    error.status = res.status
    throw error
  }
  return body
}

export async function sendTrackPing(key, fix) {
  const res = await safeFetch(`/api/track/${encodeURIComponent(key)}/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fix),
  })
  const body = await parseResponse(res)
  if (!res.ok) {
    const error = new Error(buildErrorMessage(body, res))
    error.status = res.status
    throw error
  }
  return body || { ok: true }
}
