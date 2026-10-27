const EARTH_RADIUS_M = 6371000
const PASSED_TOLERANCE_M = 30

function toRad(value) {
  return (value * Math.PI) / 180
}

export function haversineMeters(a, b) {
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

function pathMetrics(path) {
  const cumulative = [0]
  for (let index = 1; index < path.length; index += 1) {
    cumulative.push(cumulative[index - 1] + haversineMeters(path[index - 1], path[index]))
  }
  return cumulative
}

/** Nearest point on a polyline using a local planar projection. */
function projectOnPath(point, path, cumulative) {
  if (!Array.isArray(path) || path.length < 2) return null
  const lat0 = toRad(point[0])
  const cosLat = Math.cos(lat0)
  const project = (lat, lng) => [toRad(lng) * EARTH_RADIUS_M * cosLat, toRad(lat) * EARTH_RADIUS_M]
  const [px, py] = project(point[0], point[1])
  let best = null
  for (let index = 0; index < path.length - 1; index += 1) {
    const [ax, ay] = project(path[index][0], path[index][1])
    const [bx, by] = project(path[index + 1][0], path[index + 1][1])
    const dx = bx - ax
    const dy = by - ay
    const lengthSq = dx * dx + dy * dy
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0
    const qx = ax + dx * t
    const qy = ay + dy * t
    const offset = Math.hypot(px - qx, py - qy)
    if (!best || offset < best.offsetMeters) {
      const segmentLength = cumulative[index + 1] - cumulative[index]
      best = {
        offsetMeters: offset,
        segmentIndex: index,
        t,
        distanceAlong: cumulative[index] + segmentLength * t,
        point: [
          path[index][0] + (path[index + 1][0] - path[index][0]) * t,
          path[index][1] + (path[index + 1][1] - path[index][1]) * t,
        ],
      }
    }
  }
  return best
}

export function formatDistance(meters) {
  if (meters === null || meters === undefined || !Number.isFinite(Number(meters))) return '—'
  const value = Number(meters)
  if (value < 1000) return `${Math.max(0, Math.round(value))} m`
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)} km`
}

export function formatEta(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return '—'
  const minutes = Math.max(1, Math.round(Number(seconds) / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr ${minutes % 60} min`
}

/**
 * Real-GPS progress along the road geometry. Returns null unless both the
 * route geometry and a live position exist — nothing is drawn from guesses.
 */
export function computeRouteProgress({ geometry, stops = [], vehicle = null }) {
  const path = Array.isArray(geometry) ? geometry.filter((pair) => Array.isArray(pair) && pair.length === 2) : []
  if (path.length < 2 || !stops.length) return null
  const cumulative = pathMetrics(path)
  const totalDistance = cumulative[cumulative.length - 1]
  const ping = vehicle?.lastPing
  const hasFix = ping && Number.isFinite(Number(ping.lat)) && Number.isFinite(Number(ping.lng))
  const busPoint = hasFix ? [Number(ping.lat), Number(ping.lng)] : null
  const projection = busPoint ? projectOnPath(busPoint, path, cumulative) : null

  const stopRows = stops.map((stop, index) => {
    const point = [Number(stop.lat), Number(stop.lng)]
    const projected = projectOnPath(point, path, cumulative)
    return {
      ...stop,
      order: index + 1,
      distanceAlong: projected?.distanceAlong ?? null,
      offsetMeters: projected?.offsetMeters ?? null,
      passed: false,
      isNext: false,
    }
  })

  let nextStop = null
  if (projection) {
    for (const stop of stopRows) {
      if (stop.distanceAlong === null) continue
      if (stop.distanceAlong <= projection.distanceAlong + PASSED_TOLERANCE_M) {
        stop.passed = true
      } else if (!nextStop) {
        stop.isNext = true
        nextStop = stop
      }
    }
  }

  const completedPath = projection
    ? [...path.slice(0, projection.segmentIndex + 1), projection.point]
    : []
  const speedMps = Number(ping?.speed)
  const nextDistance = nextStop && projection ? Math.max(0, nextStop.distanceAlong - projection.distanceAlong) : null
  const etaSeconds = nextDistance !== null && Number.isFinite(speedMps) && speedMps >= 0.6 ? nextDistance / speedMps : null

  return {
    path,
    totalDistance,
    completedPath,
    busPoint,
    progressPoint: projection?.point || null,
    progressDistance: projection?.distanceAlong || 0,
    percent: totalDistance > 0 ? Math.min(100, (Number(projection?.distanceAlong || 0) / totalDistance) * 100) : 0,
    offRouteMeters: projection?.offsetMeters ?? null,
    nextStop,
    nextStopDistanceMeters: nextDistance,
    etaSeconds,
    stops: stopRows,
    hasFix: Boolean(hasFix),
  }
}
