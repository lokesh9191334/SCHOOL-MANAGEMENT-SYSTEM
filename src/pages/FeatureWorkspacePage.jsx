import { Link } from 'react-router-dom'

const FeatureWorkspacePage = ({
  kicker = 'Workspace',
  title,
  description,
  actions = [],
  metrics = [],
  highlights = [],
  checklist = [],
}) => {
  return (
    <div className="sms-page-stack">
      <div className="page-hero">
        <section className="page-card">
          <p className="admin-kicker">{kicker}</p>
          <h2>{title}</h2>
          <p>{description}</p>
          <div className="link-row">
            {actions.map((action) =>
              action.to ? (
                <Link key={action.label} className="link-pill" to={action.to}>
                  {action.label}
                </Link>
              ) : (
                <span key={action.label} className="link-pill">
                  {action.label}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="page-card executive-pulse-card">
          <p className="admin-kicker">Feature Summary</p>
          <div className="executive-pulse-grid">
            {metrics.map((metric) => (
              <article key={metric.label} className="executive-mini-stat">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.note}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="operations-grid">
        <section className="premium-panel">
          <div className="premium-panel-header compact">
            <div>
              <p className="panel-kicker">Professional Highlights</p>
              <h3>What this module covers</h3>
            </div>
          </div>
          <div className="activity-list">
            {highlights.map((item) => (
              <article key={item.title} className="activity-item">
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="premium-panel">
          <div className="premium-panel-header compact">
            <div>
              <p className="panel-kicker">Admin Checklist</p>
              <h3>Suggested workflow</h3>
            </div>
          </div>
          <ul className="leadership-list">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default FeatureWorkspacePage
