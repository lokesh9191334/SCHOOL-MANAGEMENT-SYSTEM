export function getAuthUser() {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    return JSON.parse(raw)
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
