import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiAuthHeaders } from '../../services/apiAuth'
import './RoleHome.css'

const cards = [
  { to: '/super-admin/school-requests', label: 'Approval requests', note: 'Verify school admin accounts & assign plans', tone: 'a' },
  { to: '/security/login-tracks', label: 'Login tracks', note: 'Device, GPS & sign-in security audit', tone: 'b' },
  { to: '/fees/online-payments', label: 'Payment verification', note: 'Review parent UTR submissions', tone: 'c' },
  { to: '/ai-assistant', label: 'AI assistant', note: 'Ask questions across your live data', tone: 'a' },
]

export default function SuperAdminHome() {
  const [requests, setRequests] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/school-requests', { headers: getApiAuthHeaders() })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return
        setRequests(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load approval stats.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const pending = requests.filter((request) => request.status === 'Pending').length
  const approved = requests.filter((request) => request.status === 'Approved').length

  return (
    <div className="role-home">
      <header className="role-home__hero role-home__hero--platform">
        <div>
          <p className="admin-kicker">Super Admin</p>
          <h2>Platform command center</h2>
          <p>Approve school signups, audit sign-ins and verify payments — every number below reads live data.</p>
        </div>
        <div className="role-home__metrics">
          <article><strong>{loadError ? '—' : pending}</strong><span>Pending approvals</span></article>
          <article><strong>{loadError ? '—' : approved}</strong><span>Approved schools</span></article>
          <article><strong>{loadError ? '—' : requests.length}</strong><span>Total requests</span></article>
        </div>
      </header>

      <section className="role-home__grid">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className={`role-home__card tone-${card.tone}`}>
            <h3>{card.label}</h3>
            <p>{card.note}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
