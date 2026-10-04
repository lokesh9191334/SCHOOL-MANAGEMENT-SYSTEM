import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../../components/auth/AuthShell'
import OtpInput from '../../components/auth/OtpInput'
import * as auth from '../../services/auth'
import { homePathForRole } from '../../data/roleNav'
import '../../styles/auth-premium.css'

const isAdminDualMethod = (method) =>
  method === 'admin-dual' || method === 'admin-special-key'

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
  const [showDeniedHelp, setShowDeniedHelp] = useState(false)
  const isAdminDual = isAdminDualMethod(loginMethod)

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = window.setTimeout(() => setResendIn((v) => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  const captureGeo = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const base = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
          source: 'gps',
        }
        geoRef.current = base
        setGeoState('granted')
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${base.lat}&longitude=${base.lon}&localityLanguage=en`,
          )
          if (!res.ok) return
          const data = await res.json()
          geoRef.current = {
            ...base,
            city: data.city || data.locality || '',
            region: data.principalSubdivision || '',
            country: data.countryName || '',
          }
          setGeoPlace(
            [data.city || data.locality || '', data.principalSubdivision || '', data.countryName || '']
              .filter(Boolean)
              .join(', '),
          )
        } catch {
          /* coordinates alone are enough for tracking */
        }
      },
      (err) => {
        if (err && err.code === err.PERMISSION_DENIED) setGeoState('denied')
        else setGeoState('error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 },
    )
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoState('unsupported')
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
          setGeoState('prompt')
          captureGeo()
        })
    } else {
      setGeoState('prompt')
      captureGeo()
    }

    return () => {
      cancelled = true
      if (permission) permission.onchange = null
    }
  }, [captureGeo])

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

      <div className={`geo-chip geo-chip--${geoState}`} role="status">
        <span className="geo-chip-dot" aria-hidden />
        {geoState === 'locating' ? <span>Locking your exact GPS location…</span> : null}
        {geoState === 'granted' ? (
          <span>
            <strong>Exact GPS active</strong>
            {geoPlace ? ` — ${geoPlace}` : ' — this sign-in carries precise coordinates'}
          </span>
        ) : null}
        {geoState === 'prompt' ? (
          <>
            <span>Allow location for exact login tracking</span>
            <button type="button" className="geo-chip-btn" onClick={captureGeo}>
              Enable location
            </button>
          </>
        ) : null}
        {geoState === 'denied' ? (
          <>
            <span>Location blocked — exact tracking is off</span>
            <button type="button" className="geo-chip-btn" onClick={() => setShowDeniedHelp((v) => !v)}>
              {showDeniedHelp ? 'Hide help' : 'How to enable'}
            </button>
          </>
        ) : null}
        {geoState === 'error' ? (
          <>
            <span>GPS signal not received — IP location will be used</span>
            <button type="button" className="geo-chip-btn" onClick={captureGeo}>
              Retry
            </button>
          </>
        ) : null}
        {geoState === 'unsupported' ? (
          <span>Browser GPS unavailable — IP-based location will be used</span>
        ) : null}
      </div>

      {geoState === 'denied' && showDeniedHelp ? (
        <div className="geo-help-card">
          <strong>Enable location in 3 steps</strong>
          <ol>
            <li>
              <strong>Phone app:</strong> long-press the app icon → App info → Permissions →
              Location → Allow.
            </li>
            <li>
              <strong>Browser:</strong> tap the lock / ⓘ icon beside the site address → Site
              settings → Location → Allow.
            </li>
            <li>Reload this page — the chip turns green once GPS is active.</li>
          </ol>
        </div>
      ) : null}
    </AuthShell>
  )
}

export default LoginPage
