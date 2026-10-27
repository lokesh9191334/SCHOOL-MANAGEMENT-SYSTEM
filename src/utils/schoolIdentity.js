const SCHOOL_IDENTITY_KEY = 'sms_school_identity'

const EMPTY_IDENTITY = { name: '', address: '', phone: '', website: '' }

function clean(value) {
  return String(value ?? '').trim()
}

export function readSchoolIdentity() {
  try {
    const raw = window.localStorage.getItem(SCHOOL_IDENTITY_KEY)
    if (!raw) return { ...EMPTY_IDENTITY }
    const parsed = JSON.parse(raw)
    return {
      name: clean(parsed?.name),
      address: clean(parsed?.address),
      phone: clean(parsed?.phone),
      website: clean(parsed?.website),
    }
  } catch {
    return { ...EMPTY_IDENTITY }
  }
}

export function writeSchoolIdentity(identity) {
  const next = {
    name: clean(identity?.name),
    address: clean(identity?.address),
    phone: clean(identity?.phone),
    website: clean(identity?.website),
  }
  window.localStorage.setItem(SCHOOL_IDENTITY_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('sms:school-identity', { detail: next }))
  return next
}

export function clearSchoolIdentity() {
  window.localStorage.removeItem(SCHOOL_IDENTITY_KEY)
  window.dispatchEvent(new CustomEvent('sms:school-identity', { detail: { ...EMPTY_IDENTITY } }))
}

export function schoolForCard(identity) {
  return {
    name: clean(identity?.name) || 'School Management System',
    address: clean(identity?.address),
    phone: clean(identity?.phone),
    website: clean(identity?.website),
  }
}

export { SCHOOL_IDENTITY_KEY }
