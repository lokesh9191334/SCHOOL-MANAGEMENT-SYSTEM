import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchClassTeacherOverview } from '../../services/classTeachers'
import { decideStudentLeaveRequest, fetchStudentLeaveRequests } from '../../services/studentLeave'
import './LeaveDesk.css'

const FILTERS = [
  { id: 'Pending', label: 'Pending' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' },
  { id: 'All', label: 'All requests' },
]

const EMPTY_SUMMARY = { total: 0, pending: 0, approved: 0, rejected: 0 }

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

function emailLine(email) {
  if (!email) return ''
  if (email.sent) return ' The parent was emailed about this decision.'
  return ` The parent email could not be sent: ${email.error || 'email delivery is not configured on this server.'}`
}

export default function StudentLeaveQueue({ mode = 'teacher' }) {
  const isAdmin = mode === 'admin'
  const [filter, setFilter] = useState('Pending')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [decision, setDecision] = useState(null)
  const [note, setNote] = useState('')
  const [modalError, setModalError] = useState('')
  const [busy, setBusy] = useState(false)

  const applyBody = useCallback((body) => {
    setRows(Array.isArray(body.requests) ? body.requests : [])
    setSummary(body.summary || EMPTY_SUMMARY)
    setError('')
  }, [])

  const applyAssignments = useCallback((body) => {
    setAssignments(Array.isArray(body.assignments) ? body.assignments : [])
  }, [])

  const load = useCallback(async (status) => {
    try {
      const [body, overview] = await Promise.all([
        fetchStudentLeaveRequests(status === 'All' ? '' : status),
        fetchClassTeacherOverview().catch(() => ({ assignments: [] })),
      ])
      applyBody(body)
      applyAssignments(overview)
    } catch (err) {
      setError(err.message || 'Student leave requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [applyBody, applyAssignments])

  useEffect(() => {
    let active = true
    Promise.all([
      fetchStudentLeaveRequests(filter === 'All' ? '' : filter),
      fetchClassTeacherOverview().catch(() => ({ assignments: [] })),
    ])
      .then(([body, overview]) => {
        if (!active) return
        applyBody(body)
        applyAssignments(overview)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Student leave requests could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filter, applyBody, applyAssignments])

  const openDecision = (row, status) => {
    setDecision({ row, status })
    setNote('')
    setModalError('')
  }

  const closeDecision = () => {
    if (busy) return
    setDecision(null)
    setNote('')
    setModalError('')
  }

  const applyDecision = async (event) => {
    event.preventDefault()
    if (!decision) return
    const trimmed = note.trim()
    if (decision.status === 'Rejected' && trimmed.length < 5) {
      setModalError('Write the reason for rejection (at least 5 characters). It is sent to the parent.')
      return
    }
    setBusy(true)
    setModalError('')
    try {
      const body = await decideStudentLeaveRequest(decision.row.id, { status: decision.status, note: trimmed })
      const verb = decision.status === 'Approved' ? 'approved' : 'rejected'
      setNotice(`${body.request?.studentName || 'Student'} leave ${verb}.${emailLine(body.email)}`)
      setDecision(null)
      setNote('')
      await load(filter)
    } catch (err) {
      setModalError(err.message || 'The decision could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const noAssignment = !isAdmin && !loading && !assignments.length

  return (
    <div className="lvd-page">
      <header className="lvd-hero">
        <div>
          <p className="admin-kicker">{isAdmin ? 'School admin · Student leave' : 'Class teacher · Student leave'}</p>
          <h2>{isAdmin ? 'Student leave requests' : 'Leave requests for your class'}</h2>
          <p>
            {isAdmin
              ? 'Parents file leave for their child and it goes to the class teacher of that class. Requests from classes without a class teacher land here for the school admin.'
              : assignments.length
                ? `You are class teacher of ${assignments.map((row) => row.className).join(', ')}. Parent leave requests for this class appear here.`
                : 'Student leave requests for your class appear here once the school admin assigns you as a class teacher.'}
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
          <article className="lvd-stat">
            <strong>{summary.total}</strong>
            <span>Total</span>
          </article>
        </div>
      </header>

      {error ? <p className="lvd-alert is-error">{error}</p> : null}
      {notice ? <p className="lvd-alert is-success">{notice}</p> : null}

      {noAssignment ? (
        <section className="lvd-panel">
          <h3>You are not a class teacher yet</h3>
          <p className="lvd-empty">
            Ask the school admin to set your Staff role to “Class Teacher” and assign your class in Teacher Management. After
            that, parent leave requests for that class will appear here.
          </p>
          <Link className="lvd-btn primary" to="/teacher">
            Back to Teacher Desk
          </Link>
        </section>
      ) : (
        <section className="lvd-panel">
          <div className="lvd-tabs">
            {FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`lvd-tab ${filter === tab.id ? 'is-active' : ''}`}
                onClick={() => {
                  setLoading(true)
                  setFilter(tab.id)
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? <p className="lvd-empty">Loading student leave requests…</p> : null}
          {!loading && !rows.length ? (
            <p className="lvd-empty">
              {filter === 'Pending' ? 'No pending student leave request right now.' : 'No student leave request in this view.'}
            </p>
          ) : null}

          {!loading && rows.length ? (
            <div className="lvd-table-wrap">
              <table className="lvd-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Parent</th>
                    <th>Leave</th>
                    <th>Reason</th>
                    <th>Class teacher</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="lvd-name">{row.studentName}</span>
                        <small>{row.className}</small>
                      </td>
                      <td>
                        {row.parentName}
                        <small>{row.parentEmail}</small>
                      </td>
                      <td>
                        {row.typeLabel}
                        <small>{formatRange(row)} · {row.days} day{row.days === 1 ? '' : 's'}</small>
                      </td>
                      <td>
                        <p className="lvd-reason">{row.reason}</p>
                        {row.decidedAt ? (
                          <small>
                            {row.status} by {row.decidedByName || 'school'} · {formatWhen(row.decidedAt)}
                            {row.decisionNote ? ` · “${row.decisionNote}”` : ''}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        {row.assignedTo === 'teacher' ? row.classTeacherName : <span className="lvd-footnote">Not assigned — admin</span>}
                      </td>
                      <td>{formatWhen(row.createdAt)}</td>
                      <td>
                        <span className={`lvd-chip is-${String(row.status).toLowerCase()}`}>{row.status}</span>
                      </td>
                      <td>
                        {row.status === 'Pending' ? (
                          <div className="lvd-actions">
                            <button
                              type="button"
                              className="lvd-btn success"
                              onClick={() => openDecision(row, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="lvd-btn danger"
                              onClick={() => openDecision(row, 'Rejected')}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="lvd-footnote">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      )}

      {decision ? (
        <div className="lvd-modal" role="dialog" aria-modal="true" aria-label="Student leave decision">
          <form className="lvd-modal__card" onSubmit={applyDecision}>
            <h3>{decision.status === 'Approved' ? 'Approve student leave' : 'Reject student leave'}</h3>
            <p>
              {decision.row.studentName} · {decision.row.className} · {formatRange(decision.row)} ({decision.row.days} day
              {decision.row.days === 1 ? '' : 's'})
            </p>
            <label className="lvd-field">
              <span>{decision.status === 'Rejected' ? 'Reason for rejection (required)' : 'Note for the parent (optional)'}</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                placeholder={
                  decision.status === 'Rejected'
                    ? 'For example: A class test is scheduled on these dates, please choose another week.'
                    : 'For example: Approved. Please collect the missed classwork on Monday.'
                }
              />
            </label>
            {decision.status === 'Rejected' ? (
              <p className="lvd-footnote">This reason is emailed to the parent and shown in their Parent Portal.</p>
            ) : null}
            {modalError ? <p className="lvd-alert is-error">{modalError}</p> : null}
            <div className="lvd-modal__actions">
              <button type="button" className="lvd-btn ghost" onClick={closeDecision} disabled={busy}>
                Cancel
              </button>
              <button
                type="submit"
                className={`lvd-btn ${decision.status === 'Approved' ? 'success' : 'danger'}`}
                disabled={busy}
              >
                {busy ? 'Saving…' : decision.status === 'Approved' ? 'Approve and notify parent' : 'Reject and notify parent'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
