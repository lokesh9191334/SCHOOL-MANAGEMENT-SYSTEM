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

const REQUEST_TIMEOUT_MS = 25000
const RETRY_DELAY_MS = 800

function networkErrorMessage(cause) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You are offline. Reconnect to the internet and try again.'
  }
  if (cause?.name === 'AbortError') {
    return 'The school server is taking too long to respond. Please try again.'
  }
  if (import.meta.env.DEV) {
    return 'Cannot reach the API server. Check the internet connection or run “npm run server”.'
  }
  return 'Could not reach the school server. Check your internet connection and try again.'
}

async function fetchOnce(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function safeFetch(url, options, { retry } = {}) {
  const method = String(options?.method || 'GET').toUpperCase()
  // Only retry requests that are safe to repeat. Writes such as sending a
  // WhatsApp message must never fire twice because a reply was lost.
  const canRetry = retry ?? (method === 'GET' || method === 'HEAD')
  let lastError = null
  const attempts = canRetry ? 2 : 1
  // Deploys, cold starts and mobile network blips drop a single request far
  // more often than they fail two in a row, so retry once before surfacing it.
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchOnce(url, options)
    } catch (error) {
      lastError = error
      if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    }
  }
  throw new Error(networkErrorMessage(lastError))
}

export async function fetchTrackingKeys() {
  const res = await safeFetch(`${API}/tracking-keys`, { headers: getApiAuthHeaders() })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return Array.isArray(body) ? body : []
}

export async function createTrackingKey(payload) {
  // Same id on the retry so a lost reply cannot create a second link.
  const clientRequestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  const res = await safeFetch(
    `${API}/tracking-keys`,
    {
      method: 'POST',
      headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...payload, clientRequestId }),
    },
    { retry: true },
  )
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res))
  return body
}

export async function updateTrackingKey(id, patch) {
  const res = await safeFetch(
    `${API}/tracking-keys/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(patch),
    },
    { retry: true },
  )
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
  const res = await safeFetch(
    `/api/track/${encodeURIComponent(key)}/ping`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fix),
    },
    { retry: true },
  )
  const body = await parseResponse(res)
  if (!res.ok) {
    const error = new Error(buildErrorMessage(body, res))
    error.status = res.status
    throw error
  }
  return body || { ok: true }
}
