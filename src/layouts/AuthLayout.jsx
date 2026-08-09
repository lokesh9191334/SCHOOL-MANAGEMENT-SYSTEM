const AuthLayout = ({ title, description, children }) => {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <header className="auth-header">
          <h1>{title}</h1>
          <p>{description}</p>
        </header>
        <div className="auth-body">{children}</div>
      </div>
    </div>
  )
}

export default AuthLayout
