import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { fetchTracks, reviewTrack } from '../../services/loginTracks'
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

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!isAdmin) return
      if (silent) setRefreshing(true)
      else setLoading(true)
      try {
        const data = await fetchTracks({ range, risk, stage, role: roleFilter, q: debouncedQ })
        setEvents(Array.isArray(data?.events) ? data.events : [])
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
    [isAdmin, range, risk, stage, roleFilter, debouncedQ],
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

      {error ? (
        <div className="ltrack-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => load()}>Retry</button>
        </div>
      ) : null}

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
    </div>
  )
}
