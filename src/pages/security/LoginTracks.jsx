import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  fetchTracks,
  reviewTrack,
  fetchAnalytics,
  fetchDevices,
  setDeviceTrust,
  fetchWatchlist,
  updateWatchlist,
} from '../../services/loginTracks'
import { getAuthUser, roleLabel } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import '../../styles/login-tracks-premium.css'

const RISK_META = {
  safe: { label: 'Safe', tone: 'safe' },
  watch: { label: 'Watch', tone: 'watch' },
  high: { label: 'High risk', tone: 'high' },
}

const STAGE_META = {
  'login-success': { label: 'Login success', tone: 'ok' },
  'login-attempt': { label: 'OTP sent', tone: 'info' },
  'login-failed': { label: 'Login failed', tone: 'fail' },
  'otp-failed': { label: 'OTP failed', tone: 'fail' },
}

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
]

const STAGE_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'login-success', label: 'Login success' },
  { value: 'login-attempt', label: 'OTP sent' },
  { value: 'login-failed', label: 'Login failed' },
  { value: 'otp-failed', label: 'OTP failed' },
]

const RISK_OPTIONS = [
  { value: '', label: 'All risks' },
  { value: 'suspicious', label: 'Suspicious only' },
  { value: 'high', label: 'High risk' },
  { value: 'watch', label: 'Watch' },
  { value: 'safe', label: 'Safe' },
]

const ROLE_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
]

const TABS = [
  { value: 'live', label: 'Live feed', icon: '⌖' },
  { value: 'map', label: 'World map', icon: '◉' },
  { value: 'analytics', label: 'Analytics', icon: '▦' },
  { value: 'devices', label: 'Known devices', icon: '▣' },
  { value: 'watchlist', label: 'IP watchlist', icon: '⚑' },
]

const ALERTS_STORAGE_KEY = 'ltrack-live-alerts'

const RISK_COLOR = { high: '#ef4444', watch: '#f59e0b', safe: '#10b981' }

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return 'just now'
  if (diff < 60000) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function fullTime(iso) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function locationLabel(geo) {
  if (!geo) return 'Location unavailable'
  const parts = [geo.city, geo.region, geo.country].map((p) => String(p || '').trim()).filter(Boolean)
  return parts.join(', ') || 'Coordinates only'
}

function coordsLabel(geo) {
  if (!geo || !Number.isFinite(Number(geo.lat)) || !Number.isFinite(Number(geo.lon))) return ''
  return `${Number(geo.lat).toFixed(4)}, ${Number(geo.lon).toFixed(4)}`
}

function mapEmbedUrl(geo) {
  const lat = Number(geo?.lat)
  const lon = Number(geo?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return ''
  const d = 0.012
  const bbox = [lon - d, lat - d, lon + d, lat + d].map((n) => n.toFixed(5)).join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lon.toFixed(5)}`
}

function mapLink(geo) {
  const lat = Number(geo?.lat)
  const lon = Number(geo?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return ''
  return `https://www.google.com/maps?q=${lat},${lon}`
}

function geoTag(event) {
  if (event?.deviceGeo?.verified === true) return ' · GPS ✓'
  if (event?.deviceGeo?.verified === false) return ' · GPS ⚠'
  if (event?.geo?.source === 'gps') return ' · GPS unverified'
  if (event?.geo) return ' · IP ✓'
  return ''
}

function geoTagTitle(event) {
  if (event?.deviceGeo?.verified === true) return 'Device GPS matches the server-verified IP location'
  if (event?.deviceGeo?.verified === false) {
    return `Device GPS is ~${event.deviceGeo.mismatchKm} km away from the server-verified IP location`
  }
  if (event?.geo?.source === 'gps') return 'Device-reported location — could not be verified against a public IP'
  if (event?.geo?.source === 'ip') return 'Server-verified from the connection IP — cannot be faked by the browser'
  return ''
}

function verificationLabel(event) {
  if (event?.deviceGeo?.verified === true) return 'Device GPS verified against IP — exact GPS shown'
  if (event?.deviceGeo?.verified === false) return `MISMATCH — device vs IP (~${event.deviceGeo.mismatchKm} km)`
  if (event?.geo?.source === 'gps') return 'Device-reported (unverified)'
  if (event?.geo) return 'Server-verified (IP)'
  return ''
}

function deviceGeoLabel(event) {
  const info = event?.deviceGeo
  if (!info) return '—'
  const coords = `${Number(info.lat).toFixed(4)}, ${Number(info.lon).toFixed(4)}`
  if (info.verified === true) return `${coords} — matches IP location ✓`
  if (info.verified === false) return `${coords} — ~${info.mismatchKm} km from IP location ⚠`
  return `${coords} — unverifiable (no public IP)`
}

function mapTitle(event) {
  if (event?.deviceGeo?.verified === true) return 'Device GPS location — exact position, verified against the IP'
  if (event?.geo?.source === 'gps') return 'Device-reported location'
  return 'Server-verified location (IP-based)'
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function exportCsv(events) {
  const head = [
    'Time', 'Email', 'Name', 'Role', 'Event', 'Method', 'Risk', 'Score', 'Flags', 'IP',
    'Browser', 'OS', 'Device type', 'City', 'Region', 'Country', 'Latitude', 'Longitude',
    'Location verification', 'Device latitude', 'Device longitude', 'Device accuracy (m)',
    'Device mismatch vs IP (km)', 'Note', 'Reviewed', 'Reviewed by',
  ]
  const rows = events.map((e) => [
    e.at, e.email, e.name, e.role, e.stage, e.method, e.risk, e.score,
    (e.flags || []).map((f) => f.label).join('; '),
    e.ip, e.device?.browser, e.device?.os, e.device?.type,
    e.geo?.city, e.geo?.region, e.geo?.country, e.geo?.lat, e.geo?.lon,
    verificationLabel(e),
    e.deviceGeo?.lat, e.deviceGeo?.lon, e.deviceGeo?.accuracy, e.deviceGeo?.mismatchKm,
    e.note, e.reviewed ? 'yes' : 'no', e.reviewedBy || '',
  ])
  const csv = [head, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `login-tracks-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function buildPopup(event, onOpen) {
  const el = document.createElement('div')
  el.className = 'ltrack-map-popup'
  const risk = RISK_META[event.risk] || RISK_META.safe
  const color = RISK_COLOR[event.risk] || RISK_COLOR.safe
  const flags = (event.flags || []).map((f) => f.label).join(' · ')
  el.innerHTML = `
    <p class="ltrack-map-popup-kicker">${escapeHtml(STAGE_META[event.stage]?.label || event.stage)}</p>
    <p class="ltrack-map-popup-name">${escapeHtml(event.name || event.email || 'Unknown')}</p>
    <p class="ltrack-map-popup-sub">${escapeHtml(locationLabel(event.geo))}</p>
    ${coordsLabel(event.geo) ? `<p class="ltrack-map-popup-sub ltrack-mono">${escapeHtml(coordsLabel(event.geo))}</p>` : ''}
    <p class="ltrack-map-popup-risk" style="color:${color}">${escapeHtml(risk.label)}${flags ? ` — ${escapeHtml(flags)}` : ''}</p>
    <button type="button" class="ltrack-map-popup-btn">Open details</button>
  `
  el.querySelector('button').addEventListener('click', () => onOpen(event.id))
  return el
}

function RiskBadge({ risk, score }) {
  const meta = RISK_META[risk] || RISK_META.safe
  return (
    <span className={`ltrack-badge ltrack-badge--${meta.tone}`}>
      {meta.label}
      {Number.isFinite(Number(score)) && risk !== 'safe' ? <em>{score}</em> : null}
    </span>
  )
}

function StageBadge({ stage }) {
  const meta = STAGE_META[stage] || { label: stage, tone: 'info' }
  return <span className={`ltrack-badge ltrack-badge--stage-${meta.tone}`}>{meta.label}</span>
}

function WorldMap({ events, onOpen }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const lastFitRef = useRef('')

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined
    const map = L.map(containerRef.current, {
      center: [22, 20],
      zoom: 2,
      worldCopyJump: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const t = setTimeout(() => map.invalidateSize(), 150)
    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    const geoEvents = events
      .filter((e) => Number.isFinite(Number(e.geo?.lat)) && Number.isFinite(Number(e.geo?.lon)))
      .slice(0, 150)

    const lastGeoByEmail = new Map()
    const lines = []
    for (const e of [...geoEvents].sort((a, b) => new Date(a.at) - new Date(b.at))) {
      const prev = lastGeoByEmail.get(e.email)
      if ((e.flags || []).some((f) => f.key === 'impossible-travel') && prev) {
        lines.push({ from: prev.geo, to: e.geo })
      }
      lastGeoByEmail.set(e.email, e)
    }

    for (const line of lines) {
      L.polyline(
        [
          [Number(line.from.lat), Number(line.from.lon)],
          [Number(line.to.lat), Number(line.to.lon)],
        ],
        { color: '#f87171', weight: 1.5, dashArray: '6 6', opacity: 0.75 },
      ).addTo(layer)
    }

    const bounds = []
    for (const event of geoEvents) {
      const lat = Number(event.geo.lat)
      const lon = Number(event.geo.lon)
      const color = RISK_COLOR[event.risk] || RISK_COLOR.safe
      const isFailure = event.stage === 'login-failed' || event.stage === 'otp-failed'
      L.circleMarker([lat, lon], {
        radius: event.risk === 'high' ? 9 : event.risk === 'watch' ? 7 : 5,
        color,
        weight: 2,
        fillColor: isFailure ? '#7c3aed' : color,
        fillOpacity: event.risk === 'safe' ? 0.45 : 0.75,
      })
        .bindPopup(buildPopup(event, onOpen), { maxWidth: 280, className: 'ltrack-leaflet-popup' })
        .addTo(layer)
      bounds.push([lat, lon])
    }

    const fitKey = `${geoEvents.length}:${bounds[0]?.[0]?.toFixed(3) || ''}`
    if (bounds.length && lastFitRef.current !== fitKey) {
      lastFitRef.current = fitKey
      map.fitBounds(L.latLngBounds(bounds).pad(0.25), { animate: false })
    }
  }, [events, onOpen])

  return (
    <div className="ltrack-map-card">
      <div ref={containerRef} className="ltrack-map" role="application" aria-label="World map of login events" />
      <div className="ltrack-map-legend">
        <span><i className="dot dot--high" /> High risk</span>
        <span><i className="dot dot--watch" /> Watch</span>
        <span><i className="dot dot--safe" /> Safe</span>
        <span><i className="dot dot--fail" /> Failed attempt</span>
        <span><i className="dot dot--travel" /> Impossible travel</span>
      </div>
    </div>
  )
}

function RiskDonut({ risk }) {
  const total = (risk?.safe || 0) + (risk?.watch || 0) + (risk?.high || 0)
  const R = 54
  const C = 2 * Math.PI * R
  const segs = [
    { key: 'high', value: risk?.high || 0, color: RISK_COLOR.high },
    { key: 'watch', value: risk?.watch || 0, color: RISK_COLOR.watch },
    { key: 'safe', value: risk?.safe || 0, color: RISK_COLOR.safe },
  ]
  let offset = 0
  return (
    <article className="ltrack-chart-card">
      <p className="ltrack-section-title">Risk breakdown</p>
      {total === 0 ? (
        <p className="ltrack-chart-empty">No events yet</p>
      ) : (
        <div className="ltrack-donut-wrap">
          <svg viewBox="0 0 140 140" className="ltrack-donut" role="img" aria-label="Risk breakdown chart">
            <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="16" />
            {segs.map((seg) => {
              if (!seg.value) return null
              const len = (seg.value / total) * C
              const node = (
                <circle
                  key={seg.key}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="16"
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                />
              )
              offset += len
              return node
            })}
          </svg>
          <div className="ltrack-donut-legend">
            {segs.map((seg) => (
              <span key={seg.key}>
                <i className={`dot dot--${seg.key}`} /> {seg.value} {seg.key}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function DailyChart({ daily }) {
  const max = Math.max(1, ...daily.map((d) => d.success + d.failed))
  return (
    <article className="ltrack-chart-card ltrack-chart-card--wide">
      <p className="ltrack-section-title">Sign-ins — last 14 days</p>
      <div className="ltrack-bars">
        {daily.map((d) => {
          const label = new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
          return (
            <div key={d.date} className="ltrack-bar-col" title={`${label}: ${d.success} success · ${d.failed} failed`}>
              <div className="ltrack-bar-stack">
                <div className="ltrack-bar ltrack-bar--success" style={{ height: `${Math.round((d.success / max) * 100)}%` }} />
                <div className="ltrack-bar ltrack-bar--failed" style={{ height: `${Math.round((d.failed / max) * 100)}%` }} />
              </div>
              <span className="ltrack-bar-label">{label}</span>
            </div>
          )
        })}
      </div>
      <div className="ltrack-chart-legend">
        <span><i className="dot dot--safe" /> Success</span>
        <span><i className="dot dot--high" /> Failed</span>
      </div>
    </article>
  )
}

function HBars({ title, items }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <article className="ltrack-chart-card">
      <p className="ltrack-section-title">{title}</p>
      {items.length === 0 ? (
        <p className="ltrack-chart-empty">No data yet</p>
      ) : (
        <div className="ltrack-hbars">
          {items.map((item) => (
            <div key={item.label} className="ltrack-hbar-row">
              <span className="ltrack-hbar-label" title={item.label}>{item.label}</span>
              <div className="ltrack-hbar-track">
                <div className="ltrack-hbar-fill" style={{ width: `${Math.max(6, Math.round((item.count / max) * 100))}%` }} />
              </div>
              <span className="ltrack-hbar-value">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function HoursChart({ hours }) {
  const max = Math.max(1, ...hours.map((h) => h.count))
  return (
    <article className="ltrack-chart-card ltrack-chart-card--wide">
      <p className="ltrack-section-title">Activity by hour · 23:00–05:00 is outside normal hours</p>
      <div className="ltrack-hours">
        {hours.map((h) => (
          <div
            key={h.hour}
            className={`ltrack-hour-col ${h.hour >= 23 || h.hour < 5 ? 'is-night' : ''}`}
            title={`${String(h.hour).padStart(2, '0')}:00 — ${h.count} events`}
          >
            <div className="ltrack-hour-bar" style={{ height: `${Math.max(4, Math.round((h.count / max) * 100))}%` }} />
            <span className="ltrack-hour-label">{h.hour % 3 === 0 ? String(h.hour).padStart(2, '0') : ''}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function playAlertChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[880, 1174.66, 1567.98].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.16, now + i * 0.18 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.42)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.18)
      osc.stop(now + i * 0.18 + 0.5)
    })
    setTimeout(() => ctx.close().catch(() => {}), 1600)
  } catch {
    /* audio blocked until first user gesture — non-fatal */
  }
}

function trustChip(trust) {
  if (trust === 'trusted') return <span className="ltrack-trust ltrack-trust--trusted">Trusted</span>
  if (trust === 'suspicious') return <span className="ltrack-trust ltrack-trust--suspicious">Flagged</span>
  return <span className="ltrack-trust ltrack-trust--new">New</span>
}

export default function LoginTracksPage() {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [events, setEvents] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState(null)

  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [range, setRange] = useState('7d')
  const [risk, setRisk] = useState('')
  const [stage, setStage] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [unreviewedOnly, setUnreviewedOnly] = useState(false)

  const [selectedId, setSelectedId] = useState(null)
  const [busyId, setBusyId] = useState('')
  const [copied, setCopied] = useState(false)
  const [watchAddedId, setWatchAddedId] = useState('')

  const [tab, setTab] = useState('live')

  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)

  const [watchlist, setWatchlist] = useState([])
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [watchIp, setWatchIp] = useState('')
  const [watchNote, setWatchNote] = useState('')
  const [watchBusy, setWatchBusy] = useState(false)
  const [watchFeedback, setWatchFeedback] = useState('')

  const [alertsOn, setAlertsOn] = useState(() => {
    try {
      return localStorage.getItem(ALERTS_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [toasts, setToasts] = useState([])

  const sessionStartRef = useRef(new Date().toISOString())
  const knownIdsRef = useRef(null)
  const alertsOnRef = useRef(alertsOn)

  useEffect(() => {
    alertsOnRef.current = alertsOn
  }, [alertsOn])

  const pushToast = useCallback((event) => {
    setToasts((prev) => [...prev, { id: event.id, event }].slice(-3))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== event.id))
    }, 9000)
  }, [])

  const raiseAlert = useCallback(
    (event) => {
      playAlertChime()
      pushToast(event)
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('Suspicious login detected', {
            body: `${event.name || event.email} · ${RISK_META[event.risk]?.label || event.risk} · ${locationLabel(event.geo)}`,
            tag: event.id,
          })
        } catch {
          /* notification failed — toast still shows */
        }
      }
    },
    [pushToast],
  )

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAdmin) return
      if (silent) setRefreshing(true)
      else setLoading(true)
      try {
        const data = await fetchTracks({ range, risk, stage, role: roleFilter, q: debouncedQ })
        const fresh = Array.isArray(data?.events) ? data.events : []
        if (knownIdsRef.current === null) {
          knownIdsRef.current = new Set(fresh.map((e) => e.id))
        } else {
          const seen = knownIdsRef.current
          const sessionStart = new Date(sessionStartRef.current).getTime() - 30000
          if (alertsOnRef.current) {
            fresh
              .filter(
                (e) =>
                  !seen.has(e.id) &&
                  (e.risk === 'watch' || e.risk === 'high') &&
                  new Date(e.at).getTime() >= sessionStart,
              )
              .slice(0, 3)
              .forEach(raiseAlert)
          }
          knownIdsRef.current = new Set(fresh.map((e) => e.id))
        }
        setEvents(fresh)
        setSummary(data?.summary || null)
        setError('')
        setLastSync(new Date())
      } catch (err) {
        setError(err.message || 'Could not load login tracks')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [isAdmin, range, risk, stage, roleFilter, debouncedQ, raiseAlert],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) load({ silent: true })
    }, 60000)
    return () => clearInterval(id)
  }, [load])

  const loadAnalytics = useCallback(async () => {
    if (!isAdmin) return
    setAnalyticsLoading(true)
    try {
      setAnalytics(await fetchAnalytics())
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load analytics')
    } finally {
      setAnalyticsLoading(false)
    }
  }, [isAdmin])

  const loadDevices = useCallback(async () => {
    if (!isAdmin) return
    setDevicesLoading(true)
    try {
      setDevices(await fetchDevices())
    } catch (err) {
      setError(err.message || 'Could not load known devices')
    } finally {
      setDevicesLoading(false)
    }
  }, [isAdmin])

  const loadWatchlist = useCallback(async () => {
    if (!isAdmin) return
    setWatchlistLoading(true)
    try {
      setWatchlist(await fetchWatchlist())
    } catch (err) {
      setError(err.message || 'Could not load IP watchlist')
    } finally {
      setWatchlistLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics()
    if (tab === 'devices') loadDevices()
    if (tab === 'watchlist') loadWatchlist()
  }, [tab, loadAnalytics, loadDevices, loadWatchlist])

  const visible = useMemo(
    () => (unreviewedOnly ? events.filter((e) => !e.reviewed) : events),
    [events, unreviewedOnly],
  )

  const selected = useMemo(
    () => events.find((e) => e.id === selectedId) || null,
    [events, selectedId],
  )

  const openSuspicious = summary?.suspiciousUnreviewed || 0
  const openHigh = summary?.highRiskUnreviewed || 0

  const handleReview = async (event, domEvent) => {
    if (domEvent) domEvent.stopPropagation()
    if (!event || event.reviewed || busyId) return
    setBusyId(event.id)
    try {
      const updated = await reviewTrack(event.id, user?.name || user?.email || 'Admin')
      setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              suspiciousUnreviewed: Math.max(0, (prev.suspiciousUnreviewed || 0) - (event.risk === 'high' || event.risk === 'watch' ? 1 : 0)),
              highRiskUnreviewed: Math.max(0, (prev.highRiskUnreviewed || 0) - (event.risk === 'high' ? 1 : 0)),
            }
          : prev,
      )
      setError('')
    } catch (err) {
      setError(err.message || 'Could not mark event reviewed')
    } finally {
      setBusyId('')
    }
  }

  const copyCoords = async (geo) => {
    const text = coordsLabel(geo)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Clipboard blocked by browser — copy manually from the location card.')
    }
  }

  const toggleAlerts = async () => {
    const next = !alertsOn
    setAlertsOn(next)
    try {
      if (next) localStorage.setItem(ALERTS_STORAGE_KEY, '1')
      else localStorage.removeItem(ALERTS_STORAGE_KEY)
    } catch {
      /* storage blocked — toggle stays session-only */
    }
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        /* permission prompt dismissed */
      }
    }
  }

  const handleDeviceTrust = async (device, trust) => {
    try {
      const updated = await setDeviceTrust({ email: device.email, fingerprint: device.fingerprint, trust })
      setDevices((prev) =>
        prev.map((d) => (d.key === updated.key ? { ...d, trust: updated.trust, updatedAt: updated.updatedAt, updatedBy: updated.updatedBy } : d)),
      )
      setError('')
    } catch (err) {
      setError(err.message || 'Could not update device trust')
    }
  }

  const handleWatchAdd = async (e) => {
    e.preventDefault()
    const ip = watchIp.trim()
    if (!ip) return
    setWatchBusy(true)
    setWatchFeedback('')
    try {
      const entry = await updateWatchlist({ ip, action: 'add', note: watchNote.trim() })
      setWatchlist((prev) => [entry, ...prev.filter((w) => w.ip !== entry.ip)])
      setWatchIp('')
      setWatchNote('')
      setWatchFeedback(`Added ${entry.ip} — logins from it are now escalated automatically.`)
      setTimeout(() => setWatchFeedback(''), 4000)
    } catch (err) {
      setWatchFeedback(err.message || 'Could not add this IP')
    } finally {
      setWatchBusy(false)
    }
  }

  const handleWatchRemove = async (ip) => {
    try {
      await updateWatchlist({ ip, action: 'remove' })
      setWatchlist((prev) => prev.filter((w) => w.ip !== ip))
      setError('')
    } catch (err) {
      setError(err.message || 'Could not remove this IP')
    }
  }

  const addEventIpToWatchlist = async () => {
    if (!selected?.ip || watchAddedId === selected.id) return
    try {
      await updateWatchlist({
        ip: selected.ip,
        action: 'add',
        note: `From event ${selected.id} (${selected.email})`.slice(0, 140),
      })
      setWatchAddedId(selected.id)
      setTimeout(() => setWatchAddedId(''), 2500)
    } catch (err) {
      setError(err.message || 'Could not add this IP to the watchlist')
    }
  }

  if (!isAdmin) return <Navigate replace to={homePathForRole(role)} />

  return (
    <div className="ltrack-page">
      <header className="ltrack-hero">
        <div className="ltrack-hero-glow" aria-hidden />
        <div className="ltrack-hero-top">
          <div>
            <p className="ltrack-kicker">Security · Sign-in intelligence</p>
            <h2>Login Tracks</h2>
            <p className="ltrack-hero-sub">
              Every sign-in attempt across the school — who, from where, on which device. Locations
              are server-verified from the connection IP — when the device GPS matches, the exact
              position is shown; unusual logins are flagged automatically and high-risk sign-ins
              trigger an instant email alert.
            </p>
          </div>
          <div className="ltrack-hero-actions">
            <span className={`ltrack-live ${refreshing ? 'is-refreshing' : ''}`}>
              <i aria-hidden />
              {refreshing ? 'Syncing…' : 'Live'}
            </span>
            <button
              type="button"
              className={`ltrack-hero-btn ltrack-hero-btn--alert ${alertsOn ? 'is-on' : ''}`}
              onClick={toggleAlerts}
              title={alertsOn ? 'Chime + desktop alerts are on for new suspicious logins' : 'Turn on chime + desktop alerts for new suspicious logins'}
            >
              {alertsOn ? '🔔 Alerts on' : '🔕 Alerts off'}
            </button>
            <button type="button" className="ltrack-hero-btn" onClick={() => load({ silent: true })}>
              Refresh
            </button>
            <button
              type="button"
              className="ltrack-hero-btn ltrack-hero-btn--solid"
              onClick={() => exportCsv(visible)}
              disabled={!visible.length}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="ltrack-hero-meta">
          <span>{summary?.total ?? 0} total events tracked</span>
          <span>Auto-refresh · 60s</span>
          {lastSync ? <span>Synced {fullTime(lastSync.toISOString())}</span> : null}
          {openHigh ? <span className="ltrack-hero-alert">{openHigh} high-risk login{openHigh > 1 ? 's' : ''} need review</span> : null}
        </div>
      </header>

      <section className="ltrack-stats" aria-label="Login track summary">
        <article className="ltrack-stat">
          <p className="ltrack-stat-label">Sign-ins today</p>
          <p className="ltrack-stat-value">{summary?.successToday ?? 0}</p>
          <p className="ltrack-stat-note">Verified logins</p>
        </article>
        <article className="ltrack-stat">
          <p className="ltrack-stat-label">Failed today</p>
          <p className="ltrack-stat-value">{summary?.failedToday ?? 0}</p>
          <p className="ltrack-stat-note">Password / OTP failures</p>
        </article>
        <article className={`ltrack-stat ${openSuspicious ? 'is-watch' : ''}`}>
          <p className="ltrack-stat-label">Suspicious open</p>
          <p className="ltrack-stat-value">{openSuspicious}</p>
          <p className="ltrack-stat-note">Watch + high, unreviewed</p>
        </article>
        <article className={`ltrack-stat ${openHigh ? 'is-high' : ''}`}>
          <p className="ltrack-stat-label">High risk open</p>
          <p className="ltrack-stat-value">{openHigh}</p>
          <p className="ltrack-stat-note">Needs immediate review</p>
        </article>
        <article className="ltrack-stat">
          <p className="ltrack-stat-label">Devices today</p>
          <p className="ltrack-stat-value">{summary?.uniqueDevicesToday ?? 0}</p>
          <p className="ltrack-stat-note">Unique browser / OS pairs</p>
        </article>
      </section>

      <nav className="ltrack-tabs" role="tablist" aria-label="Login tracks sections">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={`ltrack-tab ${tab === t.value ? 'is-active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
            {t.value === 'live' && openSuspicious ? <em className="ltrack-tab-badge">{openSuspicious}</em> : null}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="ltrack-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => load()}>Retry</button>
        </div>
      ) : null}

      {tab === 'live' ? (
        <>
          <section className="ltrack-filters" aria-label="Filters">
            <div className="ltrack-search">
              <span aria-hidden>⌕</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search email, IP, city, device…"
                aria-label="Search login tracks"
              />
            </div>
            <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Time range">
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Risk level">
              {RISK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Event type">
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role">
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <label className="ltrack-toggle">
              <input
                type="checkbox"
                checked={unreviewedOnly}
                onChange={(e) => setUnreviewedOnly(e.target.checked)}
              />
              Unreviewed only
            </label>
          </section>

          <section className="ltrack-table-wrap" aria-label="Login events">
            {loading ? (
              <div className="ltrack-skeleton">
                {[0, 1, 2, 3, 4].map((n) => (
                  <div key={n} className="ltrack-skeleton-row" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="ltrack-empty">
                <span aria-hidden>⌖</span>
                <h3>No login events match these filters</h3>
                <p>Try a wider time range, or clear the unreviewed-only switch.</p>
              </div>
            ) : (
              <table className="ltrack-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Event</th>
                    <th>Risk</th>
                    <th>Signals</th>
                    <th className="ltrack-hide-sm">Device</th>
                    <th>Location</th>
                    <th className="ltrack-hide-sm">IP</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((event) => (
                    <tr
                      key={event.id}
                      className={event.reviewed ? 'is-reviewed' : ''}
                      onClick={() => setSelectedId(event.id)}
                    >
                      <td>
                        <p className="ltrack-cell-strong">{timeAgo(event.at)}</p>
                        <p className="ltrack-cell-sub">{fullTime(event.at)}</p>
                      </td>
                      <td>
                        <p className="ltrack-cell-strong">{event.name || event.email || 'Unknown'}</p>
                        <p className="ltrack-cell-sub">{event.email || '—'} · {roleLabel(event.role)}</p>
                      </td>
                      <td><StageBadge stage={event.stage} /></td>
                      <td><RiskBadge risk={event.risk} score={event.score} /></td>
                      <td>
                        <div className="ltrack-flags">
                          {(event.flags || []).slice(0, 2).map((flag) => (
                            <span key={flag.key} className="ltrack-flag" title={flag.detail}>{flag.label}</span>
                          ))}
                          {(event.flags || []).length > 2 ? (
                            <span className="ltrack-flag ltrack-flag--more">+{event.flags.length - 2}</span>
                          ) : null}
                          {!(event.flags || []).length ? <span className="ltrack-cell-sub">—</span> : null}
                        </div>
                      </td>
                      <td className="ltrack-hide-sm">
                        <p className="ltrack-cell-strong">{event.device?.browser || 'Unknown'}</p>
                        <p className="ltrack-cell-sub">{event.device?.os || 'Unknown'} · {event.device?.type || '—'}</p>
                      </td>
                      <td>
                        <p className="ltrack-cell-strong">{locationLabel(event.geo)}</p>
                        <p className="ltrack-cell-sub ltrack-mono" title={geoTagTitle(event) || undefined}>
                          {coordsLabel(event.geo) || '—'}
                          {geoTag(event)}
                        </p>
                      </td>
                      <td className="ltrack-hide-sm"><span className="ltrack-mono">{event.ip || '—'}</span></td>
                      <td>
                        {event.reviewed ? (
                          <span className="ltrack-reviewed" title={`${event.reviewedBy || 'Admin'} · ${fullTime(event.reviewedAt)}`}>
                            Reviewed
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="ltrack-review-btn"
                            onClick={(e) => handleReview(event, e)}
                            disabled={busyId === event.id}
                          >
                            {busyId === event.id ? 'Saving…' : 'Mark reviewed'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}

      {tab === 'map' ? (
        <WorldMap events={events} onOpen={setSelectedId} />
      ) : null}

      {tab === 'analytics' ? (
        <section className="ltrack-analytics" aria-label="Login analytics">
          {analyticsLoading && !analytics ? (
            <div className="ltrack-skeleton">
              {[0, 1, 2].map((n) => (
                <div key={n} className="ltrack-skeleton-row" />
              ))}
            </div>
          ) : analytics ? (
            <>
              <div className="ltrack-analytics-grid">
                <RiskDonut risk={analytics.risk} />
                <DailyChart daily={analytics.daily || []} />
              </div>
              <div className="ltrack-analytics-grid">
                <HoursChart hours={analytics.hours || []} />
              </div>
              <div className="ltrack-analytics-grid ltrack-analytics-grid--three">
                <HBars
                  title="Top locations"
                  items={(analytics.topCities || []).map((c) => ({
                    label: c.country ? `${c.label}, ${c.country}` : c.label,
                    count: c.count,
                  }))}
                />
                <HBars title="Browsers" items={analytics.browsers || []} />
                <HBars title="Device types" items={analytics.types || []} />
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {tab === 'devices' ? (
        <section className="ltrack-table-wrap" aria-label="Known devices">
          {devicesLoading && devices.length === 0 ? (
            <div className="ltrack-skeleton">
              {[0, 1, 2].map((n) => (
                <div key={n} className="ltrack-skeleton-row" />
              ))}
            </div>
          ) : devices.length === 0 ? (
            <div className="ltrack-empty">
              <span aria-hidden>▣</span>
              <h3>No known devices yet</h3>
              <p>Devices appear here automatically after the first successful login from them.</p>
            </div>
          ) : (
            <table className="ltrack-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Device</th>
                  <th className="ltrack-hide-sm">First seen</th>
                  <th>Last seen</th>
                  <th className="ltrack-hide-sm">Logins</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.key}>
                    <td>
                      <p className="ltrack-cell-strong">{d.name || d.email}</p>
                      <p className="ltrack-cell-sub">{d.email} · {roleLabel(d.role)}</p>
                    </td>
                    <td>
                      <p className="ltrack-cell-strong">{d.browser} · {d.os}</p>
                      <p className="ltrack-cell-sub">{d.type}</p>
                    </td>
                    <td className="ltrack-hide-sm"><p className="ltrack-cell-sub">{fullTime(d.firstSeen)}</p></td>
                    <td>
                      <p className="ltrack-cell-strong">{timeAgo(d.lastSeenAt || d.lastSeen)}</p>
                      <p className="ltrack-cell-sub">{fullTime(d.lastSeenAt || d.lastSeen)}</p>
                    </td>
                    <td className="ltrack-hide-sm">
                      <p className="ltrack-cell-strong">{d.events ?? 0}</p>
                      <p className="ltrack-cell-sub">{d.highRisk ? `${d.highRisk} high-risk` : 'no high-risk'}</p>
                    </td>
                    <td>{trustChip(d.trust)}</td>
                    <td>
                      <div className="ltrack-device-actions">
                        {d.trust !== 'trusted' ? (
                          <button type="button" className="ltrack-mini-btn" onClick={() => handleDeviceTrust(d, 'trusted')}>
                            Trust
                          </button>
                        ) : null}
                        {d.trust !== 'suspicious' ? (
                          <button type="button" className="ltrack-mini-btn ltrack-mini-btn--danger" onClick={() => handleDeviceTrust(d, 'suspicious')}>
                            Flag
                          </button>
                        ) : null}
                        {d.trust ? (
                          <button type="button" className="ltrack-mini-btn" onClick={() => handleDeviceTrust(d, '')}>
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {tab === 'watchlist' ? (
        <section className="ltrack-watch-card" aria-label="IP watchlist">
          <p className="ltrack-section-title">IP watchlist</p>
          <p className="ltrack-watch-sub">
            Every login from a watchlisted IP is escalated to high risk automatically — even if the
            device and location look normal.
          </p>

          <form className="ltrack-watch-form" onSubmit={handleWatchAdd}>
            <input
              value={watchIp}
              onChange={(e) => setWatchIp(e.target.value)}
              placeholder="IP address — e.g. 203.0.113.7"
              aria-label="IP address"
              className="ltrack-mono"
              spellCheck={false}
              required
            />
            <input
              value={watchNote}
              onChange={(e) => setWatchNote(e.target.value)}
              placeholder="Note — why is this IP suspicious?"
              aria-label="Note"
              maxLength={140}
            />
            <button type="submit" className="ltrack-hero-btn ltrack-hero-btn--solid" disabled={watchBusy}>
              {watchBusy ? 'Adding…' : 'Add to watchlist'}
            </button>
          </form>
          {watchFeedback ? <p className="ltrack-watch-feedback">{watchFeedback}</p> : null}

          {watchlistLoading && watchlist.length === 0 ? (
            <div className="ltrack-skeleton">
              {[0, 1].map((n) => (
                <div key={n} className="ltrack-skeleton-row" />
              ))}
            </div>
          ) : watchlist.length === 0 ? (
            <div className="ltrack-empty">
              <span aria-hidden>⚑</span>
              <h3>Watchlist is empty</h3>
              <p>Add an IP from any event&apos;s details drawer, or with the form above.</p>
            </div>
          ) : (
            <table className="ltrack-table">
              <thead>
                <tr>
                  <th>IP address</th>
                  <th>Note</th>
                  <th className="ltrack-hide-sm">Added</th>
                  <th>Hits</th>
                  <th className="ltrack-hide-sm">Last seen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {watchlist.map((w) => (
                  <tr key={w.ip}>
                    <td><span className="ltrack-mono ltrack-cell-strong">{w.ip}</span></td>
                    <td>
                      <p className="ltrack-cell-strong">{w.note || '—'}</p>
                      <p className="ltrack-cell-sub">added by {w.by || 'Admin'}</p>
                    </td>
                    <td className="ltrack-hide-sm"><p className="ltrack-cell-sub">{fullTime(w.at)}</p></td>
                    <td><p className="ltrack-cell-strong">{w.hits ?? 0}</p></td>
                    <td className="ltrack-hide-sm">
                      <p className="ltrack-cell-sub">{w.lastHitAt ? timeAgo(w.lastHitAt) : 'never seen'}</p>
                    </td>
                    <td>
                      <button type="button" className="ltrack-mini-btn ltrack-mini-btn--danger" onClick={() => handleWatchRemove(w.ip)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      {selected ? (
        <div className="ltrack-drawer-scrim" onClick={() => setSelectedId(null)}>
          <aside className="ltrack-drawer" onClick={(e) => e.stopPropagation()} aria-label="Login event details">
            <header className="ltrack-drawer-head">
              <div>
                <p className="ltrack-kicker">{STAGE_META[selected.stage]?.label || selected.stage}</p>
                <h3>{selected.name || selected.email || 'Unknown user'}</h3>
                <p className="ltrack-drawer-sub">
                  {selected.email || '—'} · {roleLabel(selected.role)} · {fullTime(selected.at)}
                </p>
              </div>
              <div className="ltrack-drawer-head-right">
                <RiskBadge risk={selected.risk} score={selected.score} />
                <button type="button" className="ltrack-drawer-close" onClick={() => setSelectedId(null)} aria-label="Close details">
                  ✕
                </button>
              </div>
            </header>

            <div className="ltrack-drawer-body">
              {selected.deviceGeo?.verified === false ? (
                <div className="ltrack-alert" role="alert">
                  <strong>Possible location spoofing</strong>
                  <span>
                    The device reported GPS ~{selected.deviceGeo.mismatchKm} km away from the
                    server-verified IP location. Verify this sign-in with the account owner.
                  </span>
                </div>
              ) : null}

              <div className="ltrack-kv">
                <div><span>IP address</span><strong className="ltrack-mono">{selected.ip || '—'}</strong></div>
                <div><span>Method</span><strong>{selected.method || '—'}</strong></div>
                <div><span>Browser</span><strong>{selected.device?.browser || 'Unknown'} · {selected.device?.os || 'Unknown'}</strong></div>
                <div><span>Device type</span><strong>{selected.device?.type || '—'}{selected.deviceGeo?.accuracy ? ` · ±${Math.round(selected.deviceGeo.accuracy)}m` : ''}</strong></div>
                <div><span>Location</span><strong>{locationLabel(selected.geo)}</strong></div>
                <div><span>Coordinates</span><strong className="ltrack-mono">{coordsLabel(selected.geo) || '—'}</strong></div>
                <div><span>Location check</span><strong>{verificationLabel(selected) || '—'}</strong></div>
                <div><span>Device GPS</span><strong className="ltrack-mono">{deviceGeoLabel(selected)}</strong></div>
                <div><span>Event id</span><strong className="ltrack-mono">{selected.id}</strong></div>
              </div>

              {selected.note ? <p className="ltrack-note">{selected.note}</p> : null}

              {selected.flags?.length ? (
                <div className="ltrack-flag-list">
                  <p className="ltrack-section-title">Risk signals</p>
                  {selected.flags.map((flag) => (
                    <div key={flag.key} className="ltrack-flag-card">
                      <strong>{flag.label}</strong>
                      <span>{flag.detail}</span>
                    </div>
                  ))}
                  <div className="ltrack-score-track" aria-hidden>
                    <div className={`ltrack-score-fill tone-${RISK_META[selected.risk]?.tone || 'safe'}`} style={{ width: `${Math.min(selected.score || 0, 100)}%` }} />
                  </div>
                  <p className="ltrack-score-note">Risk score {selected.score}/100 · 70+ = high risk</p>
                </div>
              ) : (
                <p className="ltrack-note">No risk signals — this login matched the account&apos;s normal pattern.</p>
              )}

              {selected.geo && mapEmbedUrl(selected.geo) ? (
                <div className="ltrack-map-block">
                  <p className="ltrack-section-title">{mapTitle(selected)}</p>
                  <iframe
                    title={`Map for ${selected.email}`}
                    src={mapEmbedUrl(selected.geo)}
                    loading="lazy"
                  />
                </div>
              ) : null}

              <p className="ltrack-section-title">User agent</p>
              <p className="ltrack-ua ltrack-mono">{selected.userAgent || '—'}</p>
            </div>

            <footer className="ltrack-drawer-foot">
              {selected.geo && mapLink(selected.geo) ? (
                <a className="ltrack-foot-btn" href={mapLink(selected.geo)} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              ) : null}
              {coordsLabel(selected.geo) ? (
                <button type="button" className="ltrack-foot-btn" onClick={() => copyCoords(selected.geo)}>
                  {copied ? 'Copied ✓' : 'Copy coordinates'}
                </button>
              ) : null}
              {selected.ip ? (
                <button type="button" className="ltrack-foot-btn" onClick={addEventIpToWatchlist}>
                  {watchAddedId === selected.id ? 'Added ✓' : '⚑ Watchlist this IP'}
                </button>
              ) : null}
              {selected.reviewed ? (
                <span className="ltrack-foot-reviewed">
                  Reviewed by {selected.reviewedBy || 'Admin'} · {fullTime(selected.reviewedAt)}
                </span>
              ) : (
                <button
                  type="button"
                  className="ltrack-foot-btn ltrack-foot-btn--solid"
                  onClick={(e) => handleReview(selected, e)}
                  disabled={busyId === selected.id}
                >
                  {busyId === selected.id ? 'Saving…' : 'Mark as reviewed'}
                </button>
              )}
            </footer>
          </aside>
        </div>
      ) : null}

      {toasts.length ? (
        <div className="ltrack-toasts" aria-live="polite">
          {toasts.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`ltrack-toast ltrack-toast--${t.event.risk}`}
              onClick={() => setSelectedId(t.id)}
            >
              <strong>{t.event.risk === 'high' ? 'High-risk login detected' : 'Suspicious login detected'}</strong>
              <span>{t.event.name || t.event.email} · {locationLabel(t.event.geo)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
