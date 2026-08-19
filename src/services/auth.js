import { STORAGE_KEYS, DEMO_LOGIN } from '../utils/constants'

const API = '/api/auth'

function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.users)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
}

function loadAuthPending() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.authPending)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveAuthPending(data) {
  localStorage.setItem(STORAGE_KEYS.authPending, JSON.stringify(data))
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(`sms-v1:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function passwordsMatch(password, user) {
  if (!user) return false
  if (String(user.email || '').toLowerCase() === DEMO_LOGIN.email.toLowerCase() && password === DEMO_LOGIN.password) {
    return true
  }
  if (user.passwordHash && !String(user.passwordHash).startsWith('$2')) {
    return (await hashPassword(password)) === user.passwordHash
  }
  return false
}

function ensureDemoUser(users) {
  const email = DEMO_LOGIN.email.toLowerCase()
  if (users.some((u) => String(u.email || '').toLowerCase() === email)) return users
  const next = [
    ...users,
    {
      id: 'demo-admin',
      email: DEMO_LOGIN.email,
      name: DEMO_LOGIN.name,
      role: DEMO_LOGIN.role,
      passwordHash: 'demo',
      otpEnabled: true,
      specialKeyEnabled: true,
    },
  ]
  saveUsers(next)
  return next
}

function publicUser(user) {
  return {
    id: user.id, email: user.email, name: user.name || '', role: user.role || 'admin' }
}

function issueSession(user) {
  return { token: `local-token-${Date.now()}`, user: publicUser(user) }
}

function maskEmail(email) {
  const parts = String(email || '').split('@')
  if (parts.length !== 2) return email
  const name = parts[0]
  const domain = parts[1]
  const masked = name.length <= 2 ? name[0] + '*'.repeat(Math.max(0, name.length - 1)) : name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
  return `${masked}@${domain}`
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function generateSpecialKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  const len = 7
  let result = ''
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function isJsonContentType(res) {
  return (res.headers.get('content-type') || '').toLowerCase().includes('application/json')
}

async function parseResponse(res) {
  const txt = await res.text()
  if (!txt) return null
  try {
    return JSON.parse(txt)
  } catch {
    const error = new Error('Invalid JSON response from server')
    error.code = 'INVALID_JSON'
    throw error
  }
}

function buildErrorMessage(resBody, res) {
  if (!resBody) return (res && res.statusText) || 'Request failed'
  return resBody.error || resBody.message || JSON.stringify(resBody)
}

function shouldUseLocalFallback(err) {
  if (!err) return false
  if (err.code === 'INVALID_JSON') return true
  if (err.name === 'TypeError') return true
  const message = String(err.message || '')
  return /failed to fetch|networkerror|load failed|cannot reach api server/i.test(message)
}

async function postAuth(path, payload) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!isJsonContentType(res)) {
    const error = new Error('Invalid JSON response from server')
    error.code = 'INVALID_JSON'
    throw error
  }

  const body = await parseResponse(res)
  if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Request failed')
  return body
}

async function safeFetch(url, options) {
  try {
    return await fetch(url, options)
  } catch {
    const error = new Error('Cannot reach API server')
    error.code = 'INVALID_JSON'
    throw error
  }
}

async function localRegister({ email, password, name, role }) {
  if (!email || !password) throw new Error('Email and password required')
  const users = ensureDemoUser(loadUsers())
  const normalized = String(email).trim().toLowerCase()
  if (users.some((u) => String(u.email || '').toLowerCase() === normalized)) {
    throw new Error('User with this email already exists')
  }

  const otp = generateOtp()
  const pending = {
    pendingRegister: true,
    pendingUser: {
      id: Date.now().toString(),
      email: String(email).trim(),
      name: name || '',
      role: role || 'admin',
      passwordHash: await hashPassword(password),
      otpEnabled: true,
      specialKeyEnabled: (role || 'admin') === 'admin',
    },
    otp,
    pendingToken: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  const allPending = loadAuthPending()
  allPending[normalized] = pending
  saveAuthPending(allPending)

  return {
    otpRequired: true,
    pendingToken: pending.pendingToken,
    maskedEmail: maskEmail(email),
    demoOtp: otp,
    message: 'OTP sent to your email.',
  }
}

async function localRegisterVerify({ email, code, pendingToken }) {
  const normalized = String(email || '').trim().toLowerCase()
  const allPending = loadAuthPending()
  const pending = allPending[normalized]
  if (!pending || !pending.pendingRegister) throw new Error('No pending registration found. Please register again.')
  if (pending.pendingToken !== pendingToken) throw new Error('Invalid or expired session. Register again.')
  if (pending.expiresAt < Date.now()) throw new Error('OTP expired. Please register again.')
  if (String(pending.otp) !== String(code || '').trim()) throw new Error('Incorrect OTP. Please check your email.')

  const newUser = pending.pendingUser
  const users = ensureDemoUser(loadUsers())
  const finalUsers = [...users, newUser]
  saveUsers(finalUsers)
  delete allPending[normalized]
  saveAuthPending(allPending)
  return issueSession(newUser)
}

async function localLogin({ email, password }) {
  if (!email || !password) throw new Error('Email and password required')
  const users = ensureDemoUser(loadUsers())
  const normalized = String(email).trim().toLowerCase()
  const user = users.find((u) => String(u.email || '').toLowerCase() === normalized)
  if (!(await passwordsMatch(password, user))) {
    throw new Error('Invalid email or password')
  }

  const otp = generateOtp()
  const specialKey = user.specialKeyEnabled ? generateSpecialKey() : null
  const loginToken = `login-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const isDual = user.specialKeyEnabled
  const method = isDual ? 'admin-dual' : 'email-otp'

  const allPending = loadAuthPending()
  allPending[normalized] = {
    pendingLogin: true,
    userId: user.id,
    otp,
    specialKey,
    loginToken,
    method,
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  saveAuthPending(allPending)

  return {
    otpRequired: true,
    loginToken,
    maskedEmail: maskEmail(email),
    demoOtp: specialKey ? `${otp} | Special key: ${specialKey}` : otp,
    method,
    specialKeyRequired: isDual,
  }
}

async function localLoginVerify({ email, code, loginToken, specialKey }) {
  const normalized = String(email || '').trim().toLowerCase()
  const allPending = loadAuthPending()
  const pending = allPending[normalized]
  if (!pending || !pending.pendingLogin) throw new Error('No pending login found. Please login again.')
  if (pending.loginToken !== loginToken) throw new Error('Invalid or expired session. Login again.')
  if (pending.expiresAt < Date.now()) throw new Error('OTP expired. Login again.')
  if (String(pending.otp) !== String(code || '').trim()) throw new Error('Incorrect OTP.')

  const isDual = pending.specialKeyRequired || pending.method === 'admin-dual' || pending.specialKey
  if (isDual) {
    const sk = String(specialKey || '').replace(/\s+/g, '').toLowerCase()
    const expected = String(pending.specialKey || '').replace(/\s+/g, '').toLowerCase()
    if (sk.length !== 7 || sk !== expected) {
      throw new Error('Incorrect 7-character special key.')
    }
  }

  const users = loadUsers()
  const user = users.find((u) => u.id === pending.userId)
  if (!user) throw new Error('User not found. Register again.')
  delete allPending[normalized]
  saveAuthPending(allPending)
  return issueSession(user)
}

async function localResendOtp({ email, purpose }) {
  const normalized = String(email || '').trim().toLowerCase()
  const allPending = loadAuthPending()
  const pending = allPending[normalized]
  if (!pending) throw new Error('No pending request found for this email.')

  const otp = generateOtp()
  let specialKey = null
  if (pending.pendingLogin && (pending.specialKeyRequired || pending.method === 'admin-dual')) {
    specialKey = generateSpecialKey()
    pending.specialKey = specialKey
  }
  pending.otp = otp
  pending.expiresAt = Date.now() + 10 * 60 * 1000
  allPending[normalized] = pending
  saveAuthPending(allPending)

  return {
    demoOtp: specialKey ? `${otp} | Special key: ${specialKey}` : otp,
    method: pending.method,
    message: purpose === 'register' ? 'A new OTP was sent.' : 'A new OTP and special key were emailed.',
  }
}

async function withLocalFallback(apiCall, localCall) {
  try {
    return await apiCall()
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err
    return localCall()
  }
}

export const register = async ({ email, password, name, role, inviteKey }) =>
  withLocalFallback(
    () => postAuth('/register', { email, password, name, role, inviteKey }),
    () => localRegister({ email, password, name, role })
  )

export const registerVerify = async ({ email, code, pendingToken }) =>
  withLocalFallback(
    async () => {
      const res = await safeFetch(`${API}/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, pendingToken }),
      })
      if (!isJsonContentType(res)) {
        const error = new Error('Invalid JSON response from server')
        error.code = 'INVALID_JSON'
        throw error
      }
      const body = await parseResponse(res)
      if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'OTP verification failed')
      return body
    },
    () => localRegisterVerify({ email, code, pendingToken })
  )

export const login = async ({ email, password }) =>
  withLocalFallback(
    () => postAuth('/login', { email, password }),
    () => localLogin({ email, password })
  )

export const loginVerify = async ({ email, code, loginToken, specialKey }) =>
  withLocalFallback(
    async () => {
      const res = await safeFetch(`${API}/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, token: loginToken, specialKey }),
      })
      if (!isJsonContentType(res)) {
        const error = new Error('Invalid JSON response from server')
        error.code = 'INVALID_JSON'
        throw error
      }
      const body = await parseResponse(res)
      if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'OTP verification failed')
      return body
    },
    () => localLoginVerify({ email, code, loginToken, specialKey })
  )

export const resendOtp = async ({ email, purpose, pendingToken }) =>
  withLocalFallback(
    async () => {
      const res = await safeFetch(`${API}/otp/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose, pendingToken }),
      })
      if (!isJsonContentType(res)) {
        const error = new Error('Invalid JSON response from server')
        error.code = 'INVALID_JSON'
        throw error
      }
      const body = await parseResponse(res)
      if (!res.ok) throw new Error(buildErrorMessage(body, res) || 'Could not resend OTP')
      return body
    },
    () => localResendOtp({ email, purpose, pendingToken })
  )

export const twoFASetup = async ({ email }) =>
  withLocalFallback(
    () => postAuth('/2fa/setup', { email }),
    () => { throw new Error('Two-factor setup needs the API server.') }
  )

export const twoFAVerify = async ({ email, code, loginToken, setup }) =>
  withLocalFallback(
    () => postAuth('/2fa/verify', { email, code, token: loginToken, setup }),
    () => { throw new Error('Two-factor verification needs the API server.') }
  )

export const twoFADisable = async ({ email, code }) =>
  withLocalFallback(
    () => postAuth('/2fa/disable', { email, code }),
    () => { throw new Error('Two-factor disable needs the API server.') }
  )

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
