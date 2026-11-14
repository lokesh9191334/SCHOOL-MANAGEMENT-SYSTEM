import { useCallback, useEffect, useMemo, useState } from 'react'
import { decideLiveSession, fetchLiveSessions } from '../../services/liveSessions'
import '../shared/LeaveDesk.css'
import '../shared/LiveSession.css'

const EMPTY_SUMMARY = { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 }

const TABS = [
  { id: 'Pending', label: 'Pending requests' },
  { id: 'Accepted', label: 'Confirmed' },
  { id: 'History', label: 'History' },
]

function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function statusClass(status) {
  if (status === 'Accepted') return 'is-approved'
  if (status === 'Pending') return 'is-pending'
  return 'is-rejected'
}

function statusLabel(status) {
  if (status === 'Rejected') return 'Cancelled'
  return status
}

function emailLine(email) {
  if (!email) return ''
  if (email.sent) return ' The parent was emailed about this decision.'
  return ` The parent email could not be sent: ${email.error || 'email delivery is not configured on this server.'}`
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  throw new Error('Copy is not supported in this browser.')
}

export default function TeacherLiveSession() {
  const [tab, setTab] = useState('Pending')
  const [sessions, setSessions] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [decision, setDecision] = useState(null)
  const [note, setNote] = useState('')
  const [modalError, setModalError] = useState('')
  const [busy, setBusy] = useState(false)

  const applyBody = useCallback((body) => {
    setSessions(Array.isArray(body?.sessions) ? body.sessions : [])
    setSummary(body?.summary || EMPTY_SUMMARY)
    setMe(body?.me || null)
    setError('')
  }, [])

  const load = useCallback(async () => {
    try {
      applyBody(await fetchLiveSessions())
    } catch (err) {
      setError(err.message || 'Live session requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [applyBody])

  useEffect(() => {
    let active = true
    fetchLiveSessions()
      .then((body) => {
        if (active) applyBody(body)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Live session requests could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [applyBody])

  const rows = useMemo(() => {
    if (tab === 'Pending') return sessions.filter((row) => row.status === 'Pending')
    if (tab === 'Accepted') return sessions.filter((row) => row.status === 'Accepted')
    return sessions.filter((row) => !['Pending', 'Accepted'].includes(row.status))
  }, [sessions, tab])

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
      setModalError('Write the reason for cancelling this session (at least 5 characters). It is emailed to the parent.')
      return
    }
    setBusy(true)
    setModalError('')
    try {
      const body = await decideLiveSession(decision.row.id, { status: decision.status, note: trimmed })
      setNotice(
        decision.status === 'Accepted'
          ? `Live session with ${body.session?.parentName || 'the parent'} confirmed.${emailLine(body.email)}`
          : `Live session cancelled. The reason was shared with ${body.session?.parentName || 'the parent'}.${emailLine(body.email)}`,
      )
      setDecision(null)
      setNote('')
      await load()
    } catch (err) {
      setModalError(err.message || 'The decision could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async (url) => {
    try {
      await copyText(url)
      setNotice('Meeting link copied. Share it with the parent if their email did not arrive.')
    } catch (err) {
      setError(err.message || 'The link could not be copied.')
    }
  }

  return (
    <div className="lvd-page">
      <header className="lvd-hero">
        <div>
          <p className="admin-kicker">Teacher Desk · Live Session</p>
          <h2>{me?.name ? `Live sessions · ${me.name}` : 'Parent live session requests'}</h2>
          <p>
            Parents book a 15-minute video session with you. Accept it to share the meeting link, or
            reject it with a reason that is emailed to the parent automatically.
          </p>
        </div>
        <div className="lvd-stats">
          <article className="lvd-stat is-pending">
            <strong>{summary.pending}</strong>
            <span>Pending</span>
          </article>
          <article className="lvd-stat is-approved">
            <strong>{summary.accepted}</strong>
            <span>Confirmed</span>
          </article>
          <article className="lvd-stat is-rejected">
            <strong>{summary.rejected + summary.cancelled}</strong>
            <span>Cancelled</span>
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
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`lvd-tab ${tab === entry.id ? 'is-active' : ''}`}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
              {entry.id === 'Pending' && summary.pending ? ` (${summary.pending})` : ''}
            </button>
          ))}
        </div>

        {loading ? <p className="lvd-empty">Loading live session requests…</p> : null}
        {!loading && !rows.length ? (
          <p className="lvd-empty">
            {tab === 'Pending'
              ? 'No pending live session request right now.'
              : tab === 'Accepted'
                ? 'No confirmed live session yet. Accept a pending request to share its meeting link.'
                : 'No cancelled live session in this view.'}
          </p>
        ) : null}

        {!loading && rows.length ? (
          <div className="lvs-grid-sessions">
            {rows.map((row) => (
              <article key={row.id} className={`lvs-session ${row.status === 'Accepted' ? 'is-live' : ''}`}>
                <div className="lvs-session__head">
                  <div>
                    <span className="lvs-session__when">
                      {row.dateLabel} · {row.timeLabel}
                    </span>
                    <span className="lvs-session__who">
                      {row.studentName || 'Student'}
                      {row.className ? ` · ${row.className}` : ''}
                    </span>
                  </div>
                  <span className={`lvd-chip ${statusClass(row.status)}`}>{statusLabel(row.status)}</span>
                </div>
                <dl className="lvd-meta">
                  <div>
                    <dt>Parent</dt>
                    <dd>{row.parentName || '—'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{row.parentEmail || '—'}</dd>
                  </div>
                  <div>
                    <dt>Requested</dt>
                    <dd>{formatWhen(row.createdAt)}</dd>
                  </div>
                </dl>
                {row.agenda ? <p className="lvd-reason">{row.agenda}</p> : null}

                {row.status === 'Pending' ? (
                  <div className="lvs-actions">
                    <button
                      type="button"
                      className="lvd-btn success"
                      onClick={() => openDecision(row, 'Accepted')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="lvd-btn danger"
                      onClick={() => openDecision(row, 'Rejected')}
                    >
                      Reject with reason
                    </button>
                  </div>
                ) : null}

                {row.status === 'Accepted' ? (
                  <>
                    <div className="lvs-actions">
                      <a className="lvd-btn lvs-join" href={row.meetingUrl} target="_blank" rel="noopener noreferrer">
                        Join live session
                      </a>
                      <button type="button" className="lvd-btn ghost" onClick={() => copyLink(row.meetingUrl)}>
                        Copy link
                      </button>
                    </div>
                    <p className="lvs-meeting">{row.meetingUrl}</p>
                  </>
                ) : null}

                {row.decisionNote ? (
                  <div className={`lvd-note ${row.status === 'Accepted' ? 'is-approved' : ''}`}>
                    <span>{row.status === 'Accepted' ? 'Your note to the parent' : 'Reason shared with the parent'}</span>
                    <p>{row.decisionNote}</p>
                  </div>
                ) : null}

                {row.decidedAt ? (
                  <p className="lvd-footnote">
                    {statusLabel(row.status)} by {row.decidedByRole === 'parent' ? 'parent' : 'you'} · {formatWhen(row.decidedAt)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {decision ? (
        <div className="lvd-modal" role="dialog" aria-modal="true" aria-label="Live session decision">
          <form className="lvd-modal__card" onSubmit={applyDecision}>
            <h3>{decision.status === 'Accepted' ? 'Accept live session' : 'Reject live session'}</h3>
            <p>
              {decision.row.parentName || 'Parent'} · {decision.row.studentName || 'Student'} ·{' '}
              {decision.row.dateLabel} · {decision.row.timeLabel}
            </p>
            <label className="lvd-field">
              <span>
                {decision.status === 'Rejected'
                  ? 'Reason for cancelling (required)'
                  : 'Note for the parent (optional)'}
              </span>
              <textarea
                value={note}
                maxLength={500}
                onChange={(event) => setNote(event.target.value)}
                placeholder={
                  decision.status === 'Rejected'
                    ? 'For example: I have an exam duty at that time, please book after 2 PM.'
                    : 'For example: Confirmed. Please keep the homework notebook ready.'
                }
              />
            </label>
            <p className="lvd-footnote">
              {decision.status === 'Rejected'
                ? 'This reason is emailed to the parent and shown as “Your live session was cancelled by teacher” in their portal.'
                : 'Accepting emails the meeting link to the parent and unlocks the Join button on both sides.'}
            </p>
            {modalError ? <p className="lvd-alert is-error">{modalError}</p> : null}
            <div className="lvd-modal__actions">
              <button type="button" className="lvd-btn ghost" onClick={closeDecision} disabled={busy}>
                Back
              </button>
              <button
                type="submit"
                className={`lvd-btn ${decision.status === 'Accepted' ? 'success' : 'danger'}`}
                disabled={busy}
              >
                {busy
                  ? 'Saving…'
                  : decision.status === 'Accepted'
                    ? 'Accept and notify parent'
                    : 'Reject and notify parent'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
