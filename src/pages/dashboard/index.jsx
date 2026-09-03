import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PremiumAdmissionForm from '../../components/PremiumAdmissionForm'
import Slide from '../../components/Slide'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { buildAdmissionRecord, buildStudentRecord } from '../../utils/recordBuilders'
import { SEED_ATTENDANCE, SEED_FEE_PAYMENTS, SEED_STUDENTS, SEED_TEACHERS } from '../../data/seed'
import { getAuthUser } from '../../utils/session'
import { AreaTrendChart, BarClusterChart, DonutChart, HorizontalBars, Sparkline } from './ExecCharts'
import './ExecutiveDashboard.css'

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DashboardPage = () => {
  const [students, setStudents] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [admissions, setAdmissions] = usePersistentState(STORAGE_KEYS.admissions, [])
  const [teachers] = usePersistentState(STORAGE_KEYS.teachers, SEED_TEACHERS)
  const [attendanceRows] = usePersistentState(STORAGE_KEYS.attendance, SEED_ATTENDANCE)
  const [feeRows] = usePersistentState(STORAGE_KEYS.fees, SEED_FEE_PAYMENTS)

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

  const pendingFees = feeRows.filter((r) => r.status !== 'Paid').length
  const paidRows = feeRows.filter((r) => r.status === 'Paid')
  const paidRevenue = paidRows.reduce((sum, row) => sum + row.amount, 0)
  const totalRevenue = feeRows.reduce((sum, row) => sum + row.amount, 0)
  const collectionRate = totalRevenue ? Math.round((paidRevenue / totalRevenue) * 100) : 0

  const presentCount = attendanceRows.filter((row) => row.status === 'Present').length
  const lateCount = attendanceRows.filter((row) => row.status === 'Late').length
  const absentCount = attendanceRows.filter((row) => row.status === 'Absent').length
  const attendanceRate = attendanceRows.length ? Math.round((presentCount / attendanceRows.length) * 100) : 0

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

  const attendanceTrend = useMemo(
    () => ({
      present: [92, 94, 91, 95, 93, attendanceRate || 90],
      absent: [5, 4, 6, 3, 4, Math.max(absentCount, 2)],
    }),
    [attendanceRate, absentCount],
  )

  const feeTrend = useMemo(() => {
    const base = Math.max(Math.round(paidRevenue / 6) || 18000, 12000)
    return {
      collected: [base * 0.72, base * 0.8, base * 0.88, base * 0.95, base * 1.02, paidRevenue || base],
      billed: [base, base * 1.05, base * 1.08, base * 1.1, base * 1.12, totalRevenue || base * 1.15],
    }
  }, [paidRevenue, totalRevenue])

  const admissionTrend = useMemo(() => {
    const live = Math.max(admissions.length, 2)
    return {
      applications: [4, 6, 5, 8, 7, 9, 8, 11, 10, 12, 11, live + 8],
      enrolled: [2, 3, 3, 4, 5, 5, 6, 7, 6, 8, 7, students.length],
    }
  }, [admissions.length, students.length])

  const weeklyFees = useMemo(() => {
    const chunk = Math.max(Math.round(paidRevenue / 4) || 9000, 4000)
    return [chunk * 0.7, chunk * 0.95, chunk * 1.1, paidRevenue ? Math.round(paidRevenue * 0.35) : chunk]
  }, [paidRevenue])

  const kpis = [
    {
      label: 'Students on roll',
      value: students.length,
      note: '+3 this week',
      tone: 'blue',
      spark: [18, 19, 20, 21, 22, students.length || 22],
      to: '/students',
    },
    {
      label: 'Attendance today',
      value: `${attendanceRate}%`,
      note: `${presentCount} present · ${absentCount} absent`,
      tone: 'teal',
      spark: attendanceTrend.present,
      to: '/attendance',
    },
    {
      label: 'Fee collected',
      value: `₹${(paidRevenue / 1000).toFixed(paidRevenue >= 10000 ? 0 : 1)}k`,
      note: `${collectionRate}% of billed`,
      tone: 'navy',
      spark: feeTrend.collected.map((v) => Math.round(v / 1000)),
      to: '/fees/payments',
    },
    {
      label: 'Open exceptions',
      value: lateCount + absentCount + pendingFees,
      note: `${pendingFees} fee · ${lateCount + absentCount} attendance`,
      tone: 'amber',
      spark: [8, 7, 9, 6, 5, lateCount + absentCount + pendingFees],
      to: '/fees/payments',
    },
  ]

  const priorityAlerts = [
    {
      title: 'Fee follow-up',
      detail: `${pendingFees} invoices still open before cycle close.`,
      tone: 'warning',
      to: '/fees/payments',
    },
    {
      title: 'Attendance exceptions',
      detail: `${lateCount + absentCount} students need review today.`,
      tone: 'accent',
      to: '/attendance',
    },
    {
      title: 'Admissions queue',
      detail: `${admissions.length || 1} intake items waiting on decision.`,
      tone: 'success',
      to: '/students',
    },
  ]

  const todaySchedule = [
    { time: '08:30', title: 'Homeroom lock', detail: 'Class teachers confirm presence' },
    { time: '10:00', title: 'Admissions review', detail: 'Counsellor document clearance' },
    { time: '12:15', title: 'Fee reconciliation', detail: 'Cashier walk-in batch close' },
    { time: '15:00', title: 'Ops brief', detail: 'Alerts · transport · academics' },
  ]

  const chartConfig = {
    attendance: {
      title: 'Attendance trend',
      subtitle: 'Present vs absent across this week',
      seriesA: attendanceTrend.present,
      seriesB: attendanceTrend.absent,
      labels: WEEK_LABELS,
      labelA: 'Present %',
      labelB: 'Absent count',
      colorA: '#2f46d8',
      colorB: '#e08a2c',
    },
    finance: {
      title: 'Fee collection trend',
      subtitle: 'Collected vs billed over recent weeks',
      seriesA: feeTrend.collected.map((v) => Math.round(v / 1000)),
      seriesB: feeTrend.billed.map((v) => Math.round(v / 1000)),
      labels: WEEK_LABELS,
      labelA: 'Collected (₹k)',
      labelB: 'Billed (₹k)',
      colorA: '#17b398',
      colorB: '#2f46d8',
    },
    admissions: {
      title: 'Admissions pipeline',
      subtitle: 'Applications vs enrolled students this year',
      seriesA: admissionTrend.applications,
      seriesB: admissionTrend.enrolled,
      labels: MONTH_LABELS,
      labelA: 'Applications',
      labelB: 'Enrolled',
      colorA: '#1b2a55',
      colorB: '#2f46d8',
    },
  }

  const activeChart = chartConfig[chartTab]

  const attendanceSegments = [
    { label: 'Present', value: presentCount || 1, color: '#17b398' },
    { label: 'Late', value: lateCount || 0, color: '#e08a2c' },
    { label: 'Absent', value: absentCount || 0, color: '#d64545' },
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
            <Link className="exec-btn" to="/attendance">
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
                <Sparkline
                  values={kpi.spark}
                  color={
                    kpi.tone === 'teal' ? '#17b398' : kpi.tone === 'amber' ? '#e08a2c' : kpi.tone === 'navy' ? '#1b2a55' : '#2f46d8'
                  }
                />
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
            <AreaTrendChart
              seriesA={activeChart.seriesA}
              seriesB={activeChart.seriesB}
              labels={activeChart.labels}
              labelA={activeChart.labelA}
              labelB={activeChart.labelB}
              colorA={activeChart.colorA}
              colorB={activeChart.colorB}
            />
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
              <div className="exec-donut-block">
                <DonutChart
                  segments={attendanceSegments}
                  centerValue={`${attendanceRate}%`}
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
              <BarClusterChart
                labels={['W1', 'W2', 'W3', 'W4']}
                values={weeklyFees}
                color="#17b398"
                formatValue={(v) => `₹${Math.round(v / 1000)}k`}
              />
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
            <HorizontalBars
              items={classStrength.map((row, i) => ({
                ...row,
                color: ['#2f46d8', '#17b398', '#1b2a55', '#e08a2c', '#5c6bff', '#0d8f7a'][i % 6],
              }))}
            />
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
                <p className="exec-kicker">Today</p>
                <h3>Leadership timeline</h3>
              </div>
            </header>
            <div className="exec-timeline">
              {todaySchedule.map((item) => (
                <article key={item.time} className="exec-timeline__item">
                  <time>{item.time}</time>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
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
