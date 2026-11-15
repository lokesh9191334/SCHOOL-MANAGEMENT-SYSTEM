import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelLiveSession,
  fetchLiveSessionMeta,
  fetchLiveSessionSlots,
  fetchLiveSessions,
  scheduleLiveSession,
} from '../../services/liveSessions'
import {
  addDaysIso,
  countdownLabel,
  groupSlots,
  initialsOf,
  isoDateParts,
  nextWeekdayIso,
  relativeWhen,
  todayIso,
} from '../shared/liveSessionUi'
import '../shared/LiveSession.css'

const EMPTY_SUMMARY = { total: 0, pending: 0, accepted: 0, rejected: 0, cancelled: 0 }

const AGENDA_HINTS = ['Homework follow-up', 'Test performance', 'Attendance', 'Class behaviour', 'Report card']

const RAIL_STEPS = [
  { id: 1, label: 'Child' },
  { id: 2, label: 'Teacher' },
  { id: 3, label: 'Time' },
  { id: 4, label: 'Confirm' },
]

function statusClass(status) {
  if (status === 'Accepted') return 'is-accepted'
  if (status === 'Pending') return 'is-pending'
  return 'is-rejected'
}

function statusLabel(row) {
  if (row.status === 'Rejected') return 'Cancelled by teacher'
  if (row.status === 'Cancelled') return 'Cancelled by you'
  return row.status
}

function meetingDateTime(row) {
  return `${row.date || ''}T${row.startTime || '00:00'}:00`
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  throw new Error('Copy is not supported in this browser.')
}

export default function ParentLiveSession() {
  const studioRef = useRef(null)
  const [children, setChildren] = useState([])
  const [childId, setChildId] = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [date, setDate] = useState(() => nextWeekdayIso())
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
  const minDate = todayIso()
  const maxDate = addDaysIso(minDate, maxDaysAhead)

  const activeStep = !childId ? 1 : !teacherEmail ? 2 : !slotPick ? 3 : 4
  const readyCount = (childId ? 1 : 0) + (teacherEmail ? 1 : 0) + (slotPick ? 1 : 0)

  const dateStrip = useMemo(
    () =>
      Array.from({ length: 8 }, (_, index) => {
        const value = addDaysIso(minDate, index)
        return { value, ...isoDateParts(value) }
      }),
    [minDate],
  )

  const upcoming = sessions
    .filter((row) => ['Pending', 'Accepted'].includes(row.status))
    .sort((a, b) => meetingDateTime(a).localeCompare(meetingDateTime(b)))
  const past = sessions.filter((row) => !['Pending', 'Accepted'].includes(row.status))
  const nextAccepted = upcoming.find((row) => row.status === 'Accepted') || null

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

  const changeChild = (id) => {
    setChildId(id)
    setTeacherEmail('')
    setSlotPick('')
    setAgenda('')
  }

  const changeTeacher = (email) => {
    setTeacherEmail(email)
    setSlotPick('')
  }

  const changeDate = (value) => {
    if (!value) return
    setDate(value)
    setSlotPick('')
  }

  const appendAgenda = (text) => {
    setAgenda((prev) => {
      const clean = prev.trim()
      if (!clean) return text
      if (clean.toLowerCase().includes(text.toLowerCase())) return prev
      const joined = /[.!?]$/.test(clean) ? `${clean} ${text}` : `${clean}. ${text}`
      return joined.slice(0, 500)
    })
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
        `Request sent to ${body.session?.teacherName || teacher.name}. You will get an email as soon as it is accepted or cancelled.`,
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

  const bookAgain = (row) => {
    setError('')
    setNotice('')
    const target = children.find((entry) => entry.id === row.studentId)
    if (!target) {
      setError('That student is no longer linked to your account, so this session cannot be repeated.')
      return
    }
    const match = (target.teachers || []).find((entry) => entry.email === row.teacherEmail)
    if (!match) {
      setError(`${row.teacherName || 'That teacher'} is not on the timetable for ${target.className || 'this class'} any more. Choose another teacher.`)
      return
    }
    setChildId(target.id)
    setTeacherEmail(match.email)
    setDate(nextWeekdayIso())
    setSlotPick('')
    setAgenda(row.agenda || '')
    studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      setNotice(`Live session cancelled.${body.email?.sent ? ' The teacher has been emailed.' : ''}`)
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

  const copyDetails = async (row) => {
    try {
      await copyText(
        [
          `Live session · ${row.studentName || 'Student'}`,
          `${row.teacherName || 'Teacher'}${row.teacherSubject ? ` (${row.teacherSubject})` : ''}`,
          `${row.dateLabel} · ${row.timeLabel} IST`,
          row.meetingUrl ? `Join: ${row.meetingUrl}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      setNotice('Session details copied.')
    } catch (err) {
      setError(err.message || 'The session details could not be copied.')
    }
  }

  return (
    <div className="lvs-page" ref={studioRef}>
      <header className="lvs-hero">
        <div className="lvs-hero__main">
          <p className="lvs-kicker">Parent portal · Live session</p>
          <h1>Meet your child’s teachers, live</h1>
          <p className="lvs-hero__sub">
            Pick your child, the teacher who actually takes their class, and a genuinely free 15-minute slot.
            The teacher accepts or cancels from their desk and you are emailed either way.
          </p>
          <div className="lvs-flags">
            <span>15-minute video call</span>
            <span>Real free periods</span>
            <span>Email on every decision</span>
          </div>
        </div>
        <div className="lvs-hero__side">
          <div className="lvs-stats">
            <article className="lvs-stat is-gold">
              <strong>{summary.pending}</strong>
              <span>Pending</span>
            </article>
            <article className="lvs-stat is-teal">
              <strong>{summary.accepted}</strong>
              <span>Confirmed</span>
            </article>
            <article className="lvs-stat">
              <strong>{summary.total}</strong>
              <span>Total</span>
            </article>
          </div>
          {nextAccepted ? (
            <div className="lvs-focus">
              <span className="lvs-focus__label">Next confirmed session</span>
              <strong>
                {nextAccepted.dateLabel} · {nextAccepted.timeLabel}
              </strong>
              <small>
                {nextAccepted.teacherName}
                {nextAccepted.studentName ? ` · ${nextAccepted.studentName}` : ''}
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
          ) : (
            <div className="lvs-focus is-idle">
              <span className="lvs-focus__label">Next confirmed session</span>
              <strong>Nothing confirmed yet</strong>
              <small>Book a slot below and it will appear here once the teacher accepts.</small>
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
              <div className="lvs-notice__note">
                <b>Reason from teacher</b>
                {cancelNotice.decisionNote}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="lvs-studio" aria-label="Schedule a live session">
        <div className="lvs-studio__head">
          <div>
            <p className="lvs-kicker is-dark">Booking studio</p>
            <h2>Schedule a live session</h2>
            <p>Four quick steps. Only real free time from the teacher’s timetable is offered.</p>
          </div>
          <span className="lvs-meter">{readyCount}/3 ready</span>
        </div>

        <div className="lvs-rail" aria-hidden>
          {RAIL_STEPS.map((step) => {
            const done = step.id < activeStep || (step.id === 4 && readyCount === 3)
            const active = step.id === activeStep
            return (
              <div
                key={step.id}
                className={`lvs-rail__step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}
              >
                <span className="lvs-rail__dot">{done ? '✓' : step.id}</span>
                <span className="lvs-rail__label">{step.label}</span>
              </div>
            )
          })}
        </div>

        {metaLoading ? (
          <div className="lvs-skeleton" aria-label="Loading your children">
            <span />
            <span />
            <span />
          </div>
        ) : !children.length ? (
          <div className="lvs-empty">
            <span className="lvs-empty__icon" aria-hidden>
              ⚑
            </span>
            <strong>Your account is not linked to a student yet</strong>
            <p>
              Live sessions need your child’s student record. Ask the school office to link your parent
              account to your child.
            </p>
          </div>
        ) : (
          <form className="lvs-flow" onSubmit={submit}>
            <div className={`lvs-step ${childId ? 'is-done' : 'is-active'}`}>
              <div className="lvs-step__head">
                <span className="lvs-step__num">{childId ? '✓' : '1'}</span>
                <div>
                  <h3>Select your child</h3>
                  <p>Teachers are shown from the class this child is studying in.</p>
                </div>
              </div>
              <div className="lvs-step__body">
                <div className="lvs-children">
                  {children.map((row, index) => (
                    <button
                      key={row.id}
                      type="button"
                      className={`lvs-child ${childId === row.id ? 'is-active' : ''}`}
                      onClick={() => changeChild(row.id)}
                      aria-pressed={childId === row.id}
                    >
                      <span className={`lvs-avatar ${index % 2 ? 'is-indigo' : ''}`}>{initialsOf(row.name)}</span>
                      <span className="lvs-child__body">
                        <strong>{row.name || 'Student'}</strong>
                        <small>
                          {row.className || 'Class not set'}
                          {row.rollNo ? ` · Roll ${row.rollNo}` : ''}
                        </small>
                      </span>
                      {childId === row.id ? <span className="lvs-tick">✓</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={`lvs-step ${teacherEmail ? 'is-done' : activeStep === 2 ? 'is-active' : 'is-idle'}`}>
              <div className="lvs-step__head">
                <span className="lvs-step__num">{teacherEmail ? '✓' : '2'}</span>
                <div>
                  <h3>Select the teacher</h3>
                  <p>
                    {child?.className
                      ? `Teachers who take ${child.className}, from the published timetable and class teacher assignment.`
                      : 'Set the class on the student record to see teachers.'}
                  </p>
                </div>
              </div>
              <div className="lvs-step__body">
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
                        <span className={`lvs-avatar ${row.isClassTeacher ? 'is-gold' : 'is-teal'}`}>
                          {initialsOf(row.name)}
                        </span>
                        <span className="lvs-teacher__name">
                          <strong>{row.name}</strong>
                          {row.isClassTeacher ? <span className="lvs-badge">Class teacher</span> : null}
                        </span>
                        <span className="lvs-teacher__meta">
                          <span className="lvs-subject">{row.subjectLabel || 'Subject not on timetable'}</span>
                          <span className="lvs-teacher__email">{row.email}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="lvs-empty">
                    <span className="lvs-empty__icon" aria-hidden>
                      ⚑
                    </span>
                    <strong>No teacher is mapped to {child.className} yet</strong>
                    <p>
                      Ask the school admin to publish the class timetable or assign a class teacher, then
                      refresh this page.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className={`lvs-step ${slotPick ? 'is-done' : activeStep === 3 ? 'is-active' : 'is-idle'}`}>
              <div className="lvs-step__head">
                <span className="lvs-step__num">{slotPick ? '✓' : '3'}</span>
                <div>
                  <h3>Select a date and time</h3>
                  <p>
                    Slots come from the teacher’s real free periods, break times and after-school hours. Each
                    session is 15 minutes.
                  </p>
                </div>
              </div>
              <div className="lvs-step__body">
                {!teacherEmail ? (
                  <p className="lvs-step__note">Choose a teacher above to see their free slots.</p>
                ) : (
                  <>
                    <div className="lvs-dates" role="group" aria-label="Next dates">
                      {dateStrip.map((entry) => (
                        <button
                          key={entry.value}
                          type="button"
                          className={`lvs-date ${date === entry.value ? 'is-active' : ''} ${entry.value === minDate ? 'is-today' : ''}`}
                          onClick={() => changeDate(entry.value)}
                          disabled={entry.weekend}
                          aria-pressed={date === entry.value}
                        >
                          <span className="lvs-date__weekday">{entry.weekday}</span>
                          <span className="lvs-date__day">{entry.day}</span>
                          <span className="lvs-date__month">{entry.month}</span>
                          {entry.weekend ? <span className="lvs-date__tag">Off</span> : null}
                        </button>
                      ))}
                    </div>
                    <div className="lvs-date-more">
                      <span>Or pick any date up to {maxDaysAhead} days ahead</span>
                      <input type="date" value={date} min={minDate} max={maxDate} onChange={(event) => changeDate(event.target.value)} />
                    </div>

                    {slotsLoading ? (
                      <div className="lvs-skeleton" aria-label="Checking free slots">
                        <span />
                        <span />
                      </div>
                    ) : slotError ? (
                      <p className="lvs-alert is-error">{slotError}</p>
                    ) : slotData?.slots?.length ? (
                      <>
                        <div className="lvs-slot-groups" role="group" aria-label="Free time slots">
                          {groupSlots(slotData.slots).map((group) => (
                            <div key={group.label} className="lvs-slot-group">
                              <div className="lvs-slot-group__head">
                                <strong>{group.label}</strong>
                                <span>{group.slots.length}</span>
                              </div>
                              <div className="lvs-slots">
                                {group.slots.map((slot) => (
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
                            </div>
                          ))}
                        </div>
                        {slotData.note ? <p className="lvs-slot-note">{slotData.note}</p> : null}
                      </>
                    ) : (
                      <div className="lvs-empty">
                        <span className="lvs-empty__icon" aria-hidden>
                          ◷
                        </span>
                        <strong>No free slot on this date</strong>
                        <p>{slotData?.note || 'Try another day from the date strip above.'}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className={`lvs-step ${readyCount === 3 ? 'is-active' : 'is-idle'}`}>
              <div className="lvs-step__head">
                <span className="lvs-step__num">4</span>
                <div>
                  <h3>Confirm the schedule</h3>
                  <p>Add what you want to discuss, then send the request to the teacher.</p>
                </div>
              </div>
              <div className="lvs-step__body">
                <div className="lvs-field">
                  <span className="lvs-field__label">
                    Agenda for the teacher <small>optional · {agenda.length}/500</small>
                  </span>
                  <div className="lvs-chips">
                    {AGENDA_HINTS.map((hint) => (
                      <button key={hint} type="button" className="lvs-chip-btn" onClick={() => appendAgenda(hint)}>
                        + {hint}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={agenda}
                    maxLength={500}
                    onChange={(event) => setAgenda(event.target.value)}
                    placeholder="For example: I want to discuss maths homework and the next class test."
                  />
                </div>

                <div className="lvs-summary">
                  <div className="lvs-summary__grid">
                    <div className="lvs-summary__cell">
                      <span>Child</span>
                      <strong className={child ? 'is-ready' : ''}>{child?.name || 'Not chosen'}</strong>
                    </div>
                    <div className="lvs-summary__cell">
                      <span>Teacher</span>
                      <strong className={teacher ? 'is-ready' : ''}>{teacher?.name || 'Not chosen'}</strong>
                    </div>
                    <div className="lvs-summary__cell">
                      <span>When</span>
                      <strong className={slotPick ? 'is-ready' : ''}>
                        {slotData?.dateLabel || date}
                        {slotPick ? ` · ${slotPick}` : ' · pick a slot'}
                      </strong>
                    </div>
                    <div className="lvs-summary__cell">
                      <span>Length</span>
                      <strong className="is-ready">15 minutes</strong>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="lvs-cta"
                    disabled={saving || !child || !teacher || !slotPick}
                  >
                    {saving ? 'Sending request…' : 'Confirm schedule'}
                  </button>
                </div>
                <p className="lvs-footnote">
                  The teacher gets this request on their desk and by email. On rejection they must write a
                  reason, which is emailed to you and shown on your Parent Home.
                </p>
              </div>
            </div>
          </form>
        )}
      </section>

      <section className="lvs-section" aria-label="Upcoming sessions">
        <div className="lvs-section__head">
          <h2>Upcoming sessions</h2>
          <span className="lvs-count-pill">{upcoming.length} upcoming</span>
        </div>
        {!upcoming.length ? (
          <div className="lvs-empty">
            <span className="lvs-empty__icon" aria-hidden>
              ▣
            </span>
            <strong>No upcoming live session</strong>
            <p>Book one above and it will appear here with its status and join link.</p>
          </div>
        ) : (
          <div className="lvs-grid-sessions">
            {upcoming.map((row) => (
              <article key={row.id} className={`lvs-session is-${row.status.toLowerCase()}`}>
                <div className="lvs-session__top">
                  <div className="lvs-when">
                    <strong>{row.dateLabel}</strong>
                    <span>{row.timeLabel} IST · 15 min</span>
                  </div>
                  <span className={`lvs-status ${statusClass(row.status)}`}>{statusLabel(row)}</span>
                </div>
                <div className="lvs-person">
                  <span className="lvs-avatar is-sm is-teal">{initialsOf(row.teacherName)}</span>
                  <div className="lvs-person__body">
                    <strong>{row.teacherName || 'Teacher'}</strong>
                    <small>{row.teacherSubject || 'Subject not set'}</small>
                  </div>
                  <span className={`lvs-count ${row.status === 'Accepted' ? 'is-live' : ''}`}>
                    {countdownLabel(row.date)}
                  </span>
                </div>
                <div className="lvs-tags">
                  <span>{row.studentName || 'Student'}</span>
                  <span>{row.className || 'Class not set'}</span>
                </div>
                {row.agenda ? <p className="lvs-quote">“{row.agenda}”</p> : null}

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
                      <button type="button" className="lvs-btn ghost" onClick={() => copyDetails(row)}>
                        Copy details
                      </button>
                      <button type="button" className="lvs-btn danger" onClick={() => openCancel(row)}>
                        Cancel
                      </button>
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
                ) : (
                  <>
                    <p className="lvs-waiting">
                      Waiting for {row.teacherName} to accept or cancel — requested {relativeWhen(row.createdAt)}.
                    </p>
                    <div className="lvs-actions">
                      <button type="button" className="lvs-btn ghost" onClick={() => openCancel(row)}>
                        Cancel request
                      </button>
                    </div>
                  </>
                )}

                {row.status === 'Accepted' && row.decisionNote ? (
                  <div className="lvs-note is-approved">
                    <span>Note from teacher</span>
                    <p>{row.decisionNote}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="lvs-section" aria-label="Session history">
        <div className="lvs-section__head">
          <h2>Session history</h2>
          <span className="lvs-count-pill">{past.length} closed</span>
        </div>
        {!past.length ? (
          <div className="lvs-empty">
            <span className="lvs-empty__icon" aria-hidden>
              ▤
            </span>
            <strong>Nothing here yet</strong>
            <p>Rejected and cancelled sessions are kept here with the teacher’s reason.</p>
          </div>
        ) : (
          <div className="lvs-grid-sessions">
            {past.map((row) => (
              <article key={row.id} className={`lvs-session is-${row.status.toLowerCase()}`}>
                <div className="lvs-session__top">
                  <div className="lvs-when">
                    <strong>{row.dateLabel}</strong>
                    <span>{row.timeLabel} IST</span>
                  </div>
                  <span className={`lvs-status ${statusClass(row.status)}`}>{statusLabel(row)}</span>
                </div>
                <div className="lvs-person">
                  <span className="lvs-avatar is-sm">{initialsOf(row.teacherName)}</span>
                  <div className="lvs-person__body">
                    <strong>{row.teacherName || 'Teacher'}</strong>
                    <small>
                      {row.studentName || 'Student'}
                      {row.className ? ` · ${row.className}` : ''}
                    </small>
                  </div>
                </div>
                {row.decisionNote ? (
                  <div className="lvs-note">
                    <span>{row.status === 'Rejected' ? 'Reason from teacher' : 'Your note'}</span>
                    <p>{row.decisionNote}</p>
                  </div>
                ) : null}
                <p className="lvs-footnote">
                  {row.decidedAt ? `${row.decidedByName || 'School'} · ${relativeWhen(row.decidedAt)}` : `Requested ${relativeWhen(row.createdAt)}`}
                </p>
                <div className="lvs-actions">
                  <button type="button" className="lvs-btn ghost" onClick={() => bookAgain(row)}>
                    Book again
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {cancelRow ? (
        <div className="lvs-modal" role="dialog" aria-modal="true" aria-label="Cancel live session">
          <form className="lvs-modal__card" onSubmit={applyCancel}>
            <div className="lvs-modal__head">
              <span className="lvs-modal__icon is-danger" aria-hidden>
                !
              </span>
              <div>
                <h3>Cancel this live session</h3>
                <p>The teacher is emailed as soon as you cancel. You can book another slot any time.</p>
              </div>
            </div>
            <div className="lvs-modal__session">
              <span>{cancelRow.teacherName}</span>
              <span>{cancelRow.studentName}</span>
              <span>{cancelRow.dateLabel}</span>
              <span>{cancelRow.timeLabel}</span>
            </div>
            <label className="lvs-field">
              <span className="lvs-field__label">
                Note for the teacher <small>optional · {cancelNote.length}/300</small>
              </span>
              <textarea
                value={cancelNote}
                maxLength={300}
                onChange={(event) => setCancelNote(event.target.value)}
                placeholder="For example: We have a doctor appointment at that time."
              />
            </label>
            {cancelError ? <p className="lvs-alert is-error">{cancelError}</p> : null}
            <div className="lvs-modal__actions">
              <button type="button" className="lvs-btn ghost" onClick={closeCancel} disabled={cancelBusy}>
                Keep session
              </button>
              <button type="submit" className="lvs-btn danger" disabled={cancelBusy}>
                {cancelBusy ? 'Cancelling…' : 'Cancel session'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
