import React from 'react'
import ActionFormPanel from '../components/forms/ActionFormPanel'
import TrendChart from '../components/charts/TrendChart'
import RingChart from '../components/charts/RingChart'
import GenderChart from '../components/charts/GenderChart'

function AttendanceModule({
  module, onActionClick, searchTerm, setSearchTerm, filteredRecords,
  selectedRecordKey, setSelectedRecordKey, activeAction, actionConfig,
  formValues, onFieldChange, onFormSubmit, onFormReset, onActionSelect,
  systemMessage, notificationsEnabled, selectedRecord, onBulkAction, onGenderFilter,
}) {
  const [selectedIds, setSelectedIds] = React.useState(new Set())

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = (visibleRows) => {
    setSelectedIds(new Set(visibleRows.map((r) => r.id ?? r.subtitle)))
  }

  const clearSelection = () => setSelectedIds(new Set())

  const markSelected = (status) => {
    if (!onBulkAction) return
    onBulkAction(status, Array.from(selectedIds))
    clearSelection()
  }
  return (
    <>
      <div className="admin-header">
        <div>
          <p className="admin-kicker">Module</p>
          <h2>{module.title}</h2>
        </div>
        <div className="admin-actions">
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {module.actions.map((action) => (
            <button key={action} type="button" className="action-button" onClick={() => onActionClick(action)}>
              {action}
            </button>
          ))}
        </div>
      </div>
      <div className="content-grid">
        {module.stats.map((stat, index) => (
          <article key={index} className="panel-card stat-card">
            <div className="panel-header">
              <h3>{stat.label}</h3>
            </div>
            <div className="panel-content">
              <p className="stat-value">{stat.value}</p>
              <p className="stat-note">{stat.note}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="content-grid">
        <article className="panel-card data-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Module Workspace</p>
              <h3>{module.title} Records</h3>
            </div>
            <div className="panel-actions">
              {module.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="small-action"
                  onClick={() => onActionSelect(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-content">
            {module.rows.length > 0 ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <button type="button" className="small-action" onClick={() => selectAll(filteredRecords)}>
                      Select Visible
                    </button>
                    <button type="button" className="small-action" onClick={() => clearSelection()}>
                      Clear
                    </button>
                  </div>
                  <div>
                    <button type="button" className="small-action" onClick={() => markSelected('Present')}>
                      Mark Selected Present
                    </button>
                    <button type="button" className="small-action" onClick={() => markSelected('Absent')}>
                      Mark Selected Absent
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          <input type="checkbox" onChange={(e) => (e.target.checked ? selectAll(filteredRecords) : clearSelection())} />
                        </th>
                        {module.columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((row) => {
                        const key = row.id ?? row.subtitle
                        return (
                          <tr key={key} className={selectedRecordKey === key ? 'selected' : ''}>
                            <td>
                              <input type="checkbox" checked={selectedIds.has(key)} onChange={() => toggleSelect(key)} />
                            </td>
                            <td>
                              <div className="record-title">{row.title}</div>
                              <div className="record-subtitle">{row.subtitle}</div>
                            </td>
                            <td>{row.primary}</td>
                            <td>
                              <span className={`status-pill ${row.tone}`}>{row.status}</span>
                            </td>
                            <td>{row.owner}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No records available. Use the forms to add new data.</p>
              </div>
            )}
          </div>
        </article>
        <div className="side-stack">
          <ActionFormPanel
            moduleTitle={module.title}
            activeAction={activeAction}
            actionConfig={actionConfig}
            formValues={formValues}
            onFieldChange={onFieldChange}
            onFormSubmit={onFormSubmit}
            onFormReset={onFormReset}
            onActionSelect={onActionSelect}
            actions={module.actions}
            selectedRecord={selectedRecord}
          />
          <article className="panel-card info-panel">
            <div className="panel-header">
              <h3>Module Features</h3>
            </div>
            <div className="panel-content">
              <ul className="feature-list">
                {module.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          </article>
          <article className="panel-card info-panel">
            <div className="panel-header">
              <h3>Workflow Steps</h3>
            </div>
            <div className="panel-content">
              <ol className="workflow-list">
                {module.workflow.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </article>
          <article className="panel-card validation-grid">
            <div className="panel-header">
              <h3>Validation Status</h3>
            </div>
            <div className="panel-content">
              <div className="validation-item">
                <span className="validation-label">Data Integrity:</span>
                <span className="validation-status valid">Valid</span>
              </div>
              <div className="validation-item">
                <span className="validation-label">Schema Check:</span>
                <span className="validation-status valid">Passed</span>
              </div>
              <div className="validation-item">
                <span className="validation-label">Dependencies:</span>
                <span className="validation-status warning">Partial</span>
              </div>
            </div>
          </article>
          <article className="panel-card system-status">
            <div className="panel-header">
              <h3>System Status</h3>
            </div>
            <div className="panel-content">
              <p className="system-message">{systemMessage}</p>
              <div className="status-indicators">
                <span className={`status-indicator ${notificationsEnabled ? 'active' : ''}`}>
                  Notifications {notificationsEnabled ? 'On' : 'Off'}
                </span>
                <span className="status-indicator active">API Connected</span>
              </div>
            </div>
          </article>
        </div>
      </div>
      <section className="bottom-grid">
        <article className="panel-card trend-panel">
          <div className="panel-header">
            <h3>{module.trendLabel}</h3>
          </div>
          <div className="panel-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TrendChart seriesA={module.trendSeries || []} seriesB={module.trendSeriesAbsent || []} labels={module.trendLabels} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, background: '#7c6cff', borderRadius: 3, display: 'inline-block' }}></span>
                  Present
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, background: '#5ed6ca', borderRadius: 3, display: 'inline-block' }}></span>
                  Absent
                </span>
              </div>
            </div>
          </div>
        </article>
        <article className="panel-card automation-panel">
          <div className="panel-header">
            <h3>Automation Checklist</h3>
          </div>
          <div className="panel-content">
            <RingChart totalText={module.ring.total} subtitle={module.ring.subtitle} />
            <ul className="checklist">
              {module.checklist.map((item, index) => (
                <li key={index}>
                  <span className="checkbox checked"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>
    </>
  )
}

export default AttendanceModule
