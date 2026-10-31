import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { decideLeaveRequest, fetchLeaveRequests } from '../../services/leaveRequests'
import { getAuthUser } from '../../utils/session'
import '../shared/LeaveDesk.css'

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
  if (email.sent) return ' The teacher was emailed about this decision.'
  return ` The teacher email could not be sent: ${email.error || 'email delivery is not configured on this server.'}`
}

function substitutionLine(substitution) {
  if (!substitution) return ''
  if (substitution.error) return ` ${substitution.error}`
  if (!substitution.created) return substitution.message ? ` ${substitution.message}` : ''
  const assigned = substitution.assigned || 0
  const needsAdmin = substitution.needsAdmin || 0
  const emailed = substitution.emailed || 0
  return ` Substitutes: ${substitution.created} period(s) planned, ${assigned} assigned automatically, ${needsAdmin} need manual cover (see Class Schedule), ${emailed} teacher mail(s) sent.`
}

export default function LeaveApprovals() {
  const isAdmin = ['admin', 'super_admin'].includes(String(getAuthUser()?.role || '').toLowerCase())
  const [filter, setFilter] = useState('Pending')
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
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

  const load = useCallback(async (status) => {
    try {
      applyBody(await fetchLeaveRequests(status === 'All' ? '' : status))
    } catch (err) {
      setError(err.message || 'Leave requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [applyBody])

  useEffect(() => {
    if (!isAdmin) return undefined
    let active = true
    fetchLeaveRequests(filter === 'All' ? '' : filter)
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
  }, [filter, applyBody, isAdmin])

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
      setModalError('Write the reason for rejection (at least 5 characters). It is sent to the teacher.')
      return
    }
    setBusy(true)
    setModalError('')
    try {
      const body = await decideLeaveRequest(decision.row.id, { status: decision.status, note: trimmed })
      const verb = decision.status === 'Approved' ? 'approved' : 'rejected'
      setNotice(
        `${body.request?.teacherName || 'Leave request'} ${verb}.${emailLine(body.email)}${substitutionLine(body.substitution)}`,
      )
      setDecision(null)
      setNote('')
      await load(filter)
    } catch (err) {
      setModalError(err.message || 'The decision could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="lvd-page">
        <header className="lvd-hero">
          <div>
            <p className="admin-kicker">Attendance · Leave approvals</p>
            <h2>Admins only</h2>
            <p>
              Only the school admin can review and decide teacher leave requests. Your own requests and their status are
              on the My Leave page.
            </p>
            <Link className="lvd-btn primary" to="/teacher/leave">
              Go to My Leave
            </Link>
          </div>
        </header>
      </div>
    )
  }

  return (
    <div className="lvd-page">
      <header className="lvd-hero">
        <div>
          <p className="admin-kicker">Attendance · Leave approvals</p>
          <h2>Teacher leave requests</h2>
          <p>
            Requests filed by teachers from their Teacher Desk appear here. Approve or reject with a reason — the
            decision and your note are shown on the teacher&apos;s My Leave page and emailed to them.
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

        {loading ? <p className="lvd-empty">Loading leave requests…</p> : null}
        {!loading && !rows.length ? (
          <p className="lvd-empty">
            {filter === 'Pending' ? 'No pending leave request right now.' : 'No leave request in this view.'}
          </p>
        ) : null}

        {!loading && rows.length ? (
          <div className="lvd-table-wrap">
            <table className="lvd-table">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Leave</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="lvd-name">{row.teacherName}</span>
                      <small>{row.teacherEmail}</small>
                    </td>
                    <td>{row.typeLabel}</td>
                    <td>
                      {formatRange(row)}
                      <small>{row.days} day{row.days === 1 ? '' : 's'}</small>
                    </td>
                    <td>
                      <p className="lvd-reason">{row.reason}</p>
                      {row.decidedAt ? (
                        <small>
                          {row.status} by {row.decidedByName || 'admin'} · {formatWhen(row.decidedAt)}
                          {row.decisionNote ? ` · “${row.decisionNote}”` : ''}
                        </small>
                      ) : null}
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

      {decision ? (
        <div className="lvd-modal" role="dialog" aria-modal="true" aria-label="Leave decision">
          <form className="lvd-modal__card" onSubmit={applyDecision}>
            <h3>{decision.status === 'Approved' ? 'Approve leave' : 'Reject leave'}</h3>
            <p>
              {decision.row.teacherName} · {decision.row.typeLabel} · {formatRange(decision.row)} ({decision.row.days}{' '}
              day{decision.row.days === 1 ? '' : 's'})
            </p>
            <label className="lvd-field">
              <span>{decision.status === 'Rejected' ? 'Reason for rejection (required)' : 'Note for the teacher (optional)'}</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                placeholder={
                  decision.status === 'Rejected'
                    ? 'For example: A class test is scheduled on these dates, please choose another week.'
                    : 'For example: Approved. Please share the lesson plan with the substitute teacher.'
                }
              />
            </label>
            {decision.status === 'Rejected' ? (
              <p className="lvd-footnote">This reason is sent to the teacher by email and shown on their My Leave page.</p>
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
                {busy ? 'Saving…' : decision.status === 'Approved' ? 'Approve and notify teacher' : 'Reject and notify teacher'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
