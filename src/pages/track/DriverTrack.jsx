import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import { fetchTrackInfo, sendTrackPing } from '../../services/transportLive'
import '../../styles/driver-track-premium.css'

const IST_TZ = 'Asia/Kolkata'
const PING_EVERY_MS = 15 * 1000

function istClock() {
  try {
    return new Intl.DateTimeFormat('en-IN', { timeZone: IST_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date())
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
    return 'GPS needs a secure link (https). Open the tracking link from the school secure domain.'
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

const DriverTrack = () => {
  const { key = '' } = useParams()

  const [info, setInfo] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState('')

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
    const timer = window.setInterval(() => setClock(istClock()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let active = true
    setLoadState('loading')
    fetchTrackInfo(key)
      .then((body) => {
        if (!active) return
        setInfo(body)
        setLoadState('ready')
      })
      .catch((err) => {
        if (!active) return
        setLoadError(err?.message || 'This tracking link could not be opened.')
        setLoadState('error')
      })
    return () => {
      active = false
    }
  }, [key])

  const sendNow = useCallback(async () => {
    const current = fixRef.current
    if (!current) return
    try {
      await sendTrackPing(key, {
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
      if (err?.status === 404 || err?.status === 410) {
        trackingRef.current = false
        setTrackState('error')
        setTrackError(err.message)
        window.clearInterval(intervalRef.current)
        if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      } else {
        setTrackError(err?.message || 'Position could not be sent. Retrying…')
      }
    }
  }, [key])

  const requestWakeLock = useCallback(() => {
    acquireWakeLock(wakeLockRef, trackingRef, setWakeLock)
  }, [])

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

    requestWakeLock()
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
  }, [requestWakeLock, sendNow])

  useEffect(() => () => {
    trackingRef.current = false
    if (watchIdRef.current != null) navigator.geolocation?.clearWatch(watchIdRef.current)
    window.clearInterval(intervalRef.current)
    wakeLockRef.current?.release?.().catch(() => {})
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && trackingRef.current && !wakeLockRef.current) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [requestWakeLock])

  if (loadState === 'loading') {
    return (
      <div className="drv-page drv-page--center">
        <span className="drv-spinner" aria-hidden />
        <p className="drv-muted">Opening tracking link…</p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="drv-page drv-page--center">
        <article className="drv-card drv-card--error">
          <h1>Tracking link unavailable</h1>
          <p>{loadError}</p>
          <p className="drv-muted">Please contact the school office for a fresh tracking link.</p>
        </article>
      </div>
    )
  }

  const tracking = trackState === 'live' || trackState === 'waiting'
  const statusMeta =
    trackState === 'live'
      ? { tone: 'ok', text: 'Live — school can see your bus' }
      : trackState === 'waiting'
        ? { tone: 'warn', text: 'Getting GPS fix…' }
        : trackState === 'error'
          ? { tone: 'danger', text: 'Tracking problem' }
          : { tone: 'muted', text: 'Not sending yet' }

  return (
    <div className="drv-page">
      <header className="drv-hero">
        <span className="drv-hero__badge" aria-hidden>
          <NavGlyph name="locate" size={26} />
        </span>
        <div className="drv-hero__titles">
          <p className="drv-hero__eyebrow">School bus live tracking</p>
          <h1 className="drv-hero__title">{info.driverName}</h1>
          <p className="drv-hero__meta">
            {[info.vehicleLabel, info.routeLabel].filter(Boolean).join(' · ') || 'Bus duty'}
          </p>
        </div>
        <div className="drv-hero__clock">
          <span className="drv-hero__time">{clock}</span>
          <span className="drv-hero__zone">IST</span>
        </div>
      </header>

      <main className="drv-body">
        <article className={`drv-status drv-status--${statusMeta.tone}`}>
          <span className="drv-status__dot" aria-hidden />
          <div>
            <p className="drv-status__text">{statusMeta.text}</p>
            <p className="drv-status__sub">
              {trackState === 'live'
                ? `A position is sent to the school every ${PING_EVERY_MS / 1000} seconds.`
                : 'Tap the button below so the school can follow this bus.'}
            </p>
          </div>
        </article>

        <button
          type="button"
          className={`drv-action ${tracking ? 'drv-action--stop' : ''}`}
          onClick={tracking ? stopTracking : startTracking}
        >
          <NavGlyph name={tracking ? 'ban' : 'locate'} size={22} />
          {tracking ? 'Stop sending location' : 'Start sending location'}
        </button>

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
            <span className="drv-stat__value">
              {fix?.speed != null ? `${Math.round(fix.speed * 3.6)} km/h` : '—'}
            </span>
          </div>
          <div className="drv-stat">
            <span className="drv-stat__label">Phone battery</span>
            <span className="drv-stat__value">{battery != null ? `${battery}%` : '—'}</span>
          </div>
          <div className="drv-stat">
            <span className="drv-stat__label">Screen stay-awake</span>
            <span className="drv-stat__value">{wakeLock === 'on' ? 'On' : wakeLock === 'unsupported' ? 'Not supported' : 'Off'}</span>
          </div>
        </div>

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

export default DriverTrack
