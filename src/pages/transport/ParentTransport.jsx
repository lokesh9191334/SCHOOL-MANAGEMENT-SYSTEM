import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import TransportMap from '../../components/transport/TransportMap'
import { getAuthUser } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import { computeRouteProgress, formatDistance, formatEta } from '../../utils/routeProgress'
import { fetchMyTransport, fetchRouteGeometry } from '../../services/transportRoutes'
import '../../styles/transport-premium.css'

const TABS = [
  { key: 'live', label: 'Live map', icon: 'locate', to: '/parent/transport/live' },
  { key: 'bus', label: 'Bus', icon: 'bus', to: '/parent/transport/bus' },
  { key: 'driver', label: 'Driver', icon: 'user', to: '/parent/transport/driver' },
  { key: 'route', label: 'Route', icon: 'route', to: '/parent/transport/route' },
  { key: 'pickup', label: 'Pickup', icon: 'pin', to: '/parent/transport/pickup' },
  { key: 'drop', label: 'Drop', icon: 'map', to: '/parent/transport/drop' },
  { key: 'allocation', label: 'Allocation', icon: 'swap', to: '/parent/transport/allocation' },
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

function speedKmh(speed) {
  if (speed == null || !Number.isFinite(Number(speed))) return null
  return Math.round(Number(speed) * 3.6)
}

function stopKindLabel(kind) {
  if (kind === 'pickup') return 'Pickup'
  if (kind === 'drop') return 'Drop'
  return 'Pickup & drop'
}

function formatStopTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
  if (!match) return ''
  const hours = Number(match[1])
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${match[2]} ${suffix}`
}

function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  if (!match) return '—'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[Number(match[2]) - 1]
  if (!month) return '—'
  return `${match[3]} ${month} ${match[1]}`
}

function stopsSignature(stops) {
  return (Array.isArray(stops) ? stops : [])
    .map((stop) => `${Number(stop.lat).toFixed(5)},${Number(stop.lng).toFixed(5)}`)
    .join('|')
}

function initialsOf(name) {
  return (
    String(name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || '?'
  )
}

function busToneOf(vehicle) {
  if (!vehicle) return 'off'
  if (vehicle.active === false) return 'off'
  if (vehicle.online) return 'online'
  return vehicle.lastPing ? 'stale' : 'offline'
}

function statusText(tone, hasTracking) {
  if (!hasTracking) return 'Tracking not started'
  if (tone === 'online') return 'Live now'
  if (tone === 'stale') return 'Signal lost'
  if (tone === 'off') return 'Tracking off'
  return 'Waiting for GPS'
}

function statusChipClass(tone) {
  if (tone === 'online') return 'tr-chip--green'
  if (tone === 'stale') return 'tr-chip--amber'
  return 'tr-chip--navy'
}

function RouteTimeline({ route, progress, childLabels }) {
  return (
    <ol className="tr-timeline">
      {route.stops.map((stop, index) => {
        const row = progress?.stops?.[index] || null
        const childLabel = childLabels?.get(stop.id) || ''
        return (
          <li
            key={stop.id}
            className={`tr-timeline__item ${row?.passed ? 'is-passed' : ''} ${row?.isNext ? 'is-next' : ''} ${childLabel ? 'is-child-stop' : ''}`.trim()}
          >
            <span className="tr-timeline__dot" aria-hidden />
            <div className="tr-timeline__head">
              <p className="tr-timeline__name">
                {index + 1}. {stop.name}
              </p>
              {stop.time ? <span className="tr-timeline__time">{formatStopTime(stop.time)}</span> : null}
            </div>
            <p className="tr-timeline__meta">
              {[stopKindLabel(stop.kind), stop.landmark].filter(Boolean).join(' · ')}
            </p>
            {childLabel || row?.isNext ? (
              <div className="tr-timeline__badges">
                {childLabel ? <span className="tr-timeline__badge tr-timeline__badge--child">{childLabel}</span> : null}
                {row?.isNext ? <span className="tr-timeline__badge">Next stop</span> : null}
              </div>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

export default function ParentTransport({ tab = 'live' }) {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [liveToken, setLiveToken] = useState(0)
  const [geometry, setGeometry] = useState(null)
  const geometryInFlight = useRef(false)

  const refresh = useCallback(() => {
    setLoading(true)
    setLiveToken((value) => value + 1)
  }, [])

  const retryGeometry = useCallback(() => {
    setGeometry(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchMyTransport()
      .then((body) => {
        if (cancelled) return
        setData(body)
        setError('')
        setLastRefresh(Date.now())
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Could not load your child’s bus details.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [liveToken])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setLiveToken((value) => value + 1)
    }, 15000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setLiveToken((value) => value + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [autoRefresh])

  const activeTab = TABS.some((item) => item.key === tab) ? tab : 'live'
  const student = data?.student || null
  const allocation = data?.allocation || null
  const route = data?.route || null
  const driver = data?.driver || null
  const bus = data?.vehicle || null
  const staleAfterSec = Number(data?.staleAfterSec) || 150

  const signature = route ? stopsSignature(route.stops) : ''
  useEffect(() => {
    if (!route || route.stops.length < 2) return
    const wanted = stopsSignature(route.stops)
    if (geometry && geometry.signature === wanted) return
    if (geometryInFlight.current) return
    geometryInFlight.current = true
    fetchRouteGeometry(route.id)
      .then((body) => setGeometry({ signature: wanted, data: body }))
      .catch((err) => setGeometry({ signature: wanted, error: err?.message || 'Could not draw the road path.' }))
      .finally(() => {
        geometryInFlight.current = false
      })
  }, [route, geometry])

  const geometryEntry = geometry && geometry.signature === signature ? geometry : null
  const coordinates = geometryEntry?.data?.coordinates || null

  const progress = useMemo(
    () =>
      route && Array.isArray(coordinates) && coordinates.length > 1
        ? computeRouteProgress({ geometry: coordinates, stops: route.stops, vehicle: bus })
        : null,
    [route, coordinates, bus],
  )

  const mapLayers = useMemo(
    () => (route ? [{ route, geometry: coordinates || undefined, progress }] : []),
    [route, coordinates, progress],
  )

  const busMarkers = useMemo(() => {
    if (!route || !bus?.lastPing) return []
    return [
      {
        id: 'my-bus',
        routeId: route.id,
        driverName: driver?.name || bus.driverName || 'School bus',
        vehicleLabel: bus.vehicleLabel || route.vehicleLabel || '',
        routeLabel: route.name,
        active: bus.active !== false,
        online: Boolean(bus.online),
        lastPing: bus.lastPing,
        trail: Array.isArray(bus.trail) ? bus.trail : [],
      },
    ]
  }, [route, bus, driver])

  const pickupStop = route?.stops?.find((stop) => stop.id === allocation?.pickupStopId) || null
  const dropStop = route?.stops?.find((stop) => stop.id === allocation?.dropStopId) || null
  const childStopIds = useMemo(
    () => [pickupStop?.id, dropStop?.id].filter(Boolean),
    [pickupStop, dropStop],
  )
  const childLabels = useMemo(() => {
    const map = new Map()
    if (pickupStop) map.set(pickupStop.id, 'Pickup point')
    if (dropStop) map.set(dropStop.id, 'Drop point')
    return map
  }, [pickupStop, dropStop])

  const busTone = busToneOf(bus)
  const statusLabel = statusText(busTone, Boolean(bus))
  const kmh = speedKmh(bus?.lastPing?.speed)
  const busLabel = bus?.vehicleLabel || route?.vehicleLabel || 'Bus not assigned'
  const driverName = driver?.name || bus?.driverName || 'Driver not assigned'
  const driverPhone = driver?.phone || ''
  const driverMeta = [driverPhone, driver?.status].filter(Boolean).join(' · ') || 'Contact details not added'
  const percent = progress ? Math.round(progress.percent) : 0
  const focusBus = (activeTab === 'live' || activeTab === 'bus') && Boolean(bus?.lastPing)
  const sourceLabel =
    geometryEntry?.data?.source === 'osrm'
      ? 'OSM road path'
      : geometryEntry?.data?.source === 'straight'
        ? 'Straight-line fallback'
        : ''

  const tabs = TABS
  const geometryReady = Boolean(geometryEntry?.data)

  if (!user) return <Navigate replace to="/auth/login" />
  if (role !== 'parent') return <Navigate replace to={homePathForRole(role)} />

  const renderStopDetail = (stop, label) => {
    if (!stop) {
      return (
        <div className="tr-empty">
          <h3>{label} not assigned</h3>
          <p>The school office will set this stop when your child&apos;s bus allocation is completed.</p>
        </div>
      )
    }
    const mapsHref =
      Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng))
        ? `https://www.google.com/maps?q=${Number(stop.lat)},${Number(stop.lng)}`
        : ''
    return (
      <div className="tr-stack">
        <div className="ptr-stop-card ptr-stop-card--hero is-highlight">
          <span>{label}</span>
          <b>{stop.name}</b>
          <p>
            {[formatStopTime(stop.time), stopKindLabel(stop.kind), stop.landmark].filter(Boolean).join(' · ') ||
              'Stop details shared by the school.'}
          </p>
          {mapsHref ? (
            <a className="ptr-stop-card__link" href={mapsHref} target="_blank" rel="noreferrer">
              Open location in Google Maps
            </a>
          ) : null}
        </div>
        <div className="tr-route-facts">
          <div className="tr-fact">
            <b>{route.name}</b>
            <span>Route</span>
          </div>
          <div className="tr-fact">
            <b>{busLabel}</b>
            <span>Bus</span>
          </div>
          <div className="tr-fact">
            <b>{driverName}</b>
            <span>Driver</span>
          </div>
        </div>
        <div>
          <div className="ptr-section-head">
            <div>
              <p className="tr-kicker">Full route</p>
              <h2>Stops on this route</h2>
              <p>Your child&apos;s {label.toLowerCase()} is highlighted in the list and on the map.</p>
            </div>
          </div>
          <RouteTimeline route={route} progress={progress} childLabels={childLabels} />
        </div>
      </div>
    )
  }

  const renderDetail = () => {
    if (!route) return null

    if (activeTab === 'driver') {
      return (
        <div className="tr-stack">
          <div className="ptr-section-head">
            <div>
              <p className="tr-kicker">Driver details</p>
              <h2>{driverName}</h2>
              <p>Contact the driver only for urgent bus-related updates.</p>
            </div>
            {driverPhone ? (
              <a className="tr-btn" href={`tel:${String(driverPhone).replace(/\s+/g, '')}`}>
                <NavGlyph name="phone" size={14} />
                Call driver
              </a>
            ) : null}
          </div>
          <div className="ptr-driver ptr-driver--lg">
            <span className="ptr-driver__avatar" aria-hidden>
              {initialsOf(driverName)}
            </span>
            <div>
              <p className="ptr-driver__name">{driverName}</p>
              <p className="ptr-driver__meta">{driverMeta}</p>
            </div>
          </div>
          <div className="tr-route-facts">
            <div className="tr-fact">
              <b>{driverPhone || '—'}</b>
              <span>Phone</span>
            </div>
            <div className="tr-fact">
              <b>{driver?.status || '—'}</b>
              <span>Duty status</span>
            </div>
            <div className="tr-fact">
              <b>{formatDate(driver?.licenseExpiry)}</b>
              <span>Licence expiry</span>
            </div>
            <div className="tr-fact">
              <b>{busLabel}</b>
              <span>Assigned bus</span>
            </div>
            <div className="tr-fact">
              <b>{route.name}</b>
              <span>Route</span>
            </div>
            <div className="tr-fact">
              <b>{route.stops.length}</b>
              <span>Stops on route</span>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'bus') {
      return (
        <div className="tr-stack">
          <div className="ptr-section-head">
            <div>
              <p className="tr-kicker">Bus details</p>
              <h2>{busLabel}</h2>
              <p>{[route.name, route.code].filter(Boolean).join(' · ')}</p>
            </div>
            <span className={`tr-chip ${statusChipClass(busTone)}`}>{statusLabel}</span>
          </div>
          <div className="tr-route-facts">
            <div className="tr-fact">
              <b>{busLabel}</b>
              <span>Bus number</span>
            </div>
            <div className="tr-fact">
              <b>{route.name}</b>
              <span>Route</span>
            </div>
            <div className="tr-fact">
              <b>{driverName}</b>
              <span>Driver</span>
            </div>
            <div className="tr-fact">
              <b>{statusLabel}</b>
              <span>Tracked bus</span>
            </div>
            <div className="tr-fact">
              <b>{bus?.lastPing ? timeAgo(bus.lastPing.at) : '—'}</b>
              <span>Last update</span>
            </div>
            <div className="tr-fact">
              <b>{kmh != null ? `${kmh} km/h` : '—'}</b>
              <span>Current speed</span>
            </div>
            <div className="tr-fact">
              <b>{bus?.lastPing?.accuracy != null ? `±${bus.lastPing.accuracy} m` : '—'}</b>
              <span>GPS accuracy</span>
            </div>
            <div className="tr-fact">
              <b>{bus?.lastPing?.battery != null ? `${bus.lastPing.battery}%` : '—'}</b>
              <span>Driver phone battery</span>
            </div>
            <div className="tr-fact">
              <b>{bus?.lastPing?.atIST || '—'}</b>
              <span>Last ping (IST)</span>
            </div>
          </div>
          <p className="ptr-note">
            {bus
              ? `The map refreshes every 15 seconds while the driver’s phone is sharing GPS. A bus is shown offline after ${Math.round(staleAfterSec / 60)} minutes without a position.`
              : 'Live tracking will start after the school shares the driver tracking link for this route.'}
          </p>
        </div>
      )
    }

    if (activeTab === 'pickup') {
      return (
        <div className="tr-stack">
          <div className="ptr-section-head">
            <div>
              <p className="tr-kicker">Pickup point</p>
              <h2>Where the bus picks up your child</h2>
              <p>Matched with the stop assigned by the school office.</p>
            </div>
          </div>
          {renderStopDetail(pickupStop, 'Pickup point')}
        </div>
      )
    }

    if (activeTab === 'drop') {
      return (
        <div className="tr-stack">
          <div className="ptr-section-head">
            <div>
              <p className="tr-kicker">Drop point</p>
              <h2>Where the bus drops your child</h2>
              <p>Matched with the stop assigned by the school office.</p>
            </div>
          </div>
          {renderStopDetail(dropStop, 'Drop point')}
        </div>
      )
    }

    if (activeTab === 'allocation') {
      return (
        <div className="tr-stack">
          <div className="ptr-section-head">
            <div>
              <p className="tr-kicker">Student allocation</p>
              <h2>Your child&apos;s bus assignment</h2>
              <p>{[student?.name, student?.className, student?.rollNo ? `Roll ${student.rollNo}` : ''].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <div className="tr-route-facts">
            <div className="tr-fact">
              <b>{student?.name || '—'}</b>
              <span>Student</span>
            </div>
            <div className="tr-fact">
              <b>{student?.className || '—'}</b>
              <span>Class</span>
            </div>
            <div className="tr-fact">
              <b>{student?.rollNo || '—'}</b>
              <span>Roll number</span>
            </div>
            <div className="tr-fact">
              <b>{route.name}</b>
              <span>Route</span>
            </div>
            <div className="tr-fact">
              <b>{pickupStop?.name || 'Not assigned'}</b>
              <span>Pickup point</span>
            </div>
            <div className="tr-fact">
              <b>{dropStop?.name || 'Not assigned'}</b>
              <span>Drop point</span>
            </div>
          </div>
          <p className="ptr-note">
            This allocation is managed by the school office. Contact the office if the pickup or drop point needs to
            change.
          </p>
        </div>
      )
    }

    if (activeTab === 'route') {
      return (
        <div className="tr-stack">
          <div className="ptr-section-head">
            <div>
              <p className="tr-kicker">Route details</p>
              <h2>{route.name}</h2>
              <p>{geometryEntry?.data ? sourceLabel : 'Drawing the road path from the school stops…'}</p>
            </div>
            <span className="tr-chip tr-chip--gold">{route.stops.length} stops</span>
          </div>
          <div className="tr-route-facts">
            <div className="tr-fact">
              <b>{route.code || '—'}</b>
              <span>Route code</span>
            </div>
            <div className="tr-fact">
              <b>{geometryReady ? formatDistance(geometryEntry?.data?.distanceMeters) : '—'}</b>
              <span>Road length</span>
            </div>
            <div className="tr-fact">
              <b>
                {geometryReady && geometryEntry?.data?.durationSeconds
                  ? `≈ ${formatEta(geometryEntry.data.durationSeconds)}`
                  : '—'}
              </b>
              <span>Drive time</span>
            </div>
          </div>
          <div>
            <p className="tr-kicker">Stop sequence</p>
            <RouteTimeline route={route} progress={progress} childLabels={childLabels} />
          </div>
          <p className="ptr-note">
            {geometryEntry?.error
              ? 'The road service could not be reached, so the map joins the stops with a straight line until the next retry.'
              : geometryReady && geometryEntry?.data?.source === 'straight'
                ? 'The road service could not be reached, so the map shows a straight-line path through the stops.'
                : 'The route line follows real roads from OpenStreetMap. Stop times are the scheduled times set by the school.'}
          </p>
        </div>
      )
    }

    return (
      <div className="tr-stack">
        <div className="ptr-section-head">
          <div>
            <p className="tr-kicker">Live stop sequence</p>
            <h2>Where the bus is right now</h2>
            <p>Passed stops fade out, the next stop glows gold, and your child&apos;s stops are marked in purple.</p>
          </div>
          <span className={`tr-chip ${statusChipClass(busTone)}`}>{statusLabel}</span>
        </div>
        {!bus?.lastPing ? (
          <p className="ptr-note">
            Live position will appear after the driver opens the school tracking link on their phone. The route and
            stops below are already the real ones assigned by the school.
          </p>
        ) : null}
        <RouteTimeline route={route} progress={progress} childLabels={childLabels} />
      </div>
    )
  }

  return (
    <div className="tr-page">
      <header className="tr-hero ptr-hero">
        <div className="tr-hero__main">
          <span className="tr-hero__badge" aria-hidden>
            <NavGlyph name="bus" size={26} />
          </span>
          <div>
            <p className="tr-eyebrow">Transport · parent portal</p>
            <h1 className="tr-title">My child&apos;s school bus</h1>
            <p className="tr-sub">
              {student
                ? [student.name, student.className, student.rollNo ? `Roll ${student.rollNo}` : '']
                    .filter(Boolean)
                    .join(' · ')
                : 'Live bus position, driver details and the stops assigned by your school.'}
            </p>
          </div>
        </div>
        <div className="tr-hero__side">
          <div className="tr-stats">
            <div className="tr-stat tr-stat--gold">
              <b>{statusLabel}</b>
              <span>Live status</span>
            </div>
            <div className="tr-stat">
              <b>{route?.name || '—'}</b>
              <span>Route</span>
            </div>
            <div className="tr-stat">
              <b>{route?.stops?.length ?? '—'}</b>
              <span>Stops</span>
            </div>
          </div>
          <div className="tr-actions">
            <button type="button" className="tr-btn tr-btn--ghost" onClick={() => setAutoRefresh((value) => !value)}>
              <NavGlyph name="refresh" size={14} />
              {autoRefresh ? 'Live refresh: on' : 'Live refresh: off'}
            </button>
            <button type="button" className="tr-btn tr-btn--ghost" onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>
          <p className="ptr-stamp">
            {lastRefresh ? `Updated ${timeAgo(new Date(lastRefresh).toISOString())}` : 'Loading…'}
          </p>
        </div>
      </header>

      <nav className="ptr-tabs" aria-label="Transport sections">
        {tabs.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className={`ptr-tab ${activeTab === item.key ? 'is-active' : ''}`.trim()}
          >
            <NavGlyph name={item.icon} size={14} />
            {item.label}
          </Link>
        ))}
      </nav>

      {error ? <p className="tr-error">{error}</p> : null}

      {loading && !data ? (
        <section className="tr-card tr-card--pad">
          <p className="tr-loading">
            <span className="tr-spinner" aria-hidden /> Loading your child&apos;s bus details…
          </p>
        </section>
      ) : null}

      {data && !student ? (
        <section className="tr-card tr-card--pad">
          <div className="tr-empty ptr-empty">
            <h3>No student linked yet</h3>
            <p>Your parent account is not linked to a student record. Contact the school office to link your child.</p>
          </div>
        </section>
      ) : null}

      {data && student && !route ? (
        <section className="tr-card tr-card--pad">
          <div className="tr-empty ptr-empty">
            <h3>Bus allocation pending</h3>
            <p>
              {student.name} is not allocated to a school bus yet. Once the school office assigns a route, live
              tracking, driver details and stops will appear here.
            </p>
          </div>
        </section>
      ) : null}

      {data && student && route ? (
        <>
          <section className="ptr-layout">
            <div className="ptr-map-wrap">
              <TransportMap
                layers={mapLayers}
                vehicles={busMarkers}
                selectedRouteId={route.id}
                selectedVehicleId={focusBus ? 'my-bus' : ''}
                highlightStopIds={childStopIds}
              />
              {geometryEntry?.error ? (
                <p className="ptr-map-note ptr-map-note--error">
                  {geometryEntry.error}
                  <button type="button" onClick={retryGeometry}>
                    Try again
                  </button>
                </p>
              ) : null}
              {!geometryEntry && route.stops.length >= 2 ? (
                <p className="ptr-map-note">
                  <span className="tr-spinner" aria-hidden /> Drawing the road path…
                </p>
              ) : null}
            </div>

            <aside className="tr-card tr-card--pad ptr-bus-card">
              <div className="ptr-bus-card__top">
                <div>
                  <p className="tr-kicker">Live bus</p>
                  <h2 className="ptr-bus-name">{busLabel}</h2>
                  <p className="ptr-bus-sub">{[route.name, route.code].filter(Boolean).join(' · ')}</p>
                </div>
                <span className={`tr-chip ${statusChipClass(busTone)}`}>{statusLabel}</span>
              </div>

              <div className="ptr-driver">
                <span className="ptr-driver__avatar" aria-hidden>
                  {initialsOf(driverName)}
                </span>
                <div>
                  <p className="ptr-driver__name">{driverName}</p>
                  <p className="ptr-driver__meta">{driverMeta}</p>
                </div>
                {driverPhone ? (
                  <div className="ptr-driver__actions">
                    <a className="tr-btn tr-btn--small" href={`tel:${String(driverPhone).replace(/\s+/g, '')}`}>
                      Call
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="tlive-progress">
                <div className="tlive-progress__meta">
                  <span>{progress ? `${percent}% covered` : 'Waiting for GPS fix'}</span>
                  <span>
                    {progress
                      ? `${formatDistance(progress.progressDistance)} of ${formatDistance(progress.totalDistance)}`
                      : '—'}
                  </span>
                </div>
                <div
                  className="tlive-progress__track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-label="Bus progress along the route"
                >
                  <span className="tlive-progress__fill" style={{ width: `${percent}%` }} />
                </div>
              </div>

              <div className="tlive-bus-facts">
                <div className="tlive-bus-fact">
                  <b>{progress?.nextStop?.name || '—'}</b>
                  <span>Next stop</span>
                </div>
                <div className="tlive-bus-fact">
                  <b>{progress?.etaSeconds != null ? formatEta(progress.etaSeconds) : '—'}</b>
                  <span>ETA</span>
                </div>
                <div className="tlive-bus-fact">
                  <b>{kmh != null ? `${kmh} km/h` : '—'}</b>
                  <span>Bus speed</span>
                </div>
              </div>

              <div className="ptr-stop-cards">
                <div className={`ptr-stop-card ${pickupStop ? 'is-highlight' : ''}`.trim()}>
                  <span>Child pickup</span>
                  <b>{pickupStop?.name || 'Not assigned'}</b>
                  <p>
                    {pickupStop
                      ? [formatStopTime(pickupStop.time), pickupStop.landmark].filter(Boolean).join(' · ') || '—'
                      : 'School office will assign'}
                  </p>
                </div>
                <div className={`ptr-stop-card ${dropStop ? 'is-highlight' : ''}`.trim()}>
                  <span>Child drop</span>
                  <b>{dropStop?.name || 'Not assigned'}</b>
                  <p>
                    {dropStop
                      ? [formatStopTime(dropStop.time), dropStop.landmark].filter(Boolean).join(' · ') || '—'
                      : 'School office will assign'}
                  </p>
                </div>
              </div>

              <p className="ptr-stamp ptr-stamp--dark">
                {bus?.lastPing
                  ? `Last GPS update ${timeAgo(bus.lastPing.at)}${bus.lastPing.atIST ? ` · ${bus.lastPing.atIST} IST` : ''}`
                  : 'No GPS position received yet.'}
              </p>
            </aside>
          </section>

          <section className="tr-card tr-card--pad ptr-detail">{renderDetail()}</section>
        </>
      ) : null}
    </div>
  )
}
