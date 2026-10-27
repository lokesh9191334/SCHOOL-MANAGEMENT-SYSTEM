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
    return 'API server is not running. Start it with: npm run server (or use npm run dev:all).'
  }
  if (res && res.status === 401) return body?.error || 'Your session expired. Sign in again.'
  if (!body) return res.statusText || 'Request failed'
  return body.error || body.message || JSON.stringify(body)
}

async function request(path, options) {
  let res
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      headers: getApiAuthHeaders(options?.headers),
    })
  } catch {
    throw new Error('Cannot reach the API server. Check the internet connection or run “npm run server”.')
  }
  const body = await parseResponse(res)
  if (!res.ok) {
    const error = new Error(buildErrorMessage(body, res))
    error.status = res.status
    throw error
  }
  return body
}

function jsonOptions(method, payload) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

/* Routes */
export const fetchTransportRoutes = () => request('/routes')

export const createTransportRoute = (route) => request('/routes', jsonOptions('POST', route))

export const updateTransportRoute = (id, route) =>
  request(`/routes/${encodeURIComponent(id)}`, jsonOptions('PATCH', route))

export const deleteTransportRoute = (id) =>
  request(`/routes/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const fetchRouteGeometry = (id) => request(`/routes/${encodeURIComponent(id)}/geometry`)

/* Drivers */
export const fetchTransportDrivers = () => request('/drivers')

export const createTransportDriver = (driver) => request('/drivers', jsonOptions('POST', driver))

export const updateTransportDriver = (id, driver) =>
  request(`/drivers/${encodeURIComponent(id)}`, jsonOptions('PATCH', driver))

export const deleteTransportDriver = (id) =>
  request(`/drivers/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const resetTransportDriverPin = (id) =>
  request(`/drivers/${encodeURIComponent(id)}/login/pin`, { method: 'POST' })

export const setTransportDriverLogin = (id, enabled) =>
  request(`/drivers/${encodeURIComponent(id)}/login`, jsonOptions('PATCH', { enabled }))

/* Buses */
export const fetchTransportVehicles = () => request('/vehicles')

export const createTransportVehicle = (vehicle) => request('/vehicles', jsonOptions('POST', vehicle))

export const updateTransportVehicle = (id, vehicle) =>
  request(`/vehicles/${encodeURIComponent(id)}`, jsonOptions('PATCH', vehicle))

export const deleteTransportVehicle = (id) =>
  request(`/vehicles/${encodeURIComponent(id)}`, { method: 'DELETE' })

/* Student allocation */
export const fetchTransportAllocations = () => request('/allocations')

export const createTransportAllocation = (allocation) =>
  request('/allocations', jsonOptions('POST', allocation))

export const updateTransportAllocation = (id, allocation) =>
  request(`/allocations/${encodeURIComponent(id)}`, jsonOptions('PATCH', allocation))

export const deleteTransportAllocation = (id) =>
  request(`/allocations/${encodeURIComponent(id)}`, { method: 'DELETE' })

/* Parent — own child only */
export const fetchMyTransport = () => request('/my')
