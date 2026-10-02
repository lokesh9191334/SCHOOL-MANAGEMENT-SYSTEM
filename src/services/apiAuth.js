export function getApiAuthHeaders(headers = {}) {
  let token = ''
  try {
    token = localStorage.getItem('auth_token') || ''
  } catch {
    // Browser storage may be unavailable before authentication.
  }
  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}
