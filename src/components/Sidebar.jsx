import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ERP_NAV_SECTIONS } from '../utils/constants'
import './Sidebar.css'

const BADGE_MAP = {
  '/fees/pending': { count: 5, text: 'pending', variant: 'warning' },
  '/library/fines': { count: 3, text: 'fines', variant: 'danger' },
  '/attendance/leave-management': { count: 8, text: 'new', variant: 'info' },
  '/notices/school': { count: 4, text: 'new', variant: 'info' },
  '/fees/payments': { count: 12, text: 'today', variant: 'success' },
  '/communication/parent-notifications': { count: 6, text: 'new', variant: 'info' },
  '/students/add': { count: 2, text: 'pending', variant: 'warning' },
}

const countBadge = (to) => BADGE_MAP[to] || null

const initialsFromName = (name) => {
  if (!name) return 'AD'
  const parts = name.toString().trim().split(/\s+/)
  const first = parts[0]?.[0] || 'A'
  const last = parts[1]?.[0] || 'D'
  return `${first}${last}`.toUpperCase()
}

const Sidebar = ({ collapsed = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user')
      if (raw) setUser(JSON.parse(raw))
    } catch (e) {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const next = {}
    const pathname = typeof location?.pathname === 'string' ? location.pathname : ''
    ERP_NAV_SECTIONS.forEach((section) => {
      const hasActive = Array.isArray(section.items) && section.items.some((item) => {
        if (!item || typeof item.to !== 'string') return false
        if (item.end) return pathname === item.to
        return pathname === item.to || pathname.startsWith(`${item.to}/`)
      })
      if (hasActive) next[section.title] = true
    })
    setExpandedSections((prev) => ({ ...prev, ...next }))
  }, [location.pathname])

  const toggleSection = (title) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const handleSignOut = (e) => {
    e.preventDefault()
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
    setUser(null)
    navigate('/auth/login')
  }

  const userName = user?.name || user?.fullName || 'Admin User'
  const userRole = user?.role || 'Administrator'

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-logo">
          <span>SM</span>
        </div>
        <div className="brand-text">
          <strong>SchoolSMS</strong>
          <small>Premium ERP</small>
        </div>
      </div>

      <div className="sidebar-scroll-area">
        <nav className="sidebar-nav">
          {ERP_NAV_SECTIONS.map((section) => {
            const isExpanded = expandedSections[section.title]
            const safeItems = Array.isArray(section.items) ? section.items : []
            const pathname = typeof location?.pathname === 'string' ? location.pathname : ''
            const hasActive = safeItems.some((item) => {
              if (!item || typeof item.to !== 'string') return false
              if (item.end) return pathname === item.to
              return pathname === item.to || pathname.startsWith(`${item.to}/`)
            })

            return (
              <div key={section.title} className={`nav-section ${hasActive ? 'section-active' : ''}`}>
                <button
                  type="button"
                  className={`section-header ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleSection(section.title)}
                  aria-expanded={isExpanded}
                  aria-controls={`section-${section.title}`}
                  data-collapsed-tip={section.title}
                >
                  <span className="section-icon" aria-hidden>{section.icon}</span>
                  <span className="section-title">{section.title}</span>
                  <span className="section-chevron" aria-hidden>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </span>
                </button>

                <div
                  id={`section-${section.title}`}
                  className={`section-items ${isExpanded ? 'is-open' : ''}`}
                  role="region"
                  aria-label={section.title}
                >
                  <div className="section-items-inner">
                    {safeItems.filter((item) => item && typeof item.to === 'string').map((item) => {
                      const badge = countBadge(item.to)
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          title={item.label}
                          aria-label={item.label}
                          data-label={item.label}
                        >
                          {({ isActive }) => (
                            <span className={`sidebar-link ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined}>
                              <span className="link-icon" aria-hidden>{item.icon}</span>
                              <span className="link-label">{item.label}</span>
                              {badge && (
                                <span className={`link-badge badge-${badge.variant}`}>
                                  <strong>{badge.count}</strong>
                                  <em>{badge.text}</em>
                                </span>
                              )}
                            </span>
                          )}
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="profile-card">
          <div className="profile-avatar" aria-hidden>
            {user?.avatar ? (
              <img src={user.avatar} alt={userName} />
            ) : (
              <span>{initialsFromName(userName)}</span>
            )}
            <span className="avatar-dot"></span>
          </div>
          <div className="profile-info">
            <span className="profile-name">{userName}</span>
            <span className="profile-role">{userRole}</span>
          </div>
          <button
            type="button"
            className="signout-btn"
            onClick={handleSignOut}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
