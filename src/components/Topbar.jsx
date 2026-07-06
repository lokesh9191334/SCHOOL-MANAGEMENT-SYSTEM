import './Topbar.css'

const Topbar = ({ title = 'Dashboard', onToggleSidebar, disableToggle = false }) => {
  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {!disableToggle && (
          <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
            ☰
          </button>
        )}
        <div>
          <h3>{title}</h3>
          <p className="muted">Overview & quick actions</p>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-search">
          <input type="search" placeholder="Search students, modules..." />
        </div>
        <button type="button" className="icon-btn">🔔</button>
        <div className="profile-pill">
          <div className="avatar">AM</div>
          <div className="profile-info">
            <strong>Ayesha</strong>
            <small>Principal</small>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Topbar
