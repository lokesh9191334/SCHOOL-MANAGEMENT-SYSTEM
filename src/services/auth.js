const API = '/api/auth'

async function parseResponse(res) {
  // Read raw text and handle empty responses gracefully
  const txt = await res.text()
  if (!txt) return null
  try {
    return JSON.parse(txt)
  } catch (err) {
    // If server returned invalid JSON, throw a helpful error
    throw new Error('Invalid JSON response from server')
  }
}

function buildErrorMessage(resBody, res) {
  if (!resBody) return res.statusText || 'Request failed'
  return resBody.error || resBody.message || JSON.stringify(resBody)
}

export const register = async ({ email, password, name }) => {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Register failed')
  return body
}

export const login = async ({ email, password }) => {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Login failed')
  return body
}

export const twoFASetup = async ({ email }) => {
  const res = await fetch(`${API}/2fa/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || '2FA setup failed')
  return body
}

export const twoFAVerify = async ({ email, code, loginToken, setup }) => {
  const res = await fetch(`${API}/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, token: loginToken, setup }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || '2FA verification failed')
  return body
}

export const saveSession = (data) => {
  try {
    if (data && data.token) localStorage.setItem('auth_token', data.token)
    if (data && data.user) localStorage.setItem('auth_user', JSON.stringify(data.user))
  } catch {}
}

export const clearSession = () => {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  } catch {}
}

export const twoFADisable = async ({ email, code }) => {
  const res = await fetch(`${API}/2fa/disable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || '2FA disable failed')
  return body
}
