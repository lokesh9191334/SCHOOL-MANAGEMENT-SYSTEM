import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAuthToken, getAuthUser } from '../utils/session'

/** Protects ERP routes — guests go to login */
export default function RequireAuth() {
  const location = useLocation()
  const user = getAuthUser()
  const token = getAuthToken()

  if (!user || !token) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
