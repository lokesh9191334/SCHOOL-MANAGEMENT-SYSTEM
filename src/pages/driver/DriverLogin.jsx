import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../../components/auth/AuthShell'
import { driverLogin } from '../../services/auth'
import { getAuthToken, getAuthUser } from '../../utils/session'
import '../../styles/auth-premium.css'
import '../../styles/driver-track-premium.css'

const DriverLogin = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const [info] = useState(location.state?.info || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAuthUser()?.role === 'driver' && getAuthToken()) {
      navigate('/driver', { replace: true })
    }
  }, [navigate])

  const submit = async (event) => {
    event.preventDefault()
    const digits = String(phone).replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Enter the phone number registered with your school.')
      return
    }
    if (pin.length !== 6) {
      setError('Enter the 6-digit PIN given by the school office.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const body = await driverLogin({ phone, pin })
      localStorage.setItem('auth_token', body.token)
      localStorage.setItem('auth_user', JSON.stringify(body.user))
      navigate('/driver', { replace: true })
    } catch (err) {
      setError(err?.message || 'Driver sign-in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      mode="login"
      kicker="Driver access"
      title="Driver sign in"
      subtitle="Use the phone number and 6-digit PIN saved by your school office. No daily link needed."
      notice={error || info}
      noticeTone={error ? 'error' : 'success'}
      onNoticeClose={() => setError('')}
      footer={
        <>
          <span>School staff?</span>
          <Link to="/auth/login">Staff sign in</Link>
        </>
      }
    >
      <form className="auth-form-stack" onSubmit={submit}>
        <label className="auth-field">
          <span>Phone number</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 00001"
            maxLength={18}
            required
          />
        </label>

        <label className="auth-field">
          <span>6-digit PIN</span>
          <div className="auth-password-wrap">
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••••"
              pattern="[0-9]*"
              maxLength={6}
              required
            />
            <button
              type="button"
              className="auth-ghost-btn"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setShowPin((value) => !value)}
            >
              {showPin ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <p className="drv-login-hint">
          Forgot your PIN? Ask the school office to generate a new one — your old PIN stops working immediately.
        </p>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Open my trip'}
        </button>
      </form>
    </AuthShell>
  )
}

export default DriverLogin
