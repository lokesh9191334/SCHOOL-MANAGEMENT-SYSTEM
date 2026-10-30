export function getAuthUser() {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    const profile = getProfileExtras(user?.id || user?.email)
    return profile ? { ...user, ...profile } : user
  } catch {
    return null
  }
}

export function getAuthToken() {
  try {
    return localStorage.getItem('auth_token')
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return Boolean(getAuthUser() && getAuthToken())
}

/** Shown on the sign-in panel after a bounce from an expired or invalid session. */
export function expiredNotice(search, driver = false) {
  if (new URLSearchParams(search || '').get('expired') !== '1') return ''
  return driver
    ? 'Your driver session has ended. Sign in again to reopen your trip.'
    : 'Your session has ended. Sign in again to continue.'
}

/** Removes both stored session keys (token + user profile). */
export function clearAuthStorage() {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  } catch {
    /* storage blocked — nothing to clear */
  }
}

function profileKey(id) {
  return `sms_profile__${String(id || 'guest')}`
}

/** Payload of the stored bearer token (base64url JSON). */
export function tokenPayload(token = getAuthToken()) {
  const encoded = String(token || '').split('.')[0]
  if (!encoded) return null
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

/** True when the stored token's expiresAt has already passed. */
export function isTokenExpired(token = getAuthToken()) {
  const expiresAt = Number(tokenPayload(token)?.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= Date.now()
}

const STAFF_LOGIN_PATH = '/auth/login'
const DRIVER_LOGIN_PATH = '/driver/login'
/* On these paths a 401 means "wrong code/PIN", not "signed out". */
const LOCAL_401_PATHS = ['/api/auth/', '/api/driver/', '/api/transport/driver']

let returningToLogin = false

function roleOfSession() {
  return String(getAuthUser()?.role || tokenPayload()?.role || '').toLowerCase()
}

/* Sign-in pages and the public live-track page are never bounced again. */
function canBounceFrom(pathname) {
  return !(
    pathname.startsWith('/auth') ||
    pathname.startsWith('/driver/login') ||
    pathname.startsWith('/track/')
  )
}

export function endSession() {
  const driver = roleOfSession() === 'driver' || window.location.pathname.startsWith('/driver')
  clearAuthStorage()
  if (!canBounceFrom(window.location.pathname) || returningToLogin) return
  returningToLogin = true
  window.location.replace(`${driver ? DRIVER_LOGIN_PATH : STAFF_LOGIN_PATH}?expired=1`)
}

/** Catches a token that ran out while the app stayed open or sat in the background. */
export function checkStoredSession() {
  if (!isTokenExpired()) return false
  endSession()
  return true
}

function requestUrl(input) {
  const raw = typeof input === 'string' ? input : input?.url || ''
  try {
    return new URL(raw, window.location.origin)
  } catch {
    return null
  }
}

function readHeader(headers, name) {
  if (!headers) return ''
  if (typeof headers.get === 'function') return headers.get(name) || ''
  if (Array.isArray(headers)) {
    const hit = headers.find(([key]) => String(key).toLowerCase() === name.toLowerCase())
    return hit ? hit[1] : ''
  }
  if (typeof headers === 'object') {
    const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase())
    return key ? headers[key] : ''
  }
  return ''
}

function sentAuthHeader(input, init) {
  return Boolean(
    readHeader(init?.headers, 'authorization') || readHeader(input?.headers, 'authorization'),
  )
}

/** Any authenticated API 401 drops the stale session and reopens the sign-in panel. */
export function installSessionExpiryGuard() {
  if (typeof window === 'undefined' || window.__smsSessionGuard) return
  window.__smsSessionGuard = true

  const nativeFetch = window.fetch?.bind(window)
  if (nativeFetch) {
    window.fetch = async (input, init) => {
      const res = await nativeFetch(input, init)
      if (res.status === 401 && getAuthToken() && sentAuthHeader(input, init)) {
        const url = requestUrl(input)
        const apiCall = url && url.origin === window.location.origin && url.pathname.startsWith('/api/')
        const local401 = LOCAL_401_PATHS.some((prefix) => url?.pathname.startsWith(prefix))
        if (apiCall && !local401) endSession()
      }
      return res
    }
  }

  checkStoredSession()
  window.setInterval(checkStoredSession, 15000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkStoredSession()
  })
}

export function getProfileExtras(id) {
  try {
    const raw = localStorage.getItem(profileKey(id))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveProfileExtras(id, data) {
  const key = profileKey(id)
  const next = { ...(getProfileExtras(id) || {}), ...data, updatedAt: new Date().toISOString() }
  localStorage.setItem(key, JSON.stringify(next))

  try {
    const raw = localStorage.getItem('auth_user')
    if (raw) {
      const user = JSON.parse(raw)
      const merged = {
        ...user,
        name: next.name ?? user.name,
        username: next.username ?? user.username,
        photoUrl: next.photoUrl ?? user.photoUrl,
        phone: next.phone ?? user.phone,
      }
      localStorage.setItem('auth_user', JSON.stringify(merged))
    }
  } catch {
    /* ignore */
  }

  return next
}

export function roleLabel(role) {
  const map = {
    super_admin: 'Super Admin',
    admin: 'School Admin',
    teacher: 'Teacher',
    parent: 'Parent',
  }
  return map[String(role || '').toLowerCase()] || 'User'
}
