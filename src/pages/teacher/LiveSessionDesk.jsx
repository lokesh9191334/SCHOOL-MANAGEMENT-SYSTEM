import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { decideLiveSession, fetchLiveSessions } from '../../services/liveSessions'
import {
  countdownLabel,
  formatWhen,
  initialsOf,
  relativeWhen,
  todayIso,
} from '../shared/liveSessionUi'
import '../shared/LiveSession.css'

const EMPTY_SUMMARY = { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 }

const TABS = [
  { id: 'Pending', label: 'Requests' },
  { id: 'Accepted', label: 'Confirmed' },
  { id: 'History', label: 'History' },
]

const REJECT_HINTS = [
  'Exam duty at this time',
  'Staff meeting at this time',
  'Class test is scheduled',
  'I am on approved leave',
  'Please book after school hours',
]

function statusClass(status) {
  if (status === 'Accepted') return 'is-accepted'
  if (status === 'Pending') return 'is-pending'
  return 'is-rejected'
}

function statusLabel(status) {
  if (status === 'Rejected') return 'Cancelled'
  return status
}

function meetingDateTime(row) {
  return `${row.date || ''}T${row.startTime || '00:00'}:00`
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
  const listRef = useRef(null)
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

  const nextAccepted = useMemo(
    () =>
      sessions
        .filter((row) => row.status === 'Accepted' && row.date >= todayIso())
        .sort((a, b) => meetingDateTime(a).localeCompare(meetingDateTime(b)))[0] || null,
    [sessions],
  )

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

  const copyParentEmail = async (email) => {
    try {
      await copyText(email)
      setNotice(`Parent email copied · ${email}`)
    } catch (err) {
      setError(err.message || 'The email address could not be copied.')
    }
  }

  const tabCount = (id) => {
    if (id === 'Pending') return summary.pending
    if (id === 'Accepted') return summary.accepted
    return summary.rejected + summary.cancelled
  }

  return (
    <div className="lvs-page">
      <header className="lvs-hero">
        <div className="lvs-hero__main">
          <p className="lvs-kicker">Teacher desk · Live session</p>
          <h1>{me?.name ? `Live sessions · ${me.name}` : 'Parent live session requests'}</h1>
          <p className="lvs-hero__sub">
            Parents book a 15-minute video session with you. Accept it to share the meeting link, or cancel
            it with a reason that is emailed to the parent automatically.
          </p>
          <div className="lvs-flags">
            <span>15-minute calls</span>
            <span>Reason required on cancel</span>
            <span>Parent emailed automatically</span>
          </div>
        </div>
        <div className="lvs-hero__side">
          <div className="lvs-stats">
            <article className="lvs-stat is-gold">
              <strong>{summary.pending}</strong>
              <span>Waiting</span>
            </article>
            <article className="lvs-stat is-teal">
              <strong>{summary.accepted}</strong>
              <span>Confirmed</span>
            </article>
            <article className="lvs-stat">
              <strong>{summary.rejected + summary.cancelled}</strong>
              <span>Cancelled</span>
            </article>
          </div>
          {nextAccepted ? (
            <div className="lvs-focus">
              <span className="lvs-focus__label">Next confirmed session</span>
              <strong>
                {nextAccepted.dateLabel} · {nextAccepted.timeLabel}
              </strong>
              <small>
                {nextAccepted.parentName || 'Parent'} · {nextAccepted.studentName || 'Student'}
              </small>
              <a
                className="lvs-mini-link"
                href={nextAccepted.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Join meeting
              </a>
            </div>
          ) : summary.pending ? (
            <button
              type="button"
              className="lvs-focus is-idle lvs-focus--button"
              onClick={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              <span className="lvs-focus__label">Action needed</span>
              <strong>
                {summary.pending} request{summary.pending === 1 ? '' : 's'} waiting for you
              </strong>
              <small>Open one below to accept it or cancel with a reason.</small>
            </button>
          ) : (
            <div className="lvs-focus is-idle">
              <span className="lvs-focus__label">Next confirmed session</span>
              <strong>Nothing confirmed yet</strong>
              <small>New parent requests will appear here with an email alert.</small>
            </div>
          )}
        </div>
      </header>

      {error ? (
        <p className="lvs-alert is-error" role="alert">
          <span className="lvs-alert__dot" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
      {notice ? (
        <p className="lvs-alert is-success" role="status">
          <span className="lvs-alert__dot" aria-hidden />
          <span>{notice}</span>
        </p>
      ) : null}

      <section className="lvs-section" ref={listRef} aria-label="Live session requests">
        <div className="lvs-section__head">
          <h2>Requests &amp; sessions</h2>
          <div className="lvs-tabs" role="tablist">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={tab === entry.id}
                className={`lvs-tab ${tab === entry.id ? 'is-active' : ''}`}
                onClick={() => setTab(entry.id)}
              >
                {entry.label}
                <span className="lvs-tab__count">{tabCount(entry.id)}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="lvs-skeleton" aria-label="Loading requests">
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {!loading && !rows.length ? (
          <div className="lvs-empty">
            <span className="lvs-empty__icon" aria-hidden>
              ◷
            </span>
            <strong>
              {tab === 'Pending'
                ? 'No pending live session request right now'
                : tab === 'Accepted'
                  ? 'No confirmed live session yet'
                  : 'No cancelled live session in this view'}
            </strong>
            <p>
              {tab === 'Pending'
                ? 'When a parent books a slot with you it appears here and in your email.'
                : tab === 'Accepted'
                  ? 'Accept a pending request to share its meeting link with the parent.'
                  : 'Cancelled and rejected sessions are kept here with the reason shared.'}
            </p>
          </div>
        ) : null}

        {!loading && rows.length ? (
          <div className="lvs-grid-sessions">
            {rows.map((row) => (
              <article key={row.id} className={`lvs-session is-${row.status.toLowerCase()}`}>
                <div className="lvs-session__top">
                  <div className="lvs-when">
                    <strong>{row.dateLabel}</strong>
                    <span>{row.timeLabel} IST · 15 min</span>
                  </div>
                  <span className={`lvs-status ${statusClass(row.status)}`}>{statusLabel(row.status)}</span>
                </div>

                <div className="lvs-person">
                  <span className="lvs-avatar is-sm is-indigo">{initialsOf(row.parentName)}</span>
                  <div className="lvs-person__body">
                    <strong>{row.parentName || 'Parent'}</strong>
                    <small>{row.parentEmail || 'Email not set'}</small>
                  </div>
                  {row.parentEmail ? (
                    <button
                      type="button"
                      className="lvs-icon-btn"
                      onClick={() => copyParentEmail(row.parentEmail)}
                      aria-label="Copy parent email"
                      title="Copy parent email"
                    >
                      ⧉
                    </button>
                  ) : null}
                </div>

                <div className="lvs-tags">
                  <span>{row.studentName || 'Student'}</span>
                  <span>{row.className || 'Class not set'}</span>
                  <span>{relativeWhen(row.createdAt)}</span>
                </div>

                {row.agenda ? (
                  <p className="lvs-request__agenda">
                    <b>Parent’s agenda</b>
                    {row.agenda}
                  </p>
                ) : null}

                {row.status === 'Pending' ? (
                  <div className="lvs-actions">
                    <button
                      type="button"
                      className="lvs-btn success"
                      onClick={() => openDecision(row, 'Accepted')}
                    >
                      Accept session
                    </button>
                    <button
                      type="button"
                      className="lvs-btn danger"
                      onClick={() => openDecision(row, 'Rejected')}
                    >
                      Cancel with reason
                    </button>
                  </div>
                ) : null}

                {row.status === 'Accepted' ? (
                  <>
                    <div className="lvs-actions">
                      <a
                        className="lvs-btn is-join"
                        href={row.meetingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Join live session
                      </a>
                      <button type="button" className="lvs-btn ghost" onClick={() => copyLink(row.meetingUrl)}>
                        Copy link
                      </button>
                      <span className={`lvs-count ${row.status === 'Accepted' ? 'is-live' : ''}`}>
                        {countdownLabel(row.date)}
                      </span>
                    </div>
                    <div className="lvs-meeting">
                      <code>{row.meetingUrl}</code>
                      <button
                        type="button"
                        className="lvs-icon-btn"
                        onClick={() => copyLink(row.meetingUrl)}
                        aria-label="Copy meeting link"
                        title="Copy meeting link"
                      >
                        ⧉
                      </button>
                    </div>
                  </>
                ) : null}

                {row.decisionNote ? (
                  <div className={`lvs-note ${row.status === 'Accepted' ? 'is-approved' : ''}`}>
                    <span>{row.status === 'Accepted' ? 'Your note to the parent' : 'Reason shared with the parent'}</span>
                    <p>{row.decisionNote}</p>
                  </div>
                ) : null}

                <p className="lvs-footnote">
                  {row.decidedAt
                    ? `${statusLabel(row.status)} by ${row.decidedByRole === 'parent' ? 'parent' : 'you'} · ${formatWhen(row.decidedAt)}`
                    : `Requested ${formatWhen(row.createdAt)}`}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {decision ? (
        <div className="lvs-modal" role="dialog" aria-modal="true" aria-label="Live session decision">
          <form className="lvs-modal__card" onSubmit={applyDecision}>
            <div className="lvs-modal__head">
              <span className={`lvs-modal__icon ${decision.status === 'Rejected' ? 'is-danger' : ''}`} aria-hidden>
                {decision.status === 'Accepted' ? '✓' : '!'}
              </span>
              <div>
                <h3>{decision.status === 'Accepted' ? 'Accept this live session' : 'Cancel this live session'}</h3>
                <p>
                  {decision.status === 'Accepted'
                    ? 'The meeting link is shared with the parent and unlocked on both sides.'
                    : 'The parent is emailed your reason right away and sees it on their dashboard.'}
                </p>
              </div>
            </div>

            <div className="lvs-modal__session">
              <span>{decision.row.parentName || 'Parent'}</span>
              <span>{decision.row.studentName || 'Student'}</span>
              <span>{decision.row.dateLabel}</span>
              <span>{decision.row.timeLabel}</span>
            </div>

            {decision.status === 'Rejected' ? (
              <div className="lvs-chips">
                {REJECT_HINTS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className="lvs-chip-btn"
                    onClick={() => setNote(hint)}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            ) : null}

            <label className="lvs-field">
              <span className="lvs-field__label">
                {decision.status === 'Rejected' ? 'Reason for cancelling (required)' : 'Note for the parent'}
                <small>
                  {decision.status === 'Rejected' ? 'min 5' : 'optional'} · {note.length}/500
                </small>
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

            {modalError ? <p className="lvs-alert is-error">{modalError}</p> : null}

            <div className="lvs-modal__actions">
              <button type="button" className="lvs-btn ghost" onClick={closeDecision} disabled={busy}>
                Back
              </button>
              <button
                type="submit"
                className={`lvs-btn ${decision.status === 'Accepted' ? 'success' : 'danger'}`}
                disabled={busy}
              >
                {busy
                  ? 'Saving…'
                  : decision.status === 'Accepted'
                    ? 'Accept and notify parent'
                    : 'Cancel and notify parent'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
