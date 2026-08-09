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

function profileKey(id) {
  return `sms_profile__${String(id || 'guest')}`
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
