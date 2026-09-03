import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getModuleConfig } from '../../data/moduleRegistry'
import { usePersistentState } from '../../hooks/usePersistentState'
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
  const schoolsConfig = getModuleConfig('/super-admin/schools')
  const subscriptionsConfig = getModuleConfig('/super-admin/subscriptions')
  const ticketsConfig = getModuleConfig('/super-admin/tickets')
  const [schools] = usePersistentState(schoolsConfig.storageKey, schoolsConfig.seed)
  const [subscriptions] = usePersistentState(subscriptionsConfig.storageKey, subscriptionsConfig.seed)
  const [tickets] = usePersistentState(ticketsConfig.storageKey, ticketsConfig.seed)
  const liveSchools = schools.filter((school) => ['Live', 'Trial'].includes(school.status)).length
  const recurringRevenue = useMemo(
    () => subscriptions.reduce((total, subscription) => total + Number(String(subscription.amount || subscription.mrr || 0).replace(/[^0-9.-]/g, '')), 0),
    [subscriptions],
  )
  const openTickets = tickets.filter((ticket) => !['Resolved', 'Closed'].includes(ticket.status)).length

  return (
    <div className="role-home">
      <header className="role-home__hero role-home__hero--platform">
        <div>
          <p className="admin-kicker">Super Admin</p>
          <h2>Platform command center</h2>
          <p>Schools, subscriptions, plans, analytics and support — no campus ERP noise.</p>
        </div>
        <div className="role-home__metrics">
          <article><strong>{liveSchools}</strong><span>Live schools</span></article>
          <article><strong>₹{recurringRevenue.toLocaleString('en-IN')}</strong><span>MRR tracked</span></article>
          <article><strong>{openTickets}</strong><span>Open tickets</span></article>
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
