import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homePathForRole, navForRole } from '../data/roleNav'
import { getAuthToken, getAuthUser } from '../utils/session'

/** Protects ERP routes — guests go to login */
export default function RequireAuth() {
  const location = useLocation()
  const user = getAuthUser()
  const token = getAuthToken()

  if (!user || !token) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  const role = String(user.role || 'admin').toLowerCase()
  const allowedPaths = navForRole(role).flatMap((section) => section.items.map((item) => item.to))
  const sharedPaths = ['/ai-assistant', '/settings/profile', '/settings/logout']
  const legacyRootPaths = role === 'admin' ? ['/dashboard', '/students', '/teachers', '/attendance', '/examination', '/fees', '/transport', '/library'] : []
  const canAccess = [...allowedPaths, ...sharedPaths, ...legacyRootPaths].some(
    (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
  )

  if (!canAccess) {
    return <Navigate to={homePathForRole(role)} replace />
  }

  return <Outlet />
}
