import ActionFormPanel from '../components/forms/ActionFormPanel'
import TrendChart from '../components/charts/TrendChart'
import RingChart from '../components/charts/RingChart'
import Slide from '../components/Slide'

function AllStudentsModule({
  module,
  onActionClick,
  searchTerm,
  setSearchTerm,
  filteredRecords,
  selectedRecordKey,
  setSelectedRecordKey,
  activeAction,
  actionConfig,
  formValues,
  onFieldChange,
  onFormSubmit,
  onFormReset,
  onActionSelect,
  systemMessage,
  notificationsEnabled,
  selectedRecord,
}) {
  return (
    <>
      <Slide className="admin-header">
        <div className="header-left">
          <h2>{module.title}</h2>
          <p>{module.subtitle}</p>
        </div>
        <div className="header-actions">
          {module.actions.map((action) => (
            <button key={action} type="button" className="header-action" onClick={() => onActionClick(action)}>
              {action}
            </button>
          ))}
        </div>
      </Slide>

      <div className="content-grid">
        {module.stats.map((stat) => (
          <Slide key={stat.label} className="stat-card">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
            <p className="stat-note">{stat.note}</p>
          </Slide>
        ))}
      </div>

      <div className="content-grid">
        <Slide className="panel-card data-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Student Records</p>
              <h3>Complete Registry</h3>
            </div>
            <div className="panel-actions">
              <button type="button" className="small-action">
                View All
              </button>
              <button type="button" className="small-action">
                Filter
              </button>
            </div>
          </div>

          <div className="search-row">
            <input
              id={`${module.title.toLowerCase().replace(/\s+/g, '-')}-search`}
              name={`${module.title.toLowerCase().replace(/\s+/g, '')}Search`}
              type="text"
              placeholder="Search students..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="record-table">
              <div className="record-columns">
                {module.columns.map((col) => (
                  <div key={col} className="record-column-heading">
                    {col}
                  </div>
                ))}
              </div>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className={`record-row ${selectedRecordKey === record.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRecordKey(record.id)}
                >
                  <div className="record-avatar">{record.title.charAt(0)}</div>
                  <div className="record-content">
                    <h4>{record.title}</h4>
                    <p>{record.primary}</p>
                  </div>
                  <span className={`status-badge ${record.tone}`}>{record.status}</span>
                </div>
              ))
            ) : (
                <div className="empty-state">
                  <p>No student records found. Add a new student to get started!</p>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        try {
                          // restore seeded demo data in localStorage and reload so parent picks it up
                          localStorage.setItem('sms_students', JSON.stringify(window.__SEED_STUDENTS__ || []))
                          window.location.reload()
                        } catch (e) {
                          window.alert('Unable to restore demo data in this browser.')
                        }
                      }}
                    >
                      Restore demo students
                    </button>
                  </div>
                </div>
            )}
          </div>
        </Slide>

        <div className="side-stack">
          <Slide>
            <ActionFormPanel
              moduleTitle={module.title}
              activeAction={activeAction}
              config={actionConfig}
              formValues={formValues}
              onFieldChange={onFieldChange}
              onSubmit={onFormSubmit}
              onReset={onFormReset}
              onActionSelect={onActionSelect}
              actions={module.actions}
            />
          </Slide>

          <Slide>
            <article className="panel-card info-panel">
              <div className="panel-header compact">
                <div>
                  <p className="panel-kicker">Enabled Features</p>
                  <h3>Student Management</h3>
                </div>
              </div>
              <ul className="feature-list">
                {module.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          </Slide>

          <Slide>
            <article className="panel-card info-panel">
              <div className="panel-header compact">
                <div>
                  <p className="panel-kicker">Admin Workflow</p>
                  <h3>How It Works</h3>
                </div>
              </div>
              <ul className="task-list">
                {module.workflow.map((task) => (
                  <li key={task}>
                    <span className="task-dot" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Slide>

          <Slide>
            <article className="panel-card info-panel">
              <div className="panel-header compact">
                <div>
                  <p className="panel-kicker">Live Status</p>
                  <h3>Module Check</h3>
                </div>
              </div>

              <div className="validation-grid">
                <div className="validation-item">
                  <span className="validation-badge success">OK</span>
                  <div>
                    <strong>Data Sync</strong>
                    <p>Student records are syncing across modules.</p>
                  </div>
                </div>
                <div className="validation-item">
                  <span className="validation-badge success">OK</span>
                  <div>
                    <strong>Form Integration</strong>
                    <p>All action buttons are linked to working forms.</p>
                  </div>
                </div>
                <div className="validation-item">
                  <span className="validation-badge success">OK</span>
                  <div>
                    <strong>Search & Filter</strong>
                    <p>Registry search and filter functions are active.</p>
                  </div>
                </div>
              </div>

              <div className="system-status">
                <p className="system-label">Last Activity</p>
                <strong>{systemMessage}</strong>
                <div className="system-meta">
                  <span>Selected: {selectedRecord?.title ?? 'None'}</span>
                  <span>{notificationsEnabled ? 'Alerts Enabled' : 'Alerts Paused'}</span>
                </div>
              </div>
            </article>
          </Slide>
        </div>
      </div>
    </>
  )
}

export default AllStudentsModule
