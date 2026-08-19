import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ERP_NAV_SECTIONS, titleForPath } from '../utils/constants'
import { clearSession } from '../services/auth'
import './AppShell.css'
import SlideProvider from '../context/SlideContext'

const AppShell = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { pathname } = location
  const subtitle = titleForPath(pathname)
  const [routeVisible, setRouteVisible] = useState(false)
  const quickActions = [
    { to: '/students/add', label: 'New student' },
    { to: '/fees/payments', label: 'Collect fee' },
  ]
  const today =
    typeof Intl !== 'undefined'
      ? new Intl.DateTimeFormat(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(new Date())
      : ''

  useEffect(() => {
    setRouteVisible(false)

    const frameId = window.requestAnimationFrame(() => {
      setRouteVisible(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [location.key])

  const AppInner = () => {
    return (
      <div className="sms-root">
      <aside className="sms-sidebar" aria-label="Main navigation">
        <div className="sms-brand">
          <div className="sms-brand-mark" aria-hidden>
            SMS
          </div>
          <div>
            <p className="sms-brand-title">SMS</p>
          </div>
        </div>

        <div className="sms-nav-scroll">
          <nav className="sms-nav" aria-label="Modules">
            {ERP_NAV_SECTIONS.map((section) => (
              <div key={section.title} className="sms-nav-group">
                <p className="sms-nav-heading">
                  <span className="sms-nav-heading-icon" aria-hidden>
                    {section.icon}
                  </span>
                  {section.title}
                </p>
                {(Array.isArray(section.items) ? section.items : []).filter((item) => item && typeof item.to === 'string').map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `sms-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="sms-nav-icon" aria-hidden>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="sms-sidebar-card">
          <p className="sms-sidebar-card-label">Session</p>
          <p className="sms-sidebar-card-value">2026–27</p>
          <button
            type="button"
            onClick={() => {
              clearSession()
              navigate('/auth/login', { replace: true })
            }}
            className="sms-sidebar-link"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            Switch account
          </button>
        </div>
      </aside>

      <div className="sms-main">
        <header className="sms-topbar">
          <div>
            <p className="sms-topbar-eyebrow">Today</p>
            <h1 className="sms-topbar-title">{subtitle}</h1>
            <p className="sms-topbar-meta">{today}</p>
            <div className="sms-topbar-pills">
              <span className="sms-topbar-pill-item">Campus online</span>
              <span className="sms-topbar-pill-item">Attendance synced</span>
              <span className="sms-topbar-pill-item">Fee desk active</span>
            </div>
          </div>
          <div className="sms-topbar-right">
            <div className="sms-search" role="search">
              <span className="sms-search-icon" aria-hidden>
                ⌕
              </span>
              <input
                id="global-search"
                name="globalSearch"
                type="search"
                placeholder="Search students, staff, invoices..."
                aria-label="Global search"
                autoComplete="off"
              />
            </div>
            <div className="sms-topbar-actions">
              <span className="sms-sync-badge">Live sync</span>
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className="sms-topbar-link">
                  {action.label}
                </Link>
              ))}
            </div>
            <div className="sms-notify" title="Notifications">
              <span className="sms-notify-dot" />
              Alerts
            </div>
            <div className="sms-user">
              <div className="sms-user-avatar" aria-hidden>
                A
              </div>
              <div>
                <p className="sms-user-name">Admin</p>
                <p className="sms-user-role">Principal office</p>
              </div>
            </div>
          </div>
        </header>

        <main className="sms-outlet">
          <div key={location.key} className={`sms-route-panel ${routeVisible ? 'is-visible' : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
  }

  return (
    <SlideProvider>
      <AppInner />
    </SlideProvider>
  )
}

export default AppShell
