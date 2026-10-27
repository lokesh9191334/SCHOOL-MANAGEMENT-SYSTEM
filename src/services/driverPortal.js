import { getApiAuthHeaders } from './apiAuth'

const API = '/api/driver'

async function parseResponse(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API}${path}`, {
      ...options,
      headers: getApiAuthHeaders(options.headers),
    })
  } catch {
    throw new Error('Cannot reach the school server. Check your internet connection.')
  }
  const body = await parseResponse(res)
  if (!res.ok) {
    const error = new Error(body?.error || 'The driver server could not complete this request.')
    error.status = res.status
    throw error
  }
  return body
}

export const fetchDriverTrip = () => request('/me')

export const sendDriverPing = (payload) =>
  request('/ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
