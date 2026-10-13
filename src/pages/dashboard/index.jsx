import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PremiumAdmissionForm from '../../components/PremiumAdmissionForm'
import Slide from '../../components/Slide'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { buildAdmissionRecord, buildStudentRecord } from '../../utils/recordBuilders'
import { getAuthUser } from '../../utils/session'
import { AreaTrendChart, BarClusterChart, DonutChart, HorizontalBars, Sparkline } from './ExecCharts'
import './ExecutiveDashboard.css'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad2 = (n) => String(n).padStart(2, '0')

function parseAmount(value) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function dayLabel(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${pad2(d.getDate())} ${MONTH_LABELS[d.getMonth()]}`
}

function lastMonthWindow(count) {
  const out = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      label: MONTH_LABELS[d.getMonth()],
    })
  }
  return out
}

const sumBy = (rows, pick) => rows.reduce((sum, row) => sum + pick(row), 0)

const DashboardPage = () => {
  const [students, setStudents] = usePersistentState(STORAGE_KEYS.students, [])
  const [admissions, setAdmissions] = usePersistentState(STORAGE_KEYS.admissions, [])
  const [teachers] = usePersistentState(STORAGE_KEYS.teachers, [])
  const [attendanceRows] = usePersistentState(STORAGE_KEYS.attendance, [])
  const [feeRows] = usePersistentState(STORAGE_KEYS.fees, [])

  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState('admission')
  const [toast, setToast] = useState('')
  const [chartTab, setChartTab] = useState('attendance')

  const user = getAuthUser()
  const firstName = String(user?.name || user?.email || 'Admin')
    .trim()
    .split(/\s+/)[0]

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  // —— Metrics below are derived only from real records. Where history does
  // not exist the chart/series is marked not `ready` and the panel shows an
  // honest empty note instead of fabricated values. ——
  const paidRevenue = sumBy(
    feeRows.filter((r) => r.status === 'Paid'),
    (r) => parseAmount(r.amount),
  )
  const feeTotal = sumBy(feeRows, (r) => parseAmount(r.amount))
  const pendingFees = feeRows.filter((r) => r.status !== 'Paid').length
  const collectionRate = feeTotal ? Math.round((paidRevenue / feeTotal) * 100) : 0

  const datedDays = useMemo(
    () =>
      [...new Set(attendanceRows.map((r) => String(r.date || '').slice(0, 10)).filter(Boolean))].sort(),
    [attendanceRows],
  )
  const latestDay = datedDays[datedDays.length - 1] || null
  const latestRows = useMemo(
    () => (latestDay ? attendanceRows.filter((r) => String(r.date || '').slice(0, 10) === latestDay) : []),
    [attendanceRows, latestDay],
  )
  const latestPresent = latestRows.filter((r) => r.status === 'Present').length
  const latestLate = latestRows.filter((r) => r.status === 'Late').length
  const latestAbsent = latestRows.filter((r) => r.status === 'Absent').length
  const latestRate = latestRows.length ? Math.round((latestPresent / latestRows.length) * 100) : 0

  const maleCount = students.filter((s) => String(s.gender).toLowerCase() === 'male').length
  const femaleCount = students.filter((s) => String(s.gender).toLowerCase() === 'female').length

  const classStrength = useMemo(() => {
    const map = {}
    students.forEach((s) => {
      const key = String(s.subtitle || 'Unassigned').replace(/^Class\s+/i, '') || 'N/A'
      map[key] = (map[key] || 0) + 1
    })
    return Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [students])

  const monthWindow = useMemo(() => lastMonthWindow(6), [])

  const attendanceTrend = useMemo(() => {
    const days = datedDays.slice(-6)
    const rowsFor = (day) => attendanceRows.filter((r) => String(r.date || '').slice(0, 10) === day)
    return {
      labels: days.map(dayLabel),
      present: days.map((day) => {
        const rows = rowsFor(day)
        const present = rows.filter((r) => r.status === 'Present').length
        return rows.length ? Math.round((present / rows.length) * 100) : 0
      }),
      absent: days.map((day) => rowsFor(day).filter((r) => r.status === 'Absent').length),
      ready: days.length >= 2,
    }
  }, [attendanceRows, datedDays])

  const feeTrend = useMemo(() => {
    const byMonth = monthWindow.map(({ key, label }) => {
      const rows = feeRows.filter((r) => String(r.date || '').slice(0, 7) === key)
      return {
        label,
        collected: sumBy(
          rows.filter((r) => r.status === 'Paid'),
          (r) => parseAmount(r.amount),
        ),
        billed: sumBy(rows, (r) => parseAmount(r.amount)),
      }
    })
    return {
      labels: byMonth.map((m) => m.label),
      collected: byMonth.map((m) => m.collected),
      billed: byMonth.map((m) => m.billed),
      ready: byMonth.some((m) => m.billed > 0),
    }
  }, [feeRows, monthWindow])

  const weeklyFees = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const buckets = [0, 0, 0, 0] // [3 weeks ago, 2 weeks ago, last week, this week]
    feeRows.forEach((row) => {
      if (row.status !== 'Paid' || !row.date) return
      const d = new Date(`${String(row.date).slice(0, 10)}T00:00:00`)
      if (Number.isNaN(d.getTime())) return
      const daysAgo = Math.floor((now - d) / 86400000)
      if (daysAgo < 0) return
      const bucket = 3 - Math.floor(daysAgo / 7)
      if (bucket >= 0) buckets[bucket] += parseAmount(row.amount)
    })
    return { values: buckets, ready: buckets.some((v) => v > 0) }
  }, [feeRows])

  const admissionTrend = useMemo(() => {
    const applications = monthWindow.map(({ key }) =>
      admissions.filter((row) => String(row.createdAt || '').slice(0, 7) === key).length,
    )
    const enrolled = monthWindow.map(({ key }) => {
      const start = `${key}-01`
      const end = `${key}-31`
      return students.filter((s) => {
        const d = String(s.admissionDate || '')
        return d >= start && d <= end
      }).length
    })
    return {
      labels: monthWindow.map((m) => m.label),
      applications,
      enrolled,
      ready: admissions.some((row) => row.createdAt) || students.some((s) => s.admissionDate),
    }
  }, [admissions, students, monthWindow])

  const enrollmentSpark = useMemo(() => {
    if (!students.some((s) => s.admissionDate)) return null
    return monthWindow.map(({ key }) =>
      students.filter((s) => String(s.admissionDate || '') <= `${key}-31`).length,
    )
  }, [students, monthWindow])

  const newThisWeek = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffIso = `${cutoff.getFullYear()}-${pad2(cutoff.getMonth() + 1)}-${pad2(cutoff.getDate())}`
    return students.filter((s) => s.admissionDate && s.admissionDate >= cutoffIso).length
  }, [students])

  const recentIntake = useMemo(() => [...admissions].slice(-4).reverse(), [admissions])

  const kpis = [
    {
      label: 'Students on roll',
      value: students.length,
      note: newThisWeek > 0 ? `+${newThisWeek} admitted this week` : 'No new admissions this week',
      tone: 'blue',
      spark: enrollmentSpark,
      to: '/students',
    },
    {
      label: 'Attendance',
      value: latestRows.length ? `${latestRate}%` : '—',
      note: latestRows.length
        ? `${dayLabel(latestDay)} · ${latestPresent} present · ${latestAbsent} absent`
        : 'No attendance recorded yet',
      tone: 'teal',
      spark: attendanceTrend.ready ? attendanceTrend.present : null,
      to: '/students/attendance',
    },
    {
      label: 'Fee collected',
      value: feeRows.length ? `₹${Math.round(paidRevenue).toLocaleString('en-IN')}` : '—',
      note: feeRows.length ? `${collectionRate}% of billed` : 'No fee records yet',
      tone: 'navy',
      spark: feeTrend.ready ? feeTrend.collected : null,
      to: '/fees/payments',
    },
    {
      label: 'Open exceptions',
      value: latestLate + latestAbsent + pendingFees,
      note: `${pendingFees} fee · ${latestLate + latestAbsent} attendance`,
      tone: 'amber',
      spark: null,
      to: '/fees/payments',
    },
  ]

  const priorityAlerts = [
    {
      title: 'Fee follow-up',
      detail:
        pendingFees > 0
          ? `${pendingFees} invoice${pendingFees === 1 ? '' : 's'} still open before cycle close.`
          : 'No open fee invoices right now.',
      tone: pendingFees > 0 ? 'warning' : 'success',
      to: '/fees/payments',
    },
    {
      title: 'Attendance exceptions',
      detail:
        latestLate + latestAbsent > 0
          ? `${latestLate + latestAbsent} late/absent marks on ${dayLabel(latestDay)}.`
          : 'No late or absent marks in the latest attendance.',
      tone: 'accent',
      to: '/students/attendance',
    },
    {
      title: 'Admissions queue',
      detail:
        admissions.length > 0
          ? `${admissions.length} intake item${admissions.length === 1 ? '' : 's'} waiting on decision.`
          : 'No intake items waiting.',
      tone: 'success',
      to: '/students',
    },
  ]

  const chartConfig = {
    attendance: {
      title: 'Attendance trend',
      subtitle: 'Present % vs absent count · recent recorded days',
      ready: attendanceTrend.ready,
      emptyMessage: 'No dated attendance records yet — the chart fills as attendance is marked.',
      seriesA: attendanceTrend.present,
      seriesB: attendanceTrend.absent,
      labels: attendanceTrend.labels,
      labelA: 'Present %',
      labelB: 'Absent count',
      colorA: '#2f46d8',
      colorB: '#e08a2c',
    },
    finance: {
      title: 'Fee collection trend',
      subtitle: 'Collected vs billed · last 6 months',
      ready: feeTrend.ready,
      emptyMessage: 'No dated fee records yet — record payments with dates to build the trend.',
      seriesA: feeTrend.collected,
      seriesB: feeTrend.billed,
      labels: feeTrend.labels,
      labelA: 'Collected (₹)',
      labelB: 'Billed (₹)',
      colorA: '#17b398',
      colorB: '#2f46d8',
    },
    admissions: {
      title: 'Admissions pipeline',
      subtitle: 'Applications vs enrolled · last 6 months',
      ready: admissionTrend.ready,
      emptyMessage: 'No dated intake records yet — new drafts and admissions build this chart.',
      seriesA: admissionTrend.applications,
      seriesB: admissionTrend.enrolled,
      labels: admissionTrend.labels,
      labelA: 'Applications',
      labelB: 'Enrolled',
      colorA: '#1b2a55',
      colorB: '#2f46d8',
    },
  }

  const activeChart = chartConfig[chartTab]

  const attendanceSegments = [
    { label: 'Present', value: latestPresent, color: '#17b398' },
    { label: 'Late', value: latestLate, color: '#e08a2c' },
    { label: 'Absent', value: latestAbsent, color: '#d64545' },
  ]

  const openAdmission = () => {
    setFormMode('admission')
    setShowForm(true)
  }

  const handleSubmit = async (values) => {
    if (formMode === 'student') {
      setStudents((prev) => [...prev, buildStudentRecord(values, prev.length)])
      setToast('Student profile added.')
    } else {
      setAdmissions((prev) => [...prev, buildAdmissionRecord(values, prev.length)])
      setToast('Admission draft saved.')
    }
    setShowForm(false)
  }

  return (
    <div className="exec-dash">
      <Slide>
        <header className="exec-top">
          <div>
            <p className="exec-kicker">Executive Dashboard</p>
            <h2>Campus command · {firstName}</h2>
            <p>Live enrolment, attendance, fee health and leadership priorities — with analytics.</p>
          </div>
          <div className="exec-top__actions">
            <Link className="exec-btn exec-btn--solid" to="/students/add">
              New admission
            </Link>
            <Link className="exec-btn" to="/students/attendance">
              Attendance
            </Link>
            <Link className="exec-btn" to="/fees/payments">
              Fee desk
            </Link>
            <button type="button" className="exec-btn" onClick={openAdmission}>
              Launch intake
            </button>
          </div>
        </header>
      </Slide>

      <div className="exec-kpi-row">
        {kpis.map((kpi) => (
          <Slide key={kpi.label}>
            <Link to={kpi.to} className={`exec-kpi tone-${kpi.tone}`}>
              <div className="exec-kpi__head">
                <span>{kpi.label}</span>
                {kpi.spark && kpi.spark.length > 1 ? (
                  <Sparkline
                    values={kpi.spark}
                    color={
                      kpi.tone === 'teal' ? '#17b398' : kpi.tone === 'amber' ? '#e08a2c' : kpi.tone === 'navy' ? '#1b2a55' : '#2f46d8'
                    }
                  />
                ) : null}
              </div>
              <strong>{kpi.value}</strong>
              <p>{kpi.note}</p>
            </Link>
          </Slide>
        ))}
      </div>

      <div className="exec-analytics">
        <Slide>
          <section className="exec-panel exec-panel--chart">
            <header className="exec-panel__head">
              <div>
                <p className="exec-kicker">Analytics</p>
                <h3>{activeChart.title}</h3>
                <p>{activeChart.subtitle}</p>
              </div>
              <div className="exec-tabs" role="tablist" aria-label="Chart focus">
                {[
                  ['attendance', 'Attendance'],
                  ['finance', 'Finance'],
                  ['admissions', 'Admissions'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={chartTab === key}
                    className={`exec-tab ${chartTab === key ? 'is-active' : ''}`}
                    onClick={() => setChartTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>
            {activeChart.ready ? (
              <AreaTrendChart
                seriesA={activeChart.seriesA}
                seriesB={activeChart.seriesB}
                labels={activeChart.labels}
                labelA={activeChart.labelA}
                labelB={activeChart.labelB}
                colorA={activeChart.colorA}
                colorB={activeChart.colorB}
              />
            ) : (
              <p className="exec-chart-empty">{activeChart.emptyMessage}</p>
            )}
          </section>
        </Slide>

        <div className="exec-analytics__side">
          <Slide>
            <section className="exec-panel">
              <header className="exec-panel__head exec-panel__head--compact">
                <div>
                  <p className="exec-kicker">Today</p>
                  <h3>Attendance mix</h3>
                </div>
              </header>
              {latestRows.length ? (
                <div className="exec-donut-block">
                  <DonutChart
                    segments={attendanceSegments}
                    centerValue={`${latestRate}%`}
                    centerLabel="Present"
                  />
                  <ul className="exec-donut-legend">
                    {attendanceSegments.map((s) => (
                      <li key={s.label}>
                        <i style={{ background: s.color }} />
                        <span>{s.label}</span>
                        <strong>{s.value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="exec-chart-empty">No attendance recorded yet.</p>
              )}
            </section>
          </Slide>

          <Slide>
            <section className="exec-panel">
              <header className="exec-panel__head exec-panel__head--compact">
                <div>
                  <p className="exec-kicker">Finance</p>
                  <h3>Weekly collections</h3>
                </div>
              </header>
              {weeklyFees.ready ? (
                <BarClusterChart
                  labels={['3w ago', '2w ago', 'Last wk', 'This wk']}
                  values={weeklyFees.values}
                  color="#17b398"
                  formatValue={(v) => `₹${Math.round(v / 1000)}k`}
                />
              ) : (
                <p className="exec-chart-empty">No fee collections in the last 4 weeks.</p>
              )}
            </section>
          </Slide>
        </div>
      </div>

      <div className="exec-lower">
        <Slide>
          <section className="exec-panel">
            <header className="exec-panel__head exec-panel__head--compact">
              <div>
                <p className="exec-kicker">Registry</p>
                <h3>Class strength</h3>
              </div>
              <Link className="exec-link" to="/students">
                Open registry →
              </Link>
            </header>
            {classStrength.length ? (
              <HorizontalBars
                items={classStrength.map((row, i) => ({
                  ...row,
                  color: ['#2f46d8', '#17b398', '#1b2a55', '#e08a2c', '#5c6bff', '#0d8f7a'][i % 6],
                }))}
              />
            ) : (
              <p className="exec-chart-empty">No students on roll yet.</p>
            )}
            <div className="exec-gender">
              <div>
                <span>Boys</span>
                <strong>{maleCount}</strong>
              </div>
              <div>
                <span>Girls</span>
                <strong>{femaleCount}</strong>
              </div>
              <div>
                <span>Faculty</span>
                <strong>{teachers.length}</strong>
              </div>
            </div>
          </section>
        </Slide>

        <Slide>
          <section className="exec-panel">
            <header className="exec-panel__head exec-panel__head--compact">
              <div>
                <p className="exec-kicker">Priority</p>
                <h3>Needs attention</h3>
              </div>
            </header>
            <div className="exec-alert-list">
              {priorityAlerts.map((alert) => (
                <Link key={alert.title} to={alert.to} className={`exec-alert tone-${alert.tone}`}>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </Link>
              ))}
            </div>
          </section>
        </Slide>

        <Slide>
          <section className="exec-panel">
            <header className="exec-panel__head exec-panel__head--compact">
              <div>
                <p className="exec-kicker">Intake</p>
                <h3>Recent admission drafts</h3>
              </div>
            </header>
            {recentIntake.length ? (
              <div className="exec-timeline">
                {recentIntake.map((item) => (
                  <article key={item.id} className="exec-timeline__item">
                    <time>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : '—'}
                    </time>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {item.subtitle} · {item.status}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="exec-chart-empty">No intake drafts yet — use “Launch intake” to start one.</p>
            )}
            <div className="exec-launch-row">
              <Link to="/academics/timetable">Timetable</Link>
              <Link to="/examination/schedule">Exams</Link>
              <Link to="/settings/profile">Profile</Link>
            </div>
          </section>
        </Slide>
      </div>

      {showForm ? (
        <div className="exec-modal" role="dialog" aria-modal="true" aria-label="Admission workflow">
          <div className="exec-modal__backdrop" onClick={() => setShowForm(false)} />
          <div className="exec-modal__panel">
            <PremiumAdmissionForm onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      ) : null}

      {toast ? <div className="exec-toast">{toast}</div> : null}
    </div>
  )
}

export default DashboardPage
