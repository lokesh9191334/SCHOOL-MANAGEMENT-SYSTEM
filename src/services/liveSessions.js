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

export function fetchLiveSessionMeta() {
  return request('/api/live-sessions/meta')
}

export function fetchLiveSessionSlots({ studentId, teacherEmail, date }) {
  const query = new URLSearchParams({ studentId, teacherEmail, date }).toString()
  return request(`/api/live-sessions/slots?${query}`)
}

export function fetchLiveSessions() {
  return request('/api/live-sessions')
}

export function scheduleLiveSession({ studentId, teacherEmail, date, startTime, agenda }) {
  return request('/api/live-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, teacherEmail, date, startTime, agenda }),
  })
}

export function decideLiveSession(id, { status, note }) {
  return request(`/api/live-sessions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note }),
  })
}

export function cancelLiveSession(id, { note = '' } = {}) {
  return request(`/api/live-sessions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'Cancelled', note }),
  })
}
