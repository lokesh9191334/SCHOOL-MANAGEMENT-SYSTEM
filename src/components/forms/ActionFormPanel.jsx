function ActionFormPanel({
  moduleTitle = 'This module',
  activeAction,
  actionConfig,
  config: legacyConfig,
  formValues,
  onFieldChange,
  onFormSubmit,
  onFormReset,
  onSubmit,
  onReset,
  onActionSelect,
  actions = [],
}) {
  const config = actionConfig ?? legacyConfig
  const handleSubmit = onFormSubmit ?? onSubmit
  const handleReset = onFormReset ?? onReset
  if (!config || !config.fields) {
    return null
  }

  return (
    <article className="panel-card form-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Working form</p>
          <h3>{config.title}</h3>
          <p className="form-helper">
            Select an action tab, then complete the fields below. Changes apply to {moduleTitle}.
          </p>
        </div>
      </div>

      <div className="action-tabs">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className={activeAction === action ? 'action-tab active' : 'action-tab'}
            onClick={() => onActionSelect(action)}
          >
            {action}
          </button>
        ))}
      </div>

      <form
        className="module-form"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit?.(e)
        }}
      >
        <div className="module-form-grid">
          {config.fields.map((field) => (
            <label
              key={field.name}
              className={field.type === 'textarea' ? 'form-field full-width' : 'form-field'}
            >
              <span>{field.label}</span>
              {field.type === 'select' ? (
                <select
                  value={formValues[field.name] ?? ''}
                  onChange={(event) => onFieldChange(field.name, event.target.value)}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={formValues[field.name] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) => onFieldChange(field.name, event.target.value)}
                  rows={4}
                />
              ) : (
                <input
                  type={field.type}
                  value={formValues[field.name] ?? ''}
                  placeholder={field.placeholder}
                  onChange={(event) => onFieldChange(field.name, event.target.value)}
                />
              )}
            </label>
          ))}
        </div>

        <div className="form-actions">
          <button type="submit" className="header-action primary">
            {config.submitLabel}
          </button>
          <button type="button" className="header-action ghost" onClick={handleReset}>
            Reset form
          </button>
        </div>
      </form>
    </article>
  )
}

export default ActionFormPanel
