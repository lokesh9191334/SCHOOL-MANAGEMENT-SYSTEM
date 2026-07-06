import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import * as auth from '../../services/auth'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-check both fields.')
      return
    }

    if (!agreed) {
      setError('Please accept the terms and privacy policy to continue.')
      return
    }

    try {
      await auth.register({ name, email, password })
      navigate('/auth/login')
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
            <h1>Create account</h1>
            <p>Set up a secure administrator account in minutes and unlock the full SMS experience.</p>
          </div>
        </header>

        <form className="auth-premium-form" onSubmit={handleSubmit}>
          <label>
            <span>Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" autoComplete="name" placeholder="Jane Doe" required />
          </label>
          <label>
            <span>Work email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="name@school.edu" required />
          </label>
          <label>
            <span>Create password</span>
            <div className="auth-premium-password-wrap">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" required />
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
          <label>
            <span>Confirm password</span>
            <div className="auth-premium-password-wrap">
              <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" required />
              <button
                type="button"
                className="auth-premium-ghost-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="auth-premium-inline-row">
            <label className="auth-premium-checkbox">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>I agree to the Terms & Privacy Policy</span>
            </label>
          </div>

          <p className="auth-premium-helper">Secure sign-up with password confirmation and account protection built in.</p>

          {error && <div style={{ color: 'salmon', marginBottom: 8 }}>{error}</div>}
          <button type="submit" className="auth-premium-submit">Create account</button>
        </form>

        <footer className="auth-premium-footer">
          <span>Already have an account?</span>
          <Link to="/auth/login">Sign in</Link>
        </footer>
      </div>
    </div>
  )
}

export default RegisterPage
