import { Link } from 'react-router-dom'

export default function AuthShell({
  kicker = 'Secure access',
  title,
  subtitle,
  children,
  footer,
  mode = 'login',
}) {
  return (
    <div className="auth-stage">
      <section className="auth-form-pane auth-form-pane--solo">
        <div className="auth-form-card">
          <header className="auth-form-head">
            <div className="auth-mini-brand">
              <div className="auth-mini-mark">SMS</div>
              <p className="admin-kicker">{kicker}</p>
            </div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </header>
          {children}
          {footer ? (
            <footer className="auth-form-foot">{footer}</footer>
          ) : (
            <footer className="auth-form-foot">
              {mode === 'register' ? (
                <>
                  <span>Already have an account?</span>
                  <Link to="/auth/login">Sign in</Link>
                </>
              ) : (
                <>
                  <span>New to SMS?</span>
                  <Link to="/auth/register">Create account</Link>
                </>
              )}
            </footer>
          )}
        </div>
      </section>
    </div>
  )
}
