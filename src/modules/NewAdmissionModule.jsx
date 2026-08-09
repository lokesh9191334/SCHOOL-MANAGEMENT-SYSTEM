import ActionFormPanel from '../components/forms/ActionFormPanel'
import TrendChart from '../components/charts/TrendChart'
import RingChart from '../components/charts/RingChart'

function NewAdmissionModule({
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
      <div className="admin-header">
        <div className="header-left">
          <h2>{module.title}</h2>
          <p>{module.subtitle}</p>
        </div>
        <div className="header-actions">
          {module.actions.map((action) => (
            <button
              key={action}
              type="button"
              className="header-action"
              onClick={() => onActionClick(action)}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="content-grid">
        {module.stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
            <p className="stat-note">{stat.note}</p>
          </article>
        ))}
      </div>

      <div className="content-grid">
        <article className="panel-card data-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Admission Records</p>
              <h3>New Applications</h3>
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
              type="text"
              placeholder="Search admissions..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="record-table">
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
              <p className="empty-state">No admission records found. Create a new admission draft to get started!</p>
            )}
          </div>
        </article>

        <div className="side-stack">
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

          <article className="panel-card info-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Enabled Features</p>
                <h3>Admission Workflow</h3>
              </div>
            </div>
            <ul className="feature-list">
              {module.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>

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
                  <strong>Form Creation</strong>
                  <p>Admission forms can be created and saved as drafts.</p>
                </div>
              </div>
              <div className="validation-item">
                <span className="validation-badge success">OK</span>
                <div>
                  <strong>Document Upload</strong>
                  <p>CNIC/B-Form upload status can be tracked.</p>
                </div>
              </div>
              <div className="validation-item">
                <span className="validation-badge success">OK</span>
                <div>
                  <strong>Roll Number Assign</strong>
                  <p>Roll numbers can be assigned to approved applicants.</p>
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
        </div>
      </div>

      <section className="bottom-grid">
        <article className="panel-card trend-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Analytics</p>
              <h3>{module.trendLabel}</h3>
            </div>
            <span className="trend-badge">Updated Live</span>
          </div>
          <TrendChart />
        </article>

        <article className="panel-card automation-panel">
          <div className="panel-header compact">
            <div>
              <p className="panel-kicker">Automation</p>
              <h3>Readiness & Checklist</h3>
            </div>
          </div>

          <RingChart totalText={module.ring.total} subtitle={module.ring.subtitle} />

          <ul className="check-list">
            {module.checklist.map((item) => (
              <li key={item}>
                <span className="check-icon">+</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  )
}

export default NewAdmissionModule
