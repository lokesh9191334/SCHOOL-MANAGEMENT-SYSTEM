import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import '../pages/students/StudentProfilePremium.css'

const normalize = (raw) => {
  if (raw == null || raw === '' || raw === '—') return ''
  if (Array.isArray(raw)) return raw.length ? raw.join(', ') : ''
  if (typeof raw === 'boolean') return raw ? 'Yes' : ''
  return String(raw)
}

const field = (label, raw) => {
  const value = normalize(raw)
  return value ? { label, value } : null
}

const toneClass = (status) => {
  const value = String(status || '').toLowerCase()
  if (['resign', 'suspend', 'blocked', 'inactive'].some((k) => value.includes(k))) return 'sprof-pill--muted'
  if (['active', 'claimed', 'verified', 'complete'].some((k) => value.includes(k))) return 'sprof-pill--success'
  if (['leave', 'awaiting', 'pending', 'review', 'hold'].some((k) => value.includes(k))) return 'sprof-pill--warning'
  return 'sprof-pill--muted'
}

const ACCOUNT_CHECKS = [
  { label: 'Special key issued', ok: (t) => Boolean(t.inviteKey), file: (t) => t.inviteKey || '' },
  { label: 'Email on file', ok: (t) => Boolean(t.email), file: (t) => t.email || '' },
  { label: 'Phone on file', ok: (t) => Boolean(t.phone), file: (t) => t.phone || '' },
  {
    label: 'Account claimed by teacher',
    ok: (t) => Boolean(t.accountStatus) && !t.accountStatus.toLowerCase().includes('awaiting'),
    file: (t) => t.accountStatus || '',
  },
]

const TeacherProfileOverlay = ({ row, onClose }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  if (!row) return null

  const copyKey = () => {
    if (!row.inviteKey) return
    navigator.clipboard?.writeText(row.inviteKey)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const sections = [
    {
      title: 'Employment',
      icon: '👩‍🏫',
      fields: [
        field('Teacher ID', row.id),
        field('Primary subject', row.subject),
        field('Department', row.department),
        field('Qualification', row.qualification),
        field('Experience', row.experience),
      ],
    },
    {
      title: 'Contact',
      icon: '☎',
      fields: [field('Email', row.email), field('Phone', row.phone)],
    },
  ].map((section) => ({ ...section, fields: section.fields.filter(Boolean) }))

  const photo = row.photoUrl || ''

  return createPortal(
    <div className="sprof-backdrop" onClick={onClose}>
      <div
        className="sprof-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Profile of ${row.title || row.name || row.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sprof-hero">
          <button type="button" className="sprof-close" onClick={onClose} aria-label="Close profile">
            ✕
          </button>
          <div className="sprof-photo-wrap">
            {photo ? (
              <img className="sprof-photo" src={photo} alt={`${row.title} photo`} />
            ) : (
              <div className="sprof-photo sprof-photo--initial" aria-hidden>
                {String(row.title || row.name || row.id || '?').charAt(0)}
              </div>
            )}
            <span
              className={`sprof-presence ${toneClass(row.status)}`}
              title={row.status}
            />
          </div>
          <div className="sprof-hero-info">
            <p className="sprof-kicker">Teacher Profile</p>
            <h2>{row.title || row.name || row.id}</h2>
            <p className="sprof-meta">{[row.subject, row.id].filter(Boolean).join(' · ')}</p>
            <div className="sprof-hero-tags">
              {row.status ? <span className={`sprof-pill ${toneClass(row.status)}`}>{row.status}</span> : null}
              {row.accountStatus ? <span className="sprof-tag">{row.accountStatus}</span> : null}
            </div>
          </div>
        </header>

        <div className="sprof-body">
          {sections
            .filter((section) => section.fields.length > 0)
            .map((section) => (
              <section className="sprof-section" key={section.title}>
                <h3>
                  <span aria-hidden>{section.icon}</span> {section.title}
                </h3>
                <div className="sprof-grid">
                  {section.fields.map((item) => (
                    <div className="sprof-item" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ))}

          <section className="sprof-section">
            <h3>
              <span aria-hidden>🔐</span> Account &amp; access
            </h3>
            <div className="sprof-grid">
              <div className="sprof-item">
                <span>Special signup key</span>
                <strong className="sprof-key-row">
                  {row.inviteKey || 'Not issued yet'}
                  {row.inviteKey ? (
                    <button type="button" className="sprof-copy" onClick={copyKey}>
                      {copied ? 'Copied ✓' : 'Copy'}
                    </button>
                  ) : null}
                </strong>
              </div>
              {field('Account status', row.accountStatus) ? (
                <div className="sprof-item">
                  <span>Account status</span>
                  <strong>{row.accountStatus}</strong>
                </div>
              ) : null}
            </div>
          </section>

          <section className="sprof-section">
            <h3>
              <span aria-hidden>✅</span> Account setup
            </h3>
            <div className="sprof-docs">
              {ACCOUNT_CHECKS.map((check) => {
                const done = check.ok(row)
                return (
                  <div className={`sprof-doc ${done ? 'is-done' : ''}`} key={check.label}>
                    <span className="sprof-doc-mark" aria-hidden>
                      {done ? '✓' : '—'}
                    </span>
                    <div>
                      <strong>{check.label}</strong>
                      {check.file(row) ? <small>{check.file(row)}</small> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default TeacherProfileOverlay
