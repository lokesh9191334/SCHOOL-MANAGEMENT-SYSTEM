import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { notifyParentAttendance, resolveParentContact } from '../../services/parentNotify'
import { createInviteKey } from '../../services/inviteKeys'
import './PremiumWorkspace.css'

function toneForStatus(status, statusTones = {}) {
  if (statusTones[status]) return statusTones[status]
  const value = String(status || '').toLowerCase()
  if (['active', 'present', 'paid', 'issued', 'approved', 'printed', 'published', 'ready', 'online', 'cleared'].some((k) => value.includes(k))) {
    return 'success'
  }
  if (['pending', 'late', 'partial', 'draft', 'hold', 'due', 'review', 'scheduled'].some((k) => value.includes(k))) {
    return 'warning'
  }
  return 'muted'
}

function downloadCsv(filename, columns, rows) {
  const headers = columns.map((c) => c.label)
  const lines = rows.map((row) =>
    columns
      .map((col) => `"${String(row[col.key] ?? '').replaceAll('"', '""')}"`)
      .join(','),
  )
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function emptyForm(fields) {
  return Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? '']))
}

export default function PremiumWorkspace({ config }) {
  const {
    storageKey,
    section,
    title,
    description,
    idPrefix = 'REC',
    seed = [],
    columns = [],
    fields = [],
    statusKey = 'status',
    statusOptions = ['Active', 'Pending', 'Closed'],
    statusTones = {},
    links = [],
    features = [],
    createLabel = 'Add record',
    searchPlaceholder = 'Search records...',
  } = config

  const [rows, setRows] = usePersistentState(storageKey, seed)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(() => emptyForm(fields))
  const [toast, setToast] = useState('')
  const [autoNotifyParents, setAutoNotifyParents] = useState(Boolean(config.notifyParentsOnStatus))
  const [notifySms, setNotifySms] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [lastParentAlert, setLastParentAlert] = useState(null)
  const [issuedInvite, setIssuedInvite] = useState(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    setAutoNotifyParents(Boolean(config.notifyParentsOnStatus))
  }, [config.notifyParentsOnStatus, config.path])

  const stats = useMemo(() => {
    if (typeof config.computeStats === 'function') return config.computeStats(rows)
    const total = rows.length
    const byStatus = statusOptions.map((status) => ({
      label: status,
      value: rows.filter((row) => row[statusKey] === status).length,
      note: `${status} in ${title}`,
    }))
    return [{ label: 'Total', value: total, note: 'Records on file' }, ...byStatus.slice(0, 3)]
  }, [rows, config, statusOptions, statusKey, title])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows
      .filter((row) => {
        if (statusFilter !== 'All' && row[statusKey] !== statusFilter) return false
        if (!q) return true
        return columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q))
      })
      .sort((a, b) => String(a.title || a.name || a.id).localeCompare(String(b.title || b.name || b.id)))
  }, [rows, searchQuery, statusFilter, statusKey, columns])

  const selected = rows.find((row) => row.id === selectedId) ?? filtered[0] ?? null

  useEffect(() => {
    if (!selectedId && filtered[0]) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  const updateSelected = (patch, options = {}) => {
    if (!selected) return
    setRows((prev) => prev.map((row) => (row.id === selected.id ? { ...row, ...patch } : row)))
    if (!options.silentToast) setToast(options.toast || 'Record updated')
  }

  const dispatchParentAlert = async (row, status) => {
    if (!config.notifyParentsOnStatus || !autoNotifyParents) return null
    if (!notifySms && !notifyEmail) return null

    const alert = await notifyParentAttendance({
      studentName: row.title || row.name,
      status,
      className: row.className || row.group || '',
      date: row.date || new Date().toISOString().slice(0, 10),
      period: row.period || '',
      channels: { sms: notifySms, email: notifyEmail },
      openExternal: true,
      row,
    })
    setLastParentAlert(alert)
    return alert
  }

  const setStatus = async (status) => {
    if (!selected) return
    const previous = selected[statusKey]
    const nextRow = { ...selected, [statusKey]: status }
    updateSelected(
      {
        [statusKey]: status,
        tone: toneForStatus(status, statusTones),
        lastNotifiedAt: config.notifyParentsOnStatus ? new Date().toISOString() : selected.lastNotifiedAt,
        lastNotifiedStatus: config.notifyParentsOnStatus ? status : selected.lastNotifiedStatus,
      },
      { silentToast: true },
    )

    if (config.notifyParentsOnStatus && autoNotifyParents && previous !== status) {
      const alert = await dispatchParentAlert(nextRow, status)
      if (alert) {
        const channelText = alert.channels.join(' + ')
        setToast(`${status} marked · ${channelText} opened for ${alert.parentName}`)
        return
      }
    }

    setToast(`Status updated to ${status}`)
  }

  const removeSelected = () => {
    if (!selected) return
    if (!window.confirm(`Remove “${selected.title || selected.name || selected.id}”?`)) return
    setRows((prev) => prev.filter((row) => row.id !== selected.id))
    setSelectedId(null)
    setToast('Record removed')
  }

  const resetDemo = () => {
    setRows(seed)
    setSearchQuery('')
    setStatusFilter('All')
    setSelectedId(seed[0]?.id ?? null)
    setShowCreate(false)
    setForm(emptyForm(fields))
    setLastParentAlert(null)
    setToast('Demo data restored')
  }

  const createRecord = async (event) => {
    event.preventDefault()
    const titleField = fields.find((f) => f.key === 'title') || fields[0]
    const titleValue = form[titleField?.key] || 'New record'
    const nextStatus = form[statusKey] || statusOptions[0]
    const next = {
      id: `${idPrefix}-${1000 + rows.length + 1}`,
      title: titleValue,
      tone: toneForStatus(nextStatus, statusTones),
      [statusKey]: nextStatus,
      ...form,
    }
    if (!next.title) next.title = titleValue

    if (config.inviteRole === 'teacher') {
      try {
        const invite = await createInviteKey({
          role: 'teacher',
          name: next.title,
          email: next.email || '',
          phone: next.phone || '',
          linkedId: next.id,
          meta: { subject: next.subject || '', source: 'add-teacher' },
        })
        next.inviteKey = invite.key
        next.accountStatus = 'Key issued · awaiting signup'
        setIssuedInvite({
          key: invite.key,
          name: next.title,
          role: 'teacher',
          email: next.email || '',
        })
      } catch (err) {
        setToast(err.message || 'Teacher saved but special key could not be created. Is the API server running?')
        setRows((prev) => [next, ...prev])
        setSelectedId(next.id)
        setShowCreate(false)
        setForm(emptyForm(fields))
        return
      }
    }

    setRows((prev) => [next, ...prev])
    setSelectedId(next.id)
    setShowCreate(false)
    setForm(emptyForm(fields))

    if (config.notifyParentsOnStatus && autoNotifyParents) {
      const alert = await dispatchParentAlert(next, nextStatus)
      if (alert) {
        setToast(`${createLabel} saved · ${alert.channels.join(' + ')} opened for ${alert.parentName}`)
        return
      }
    }
    setToast(
      next.inviteKey
        ? `${createLabel} saved · special key ${next.inviteKey} ready for teacher signup`
        : `${createLabel} saved`,
    )
  }

  const issueTeacherKey = async () => {
    if (!selected || config.inviteRole !== 'teacher') return
    try {
      const invite = await createInviteKey({
        role: 'teacher',
        name: selected.title || selected.name || '',
        email: selected.email || '',
        phone: selected.phone || '',
        linkedId: selected.id,
        meta: { subject: selected.subject || '', source: 'regenerate-teacher-key' },
      })
      updateSelected(
        {
          inviteKey: invite.key,
          accountStatus: 'Key issued · awaiting signup',
        },
        { silentToast: true },
      )
      setIssuedInvite({
        key: invite.key,
        name: selected.title || selected.name || '',
        role: 'teacher',
        email: selected.email || '',
      })
      setToast(`Special key issued: ${invite.key}`)
    } catch (err) {
      setToast(err.message || 'Could not issue special key')
    }
  }

  const runAction = async (action) => {
    if (!selected || !action) return
    if (action.patch) {
      const nextStatus = action.patch[statusKey] || selected[statusKey]
      const previous = selected[statusKey]
      const nextRow = { ...selected, ...action.patch }
      updateSelected(
        {
          ...action.patch,
          tone: toneForStatus(nextStatus, statusTones),
          ...(config.notifyParentsOnStatus && action.patch[statusKey]
            ? {
                lastNotifiedAt: new Date().toISOString(),
                lastNotifiedStatus: action.patch[statusKey],
              }
            : {}),
        },
        { silentToast: true },
      )

      if (action.patch[statusKey] === 'Dark' || action.label === 'Apply dark') {
        document.documentElement.classList.add('sms-dark')
        localStorage.setItem('sms_theme', 'dark')
      }
      if (action.patch[statusKey] === 'Light' || action.label === 'Apply light') {
        document.documentElement.classList.remove('sms-dark')
        localStorage.setItem('sms_theme', 'light')
      }

      if (
        config.notifyParentsOnStatus &&
        autoNotifyParents &&
        action.patch[statusKey] &&
        action.patch[statusKey] !== previous
      ) {
        const alert = await dispatchParentAlert(nextRow, action.patch[statusKey])
        if (alert) {
          setToast(`${action.toast || 'Updated'} · ${alert.channels.join(' + ')} opened for ${alert.parentName}`)
          return
        }
      }

      setToast(action.toast || 'Action completed')
      return
    }
    if (action.toast) setToast(action.toast.replace('{name}', selected.title || selected.name || selected.id))
  }

  const resendParentAlert = async () => {
    if (!selected) return
    const alert = await notifyParentAttendance({
      studentName: selected.title || selected.name,
      status: selected[statusKey],
      className: selected.className || selected.group || '',
      date: selected.date || new Date().toISOString().slice(0, 10),
      period: selected.period || '',
      channels: { sms: notifySms, email: notifyEmail },
      openExternal: true,
      row: selected,
    })
    setLastParentAlert(alert)
    updateSelected(
      {
        lastNotifiedAt: alert.createdAt,
        lastNotifiedStatus: selected[statusKey],
      },
      { silentToast: true },
    )
    setToast(`Resent to ${alert.parentName} via ${alert.channels.join(' + ')}`)
  }

  const parentPreview = config.notifyParentsOnStatus
    ? resolveParentContact(selected?.title || selected?.name || '', selected)
    : null

  const detailFields = fields.length
    ? fields
    : columns.filter((col) => col.key !== 'title' && col.key !== statusKey)

  return (
    <div className="pw-page">
      <section className="pw-hero">
        <div>
          <p className="admin-kicker">{section}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="pw-hero-actions">
          {config.printEnabled ? (
            <button
              type="button"
              className="pw-btn pw-btn-secondary"
              onClick={() => {
                window.print()
              }}
            >
              Print
            </button>
          ) : null}
          <button type="button" className="pw-btn pw-btn-secondary" onClick={() => downloadCsv(title.toLowerCase().replace(/\s+/g, '-'), columns, filtered)}>
            Export CSV
          </button>
          <button type="button" className="pw-btn pw-btn-secondary" onClick={resetDemo}>
            Reset demo
          </button>
          <button type="button" className="pw-btn pw-btn-primary" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Close form' : createLabel}
          </button>
        </div>
      </section>

      <section className="pw-stats" aria-label={`${title} summary`}>
        {stats.map((stat) => (
          <article key={stat.label} className="pw-stat">
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
            <p>{stat.note}</p>
          </article>
        ))}
      </section>

      {showCreate ? (
        <form className="pw-panel pw-create" onSubmit={createRecord}>
          <div className="pw-panel-header">
            <div>
              <p className="admin-kicker">Create</p>
              <h3>{createLabel}</h3>
            </div>
          </div>
          <div className="pw-form-grid">
            {fields.map((field) => (
              <label key={field.key} className="pw-field">
                <span>{field.label}</span>
                {field.type === 'select' ? (
                  <select
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    required={field.required !== false}
                  >
                    {(field.options || statusOptions).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                    required={field.required !== false}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={form[field.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    required={field.required !== false}
                    placeholder={field.placeholder || ''}
                  />
                )}
              </label>
            ))}
          </div>
          <div className="pw-hero-actions" style={{ padding: '0 20px 20px' }}>
            <button type="submit" className="pw-btn pw-btn-primary">
              Save record
            </button>
          </div>
        </form>
      ) : null}

      <section className="pw-workspace">
        <article className="pw-panel">
          <div className="pw-panel-header">
            <div>
              <p className="admin-kicker">Workspace</p>
              <h3>
                {filtered.length} record{filtered.length === 1 ? '' : 's'}
              </h3>
            </div>
            <div className="pw-hero-actions">
              {links.slice(0, 3).map((link) => (
                <Link key={link.to} className="pw-btn pw-btn-ghost pw-btn-sm" to={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="pw-toolbar">
            <label className="pw-search">
              <span aria-hidden>⌕</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Search ${title}`}
              />
            </label>
            <select className="pw-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="All">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="pw-empty">
              <strong>No records yet</strong>
              <p>Create the first entry or restore demo data to explore this module.</p>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button type="button" className="pw-btn pw-btn-secondary" onClick={resetDemo}>
                  Reset demo
                </button>
                <button type="button" className="pw-btn pw-btn-primary" onClick={() => setShowCreate(true)}>
                  {createLabel}
                </button>
              </div>
            </div>
          ) : (
            <div className="pw-table-wrap">
              <table className="pw-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className={selected?.id === row.id ? 'is-selected' : ''}
                      onClick={() => setSelectedId(row.id)}
                    >
                      {columns.map((col, index) => (
                        <td key={col.key}>
                          {index === 0 ? (
                            <div className="pw-primary-cell">
                              <div className="pw-avatar" aria-hidden>
                                {String(row[col.key] || row.id || '?').charAt(0)}
                              </div>
                              <div>
                                <h4>{row[col.key]}</h4>
                                <p>{row.id}</p>
                              </div>
                            </div>
                          ) : col.key === statusKey ? (
                            <span className={`pw-status ${row.tone || toneForStatus(row[statusKey], statusTones)}`}>
                              {row[statusKey]}
                            </span>
                          ) : (
                            <span className="pw-muted">{row[col.key] || '—'}</span>
                          )}
                        </td>
                      ))}
                      <td>
                        <button
                          type="button"
                          className="pw-btn pw-btn-secondary pw-btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(row.id)
                          }}
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className="pw-panel pw-detail" aria-label={`${title} detail`}>
          {!selected ? (
            <div className="pw-detail-empty">
              <strong>Select a record</strong>
              <p>Open any row to manage status, details and advanced actions for this module.</p>
            </div>
          ) : (
            <>
              <div className="pw-detail-top">
                <div className="pw-detail-avatar" aria-hidden>
                  {String(selected.title || selected.name || selected.id).charAt(0)}
                </div>
                <div>
                  <h3>{selected.title || selected.name || selected.id}</h3>
                  <p>{selected.id}</p>
                  <div style={{ marginTop: 10 }}>
                    <span className={`pw-status ${selected.tone || toneForStatus(selected[statusKey], statusTones)}`}>
                      {selected[statusKey]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pw-detail-body">
                <div>
                  <p className="pw-section-label">Details</p>
                  <div className="pw-meta-grid">
                    {detailFields.map((field) => (
                      <label key={field.key} className="pw-meta pw-meta-edit">
                        <span>{field.label || field.key}</span>
                        {field.type === 'select' ? (
                          <select
                            value={selected[field.key] ?? ''}
                            onChange={(e) => {
                              const value = e.target.value
                              if (field.key === statusKey) {
                                setStatus(value)
                              } else {
                                updateSelected({ [field.key]: value })
                              }
                            }}
                          >
                            {(field.options || statusOptions).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={selected[field.key] ?? ''}
                            onChange={(e) => updateSelected({ [field.key]: e.target.value })}
                            rows={2}
                          />
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={selected[field.key] ?? ''}
                            onChange={(e) => updateSelected({ [field.key]: e.target.value })}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="pw-section-label">Status control</p>
                  <div className="pw-status-actions">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`pw-btn pw-btn-secondary pw-btn-sm ${selected[statusKey] === status ? 'is-active' : ''}`}
                        onClick={() => setStatus(status)}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {config.inviteRole === 'teacher' ? (
                  <div className="pw-invite-card">
                    <p className="pw-section-label">Teacher account special key</p>
                    <p className="pw-notify-copy">
                      Share this key with the teacher. They use it on Create Account → Teacher to claim their login.
                    </p>
                    {selected.inviteKey ? (
                      <div className="pw-invite-key-row">
                        <code>{selected.inviteKey}</code>
                        <button
                          type="button"
                          className="pw-btn pw-btn-secondary pw-btn-sm"
                          onClick={() => {
                            navigator.clipboard?.writeText(selected.inviteKey)
                            setToast('Special key copied')
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    ) : (
                      <p className="pw-muted">No key yet for this teacher.</p>
                    )}
                    <p className="pw-notify-last">{selected.accountStatus || 'Awaiting key'}</p>
                    <button type="button" className="pw-btn pw-btn-primary pw-btn-sm" onClick={issueTeacherKey}>
                      {selected.inviteKey ? 'Generate new key' : 'Generate special key'}
                    </button>
                  </div>
                ) : null}

                {config.notifyParentsOnStatus ? (
                  <div className="pw-notify-card">
                    <p className="pw-section-label">Parent SMS / Email alert</p>
                    <p className="pw-notify-copy">
                      Jaise hi Present / Absent / Late mark hoga, parent ko automatic alert jayega.
                    </p>
                    <label className="pw-notify-toggle">
                      <input
                        type="checkbox"
                        checked={autoNotifyParents}
                        onChange={(e) => setAutoNotifyParents(e.target.checked)}
                      />
                      <span>Auto-notify parent on status change</span>
                    </label>
                    <div className="pw-notify-channels">
                      <label>
                        <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} />
                        SMS
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.checked)}
                        />
                        Email
                      </label>
                    </div>
                    {parentPreview ? (
                      <div className="pw-notify-contact">
                        <strong>{parentPreview.parentName}</strong>
                        <span>{parentPreview.phone || 'No phone'}</span>
                        <span>{parentPreview.email || 'No email'}</span>
                      </div>
                    ) : null}
                    {(lastParentAlert || selected.lastNotifiedAt) && (
                      <p className="pw-notify-last">
                        Last alert:{' '}
                        {lastParentAlert
                          ? `${lastParentAlert.deliveryStatus} · ${lastParentAlert.status} → ${lastParentAlert.parentName}`
                          : `${selected.lastNotifiedStatus || selected[statusKey]} at ${new Date(selected.lastNotifiedAt).toLocaleString()}`}
                      </p>
                    )}
                    <button type="button" className="pw-btn pw-btn-primary pw-btn-sm" onClick={resendParentAlert}>
                      Resend SMS / Email now
                    </button>
                    <Link className="pw-btn pw-btn-ghost pw-btn-sm" to="/communication/parent-notifications">
                      View alert log
                    </Link>
                  </div>
                ) : null}

                {Array.isArray(config.recordActions) && config.recordActions.length > 0 ? (
                  <div>
                    <p className="pw-section-label">Advanced actions</p>
                    <div className="pw-quick-grid">
                      {config.recordActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          className="pw-btn pw-btn-secondary pw-btn-sm"
                          onClick={() => runAction(action)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {features.length > 0 ? (
                  <div>
                    <p className="pw-section-label">Module capabilities</p>
                    <ul className="pw-feature-list">
                      {features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {links.length > 0 ? (
                  <div>
                    <p className="pw-section-label">Related modules</p>
                    <div className="pw-quick-grid">
                      {links.map((link) => (
                        <Link key={link.to} className="pw-btn pw-btn-secondary pw-btn-sm" to={link.to}>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="pw-hero-actions">
                  <button type="button" className="pw-btn pw-btn-danger" onClick={removeSelected}>
                    Remove
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      {issuedInvite ? (
        <div className="pw-invite-modal" role="dialog" aria-label="Special account key">
          <div className="pw-invite-modal__card">
            <p className="admin-kicker">Special key issued</p>
            <h3>Share with {issuedInvite.name || 'teacher'}</h3>
            <p>
              Teacher opens Create Account, selects Teacher, pastes this key, then verifies email OTP to reach their own
              account.
            </p>
            <code className="pw-invite-modal__key">{issuedInvite.key}</code>
            <div className="pw-hero-actions">
              <button
                type="button"
                className="pw-btn pw-btn-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(issuedInvite.key)
                  setToast('Special key copied')
                }}
              >
                Copy key
              </button>
              <button type="button" className="pw-btn pw-btn-primary" onClick={() => setIssuedInvite(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="pw-toast" role="status">
          {toast}
        </div>
      ) : null}

      {lastParentAlert ? (
        <div className="pw-alert-modal" role="dialog" aria-modal="true" aria-label="Parent alert sent">
          <div className="pw-alert-dialog">
            <p className="admin-kicker">Parent alert</p>
            <h3>
              {lastParentAlert.status} · {lastParentAlert.studentName}
            </h3>
            <p>
              Sent to <strong>{lastParentAlert.parentName}</strong>
            </p>
            <div className="pw-alert-meta">
              {lastParentAlert.phone ? <span>SMS: {lastParentAlert.phone}</span> : null}
              {lastParentAlert.email ? <span>Email: {lastParentAlert.email}</span> : null}
            </div>
            <p className="pw-alert-message">{lastParentAlert.message}</p>
            <p className="pw-notify-last">
              {lastParentAlert.delivery?.some((d) => d.launched)
                ? 'SMS / Email app opened. Confirm and send from your phone or mail client.'
                : 'Alert logged. If apps did not open, use Resend or allow pop-ups.'}
              {lastParentAlert.smsCopied ? ' SMS text also copied to clipboard.' : ''}
            </p>
            <div className="pw-hero-actions">
              <button type="button" className="pw-btn pw-btn-secondary" onClick={() => setLastParentAlert(null)}>
                Close
              </button>
              <button type="button" className="pw-btn pw-btn-primary" onClick={resendParentAlert}>
                Open again
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
