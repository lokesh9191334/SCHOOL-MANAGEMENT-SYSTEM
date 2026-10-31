import { useCallback, useEffect, useState } from 'react'
import { LEAVE_TYPES } from '../../../leaveRequests.js'
import { fetchStudentLeaveRequests, submitStudentLeaveRequest } from '../../services/studentLeave'
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

export default function ParentLeaveRequest() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [child, setChild] = useState(null)
  const [classTeacher, setClassTeacher] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type: 'sick', fromDate: todayISO(), toDate: todayISO(), reason: '' })

  const applyBody = useCallback((body) => {
    setRows(Array.isArray(body.requests) ? body.requests : [])
    setSummary(body.summary || EMPTY_SUMMARY)
    setChild(body.child || null)
    setClassTeacher(body.classTeacher || null)
    setError('')
  }, [])

  const load = useCallback(async () => {
    try {
      applyBody(await fetchStudentLeaveRequests())
    } catch (err) {
      setError(err.message || 'Your leave requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [applyBody])

  useEffect(() => {
    let active = true
    fetchStudentLeaveRequests()
      .then((body) => {
        if (active) applyBody(body)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Your leave requests could not be loaded.')
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
      setError('Write a short reason (at least 5 characters) for the class teacher.')
      return
    }
    setSaving(true)
    try {
      const body = await submitStudentLeaveRequest({
        type: form.type,
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason,
      })
      setForm((prev) => ({ ...prev, reason: '' }))
      setNotice(
        body.request?.assignedTo === 'teacher'
          ? `Leave request sent to ${body.request.classTeacherName || 'the class teacher'}. You will get an email once it is reviewed.`
          : 'Leave request sent to the school admin because this class has no class teacher yet. You will get an email once it is reviewed.',
      )
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
          <p className="admin-kicker">Parent Portal · Leave Request</p>
          <h2>{child ? `Leave for ${child.name}` : 'Student leave request'}</h2>
          <p>
            {child
              ? `${child.name}${child.className ? ` · ${child.className}` : ''}${child.rollNo ? ` · Roll ${child.rollNo}` : ''}.`
              : 'File a leave request for your child. It goes to the class teacher for review.'}
          </p>
          <p>
            {classTeacher
              ? `Requests go to ${classTeacher.name}, class teacher of ${classTeacher.className} (${classTeacher.email}).`
              : 'No class teacher is assigned to this class yet, so your request goes to the school admin.'}
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
              <span>Reason for the class teacher</span>
              <textarea
                value={form.reason}
                onChange={update('reason')}
                maxLength={500}
                placeholder="For example: Fever and doctor advised rest for two days."
              />
            </label>
            <button type="submit" className="lvd-btn primary" disabled={saving || !child}>
              {saving ? 'Sending…' : classTeacher ? 'Send request to class teacher' : 'Send request to school admin'}
            </button>
          </form>
          <p className="lvd-footnote">One request cannot overlap another pending or approved leave for the same child.</p>
        </article>

        <article className="lvd-panel">
          <h3>Leave history</h3>
          {loading ? <p className="lvd-empty">Loading leave requests…</p> : null}
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
                  <div>
                    <dt>Reviewer</dt>
                    <dd>{row.assignedTo === 'teacher' ? row.classTeacherName || 'Class teacher' : 'School admin'}</dd>
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
                    <span>
                      {row.status === 'Rejected'
                        ? row.assignedTo === 'teacher'
                          ? 'Reason from class teacher'
                          : 'Reason from school admin'
                        : 'Note from school'}
                    </span>
                    <p>{row.decisionNote}</p>
                  </div>
                ) : null}
                {row.status === 'Pending' ? (
                  <p className="lvd-waiting">
                    {row.assignedTo === 'teacher'
                      ? `Waiting for ${row.classTeacherName || 'the class teacher'} to review this request.`
                      : 'Waiting for the school admin to review this request.'}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
