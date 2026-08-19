import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../../components/auth/AuthShell'
import OtpInput from '../../components/auth/OtpInput'
import * as auth from '../../services/auth'
import { lookupInviteKey } from '../../services/inviteKeys'
import { INVITE_REQUIRED_ROLES, REGISTER_ROLE_OPTIONS } from '../../utils/constants'
import { homePathForRole } from '../../data/roleNav'
import '../../styles/auth-premium.css'

function passwordScore(password) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

const RegisterPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [inviteKey, setInviteKey] = useState('')
  const [inviteHint, setInviteHint] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [pendingToken, setPendingToken] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [resendIn, setResendIn] = useState(0)

  const strength = passwordScore(password)
  const needsInvite = INVITE_REQUIRED_ROLES.has(role)
  const canVerify = useMemo(() => otp.replace(/\D/g, '').length === 6, [otp])

  useEffect(() => {
    if (resendIn <= 0) return undefined
    const timer = window.setTimeout(() => setResendIn((v) => v - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendIn])

  useEffect(() => {
    if (!needsInvite) {
      setInviteHint('')
      setInviteError('')
    }
  }, [needsInvite])

  const applyInvite = async (rawKey) => {
    const key = String(rawKey || '').trim()
    if (!needsInvite || !key) {
      setInviteHint('')
      setInviteError('')
      return
    }
    setInviteError('')
    setInviteHint('Checking special key…')
    try {
      const invite = await lookupInviteKey(key)
      if (invite.role !== role) {
        setInviteError(`This key is for ${invite.role} accounts. Switch role or use the matching key.`)
        setInviteHint('')
        return
      }
      if (invite.name) setName(invite.name)
      if (invite.email) setEmail(invite.email)
      setInviteHint(
        invite.meta?.studentName
          ? `Key linked to student ${invite.meta.studentName}. Continue to create your parent account.`
          : `Key verified for ${invite.name || invite.role}. Continue to create your account.`,
      )
    } catch (err) {
      setInviteHint('')
      setInviteError(err.message || 'Invalid special key')
    }
  }

  const startRegister = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    if (needsInvite && !inviteKey.trim()) {
      setError('Enter the special key given by the school admin.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (strength < 3) {
      setError('Use a stronger password (8+ chars, upper case, number, symbol).')
      return
    }
    if (!agreed) {
      setError('Please accept the terms and privacy policy.')
      return
    }

    setLoading(true)
    try {
      const res = await auth.register({
        name,
        email,
        password,
        role,
        inviteKey: needsInvite ? inviteKey.trim() : undefined,
      })
      if (res.otpRequired) {
        setOtpStep(true)
        setPendingToken(res.pendingToken)
        setMaskedEmail(res.maskedEmail || email)
        setDemoOtp(res.demoOtp || '')
        setInfo(res.message || 'OTP sent to your email.')
        setResendIn(30)
        setOtp('')
        return
      }
      navigate('/auth/login')
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const verifyRegister = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await auth.registerVerify({
        email,
        code: otp,
        pendingToken,
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
        purpose: 'register',
        pendingToken,
      })
      setDemoOtp(res.demoOtp || '')
      setInfo(res.message || 'A new OTP was sent.')
      setResendIn(30)
      setOtp('')
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      mode="register"
      kicker="Create secure account"
      title={otpStep ? 'Verify email OTP' : 'Create your SMS account'}
      subtitle={
        otpStep
          ? `We emailed a 6-digit code to ${maskedEmail}. Account is created only after successful OTP verification.`
          : 'Choose your role. Teachers and parents must enter the special key issued by school admin.'
      }
      footer={
        <>
          <span>Already have an account?</span>
          <Link to="/auth/login">Sign in</Link>
        </>
      }
    >
      {!otpStep ? (
        <form className="auth-form-stack" onSubmit={startRegister}>
          <label className="auth-field">
            <span>Role</span>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                setInviteHint('')
                setInviteError('')
              }}
            >
              {REGISTER_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {needsInvite ? (
            <label className="auth-field">
              <span>Special account key</span>
              <input
                value={inviteKey}
                onChange={(e) => setInviteKey(e.target.value.toUpperCase())}
                onBlur={() => applyInvite(inviteKey)}
                type="text"
                autoComplete="off"
                placeholder="SMS-TCH-XXXX-XXXX or SMS-PAR-XXXX-XXXX"
                required
              />
              <p className="auth-helper">
                Admin generates this key when adding a teacher or completing student admission. Enter it to claim your
                linked account.
              </p>
              {inviteHint ? <div className="auth-success">{inviteHint}</div> : null}
              {inviteError ? <div className="auth-error">{inviteError}</div> : null}
            </label>
          ) : null}

          <label className="auth-field">
            <span>Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              autoComplete="name"
              placeholder="Your full name"
              required
            />
          </label>

          <label className="auth-field">
            <span>Work / contact email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="name@school.edu"
              required
            />
          </label>

          <label className="auth-field">
            <span>Create password</span>
            <div className="auth-password-wrap">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
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
            <div className="auth-strength" aria-hidden>
              {[0, 1, 2, 3].map((level) => (
                <span key={level} className={strength > level ? 'is-on' : ''} />
              ))}
            </div>
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <div className="auth-password-wrap">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Re-enter password"
                required
              />
              <button
                type="button"
                className="auth-ghost-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowConfirmPassword((v) => !v)}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="auth-check">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I agree to Terms, Privacy Policy and email OTP security verification
          </label>

          <p className="auth-helper">
            No account is created until the email OTP is verified. Teacher/Parent keys can be used only once.
          </p>

          {error ? <div className="auth-error">{error}</div> : null}
          {info ? <div className="auth-success">{info}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Sending OTP…' : 'Send email OTP'}
          </button>
        </form>
      ) : (
        <form className="otp-panel" onSubmit={verifyRegister}>
          <div className="auth-field">
            <span>Email OTP</span>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          </div>

          {demoOtp ? (
            <div className="demo-mail-card">
              <strong>Demo mailbox only</strong>
              <p>Real SMTP is not active. Configure .env for inbox delivery.</p>
              <code>{demoOtp}</code>
            </div>
          ) : (
            <div className="demo-mail-card">
              <strong>OTP emailed to your inbox</strong>
              <p>
                We sent a 6-digit code to <strong>{maskedEmail}</strong>. Check inbox and spam, then enter it below.
              </p>
            </div>
          )}

          <div className="otp-meta">
            <button type="button" className="auth-ghost-btn" onClick={resend} disabled={loading || resendIn > 0}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setOtpStep(false)
                setOtp('')
                setDemoOtp('')
                setInfo('')
              }}
            >
              Edit account details
            </button>
          </div>

          {error ? <div className="auth-error">{error}</div> : null}
          {info ? <div className="auth-success">{info}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading || !canVerify}>
            {loading ? 'Creating account…' : 'Verify OTP & create account'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}

export default RegisterPage
