import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { notifyParentAttendance, resolveParentContact } from '../../services/parentNotify'
import { createInviteKey } from '../../services/inviteKeys'
import { getAuthUser } from '../../utils/session'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS } from '../../data/seed'
import TeacherProfileOverlay from '../TeacherProfileOverlay'
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

function emptyForm(fields, statusOptions = ['Active', 'Pending', 'Closed']) {
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      field.defaultValue ?? (field.type === 'select' ? (field.options?.[0] ?? statusOptions[0] ?? '') : ''),
    ]),
  )
}

const STROKE_PROPS = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const SECTION_ICONS = {
  'Student Management': (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3.1 2.9-4.9 5.5-4.9s4.9 1.8 5.5 4.9" />
      <path d="M15.8 5.4a3.2 3.2 0 0 1 0 5.2" />
      <path d="M18.4 14.6c1.4.9 2.3 2.4 2.6 4.4" />
    </>
  ),
  'Teacher Management': (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M7 12l2.5-3 2.5 2.5L15.5 8" />
      <path d="M12 16v3" />
      <path d="M8.5 21h7" />
    </>
  ),
  'Attendance Management': (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10.5h18" />
      <path d="M9.3 15.6l2 2 3.6-3.8" />
    </>
  ),
  'Class & Subject Management': (
    <>
      <path d="M12 6.2C10.4 4.7 8.2 4 5 4v13.6c3.2 0 5.4.7 7 2.2 1.6-1.5 3.8-2.2 7-2.2V4c-3.2 0-5.4.7-7 2.2z" />
      <path d="M12 6.2v13.6" />
    </>
  ),
  'Examination Management': (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M9.2 13.4 7.6 21l4.4-2.4L16.4 21l-1.6-7.6" />
    </>
  ),
  'Fees Management': (
    <>
      <path d="M6 3.5h12c.6 0 1 .4 1 1V21l-2.6-1.6L14 21l-2-1.5L10 21l-2.4-1.6L5 21V4.5c0-.6.4-1 1-1z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </>
  ),
  'Transport Management': (
    <>
      <rect x="4" y="4" width="16" height="13" rx="2.5" />
      <path d="M4 11h16" />
      <path d="M7.5 20.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM16.5 20.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z" />
      <path d="M7 14.5h.01M17 14.5h.01" />
    </>
  ),
  'Library Management': (
    <>
      <path d="M5 20.5V7l4.5-3.5L14 7v13.5" />
      <path d="M5 20.5h9" />
      <path d="M14 10h5.5v10.5" />
      <path d="M8.2 9.5h.01M11 9.5h.01M8.2 13h.01M11 13h.01M8.2 16.5h.01M11 16.5h.01M17 13.5h.01M17 17h.01" />
    </>
  ),
  'Notice & Announcement': (
    <>
      <path d="M18 15.5a5.5 5.5 0 0 0 0-7" />
      <path d="M6 9.5h4l7-4.5v14l-7-4.5H6a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2z" />
      <path d="M10 14.5V19a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  'Communication Section': (
    <>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8.5 11h.01M12.5 11h.01M16.5 11h.01" />
    </>
  ),
  'Settings Section': (
    <>
      <path d="M4 8h9M17.5 8H20" />
      <circle cx="15" cy="8" r="2.2" />
      <path d="M4 16h2.5M11 16h9" />
      <circle cx="9" cy="16" r="2.2" />
    </>
  ),
  default: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
}

const STAT_ICONS = {
  total: (
    <>
      <path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5z" />
      <path d="M3.5 13 12 17.5 20.5 13" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.4l2.4 2.4 4.6-5" />
    </>
  ),
  warning: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.6V12l3 2" />
    </>
  ),
  muted: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12h7" />
    </>
  ),
}

function PwIcon({ paths, size = 26 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden {...STROKE_PROPS}>
      {paths}
    </svg>
  )
}

// Photos are stored as data URLs inside the record JSON; downscaling keeps
// each save well under the 2MB request limit enforced by the API.
function PhotoField({ value, onChange }) {
  const inputRef = useRef(null)

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 512
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        onChange(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => onChange(String(reader.result || ''))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="pw-photo-field">
      {value ? (
        <img className="pw-photo-preview" src={value} alt="" />
      ) : (
        <div className="pw-photo-preview pw-photo-empty" aria-hidden>
          👤
        </div>
      )}
      <div className="pw-photo-actions">
        <button type="button" className="pw-btn pw-btn-secondary pw-btn-sm" onClick={() => inputRef.current?.click()}>
          {value ? 'Change photo' : 'Upload photo'}
        </button>
        {value ? (
          <button type="button" className="pw-btn pw-btn-ghost pw-btn-sm" onClick={() => onChange('')}>
            Remove
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  )
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
  const [editing, setEditing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(() => emptyForm(fields, statusOptions))
  const [toast, setToast] = useState('')
  const [autoNotifyParents, setAutoNotifyParents] = useState(Boolean(config.notifyParentsOnStatus))
  const [notifySms, setNotifySms] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [lastParentAlert, setLastParentAlert] = useState(null)
  const [issuedInvite, setIssuedInvite] = useState(null)
  const [profileId, setProfileId] = useState(null)
  const authUser = getAuthUser()
  const [students] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const childIds = students
    .filter((student) => student.applicationId === authUser?.linkedId || student.id === authUser?.linkedId)
    .map((student) => student.id)
  const visibleRows = config.parentScoped && authUser?.role === 'parent'
    ? rows.filter((row) => childIds.includes(row.studentId) || row.linkedId === authUser.linkedId)
    : rows

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!showCreate && !issuedInvite && !lastParentAlert) return
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      if (showCreate) setShowCreate(false)
      else if (issuedInvite) setIssuedInvite(null)
      else if (lastParentAlert) setLastParentAlert(null)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [showCreate, issuedInvite, lastParentAlert])

  useEffect(() => {
    setAutoNotifyParents(Boolean(config.notifyParentsOnStatus))
  }, [config.notifyParentsOnStatus, config.path])

  const stats = useMemo(() => {
    if (typeof config.computeStats === 'function') return config.computeStats(rows)
    const total = visibleRows.length
    const byStatus = statusOptions.map((status) => ({
      label: status,
      value: visibleRows.filter((row) => row[statusKey] === status).length,
      note: `${status} in ${title}`,
    }))
    return [{ label: 'Total', value: total, note: 'Records on file' }, ...byStatus.slice(0, 3)]
  }, [visibleRows, config, statusOptions, statusKey, title])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return visibleRows
      .filter((row) => {
        if (statusFilter !== 'All' && row[statusKey] !== statusFilter) return false
        if (!q) return true
        return columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q))
      })
      .sort((a, b) => String(a.title || a.name || a.id).localeCompare(String(b.title || b.name || b.id)))
  }, [visibleRows, searchQuery, statusFilter, statusKey, columns])

  const selected = visibleRows.find((row) => row.id === selectedId) ?? filtered[0] ?? null

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
    setForm(emptyForm(fields, statusOptions))
    setLastParentAlert(null)
    setToast('Demo data restored')
  }

  const createRecord = async (event) => {
    event.preventDefault()
    const titleField = fields.find((f) => f.key === 'title') || fields[0]
    const titleValue = form[titleField?.key] || 'New record'
    const nextStatus = form[statusKey] || statusOptions[0]
    // Form values go first so the computed identity/status keys always win
    // (an untouched select would otherwise overwrite status with '').
    const next = {
      ...form,
      id: `${idPrefix}-${1000 + rows.length + 1}`,
      title: titleValue,
      tone: toneForStatus(nextStatus, statusTones),
      [statusKey]: nextStatus,
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
        setForm(emptyForm(fields, statusOptions))
        return
      }
    }

    setRows((prev) => [next, ...prev])
    setSelectedId(next.id)
    setEditing(false)
    setShowCreate(false)
    setForm(emptyForm(fields, statusOptions))

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

  const profileRow = profileId ? visibleRows.find((row) => row.id === profileId) : null

  return (
    <div className="pw-page">
      <section className="pw-hero">
        <div className="pw-hero-main">
          <div className="pw-hero-badge" aria-hidden>
            <PwIcon paths={SECTION_ICONS[section] || SECTION_ICONS.default} />
          </div>
          <div>
            <p className="pw-kicker">{section}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <div className="pw-hero-actions">
          {config.printEnabled ? (
            <button
              type="button"
              className="pw-btn pw-btn-glass"
              onClick={() => {
                window.print()
              }}
            >
              Print
            </button>
          ) : null}
          <button type="button" className="pw-btn pw-btn-glass" onClick={() => downloadCsv(title.toLowerCase().replace(/\s+/g, '-'), columns, filtered)}>
            Export CSV
          </button>
          <button type="button" className="pw-btn pw-btn-glass" onClick={resetDemo}>
            Reset demo
          </button>
          <button type="button" className="pw-btn pw-btn-light" onClick={() => setShowCreate(true)}>
            {createLabel}
          </button>
        </div>
      </section>

      <section className="pw-stats" aria-label={`${title} summary`}>
        {stats.map((stat) => {
          const tone = stat.label === 'Total' ? 'total' : toneForStatus(stat.label, statusTones)
          return (
            <article key={stat.label} className={`pw-stat pw-stat--${tone}`}>
              <div className="pw-stat-top">
                <span className="pw-stat-icon" aria-hidden>
                  <PwIcon paths={STAT_ICONS[tone] || STAT_ICONS.total} size={18} />
                </span>
                <strong>{stat.value}</strong>
              </div>
              <span className="pw-stat-label">{stat.label}</span>
              <p>{stat.note}</p>
            </article>
          )
        })}
      </section>

      {showCreate
        ? createPortal(
            <div className="pw-drawer" role="dialog" aria-modal="true" aria-label={createLabel}>
              <div className="pw-drawer-backdrop" onClick={() => setShowCreate(false)} />
              <form className="pw-drawer-panel" onSubmit={createRecord}>
                <header className="pw-drawer-head">
                  <div>
                    <p className="pw-kicker">Create</p>
                    <h3>{createLabel}</h3>
                  </div>
                  <button type="button" className="pw-drawer-close" aria-label="Close form" onClick={() => setShowCreate(false)}>
                    ✕
                  </button>
                </header>
                <div className="pw-drawer-body">
                  <div className="pw-form-grid">
                    {fields.map((field) => (
                      <label key={field.key} className="pw-field">
                        <span>{field.label}</span>
                        {field.type === 'photo' ? (
                          <PhotoField
                            value={form[field.key] || ''}
                            onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                          />
                        ) : field.type === 'select' ? (
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
                </div>
                <footer className="pw-drawer-foot">
                  <button type="button" className="pw-btn pw-btn-secondary" onClick={() => setShowCreate(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="pw-btn pw-btn-accent">
                    Save record
                  </button>
                </footer>
              </form>
            </div>,
            document.body,
          )
        : null}

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
              <span className="pw-empty-icon" aria-hidden>
                <PwIcon paths={SECTION_ICONS[section] || SECTION_ICONS.default} size={30} />
              </span>
              <strong>No records yet</strong>
              <p>Create the first entry or restore demo data to explore this module.</p>
              <div className="pw-empty-actions">
                <button type="button" className="pw-btn pw-btn-secondary" onClick={resetDemo}>
                  Reset demo
                </button>
                <button type="button" className="pw-btn pw-btn-accent" onClick={() => setShowCreate(true)}>
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
                                {row.photoUrl ? (
                                  <img src={row.photoUrl} alt="" />
                                ) : (
                                  String(row[col.key] || row.id || '?').charAt(0)
                                )}
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
                            if (config.inviteRole === 'teacher') {
                              setProfileId(row.id)
                            } else {
                              setSelectedId(row.id)
                              setEditing(false)
                            }
                          }}
                        >
                          View
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
                  {selected.photoUrl ? (
                    <img src={selected.photoUrl} alt="" />
                  ) : (
                    String(selected.title || selected.name || selected.id).charAt(0)
                  )}
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
                <div className="pw-detail-top-actions">
                  {config.inviteRole === 'teacher' ? (
                    <button
                      type="button"
                      className="pw-btn pw-btn-primary pw-btn-sm"
                      onClick={() => setProfileId(selected.id)}
                    >
                      Full profile
                    </button>
                  ) : null}
                  <button type="button" className="pw-btn pw-btn-secondary pw-btn-sm" onClick={() => setEditing((value) => !value)}>
                    {editing ? 'Cancel edit' : 'Edit record'}
                  </button>
                </div>
              </div>

              <div className="pw-detail-body">
                <div>
                  <p className="pw-section-label">Details</p>
                  <div className="pw-meta-grid">
                    {detailFields.map((field) =>
                    field.type === 'photo' ? (
                      <div key={field.key} className="pw-meta pw-meta-edit">
                        <span>{field.label || field.key}</span>
                        <PhotoField
                          value={selected[field.key] || ''}
                          onChange={(value) => updateSelected({ [field.key]: value })}
                        />
                      </div>
                    ) : (
                      <label key={field.key} className="pw-meta pw-meta-edit">
                        <span>{field.label || field.key}</span>
                        {field.type === 'select' ? (
                          <select
                            value={selected[field.key] ?? ''}
                            disabled={!editing}
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
                            disabled={!editing}
                            onChange={(e) => updateSelected({ [field.key]: e.target.value })}
                            rows={2}
                          />
                        ) : (
                          <input
                            type={field.type || 'text'}
                            value={selected[field.key] ?? ''}
                            disabled={!editing}
                            onChange={(e) => updateSelected({ [field.key]: e.target.value })}
                          />
                        )}
                      </label>
                    ),
                  )}
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
                  {editing ? (
                    <button type="button" className="pw-btn pw-btn-primary" onClick={() => { setEditing(false); setToast('Changes saved') }}>
                      Save changes
                    </button>
                  ) : null}
                  <button type="button" className="pw-btn pw-btn-danger" onClick={removeSelected}>
                    Delete record
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      {issuedInvite
        ? createPortal(
            <div className="pw-invite-modal" role="dialog" aria-modal="true" aria-label="Special account key">
              <div className="pw-invite-modal__card">
                <button type="button" className="pw-modal-close" aria-label="Close" onClick={() => setIssuedInvite(null)}>
                  ✕
                </button>
                <span className="pw-modal-glyph" aria-hidden>
                  <PwIcon paths={STAT_ICONS.success} size={22} />
                </span>
                <p className="pw-kicker">Special key issued</p>
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
                  <button type="button" className="pw-btn pw-btn-accent" onClick={() => setIssuedInvite(null)}>
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {toast
        ? createPortal(
            <div className="pw-toast" role="status">
              <span className="pw-toast-dot" aria-hidden />
              <p>{toast}</p>
              <button type="button" className="pw-toast-close" aria-label="Dismiss" onClick={() => setToast('')}>
                ✕
              </button>
            </div>,
            document.body,
          )
        : null}

      {profileRow ? <TeacherProfileOverlay row={profileRow} onClose={() => setProfileId(null)} /> : null}

      {lastParentAlert
        ? createPortal(
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
                  <button type="button" className="pw-btn pw-btn-accent" onClick={resendParentAlert}>
                    Open again
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
