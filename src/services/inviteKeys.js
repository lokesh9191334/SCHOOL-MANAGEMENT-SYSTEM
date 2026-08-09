const API = '/api/invite-keys'

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
  if (!body) return res.statusText || 'Request failed'
  return body.error || body.message || JSON.stringify(body)
}

/** Client-side preview key (server may replace if duplicate) */
export function generateLocalInviteKey(role = 'teacher') {
  const prefix = role === 'parent' ? 'PAR' : 'TCH'
  const chunk = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X')
  return `SMS-${prefix}-${chunk()}-${chunk()}`
}

export const createInviteKey = async (payload) => {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Could not create special key')
  return body
}

export const lookupInviteKey = async (key) => {
  const normalized = String(key || '').trim()
  if (!normalized) throw new Error('Special key is required')
  const res = await fetch(`${API}/${encodeURIComponent(normalized)}`)
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Invalid special key')
  return body
}
