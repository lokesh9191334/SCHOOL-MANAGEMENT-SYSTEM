import { Link } from 'react-router-dom'

const TransportPage = () => {
  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Logistics</p>
        <h2>Transport command</h2>
        <p>GPS-ready route planning, fleet compliance and guardian SMS alerts for delays.</p>
        <div className="link-row">
          <Link className="link-pill" to="/transport/routes">
            Routes
          </Link>
          <Link className="link-pill" to="/transport/drivers">
            Drivers
          </Link>
          <Link className="link-pill" to="/students">
            Rider roster
          </Link>
        </div>
      </div>
      <div className="content-grid">
        <article className="stat-card">
          <span>Active buses</span>
          <strong>14</strong>
          <p className="stat-note">Morning shift</p>
        </article>
        <article className="stat-card">
          <span>Routes</span>
          <strong>22</strong>
          <p className="stat-note">Optimised</p>
        </article>
        <article className="stat-card">
          <span>On-time</span>
          <strong>97%</strong>
          <p className="stat-note">Last 30 days</p>
        </article>
      </div>
    </div>
  )
}

export default TransportPage
