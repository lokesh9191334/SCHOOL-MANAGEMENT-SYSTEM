import React from 'react';
import ActionFormPanel from '../components/forms/ActionFormPanel';
import TrendChart from '../components/charts/TrendChart';
import RingChart from '../components/charts/RingChart';

function EnrollmentsModule({
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
      <section className="content-grid">
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
            <div className="panel-content">
              {module.rows.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {module.columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((row) => (
                        <tr
                          key={row.subtitle}
                          className={selectedRecordKey === row.subtitle ? 'selected' : ''}
                          onClick={() => setSelectedRecordKey(row.subtitle)}
                        >
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
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No records available. Use the forms to add new data.</p>
                </div>
              )}
            </div>
          </div>
        </article>
        <div className="side-stack">
          <ActionFormPanel
            activeAction={activeAction}
            actionConfig={actionConfig}
            formValues={formValues}
            onFieldChange={onFieldChange}
            onFormSubmit={onFormSubmit}
            onFormReset={onFormReset}
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
      </section>
      <section className="bottom-grid">
        <article className="panel-card trend-panel">
          <div className="panel-header">
            <h3>{module.trendLabel}</h3>
          </div>
          <div className="panel-content">
            <TrendChart />
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
  );
}

export default EnrollmentsModule;
