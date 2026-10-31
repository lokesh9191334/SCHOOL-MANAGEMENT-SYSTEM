import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMySchedule } from '../../services/schedule'
import '../shared/LeaveDesk.css'
import '../../components/ClassSchedule.css'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
]

function formatDay(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TeacherSchedule() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchMySchedule()
      .then((body) => {
        if (active) setData(body)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Your schedule could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const byDay = useMemo(() => {
    const map = new Map(DAYS.map((day) => [day.key, []]))
    for (const entry of data?.week || []) {
      if (map.has(entry.day)) map.get(entry.day).push(entry)
    }
    for (const list of map.values()) list.sort((a, b) => a.periodNo - b.periodNo)
    return map
  }, [data])

  const duties = data?.duties || []
  const absences = data?.absences || []
  const periods = data?.periods || []
  const todayDuties = duties.filter((row) => row.date === data?.date)

  return (
    <div className="lvd-page">
      <header className="lvd-hero">
        <div>
          <p className="admin-kicker">Teacher Desk · Class schedule</p>
          <h2>My timetable{data?.dayLabel ? ` · ${data.dayLabel}` : ''}</h2>
          <p>
            Your own periods and every substitute duty assigned to you when a colleague is on approved leave. The
            school office plans cover automatically from the same standard ±2.
          </p>
          <div className="link-row">
            <Link className="link-pill" to="/teacher/leave">
              My leave
            </Link>
            <Link className="link-pill" to="/teacher">
              Teacher desk
            </Link>
          </div>
        </div>
        <div className="lvd-stats">
          <article className="lvd-stat">
            <strong>{data?.today?.length || 0}</strong>
            <span>Periods today</span>
          </article>
          <article className="lvd-stat is-pending">
            <strong>{todayDuties.length}</strong>
            <span>Cover today</span>
          </article>
          <article className="lvd-stat is-approved">
            <strong>{duties.length}</strong>
            <span>Upcoming cover</span>
          </article>
        </div>
      </header>

      {error ? <p className="lvd-alert is-error">{error}</p> : null}
      {loading ? <p className="lvd-empty">Loading your schedule…</p> : null}

      {!loading && data ? (
        <>
          {todayDuties.length ? (
            <p className="lvd-alert is-success">
              You are covering {todayDuties.length} period{todayDuties.length === 1 ? '' : 's'} today because a
              colleague is on approved leave. Details below.
            </p>
          ) : null}

          <section className="lvd-grid">
            <article className="lvd-panel">
              <h3>Substitute duty</h3>
              <p className="lvd-footnote">
                Classes assigned to you while the regular teacher is on approved leave. The same duty was emailed to
                you.
              </p>
              {!duties.length ? (
                <p className="lvd-empty">No substitute duty assigned to you right now.</p>
              ) : null}
              <div className="lvd-list">
                {duties.map((row) => (
                  <div className="lvd-card" key={row.id}>
                    <div className="lvd-card__head">
                      <div>
                        <span className="lvd-name">
                          {row.periodLabel} · {row.time || '—'}
                        </span>
                        <span className="lvd-sub">
                          {formatDay(row.date)} · {row.dayLabel}
                        </span>
                      </div>
                      <span className={`lvd-chip ${row.date === data.date ? 'is-pending' : 'is-approved'}`}>
                        {row.date === data.date ? 'Today' : 'Upcoming'}
                      </span>
                    </div>
                    <p className="lvd-reason">
                      {row.className} · {row.subject || '—'}
                    </p>
                    <dl className="lvd-meta">
                      <div>
                        <dt>Regular teacher</dt>
                        <dd>{row.absentTeacherName || row.absentTeacherEmail}</dd>
                      </div>
                      <div>
                        <dt>Reason</dt>
                        <dd>Approved leave</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </article>

            <article className="lvd-panel">
              <h3>Today</h3>
              <p className="lvd-footnote">Your own periods for {formatDay(data.date)}.</p>
              {!data.today?.length ? <p className="lvd-empty">No class scheduled for you today.</p> : null}
              <div className="lvd-list">
                {(data.today || []).map((row) => {
                  const period = periods.find((item) => Number(item.no) === Number(row.periodNo))
                  return (
                    <div className="lvd-card" key={row.id}>
                      <div className="lvd-card__head">
                        <div>
                          <span className="lvd-name">{row.className}</span>
                          <span className="lvd-sub">
                            {row.subject || '—'}
                            {row.room ? ` · ${row.room}` : ''}
                          </span>
                        </div>
                        <span className="lvd-chip is-approved">
                          {period ? `${period.start}–${period.end}` : `Period ${row.periodNo}`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {absences.length ? (
                <>
                  <h3>Your periods covered</h3>
                  <p className="lvd-footnote">
                    Periods the school arranged cover for while you are on approved leave.
                  </p>
                  <div className="lvd-list">
                    {absences.slice(0, 8).map((row) => (
                      <div className="lvd-card" key={row.id}>
                        <div className="lvd-card__head">
                          <div>
                            <span className="lvd-name">
                              {row.periodLabel} · {row.className}
                            </span>
                            <span className="lvd-sub">{formatDay(row.date)}</span>
                          </div>
                          <span className={`lvd-chip ${row.status === 'assigned' ? 'is-approved' : 'is-pending'}`}>
                            {row.status === 'assigned' ? 'Covered' : 'Needs cover'}
                          </span>
                        </div>
                        <p className="lvd-reason">
                          {row.status === 'assigned'
                            ? `${row.substituteName || row.substituteEmail} is covering this period.`
                            : 'The school office is arranging a cover teacher.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </article>
          </section>

          <article className="lvd-panel">
            <h3>Weekly timetable</h3>
            <p className="lvd-footnote">Published by the school office. Substitute duties appear separately above.</p>
            {!data.week?.length ? (
              <p className="lvd-empty">
                No period is assigned to you yet. The school office publishes the class schedule from the admin
                timetable page.
              </p>
            ) : (
              <div className="sch-table-scroll">
                <table className="sch-table sch-table--grid">
                  <thead>
                    <tr>
                      <th>Period</th>
                      {DAYS.map((day) => (
                        <th key={day.key}>{day.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periods
                      .filter((period) => period.kind === 'class')
                      .slice()
                      .sort((a, b) => Number(a.no) - Number(b.no))
                      .map((period) => (
                        <tr key={period.no}>
                          <th>
                            {period.label}
                            <span>
                              {period.start}–{period.end}
                            </span>
                          </th>
                          {DAYS.map((day) => {
                            const entry = (byDay.get(day.key) || []).find(
                              (row) => Number(row.periodNo) === Number(period.no),
                            )
                            return (
                              <td key={day.key}>
                                {entry ? (
                                  <>
                                    <strong>{entry.className}</strong>
                                    <span>{entry.subject}</span>
                                    {entry.room ? <em>{entry.room}</em> : null}
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
            )}
          </article>
        </>
      ) : null}
    </div>
  )
}
