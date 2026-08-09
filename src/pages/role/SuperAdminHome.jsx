import { Link } from 'react-router-dom'
import './RoleHome.css'

const cards = [
  { to: '/super-admin/schools', label: 'Add schools', note: 'Onboard campuses & plans', tone: 'a' },
  { to: '/super-admin/schools/suspend', label: 'Suspend schools', note: 'Compliance & billing holds', tone: 'b' },
  { to: '/super-admin/subscriptions', label: 'Subscriptions', note: 'MRR, seats, renewals', tone: 'c' },
  { to: '/super-admin/plans', label: 'Manage plans', note: 'Starter · Growth · Enterprise', tone: 'a' },
  { to: '/super-admin/plans/monitor', label: 'Monitor plans', note: 'Upgrades & churn radar', tone: 'b' },
  { to: '/super-admin/analytics', label: 'Analytics', note: 'Platform KPIs', tone: 'c' },
  { to: '/super-admin/tickets', label: 'Support tickets', note: 'SLA triage desk', tone: 'a' },
]

export default function SuperAdminHome() {
  return (
    <div className="role-home">
      <header className="role-home__hero role-home__hero--platform">
        <div>
          <p className="admin-kicker">Super Admin</p>
          <h2>Platform command center</h2>
          <p>Schools, subscriptions, plans, analytics and support — no campus ERP noise.</p>
        </div>
        <div className="role-home__metrics">
          <article><strong>81</strong><span>Live schools</span></article>
          <article><strong>₹24.8L</strong><span>MRR</span></article>
          <article><strong>19</strong><span>Open tickets</span></article>
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
