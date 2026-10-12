import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import { getAuthUser, roleLabel } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import { fetchMyFace, enrollMyFace, removeMyFace, markFaceAttendance, fetchStaffAttendance } from '../../services/faceAttendance'
import {
  loadFaceEngine,
  detectFaceDescriptor,
  captureThumb,
  startCamera,
  stopCamera,
  describeCameraError,
  describeDevice,
  scaleBox,
} from '../../utils/faceEngine'
import '../../styles/staff-face-premium.css'

const IST_TZ = 'Asia/Kolkata'

function istToday() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function istClock() {
  try {
    return new Intl.DateTimeFormat('en-IN', { timeZone: IST_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date())
  } catch {
    return ''
  }
}

function dateLabel(dateStr) {
  try {
    const [y, m, d] = String(dateStr).split('-').map(Number)
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d))
  } catch {
    return dateStr
  }
}

function enrolledLabel(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function initials(name) {
  return String(name || 'S')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

const STATUS_META = {
  present: { label: 'Present', tone: 'ok' },
  late: { label: 'Late', tone: 'warn' },
  absent: { label: 'Absent', tone: 'danger' },
  notenrolled: { label: 'Not enrolled', tone: 'muted' },
}

function statusOf(person) {
  if (!person.enrolled) return 'notenrolled'
  if (!person.present) return 'absent'
  return person.late ? 'late' : 'present'
}

const StaffFaceAttendance = () => {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [tab, setTab] = useState('scan')
  const [clock, setClock] = useState(() => istClock())
  const [isFull, setIsFull] = useState(false)

  const [engineStatus, setEngineStatus] = useState('idle')
  const [engineNote, setEngineNote] = useState('')
  const [engineError, setEngineError] = useState('')

  const [camStatus, setCamStatus] = useState('off')
  const [camError, setCamError] = useState('')
  const [box, setBox] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const [missMessage, setMissMessage] = useState('')

  const [myFace, setMyFace] = useState(null)
  const [myFaceError, setMyFaceError] = useState('')
  const [enrollState, setEnrollState] = useState('idle')
  const [sampleCount, setSampleCount] = useState(0)
  const [enrollError, setEnrollError] = useState('')

  const [todayDate, setTodayDate] = useState(() => istToday())
  const [todayData, setTodayData] = useState(null)
  const [todayLoading, setTodayLoading] = useState(false)
  const [todayError, setTodayError] = useState('')

  const [toasts, setToasts] = useState([])

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const markingRef = useRef(false)
  const pauseUntilRef = useRef(0)
  const samplesRef = useRef([])
  const lastSampleAtRef = useRef(0)
  const resultTimerRef = useRef(null)
  const locationRef = useRef(null)

  const pushToast = useCallback((tone, text) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-3), { id, tone, text }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 4600)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(istClock()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const onFull = () => setIsFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFull)
    return () => document.removeEventListener('fullscreenchange', onFull)
  }, [])

  const stopScan = useCallback(() => {
    stopCamera(streamRef.current, videoRef.current)
    streamRef.current = null
    setBox(null)
    setCamStatus('off')
  }, [])

  const startScan = useCallback(async () => {
    if (streamRef.current) return
    setCamError('')
    setCamStatus('starting')
    try {
      const stream = await startCamera(videoRef.current)
      streamRef.current = stream
      setCamStatus('on')
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            locationRef.current = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
        )
      }
    } catch (err) {
      setCamError(describeCameraError(err))
      setCamStatus('error')
    }
  }, [])

  useEffect(() => {
    if (tab !== 'scan' && tab !== 'myface') return undefined
    let active = true
    setEngineError('')
    if (engineStatus === 'ready') return undefined
    setEngineStatus('loading')
    loadFaceEngine((note) => {
      if (active) setEngineNote(note)
    })
      .then(() => {
        if (active) setEngineStatus('ready')
      })
      .catch((err) => {
        if (active) {
          setEngineStatus('error')
          setEngineError(err?.message || 'Face engine could not load.')
        }
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    if (tab === 'scan' && engineStatus === 'ready' && camStatus === 'off') {
      startScan()
    }
    if (tab === 'today') {
      stopScan()
    }
  }, [tab, engineStatus, camStatus, startScan, stopScan])

  useEffect(() => () => {
    stopScan()
    window.clearTimeout(resultTimerRef.current)
  }, [stopScan])

  // Continuous kiosk scan: detect -> match on server -> show result
  useEffect(() => {
    if (tab !== 'scan' || camStatus !== 'on' || engineStatus !== 'ready') return undefined
    let cancelled = false
    const timer = window.setInterval(async () => {
      if (cancelled || markingRef.current || Date.now() < pauseUntilRef.current) return
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      try {
        const hit = await detectFaceDescriptor(video)
        if (cancelled) return
        setBox(hit ? scaleBox(hit, video) : null)
        if (!hit) return
        markingRef.current = true
        const result = await markFaceAttendance({
          descriptor: hit.descriptor,
          location: locationRef.current,
          device: describeDevice(),
        })
        if (cancelled) return
        if (result.matched) {
          setMissMessage('')
          setLastResult(result)
          window.clearTimeout(resultTimerRef.current)
          resultTimerRef.current = window.setTimeout(() => setLastResult(null), 9000)
          pauseUntilRef.current = Date.now() + (result.cooldown ? 4000 : 10000)
          if (!result.cooldown) {
            pushToast(
              'ok',
              `${result.person?.name || 'Staff'} ${result.type === 'in' ? 'checked in' : 'checked out'} · ${result.record?.time || ''} IST`,
            )
          }
        } else {
          setMissMessage(result.error || 'Face not recognized.')
          pauseUntilRef.current = Date.now() + 2500
        }
      } catch (err) {
        if (!cancelled) {
          setMissMessage(err?.message || 'Scan failed.')
          pauseUntilRef.current = Date.now() + 5000
        }
      } finally {
        markingRef.current = false
      }
    }, 850)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [tab, camStatus, engineStatus, pushToast])

  // Enrollment capture loop: collect 3 samples, then save
  useEffect(() => {
    if (tab !== 'myface' || enrollState !== 'capturing' || camStatus !== 'on' || engineStatus !== 'ready') return undefined
    let cancelled = false
    const timer = window.setInterval(async () => {
      if (cancelled || markingRef.current) return
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      try {
        const hit = await detectFaceDescriptor(video)
        if (cancelled) return
        setBox(hit ? scaleBox(hit, video) : null)
        if (!hit || hit.score < 0.55) return
        if (Date.now() - lastSampleAtRef.current < 1100) return
        lastSampleAtRef.current = Date.now()
        samplesRef.current = [...samplesRef.current, hit.descriptor]
        setSampleCount(samplesRef.current.length)
        if (samplesRef.current.length >= 3) {
          markingRef.current = true
          setEnrollState('saving')
          const thumb = captureThumb(video)
          try {
            await enrollMyFace({ descriptors: samplesRef.current, photoThumb: thumb })
            pushToast('ok', 'Face enrolled. You can now mark attendance.')
            setEnrollError('')
            const status = await fetchMyFace()
            setMyFace(status)
            setSampleCount(0)
            samplesRef.current = []
            setEnrollState('idle')
            stopScan()
          } catch (err) {
            setEnrollError(err?.message || 'Enrollment could not be saved.')
            setEnrollState('capturing')
            setSampleCount(0)
            samplesRef.current = []
          } finally {
            markingRef.current = false
          }
        }
      } catch {
        /* keep scanning */
      }
    }, 800)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [tab, enrollState, camStatus, engineStatus, pushToast, stopScan])

  useEffect(() => {
    let active = true
    fetchMyFace()
      .then((status) => {
        if (active) setMyFace(status)
      })
      .catch((err) => {
        if (active) setMyFaceError(err?.message || 'Could not load your face profile.')
      })
    return () => {
      active = false
    }
  }, [])

  const loadToday = useCallback(async (date) => {
    setTodayLoading(true)
    setTodayError('')
    try {
      const data = await fetchStaffAttendance(date)
      setTodayData(data)
    } catch (err) {
      setTodayError(err?.message || 'Could not load attendance.')
    } finally {
      setTodayLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab !== 'today' || !isAdmin) return
    loadToday(todayDate)
  }, [tab, todayDate, isAdmin, loadToday])

  const summary = todayData?.summary || null
  const roster = useMemo(() => todayData?.roster || [], [todayData])
  const records = useMemo(() => todayData?.records || [], [todayData])

  if (!user) return <Navigate replace to="/auth/login" />
  if (role === 'parent') return <Navigate replace to={homePathForRole(role)} />

  const tabs = [
    { value: 'scan', label: 'Scan', icon: 'faceScan' },
    { value: 'myface', label: 'My Face', icon: 'user' },
    ...(isAdmin ? [{ value: 'today', label: 'Today', icon: 'clipboardCheck' }] : []),
  ]

  const toggleFull = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
  }

  const startEnrollment = async () => {
    setEnrollError('')
    samplesRef.current = []
    lastSampleAtRef.current = 0
    setSampleCount(0)
    setEnrollState('capturing')
    if (camStatus !== 'on') await startScan()
  }

  const cancelEnrollment = () => {
    setEnrollState('idle')
    samplesRef.current = []
    setSampleCount(0)
    stopScan()
  }

  const handleRemoveFace = async () => {
    try {
      await removeMyFace()
      setMyFace({ enrolled: false })
      pushToast('ok', 'Face enrollment removed.')
    } catch (err) {
      pushToast('err', err?.message || 'Could not remove enrollment.')
    }
  }

  const scanActive = tab === 'scan' && camStatus === 'on' && engineStatus === 'ready'
  const myFaceCamActive = tab === 'myface' && enrollState === 'capturing' && camStatus === 'on'

  return (
    <div className="sf-page">
      <header className="sf-hero">
        <div className="sf-hero__lead">
          <span className="sf-hero__badge" aria-hidden>
            <NavGlyph name="faceScan" size={26} />
          </span>
          <div className="sf-hero__titles">
            <p className="sf-hero__eyebrow">Staff attendance · teachers, admin & staff</p>
            <h1 className="sf-hero__title">Face Attendance</h1>
            <p className="sf-hero__meta">
              On-device face recognition — server date &amp; time record with location. No photo ever leaves this device.
            </p>
          </div>
        </div>
        <div className="sf-hero__side">
          <div className="sf-hero__clock">
            <span className="sf-hero__clock-time">{clock}</span>
            <span className="sf-hero__clock-zone">IST · {istToday()}</span>
          </div>
          <div className="sf-hero__pills">
            <span className={`sf-pill sf-pill--${engineStatus === 'ready' ? 'ok' : engineStatus === 'error' ? 'danger' : 'muted'}`}>
              {engineStatus === 'ready' ? 'Engine ready' : engineStatus === 'error' ? 'Engine error' : engineStatus === 'loading' ? 'Loading engine…' : 'Engine idle'}
            </span>
            <span className={`sf-pill sf-pill--${camStatus === 'on' ? 'ok' : camStatus === 'error' ? 'danger' : 'muted'}`}>
              {camStatus === 'on' ? 'Camera on' : camStatus === 'starting' ? 'Camera…' : 'Camera off'}
            </span>
          </div>
          <button type="button" className="sf-hero__full" onClick={toggleFull}>
            <NavGlyph name={isFull ? 'rows' : 'grid'} size={15} />
            {isFull ? 'Exit kiosk' : 'Kiosk fullscreen'}
          </button>
        </div>
      </header>

      <nav className="sf-tabs" aria-label="Face attendance sections">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`sf-tab ${tab === item.value ? 'is-active' : ''}`}
            onClick={() => {
              setLastResult(null)
              setMissMessage('')
              setEnrollState('idle')
              samplesRef.current = []
              setSampleCount(0)
              stopScan()
              setTab(item.value)
            }}
          >
            <NavGlyph name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'scan' ? (
        <section className="sf-stage">
          <div className="sf-cam-panel">
            <div className={`sf-cam-frame ${camStatus === 'on' ? 'is-on' : ''}`}>
              <video ref={videoRef} className="sf-cam-video" playsInline muted />
              {box && scanActive ? (
                <div
                  className="sf-cam-box"
                  style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                />
              ) : null}
              {camStatus !== 'on' ? (
                <div className="sf-cam-off">
                  {camStatus === 'starting' ? (
                    <>
                      <span className="sf-spinner" aria-hidden />
                      <p>Starting camera…</p>
                    </>
                  ) : (
                    <>
                      <NavGlyph name="camera" size={34} />
                      <p>{camError || 'Camera is off.'}</p>
                      {camStatus === 'error' ? (
                        <button type="button" className="sf-btn sf-btn--primary" onClick={startScan}>
                          Try again
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
              {scanActive ? (
                <div className="sf-cam-status">
                  <span className="sf-live-dot" aria-hidden />
                  {lastResult && !lastResult.cooldown ? 'Attendance marked' : missMessage ? 'No match yet' : 'Scanning — look at the camera'}
                </div>
              ) : null}
              {missMessage && scanActive && !lastResult ? (
                <p className="sf-cam-note">{missMessage}</p>
              ) : null}
            </div>

            <div className="sf-cam-toolbar">
              {camStatus === 'on' ? (
                <button type="button" className="sf-btn" onClick={stopScan}>
                  Stop camera
                </button>
              ) : (
                <button type="button" className="sf-btn sf-btn--primary" onClick={startScan} disabled={engineStatus !== 'ready'}>
                  Start camera
                </button>
              )}
              <button type="button" className="sf-btn" onClick={toggleFull}>
                {isFull ? 'Exit kiosk' : 'Kiosk mode'}
              </button>
              {engineNote && engineStatus !== 'ready' ? <span className="sf-cam-toolbar__note">{engineNote}</span> : null}
            </div>
            {engineError ? <p className="sf-error">{engineError}</p> : null}
          </div>

          <div className="sf-side">
            {lastResult ? (
              <article className={`sf-result ${lastResult.type === 'out' ? 'is-out' : ''}`}>
                <div className="sf-result__glyph">
                  <NavGlyph name={lastResult.type === 'in' ? 'checkSquare' : 'logout'} size={22} />
                </div>
                <div className="sf-result__body">
                  <p className="sf-result__kicker">
                    {lastResult.cooldown ? 'Already marked' : lastResult.type === 'in' ? 'Checked in' : 'Checked out'}
                  </p>
                  <h2 className="sf-result__name">{lastResult.person?.name || 'Staff'}</h2>
                  <p className="sf-result__role">{roleLabel(lastResult.person?.role)}</p>
                  <p className="sf-result__time">{lastResult.record?.atIST || lastResult.record?.time}</p>
                  <div className="sf-result__tags">
                    {typeof lastResult.record?.matchPercent === 'number' ? (
                      <span className="sf-tag sf-tag--ok">Match {lastResult.record.matchPercent}%</span>
                    ) : null}
                    {lastResult.record?.location ? (
                      <a
                        className="sf-tag sf-tag--link"
                        href={`https://www.google.com/maps?q=${lastResult.record.location.lat},${lastResult.record.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Location {Number(lastResult.record.location.accuracy) ? `±${lastResult.record.location.accuracy}m` : ''}
                      </a>
                    ) : (
                      <span className="sf-tag">No location</span>
                    )}
                  </div>
                </div>
                <button type="button" className="sf-result__close" aria-label="Dismiss result" onClick={() => setLastResult(null)}>
                  ✕
                </button>
              </article>
            ) : (
              <article className="sf-hint">
                <h3>How the kiosk works</h3>
                <ol>
                  <li>Keep this page open on the gate device (kiosk fullscreen is best).</li>
                  <li>Staff simply look at the camera — first scan marks check-in, the next marks check-out.</li>
                  <li>Date, time and location are stamped by the school server (IST).</li>
                </ol>
                {myFace && !myFace.enrolled ? (
                  <button type="button" className="sf-btn sf-btn--primary" onClick={() => setTab('myface')}>
                    Enroll your own face first
                  </button>
                ) : null}
              </article>
            )}

            {summary && tab === 'scan' ? (
              <article className="sf-mini-today">
                <h3>Today at a glance</h3>
                <div className="sf-mini-row">
                  <span className="sf-mini-num sf-mini-num--ok">{summary.present}</span>
                  <span>present</span>
                  <span className="sf-mini-num sf-mini-num--warn">{summary.late}</span>
                  <span>late</span>
                  <span className="sf-mini-num sf-mini-num--danger">{summary.absent}</span>
                  <span>absent</span>
                </div>
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'myface' ? (
        <section className="sf-stage">
          <div className="sf-cam-panel">
            <div className={`sf-cam-frame ${camStatus === 'on' ? 'is-on' : ''}`}>
              <video ref={videoRef} className="sf-cam-video" playsInline muted />
              {box && myFaceCamActive ? (
                <div
                  className="sf-cam-box"
                  style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                />
              ) : null}
              {camStatus !== 'on' ? (
                <div className="sf-cam-off">
                  {camStatus === 'starting' ? (
                    <>
                      <span className="sf-spinner" aria-hidden />
                      <p>Starting camera…</p>
                    </>
                  ) : (
                    <>
                      <NavGlyph name="camera" size={34} />
                      <p>{camError || 'Press start and look straight at the camera.'}</p>
                    </>
                  )}
                </div>
              ) : null}
              {myFaceCamActive ? (
                <div className="sf-cam-status">
                  <span className="sf-live-dot" aria-hidden />
                  Capturing sample {Math.min(sampleCount + 1, 3)} of 3 — hold still
                </div>
              ) : null}
            </div>

            <div className="sf-cam-toolbar">
              {enrollState === 'capturing' ? (
                <>
                  <div className="sf-sample-dots" aria-label="Samples captured">
                    {[0, 1, 2].map((index) => (
                      <span key={index} className={index < sampleCount ? 'is-done' : ''} />
                    ))}
                  </div>
                  <button type="button" className="sf-btn" onClick={cancelEnrollment}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="sf-btn sf-btn--primary"
                  onClick={startEnrollment}
                  disabled={engineStatus !== 'ready' || enrollState === 'saving'}
                >
                  {enrollState === 'saving' ? 'Saving…' : myFace?.enrolled ? 'Re-enroll my face' : 'Start face enrollment'}
                </button>
              )}
              {engineNote && engineStatus !== 'ready' ? <span className="sf-cam-toolbar__note">{engineNote}</span> : null}
            </div>
            {enrollError ? <p className="sf-error">{enrollError}</p> : null}
            {engineError ? <p className="sf-error">{engineError}</p> : null}
          </div>

          <div className="sf-side">
            <article className="sf-panel">
              <h3 className="sf-panel__title">My face profile</h3>
              {myFaceError ? <p className="sf-error">{myFaceError}</p> : null}
              {myFace == null ? (
                <p className="sf-muted">Checking enrollment…</p>
              ) : myFace.enrolled ? (
                <div className="sf-profile">
                  <div className="sf-avatar sf-avatar--lg">
                    {myFace.photoThumb ? <img src={myFace.photoThumb} alt="" /> : initials(myFace.name)}
                  </div>
                  <div className="sf-profile__meta">
                    <p className="sf-profile__name">{myFace.name || user?.name}</p>
                    <p className="sf-profile__sub">
                      {roleLabel(myFace.role || role)} · {myFace.descriptorCount} face samples
                    </p>
                    <p className="sf-profile__sub">Enrolled {enrolledLabel(myFace.enrolledAt)}</p>
                  </div>
                </div>
              ) : (
                <p className="sf-muted">
                  Not enrolled yet. Capture 3 quick samples and your face becomes your attendance ID.
                </p>
              )}
              <ul className="sf-tips">
                <li>Face the light, remove the mask/cap if possible.</li>
                <li>Hold the phone at eye level, about an arm&apos;s length away.</li>
                <li>Only a 128-number face signature is stored — never your photo.</li>
              </ul>
              {myFace?.enrolled ? (
                <button type="button" className="sf-btn sf-btn--danger" onClick={handleRemoveFace}>
                  Remove my enrollment
                </button>
              ) : null}
            </article>
          </div>
        </section>
      ) : null}

      {tab === 'today' && isAdmin ? (
        <section className="sf-today">
          <div className="sf-today__bar">
            <input
              type="date"
              className="sf-date"
              value={todayDate}
              max={istToday()}
              onChange={(event) => setTodayDate(event.target.value || istToday())}
              aria-label="Attendance date"
            />
            <span className="sf-today__datelabel">{dateLabel(todayDate)}</span>
            <button type="button" className="sf-btn" onClick={() => loadToday(todayDate)} disabled={todayLoading}>
              <NavGlyph name="refresh" size={15} />
              Refresh
            </button>
          </div>

          {todayError ? <p className="sf-error">{todayError}</p> : null}
          {todayLoading && !todayData ? <p className="sf-muted">Loading attendance…</p> : null}

          {summary ? (
            <div className="sf-summary-grid">
              <div className="sf-summary sf-summary--ok">
                <span className="sf-summary__num">{summary.present}</span>
                <span className="sf-summary__label">Present</span>
              </div>
              <div className="sf-summary sf-summary--warn">
                <span className="sf-summary__num">{summary.late}</span>
                <span className="sf-summary__label">Late (after {summary.lateAfter})</span>
              </div>
              <div className="sf-summary sf-summary--danger">
                <span className="sf-summary__num">{summary.absent}</span>
                <span className="sf-summary__label">Absent</span>
              </div>
              <div className="sf-summary sf-summary--muted">
                <span className="sf-summary__num">{summary.notEnrolled}</span>
                <span className="sf-summary__label">Not enrolled</span>
              </div>
            </div>
          ) : null}

          {roster.length ? (
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Status</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((person) => {
                    const status = statusOf(person)
                    return (
                      <tr key={person.email} className={person.present ? '' : 'is-absent'}>
                        <td>
                          <div className="sf-person">
                            <div className="sf-avatar">
                              {person.photoThumb ? <img src={person.photoThumb} alt="" /> : initials(person.name)}
                            </div>
                            <div>
                              <p className="sf-person__name">{person.name}</p>
                              <p className="sf-person__role">{roleLabel(person.role)}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`sf-chip sf-chip--${STATUS_META[status].tone}`}>
                            {STATUS_META[status].label}
                          </span>
                        </td>
                        <td className="sf-mono">{person.firstIn || '—'}</td>
                        <td className="sf-mono">{person.lastOut || '—'}</td>
                        <td className="sf-mono">{person.scans || 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {records.length ? (
            <article className="sf-panel">
              <h3 className="sf-panel__title">Scan log · {dateLabel(todayData.date)}</h3>
              <ul className="sf-log">
                {records.map((record) => (
                  <li key={record.id} className="sf-log__row">
                    <span className={`sf-chip ${record.type === 'in' ? 'sf-chip--ok' : 'sf-chip--muted'}`}>
                      {record.type === 'in' ? 'IN' : 'OUT'}
                    </span>
                    <span className="sf-log__time sf-mono">{record.time}</span>
                    <span className="sf-log__name">{record.name}</span>
                    <span className="sf-log__meta">
                      {typeof record.matchPercent === 'number' ? `${record.matchPercent}%` : ''}
                      {record.device ? ` · ${record.device}` : ''}
                    </span>
                    {record.location ? (
                      <a
                        className="sf-log__link"
                        href={`https://www.google.com/maps?q=${record.location.lat},${record.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Map
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ) : todayData && !records.length ? (
            <p className="sf-muted">No scans on {dateLabel(todayData.date)} yet.</p>
          ) : null}
        </section>
      ) : null}

      {toasts.length
        ? createPortal(
            <div className="sf-toasts" role="status">
              {toasts.map((toast) => (
                <div key={toast.id} className={`sf-toast sf-toast--${toast.tone}`}>
                  <span className="sf-toast__dot" aria-hidden />
                  <p>{toast.text}</p>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export default StaffFaceAttendance
