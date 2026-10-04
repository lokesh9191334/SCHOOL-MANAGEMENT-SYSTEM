import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../../components/auth/AuthShell'
import OtpInput from '../../components/auth/OtpInput'
import * as auth from '../../services/auth'
import { homePathForRole } from '../../data/roleNav'
import '../../styles/auth-premium.css'

const isAdminDualMethod = (method) =>
  method === 'admin-dual' || method === 'admin-special-key'

function geoDotTitle(state, place, accuracy) {
  if (state === 'granted') {
    const acc = accuracy != null ? ` ±${accuracy} m` : ''
    return `Exact GPS active${acc}${place ? ` — ${place}` : ''} — tap to re-test`
  }
  if (state === 'locating') return 'Locking your exact GPS location…'
  if (state === 'prompt') return 'Allow location in the browser prompt — exact GPS rides with this sign-in'
  if (state === 'denied') return 'Location blocked — allow it in browser site settings for exact GPS'
  if (state === 'error') return 'GPS signal not received — IP location will be used — tap to retry'
  if (state === 'insecure') return 'GPS needs an https:// connection'
  if (state === 'unsupported') return 'Browser GPS unavailable — IP location will be used'
  return ''
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    )
    // The geocode API may answer 3xx with a valid JSON body — parse it
    // regardless of res.ok; the try/catch covers non-JSON responses.
    const data = await res.json()
    const city = data.city || data.locality || ''
    const region = data.principalSubdivision || ''
    const country = data.countryName || ''
    return { label: [city, region, country].filter(Boolean).join(', '), city, region, country }
  } catch {
    return null
  }
}

const LoginPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [specialKey, setSpecialKey] = useState('')
  const [loginMethod, setLoginMethod] = useState('email-otp')
  const [loginToken, setLoginToken] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [resendIn, setResendIn] = useState(0)

  const geoRef = useRef(null)
  const [geoState, setGeoState] = useState('locating')
  const [geoPlace, setGeoPlace] = useState('')
  const [geoAccuracy, setGeoAccuracy] = useState(null)
  const attemptRef = useRef(0)
  const watchRef = useRef(null)
  const watchTimerRef = useRef(null)
  const retryTimerRef = useRef(null)
  const permissionRef = useRef('unknown')
  const isAdminDual = isAdminDualMethod(loginMethod)

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = window.setTimeout(() => setResendIn((v) => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const stopWatch = useCallback(() => {
    if (watchRef.current != null && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchRef.current)
    }
    watchRef.current = null
    if (watchTimerRef.current) {
      window.clearTimeout(watchTimerRef.current)
      watchTimerRef.current = null
    }
  }, [])

  const captureGeo = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    attemptRef.current += 1
    const attempt = attemptRef.current
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (attempt !== attemptRef.current) return
        attemptRef.current = 0
        const c = position.coords
        const base = {
          lat: c.latitude,
          lon: c.longitude,
          accuracy: Math.round(c.accuracy || 0),
          source: 'gps',
        }
        geoRef.current = base
        setGeoAccuracy(base.accuracy)
        setGeoState('granted')
        reverseGeocode(base.lat, base.lon).then((geo) => {
          if (!geo) return
          geoRef.current = { ...base, city: geo.city, region: geo.region, country: geo.country }
          setGeoPlace(geo.label)
        })
        // First fix is often ~50m; keep watching briefly so accuracy sharpens to ~10m.
        if (navigator.geolocation.watchPosition) {
          stopWatch()
          watchRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const p = pos.coords
              const cur = geoRef.current
              if (!cur || (p.accuracy || Infinity) >= (cur.accuracy || 0) + 1) return
              const better = {
                lat: p.latitude,
                lon: p.longitude,
                accuracy: Math.round(p.accuracy || 0),
                source: 'gps',
                city: cur.city,
                region: cur.region,
                country: cur.country,
              }
              geoRef.current = better
              setGeoAccuracy(better.accuracy)
            },
            () => {},
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 2000 },
          )
          watchTimerRef.current = window.setTimeout(stopWatch, 12000)
        }
      },
      (err) => {
        if (attempt !== attemptRef.current) return
        if (err && err.code === err.PERMISSION_DENIED) {
          attemptRef.current = 0
          setGeoState('denied')
          return
        }
        // Timeout / position unavailable — auto-retry while the permission is granted
        if (permissionRef.current === 'granted' && attempt <= 2) {
          retryTimerRef.current = window.setTimeout(() => captureGeo(), 2500)
          return
        }
        attemptRef.current = 0
        setGeoState('error')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    )
  }, [stopWatch])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState(window.isSecureContext === false ? 'insecure' : 'unsupported')
      return undefined
    }
    let permission = null
    let cancelled = false

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (cancelled) return
          permission = status
          const sync = () => {
            if (cancelled) return
            permissionRef.current = status.state
            if (status.state === 'granted') {
              setGeoState('locating')
              captureGeo()
            } else if (status.state === 'denied') {
              setGeoState('denied')
            } else {
              // Not decided yet — request right away so the browser shows the
              // prompt; the chip also keeps an Enable button as a fallback.
              setGeoState('prompt')
              captureGeo()
            }
          }
          sync()
          status.onchange = sync
        })
        .catch(() => {
          permissionRef.current = 'prompt'
          setGeoState('prompt')
          captureGeo()
        })
    } else {
      permissionRef.current = 'prompt'
      setGeoState('prompt')
      captureGeo()
    }

    return () => {
      cancelled = true
      if (permission) permission.onchange = null
    }
  }, [captureGeo])

  useEffect(
    () => () => {
      stopWatch()
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current)
    },
    [stopWatch],
  )

  const canVerify = useMemo(() => {
    const otpOk = otp.replace(/\D/g, '').length === 6
    if (isAdminDual) {
      const key = specialKey.replace(/\s+/g, '').toLowerCase()
      return otpOk && key.length === 7
    }
    return otpOk
  }, [otp, specialKey, isAdminDual])

  const startLogin = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const res = await auth.login({ email, password, geo: geoRef.current })
      if (res.otpRequired || res.twoFactor || res.specialKeyRequired) {
        setOtpStep(true)
        setLoginToken(res.loginToken)
        setMaskedEmail(res.maskedEmail || email)
        setDemoOtp(res.demoOtp || '')
        setLoginMethod(res.method || (res.specialKeyRequired ? 'admin-dual' : 'email-otp'))
        setInfo(
          res.message ||
            (isAdminDualMethod(res.method)
              ? 'OTP and special key were emailed. Enter both to continue.'
              : 'Verification code sent to your email.'),
        )
        setResendIn(30)
        setOtp('')
        setSpecialKey('')
        return
      }
      auth.saveSession(res)
      if (!rememberMe) {
        /* session still stored for demo ERP continuity */
      }
      navigate(homePathForRole(res?.user?.role))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const verifyLogin = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await auth.loginVerify({
        email,
        code: otp,
        specialKey: isAdminDual ? specialKey : undefined,
        loginToken,
        geo: geoRef.current,
      })
      auth.saveSession(res)
      navigate(homePathForRole(res?.user?.role))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (resendIn > 0) return
    setError('')
    setLoading(true)
    try {
      const res = await auth.resendOtp({
        email,
        purpose: 'login',
        pendingToken: loginToken,
      })
      setDemoOtp(res.demoOtp || '')
      setLoginMethod(res.method || loginMethod)
      setInfo(
        isAdminDualMethod(res.method)
          ? 'A new OTP and special key were emailed. Previous codes are invalid now.'
          : res.message || 'A new OTP was sent.',
      )
      setResendIn(30)
      setOtp('')
      setSpecialKey('')
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      mode="login"
      stageClassName={otpStep ? 'auth-stage--login-verify' : ''}
      kicker="Secure sign in"
      title={
        otpStep
          ? (isAdminDual ? 'Verify your sign-in' : 'Confirm your email')
          : 'Welcome back'
      }
      subtitle={
        otpStep
          ? isAdminDual
            ? `Enter both the 6-digit OTP and the 7-character special key emailed to ${maskedEmail}.`
            : `Enter the 6-digit code sent to ${maskedEmail}. Access opens only after OTP verification.`
          : 'Sign in to continue to your school workspace.'
      }
      footer={
        <>
          <span>New administrator?</span>
          <Link to="/auth/register">Create account</Link>
        </>
      }
    >
      {!otpStep ? (
        <form className="auth-form-stack" onSubmit={startLogin}>
          <label className="auth-field">
            <span>Work email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="admin@school.edu"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password-wrap">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="auth-ghost-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="auth-inline-row">
            <label className="auth-check">
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Remember this device
            </label>
            <Link className="auth-link" to="/auth/forgot-password">
              Forgot password?
            </Link>
          </div>

          <p className="auth-helper">
            Admin login emails a 6-digit OTP and a new 7-character special key (like lok@010) every time.
          </p>

          {error ? <div className="auth-error">{error}</div> : null}
          {info ? <div className="auth-success">{info}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Checking credentials…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form className="otp-panel" onSubmit={verifyLogin}>
          <div className="auth-field">
            <span>Email OTP</span>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          </div>

          {isAdminDual ? (
            <label className="auth-field">
              <span>Special key (7 characters)</span>
              <input
                value={specialKey}
                onChange={(e) => setSpecialKey(e.target.value.replace(/\s+/g, '').slice(0, 7))}
                type="text"
                autoComplete="one-time-code"
                placeholder="lok@010"
                spellCheck={false}
                required
              />
            </label>
          ) : null}

          {demoOtp ? (
            <div className="demo-mail-card">
              <strong>Demo mailbox only</strong>
              <p>Real SMTP is not active. Configure .env for inbox delivery.</p>
              <code>{demoOtp}</code>
            </div>
          ) : (
            <div className="demo-mail-card">
              <strong>{isAdminDual ? 'OTP + special key emailed' : 'OTP emailed to your inbox'}</strong>
              <p>
                Check <strong>{maskedEmail}</strong> (and spam).
                {isAdminDual
                  ? ' Enter both codes. The special key is single-use and changes on every login / resend.'
                  : ' The code expires in 10 minutes.'}
              </p>
            </div>
          )}

          <div className="otp-meta">
            <button type="button" className="auth-ghost-btn" onClick={resend} disabled={loading || resendIn > 0}>
              {resendIn > 0
                ? `Resend in ${resendIn}s`
                : isAdminDual
                  ? 'Resend OTP + key'
                  : 'Resend OTP'}
            </button>
            <button
              type="button"
              className="auth-text-button auth-account-switch"
              onClick={() => {
                setOtpStep(false)
                setOtp('')
                setSpecialKey('')
                setDemoOtp('')
                setInfo('')
                setError('')
                setEmail('')
                setPassword('')
                setLoginMethod('email-otp')
              }}
            >
              <span aria-hidden="true">←</span>
              Use a different account
            </button>
          </div>

          {error ? <div className="auth-error">{error}</div> : null}
          {info ? <div className="auth-success">{info}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading || !canVerify}>
            {loading ? 'Verifying…' : isAdminDual ? 'Verify both & sign in' : 'Verify OTP & sign in'}
          </button>
        </form>
      )}

      <span
        className={`geo-dot geo-dot--${geoState}`}
        role="status"
        title={geoDotTitle(geoState, geoPlace, geoAccuracy)}
        onClick={captureGeo}
      />
    </AuthShell>
  )
}

export default LoginPage
