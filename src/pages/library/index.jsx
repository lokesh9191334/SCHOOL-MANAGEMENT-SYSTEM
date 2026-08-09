import { Link } from 'react-router-dom'

const LibraryPage = () => {
  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Resources</p>
        <h2>Digital library</h2>
        <p>
          Catalogue lending, ISBN metadata, overdue notices and reading programmes. Wire this module to your library
          database when you graduate from the demo shell.
        </p>
        <div className="link-row">
          <Link className="link-pill" to="/students">
            Reader profiles
          </Link>
          <Link className="link-pill" to="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>
      <div className="content-grid">
        <article className="stat-card">
          <span>On loan</span>
          <strong>128</strong>
          <p className="stat-note">Demo metric</p>
        </article>
        <article className="stat-card">
          <span>Overdue</span>
          <strong>6</strong>
          <p className="stat-note">Needs reminder</p>
        </article>
        <article className="stat-card">
          <span>Titles</span>
          <strong>4.2k</strong>
          <p className="stat-note">Catalogued</p>
        </article>
      </div>
    </div>
  )
}

export default LibraryPage
