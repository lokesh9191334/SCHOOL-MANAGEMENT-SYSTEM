import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchSchedule, saveSchedule } from '../services/schedule'
import SubstitutionPanel from './SubstitutionPanel'
import './ClassSchedule.css'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
]

const STARTER_PERIODS = [
  { no: 1, kind: 'class', label: 'Period 1', start: '08:00', end: '08:45' },
  { no: 2, kind: 'class', label: 'Period 2', start: '08:45', end: '09:30' },
  { no: 3, kind: 'class', label: 'Period 3', start: '09:30', end: '10:15' },
  { no: 4, kind: 'break', label: 'Short break', start: '10:15', end: '10:30' },
  { no: 5, kind: 'class', label: 'Period 4', start: '10:30', end: '11:15' },
  { no: 6, kind: 'class', label: 'Period 5', start: '11:15', end: '12:00' },
  { no: 7, kind: 'break', label: 'Lunch', start: '12:00', end: '12:40' },
  { no: 8, kind: 'class', label: 'Period 6', start: '12:40', end: '13:25' },
  { no: 9, kind: 'class', label: 'Period 7', start: '13:25', end: '14:10' },
]

const EMPTY_PERIOD = { no: 1, kind: 'class', label: 'Period 1', start: '', end: '' }

function classSlug(value) {
  return String(value || '').trim().toLowerCase()
}

function slotKey(className, day, periodNo) {
  return `${classSlug(className)}|${day}|${Number(periodNo) || 0}`
}

function draftsFromEntries(entries) {
  const map = {}
  for (const entry of Array.isArray(entries) ? entries : []) {
    map[slotKey(entry.className, entry.day, entry.periodNo)] = {
      className: entry.className,
      day: entry.day,
      periodNo: Number(entry.periodNo) || 0,
      subject: entry.subject || '',
      teacherEmail: entry.teacherEmail || '',
      room: entry.room || '',
    }
  }
  return map
}

function entriesFromDrafts(drafts) {
  return Object.values(drafts || {})
    .filter((draft) => (draft.subject || '').trim() || draft.teacherEmail)
    .map((draft) => ({
      className: draft.className,
      day: draft.day,
      periodNo: draft.periodNo,
      subject: (draft.subject || '').trim(),
      teacherEmail: draft.teacherEmail,
      room: (draft.room || '').trim(),
    }))
}

export default function ClassSchedule({ onPublished }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [periods, setPeriods] = useState([EMPTY_PERIOD])
  const [classes, setClasses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [drafts, setDrafts] = useState({})
  const [savedAt, setSavedAt] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDay, setSelectedDay] = useState('mon')
  const [refreshToken, setRefreshToken] = useState(0)

  const teachersByEmail = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.email, teacher.name])),
    [teachers],
  )
  const nameByEmail = useMemo(
    () =>
      new Map(
        teachers.map((teacher) => [
          teacher.email,
          `${teacher.name}${teacher.subject ? ` · ${teacher.subject}` : ''}`,
        ]),
      ),
    [teachers],
  )
  const teachingPeriods = useMemo(
    () =>
      periods
        .filter((period) => period.kind === 'class')
        .slice()
        .sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0)),
    [periods],
  )
  const slotCount = useMemo(() => entriesFromDrafts(drafts).length, [drafts])
  const unscheduledTeachers = useMemo(() => {
    const used = new Set(Object.values(drafts).filter((draft) => draft.teacherEmail).map((draft) => draft.teacherEmail))
    return teachers.filter((teacher) => !used.has(teacher.email) && !teacher.classTeacherOf)
  }, [drafts, teachers])

  const busyBySlot = useMemo(() => {
    const map = new Map()
    for (const draft of Object.values(drafts)) {
      if (!draft.teacherEmail) continue
      map.set(`${draft.day}|${draft.periodNo}|${draft.teacherEmail}`, draft.className)
    }
    return map
  }, [drafts])

  const applyBody = useCallback((body) => {
    const nextPeriods =
      Array.isArray(body.periods) && body.periods.length
        ? body.periods.map((period) => ({
            no: Number(period.no) || 1,
            kind: period.kind === 'break' ? 'break' : 'class',
            label: period.label || '',
            start: period.start || '',
            end: period.end || '',
          }))
        : [EMPTY_PERIOD]
    setPeriods(nextPeriods)
    setClasses(Array.isArray(body.classes) ? body.classes : [])
    setTeachers(Array.isArray(body.teachers) ? body.teachers : [])
    setDrafts(draftsFromEntries(body.entries))
    setSavedAt(body.updatedAt || '')
    setSelectedClass((current) => {
      const names = Array.isArray(body.classes) ? body.classes : []
      return names.includes(current) ? current : names[0] || ''
    })
  }, [])

  useEffect(() => {
    let active = true
    fetchSchedule()
      .then((body) => {
        if (!active) return
        applyBody(body)
        setError('')
      })
      .catch((err) => {
        if (active) setError(err.message || 'The class schedule could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [applyBody])

  const updatePeriod = (no, key) => (event) => {
    const value = event.target.value
    setPeriods((prev) => prev.map((period) => (period.no === no ? { ...period, [key]: value } : period)))
  }

  const addPeriod = (kind) => {
    const nextNo = Math.min(16, periods.reduce((max, period) => Math.max(max, Number(period.no) || 0), 0) + 1)
    setPeriods((prev) => [
      ...prev,
      { no: nextNo, kind, label: kind === 'break' ? 'Lunch' : `Period ${nextNo}`, start: '', end: '' },
    ])
  }

  const removePeriod = (no) => {
    setPeriods((prev) => (prev.length > 1 ? prev.filter((period) => period.no !== no) : prev))
    setDrafts((prev) => {
      const next = { ...prev }
      for (const [key, draft] of Object.entries(next)) {
        if (Number(draft.periodNo) === Number(no)) delete next[key]
      }
      return next
    })
  }

  const loadStarter = () => {
    setPeriods(STARTER_PERIODS.map((period) => ({ ...period })))
    setNotice('Starter bell times loaded. Check every time against your school timetable before saving.')
  }

  const updateSlot = (periodNo, key) => (event) => {
    const value = event.target.value
    if (!selectedClass) return
    const keyForSlot = slotKey(selectedClass, selectedDay, periodNo)
    setDrafts((prev) => {
      const existing = prev[keyForSlot] || {
        className: selectedClass,
        day: selectedDay,
        periodNo,
        subject: '',
        teacherEmail: '',
        room: '',
      }
      return { ...prev, [keyForSlot]: { ...existing, [key]: value } }
    })
  }

  const clearSlot = (periodNo) => {
    if (!selectedClass) return
    const keyForSlot = slotKey(selectedClass, selectedDay, periodNo)
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[keyForSlot]
      return next
    })
  }

  const copyDay = (fromDay) => {
    if (!selectedClass || fromDay === selectedDay) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const period of teachingPeriods) {
        const source = prev[slotKey(selectedClass, fromDay, period.no)]
        if (!source) continue
        next[slotKey(selectedClass, selectedDay, period.no)] = { ...source, day: selectedDay }
      }
      return next
    })
  }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const incomplete = Object.values(drafts).find(
      (draft) =>
        ((draft.subject || '').trim() || draft.teacherEmail) &&
        ((draft.subject || '').trim().length < 2 || !draft.teacherEmail),
    )
    if (incomplete) {
      setError(
        `${incomplete.className} · ${incomplete.day} has an unfinished slot. Add both a subject and a teacher, or clear it.`,
      )
      return
    }
    const emptyTimes = periods.find((period) => !period.start || !period.end)
    if (emptyTimes) {
      setError(`Add start and end times for ${emptyTimes.label || `period ${emptyTimes.no}`}.`)
      return
    }
    setSaving(true)
    try {
      const body = await saveSchedule({
        periods: periods.map((period) => ({
          no: Number(period.no),
          kind: period.kind,
          label: period.label,
          start: period.start,
          end: period.end,
        })),
        entries: entriesFromDrafts(drafts),
      })
      applyBody(body)
      setNotice(`Schedule saved — ${body.counts?.entries ?? 0} class slots across ${classes.length} classes.`)
      setRefreshToken((token) => token + 1)
      onPublished?.()
    } catch (err) {
      setError(err.message || 'The schedule could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="sch-wrap">
        <p className="sch-empty">Loading the school schedule…</p>
      </div>
    )
  }

  return (
    <div className="sch-wrap">
      {error ? <p className="sch-alert is-error">{error}</p> : null}
      {notice ? <p className="sch-alert is-success">{notice}</p> : null}

      <form className="sch-bell" onSubmit={save}>
        <div className="sch-bell__head">
          <div>
            <p className="sch-kicker">Step 1 · Bell schedule</p>
            <h3>Periods and breaks</h3>
            <p className="sch-hint">
              One bell schedule is shared by every class. Mark lunch or short breaks as “Break” so no subject is booked
              in them.{' '}
              {savedAt ? `Last saved ${new Date(savedAt).toLocaleString('en-IN')}.` : 'Not saved yet.'}
            </p>
          </div>
          <div className="sch-bell__actions">
            <button type="button" className="sch-btn ghost" onClick={loadStarter}>
              Load starter times
            </button>
            <button type="button" className="sch-btn ghost" onClick={() => addPeriod('class')}>
              + Teaching period
            </button>
            <button type="button" className="sch-btn ghost" onClick={() => addPeriod('break')}>
              + Break
            </button>
          </div>
        </div>

        <div className="sch-table-scroll">
          <table className="sch-table sch-table--bell">
            <thead>
              <tr>
                <th>No.</th>
                <th>Type</th>
                <th>Label</th>
                <th>Start</th>
                <th>End</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {periods
                .slice()
                .sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0))
                .map((period) => (
                  <tr key={period.no} className={period.kind === 'break' ? 'is-break' : ''}>
                    <td className="sch-no">{period.no}</td>
                    <td>
                      <select value={period.kind} onChange={updatePeriod(period.no, 'kind')}>
                        <option value="class">Teaching</option>
                        <option value="break">Break / Lunch</option>
                      </select>
                    </td>
                    <td>
                      <input value={period.label} onChange={updatePeriod(period.no, 'label')} maxLength={40} />
                    </td>
                    <td>
                      <input type="time" value={period.start} onChange={updatePeriod(period.no, 'start')} />
                    </td>
                    <td>
                      <input type="time" value={period.end} onChange={updatePeriod(period.no, 'end')} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sch-x"
                        onClick={() => removePeriod(period.no)}
                        aria-label="Remove period"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="sch-savebar">
          <span>
            {teachingPeriods.length} teaching period{teachingPeriods.length === 1 ? '' : 's'} ·{' '}
            {periods.filter((period) => period.kind === 'break').length} break
            {periods.filter((period) => period.kind === 'break').length === 1 ? '' : 's'} · {slotCount} class slot
            {slotCount === 1 ? '' : 's'}
          </span>
          <button type="submit" className="sch-btn primary" disabled={saving || !classes.length}>
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </div>
      </form>

      <section className="sch-classes">
        <div className="sch-classes__head">
          <div>
            <p className="sch-kicker">Step 2 · Class timetable</p>
            <h3>Who teaches what, period by period</h3>
            <p className="sch-hint">
              Pick a class and a day, then set the subject and the real teacher for each period. A teacher cannot be in
              two classes in the same period — teachers already booked are shown as busy.
            </p>
          </div>
          <label className="sch-field">
            <span>Class</span>
            <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>
              {classes.length ? (
                classes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              ) : (
                <option value="">No class yet</option>
              )}
            </select>
          </label>
        </div>

        {!classes.length ? (
          <p className="sch-empty">
            No class is available yet. Admit at least one student so the class appears here — classes come from real
            admission records, never typed in by hand.
          </p>
        ) : null}
        {classes.length && !teachers.length ? (
          <p className="sch-empty">
            No teacher with an email is saved yet. Add teachers in the Teachers module first — only real teacher
            accounts can be placed on the timetable.
          </p>
        ) : null}

        {classes.length ? (
          <>
            <div className="sch-days">
              {DAYS.map((day) => {
                const count = Object.values(drafts).filter(
                  (draft) => classSlug(draft.className) === classSlug(selectedClass) && draft.day === day.key,
                ).length
                return (
                  <button
                    key={day.key}
                    type="button"
                    className={`sch-day ${selectedDay === day.key ? 'is-active' : ''}`}
                    onClick={() => setSelectedDay(day.key)}
                  >
                    <strong>{day.label.slice(0, 3)}</strong>
                    <span>{count ? `${count} period${count === 1 ? '' : 's'}` : 'free'}</span>
                  </button>
                )
              })}
            </div>

            <div className="sch-copy">
              {DAYS.filter((day) => day.key !== selectedDay).map((day) => (
                <button key={day.key} type="button" className="sch-btn tiny ghost" onClick={() => copyDay(day.key)}>
                  Copy {day.label} here
                </button>
              ))}
            </div>

            <div className="sch-slots">
              {teachingPeriods.map((period) => {
                const key = slotKey(selectedClass, selectedDay, period.no)
                const draft = drafts[key] || { subject: '', teacherEmail: '', room: '' }
                return (
                  <article key={period.no} className={`sch-slot ${draft.teacherEmail ? 'is-filled' : ''}`}>
                    <header>
                      <div>
                        <strong>{period.label}</strong>
                        <span>
                          {period.start && period.end ? `${period.start} – ${period.end}` : 'Times not set'}
                        </span>
                      </div>
                      {draft.teacherEmail || draft.subject ? (
                        <button
                          type="button"
                          className="sch-x"
                          onClick={() => clearSlot(period.no)}
                          aria-label="Clear slot"
                        >
                          ×
                        </button>
                      ) : null}
                    </header>
                    <label className="sch-field">
                      <span>Subject</span>
                      <input
                        value={draft.subject}
                        onChange={updateSlot(period.no, 'subject')}
                        maxLength={60}
                        placeholder="e.g. Mathematics"
                      />
                    </label>
                    <label className="sch-field">
                      <span>Teacher</span>
                      <select value={draft.teacherEmail} onChange={updateSlot(period.no, 'teacherEmail')}>
                        <option value="">Choose a teacher</option>
                        {teachers.map((teacher) => {
                          const busyIn = busyBySlot.get(`${selectedDay}|${period.no}|${teacher.email}`)
                          const taken = busyIn && classSlug(busyIn) !== classSlug(selectedClass)
                          return (
                            <option key={teacher.email} value={teacher.email} disabled={Boolean(taken)}>
                              {nameByEmail.get(teacher.email)}
                              {taken ? ` · busy (${busyIn})` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </label>
                    <label className="sch-field">
                      <span>Room (optional)</span>
                      <input
                        value={draft.room}
                        onChange={updateSlot(period.no, 'room')}
                        maxLength={40}
                        placeholder="e.g. Lab 2"
                      />
                    </label>
                  </article>
                )
              })}
              {!teachingPeriods.length ? (
                <p className="sch-empty">Add a teaching period above to start building the timetable.</p>
              ) : null}
            </div>
          </>
        ) : null}

        {unscheduledTeachers.length ? (
          <p className="sch-hint sch-hint--warn">
            No scheduled period yet: {unscheduledTeachers.map((teacher) => teacher.name).join(', ')}. The substitute
            engine only picks teachers it can place by standard, so give each teacher at least one period — or make them
            a class teacher.
          </p>
        ) : null}
      </section>

      {classes.length && teachingPeriods.length ? (
        <section className="sch-overview">
          <div className="sch-overview__head">
            <p className="sch-kicker">Overview · {DAYS.find((day) => day.key === selectedDay)?.label}</p>
            <h3>All classes at one glance</h3>
          </div>
          <div className="sch-table-scroll">
            <table className="sch-table sch-table--grid">
              <thead>
                <tr>
                  <th>Class</th>
                  {teachingPeriods.map((period) => (
                    <th key={period.no}>
                      {period.label}
                      <span>{period.start && period.end ? `${period.start}–${period.end}` : '—'}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classes.map((className) => (
                  <tr key={className}>
                    <th>{className}</th>
                    {teachingPeriods.map((period) => {
                      const draft = drafts[slotKey(className, selectedDay, period.no)]
                      return (
                        <td key={period.no}>
                          {draft?.subject ? (
                            <>
                              <strong>{draft.subject}</strong>
                              <span>{teachersByEmail.get(draft.teacherEmail) || draft.teacherEmail}</span>
                              {draft.room ? <em>{draft.room}</em> : null}
                            </>
                          ) : (
                            <span className="sch-nil">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <SubstitutionPanel refreshToken={refreshToken} />
    </div>
  )
}
