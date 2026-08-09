const API = '/api/auth'

async function parseResponse(res) {
  const txt = await res.text()
  if (!txt) return null
  try {
    return JSON.parse(txt)
  } catch {
    throw new Error('Invalid JSON response from server')
  }
}

function buildErrorMessage(resBody, res) {
  if (res && (res.status === 502 || res.status === 503 || res.status === 504)) {
    return 'API server is not running. Start it with: npm run server (or use npm run dev:all).'
  }
  if (!resBody) return res.statusText || 'Request failed'
  return resBody.error || resBody.message || JSON.stringify(resBody)
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options)
  } catch {
    throw new Error('Cannot reach API server. Run “npm run server” in another terminal (port 5000), or use “npm run dev:all”.')
  }
}

export const register = async ({ email, password, name, role, inviteKey }) => {
  const res = await safeFetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role, inviteKey }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Register failed')
  return body
}

export const registerVerify = async ({ email, code, pendingToken }) => {
  const res = await safeFetch(`${API}/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, pendingToken }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'OTP verification failed')
  return body
}

export const login = async ({ email, password }) => {
  const res = await safeFetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Login failed')
  return body
}

export const loginVerify = async ({ email, code, loginToken }) => {
  const res = await safeFetch(`${API}/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, loginToken }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'OTP verification failed')
  return body
}

export const resendOtp = async ({ email, purpose, pendingToken }) => {
  const res = await safeFetch(`${API}/otp/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose, pendingToken }),
  })
  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Could not resend OTP')
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
  } catch {
    /* ignore */
  }
}

export const clearSession = () => {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  } catch {
    /* ignore */
  }
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
