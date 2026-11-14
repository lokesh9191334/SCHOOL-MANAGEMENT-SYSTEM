import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelLiveSession,
  fetchLiveSessionMeta,
  fetchLiveSessionSlots,
  fetchLiveSessions,
  scheduleLiveSession,
} from '../../services/liveSessions'
import '../shared/LeaveDesk.css'
import '../shared/LiveSession.css'

const EMPTY_SUMMARY = { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 }

function todayISO() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function addDaysISO(date, days) {
  const when = new Date(`${date}T12:00:00Z`)
  when.setUTCDate(when.getUTCDate() + days)
  return when.toISOString().slice(0, 10)
}

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

function statusLabel(row) {
  if (row.status === 'Rejected') return 'Cancelled by teacher'
  if (row.status === 'Cancelled') return 'Cancelled by you'
  return row.status
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  throw new Error('Copy is not supported in this browser.')
}

export default function ParentLiveSession() {
  const [children, setChildren] = useState([])
  const [childId, setChildId] = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [date, setDate] = useState(todayISO())
  const [agenda, setAgenda] = useState('')
  const [slotPick, setSlotPick] = useState('')
  const [maxDaysAhead, setMaxDaysAhead] = useState(14)
  const [metaLoading, setMetaLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [cancelNotice, setCancelNotice] = useState(null)
  const [slotRefresh, setSlotRefresh] = useState(0)
  const [slotState, setSlotState] = useState({ key: '', data: null, error: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [cancelRow, setCancelRow] = useState(null)
  const [cancelNote, setCancelNote] = useState('')
  const [cancelError, setCancelError] = useState('')
  const [cancelBusy, setCancelBusy] = useState(false)

  const child = useMemo(() => children.find((row) => row.id === childId) || null, [children, childId])
  const teachers = useMemo(() => (child?.teachers || []), [child])
  const teacher = useMemo(() => teachers.find((row) => row.email === teacherEmail) || null, [teachers, teacherEmail])
  const slotKey = child && teacherEmail && date ? `${child.id}|${teacherEmail}|${date}|${slotRefresh}` : ''
  const slotData = slotState.key === slotKey ? slotState.data : null
  const slotError = slotState.key === slotKey ? slotState.error : ''
  const slotsLoading = Boolean(slotKey) && slotState.key !== slotKey
  const minDate = todayISO()
  const maxDate = addDaysISO(minDate, maxDaysAhead)

  const applySessions = useCallback((body) => {
    setSessions(Array.isArray(body?.sessions) ? body.sessions : [])
    setSummary(body?.summary || EMPTY_SUMMARY)
    setCancelNotice(body?.notice || null)
  }, [])

  const refreshSessions = useCallback(async () => {
    try {
      applySessions(await fetchLiveSessions())
    } catch (err) {
      setError(err.message || 'Your live sessions could not be loaded.')
    }
  }, [applySessions])

  useEffect(() => {
    let active = true
    Promise.all([fetchLiveSessionMeta(), fetchLiveSessions()])
      .then(([metaBody, sessionBody]) => {
        if (!active) return
        const list = Array.isArray(metaBody.children) ? metaBody.children : []
        setChildren(list)
        setChildId((prev) => prev || list[0]?.id || '')
        setMaxDaysAhead(Number(metaBody.maxDaysAhead) > 0 ? Number(metaBody.maxDaysAhead) : 14)
        applySessions(sessionBody)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Your children and live sessions could not be loaded.')
      })
      .finally(() => {
        if (active) setMetaLoading(false)
      })
    return () => {
      active = false
    }
  }, [applySessions])

  useEffect(() => {
    if (!slotKey) return undefined
    let active = true
    fetchLiveSessionSlots({ studentId: childId, teacherEmail, date })
      .then((body) => {
        if (active) setSlotState({ key: slotKey, data: body, error: '' })
      })
      .catch((err) => {
        if (active) setSlotState({ key: slotKey, data: null, error: err.message || 'Free slots could not be loaded.' })
      })
    return () => {
      active = false
    }
  }, [slotKey, childId, teacherEmail, date])

  const changeChild = (event) => {
    setChildId(event.target.value)
    setTeacherEmail('')
    setSlotPick('')
    setAgenda('')
  }

  const changeTeacher = (email) => {
    setTeacherEmail(email)
    setSlotPick('')
  }

  const changeDate = (event) => {
    setDate(event.target.value)
    setSlotPick('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!child) {
      setError('Choose your child for this session.')
      return
    }
    if (!teacher) {
      setError("Choose a teacher who teaches your child's class.")
      return
    }
    if (!slotPick) {
      setError('Choose a free time slot.')
      return
    }
    setSaving(true)
    try {
      const body = await scheduleLiveSession({
        studentId: child.id,
        teacherEmail: teacher.email,
        date,
        startTime: slotPick,
        agenda: agenda.trim(),
      })
      setNotice(
        `Live session request sent to ${body.session?.teacherName || teacher.name}. You will get an email once it is accepted or cancelled.`,
      )
      setSlotPick('')
      setAgenda('')
      setSlotRefresh((value) => value + 1)
      await refreshSessions()
    } catch (err) {
      setError(err.message || 'The live session request could not be sent.')
      setSlotRefresh((value) => value + 1)
    } finally {
      setSaving(false)
    }
  }

  const openCancel = (row) => {
    setCancelRow(row)
    setCancelNote('')
    setCancelError('')
  }

  const closeCancel = () => {
    if (cancelBusy) return
    setCancelRow(null)
    setCancelNote('')
    setCancelError('')
  }

  const applyCancel = async (event) => {
    event.preventDefault()
    if (!cancelRow) return
    setCancelBusy(true)
    setCancelError('')
    try {
      const body = await cancelLiveSession(cancelRow.id, { note: cancelNote.trim() })
      setCancelRow(null)
      setNotice(
        `Live session cancelled.${body.email?.sent ? ' The teacher has been emailed.' : ''}`,
      )
      await refreshSessions()
      setSlotRefresh((value) => value + 1)
    } catch (err) {
      setCancelError(err.message || 'The session could not be cancelled.')
    } finally {
      setCancelBusy(false)
    }
  }

  const copyLink = async (url) => {
    try {
      await copyText(url)
      setNotice('Meeting link copied. Share it with anyone who should join.')
    } catch (err) {
      setError(err.message || 'The link could not be copied.')
    }
  }

  const upcoming = sessions.filter((row) => ['Pending', 'Accepted'].includes(row.status))
  const past = sessions.filter((row) => !['Pending', 'Accepted'].includes(row.status))

  return (
    <div className="lvd-page">
      <header className="lvd-hero">
        <div>
          <p className="admin-kicker">Parent Portal · Live Session</p>
          <h2>Meet your child’s teachers live</h2>
          <p>
            Pick your child, the teacher who actually takes their class, and a free 15-minute slot. The
            teacher accepts or rejects from their desk, and you get an email either way.
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
            <strong>{summary.rejected}</strong>
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

      {cancelNotice ? (
        <div className="lvs-notice" role="alert">
          <span className="lvs-notice__icon" aria-hidden>
            !
          </span>
          <div>
            <h3>Your live session was cancelled by teacher</h3>
            <p>
              {cancelNotice.teacherName} · {cancelNotice.dateLabel} · {cancelNotice.timeLabel}
              {cancelNotice.studentName ? ` · ${cancelNotice.studentName}` : ''}
            </p>
            {cancelNotice.decisionNote ? (
              <div className="lvs-notice__note">Reason from teacher: {cancelNotice.decisionNote}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {metaLoading ? (
        <section className="lvd-panel">
          <p className="lvd-empty">Loading your children and teachers…</p>
        </section>
      ) : !children.length ? (
        <section className="lvd-panel">
          <h3>Your account is not linked to a student yet</h3>
          <p className="lvd-empty">
            Live sessions need your child’s student record. Ask the school office to link your parent
            account to your child.
          </p>
        </section>
      ) : (
        <section className="lvd-panel">
          <h3>Schedule a live session</h3>
          <form className="lvs-flow" onSubmit={submit}>
            <div className="lvs-step">
              <div className="lvs-step__head">
                <span className="lvs-step__num">1</span>
                <div>
                  <h3>Select your child</h3>
                  <p>
                    {child && child.className
                      ? `${child.name || 'Child'} · ${child.className}${child.rollNo ? ` · Roll ${child.rollNo}` : ''}`
                      : 'Your child’s class is not set on the student record yet.'}
                  </p>
                </div>
              </div>
              <label className="lvd-field">
                <span>Child</span>
                <select value={childId} onChange={changeChild}>
                  {children.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name || 'Student'}
                      {row.className ? ` · ${row.className}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="lvs-step">
              <div className="lvs-step__head">
                <span className="lvs-step__num">2</span>
                <div>
                  <h3>Select the teacher</h3>
                  <p>
                    {child?.className
                      ? `Teachers who take ${child.className}, from the published timetable and class teacher assignment.`
                      : 'Set the class on the student record to see teachers.'}
                  </p>
                </div>
              </div>
              {!child?.className ? null : teachers.length ? (
                <div className="lvs-teachers">
                  {teachers.map((row) => (
                    <button
                      key={row.email}
                      type="button"
                      className={`lvs-teacher ${teacherEmail === row.email ? 'is-active' : ''}`}
                      onClick={() => changeTeacher(row.email)}
                      aria-pressed={teacherEmail === row.email}
                    >
                      {row.isClassTeacher ? <span className="lvs-badge">Class teacher</span> : null}
                      <strong>{row.name}</strong>
                      <small>{row.subjectLabel || 'Subject not set on the timetable'}</small>
                      <small>{row.email}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="lvd-empty">
                  No teacher is mapped to {child.className} yet. Ask the school admin to publish the class
                  timetable or assign a class teacher, then refresh this page.
                </p>
              )}
            </div>

            <div className="lvs-step">
              <div className="lvs-step__head">
                <span className="lvs-step__num">3</span>
                <div>
                  <h3>Select a date and time</h3>
                  <p>Slots come from the teacher’s real free periods, break times and after-school hours. Each session is 15 minutes.</p>
                </div>
              </div>
              <div className="lvs-row">
                <label className="lvd-field">
                  <span>Meeting date</span>
                  <input type="date" value={date} min={minDate} max={maxDate} onChange={changeDate} />
                </label>
                <p className="lvd-footnote">Book up to {maxDaysAhead} days ahead. Weekends and published holidays are unavailable.</p>
              </div>
              {!teacherEmail ? (
                <p className="lvd-footnote">Choose a teacher above to see the free slots.</p>
              ) : slotsLoading ? (
                <p className="lvd-empty">Checking {teacher?.name || 'the teacher'}’s free slots…</p>
              ) : slotError ? (
                <p className="lvd-alert is-error">{slotError}</p>
              ) : slotData?.slots?.length ? (
                <>
                  <div className="lvs-slots" role="group" aria-label="Free time slots">
                    {slotData.slots.map((slot) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        className={`lvs-slot ${slotPick === slot.startTime ? 'is-active' : ''}`}
                        onClick={() => setSlotPick(slot.startTime)}
                        aria-pressed={slotPick === slot.startTime}
                      >
                        {slot.startTime}–{slot.endTime}
                      </button>
                    ))}
                  </div>
                  {slotData.note ? <p className="lvd-footnote">{slotData.note}</p> : null}
                </>
              ) : (
                <p className="lvd-empty">
                  {slotData?.note || 'No free slot is left for this teacher on this date. Try another day.'}
                </p>
              )}
            </div>

            <div className="lvs-step">
              <div className="lvs-step__head">
                <span className="lvs-step__num">4</span>
                <div>
                  <h3>Confirm the schedule</h3>
                  <p>Your child, teacher and time are shown below. Add an agenda if you want.</p>
                </div>
              </div>
              <label className="lvd-field">
                <span>Agenda for the teacher (optional)</span>
                <textarea
                  value={agenda}
                  maxLength={500}
                  onChange={(event) => setAgenda(event.target.value)}
                  placeholder="For example: I want to discuss maths homework and the next class test."
                />
              </label>
              <div className="lvs-confirm">
                <div>
                  <strong>
                    {child?.name || 'Choose a child'} · {teacher?.name || 'Choose a teacher'}
                  </strong>
                  <small>
                    {slotData?.dateLabel || date}
                    {slotPick ? ` · ${slotPick}` : ' · choose a slot'}
                  </small>
                </div>
                <button
                  type="submit"
                  className="lvd-btn primary"
                  disabled={saving || !child || !teacher || !slotPick}
                >
                  {saving ? 'Sending request…' : 'Confirm schedule'}
                </button>
              </div>
              <p className="lvd-footnote">
                The teacher gets this request on their dashboard and by email. On rejection they must
                write a reason, which is emailed to you and shown on your Parent Home.
              </p>
            </div>
          </form>
        </section>
      )}

      <section className="lvd-panel">
        <h3>Upcoming sessions</h3>
        {!upcoming.length ? (
          <p className="lvd-empty">No upcoming live session. Book one above and it will appear here.</p>
        ) : (
          <div className="lvs-grid-sessions">
            {upcoming.map((row) => (
              <article key={row.id} className={`lvs-session ${row.status === 'Accepted' ? 'is-live' : ''}`}>
                <div className="lvs-session__head">
                  <div>
                    <span className="lvs-session__when">
                      {row.dateLabel} · {row.timeLabel}
                    </span>
                    <span className="lvs-session__who">
                      {row.teacherName}
                      {row.teacherSubject ? ` · ${row.teacherSubject}` : ''}
                    </span>
                  </div>
                  <span className={`lvd-chip ${statusClass(row.status)}`}>{statusLabel(row)}</span>
                </div>
                <dl className="lvd-meta">
                  <div>
                    <dt>Student</dt>
                    <dd>{row.studentName || '—'}</dd>
                  </div>
                  <div>
                    <dt>Class</dt>
                    <dd>{row.className || '—'}</dd>
                  </div>
                  <div>
                    <dt>Requested</dt>
                    <dd>{formatWhen(row.createdAt)}</dd>
                  </div>
                </dl>
                {row.agenda ? <p className="lvd-reason">{row.agenda}</p> : null}
                {row.status === 'Accepted' ? (
                  <>
                    <div className="lvs-actions">
                      <a className="lvd-btn lvs-join" href={row.meetingUrl} target="_blank" rel="noopener noreferrer">
                        Join live session
                      </a>
                      <button type="button" className="lvd-btn ghost" onClick={() => copyLink(row.meetingUrl)}>
                        Copy link
                      </button>
                      <button type="button" className="lvd-btn danger" onClick={() => openCancel(row)}>
                        Cancel
                      </button>
                    </div>
                    <p className="lvs-meeting">{row.meetingUrl}</p>
                  </>
                ) : (
                  <>
                    <p className="lvd-waiting">
                      Waiting for {row.teacherName} to accept or reject this request.
                    </p>
                    <div className="lvs-actions">
                      <button type="button" className="lvd-btn ghost" onClick={() => openCancel(row)}>
                        Cancel request
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="lvd-panel">
        <h3>Session history</h3>
        {!past.length ? (
          <p className="lvd-empty">Cancelled and rejected sessions will appear here.</p>
        ) : (
          <div className="lvs-grid-sessions">
            {past.map((row) => (
              <article key={row.id} className="lvs-session">
                <div className="lvs-session__head">
                  <div>
                    <span className="lvs-session__when">
                      {row.dateLabel} · {row.timeLabel}
                    </span>
                    <span className="lvs-session__who">
                      {row.teacherName} · {row.studentName || '—'}
                    </span>
                  </div>
                  <span className={`lvd-chip ${statusClass(row.status)}`}>{statusLabel(row)}</span>
                </div>
                {row.decisionNote ? (
                  <div className="lvd-note">
                    <span>{row.status === 'Rejected' ? 'Reason from teacher' : 'Your note'}</span>
                    <p>{row.decisionNote}</p>
                  </div>
                ) : null}
                <p className="lvd-footnote">
                  {row.decidedAt ? `${row.decidedByName || 'School'} · ${formatWhen(row.decidedAt)}` : formatWhen(row.createdAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      {cancelRow ? (
        <div className="lvd-modal" role="dialog" aria-modal="true" aria-label="Cancel live session">
          <form className="lvd-modal__card" onSubmit={applyCancel}>
            <h3>Cancel this live session</h3>
            <p>
              {cancelRow.teacherName} · {cancelRow.dateLabel} · {cancelRow.timeLabel}
            </p>
            <label className="lvd-field">
              <span>Note for the teacher (optional)</span>
              <textarea
                value={cancelNote}
                maxLength={300}
                onChange={(event) => setCancelNote(event.target.value)}
                placeholder="For example: We have a doctor appointment at that time."
              />
            </label>
            {cancelError ? <p className="lvd-alert is-error">{cancelError}</p> : null}
            <div className="lvd-modal__actions">
              <button type="button" className="lvd-btn ghost" onClick={closeCancel} disabled={cancelBusy}>
                Keep session
              </button>
              <button type="submit" className="lvd-btn danger" disabled={cancelBusy}>
                {cancelBusy ? 'Cancelling…' : 'Cancel session'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
