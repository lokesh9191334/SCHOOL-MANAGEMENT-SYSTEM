import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './Sidebar.css'

const Sidebar = ({ sections = [], collapsed = false }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/students', label: 'Students', icon: '🎓' },
    { to: '/teachers', label: 'Teachers', icon: '👩‍🏫' },
    { to: '/attendance', label: 'Attendance', icon: '📅' },
    { to: '/examination', label: 'Examination', icon: '📝' },
    { to: '/transport', label: 'Transport', icon: '🚌' },
    { to: '/fees', label: 'Fees', icon: '💳' },
    { to: '/settings/profile', label: 'Settings', icon: '⚙️' },
  ]

  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user')
      if (raw) setUser(JSON.parse(raw))
    } catch (e) {
      setUser(null)
    }
  }, [])

  const handleSignOut = (e) => {
    e.preventDefault()
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
    setUser(null)
    navigate('/auth/login')
  }

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo">SM</div>
        <div className="brand-text">
          <strong>SchoolSMS</strong>
          <small>Management</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} title={item.label} aria-label={item.label}>
            {({ isActive }) => (
              <span className={`sidebar-link ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined} data-label={item.label}>
                <span className="link-icon" aria-hidden>{item.icon}</span>
                <span className="link-label">{item.label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user ? (
          <a href="#signout" onClick={handleSignOut} className="sidebar-link small" title="Sign Out">
            <span className="link-icon" aria-hidden>🔓</span>
            <span className="link-label">Sign Out</span>
          </a>
        ) : (
          <NavLink to="/auth/login" className="sidebar-link small" title="Sign In" aria-label="Sign In">
            <span className="link-icon" aria-hidden>🔒</span>
            <span className="link-label">Sign In</span>
          </NavLink>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
