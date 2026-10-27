/* Staff face attendance helpers: IST timestamps, descriptor validation,
   Euclidean matching, and check-in/out rules. File I/O stays in server.js
   so Vercel Blob persistence keeps working. */

export const FACE_MATCH_THRESHOLD = 0.5
export const FACE_LOGIN_THRESHOLD = 0.4
export const FACE_LOGIN_MARGIN = 0.1
export const FACE_LOGIN_FRAMES = 3
export const DESCRIPTOR_LENGTH = 128
export const MAX_DESCRIPTORS_PER_PROFILE = 3
/* Live-capture guard: frames from a real camera always differ a little (sensor
   noise + micro movement). Three identical or near-identical descriptors mean
   the vectors were replayed rather than captured live. */
export const MIN_INTER_FRAME_DISTANCE = 0.008
export const MAX_INTER_FRAME_DISTANCE = 0.6
/* One face may belong to only one account: a new enrollment this close to an
   existing other account's profile is rejected up front. */
export const FACE_ENROLL_UNIQUENESS_THRESHOLD = 0.45
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

/** Second-best distance across other profiles, used for the "not a near-twin" margin check. */
function bestDistanceExcluding(descriptor, profiles, excludedEmail) {
  let best = Infinity
  for (const profile of profiles) {
    if (normalizeEmail(profile.email) === excludedEmail) continue
    for (const stored of profile.descriptors || []) {
      const distance = descriptorDistance(descriptor, stored)
      if (distance < best) best = distance
    }
  }
  return best
}

/**
 * Live-capture guard shared by enrollment and login: the submitted frames must
 * look like they came from a real camera session. Static means every pair is
 * near-identical (frozen/replayed capture) — one close pair among live frames
 * is normal; wildly different vectors mean different moments/people.
 */
export function assertLiveFrames(descriptors, { min = MIN_INTER_FRAME_DISTANCE, max = MAX_INTER_FRAME_DISTANCE } = {}) {
  const list = (Array.isArray(descriptors) ? descriptors : []).filter(isValidDescriptor)
  if (list.length < 2) {
    return { ok: false, reason: 'not-enough-frames', message: 'Not enough clear frames were captured. Try again.' }
  }
  let minPair = Infinity
  let maxPair = 0
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const distance = descriptorDistance(list[i], list[j])
      if (distance < minPair) minPair = distance
      if (distance > maxPair) maxPair = distance
    }
  }
  if (maxPair < min) {
    return {
      ok: false,
      reason: 'static',
      message: 'This capture looks static (replayed frames). Sign in live — look at the camera and move naturally.',
    }
  }
  if (maxPair > max) {
    return {
      ok: false,
      reason: 'inconsistent',
      message: 'Captured frames look inconsistent. Stay steady, alone in the frame, in even light.',
    }
  }
  return { ok: true, minPair, maxPair }
}

/**
 * Enrollment-time identity guard: a face that is already enrolled on another
 * account cannot be registered again. Returns conflict info when the closest
 * other-account descriptor is within the uniqueness threshold.
 */
export function enrollmentConflict(descriptors, profiles, selfEmail, threshold = FACE_ENROLL_UNIQUENESS_THRESHOLD) {
  const list = (Array.isArray(descriptors) ? descriptors : []).filter(isValidDescriptor)
  const self = normalizeEmail(selfEmail)
  let best = null
  for (const profile of profiles) {
    if (normalizeEmail(profile.email) === self) continue
    for (const stored of profile.descriptors || []) {
      for (const descriptor of list) {
        const distance = descriptorDistance(descriptor, stored)
        if (!best || distance < best.distance) {
          best = { distance, email: normalizeEmail(profile.email), name: profile.name || profile.email }
        }
      }
    }
  }
  if (best && best.distance <= threshold) return { conflict: true, ...best }
  return { conflict: false, distance: best ? best.distance : null }
}

/**
 * Login requires every captured frame to (a) look like a live capture, (b) be
 * within `threshold` of one profile, (c) point at the SAME profile, and (d)
 * beat the nearest other profile by at least `margin`. Any uncertainty → reject
 * so a wrong person can never sign in.
 */
export function strictMatchFrames(descriptors, profiles, {
  threshold = FACE_LOGIN_THRESHOLD,
  margin = FACE_LOGIN_MARGIN,
  frames = FACE_LOGIN_FRAMES,
} = {}) {
  const list = (Array.isArray(descriptors) ? descriptors : []).filter(isValidDescriptor)
  if (list.length < frames) {
    return { ok: false, reason: 'not-enough-frames', message: `Capture ${frames} clear frames of your face.` }
  }
  const live = assertLiveFrames(list.slice(0, frames))
  if (!live.ok) return live
  const used = list.slice(0, frames)
  let profile = null
  let worstDistance = 0
  let worstMargin = Infinity
  for (const descriptor of used) {
    const best = findBestMatch(descriptor, profiles, threshold)
    if (!best) {
      return { ok: false, reason: 'no-match', message: 'Face not recognised. Make sure you are enrolled and the lighting is clear.' }
    }
    if (profile && normalizeEmail(profile.email) !== normalizeEmail(best.profile.email)) {
      return { ok: false, reason: 'mixed', message: 'Frames matched different people. Look straight at the camera, alone in the frame.' }
    }
    profile = best.profile
    const second = bestDistanceExcluding(descriptor, profiles, normalizeEmail(best.profile.email))
    const frameMargin = second - best.distance
    if (frameMargin < margin) {
      return { ok: false, reason: 'ambiguous', message: 'Too similar to another registered face. Retry with even lighting and full face in frame.' }
    }
    if (best.distance > worstDistance) worstDistance = best.distance
    if (frameMargin < worstMargin) worstMargin = frameMargin
  }
  return {
    ok: true,
    profile,
    distance: worstDistance,
    margin: worstMargin,
    percent: matchPercent(worstDistance),
    frames: used.length,
  }
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
