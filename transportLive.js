/* Bus & driver live tracking helpers: capability keys, GPS fix validation
   and freshness rules. File I/O stays in server.js so Vercel Blob
   persistence keeps working. */

import { randomBytes } from 'node:crypto'
import process from 'node:process'

/** A vehicle is shown offline when no ping arrived within this window. */
export const TRACK_STALE_MS = 150 * 1000
/** Driver phones ping every ~15s; ignore bursts closer than this. */
export const TRACK_MIN_PING_GAP_MS = 3 * 1000
/** Points kept per vehicle for the trail polyline. */
export const TRACK_TRAIL_MAX = 40
export const TRACKING_KEYS_MAX = 200

export function generateTrackingKey() {
  return `trk_${randomBytes(12).toString('hex')}`
}

/** Capability keys arrive via URL — normalize and sanity check. */
export function normalizeTrackKey(value) {
  const key = String(value || '').trim().toLowerCase()
  return /^trk_[a-f0-9]{24}$/.test(key) ? key : ''
}

export function sanitizeFix(body) {
  const lat = Number(body?.lat)
  const lng = Number(body?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  // Number(null) is 0 — a missing reading must stay null, not become a fake 0.
  const accuracy = body?.accuracy == null ? NaN : Number(body?.accuracy)
  const speed = body?.speed == null ? NaN : Number(body?.speed)
  const heading = body?.heading == null ? NaN : Number(body?.heading)
  const battery = body?.battery == null ? NaN : Number(body?.battery)
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    accuracy: Number.isFinite(accuracy) ? Math.max(0, Math.round(accuracy)) : null,
    speed: Number.isFinite(speed) && speed >= 0 ? Math.round(speed * 10) / 10 : null,
    heading: Number.isFinite(heading) && heading >= 0 ? Math.round(heading) : null,
    battery: Number.isFinite(battery) && battery >= 0 && battery <= 100 ? Math.round(battery) : null,
  }
}

export function sanitizeDevice(value) {
  return String(value || '').slice(0, 120)
}

export function isTrackOnline(lastAt, now = Date.now()) {
  const at = Date.parse(lastAt || '')
  if (!Number.isFinite(at)) return false
  return now - at < TRACK_STALE_MS
}

/** Trail point appended per stored ping. */
export function trailPoint(fix) {
  return { lat: fix.lat, lng: fix.lng }
}

/** Speed above which a bus trip is flagged to admins. */
export const OVERSPEED_LIMIT_KMH = Number(process.env.OVERSPEED_LIMIT_KMH) >= 20 ? Number(process.env.OVERSPEED_LIMIT_KMH) : 55
/** No school bus genuinely reaches this; anything above is a GPS artifact, not a real reading. */
export const MAX_PLAUSIBLE_SPEED_KMH = 120
/** Derived speed is only trusted with a tight accuracy and a sane gap between pings. */
const DERIVED_MIN_GAP_SEC = 5
const DERIVED_MAX_GAP_SEC = 120
const DERIVED_MAX_ACCURACY_M = 50
/** A repeat detection within this window updates the open alert instead of raising a new one. */
export const OVERSPEED_EVENT_WINDOW_MS = 5 * 60 * 1000
/** Below-limit movement for this long marks an open alert as ended. */
export const OVERSPEED_END_MS = 3 * 60 * 1000

export function haversineMeters(a, b) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Trust the phone's GPS speed; when missing, derive it from the last two pings.
    Unreliable readings return null so admins see “—” rather than a fake speed. */
export function effectiveSpeedKmh(fix, prev) {
  if (fix.speed != null && Number.isFinite(Number(fix.speed))) {
    const kmh = Number(fix.speed) * 3.6
    return kmh <= MAX_PLAUSIBLE_SPEED_KMH ? kmh : null
  }
  if (!prev || !Number.isFinite(Number(prev.lat)) || !Number.isFinite(Number(prev.lng))) return null
  const prevAt = Date.parse(prev.at || '')
  if (!Number.isFinite(prevAt)) return null
  const dtSec = (Date.now() - prevAt) / 1000
  if (dtSec < DERIVED_MIN_GAP_SEC || dtSec > DERIVED_MAX_GAP_SEC) return null
  const accuracy = Number(fix.accuracy)
  if (!Number.isFinite(accuracy) || accuracy > DERIVED_MAX_ACCURACY_M) return null
  const kmh = (haversineMeters(prev, fix) / dtSec) * 3.6
  return kmh <= MAX_PLAUSIBLE_SPEED_KMH ? kmh : null
}
