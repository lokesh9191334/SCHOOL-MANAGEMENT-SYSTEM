import fs from 'fs'
import process from 'node:process'
import { join } from 'path'
import { sendSecurityAlertEmail } from './emailOtp.js'
import { getDataDirectory } from './vercelBlobStore.js'

const DATA_DIR = getDataDirectory()
const TRACKS_FILE = join(DATA_DIR, 'login_tracks.json')
const DEVICES_FILE = join(DATA_DIR, 'login_devices.json')
const WATCHLIST_FILE = join(DATA_DIR, 'ip_watchlist.json')
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
  'flagged-device': 25,
  'watchlisted-ip': 30,
}

/** GPS↔IP distance above this (km) is recorded as extra info only — GPS always stays primary. */
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

function readStore(file, fallback) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8') || 'null')
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeStore(file, value) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
}

export function deviceFingerprint(device) {
  return `${device?.browser || 'Unknown'}|${device?.os || 'Unknown'}|${device?.type || 'desktop'}`
}

function deviceKey(email, fingerprint) {
  return `${String(email || '').trim().toLowerCase()}::${fingerprint}`
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
 * (the current event is excluded by id). `stores` carries the admin-managed
 * IP watchlist and per-account device trust entries.
 */
export function assessRisk(event, history = [], stores = {}) {
  const flags = []
  const previous = history.filter((e) => sameEmail(e.email, event.email) && e.id !== event.id)
  const successes = previous.filter((e) => e.stage === 'login-success')
  const latestGeo = successes.find((e) => hasGeo(e.geo))
  const deviceSig = `${event.device?.browser}|${event.device?.os}`
  const deviceEntry = stores.devices ? stores.devices[deviceKey(event.email, deviceFingerprint(event.device))] : null

  if (event.ip && stores.watchlist && stores.watchlist[event.ip]) {
    const entry = stores.watchlist[event.ip]
    flags.push({
      key: 'watchlisted-ip',
      label: 'Watchlisted IP',
      detail: `This IP was flagged by an admin${entry.note ? ` — “${entry.note}”` : ''} — every login from it is escalated`,
    })
  }

  if (successes.length) {
    const knownDevice = successes.some((e) => `${e.device?.browser}|${e.device?.os}` === deviceSig)
    if (!knownDevice && deviceEntry?.trust !== 'trusted') {
      flags.push({
        key: 'new-device',
        label: 'New device',
        detail: `${event.device?.browser || 'Unknown browser'} on ${event.device?.os || 'unknown OS'} used for the first time`,
      })
    }

    if (deviceEntry?.trust === 'suspicious') {
      flags.push({
        key: 'flagged-device',
        label: 'Flagged device',
        detail: 'An admin marked this device suspicious for this account — verify this sign-in with the account owner',
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
    // The geocode API sometimes answers with a 3xx status while still carrying
    // the JSON body — parse the body and validate fields instead of res.ok.
    const d = await res.json()
    if (d && (d.city || d.locality || d.principalSubdivision || d.countryName)) {
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
 * Builds the location record for an event. The device's real GPS fix is the
 * actual position of the user, so it is ALWAYS the primary location when the
 * browser provides one — mobile carrier IPs often geolocate to a distant
 * city, so the IP fix never overrides or rejects the GPS. The server-verified
 * IP location is only a fallback (used when no GPS was captured) and the
 * GPS↔IP distance is kept purely as extra information on the event.
 */
async function resolveGeo({ ip, geo }) {
  const deviceGeo = normalizeDeviceGeo(geo)
  const ipGeo = ip ? await lookupIpLocation(ip) : null

  if (deviceGeo) {
    const place = await reverseGeocode(deviceGeo.lat, deviceGeo.lon)
    const km = ipGeo ? haversineKm(ipGeo, deviceGeo) : null
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
      deviceInfo: {
        lat: deviceGeo.lat,
        lon: deviceGeo.lon,
        accuracy: deviceGeo.accuracy,
        verified: km == null ? null : km <= GEO_MATCH_KM,
        mismatchKm: km == null ? null : Math.round(km),
      },
    }
  }

  if (ipGeo) {
    return {
      primary: {
        lat: ipGeo.lat,
        lon: ipGeo.lon,
        city: ipGeo.city,
        region: ipGeo.region,
        country: ipGeo.country,
        source: 'ip',
        verified: true,
      },
      deviceInfo: null,
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
  const watchlist = readStore(WATCHLIST_FILE, {})
  const devices = readStore(DEVICES_FILE, {})
  const assessment = assessRisk(event, tracks, { watchlist, devices })
  event.risk = assessment.risk
  event.score = assessment.score
  event.flags = assessment.flags

  writeTracks([event, ...tracks].slice(0, MAX_EVENTS))

  if (event.ip && watchlist[event.ip]) {
    watchlist[event.ip].hits = (watchlist[event.ip].hits || 0) + 1
    watchlist[event.ip].lastHitAt = event.at
    writeStore(WATCHLIST_FILE, watchlist)
  }

  if (stage === 'login-success' && event.email) {
    const fingerprint = deviceFingerprint(event.device)
    const key = deviceKey(event.email, fingerprint)
    devices[key] = {
      email: event.email,
      name: event.name,
      role: event.role,
      fingerprint,
      browser: event.device?.browser || 'Unknown',
      os: event.device?.os || 'Unknown',
      type: event.device?.type || 'desktop',
      firstSeen: devices[key]?.firstSeen || event.at,
      lastSeen: event.at,
      trust: devices[key]?.trust || null,
      updatedAt: devices[key]?.updatedAt || null,
      updatedBy: devices[key]?.updatedBy || null,
    }
    writeStore(DEVICES_FILE, devices)
  }

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

/** Admin view of every known account device, enriched with live track stats. */
export function listKnownDevices() {
  const store = readStore(DEVICES_FILE, {})
  const tracks = readTracks()
  const stats = new Map()

  for (const e of tracks) {
    if (!e.email) continue
    const key = deviceKey(e.email, deviceFingerprint(e.device))
    const stat =
      stats.get(key) ||
      { events: 0, successes: 0, highRisk: 0, lastSeenAt: null, lastSuccessAt: null, ips: new Set() }
    stat.events += 1
    if (e.stage === 'login-success') {
      stat.successes += 1
      stat.lastSuccessAt = stat.lastSuccessAt || e.at
    }
    if (e.risk === 'high') stat.highRisk += 1
    stat.lastSeenAt = stat.lastSeenAt || e.at
    if (e.ip) stat.ips.add(e.ip)
    stats.set(key, stat)
  }

  const devices = Object.entries(store).map(([key, d]) => {
    const stat = stats.get(key)
    return {
      key,
      email: d.email,
      name: d.name || '',
      role: d.role || '',
      fingerprint: d.fingerprint,
      browser: d.browser,
      os: d.os,
      type: d.type,
      firstSeen: d.firstSeen,
      lastSeen: stat?.lastSeenAt || d.lastSeen,
      logins: stat?.successes ?? 0,
      events: stat?.events ?? 0,
      highRisk: stat?.highRisk ?? 0,
      ips: stat ? [...stat.ips].slice(0, 5) : [],
      trust: d.trust || null,
      updatedBy: d.updatedBy || null,
      updatedAt: d.updatedAt || null,
    }
  })
  devices.sort((a, b) => String(b.lastSeen || '').localeCompare(String(a.lastSeen || '')))
  return devices
}

export function setDeviceTrust({ email, fingerprint, trust, by }) {
  const store = readStore(DEVICES_FILE, {})
  const key = deviceKey(email, fingerprint)
  if (!store[key]) return null
  store[key] = {
    ...store[key],
    trust: trust || null,
    updatedAt: new Date().toISOString(),
    updatedBy: String(by || '').slice(0, 80),
  }
  writeStore(DEVICES_FILE, store)
  return { key, ...store[key] }
}

const IP_PATTERN = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){1,7})$/i

export function listWatchlist() {
  const store = readStore(WATCHLIST_FILE, {})
  return Object.entries(store)
    .map(([ip, w]) => ({ ip, ...w }))
    .sort((a, b) => (b.lastHitAt || b.at || '').localeCompare(a.lastHitAt || a.at || ''))
}

export function setWatchlistEntry({ ip, action = 'add', note = '', by = '' }) {
  const value = String(ip || '').trim()
  if (!IP_PATTERN.test(value) || value.length > 45) throw new Error('Enter a valid IP address')
  const store = readStore(WATCHLIST_FILE, {})

  if (action === 'remove') {
    if (!store[value]) return null
    delete store[value]
    writeStore(WATCHLIST_FILE, store)
    return { ip: value, removed: true }
  }

  const prev = store[value]
  store[value] = {
    note: String(note ?? prev?.note ?? '').slice(0, 140),
    by: String(by || prev?.by || '').slice(0, 80),
    at: prev?.at || new Date().toISOString(),
    hits: prev?.hits || 0,
    lastHitAt: prev?.lastHitAt || null,
  }
  writeStore(WATCHLIST_FILE, store)
  return { ip: value, ...store[value] }
}

/** Aggregates for the analytics tab — computed over the whole store, ignoring list filters. */
export function computeAnalytics() {
  const tracks = readTracks()

  const daily = []
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    daily.push({ date: d.toISOString().slice(0, 10), success: 0, failed: 0 })
  }
  const dailyIndex = new Map(daily.map((d) => [d.date, d]))
  const risk = { safe: 0, watch: 0, high: 0 }
  const stages = {}
  const browsers = new Map()
  const types = new Map()
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
  const cities = new Map()

  for (const e of tracks) {
    const day = dailyIndex.get(String(e.at || '').slice(0, 10))
    if (day) {
      if (e.stage === 'login-success') day.success += 1
      else if (e.stage === 'login-failed' || e.stage === 'otp-failed') day.failed += 1
    }
    if (risk[e.risk] !== undefined) risk[e.risk] += 1
    if (e.stage) stages[e.stage] = (stages[e.stage] || 0) + 1
    if (e.device?.browser && e.device.browser !== 'Unknown') {
      browsers.set(e.device.browser, (browsers.get(e.device.browser) || 0) + 1)
    }
    if (e.device?.type) types.set(e.device.type, (types.get(e.device.type) || 0) + 1)
    const hour = new Date(e.at).getHours()
    if (Number.isFinite(hour)) hours[hour].count += 1

    if (hasGeo(e.geo) && String(e.geo?.city || '').trim()) {
      const key = `${e.geo.city}, ${e.geo.country || ''}`.replace(/, $/, '')
      const c = cities.get(key) || { label: e.geo.city, country: e.geo.country || '', lat: 0, lon: 0, count: 0 }
      c.count += 1
      c.lat += Number(e.geo.lat)
      c.lon += Number(e.geo.lon)
      cities.set(key, c)
    }
  }

  const top = (map, n) =>
    [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n)

  return {
    daily,
    risk,
    stages,
    hours,
    browsers: top(browsers, 6),
    types: top(types, 4),
    topCities: [...cities.values()]
      .map((c) => ({
        label: c.label,
        country: c.country,
        count: c.count,
        lat: Number((c.lat / c.count).toFixed(5)),
        lon: Number((c.lon / c.count).toFixed(5)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  }
}
