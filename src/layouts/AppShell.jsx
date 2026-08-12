import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { homePathForRole, navForRole, quickActionsForRole, titleFromRoleNav } from '../data/roleNav'
import { getAuthUser, roleLabel } from '../utils/session'
import './AppShell.css'
import SlideProvider from '../context/SlideContext'

const SIDEBAR_SCROLL_KEY = 'sms_sidebar_scroll_top'

const AppShell = () => {
  const location = useLocation()
  const { pathname } = location
  const [user, setUser] = useState(() => getAuthUser())
  const [routeVisible, setRouteVisible] = useState(true)
  const [navOpen, setNavOpen] = useState(false)
  const navScrollRef = useRef(null)

  useEffect(() => {
    setUser(getAuthUser())
  }, [pathname])

  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!navOpen) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setNavOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [navOpen])

  const role = user?.role || 'admin'
  const navSections = useMemo(() => navForRole(role), [role])
  const quickActions = useMemo(() => quickActionsForRole(role), [role])
  const subtitle = titleFromRoleNav(pathname)
  const homePath = homePathForRole(role)

  const mobileDock = useMemo(() => {
    const flat = navSections.flatMap((section) => section.items)
    const picks = []
    const want = [homePath, '/dashboard', '/students', '/students/list', '/attendance', '/fees/payments', '/settings/profile']
    want.forEach((to) => {
      const hit = flat.find((item) => item.to === to || item.to.startsWith(`${to}/`))
      if (hit && !picks.some((p) => p.to === hit.to)) picks.push(hit)
    })
    if (picks.length < 4) {
      flat.forEach((item) => {
        if (picks.length >= 4) return
        if (!picks.some((p) => p.to === item.to)) picks.push(item)
      })
    }
    return picks.slice(0, 4)
  }, [navSections, homePath])

  const today =
    typeof Intl !== 'undefined'
      ? new Intl.DateTimeFormat(undefined, {
          weekday: 'short',
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

  useEffect(() => {
    const node = navScrollRef.current
    if (!node) return undefined

    try {
      const saved = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || 0)
      if (!Number.isNaN(saved) && saved > 0) {
        node.scrollTop = saved
      }
    } catch {
      /* ignore */
    }

    const onScroll = () => {
      try {
        sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(node.scrollTop))
      } catch {
        /* ignore */
      }
    }

    node.addEventListener('scroll', onScroll, { passive: true })
    return () => node.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const node = navScrollRef.current
    if (!node) return
    try {
      const saved = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || 0)
      if (!Number.isNaN(saved)) {
        requestAnimationFrame(() => {
          node.scrollTop = saved
        })
      }
    } catch {
      /* ignore */
    }
  }, [pathname])

  const userInitial = String(user?.name || user?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase()

  const persistNavScroll = () => {
    const node = navScrollRef.current
    if (!node) return
    try {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(node.scrollTop))
    } catch {
      /* ignore */
    }
  }

  return (
    <SlideProvider>
      <div className={`sms-root ${navOpen ? 'nav-open' : ''}`}>
        <button
          type="button"
          className={`sms-nav-backdrop ${navOpen ? 'is-open' : ''}`}
          aria-label="Close navigation"
          tabIndex={navOpen ? 0 : -1}
          onClick={() => setNavOpen(false)}
        />

        <aside className={`sms-sidebar ${navOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          <div className="sms-sidebar-top">
            <div className="sms-brand">
              <div className="sms-brand-mark" aria-hidden>
                SMS
              </div>
              <div>
                <p className="sms-brand-title">SMS</p>
                <p className="sms-brand-role">{roleLabel(role)}</p>
              </div>
            </div>
            <button type="button" className="sms-nav-close" aria-label="Close menu" onClick={() => setNavOpen(false)}>
              ✕
            </button>
          </div>

          <div className="sms-nav-scroll" ref={navScrollRef}>
            <nav className="sms-nav" aria-label="Modules">
              {navSections.map((section) => (
                <div key={section.title} className="sms-nav-group">
                  <p className="sms-nav-heading">
                    <span className="sms-nav-heading-icon" aria-hidden>
                      {section.icon}
                    </span>
                    {section.title}
                  </p>
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `sms-nav-link ${isActive ? 'active' : ''}`}
                      onClick={persistNavScroll}
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
            <p className="sms-sidebar-card-label">Signed in</p>
            <p className="sms-sidebar-card-value">{user?.name || user?.email || 'Guest'}</p>
            <NavLink to={homePath} className="sms-sidebar-link">
              Role home
            </NavLink>
            <NavLink to="/settings/profile" className="sms-sidebar-link">
              Profile
            </NavLink>
            <NavLink to="/settings/logout" className="sms-sidebar-link">
              Logout
            </NavLink>
          </div>
        </aside>

        <div className="sms-main">
          <header className="sms-topbar">
            <div className="sms-topbar-lead">
              <button
                type="button"
                className="sms-menu-btn"
                aria-label="Open navigation"
                aria-expanded={navOpen}
                onClick={() => setNavOpen(true)}
              >
                <span />
                <span />
                <span />
              </button>
              <div className="sms-topbar-titles">
                <p className="sms-topbar-eyebrow">Today · {today}</p>
                <h1 className="sms-topbar-title">{subtitle}</h1>
                <div className="sms-topbar-pills">
                  <span className="sms-topbar-pill-item">{roleLabel(role)}</span>
                  <span className="sms-topbar-pill-item sms-topbar-pill-item--desktop">Campus online</span>
                  <span className="sms-topbar-pill-item sms-topbar-pill-item--desktop">Secure session</span>
                </div>
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
                  placeholder="Search records..."
                  aria-label="Global search"
                  autoComplete="off"
                  inputMode="search"
                />
              </div>
              <div className="sms-topbar-actions">
                <span className="sms-sync-badge">Live</span>
                {quickActions.map((action) => (
                  <Link key={action.to} to={action.to} className="sms-topbar-link">
                    {action.label}
                  </Link>
                ))}
              </div>
              <div className="sms-notify" title="Notifications">
                <span className="sms-notify-dot" />
                <span className="sms-notify-label">Alerts</span>
              </div>
              <Link to="/settings/profile" className="sms-user" aria-label="Open profile">
                <div className="sms-user-avatar" aria-hidden>
                  {user?.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                    />
                  ) : (
                    userInitial
                  )}
                </div>
                <div className="sms-user-meta">
                  <p className="sms-user-name">{user?.name || user?.username || 'User'}</p>
                  <p className="sms-user-role">{roleLabel(role)}</p>
                </div>
              </Link>
            </div>
          </header>

          <main className="sms-outlet">
            <div key={location.key} className={`sms-route-panel ${routeVisible ? 'is-visible' : ''}`}>
              <Outlet />
            </div>
          </main>

          <nav className="sms-mobile-dock" aria-label="Quick navigation">
            {mobileDock.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sms-mobile-dock__item ${isActive ? 'is-active' : ''}`}
              >
                <span aria-hidden>{item.icon}</span>
                <em>{item.label}</em>
              </NavLink>
            ))}
            <button type="button" className="sms-mobile-dock__item" onClick={() => setNavOpen(true)}>
              <span aria-hidden>☰</span>
              <em>Menu</em>
            </button>
          </nav>
        </div>
      </div>
    </SlideProvider>
  )
}

export default AppShell
