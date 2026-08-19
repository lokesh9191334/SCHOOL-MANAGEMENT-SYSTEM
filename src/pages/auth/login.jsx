import { useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import * as auth from '../../services/auth'

const LoginPage = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [loginToken, setLoginToken] = useState(null)
  const [code, setCode] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await auth.login({ email, password })
      if (res.twoFactor) {
        setTwoFactorRequired(true)
        setLoginToken(res.loginToken)
        return
      }
      auth.saveSession(res)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await auth.twoFAVerify({ email, code, loginToken })
      auth.saveSession(res)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <div className="auth-premium">
      <div className="auth-premium-panel">
        <header className="auth-premium-header">
          <div className="auth-premium-mark">SMS</div>
          <div>
            <h1>WELCOME TO SMS</h1>
          </div>
        </header>
        {!twoFactorRequired ? (
          <>
            <form className="auth-premium-form" onSubmit={handleSubmit}>
              <label>
                <span>Work email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" placeholder="admin@school.edu" required />
              </label>
              <label>
                <span>Password</span>
                <div className="auth-premium-password-wrap">
                  <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" required />
                  <button
                    type="button"
                    className="auth-premium-ghost-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <div className="auth-premium-inline-row">
                <label className="auth-premium-checkbox">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <Link to="/auth/forgot-password" className="auth-premium-link">Forgot password?</Link>
              </div>

              {error && <div style={{ color: 'salmon', marginBottom: 8 }}>{error}</div>}
              <p style={{ margin: '0 0 12px', fontSize: 13, opacity: 0.8 }}>
                Demo login: {auth.DEMO_LOGIN.email} / {auth.DEMO_LOGIN.password}
              </p>
              <button type="submit" className="auth-premium-submit">
                Sign in
              </button>
            </form>
          
          </>
        ) : (
          <form className="auth-premium-form" onSubmit={handleVerify}>
            <p>Two-factor authentication is enabled for your account. Enter the code from your authenticator app.</p>
            <label>
              <span>Authentication code</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} type="text" inputMode="numeric" pattern="\\d*" placeholder="123456" required />
            </label>
            {error && <div style={{ color: 'salmon', marginBottom: 8 }}>{error}</div>}
            <button type="submit" className="auth-premium-submit">Verify</button>
          </form>
        )}

        <footer className="auth-premium-footer">
          <Link to="/auth/forgot-password">Forgot password</Link>
          <Link to="/auth/register">Create new account</Link>
        </footer>
      </div>
    </div>
  )
}

export default LoginPage
