import { Link } from 'react-router-dom'
import BrandMark from '../BrandMark.jsx'

export default function AuthShell({
  kicker = 'Secure access',
  title,
  subtitle,
  children,
  footer,
  mode = 'login',
  stageClassName = '',
}) {
  return (
    <div className={`auth-stage auth-stage--${mode} ${stageClassName}`.trim()}>
      <section className={`auth-form-pane auth-form-pane--solo auth-form-pane--${mode}`}>
        <div className="auth-form-card">
          <header className="auth-form-head">
            <div className="auth-mini-brand">
              <BrandMark className="auth-mini-mark" size={46} />
              <div className="auth-mini-text">
                <strong>SMS</strong>
                <p className="admin-kicker">{kicker}</p>
              </div>
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
