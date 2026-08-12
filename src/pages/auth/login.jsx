import { useEffect, useMemo, useState } from 'react'
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

  const isAdminDual = isAdminDualMethod(loginMethod)

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = window.setTimeout(() => setResendIn((v) => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

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
      const res = await auth.login({ email, password })
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
      kicker="Secure sign in"
      title={
        otpStep
          ? isAdminDual
            ? 'OTP + special key'
            : 'Email OTP verification'
          : 'Welcome back'
      }
      subtitle={
        otpStep
          ? isAdminDual
            ? `Enter both the 6-digit OTP and the 7-character special key emailed to ${maskedEmail}.`
            : `Enter the 6-digit code sent to ${maskedEmail}. Access opens only after OTP verification.`
          : 'Admins need email OTP plus a rotating 7-character special key. Teachers/parents use email OTP.'
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
              className="auth-link"
              onClick={() => {
                setOtpStep(false)
                setOtp('')
                setSpecialKey('')
                setDemoOtp('')
                setInfo('')
                setLoginMethod('email-otp')
              }}
            >
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
    </AuthShell>
  )
}

export default LoginPage
