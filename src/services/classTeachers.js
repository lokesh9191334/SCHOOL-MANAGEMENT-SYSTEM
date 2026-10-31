import { getApiAuthHeaders } from './apiAuth'

async function request(url, options = {}) {
  let res
  try {
    res = await fetch(url, { ...options, headers: getApiAuthHeaders(options.headers) })
  } catch {
    throw new Error('Cannot reach the API server. Check your connection and try again.')
  }
  const txt = await res.text()
  let body = null
  if (txt) {
    try {
      body = JSON.parse(txt)
    } catch {
      throw new Error('Invalid JSON response from server')
    }
  }
  if (!res.ok) throw new Error(body?.error || body?.message || `Request failed (${res.status})`)
  return body || {}
}

export function fetchClassTeacherOverview() {
  return request('/api/class-teachers')
}

export function saveClassTeacherAssignment(payload) {
  return request('/api/class-teachers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function removeClassTeacherAssignment(id) {
  return request(`/api/class-teachers/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
