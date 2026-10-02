import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '../../components/auth/AuthShell'
import OtpInput from '../../components/auth/OtpInput'
import * as auth from '../../services/auth'
import '../../styles/auth-premium.css'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [demoOtp, setDemoOtp] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState('email')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const requestReset = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const result = await auth.requestPasswordReset({ email })
      setMaskedEmail(result.maskedEmail || email)
      setDemoOtp(result.demoOtp || '')
      setMessage(result.message || 'If the account exists, a reset code has been sent.')
      setStep('reset')
    } catch (requestError) {
      setError(requestError.message || 'Could not send a reset code.')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const result = await auth.completePasswordReset({
        email,
        code,
        password,
      })
      setMessage(result.message || 'Password updated. You can now sign in.')
      setStep('complete')
    } catch (requestError) {
      setError(requestError.message || 'Could not update the password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      mode="forgot"
      kicker="Account recovery"
      title={
        step === 'email'
          ? 'Reset your password'
          : step === 'reset'
            ? 'Create a new password'
            : 'Password updated'
      }
      subtitle={
        step === 'email'
          ? 'We’ll send a one-time security code to your registered email.'
          : step === 'reset'
            ? `Enter the code sent to ${maskedEmail}, then choose a new password.`
            : 'Your account is ready. Sign in using your new password.'
      }
      footer={
        step === 'complete' ? (
          <Link to="/auth/login">Return to sign in</Link>
        ) : (
          <>
            <span>Remembered your password?</span>
            <Link to="/auth/login">Sign in</Link>
          </>
        )
      }
    >
      {step === 'email' ? (
        <form className="auth-form-stack" onSubmit={requestReset}>
          <label className="auth-field">
            <span>Registered email</span>
            <input
              autoComplete="email"
              autoFocus
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@school.edu"
              required
            />
          </label>
          <p className="auth-helper">
            For your protection, reset instructions are only sent to the email linked to your account.
          </p>
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? 'Sending secure code…' : 'Send reset code'}
          </button>
        </form>
      ) : null}

      {step === 'reset' ? (
        <form className="auth-form-stack" onSubmit={resetPassword}>
          {message ? <div className="auth-success" role="status">{message}</div> : null}
          {demoOtp ? (
            <div className="demo-mail-card">
              <strong>Demo mailbox only</strong>
              <p>Real email delivery is not active. Configure SMTP to receive codes in your inbox.</p>
              <code>{demoOtp}</code>
            </div>
          ) : null}
          <label className="auth-field">
            <span>Email verification code</span>
            <OtpInput value={code} onChange={setCode} disabled={loading} />
          </label>
          <label className="auth-field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </label>
          <label className="auth-field">
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter the new password again"
              minLength={8}
              required
            />
          </label>
          {error ? <div className="auth-error" role="alert">{error}</div> : null}
          <button className="auth-submit" type="submit" disabled={loading || code.replace(/\D/g, '').length !== 6}>
            {loading ? 'Updating password…' : 'Verify code & update password'}
          </button>
          <button
            className="auth-text-button"
            type="button"
            disabled={loading}
            onClick={() => {
              setStep('email')
              setDemoOtp('')
              setCode('')
              setPassword('')
              setConfirmPassword('')
              setMessage('')
              setError('')
            }}
          >
            Use a different email
          </button>
        </form>
      ) : null}

      {step === 'complete' ? (
        <div className="auth-form-stack">
          <div className="auth-success" role="status">{message}</div>
          <button className="auth-submit" type="button" onClick={() => navigate('/auth/login')}>
            Continue to sign in
          </button>
        </div>
      ) : null}
    </AuthShell>
  )
}
