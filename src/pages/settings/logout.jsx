import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession } from '../../services/auth'
import './LogoutPage.css'

const LogoutPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    clearSession()
    try {
      sessionStorage.removeItem('sms_sidebar_scroll_top')
    } catch {
      /* ignore */
    }
    navigate('/auth/login', { replace: true })
  }, [navigate])

  return (
    <div className="logout-page">
      <div className="logout-card">
        <p className="admin-kicker">Session</p>
        <h2>Signing you out…</h2>
        <p>Clearing secure session and returning to the login panel.</p>
      </div>
    </div>
  )
}

export default LogoutPage
