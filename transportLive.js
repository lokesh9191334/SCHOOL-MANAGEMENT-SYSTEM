/* Bus & driver live tracking helpers: capability keys, GPS fix validation
   and freshness rules. File I/O stays in server.js so Vercel Blob
   persistence keeps working. */

import { randomBytes } from 'node:crypto'

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
  const accuracy = Number(body?.accuracy)
  const speed = Number(body?.speed)
  const heading = Number(body?.heading)
  const battery = Number(body?.battery)
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
