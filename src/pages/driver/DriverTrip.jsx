import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import { fetchDriverTrip, sendDriverPing } from '../../services/driverPortal'
import { getAuthToken, getAuthUser } from '../../utils/session'
import '../../styles/driver-track-premium.css'

const IST_TZ = 'Asia/Kolkata'
const PING_EVERY_MS = 15 * 1000

function istClock() {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST_TZ,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).format(new Date())
  } catch {
    return ''
  }
}

function deviceLabel() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return `${os} ${browser}`.trim().slice(0, 120)
}

function geoSupportError() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'This browser does not support GPS location.'
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'GPS needs a secure https connection. Open this portal from the school secure domain.'
  }
  return null
}

function describeGeoError(err) {
  const code = err?.code
  if (code === 1) return 'Location permission was denied. Allow location access for this page and tap start again.'
  if (code === 2) return 'GPS position is not available right now. Move near a window or open sky.'
  if (code === 3) return 'GPS is taking too long. Keep the page open and try again.'
  return err?.message || 'Could not read GPS position.'
}

async function acquireWakeLock(wakeLockRef, trackingRef, onState) {
  try {
    if (!navigator.wakeLock?.request) {
      onState('unsupported')
      return
    }
    const lock = await navigator.wakeLock.request('screen')
    wakeLockRef.current = lock
    onState('on')
    lock.addEventListener('release', () => {
      wakeLockRef.current = null
      if (trackingRef.current) acquireWakeLock(wakeLockRef, trackingRef, onState)
    })
  } catch {
    onState('unsupported')
  }
}

function stopKindLabel(kind) {
  if (kind === 'pickup') return 'Pickup'
  if (kind === 'drop') return 'Drop'
  return 'Pickup & drop'
}

function clearDriverSession() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
}

const DriverTrip = () => {
  const navigate = useNavigate()
  const user = getAuthUser()
  const token = getAuthToken()

  const [trip, setTrip] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  const [trackState, setTrackState] = useState('idle')
  const [trackError, setTrackError] = useState('')
  const [fix, setFix] = useState(null)
  const [sentCount, setSentCount] = useState(0)
  const [lastSentAt, setLastSentAt] = useState(null)
  const [wakeLock, setWakeLock] = useState('off')
  const [battery, setBattery] = useState(null)
  const [clock, setClock] = useState(() => istClock())

  const watchIdRef = useRef(null)
  const intervalRef = useRef(null)
  const fixRef = useRef(null)
  const wakeLockRef = useRef(null)
  const trackingRef = useRef(false)
  const batteryRef = useRef(null)

  useEffect(() => {
    if (!token || String(user?.role || '').toLowerCase() !== 'driver') {
      navigate('/driver/login', { replace: true })
    }
  }, [navigate, token, user?.role])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(istClock()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    if (!getAuthToken()) return undefined
    ;(async () => {
      try {
        const body = await fetchDriverTrip()
        if (!active) return
        setTrip(body)
        setLoadState('ready')
      } catch (err) {
        if (!active) return
        if (err?.status === 401 || err?.status === 403) {
          clearDriverSession()
          navigate('/driver/login', { replace: true, state: { info: err.message } })
          return
        }
        setLoadError(err?.message || 'Your trip details could not be loaded.')
        setLoadState('error')
      }
    })()
    return () => {
      active = false
    }
  }, [navigate, reloadToken])

  const haltTracking = useCallback((message) => {
    trackingRef.current = false
    if (watchIdRef.current != null) {
      navigator.geolocation?.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    window.clearInterval(intervalRef.current)
    intervalRef.current = null
    if (wakeLockRef.current) {
      wakeLockRef.current.release?.().catch(() => {})
      wakeLockRef.current = null
    }
    setWakeLock('off')
    setTrackState('error')
    if (message) setTrackError(message)
  }, [])

  // A holiday declared while the trip page is open stops tracking immediately.
  useEffect(() => {
    if (!trip?.holiday?.active) return
    if (trackingRef.current) {
      haltTracking('Tracking stopped automatically because today is a school holiday.')
    }
  }, [trip?.holiday?.active, haltTracking])

  const sendNow = useCallback(async () => {
    const current = fixRef.current
    if (!current) return
    try {
      await sendDriverPing({
        lat: current.lat,
        lng: current.lng,
        accuracy: current.accuracy,
        speed: current.speed,
        heading: current.heading,
        battery: batteryRef.current,
        device: deviceLabel(),
      })
      setSentCount((count) => count + 1)
      setLastSentAt(Date.now())
      setTrackError('')
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        clearDriverSession()
        navigate('/driver/login', { replace: true, state: { info: err.message } })
        return
      }
      if (err?.status === 404 || err?.status === 409 || err?.status === 410) {
        haltTracking(err.message)
        return
      }
      setTrackError(err?.message || 'Position could not be sent. Retrying…')
    }
  }, [haltTracking, navigate])

  const stopTracking = useCallback(() => {
    trackingRef.current = false
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    window.clearInterval(intervalRef.current)
    intervalRef.current = null
    if (wakeLockRef.current) {
      wakeLockRef.current.release?.().catch(() => {})
      wakeLockRef.current = null
    }
    setWakeLock('off')
    setTrackState('idle')
  }, [])

  const startTracking = useCallback(() => {
    const supportIssue = geoSupportError()
    if (supportIssue) {
      setTrackState('error')
      setTrackError(supportIssue)
      return
    }
    setTrackError('')
    setTrackState('waiting')
    trackingRef.current = true

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy) ? Math.round(pos.coords.accuracy) : null,
          speed: Number.isFinite(pos.coords.speed) && pos.coords.speed >= 0 ? Math.round(pos.coords.speed * 10) / 10 : null,
          heading: Number.isFinite(pos.coords.heading) && pos.coords.heading >= 0 ? Math.round(pos.coords.heading) : null,
        }
        const first = !fixRef.current
        fixRef.current = next
        setFix(next)
        setTrackState('live')
        if (first) sendNow()
      },
      (err) => {
        setTrackError(describeGeoError(err))
        if (!fixRef.current) setTrackState('error')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )

    window.clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(() => {
      if (trackingRef.current) sendNow()
    }, PING_EVERY_MS)

    acquireWakeLock(wakeLockRef, trackingRef, setWakeLock)
    if (navigator.getBattery) {
      navigator
        .getBattery()
        .then((bat) => {
          const apply = () => {
            batteryRef.current = Math.round(bat.level * 100)
            setBattery(batteryRef.current)
          }
          apply()
          bat.addEventListener?.('levelchange', apply)
        })
        .catch(() => {})
    }
  }, [sendNow])

  useEffect(() => () => {
    trackingRef.current = false
    if (watchIdRef.current != null) navigator.geolocation?.clearWatch(watchIdRef.current)
    window.clearInterval(intervalRef.current)
    wakeLockRef.current?.release?.().catch(() => {})
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && trackingRef.current && !wakeLockRef.current) {
        acquireWakeLock(wakeLockRef, trackingRef, setWakeLock)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const logout = () => {
    stopTracking()
    clearDriverSession()
    navigate('/driver/login', { replace: true })
  }

  if (!token || String(user?.role || '').toLowerCase() !== 'driver') {
    return <Navigate to="/driver/login" replace />
  }

  if (loadState === 'loading' && !trip) {
    return (
      <div className="drv-page drv-page--center">
        <span className="drv-spinner" aria-hidden />
        <p className="drv-muted">Loading your trip…</p>
      </div>
    )
  }

  if (loadState === 'error' && !trip) {
    return (
      <div className="drv-page drv-page--center">
        <article className="drv-card drv-card--error">
          <h1>Trip unavailable</h1>
          <p>{loadError}</p>
          <div className="drv-card-actions">
            <button type="button" className="drv-mini-btn" onClick={() => setReloadToken((value) => value + 1)}>
              Try again
            </button>
            <button type="button" className="drv-mini-btn drv-mini-btn--ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </article>
      </div>
    )
  }

  const route = trip?.route || null
  const tracking = trip?.tracking || null
  const bus = trip?.bus || null
  const holiday = trip?.holiday || null
  const holidayActive = Boolean(holiday?.active)
  const routePaused = route?.status === 'Paused'
  const canTrack = Boolean(route && tracking && tracking.active !== false && !routePaused && !holidayActive)
  const trackingActive = trackState === 'live' || trackState === 'waiting'

  let blockedReason = ''
  if (holidayActive) {
    blockedReason = `${holiday.title} — no school transport today. Live tracking is paused automatically.`
  } else if (!route) blockedReason = 'No route is assigned to you yet. Contact the school office.'
  else if (routePaused) blockedReason = 'This route is paused by the school. Tracking stays off until it is active again.'
  else if (!tracking) blockedReason = 'No tracking link is connected to your route. Contact the school office.'
  else if (tracking.active === false) blockedReason = 'Live tracking is switched off by the school. Contact the office if this looks wrong.'

  const statusMeta = holidayActive
    ? { tone: 'holiday', text: 'Holiday today — tracking paused' }
    : trackingActive
      ? trackState === 'live'
        ? { tone: 'ok', text: 'Live — the school can see your bus' }
        : { tone: 'warn', text: 'Getting GPS fix…' }
      : trackState === 'error'
        ? { tone: 'danger', text: 'Tracking problem' }
        : blockedReason
          ? { tone: 'danger', text: 'Tracking not available' }
          : { tone: 'muted', text: 'Not sending location' }

  return (
    <div className="drv-page">
      <header className="drv-hero">
        <span className="drv-hero__badge" aria-hidden>
          <NavGlyph name="locate" size={26} />
        </span>
        <div className="drv-hero__titles">
          <p className="drv-hero__eyebrow">Driver trip console</p>
          <h1 className="drv-hero__title">{trip?.driver?.name || user?.name || 'Driver'}</h1>
          <p className="drv-hero__meta">
            {[bus?.number, route?.name].filter(Boolean).join(' · ') || 'No trip assigned'}
          </p>
        </div>
        <div className="drv-hero__clock">
          <span className="drv-hero__time">{clock}</span>
          <span className="drv-hero__zone">IST</span>
        </div>
        <button type="button" className="drv-hero__logout" onClick={logout} aria-label="Sign out">
          <NavGlyph name="logout" size={16} />
        </button>
      </header>

      <main className="drv-body">
        <article className={`drv-status drv-status--${statusMeta.tone}`}>
          <span className="drv-status__dot" aria-hidden />
          <div>
            <p className="drv-status__text">{statusMeta.text}</p>
            <p className="drv-status__sub">
              {blockedReason
                ? blockedReason
                : trackState === 'live'
                  ? `A position is sent to the school every ${PING_EVERY_MS / 1000} seconds.`
                  : 'Tap the button below so the school can follow this bus.'}
            </p>
          </div>
        </article>

        {holidayActive ? (
          <article className="drv-holiday">
            <span className="drv-holiday__icon" aria-hidden>
              <NavGlyph name="sun" size={26} />
            </span>
            <div>
              <p className="drv-holiday__eyebrow">School holiday</p>
              <h2 className="drv-holiday__title">{holiday.title}</h2>
              <p className="drv-holiday__text">
                No school transport today. Live tracking is paused automatically and no location is sent.
              </p>
            </div>
          </article>
        ) : (
          <button
            type="button"
            className={`drv-action ${trackingActive ? 'drv-action--stop' : ''}`}
            onClick={trackingActive ? stopTracking : startTracking}
            disabled={!canTrack && !trackingActive}
          >
            <NavGlyph name={trackingActive ? 'ban' : 'locate'} size={22} />
            {trackingActive ? 'Stop sending location' : 'Start trip — share live location'}
          </button>
        )}

        {trackError ? <p className="drv-error">{trackError}</p> : null}

        <div className="drv-stats">
          <div className="drv-stat">
            <span className="drv-stat__label">Last sent</span>
            <span className="drv-stat__value">{lastSentAt ? istClock() : '—'}</span>
          </div>
          <div className="drv-stat">
            <span className="drv-stat__label">Updates sent</span>
            <span className="drv-stat__value">{sentCount}</span>
          </div>
          <div className="drv-stat">
            <span className="drv-stat__label">GPS accuracy</span>
            <span className="drv-stat__value">{fix?.accuracy != null ? `±${fix.accuracy} m` : '—'}</span>
          </div>
          <div className="drv-stat">
            <span className="drv-stat__label">Speed</span>
            <span className="drv-stat__value">{fix?.speed != null ? `${Math.round(fix.speed * 3.6)} km/h` : '—'}</span>
          </div>
          <div className="drv-stat">
            <span className="drv-stat__label">Phone battery</span>
            <span className="drv-stat__value">{battery != null ? `${battery}%` : '—'}</span>
          </div>
          <div className="drv-stat">
            <span className="drv-stat__label">Screen stay-awake</span>
            <span className="drv-stat__value">
              {wakeLock === 'on' ? 'On' : wakeLock === 'unsupported' ? 'Not supported' : 'Off'}
            </span>
          </div>
        </div>

        <article className="drv-assignment">
          <div className="drv-assignment__head">
            <h2>Today's assignment</h2>
            <button
              type="button"
              className="drv-mini-btn drv-mini-btn--ghost"
              onClick={() => {
                setLoadError('')
                setLoadState('loading')
                setReloadToken((value) => value + 1)
              }}
              disabled={loadState === 'loading'}
            >
              <NavGlyph name="refresh" size={13} />
              {loadState === 'loading' ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <div className="drv-assignment__grid">
            <div>
              <span>Bus</span>
              <b>{bus?.number || '—'}</b>
            </div>
            <div>
              <span>Bus model</span>
              <b>{bus?.model || '—'}</b>
            </div>
            <div>
              <span>Route</span>
              <b>{route?.name || '—'}</b>
            </div>
            <div>
              <span>Route code</span>
              <b>{route?.code || '—'}</b>
            </div>
            <div>
              <span>Route status</span>
              <b>{route?.status || '—'}</b>
            </div>
            <div>
              <span>Last school update</span>
              <b>{tracking?.lastPingAtIST || '—'}</b>
            </div>
          </div>
        </article>

        {route?.stops?.length ? (
          <article className="drv-stops">
            <h2>Trip stops</h2>
            <ol>
              {route.stops.map((stop) => (
                <li key={stop.id || `${stop.name}-${stop.time}`}>
                  <span className="drv-stop__dot" aria-hidden />
                  <div className="drv-stop__body">
                    <p className="drv-stop__name">{stop.name}</p>
                    <p className="drv-stop__meta">
                      {[stop.time || 'Time —', stopKindLabel(stop.kind)].join(' · ')}
                      {stop.landmark ? ` · ${stop.landmark}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        ) : null}

        {fix ? (
          <article className="drv-pos">
            <h2>Current position</h2>
            <p className="drv-pos__coords">
              {Number(fix.lat).toFixed(5)}, {Number(fix.lng).toFixed(5)}
            </p>
            <a
              className="drv-pos__link"
              href={`https://www.google.com/maps?q=${fix.lat},${fix.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Google Maps
            </a>
          </article>
        ) : null}

        <article className="drv-notes">
          <h2>Driver checklist</h2>
          <ul>
            <li>Sign in once on this phone — the session lasts 7 days.</li>
            <li>Keep this page open and the phone with you during the trip.</li>
            <li>Allow location permission when the browser asks.</li>
            <li>Keep the phone charged — a low battery stops tracking.</li>
            <li>Tap “Stop sending location” after the route ends.</li>
          </ul>
        </article>
      </main>
    </div>
  )
}

export default DriverTrip
