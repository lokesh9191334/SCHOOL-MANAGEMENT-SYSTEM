import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession } from '../../services/auth'

const LogoutPage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    clearSession()
    const t = setTimeout(() => navigate('/auth/login', { replace: true }), 400)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="page-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #4157ff, #7c8cff)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: '800',
        boxShadow: '0 10px 22px rgba(65, 87, 255, 0.22)',
      }}>↩</div>
      <h3 style={{ margin: 0, color: '#111b33', fontSize: '20px', fontWeight: '800' }}>Signing you out…</h3>
      <p style={{ margin: 0, color: '#7f8ba5', fontSize: '0.92rem' }}>Clearing your session and returning to the login screen.</p>
    </div>
  )
}

export default LogoutPage
