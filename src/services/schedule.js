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

export function fetchSchedule() {
  return request('/api/schedule')
}

export function saveSchedule({ periods, entries }) {
  return request('/api/schedule', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ periods, entries }),
  })
}

export function fetchMySchedule() {
  return request('/api/schedule/my')
}

export function fetchSubstitutions(date = '') {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return request(`/api/substitutions${query}`)
}

export function fetchSubstitutionCandidates(id) {
  return request(`/api/substitutions/${encodeURIComponent(id)}/candidates`)
}

export function assignSubstitution(id, teacherEmail) {
  return request(`/api/substitutions/${encodeURIComponent(id)}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherEmail }),
  })
}

export function runSubstitutions(date) {
  return request('/api/substitutions/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  })
}
