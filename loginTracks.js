import fs from 'fs'
import process from 'node:process'
import { join } from 'path'
import { sendSecurityAlertEmail } from './emailOtp.js'
import { getDataDirectory } from './vercelBlobStore.js'

const DATA_DIR = getDataDirectory()
const TRACKS_FILE = join(DATA_DIR, 'login_tracks.json')
const MAX_EVENTS = 2000
const ALERT_THROTTLE_MS = 30 * 60 * 1000
const IP_CACHE_TTL_MS = 30 * 60 * 1000

const FLAG_WEIGHTS = {
  'new-device': 20,
  'new-ip': 25,
  'new-location': 35,
  'unusual-hour': 10,
  'rapid-failures': 30,
  'impossible-travel': 45,
  'location-mismatch': 30,
}

/** Device GPS farther than this from the server-verified IP location is treated as a mismatch. */
const GEO_MATCH_KM = 300

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(TRACKS_FILE)) fs.writeFileSync(TRACKS_FILE, '[]', 'utf8')
}

export function readTracks() {
  ensureFile()
  try {
    const parsed = JSON.parse(fs.readFileSync(TRACKS_FILE, 'utf8') || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeTracks(list) {
  ensureFile()
  fs.writeFileSync(TRACKS_FILE, JSON.stringify(list, null, 2), 'utf8')
}

export function parseDevice(userAgent) {
  const ua = String(userAgent || '')
  let browser = 'Unknown'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  else if (/postman|insomnia/i.test(ua)) browser = 'API client'
  else if (ua) browser = 'Other'

  let os = 'Unknown'
  if (/Windows NT/.test(ua)) os = 'Windows'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  let type = 'desktop'
  if (/bot|crawl|spider|slurp|curl|wget|python|axios|node-fetch|postman/i.test(ua)) type = 'bot'
  else if (/iPad|Tablet/.test(ua)) type = 'tablet'
  else if (/Mobi|Android|iPhone/.test(ua)) type = 'mobile'

  return { browser, os, type, uaShort: ua.slice(0, 180) }
}

export function haversineKm(a, b) {
  if (!a || !b) return 0
  const toRad = (deg) => (Number(deg) * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

function hasGeo(geo) {
  return Boolean(geo && Number.isFinite(Number(geo.lat)) && Number.isFinite(Number(geo.lon)))
}

function sameEmail(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

/**
 * Pure risk engine. `history` is the newest-first list of previous events
 * (the current event is excluded by id).
 */
export function assessRisk(event, history = []) {
  const flags = []
  const previous = history.filter((e) => sameEmail(e.email, event.email) && e.id !== event.id)
  const successes = previous.filter((e) => e.stage === 'login-success')
  const latestGeo = successes.find((e) => hasGeo(e.geo))
  const deviceSig = `${event.device?.browser}|${event.device?.os}`

  if (event.deviceGeo && event.deviceGeo.verified === false) {
    flags.push({
      key: 'location-mismatch',
      label: 'Location mismatch',
      detail: `Device GPS is ~${event.deviceGeo.mismatchKm} km away from the server-verified IP location — possible mock location or VPN`,
    })
  }

  if (successes.length) {
    if (!successes.some((e) => `${e.device?.browser}|${e.device?.os}` === deviceSig)) {
      flags.push({
        key: 'new-device',
        label: 'New device',
        detail: `${event.device?.browser || 'Unknown browser'} on ${event.device?.os || 'unknown OS'} used for the first time`,
      })
    }

    if (event.ip && !successes.some((e) => e.ip === event.ip)) {
      flags.push({
        key: 'new-ip',
        label: 'New IP',
        detail: `IP ${event.ip} never used before for this account`,
      })
    }

    if (hasGeo(event.geo) && latestGeo) {
      const km = haversineKm(latestGeo.geo, event.geo)
      if (km > 50) {
        flags.push({
          key: 'new-location',
          label: 'New location',
          detail: `~${Math.round(km)} km away from the last known login`,
        })
      }
      const hoursApart = (new Date(event.at).getTime() - new Date(latestGeo.at).getTime()) / 3600000
      if (hoursApart >= 0 && hoursApart <= 1 && km > 200) {
        flags.push({
          key: 'impossible-travel',
          label: 'Impossible travel',
          detail: `${Math.round(km)} km covered in under an hour — verify this login`,
        })
      }
    }
  }

  const hour = new Date(event.at).getHours()
  if (hour >= 23 || hour < 5) {
    flags.push({
      key: 'unusual-hour',
      label: 'Unusual hour',
      detail: `Login at ${String(hour).padStart(2, '0')}:${String(new Date(event.at).getMinutes()).padStart(2, '0')} — outside normal hours`,
    })
  }

  const windowStart = new Date(event.at).getTime() - 15 * 60 * 1000
  const recentFailures = previous.filter(
    (e) =>
      (e.stage === 'login-failed' || e.stage === 'otp-failed') &&
      new Date(e.at).getTime() >= windowStart,
  )
  if (recentFailures.length >= 3) {
    flags.push({
      key: 'rapid-failures',
      label: 'Rapid failures',
      detail: `${recentFailures.length} failed attempts in the last 15 minutes`,
    })
  }

  const score = flags.reduce((sum, f) => sum + (FLAG_WEIGHTS[f.key] || 0), 0)
  const risk = score >= 70 ? 'high' : score >= 30 ? 'watch' : 'safe'
  return { risk, score, flags }
}

export function isPrivateIp(ip) {
  const value = String(ip || '')
  if (!value) return true
  if (value === '127.0.0.1' || value === '::1' || value === 'localhost') return true
  if (/^10\./.test(value)) return true
  if (/^192\.168\./.test(value)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(value)) return true
  if (/^169\.254\./.test(value)) return true
  if (/^f[cd][0-9a-f]{2}:/i.test(value)) return true
  return false
}

export function getClientIp(req) {
  // The TCP peer address cannot be spoofed by the client. Forwarded headers
  // are only honored behind a trusted reverse proxy (TRUST_PROXY=1).
  let ip = ''
  if (process.env.TRUST_PROXY === '1') {
    ip = String(req?.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim()
  }
  ip = ip || req?.socket?.remoteAddress || req?.ip || ''
  ip = ip.replace(/^::ffff:/, '').replace(/^\[|\]$/g, '')
  if (ip === '::1') ip = '127.0.0.1'
  return ip
}

const ipCache = new Map()

/** Free geolocation lookup for public IPs; returns null on any failure. */
export async function lookupIpLocation(ip) {
  if (!ip || isPrivateIp(ip)) return null
  const cached = ipCache.get(ip)
  if (cached && Date.now() - cached.at < IP_CACHE_TTL_MS) return cached.data

  let result = null
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: AbortSignal.timeout(4500),
      headers: { 'user-agent': 'sms-login-tracks' },
    })
    if (res.ok) {
      const d = await res.json()
      if (d && !d.error && Number.isFinite(Number(d.latitude))) {
        result = {
          lat: Number(d.latitude),
          lon: Number(d.longitude),
          city: d.city || '',
          region: d.region || '',
          country: d.country_name || '',
          source: 'ip',
        }
      }
    }
  } catch {
    /* try next provider */
  }

  if (!result) {
    try {
      const res = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,lat,lon`,
        { signal: AbortSignal.timeout(4500) },
      )
      if (res.ok) {
        const d = await res.json()
        if (d?.status === 'success') {
          result = {
            lat: Number(d.lat),
            lon: Number(d.lon),
            city: d.city || '',
            region: d.regionName || '',
            country: d.country || '',
            source: 'ip',
          }
        }
      }
    } catch {
      /* no provider reachable */
    }
  }

  ipCache.set(ip, { data: result, at: Date.now() })
  return result
}

/**
 * Sanitizes coordinates reported by the browser. Only the numeric values are
 * kept — city/region/country text from the client is never trusted. Anything
 * outside valid coordinate ranges is discarded so a fake location cannot be
 * injected through the request body.
 */
export function normalizeDeviceGeo(geo) {
  if (!geo || typeof geo !== 'object') return null
  const lat = Number(geo.lat ?? geo.latitude)
  const lon = Number(geo.lon ?? geo.lng ?? geo.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  const accuracy = Number(geo.accuracy)
  return {
    lat,
    lon,
    accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
  }
}

const geocodeCache = new Map()

/** Server-side reverse geocode — place names are always resolved by the server, never taken from the client. */
export async function reverseGeocode(lat, lon) {
  const key = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`
  const cached = geocodeCache.get(key)
  if (cached && Date.now() - cached.at < IP_CACHE_TTL_MS) return cached.data

  let result = null
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`,
      { signal: AbortSignal.timeout(4500), headers: { 'user-agent': 'sms-login-tracks' } },
    )
    if (res.ok) {
      const d = await res.json()
      result = {
        city: d.city || d.locality || '',
        region: d.principalSubdivision || '',
        country: d.countryName || '',
      }
    }
  } catch {
    /* geocode unavailable — coordinates only */
  }

  geocodeCache.set(key, { data: result, at: Date.now() })
  return result
}

/**
 * Builds the location record for an event. The server-verified IP geolocation
 * is the anchor: when the browser-reported GPS matches it (within
 * GEO_MATCH_KM) the exact GPS position becomes the primary location; a
 * mismatch keeps the IP location primary and is flagged in assessRisk;
 * without a public IP only the (unverifiable) device GPS is available.
 */
async function resolveGeo({ ip, geo }) {
  const deviceGeo = normalizeDeviceGeo(geo)
  const ipGeo = ip ? await lookupIpLocation(ip) : null

  if (ipGeo) {
    const ipPrimary = {
      lat: ipGeo.lat,
      lon: ipGeo.lon,
      city: ipGeo.city,
      region: ipGeo.region,
      country: ipGeo.country,
      source: 'ip',
      verified: true,
    }
    if (!deviceGeo) return { primary: ipPrimary, deviceInfo: null }

    const km = haversineKm(ipGeo, deviceGeo)
    const deviceInfo = {
      lat: deviceGeo.lat,
      lon: deviceGeo.lon,
      accuracy: deviceGeo.accuracy,
      verified: km <= GEO_MATCH_KM,
      mismatchKm: Math.round(km),
    }
    if (km > GEO_MATCH_KM) return { primary: ipPrimary, deviceInfo }

    const place = await reverseGeocode(deviceGeo.lat, deviceGeo.lon)
    return {
      primary: {
        lat: deviceGeo.lat,
        lon: deviceGeo.lon,
        city: place?.city || '',
        region: place?.region || '',
        country: place?.country || '',
        source: 'gps',
        verified: true,
      },
      deviceInfo,
    }
  }

  if (deviceGeo) {
    const place = await reverseGeocode(deviceGeo.lat, deviceGeo.lon)
    return {
      primary: {
        lat: deviceGeo.lat,
        lon: deviceGeo.lon,
        city: place?.city || '',
        region: place?.region || '',
        country: place?.country || '',
        source: 'gps',
        verified: false,
      },
      deviceInfo: {
        lat: deviceGeo.lat,
        lon: deviceGeo.lon,
        accuracy: deviceGeo.accuracy,
        verified: null,
        mismatchKm: null,
      },
    }
  }

  return { primary: null, deviceInfo: null }
}

/** Serializes record operations so concurrent logins cannot clobber the store file. */
let recordQueue = Promise.resolve()

async function doRecord({ stage, email, userId = null, name = '', role = '', method = '', ip = '', userAgent = '', geo = null, note = '' }) {
  const { primary: resolvedGeo, deviceInfo } = await resolveGeo({ ip, geo })

  const event = {
    id: `LT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    stage,
    email: String(email || '').trim().toLowerCase(),
    userId,
    name: String(name || '').trim(),
    role: String(role || '').trim().toLowerCase(),
    method: String(method || ''),
    note: String(note || '').slice(0, 160),
    ip: String(ip || ''),
    userAgent: String(userAgent || '').slice(0, 400),
    device: parseDevice(userAgent),
    geo: resolvedGeo,
    deviceGeo: deviceInfo,
    risk: 'safe',
    score: 0,
    flags: [],
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
    alertSentAt: null,
  }

  const tracks = readTracks()
  const assessment = assessRisk(event, tracks)
  event.risk = assessment.risk
  event.score = assessment.score
  event.flags = assessment.flags

  writeTracks([event, ...tracks].slice(0, MAX_EVENTS))

  if (stage === 'login-success' && event.risk === 'high' && event.email) {
    try {
      const throttled = readTracks().some(
        (e) =>
          e.alertSentAt &&
          e.id !== event.id &&
          sameEmail(e.email, event.email) &&
          Date.now() - new Date(e.alertSentAt).getTime() < ALERT_THROTTLE_MS,
      )
      if (!throttled) {
        const mail = await sendSecurityAlertEmail({ to: event.email, event })
        if (mail?.sent) {
          event.alertSentAt = new Date().toISOString()
          writeTracks(
            readTracks().map((e) => (e.id === event.id ? { ...e, alertSentAt: event.alertSentAt } : e)),
          )
        }
      }
    } catch (err) {
      console.error('[login-tracks] alert failed:', err?.message || err)
    }
  }

  return event
}

/**
 * Records a login lifecycle event, scores its risk against the account
 * history and (for high-risk successes only) emails a security alert.
 * Never throws — auth flows must not break because of tracking.
 */
export function recordLoginEvent(payload) {
  const run = recordQueue.then(() => doRecord(payload || {})).catch((err) => {
    console.error('[login-tracks] record failed:', err?.message || err)
    return null
  })
  recordQueue = run.then(() => undefined)
  return run
}

export function markReviewed(id, reviewer = '') {
  const tracks = readTracks()
  let updated = null
  const next = tracks.map((e) => {
    if (e.id !== id) return e
    updated = {
      ...e,
      reviewed: true,
      reviewedBy: String(reviewer || 'Admin').slice(0, 80),
      reviewedAt: new Date().toISOString(),
    }
    return updated
  })
  if (!updated) return null
  writeTracks(next)
  return updated
}

function rangeStart(range) {
  const start = new Date()
  if (range === 'today') {
    start.setHours(0, 0, 0, 0)
    return start.getTime()
  }
  if (range === '7d') return Date.now() - 7 * 86400000
  if (range === '30d') return Date.now() - 30 * 86400000
  return 0
}

export function listTracks({ range = 'all', risk = '', stage = '', role = '', q = '', limit = 300 } = {}) {
  const start = rangeStart(range)
  const query = String(q || '').trim().toLowerCase()
  const max = Math.min(Math.max(Number(limit) || 300, 1), 2000)

  return readTracks()
    .filter((e) => (start ? new Date(e.at).getTime() >= start : true))
    .filter((e) => (risk === 'suspicious' ? e.risk === 'watch' || e.risk === 'high' : risk ? e.risk === risk : true))
    .filter((e) => (stage ? e.stage === stage : true))
    .filter((e) => (role ? e.role === role : true))
    .filter((e) => {
      if (!query) return true
      const haystack = [e.email, e.name, e.ip, e.note, e.geo?.city, e.geo?.region, e.geo?.country, e.device?.browser, e.device?.os]
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
    .slice(0, max)
}

export function summarizeTracks() {
  const tracks = readTracks()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const today = tracks.filter((e) => new Date(e.at).getTime() >= todayStart.getTime())
  const successToday = today.filter((e) => e.stage === 'login-success').length
  const failedToday = today.filter((e) => e.stage === 'login-failed' || e.stage === 'otp-failed').length
  const suspicious = tracks.filter((e) => (e.risk === 'high' || e.risk === 'watch') && !e.reviewed)
  const devices = new Set(
    today.map((e) => `${e.device?.browser}|${e.device?.os}`).filter((s) => s !== '|'),
  )

  return {
    total: tracks.length,
    today: today.length,
    successToday,
    failedToday,
    highRiskUnreviewed: suspicious.filter((e) => e.risk === 'high').length,
    suspiciousUnreviewed: suspicious.length,
    uniqueDevicesToday: devices.size,
    lastEventAt: tracks[0]?.at || null,
  }
}
