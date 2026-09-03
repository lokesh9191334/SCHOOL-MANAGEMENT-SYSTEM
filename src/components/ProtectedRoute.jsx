import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { clearSession } from '../services/auth'

const isSessionValid = () => {
  try {
    const token = localStorage.getItem('auth_token')
    const userRaw = localStorage.getItem('auth_user')
    if (!token || !userRaw) {
      clearSession()
      return false
    }
    JSON.parse(userRaw)
    return true
  } catch {
    clearSession()
    return false
  }
}

const ProtectedRoute = () => {
  const location = useLocation()
  const valid = isSessionValid()

  if (!valid) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute
