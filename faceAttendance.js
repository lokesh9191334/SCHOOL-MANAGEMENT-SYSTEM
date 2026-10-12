/* Staff face attendance helpers: IST timestamps, descriptor validation,
   Euclidean matching, and check-in/out rules. File I/O stays in server.js
   so Vercel Blob persistence keeps working. */

export const FACE_MATCH_THRESHOLD = 0.5
export const DESCRIPTOR_LENGTH = 128
export const MAX_DESCRIPTORS_PER_PROFILE = 3
export const ATTENDANCE_COOLDOWN_MS = 45 * 1000
export const MAX_PHOTO_THUMB_CHARS = 220_000

/** IST wall-clock parts for a moment in time (attendance must never depend on the client clock). */
export function istParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]))
  return {
    iso: date.toISOString(),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  }
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function isValidDescriptor(value) {
  return (
    Array.isArray(value) &&
    value.length === DESCRIPTOR_LENGTH &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  )
}

export function validDescriptors(list) {
  return (Array.isArray(list) ? list : []).filter(isValidDescriptor).slice(0, MAX_DESCRIPTORS_PER_PROFILE)
}

export function isValidPhotoThumb(value) {
  return (
    typeof value === 'string' &&
    value.startsWith('data:image/') &&
    value.length <= MAX_PHOTO_THUMB_CHARS
  )
}

export function descriptorDistance(a, b) {
  let sum = 0
  for (let i = 0; i < DESCRIPTOR_LENGTH; i += 1) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

export function findBestMatch(descriptor, profiles, threshold = FACE_MATCH_THRESHOLD) {
  let best = null
  for (const profile of profiles) {
    for (const stored of profile.descriptors || []) {
      const distance = descriptorDistance(descriptor, stored)
      if (!best || distance < best.distance) best = { profile, distance }
    }
  }
  if (best && best.distance <= threshold) return best
  return null
}

export function matchPercent(distance) {
  return Math.max(0, Math.min(100, Math.round((1 - distance) * 100)))
}

/** First scan of the day = in; alternate afterwards. */
export function nextAttendanceType(todayRecordsForPerson) {
  const sorted = [...(todayRecordsForPerson || [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const last = sorted[sorted.length - 1]
  if (!last || last.type === 'out') return 'in'
  return 'out'
}

export function lastRecordFor(allRecords, email) {
  let latest = null
  for (const record of allRecords) {
    if (normalizeEmail(record.email) !== email) continue
    if (!latest || Date.parse(record.at) > Date.parse(latest.at)) latest = record
  }
  return latest
}

export function sanitizeLocation(location) {
  const lat = Number(location?.lat)
  const lng = Number(location?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  const accuracy = Number(location?.accuracy)
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
  }
}

/** Times are IST "HH:MM:SS" strings — plain string compare is safe for same-day values. */
export function isLate(firstInTime, lateAfter) {
  if (!firstInTime || !lateAfter) return false
  return firstInTime > lateAfter
}
