import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { homePathForRole, navForRole, quickActionsForRole, titleFromRoleNav } from '../data/roleNav'
import { getAuthUser, roleLabel } from '../utils/session'
import { useI18n } from '../i18n/I18nContext'
import { fetchTracksSummary } from '../services/loginTracks'
import NavGlyph from './NavGlyph'
import './AppShell.css'
import SlideProvider from '../context/SlideContext'

const SIDEBAR_SCROLL_KEY = 'sms_sidebar_scroll_top'
const NOTIFY_STORAGE_KEY = 'sms_notify_enabled'

const AppShell = () => {
  const location = useLocation()
  const { pathname } = location
  const { t, locale } = useI18n()
  const [user, setUser] = useState(() => getAuthUser())
  const [routeVisible, setRouteVisible] = useState(true)
  const [navOpen, setNavOpen] = useState(false)
  const [securityAlerts, setSecurityAlerts] = useState(0)
  const [notifyOn, setNotifyOn] = useState(() => {
    try {
      return localStorage.getItem(NOTIFY_STORAGE_KEY) !== 'off'
    } catch {
      return true
    }
  })
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
  const canSeeSecurity = role === 'admin' || role === 'super_admin'

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
      ? new Intl.DateTimeFormat(locale, {
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

  useEffect(() => {
    if (!canSeeSecurity || !notifyOn) return undefined
    let disposed = false
    const load = async () => {
      try {
        const summary = await fetchTracksSummary()
        if (!disposed) setSecurityAlerts(Number(summary?.suspiciousUnreviewed) || 0)
      } catch {
        /* badge is best-effort — never block the shell */
      }
    }
    load()
    const timer = window.setInterval(() => {
      if (!document.hidden) load()
    }, 60000)
    return () => {
      disposed = true
      window.clearInterval(timer)
    }
  }, [canSeeSecurity, notifyOn, pathname])

  const setNotifications = (next) => {
    setNotifyOn(next)
    try {
      localStorage.setItem(NOTIFY_STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const sync = () => {
      try {
        setNotifyOn(localStorage.getItem(NOTIFY_STORAGE_KEY) !== 'off')
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('sms:notify-preference', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('sms:notify-preference', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

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
          aria-label={t('Close navigation')}
          tabIndex={navOpen ? 0 : -1}
          onClick={() => setNavOpen(false)}
        />

        <aside className={`sms-sidebar ${navOpen ? 'is-open' : ''}`} aria-label={t('Main navigation')}>
          <div className="sms-sidebar-top">
            <div className="sms-brand">
              <div className="sms-brand-mark" aria-hidden>
                {userInitial}
              </div>
              <div>
                <p className="sms-brand-title">SMS</p>
                <p className="sms-brand-role">{t(roleLabel(role))}</p>
              </div>
            </div>
            <button type="button" className="sms-nav-close" aria-label={t('Close menu')} onClick={() => setNavOpen(false)}>
              ✕
            </button>
          </div>

          <div className="sms-nav-scroll" ref={navScrollRef}>
            <nav className="sms-nav" aria-label={t('Modules')}>
              {navSections.map((section) => (
                <div key={section.title} className="sms-nav-group">
                  <p className="sms-nav-heading">
                    <span className="sms-nav-heading-icon" aria-hidden>
                      <NavGlyph name={section.icon} size={13} />
                    </span>
                    {t(section.title)}
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
                        <NavGlyph name={item.icon} size={16} />
                      </span>
                      <span>{t(item.label)}</span>
                      {item.to === '/security/login-tracks' && notifyOn && securityAlerts > 0 ? (
                        <span className="sms-nav-badge">{securityAlerts}</span>
                      ) : null}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </div>

        </aside>

        <div className="sms-main">
          <header className="sms-topbar">
            <div className="sms-topbar-lead">
              <button
                type="button"
                className="sms-menu-btn"
                aria-label={t('Open navigation')}
                aria-expanded={navOpen}
                onClick={() => setNavOpen(true)}
              >
                <span />
                <span />
                <span />
              </button>
              <div className="sms-topbar-titles">
                <p className="sms-topbar-eyebrow">{t('Today')} · {today}</p>
                <h1 className="sms-topbar-title">{t(subtitle)}</h1>
                <div className="sms-topbar-pills">
                  <span className="sms-topbar-pill-item">{t(roleLabel(role))}</span>
                  <span className="sms-topbar-pill-item sms-topbar-pill-item--desktop">{t('Campus online')}</span>
                  <span className="sms-topbar-pill-item sms-topbar-pill-item--desktop">{t('Secure session')}</span>
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
                  placeholder={t('Search records...')}
                  aria-label={t('Global search')}
                  autoComplete="off"
                  inputMode="search"
                />
              </div>
              <div className="sms-topbar-actions">
                <span className="sms-sync-badge">{t('Live')}</span>
                {quickActions.map((action) => (
                  <Link key={action.to} to={action.to} className="sms-topbar-link">
                    {t(action.label)}
                  </Link>
                ))}
              </div>
              <div
                className={`sms-notify-toggle ${notifyOn ? 'is-on' : 'is-off'}`}
                role="group"
                aria-label={t('Notification alerts')}
              >
                <span className="sms-notify-thumb" aria-hidden />
                <button
                  type="button"
                  className={`sms-notify-option ${notifyOn ? '' : 'is-active'}`}
                  aria-pressed={!notifyOn}
                  title={t('Turn notifications off')}
                  onClick={() => setNotifications(false)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
                    <path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    <path d="m2 2 20 20" />
                  </svg>
                  <span>{t('Off')}</span>
                </button>
                <button
                  type="button"
                  className={`sms-notify-option ${notifyOn ? 'is-active' : ''}`}
                  aria-pressed={notifyOn}
                  title={
                    canSeeSecurity && securityAlerts > 0
                      ? `${securityAlerts} ${t('unreviewed login alerts')}`
                      : t('Turn notifications on')
                  }
                  onClick={() => setNotifications(true)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                  <span>{t('On')}</span>
                  {notifyOn && canSeeSecurity && securityAlerts > 0 ? (
                    <span className="sms-notify-count">{securityAlerts}</span>
                  ) : null}
                </button>
              </div>
              <Link to="/settings/profile" className="sms-user" aria-label={t('Open profile')}>
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
                  <p className="sms-user-name">{user?.name || user?.username || t('User')}</p>
                  <p className="sms-user-role">{t(roleLabel(role))}</p>
                </div>
              </Link>
            </div>
          </header>

          <main className="sms-outlet">
            <div key={location.key} className={`sms-route-panel ${routeVisible ? 'is-visible' : ''}`}>
              <Outlet />
            </div>
          </main>

          <nav className="sms-mobile-dock" aria-label={t('Quick navigation')}>
            {mobileDock.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sms-mobile-dock__item ${isActive ? 'is-active' : ''}`}
              >
                <span aria-hidden>
                  <NavGlyph name={item.icon} size={18} />
                </span>
                <em>{t(item.label)}</em>
              </NavLink>
            ))}
            <button type="button" className="sms-mobile-dock__item" onClick={() => setNavOpen(true)}>
              <span aria-hidden>
                <NavGlyph name="rows" size={18} />
              </span>
              <em>{t('Menu')}</em>
            </button>
          </nav>
        </div>
      </div>
    </SlideProvider>
  )
}

export default AppShell
