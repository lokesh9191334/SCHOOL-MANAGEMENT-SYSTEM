import ActionFormPanel from '../components/forms/ActionFormPanel'

function StudentProfilesModule({
  module,
  onActionClick,
  systemMessage,
  selectedRecord,
  notificationsEnabled,
  activeAction,
  actionConfig,
  formValues,
  onFieldChange,
  onFormSubmit,
  onFormReset,
  onActionSelect,
}) {
  return (
    <>
      <section className="profile-overview-grid">
        {module.classProfiles.map((item) => (
          <article className="panel-card class-profile-card" key={item.className}>
            <div className="class-profile-top">
              <div>
                <p className="panel-kicker">Class Wise Profile</p>
                <h3>{item.className}</h3>
                <p className="class-profile-meta">Sections: {item.sections}</p>
              </div>
              <span className={`status-pill ${item.tone}`}>{item.status}</span>
            </div>

            <div className="class-profile-count">
              <strong>{item.totalProfiles}</strong>
              <span>profiles available</span>
            </div>

            <ul className="class-profile-list">
              {item.items.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="content-grid profile-content-grid">
        <article className="panel-card data-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Profile Builder</p>
              <h3>Professional Student Profile Elements</h3>
            </div>
            <div className="panel-actions">
              {module.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="small-action"
                  onClick={() => onActionClick(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div className="profile-elements-grid">
            {module.profileSections.map((section) => (
              <article className="profile-element-card" key={section.title}>
                <h4>{section.title}</h4>
                <p>{section.detail}</p>
              </article>
            ))}
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
                <h3>Profile Functions</h3>
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
                <h3>Profile Module Check</h3>
              </div>
            </div>

            <div className="validation-grid">
              <div className="validation-item">
                <span className="validation-badge success">OK</span>
                <div>
                  <strong>Class Wise Layout</strong>
                  <p>Profiles ab class groups ke hisaab se professionally organized hain.</p>
                </div>
              </div>
              <div className="validation-item">
                <span className="validation-badge success">OK</span>
                <div>
                  <strong>Profile Elements</strong>
                  <p>Basic info, guardian, academic, medical, documents aur actions blocks add hain.</p>
                </div>
              </div>
              <div className="validation-item">
                <span className="validation-badge success">OK</span>
                <div>
                  <strong>Action Controls</strong>
                  <p>Open profile, upload documents aur generate PDF buttons wired hain.</p>
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
      </section>
    </>
  )
}

export default StudentProfilesModule
