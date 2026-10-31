const SCHOOL_IDENTITY_KEY = 'sms_school_identity'

const EMPTY_IDENTITY = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  principalName: '',
  logoData: '',
}

function clean(value) {
  return String(value ?? '').trim()
}

function cleanLogo(value) {
  const raw = clean(value)
  return /^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(raw) ? raw : ''
}

function normalize(identity) {
  return {
    name: clean(identity?.name),
    address: clean(identity?.address),
    phone: clean(identity?.phone),
    email: clean(identity?.email),
    website: clean(identity?.website),
    principalName: clean(identity?.principalName),
    logoData: cleanLogo(identity?.logoData),
  }
}

export function emptySchoolIdentity() {
  return { ...EMPTY_IDENTITY }
}

export function readSchoolIdentity() {
  try {
    const raw = window.localStorage.getItem(SCHOOL_IDENTITY_KEY)
    if (!raw) return emptySchoolIdentity()
    return normalize(JSON.parse(raw))
  } catch {
    return emptySchoolIdentity()
  }
}

export function writeSchoolIdentity(identity) {
  const next = normalize(identity)
  window.localStorage.setItem(SCHOOL_IDENTITY_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('sms:school-identity', { detail: next }))
  return next
}

export function clearSchoolIdentity() {
  window.localStorage.removeItem(SCHOOL_IDENTITY_KEY)
  window.dispatchEvent(new CustomEvent('sms:school-identity', { detail: emptySchoolIdentity() }))
}

export function schoolForCard(identity) {
  const next = normalize(identity)
  return {
    name: next.name,
    address: next.address,
    phone: next.phone,
    website: next.website,
    principalName: next.principalName,
    logoData: next.logoData,
  }
}

export { SCHOOL_IDENTITY_KEY }
