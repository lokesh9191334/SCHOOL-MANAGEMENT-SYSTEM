import { useCallback, useEffect, useState } from 'react'
import {
  assignSubstitution,
  fetchSubstitutionCandidates,
  fetchSubstitutions,
  runSubstitutions,
} from '../services/schedule'
import './ClassSchedule.css'

function istToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatSubDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function mailStatus(notified) {
  if (!notified) return { tone: 'idle', text: 'Email not sent' }
  return notified.sent
    ? { tone: 'ok', text: 'Email sent to the cover teacher' }
    : { tone: 'bad', text: 'Email failed — inform the teacher directly' }
}

export default function SubstitutionPanel({ refreshToken = 0 }) {
  const [date, setDate] = useState(istToday())
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState({ total: 0, assigned: 0, needsAdmin: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)
  const [candidates, setCandidates] = useState({})
  const [assigning, setAssigning] = useState('')

  const load = useCallback(async (forDate) => {
    setLoading(true)
    setError('')
    try {
      const body = await fetchSubstitutions(forDate)
      setRows(Array.isArray(body.substitutions) ? body.substitutions : [])
      setSummary(body.summary || { total: 0, assigned: 0, needsAdmin: 0 })
    } catch (err) {
      setError(err.message || 'Substitution slots could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(date)
  }, [load, date, refreshToken])

  const runForDate = async () => {
    setRunning(true)
    setError('')
    setNotice('')
    try {
      const body = await runSubstitutions(date)
      const totals = (body.results || []).reduce(
        (acc, result) => ({
          created: acc.created + (result.created || 0),
          assigned: acc.assigned + (result.assigned || 0),
          needsAdmin: acc.needsAdmin + (result.needsAdmin || 0),
          emailed: acc.emailed + (result.emailed || 0),
        }),
        { created: 0, assigned: 0, needsAdmin: 0, emailed: 0 },
      )
      if (!body.results?.length) {
        setNotice(body.message || 'No approved teacher leave covers this date.')
      } else if (!totals.created) {
        setNotice('Every affected period on this date is already planned.')
      } else {
        setNotice(
          `${totals.created} slot(s) planned — ${totals.assigned} assigned automatically, ${totals.needsAdmin} need manual cover, ${totals.emailed} teacher mail(s) sent.`,
        )
      }
      await load(date)
    } catch (err) {
      setError(err.message || 'Substitutions could not be planned.')
    } finally {
      setRunning(false)
    }
  }

  const findCandidates = async (row) => {
    setCandidates((prev) => ({ ...prev, [row.id]: { loading: true, list: [], choice: '' } }))
    try {
      const body = await fetchSubstitutionCandidates(row.id)
      setCandidates((prev) => ({
        ...prev,
        [row.id]: { loading: false, list: Array.isArray(body.candidates) ? body.candidates : [], choice: '' },
      }))
    } catch (err) {
      setCandidates((prev) => ({
        ...prev,
        [row.id]: { loading: false, list: [], choice: '', error: err.message },
      }))
    }
  }

  const assign = async (row) => {
    const picked = candidates[row.id]?.choice
    if (!picked) return
    setAssigning(row.id)
    setError('')
    setNotice('')
    try {
      const body = await assignSubstitution(row.id, picked)
      setRows((prev) => prev.map((entry) => (entry.id === row.id ? body.substitution : entry)))
      setNotice(
        body.email?.sent
          ? `${body.substitution.substituteName} is assigned and emailed.`
          : `${body.substitution.substituteName} is assigned, but the email failed. Tell them directly.`,
      )
      setSummary((prev) => ({
        ...prev,
        assigned: prev.assigned + 1,
        needsAdmin: Math.max(0, prev.needsAdmin - 1),
      }))
    } catch (err) {
      setError(err.message || 'The teacher could not be assigned.')
    } finally {
      setAssigning('')
    }
  }

  return (
    <section className="sch-subs">
      <div className="sch-subs__head">
        <div>
          <p className="sch-kicker">Step 3 · Substitute cover</p>
          <h3>When a teacher is on approved leave</h3>
          <p className="sch-hint">
            Approving a leave plans cover automatically from the same standard ±2 (Class 10 → Classes 8–12), preferring
            the same subject and always choosing a teacher who is free in that period. Slots with nobody free wait here
            for you.
          </p>
        </div>
        <div className="sch-subs__tools">
          <label className="sch-field">
            <span>Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <button type="button" className="sch-btn primary" onClick={runForDate} disabled={running || !date}>
            {running ? 'Planning…' : 'Plan substitutes for this date'}
          </button>
        </div>
      </div>

      {error ? <p className="sch-alert is-error">{error}</p> : null}
      {notice ? <p className="sch-alert is-success">{notice}</p> : null}

      <div className="sch-subs__stats">
        <article>
          <strong>{summary.total}</strong>
          <span>Slots</span>
        </article>
        <article>
          <strong>{summary.assigned}</strong>
          <span>Covered</span>
        </article>
        <article className={summary.needsAdmin ? 'is-warn' : ''}>
          <strong>{summary.needsAdmin}</strong>
          <span>Need cover</span>
        </article>
      </div>

      {loading ? <p className="sch-empty">Loading substitution slots…</p> : null}
      {!loading && !rows.length ? (
        <p className="sch-empty">
          No substitution slot on {formatSubDate(date)}. Slots appear as soon as an approved teacher leave overlaps this
          date and the timetable has those periods.
        </p>
      ) : null}

      <div className="sch-subs__list">
        {rows.map((row) => {
          const mail = mailStatus(row.notified)
          const pick = candidates[row.id]
          return (
            <article key={row.id} className={`sch-sub ${row.status === 'assigned' ? 'is-assigned' : 'is-open'}`}>
              <header>
                <div>
                  <strong>
                    {row.periodLabel} · {row.time || '—'}
                  </strong>
                  <span>
                    {row.className} · {row.subject || '—'}
                  </span>
                </div>
                <span className={`sch-chip ${row.status === 'assigned' ? 'is-ok' : 'is-warn'}`}>
                  {row.status === 'assigned' ? 'Covered' : 'Needs cover'}
                </span>
              </header>
              <div className="sch-sub__body">
                <p>
                  <span>Absent</span>
                  {row.absentTeacherName || row.absentTeacherEmail} · {formatSubDate(row.date)}
                </p>
                {row.status === 'assigned' ? (
                  <>
                    <p>
                      <span>Cover teacher</span>
                      {row.substituteName || row.substituteEmail}
                      {row.substituteSubject ? ` · ${row.substituteSubject}` : ''}
                    </p>
                    <p className={`sch-mail is-${mail.tone}`}>{mail.text}</p>
                  </>
                ) : (
                  <div className="sch-sub__assign">
                    {!pick ? (
                      <button type="button" className="sch-btn ghost" onClick={() => findCandidates(row)}>
                        Find free teachers
                      </button>
                    ) : null}
                    {pick?.loading ? <span className="sch-hint">Checking who is free…</span> : null}
                    {pick?.error ? <span className="sch-alert is-error">{pick.error}</span> : null}
                    {pick && !pick.loading && !pick.error ? (
                      pick.list.length ? (
                        <>
                          <select
                            value={pick.choice}
                            onChange={(event) =>
                              setCandidates((prev) => ({
                                ...prev,
                                [row.id]: { ...prev[row.id], choice: event.target.value },
                              }))
                            }
                          >
                            <option value="">Choose a free teacher</option>
                            {pick.list.map((candidate) => (
                              <option key={candidate.email} value={candidate.email}>
                                {candidate.name}
                                {candidate.subject ? ` · ${candidate.subject}` : ''}
                                {candidate.subjectMatch ? ' · same subject' : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="sch-btn primary"
                            disabled={!pick.choice || assigning === row.id}
                            onClick={() => assign(row)}
                          >
                            {assigning === row.id ? 'Assigning…' : 'Assign & email'}
                          </button>
                        </>
                      ) : (
                        <p className="sch-hint">
                          No free teacher in the ±2 standard range is available for this period. Adjust the timetable or
                          ask for a swap, then plan again.
                        </p>
                      )
                    ) : null}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
