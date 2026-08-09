import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PremiumAdmissionForm from '../../components/PremiumAdmissionForm'
import ParentPortal from '../../components/ParentPortal'
import QRPhotoCapture from '../../components/QRPhotoCapture'
import SmartTimetable from '../../components/SmartTimetable'
import Slide from '../../components/Slide'
import AdmissionsModule from '../../modules/AdmissionsModule'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { buildAdmissionRecord, buildStudentRecord } from '../../utils/recordBuilders'
import { SEED_ATTENDANCE, SEED_FEE_PAYMENTS, SEED_STUDENTS, SEED_TEACHERS } from '../../data/seed'

const DashboardPage = () => {
  const [students, setStudents] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [admissions, setAdmissions] = usePersistentState(STORAGE_KEYS.admissions, [])
  const [teachers] = usePersistentState(STORAGE_KEYS.teachers, SEED_TEACHERS)
  const [feeRows] = usePersistentState(STORAGE_KEYS.fees, SEED_FEE_PAYMENTS)

  const [activeModule] = useState('admissions')
  const [activeAction, setActiveAction] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [executiveView, setExecutiveView] = useState('operations')

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleAction = (action) => {
    setActiveAction(action)
    setShowForm(action === 'Create New Admission' || action === 'Add Student')
  }

  const handleSubmitStudent = async (values) => {
    setStudents((prev) => [...prev, buildStudentRecord(values, prev.length)])
    setToast('Student profile added successfully.')
    setActiveAction(null)
    setShowForm(false)
  }

  const handleSubmitAdmission = async (values) => {
    setAdmissions((prev) => [...prev, buildAdmissionRecord(values, prev.length)])
    setToast('Admission draft saved successfully.')
    setActiveAction(null)
    setShowForm(false)
  }

  const pendingFees = feeRows.filter((r) => r.status !== 'Paid').length
  const attendanceRows = SEED_ATTENDANCE
  const paidRevenue = feeRows.filter((r) => r.status === 'Paid').reduce((sum, row) => sum + row.amount, 0)
  const totalRevenue = feeRows.reduce((sum, row) => sum + row.amount, 0)
  const collectionRate = totalRevenue ? Math.round((paidRevenue / totalRevenue) * 100) : 0
  const presentCount = attendanceRows.filter((row) => row.status === 'Present').length
  const lateCount = attendanceRows.filter((row) => row.status === 'Late').length
  const absentCount = attendanceRows.filter((row) => row.status === 'Absent').length
  const attendanceRate = attendanceRows.length ? Math.round((presentCount / attendanceRows.length) * 100) : 0

  const admissionRows = admissions.map((a) => ({
    ...a,
    title: a.title,
    subtitle: a.subtitle,
    primary: a.primary,
    status: a.status,
    tone: a.tone,
  }))

  const filteredAdmissions = admissionRows.filter(
    (r) =>
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.primary.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const executiveFocus = {
    operations: {
      title: 'Operations cockpit',
      subtitle: 'Watch campus movement, exceptions and readiness from one premium control surface.',
      cards: [
        { label: 'Attendance confidence', value: `${attendanceRate}%`, detail: `${lateCount} late, ${absentCount} absent today` },
        { label: 'Faculty readiness', value: `${teachers.length}`, detail: 'Active teaching staff mapped to timetables' },
        { label: 'Open follow-ups', value: `${pendingFees + admissions.length}`, detail: 'Items needing same-day admin attention' },
      ],
    },
    admissions: {
      title: 'Admissions command center',
      subtitle: 'Track new intake, guardian follow-up and conversion velocity without leaving the dashboard.',
      cards: [
        { label: 'Draft applications', value: `${admissions.length}`, detail: 'Applicants awaiting review or approval' },
        { label: 'Live conversion', value: `${Math.min(100, 40 + admissions.length * 5)}%`, detail: 'Promotions into active registry' },
        { label: 'Next action', value: 'Review docs', detail: 'Guardian verification remains the priority' },
      ],
    },
    finance: {
      title: 'Finance pulse',
      subtitle: 'Get premium visibility on collection health, pending invoices and fee desk momentum.',
      cards: [
        { label: 'Collected', value: `₹${paidRevenue.toLocaleString()}`, detail: 'Posted paid transactions this term' },
        { label: 'Collection rate', value: `${collectionRate}%`, detail: 'Against billed fee volume' },
        { label: 'At-risk accounts', value: `${pendingFees}`, detail: 'Invoices requiring finance outreach' },
      ],
    },
  }

  const priorityAlerts = [
    {
      title: 'Fee follow-up required',
      detail: `${pendingFees} invoices remain unresolved before the next cycle closes.`,
      tone: 'warning',
    },
    {
      title: 'Attendance exception logged',
      detail: `${lateCount + absentCount} students need attendance review and guardian communication.`,
      tone: 'accent',
    },
    {
      title: 'Admissions queue active',
      detail: `${admissions.length || 1} intake items are waiting for validation or decisioning.`,
      tone: 'success',
    },
  ]

  const todaySchedule = [
    { time: '08:30', title: 'Homeroom attendance lock', detail: 'Class teachers confirm final presence.' },
    { time: '10:00', title: 'Admissions review window', detail: 'Counsellor team clears pending documents.' },
    { time: '12:15', title: 'Fee desk reconciliation', detail: 'Cashier closes walk-in payment batch.' },
    { time: '15:00', title: 'Principal operations brief', detail: 'Daily review of alerts, transport and academics.' },
  ]

  const recentActivity = [
    { title: 'Student promoted to live registry', detail: 'A new Grade 8 learner was converted from admissions.' },
    { title: 'Faculty profile updated', detail: 'Subject assignment adjusted for senior mathematics.' },
    { title: 'Parent portal usage spike', detail: 'Guardians opened report cards and attendance summaries.' },
    { title: 'Transport route confirmed', detail: 'Driver roster synced with tomorrow morning departures.' },
  ]

  const platformStatus = [
    { label: 'Admissions sync', value: 'Healthy', tone: 'success' },
    { label: 'Attendance engine', value: 'Live', tone: 'success' },
    { label: 'Fee desk alerts', value: pendingFees ? 'Needs review' : 'Stable', tone: pendingFees ? 'warning' : 'success' },
    { label: 'Guardian communication', value: 'Ready', tone: 'accent' },
  ]

  const quickLaunch = [
    { label: 'Create student record', to: '/students/add' },
    { label: 'Open fee desk', to: '/fees/payments' },
    { label: 'Review timetable', to: '/academics/timetable' },
    { label: 'View attendance', to: '/attendance' },
  ]

  const currentExecutiveView = executiveFocus[executiveView]

  return (
    <div className="sms-page-stack">
      <div className="page-hero">
        <Slide>
          <section className="page-card">
            <p className="admin-kicker">Overview</p>
            <h2>Operations at a glance</h2>
            <p>
              Manage enrolment, attendance, fees, academics and guardian communication from a polished
              command dashboard designed for school leadership.
            </p>
            <div className="link-row">
              <Link className="link-pill" to="/students/add">
                New admission
              </Link>
              <Link className="link-pill" to="/attendance">
                Mark attendance
              </Link>
              <Link className="link-pill" to="/fees/payments">
                Record payment
              </Link>
              <Link className="link-pill" to="/examination/schedule">
                Exam schedule
              </Link>
            </div>
          </section>
        </Slide>
        <Slide>
          <section className="page-card executive-pulse-card">
            <p className="admin-kicker">Executive Pulse</p>
            <div className="executive-pulse-grid">
              <article className="executive-mini-stat">
                <span>Students</span>
                <strong>{students.length}</strong>
                <p>Active registry</p>
              </article>
              <article className="executive-mini-stat">
                <span>Faculty</span>
                <strong>{teachers.length}</strong>
                <p>Teaching staff</p>
              </article>
              <article className="executive-mini-stat">
                <span>Fee alerts</span>
                <strong>{pendingFees}</strong>
                <p>Invoices needing follow-up</p>
              </article>
              <article className="executive-mini-stat">
                <span>Attendance</span>
                <strong>{attendanceRate}%</strong>
                <p>Present by first roll call</p>
              </article>
            </div>
          </section>
        </Slide>
      </div>

      <div className="executive-strip">
        <Slide>
          <article className="premium-kpi-card">
            <p className="premium-kpi-label">Collection Health</p>
            <strong>₹{paidRevenue.toLocaleString()}</strong>
            <span>{collectionRate}% of billed fee volume collected</span>
          </article>
        </Slide>
        <Slide>
          <article className="premium-kpi-card">
            <p className="premium-kpi-label">Admissions Pipeline</p>
            <strong>{admissions.length}</strong>
            <span>Draft and reviewed applicants in progress</span>
          </article>
        </Slide>
        <Slide>
          <article className="premium-kpi-card">
            <p className="premium-kpi-label">Campus Readiness</p>
            <strong>{teachers.length + students.length}</strong>
            <span>Profiles coordinated across operations modules</span>
          </article>
        </Slide>
        <Slide>
          <article className="premium-kpi-card">
            <p className="premium-kpi-label">Exceptions</p>
            <strong>{lateCount + absentCount + pendingFees}</strong>
            <span>Priority follow-ups for admin teams today</span>
          </article>
        </Slide>
      </div>

      <div className="command-center-grid">
        <Slide>
          <section className="premium-panel command-center-panel">
            <div className="premium-panel-header">
              <div>
                <p className="panel-kicker">Command Center</p>
                <h3>{currentExecutiveView.title}</h3>
                <p className="premium-panel-copy">{currentExecutiveView.subtitle}</p>
              </div>
              <div className="executive-switcher">
                <button
                  type="button"
                  className={`executive-chip ${executiveView === 'operations' ? 'active' : ''}`}
                  onClick={() => setExecutiveView('operations')}
                >
                  Operations
                </button>
                <button
                  type="button"
                  className={`executive-chip ${executiveView === 'admissions' ? 'active' : ''}`}
                  onClick={() => setExecutiveView('admissions')}
                >
                  Admissions
                </button>
                <button
                  type="button"
                  className={`executive-chip ${executiveView === 'finance' ? 'active' : ''}`}
                  onClick={() => setExecutiveView('finance')}
                >
                  Finance
                </button>
              </div>
            </div>

            <div className="executive-focus-grid">
              {currentExecutiveView.cards.map((card) => (
                <article key={card.label} className="executive-focus-card">
                  <p>{card.label}</p>
                  <strong>{card.value}</strong>
                  <span>{card.detail}</span>
                </article>
              ))}
            </div>

            <div className="quick-launch-grid">
              {quickLaunch.map((link) => (
                <Link key={link.to} to={link.to} className="quick-launch-card">
                  <strong>{link.label}</strong>
                  <span>Open module</span>
                </Link>
              ))}
            </div>
          </section>
        </Slide>

        <div className="priority-stack">
          <Slide>
            <section className="premium-panel priority-panel">
              <div className="premium-panel-header compact">
                <div>
                  <p className="panel-kicker">Priority Alerts</p>
                  <h3>What needs attention</h3>
                </div>
              </div>
              <div className="priority-alert-list">
                {priorityAlerts.map((alert) => (
                  <article key={alert.title} className={`priority-alert ${alert.tone}`}>
                    <strong>{alert.title}</strong>
                    <p>{alert.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          </Slide>

          <Slide>
            <section className="premium-panel leadership-panel">
              <p className="panel-kicker">Leadership Note</p>
              <h3>Premium campus operations</h3>
              <p className="premium-panel-copy">
                The platform is ready for principal review, fee desk supervision and admissions decisioning.
              </p>
              <ul className="leadership-list">
                <li>Guardian communication windows are prepared.</li>
                <li>Academic and transport modules are available from the same shell.</li>
                <li>Admissions, registry and fee desk now feel like one premium product.</li>
              </ul>
              <button type="button" className="leadership-action" onClick={() => handleAction('Create New Admission')}>
                Launch admission workflow
              </button>
            </section>
          </Slide>
        </div>
      </div>

      <div className="dashboard-summary">
        <Slide>
          <section className="summary-panel">
            <h3>Admissions & intake</h3>
            <p>
              Review applicants, capture multi-step admission data, and promote accepted students into the live
              registry without leaving the console.
            </p>
            <div className="summary-actions">
              <button type="button" onClick={() => handleAction('Review Applicants')}>
                Review applicants
              </button>
              <button type="button" onClick={() => handleAction('Create New Admission')}>
                Create new admission
              </button>
              <button type="button" onClick={() => handleAction('Add Student')}>
                Add student
              </button>
              <Link to="/students" className="link-pill" style={{ alignSelf: 'center' }}>
                Open full registry
              </Link>
            </div>
            <div className="summary-highlights">
              <div className="highlight-item">Secure intake with guardian verification and document checklist.</div>
              <div className="highlight-item">Status tracking across admissions, attendance, exams and fees.</div>
              <div className="highlight-item">Parent portal, QR capture and timetable previews below.</div>
            </div>
          </section>
        </Slide>

        <Slide>
          <AdmissionsModule
            module={{
              title: 'Admissions pipeline',
              subtitle: 'Draft applications and promoted students.',
              actions: ['Review Applicants', 'Create New Admission', 'Add Student', 'Generate Report'],
              stats: [
                { label: 'Applicants', value: String(admissions.length), note: 'Drafts in queue' },
                { label: 'Enrolled', value: String(students.length), note: 'Students on roll' },
              ],
              rows: filteredAdmissions,
              columns: ['Applicant', 'Class', 'Status', 'Guardian'],
              features: ['Multi-step forms', 'Document tracking', 'Promote to registry'],
              workflow: ['Intake form', 'Document review', 'Approval & enrolment'],
              trendLabel: 'Pipeline velocity',
              ring: { total: `${Math.min(100, 40 + admissions.length * 5)}%`, subtitle: 'Conversion' },
              checklist: ['Verify CNIC', 'Collect TC', 'Assign roll number'],
            }}
            onActionClick={handleAction}
            searchTerm={searchQuery}
            setSearchTerm={setSearchQuery}
            filteredRecords={filteredAdmissions}
            selectedRecordKey={null}
            setSelectedRecordKey={() => {}}
            activeAction={activeAction}
            actionConfig={{}}
            formValues={{}}
            onFieldChange={() => {}}
            onFormSubmit={() => {}}
            onFormReset={() => {}}
            onActionSelect={() => {}}
            systemMessage={activeModule === 'admissions' ? 'Admissions sync active' : 'Ready'}
            notificationsEnabled
            selectedRecord={null}
          />
        </Slide>

        <div className="operations-grid">
          <Slide>
            <section className="premium-panel schedule-panel">
              <div className="premium-panel-header compact">
                <div>
                  <p className="panel-kicker">Today Schedule</p>
                  <h3>Leadership timeline</h3>
                </div>
              </div>
              <div className="timeline-list">
                {todaySchedule.map((item) => (
                  <article key={item.time} className="timeline-item">
                    <span className="timeline-time">{item.time}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </Slide>

          <Slide>
            <section className="premium-panel activity-panel">
              <div className="premium-panel-header compact">
                <div>
                  <p className="panel-kicker">Recent Activity</p>
                  <h3>Operational movement</h3>
                </div>
              </div>
              <div className="activity-list">
                {recentActivity.map((item) => (
                  <article key={item.title} className="activity-item">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          </Slide>

          <Slide>
            <section className="premium-panel finance-panel">
              <div className="premium-panel-header compact">
                <div>
                  <p className="panel-kicker">Finance Overview</p>
                  <h3>Revenue and collection</h3>
                </div>
              </div>
              <div className="finance-metric-grid">
                <article className="finance-metric">
                  <span>Total billed</span>
                  <strong>₹{totalRevenue.toLocaleString()}</strong>
                </article>
                <article className="finance-metric">
                  <span>Collected</span>
                  <strong>₹{paidRevenue.toLocaleString()}</strong>
                </article>
                <article className="finance-metric">
                  <span>Pending cases</span>
                  <strong>{pendingFees}</strong>
                </article>
              </div>
            </section>
          </Slide>

          <Slide>
            <section className="premium-panel status-panel">
              <div className="premium-panel-header compact">
                <div>
                  <p className="panel-kicker">Platform Health</p>
                  <h3>Service readiness</h3>
                </div>
              </div>
              <div className="status-health-list">
                {platformStatus.map((item) => (
                  <article key={item.label} className={`status-health-item ${item.tone}`}>
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                  </article>
                ))}
              </div>
            </section>
          </Slide>
        </div>

        <div className="feature-cards">
          <Slide>
            <article className="feature-card">
              <h4>Parent portal</h4>
              <ParentPortal />
            </article>
          </Slide>
          <Slide>
            <article className="feature-card">
              <h4>QR photo capture</h4>
              <QRPhotoCapture />
            </article>
          </Slide>
          <Slide>
            <article className="feature-card">
              <h4>Smart timetable</h4>
              <SmartTimetable />
            </article>
          </Slide>
        </div>

        {showForm && (
          <Slide>
            <section className="form-panel">
              <PremiumAdmissionForm
                onSubmit={activeAction === 'Add Student' ? handleSubmitStudent : handleSubmitAdmission}
                onCancel={() => setShowForm(false)}
              />
            </section>
          </Slide>
        )}

        {toast && <div className="toast-notice">{toast}</div>}
      </div>
    </div>
  )
}

export default DashboardPage
