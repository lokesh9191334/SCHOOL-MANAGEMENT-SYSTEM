import { STORAGE_KEYS } from '../utils/constants'

const API = '/api/auth'

export const DEMO_LOGIN = {
  email: 'admin@school.edu',
  password: 'Admin@123',
  name: 'School Admin',
}

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

async function hashPassword(password) {
  const data = new TextEncoder().encode(`sms-v1:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function passwordsMatch(password, user) {
  if (!user) return false
  if (String(user.email || '').toLowerCase() === DEMO_LOGIN.email && password === DEMO_LOGIN.password) {
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
      passwordHash: 'demo',
      twoFactor: { enabled: false },
    },
  ]
  saveUsers(next)
  return next
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name || '' }
}

function issueSession(user) {
  return { token: `local-token-${Date.now()}`, user: publicUser(user) }
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
  if (!resBody) return res.statusText || 'Request failed'
  return resBody.error || resBody.message || JSON.stringify(resBody)
}

function shouldUseLocalFallback(err) {
  if (!err) return false
  if (err.code === 'INVALID_JSON') return true
  if (err.name === 'TypeError') return true
  const message = String(err.message || '')
  return /failed to fetch|networkerror|load failed/i.test(message)
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

async function localRegister({ email, password, name }) {
  if (!email || !password) throw new Error('Email and password required')
  const users = ensureDemoUser(loadUsers())
  const normalized = String(email).trim().toLowerCase()
  if (users.some((u) => String(u.email || '').toLowerCase() === normalized)) {
    throw new Error('User exists')
  }
  const user = {
    id: Date.now().toString(),
    email: String(email).trim(),
    name: name || '',
    passwordHash: await hashPassword(password),
    twoFactor: { enabled: false },
  }
  saveUsers([...users, user])
  return publicUser(user)
}

async function localLogin({ email, password }) {
  if (!email || !password) throw new Error('Email and password required')
  const users = ensureDemoUser(loadUsers())
  const normalized = String(email).trim().toLowerCase()
  const user = users.find((u) => String(u.email || '').toLowerCase() === normalized)
  if (!(await passwordsMatch(password, user))) {
    throw new Error('Invalid credentials')
  }

  if (user.twoFactor?.enabled) {
    const loginToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    saveUsers(
      users.map((u) =>
        String(u.email || '').toLowerCase() === normalized
          ? { ...u, loginToken, loginTokenExpiry: Date.now() + 5 * 60 * 1000 }
          : u
      )
    )
    return { twoFactor: true, loginToken }
  }

  return issueSession(user)
}

function localTwoFAUnavailable(action) {
  throw new Error(`${action} needs the API server. For this hosted site, use the demo login without 2FA.`)
}

async function withLocalFallback(apiCall, localCall) {
  try {
    return await apiCall()
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err
    return localCall()
  }
}

export const register = async ({ email, password, name }) =>
  withLocalFallback(() => postAuth('/register', { email, password, name }), () => localRegister({ email, password, name }))

export const login = async ({ email, password }) =>
  withLocalFallback(() => postAuth('/login', { email, password }), () => localLogin({ email, password }))

export const twoFASetup = async ({ email }) =>
  withLocalFallback(() => postAuth('/2fa/setup', { email }), () => localTwoFAUnavailable('Two-factor setup'))

export const twoFAVerify = async ({ email, code, loginToken, setup }) =>
  withLocalFallback(
    () => postAuth('/2fa/verify', { email, code, token: loginToken, setup }),
    () => localTwoFAUnavailable('Two-factor verification')
  )

export const twoFADisable = async ({ email, code }) =>
  withLocalFallback(() => postAuth('/2fa/disable', { email, code }), () => localTwoFAUnavailable('Two-factor disable'))

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
