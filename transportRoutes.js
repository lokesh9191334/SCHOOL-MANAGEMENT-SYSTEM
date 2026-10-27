/* Transport domain helpers: route/driver/vehicle/allocation validation,
   distance maths and road geometry (OSRM) with a straight-line fallback.
   File I/O stays in server.js so Vercel Blob persistence keeps working. */

import { randomBytes } from 'node:crypto'

export const TRANSPORT_STOPS_MAX = 30
export const TRANSPORT_ROUTES_MAX = 200
export const TRANSPORT_DRIVERS_MAX = 500
export const TRANSPORT_VEHICLES_MAX = 300
export const TRANSPORT_ALLOCATIONS_MAX = 3000

export const STOP_KINDS = ['pickup', 'drop', 'both']
const ROUTE_STATUSES = ['Active', 'Paused']
const DRIVER_STATUSES = ['On duty', 'Off duty', 'Leave']
const VEHICLE_STATUSES = ['Active', 'Maintenance', 'Retired']

function text(value, max) {
  return String(value ?? '').trim().slice(0, max)
}

function coordinate(value, min, max) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) return null
  return Number(number.toFixed(6))
}

export function newTransportId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
}

export function sanitizeStop(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null
  const name = text(raw.name, 80)
  const lat = coordinate(raw.lat, -90, 90)
  const lng = coordinate(raw.lng, -180, 180)
  if (!name || lat === null || lng === null) return null
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(raw.time || '')) ? String(raw.time) : ''
  return {
    id: text(raw.id, 48) || `stop_${index + 1}_${randomBytes(3).toString('hex')}`,
    name,
    kind: STOP_KINDS.includes(raw.kind) ? raw.kind : 'both',
    time,
    landmark: text(raw.landmark, 120),
    lat,
    lng,
  }
}

/** Returns null when any stop is malformed or coordinates are missing. */
export function sanitizeStops(value) {
  if (!Array.isArray(value) || value.length > TRANSPORT_STOPS_MAX) return null
  const stops = []
  for (let index = 0; index < value.length; index += 1) {
    const stop = sanitizeStop(value[index], index)
    if (!stop) return null
    stops.push(stop)
  }
  const ids = new Set(stops.map((stop) => stop.id))
  if (ids.size !== stops.length) return null
  return stops
}

function mergeField(body, existing, key) {
  return body[key] !== undefined ? body[key] : existing[key]
}

export function normalizeRoute(body, existing = {}) {
  const source = body && typeof body === 'object' ? body : {}
  const name = text(mergeField(source, existing, 'name'), 80)
  if (!name) return { error: 'Route name is required.' }
  const rawStops = mergeField(source, existing, 'stops')
  const stops = sanitizeStops(Array.isArray(rawStops) ? rawStops : [])
  if (!stops) return { error: 'Every stop needs a name and a map location (latitude/longitude).' }
  if (!stops.length) return { error: 'Add at least one stop to this route.' }
  const status = ROUTE_STATUSES.includes(source.status) ? source.status : ROUTE_STATUSES.includes(existing.status) ? existing.status : 'Active'
  return {
    value: {
      name,
      code: text(mergeField(source, existing, 'code'), 24),
      status,
      stops,
      driverId: text(mergeField(source, existing, 'driverId'), 60),
      vehicleId: text(mergeField(source, existing, 'vehicleId'), 60),
      trackingId: text(mergeField(source, existing, 'trackingId'), 60),
      vehicleLabel: text(mergeField(source, existing, 'vehicleLabel'), 40),
      notes: text(mergeField(source, existing, 'notes'), 300),
    },
  }
}

export function normalizeDriver(body, existing = {}) {
  const source = body && typeof body === 'object' ? body : {}
  const name = text(mergeField(source, existing, 'name'), 80)
  if (!name) return { error: 'Driver name is required.' }
  const status = DRIVER_STATUSES.includes(source.status) ? source.status : DRIVER_STATUSES.includes(existing.status) ? existing.status : 'On duty'
  const licenseExpiry = String(mergeField(source, existing, 'licenseExpiry') || '').trim()
  if (licenseExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(licenseExpiry)) {
    return { error: 'License expiry must be a valid date.' }
  }
  return {
    value: {
      name,
      phone: text(mergeField(source, existing, 'phone'), 24),
      licenseNo: text(mergeField(source, existing, 'licenseNo'), 40),
      licenseExpiry,
      address: text(mergeField(source, existing, 'address'), 160),
      vehicleLabel: text(mergeField(source, existing, 'vehicleLabel'), 40),
      status,
      notes: text(mergeField(source, existing, 'notes'), 300),
    },
  }
}

export function normalizeVehicle(body, existing = {}) {
  const source = body && typeof body === 'object' ? body : {}
  const number = text(mergeField(source, existing, 'number'), 40)
  if (!number) return { error: 'Bus number is required.' }
  const rawCapacity = mergeField(source, existing, 'capacity')
  const capacity = rawCapacity === '' || rawCapacity === null || rawCapacity === undefined ? null : Number(rawCapacity)
  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 1 || capacity > 120)) {
    return { error: 'Seat capacity must be between 1 and 120.' }
  }
  const insuranceTill = String(mergeField(source, existing, 'insuranceTill') || '').trim()
  if (insuranceTill && !/^\d{4}-\d{2}-\d{2}$/.test(insuranceTill)) {
    return { error: 'Insurance date must be a valid date.' }
  }
  const status = VEHICLE_STATUSES.includes(source.status) ? source.status : VEHICLE_STATUSES.includes(existing.status) ? existing.status : 'Active'
  return {
    value: {
      number,
      model: text(mergeField(source, existing, 'model'), 60),
      capacity: capacity === null ? null : Math.round(capacity),
      insuranceTill,
      status,
      notes: text(mergeField(source, existing, 'notes'), 300),
    },
  }
}

export function normalizeAllocation(body, existing = {}) {
  const source = body && typeof body === 'object' ? body : {}
  const studentId = text(mergeField(source, existing, 'studentId'), 80)
  const routeId = text(mergeField(source, existing, 'routeId'), 60)
  if (!studentId) return { error: 'Select a student.' }
  if (!routeId) return { error: 'Select a route.' }
  return {
    value: {
      studentId,
      studentApplicationId: text(mergeField(source, existing, 'studentApplicationId'), 80),
      routeId,
      pickupStopId: text(mergeField(source, existing, 'pickupStopId'), 60),
      dropStopId: text(mergeField(source, existing, 'dropStopId'), 60),
      notes: text(mergeField(source, existing, 'notes'), 200),
    },
  }
}

export function routeSignature(stops) {
  return (Array.isArray(stops) ? stops : [])
    .map((stop) => `${Number(stop.lat).toFixed(5)},${Number(stop.lng).toFixed(5)}`)
    .join('|')
}

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

export function straightGeometry(stops) {
  const coordinates = stops.map((stop) => [stop.lat, stop.lng])
  let distanceMeters = 0
  for (let index = 1; index < stops.length; index += 1) {
    distanceMeters += haversineMeters(stops[index - 1], stops[index])
  }
  return {
    coordinates,
    distanceMeters: Math.round(distanceMeters),
    durationSeconds: null,
    source: 'straight',
  }
}

/** OSRM demo server — free, no key. Returns null on any failure so the
    caller can fall back to a direct line instead of inventing a path. */
export async function fetchRoadGeometry(stops) {
  if (!Array.isArray(stops) || stops.length < 2) return null
  const path = stops.map((stop) => `${stop.lng},${stop.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&steps=false`
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    })
    if (!response.ok) return null
    const body = await response.json()
    const road = body?.routes?.[0]
    const raw = road?.geometry?.coordinates
    if (!Array.isArray(raw) || raw.length < 2) return null
    const coordinates = raw
      .map((pair) => [Number(pair?.[1]), Number(pair?.[0])])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
    if (coordinates.length < 2) return null
    return {
      coordinates,
      distanceMeters: Math.round(Number(road.distance) || 0),
      durationSeconds: Math.round(Number(road.duration) || 0),
      source: 'osrm',
    }
  } catch {
    return null
  }
}
