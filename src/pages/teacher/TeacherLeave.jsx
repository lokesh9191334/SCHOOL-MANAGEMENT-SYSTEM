import { useCallback, useEffect, useState } from 'react'
import { LEAVE_TYPES } from '../../../leaveRequests.js'
import { fetchLeaveRequests, submitLeaveRequest } from '../../services/leaveRequests'
import '../shared/LeaveDesk.css'

function todayISO() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function formatDay(value) {
  if (!value) return '—'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatRange(row) {
  if (!row?.fromDate) return '—'
  return row.fromDate === row.toDate ? formatDay(row.fromDate) : `${formatDay(row.fromDate)} → ${formatDay(row.toDate)}`
}

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const EMPTY_SUMMARY = { total: 0, pending: 0, approved: 0, rejected: 0 }

export default function TeacherLeave() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'sick', fromDate: todayISO(), toDate: todayISO(), reason: '' })

  const applyBody = useCallback((body) => {
    setRows(Array.isArray(body.requests) ? body.requests : [])
    setSummary(body.summary || EMPTY_SUMMARY)
    setError('')
  }, [])

  const load = useCallback(async () => {
    try {
      applyBody(await fetchLeaveRequests())
    } catch (err) {
      setError(err.message || 'Leave requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [applyBody])

  useEffect(() => {
    let active = true
    fetchLeaveRequests()
      .then((body) => {
        if (active) applyBody(body)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Leave requests could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [applyBody])

  const update = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const reason = form.reason.trim()
    if (!form.fromDate || !form.toDate) {
      setError('Choose both the start and end date.')
      return
    }
    if (form.toDate < form.fromDate) {
      setError('The end date cannot be before the start date.')
      return
    }
    if (reason.length < 5) {
      setError('Write a short reason (at least 5 characters) for the admin.')
      return
    }
    setSaving(true)
    try {
      await submitLeaveRequest({ type: form.type, fromDate: form.fromDate, toDate: form.toDate, reason })
      setForm((prev) => ({ ...prev, reason: '' }))
      setNotice('Leave request sent to the school admin. You will get an email once it is reviewed.')
      await load()
    } catch (err) {
      setError(err.message || 'The leave request could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="lvd-page">
      <header className="lvd-hero">
        <div>
          <p className="admin-kicker">Teacher Desk · My Leave</p>
          <h2>Apply for leave</h2>
          <p>
            Your request goes straight to the school admin. Once it is approved or rejected you will see the status
            and the admin&apos;s reason here, and an email is sent to you as well.
          </p>
        </div>
        <div className="lvd-stats">
          <article className="lvd-stat is-pending">
            <strong>{summary.pending}</strong>
            <span>Pending</span>
          </article>
          <article className="lvd-stat is-approved">
            <strong>{summary.approved}</strong>
            <span>Approved</span>
          </article>
          <article className="lvd-stat is-rejected">
            <strong>{summary.rejected}</strong>
            <span>Rejected</span>
          </article>
        </div>
      </header>

      {error ? <p className="lvd-alert is-error">{error}</p> : null}
      {notice ? <p className="lvd-alert is-success">{notice}</p> : null}

      <section className="lvd-grid">
        <article className="lvd-panel">
          <h3>New leave request</h3>
          <form className="lvd-form" onSubmit={submit}>
            <label className="lvd-field">
              <span>Leave type</span>
              <select value={form.type} onChange={update('type')}>
                {LEAVE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="lvd-row">
              <label className="lvd-field">
                <span>From</span>
                <input type="date" value={form.fromDate} onChange={update('fromDate')} />
              </label>
              <label className="lvd-field">
                <span>To</span>
                <input type="date" value={form.toDate} onChange={update('toDate')} />
              </label>
            </div>
            <label className="lvd-field">
              <span>Reason for the admin</span>
              <textarea
                value={form.reason}
                onChange={update('reason')}
                maxLength={500}
                placeholder="For example: Fever and doctor advised rest for two days."
              />
            </label>
            <button type="submit" className="lvd-btn primary" disabled={saving}>
              {saving ? 'Sending…' : 'Send request to admin'}
            </button>
          </form>
          <p className="lvd-footnote">One request cannot overlap another pending or approved leave.</p>
        </article>

        <article className="lvd-panel">
          <h3>My requests</h3>
          {loading ? <p className="lvd-empty">Loading your leave requests…</p> : null}
          {!loading && !rows.length ? (
            <p className="lvd-empty">No leave request yet. Your first request will appear here.</p>
          ) : null}
          <div className="lvd-list">
            {rows.map((row) => (
              <div className="lvd-card" key={row.id}>
                <div className="lvd-card__head">
                  <div>
                    <span className="lvd-name">{row.typeLabel}</span>
                    <span className="lvd-sub">{formatRange(row)}</span>
                  </div>
                  <span className={`lvd-chip is-${String(row.status).toLowerCase()}`}>{row.status}</span>
                </div>
                <p className="lvd-reason">{row.reason}</p>
                <dl className="lvd-meta">
                  <div>
                    <dt>Days</dt>
                    <dd>{row.days}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatWhen(row.createdAt)}</dd>
                  </div>
                  {row.decidedAt ? (
                    <div>
                      <dt>Decision</dt>
                      <dd>
                        {formatWhen(row.decidedAt)}
                        {row.decidedByName ? ` · ${row.decidedByName}` : ''}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {row.status !== 'Pending' && row.decisionNote ? (
                  <div className={`lvd-note ${row.status === 'Approved' ? 'is-approved' : ''}`}>
                    <span>{row.status === 'Rejected' ? 'Reason from admin' : 'Admin note'}</span>
                    <p>{row.decisionNote}</p>
                  </div>
                ) : null}
                {row.status === 'Pending' ? (
                  <p className="lvd-waiting">Waiting for the school admin to review this request.</p>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
