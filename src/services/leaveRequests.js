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

export function fetchLeaveRequests(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/api/leave/requests${query}`)
}

export function submitLeaveRequest({ type, fromDate, toDate, reason }) {
  return request('/api/leave/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, fromDate, toDate, reason }),
  })
}

export function decideLeaveRequest(id, { status, note }) {
  return request(`/api/leave/requests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note }),
  })
}
