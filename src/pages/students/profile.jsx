import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS } from '../../data/seed'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

const getAvatarGradient = (student) => {
  if (student?.gender === 'Male') return 'linear-gradient(135deg,#6fc3ff,#7c6cff)'
  if (student?.gender === 'Female') return 'linear-gradient(135deg,#ff93c2,#7c6cff)'
  return 'linear-gradient(135deg,#a8b5cf,#7c8cff)'
}

const getStatusTone = (status) => {
  if (status === 'Active') return 'success'
  if (status === 'On Leave') return 'warning'
  if (status === 'Inactive') return 'danger'
  return ''
}

const buildAttendanceCalendar = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDay; i++) days.push({ empty: true, index: -i })
  for (let d = 1; d <= daysInMonth; d++) {
    const r = Math.random()
    let status = 'P'
    if (r > 0.92) status = 'A'
    else if (r > 0.85) status = 'L'
    days.push({ day: d, status, date: new Date(year, month, d).toISOString().slice(0, 10) })
  }
  return days
}

const ATTENDANCE_STATUS_META = {
  P: { label: 'Present', color: '#17b398', bg: 'rgba(23, 179, 152, 0.14)' },
  A: { label: 'Absent', color: '#f35d5d', bg: 'rgba(243, 93, 93, 0.14)' },
  L: { label: 'Late', color: '#f4b562', bg: 'rgba(244, 181, 98, 0.2)' },
}

const SUBJECT_PERFORMANCE = [
  { subject: 'Mathematics', marks: 87, grade: 'A+', progress: [65, 72, 78, 82, 85, 87] },
  { subject: 'Science', marks: 92, grade: 'A+', progress: [78, 80, 85, 88, 90, 92] },
  { subject: 'English', marks: 78, grade: 'B+', progress: [60, 65, 70, 72, 75, 78] },
  { subject: 'History', marks: 71, grade: 'B', progress: [55, 60, 62, 66, 68, 71] },
  { subject: 'Geography', marks: 84, grade: 'A', progress: [70, 73, 77, 80, 82, 84] },
  { subject: 'Computer', marks: 95, grade: 'A+', progress: [82, 85, 88, 90, 93, 95] },
]

const TERM_COMPARISON = [
  { name: 'Term 1', avg: 74, rank: 12 },
  { name: 'Term 2', avg: 79, rank: 9 },
  { name: 'Term 3', avg: 84, rank: 5 },
]

const ATTENDANCE_TREND = [
  { w: 'W1', present: 92 },
  { w: 'W2', present: 88 },
  { w: 'W3', present: 95 },
  { w: 'W4', present: 90 },
]

const ATTENDANCE_TAB_STATS = [
  { label: 'Present', value: 22, meta: ATTENDANCE_STATUS_META.P },
  { label: 'Absent', value: 2, meta: ATTENDANCE_STATUS_META.A },
  { label: 'Late', value: 3, meta: ATTENDANCE_STATUS_META.L },
]

const DOCUMENTS = [
  { id: 'DOC001', name: 'Birth Certificate.pdf', category: 'Identity', size: '248 KB', date: '2025-11-02', verified: true },
  { id: 'DOC002', name: 'Previous Year Report Card.pdf', category: 'Academic', size: '512 KB', date: '2025-11-02', verified: true },
  { id: 'DOC003', name: 'Medical Fitness Certificate.pdf', category: 'Medical', size: '198 KB', date: '2025-11-15', verified: false },
  { id: 'DOC004', name: 'Aadhar Card (Copy).pdf', category: 'Identity', size: '312 KB', date: '2025-11-02', verified: true },
  { id: 'DOC005', name: 'Transport Route Form.pdf', category: 'Transport', size: '145 KB', date: '2025-12-01', verified: false },
]

const REQUIRED_DOCS = [
  { name: 'Birth Certificate', done: true },
  { name: 'Previous Year Report Card', done: true },
  { name: 'Medical Fitness Certificate', done: false },
  { name: 'ID / Aadhar Proof', done: true },
  { name: 'Passport Photo (3 Copies)', done: true },
  { name: 'Transfer Certificate (if applicable)', done: false },
]

const StudentProfilePage = () => {
  const location = useLocation()
  const [students, setStudents] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarFilter, setSidebarFilter] = useState('')
  const passedStudentId = location.state?.studentId

  const [selectedId, setSelectedId] = useState(() => {
    if (passedStudentId && students.some((s) => s.id === passedStudentId)) return passedStudentId
    return students[0]?.id || ''
  })

  const student = useMemo(() => students.find((s) => s.id === selectedId) || students[0], [students, selectedId])
  const calendarDays = useMemo(buildAttendanceCalendar, [selectedId])
  const overallPct = useMemo(() => {
    const total = SUBJECT_PERFORMANCE.reduce((s, x) => s + x.marks, 0)
    return Math.round(total / SUBJECT_PERFORMANCE.length)
  }, [])

  const filteredSidebar = students.filter((s) => {
    if (!sidebarFilter) return true
    const q = sidebarFilter.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || (s.subtitle || '').toLowerCase().includes(q)
  })

  const handleDelete = () => {
    if (!student) return
    if (window.confirm(`Delete ${student.title}?`)) {
      setStudents((prev) => prev.filter((s) => s.id !== student.id))
      setToast('Student deleted')
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '👤' },
    { id: 'academics', label: 'Academics', icon: '📚' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'documents', label: 'Documents', icon: '📁' },
  ]

  const InfoRow = ({ label, value, highlight }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(65, 87, 255, 0.06)' }}>
      <span style={{ fontSize: '0.86rem', color: '#7f8ba5', fontWeight: '600' }}>{label}</span>
      <span style={{
        fontSize: '0.88rem',
        color: highlight ? '#4157ff' : '#111b33',
        fontWeight: highlight ? '800' : '700',
        textAlign: 'right',
        wordBreak: 'break-word',
      }}>{value || '—'}</span>
    </div>
  )

  const ParentCard = ({ title, name, occupation, phone, email, gradient }) => (
    <div style={{
      background: `linear-gradient(135deg, ${gradient}, #ffffff 85%)`,
      borderRadius: '18px',
      padding: '18px',
      border: '1px solid rgba(65, 87, 255, 0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          background: gradient,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '800',
          fontSize: '18px',
          boxShadow: '0 6px 14px rgba(65, 87, 255, 0.2)',
        }}>
          {name?.charAt(0).toUpperCase() || 'P'}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '700', color: '#7f8ba5', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</p>
          <h4 style={{ margin: '2px 0 0', fontSize: '15px', color: '#111b33', fontWeight: '800' }}>{name || 'Not provided'}</h4>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.86rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Occupation</span>
          <span style={{ color: '#111b33', fontWeight: '700' }}>{occupation || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Phone</span>
          <span style={{ color: '#4157ff', fontWeight: '700' }}>{phone || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Email</span>
          <span style={{ color: '#111b33', fontWeight: '600', fontSize: '0.8rem' }}>{email || '—'}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
          <div>
            <p className="admin-kicker">360° View</p>
            <h2>Student Profiles</h2>
            <p>Browse every student and access complete master-detail records with tabs for academics, attendance, and documents.</p>
          </div>
          <div className="link-row" style={{ gap: '10px' }}>
            <Link className="link-pill" to="/students">← Back to Registry</Link>
            <Link className="link-pill" to="/students/performance">📊 Performance</Link>
            <Link className="link-pill" to="/students/transfer-certificate">📄 Generate TC</Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '18px' }}>
        <aside className="panel-card data-panel" style={{ alignSelf: 'flex-start' }}>
          <div className="panel-header compact">
            <div>
              <p className="panel-kicker">Students</p>
              <h3>Master List</h3>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="🔍 Search student..."
              value={sidebarFilter}
              onChange={(e) => setSidebarFilter(e.target.value)}
              className="search-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredSidebar.map((s) => {
              const isSel = s.id === selectedId
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    background: isSel
                      ? 'linear-gradient(135deg, rgba(65, 87, 255, 0.16), rgba(124, 140, 255, 0.08))'
                      : 'transparent',
                    outline: isSel ? '2px solid rgba(65, 87, 255, 0.3)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    color: 'white',
                    background: getAvatarGradient(s),
                    fontSize: '14px',
                    flexShrink: 0,
                  }}>
                    {s.title.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: isSel ? '800' : '700',
                      color: '#111b33',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>{s.title}</p>
                    <p style={{
                      margin: '2px 0 0',
                      fontSize: '11px',
                      color: '#7f8ba5',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {s.id} · {s.subtitle}
                    </p>
                  </div>
                  <span className={`status-pill ${getStatusTone(s.status)}`} style={{ padding: '3px 8px', fontSize: '0.62rem' }}>
                    {s.status === 'Active' ? '✓' : '⏸'}
                  </span>
                </button>
              )
            })}
            {filteredSidebar.length === 0 && (
              <div className="empty-state"><p>No students match the search.</p></div>
            )}
          </div>
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {!student ? (
            <article className="panel-card data-panel">
              <div className="empty-state">
                <p>No students yet — add one from the registry.</p>
                <div style={{ marginTop: 12 }}>
                  <Link to="/students/add" className="link-pill">Add Student</Link>
                </div>
              </div>
            </article>
          ) : (
            <>
              <article className="panel-card data-panel" style={{
                background: 'linear-gradient(145deg, rgba(65, 87, 255, 0.08) 0%, rgba(255,255,255,1) 65%)',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '22px' }}>
                  <div style={{
                    width: '128px',
                    height: '128px',
                    borderRadius: '28px',
                    border: '4px solid rgba(255,255,255,0.8)',
                    overflow: 'hidden',
                    background: getAvatarGradient(student),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '56px',
                    fontWeight: '800',
                    boxShadow: '0 16px 32px rgba(65, 87, 255, 0.22)',
                    flexShrink: 0,
                  }}>
                    {student.title.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#111b33' }}>{student.title}</h2>
                      <span className={`status-pill ${getStatusTone(student.status)}`} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>{student.status}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', color: '#5c6b8c', fontSize: '15px', fontWeight: '600' }}>
                      {student.subtitle} · Roll <strong style={{ color: '#4157ff' }}>{student.id}</strong>
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <span className="status-pill" style={{ background: 'rgba(23, 179, 152, 0.12)', color: '#0d8f7a' }}>
                        🎓 Enrolled
                      </span>
                      {student.gender && (
                        <span className="status-pill" style={{ background: 'rgba(65, 87, 255, 0.1)', color: '#4157ff' }}>
                          {student.gender === 'Male' ? '♂' : student.gender === 'Female' ? '♀' : '⚧'} {student.gender}
                        </span>
                      )}
                      {student.transportRequired && (
                        <span className="status-pill" style={{ background: 'rgba(244, 181, 98, 0.16)', color: '#b07820' }}>
                          🚌 Transport
                        </span>
                      )}
                      {student.hostelRequired && (
                        <span className="status-pill" style={{ background: 'rgba(127, 139, 165, 0.18)', color: '#5c6b8c' }}>
                          🏠 Hostel
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Link to={`/students/add`} state={{ editId: student.id }} className="small-action" style={{
                      background: 'linear-gradient(135deg, #4157ff, #7c8cff)',
                      color: 'white',
                      border: 'none',
                      textDecoration: 'none',
                      textAlign: 'center',
                      padding: '10px 20px',
                      fontWeight: '700',
                    }}>
                      ✏ Edit Profile
                    </Link>
                    <button
                      type="button"
                      className="small-action"
                      onClick={() => {
                        const msg = window.prompt(`Message ${student.primary || student.title}`, '')
                        if (msg) setToast('Message queued')
                      }}
                    >
                      ✉ Contact Parent
                    </button>
                    <button type="button" className="small-action" onClick={handleDelete} style={{ color: '#f35d5d', borderColor: 'rgba(243, 93, 93, 0.3)' }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </article>

              <article className="panel-card data-panel">
                <div className="action-tabs">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`action-tab ${activeTab === t.id ? 'active' : ''}`}
                    >
                      <span style={{ marginRight: '6px' }}>{t.icon}</span>
                      {t.label}
                    </button>
                  ))}
                </div>

                {activeTab === 'overview' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Personal</p>
                          <h3>Personal Information</h3>
                        </div>
                      </div>
                      <InfoRow label="Full Name" value={`${student.firstName || ''} ${student.lastName || student.title}`.trim()} highlight />
                      <InfoRow label="Date of Birth" value={student.dateOfBirth} />
                      <InfoRow label="Gender" value={student.gender} />
                      <InfoRow label="Blood Group" value={student.bloodGroup} />
                      <InfoRow label="Nationality" value="Indian" />
                      <InfoRow label="Languages Known" value={student.languages} />
                    </div>

                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Contact</p>
                          <h3>Contact Details</h3>
                        </div>
                      </div>
                      <InfoRow label="Email" value={student.email || student.owner} />
                      <InfoRow label="Phone" value={student.phone} />
                      <InfoRow label="Address" value={student.currentAddress} />
                      <InfoRow label="City" value="—" />
                      <InfoRow label="Pincode" value="—" />
                      <InfoRow label="Alternate Contact" value={student.fatherPhone || student.motherPhone} />
                    </div>

                    <ParentCard
                      title="Father"
                      name={student.fatherName}
                      occupation={student.fatherOccupation}
                      phone={student.fatherPhone}
                      email={student.fatherEmail}
                      gradient="linear-gradient(135deg, #6fc3ff, #4157ff)"
                    />

                    <ParentCard
                      title="Mother"
                      name={student.motherName}
                      occupation={student.motherOccupation}
                      phone={student.motherPhone}
                      email={student.motherEmail}
                      gradient="linear-gradient(135deg, #ff93c2, #7c6cff)"
                    />

                    <div className="panel-card data-panel" style={{ padding: '18px', gridColumn: 'span 1 / -1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        <div>
                          <p className="panel-kicker" style={{ marginBottom: '6px' }}>Transport</p>
                          <h4 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#111b33', fontWeight: '800' }}>Transport & Services</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Transport Required</span>
                              <span style={{ color: student.transportRequired ? '#17b398' : '#f35d5d', fontWeight: '700' }}>
                                {student.transportRequired ? '✓ Yes' : '✗ No'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Hostel Required</span>
                              <span style={{ color: student.hostelRequired ? '#17b398' : '#f35d5d', fontWeight: '700' }}>
                                {student.hostelRequired ? '✓ Yes' : '✗ No'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Bus Route</span>
                              <span style={{ color: '#111b33', fontWeight: '700' }}>{student.transportRequired ? 'Route 3 · Sector 7' : '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Pickup Point</span>
                              <span style={{ color: '#111b33', fontWeight: '700' }}>{student.transportRequired ? 'Park Square' : '—'}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="panel-kicker" style={{ marginBottom: '6px' }}>Enrollment</p>
                          <h4 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#111b33', fontWeight: '800' }}>Academic Enrollment</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Class / Section</span>
                              <span style={{ color: '#4157ff', fontWeight: '800' }}>{student.subtitle}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Roll Number</span>
                              <span style={{ color: '#111b33', fontWeight: '700' }}>{student.id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Admission Date</span>
                              <span style={{ color: '#111b33', fontWeight: '700' }}>{student.admissionDate || '2025-11-01'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Academic Year</span>
                              <span style={{ color: '#111b33', fontWeight: '700' }}>2025-2026</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="panel-kicker" style={{ marginBottom: '6px' }}>Health</p>
                          <h4 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#111b33', fontWeight: '800' }}>Medical Details</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Blood Group</span>
                              <span style={{ color: '#f35d5d', fontWeight: '800' }}>{student.bloodGroup || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Allergies</span>
                              <span style={{ color: '#111b33', fontWeight: '700' }}>None on record</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Emergency Contact</span>
                              <span style={{ color: '#4157ff', fontWeight: '700' }}>{student.fatherPhone || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Insurance</span>
                              <span style={{ color: '#17b398', fontWeight: '700' }}>✓ Covered</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'academics' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="content-grid">
                      {[
                        { label: 'Overall %', value: `${overallPct}%`, note: 'Average across subjects', gradient: 'linear-gradient(135deg, #4157ff, #7c8cff)' },
                        { label: 'CGPA', value: (overallPct / 9.5).toFixed(2), note: 'On 10.0 scale', gradient: 'linear-gradient(135deg, #17b398, #5fe0c6)' },
                        { label: 'Class Rank', value: '#5', note: 'Out of 45 students', gradient: 'linear-gradient(135deg, #f4b562, #ffd9a8)' },
                        { label: 'Subjects Passed', value: `${SUBJECT_PERFORMANCE.length}/${SUBJECT_PERFORMANCE.length}`, note: 'All subjects cleared', gradient: 'linear-gradient(135deg, #f35d5d, #ff9b9b)' },
                      ].map((k, idx) => (
                        <div key={idx} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: k.gradient,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            boxShadow: '0 6px 14px rgba(65, 87, 255, 0.18)',
                          }}>
                            {['🎯', '🏆', '🥇', '📚'][idx]}
                          </div>
                          <span>{k.label}</span>
                          <strong className="stat-value">{k.value}</strong>
                          <p className="stat-note">{k.note}</p>
                        </div>
                      ))}
                    </div>

                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Performance</p>
                          <h3>Term-wise Comparison</h3>
                        </div>
                      </div>
                      <div style={{ height: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={TERM_COMPARISON}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                fontWeight: '600',
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="avg"
                              stroke="#4157ff"
                              strokeWidth={3}
                              dot={{ r: 6, fill: '#4157ff', strokeWidth: 2, stroke: '#fff' }}
                              name="Average %"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Subjects</p>
                          <h3>Subject-wise Performance</h3>
                        </div>
                        <span style={{ fontSize: '0.82rem', color: '#7f8ba5', fontWeight: '600' }}>Current term</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                        {SUBJECT_PERFORMANCE.map((sp, i) => {
                          const pass = sp.marks >= 40
                          return (
                            <div key={i} style={{
                              background: 'linear-gradient(180deg, #ffffff, #f7f8ff)',
                              borderRadius: '16px',
                              padding: '14px',
                              border: '1px solid rgba(65, 87, 255, 0.08)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <h4 style={{ margin: 0, fontSize: '13px', color: '#111b33', fontWeight: '800' }}>{sp.subject}</h4>
                                <span className={`status-pill ${pass ? 'success' : ''}`} style={pass ? { background: 'rgba(23, 179, 152, 0.14)', color: '#0d8f7a' } : { background: 'rgba(243, 93, 93, 0.14)', color: '#f35d5d' }}>
                                  {pass ? 'Pass' : 'Fail'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div>
                                  <span style={{ fontSize: '0.72rem', color: '#7f8ba5', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Marks</span>
                                  <strong style={{ display: 'block', fontSize: '24px', color: '#111b33', fontWeight: '800' }}>{sp.marks}</strong>
                                </div>
                                <div style={{
                                  background: 'linear-gradient(135deg, #4157ff, #7c8cff)',
                                  color: 'white',
                                  padding: '6px 14px',
                                  borderRadius: '10px',
                                  fontWeight: '800',
                                  fontSize: '14px',
                                  boxShadow: '0 6px 12px rgba(65, 87, 255, 0.2)',
                                }}>
                                  {sp.grade}
                                </div>
                              </div>
                              <div style={{ height: '52px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={sp.progress.map((m, j) => ({ i: j + 1, v: m }))}>
                                    <Line type="monotone" dataKey="v" stroke={sp.marks >= 85 ? '#17b398' : sp.marks >= 65 ? '#4157ff' : '#f4b562'} strokeWidth={2} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'attendance' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="content-grid">
                      {ATTENDANCE_TAB_STATS.map((s, idx) => (
                        <div key={idx} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
                          <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: s.meta.bg,
                            color: s.meta.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            fontWeight: '800',
                            fontSize: '18px',
                          }}>
                            {s.label.charAt(0)}
                          </div>
                          <span>{s.label}</span>
                          <strong className="stat-value" style={{ color: s.meta.color }}>{s.value}</strong>
                          <p className="stat-note">{s.label} days this month</p>
                        </div>
                      ))}
                      <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '14px',
                          background: 'rgba(65, 87, 255, 0.12)',
                          color: '#4157ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '10px',
                          fontWeight: '800',
                          fontSize: '18px',
                        }}>%</div>
                        <span>Attendance Rate</span>
                        <strong className="stat-value" style={{ color: '#4157ff' }}>89%</strong>
                        <p className="stat-note">92% class average</p>
                      </div>
                    </div>

                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Trend</p>
                          <h3>4-Week Attendance Trend</h3>
                        </div>
                      </div>
                      <div style={{ height: '200px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={ATTENDANCE_TREND}>
                            <defs>
                              <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#17b398" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#17b398" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                            <XAxis dataKey="w" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                fontWeight: '600',
                              }}
                            />
                            <Area type="monotone" dataKey="present" stroke="#17b398" strokeWidth={3} fill="url(#attGrad)" name="% Present" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Calendar</p>
                          <h3>Monthly Attendance Calendar</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.78rem' }}>
                          {Object.entries(ATTENDANCE_STATUS_META).map(([k, meta]) => (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '6px',
                                background: meta.bg,
                                color: meta.color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: '800',
                              }}>{k}</span>
                              <span style={{ color: '#5c6b8c', fontWeight: '600' }}>{meta.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <div key={i} style={{
                            textAlign: 'center',
                            padding: '6px 0',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            color: '#7f8ba5',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}>{d}</div>
                        ))}
                        {calendarDays.map((cd, idx) => {
                          if (cd.empty) return <div key={`empty-${idx}`} />
                          const meta = ATTENDANCE_STATUS_META[cd.status] || ATTENDANCE_STATUS_META.P
                          return (
                            <div key={idx} title={`${cd.date} — ${meta.label}`} style={{
                              aspectRatio: '1 / 1',
                              borderRadius: '10px',
                              background: meta.bg,
                              color: meta.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: '800',
                              border: '1px solid rgba(255,255,255,0.8)',
                              cursor: 'pointer',
                            }}>
                              <span style={{ fontSize: '0.68rem', opacity: 0.8, position: 'absolute' }} />
                              <span>{cd.day}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Checklist</p>
                          <h3>Required Documents Checklist</h3>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ fontSize: '24px', color: '#4157ff', fontWeight: '800' }}>
                            {REQUIRED_DOCS.filter((d) => d.done).length}/{REQUIRED_DOCS.length}
                          </strong>
                          <p className="stat-note" style={{ margin: 0 }}>
                            {Math.round((REQUIRED_DOCS.filter((d) => d.done).length / REQUIRED_DOCS.length) * 100)}% Complete
                          </p>
                        </div>
                      </div>
                      <div style={{ height: '8px', background: '#f1f5ff', borderRadius: '999px', marginBottom: '14px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${(REQUIRED_DOCS.filter((d) => d.done).length / REQUIRED_DOCS.length) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #4157ff, #17b398)',
                          borderRadius: '999px',
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {REQUIRED_DOCS.map((rd, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: rd.done ? 'rgba(23, 179, 152, 0.08)' : 'rgba(243, 93, 93, 0.06)',
                            border: `1px solid ${rd.done ? 'rgba(23, 179, 152, 0.16)' : 'rgba(243, 93, 93, 0.14)'}`,
                          }}>
                            <div style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: rd.done ? 'linear-gradient(135deg, #17b398, #5fe0c6)' : 'rgba(243, 93, 93, 0.16)',
                              color: 'white',
                              fontWeight: '800',
                              fontSize: '13px',
                              flexShrink: 0,
                            }}>
                              {rd.done ? '✓' : '!'}
                            </div>
                            <span style={{ fontSize: '0.9rem', color: rd.done ? '#111b33' : '#7f8ba5', fontWeight: rd.done ? '700' : '600', flex: 1, textDecoration: rd.done ? 'none' : 'none' }}>
                              {rd.name}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              padding: '4px 10px',
                              borderRadius: '999px',
                              background: rd.done ? 'rgba(23, 179, 152, 0.14)' : 'rgba(243, 93, 93, 0.12)',
                              color: rd.done ? '#0d8f7a' : '#f35d5d',
                            }}>{rd.done ? 'Verified' : 'Pending'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Upload</p>
                          <h3>Upload Documents</h3>
                        </div>
                      </div>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); setToast('File(s) dropped — upload simulated.') }}
                        onClick={() => setToast('Upload dialog — simulated in this build.')}
                        style={{
                          border: '2px dashed rgba(65, 87, 255, 0.35)',
                          borderRadius: '18px',
                          padding: '36px 20px',
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, rgba(65, 87, 255, 0.04), rgba(23, 179, 152, 0.03))',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{
                          width: '64px',
                          height: '64px',
                          margin: '0 auto 12px',
                          borderRadius: '20px',
                          background: 'linear-gradient(135deg, #4157ff, #7c8cff)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          boxShadow: '0 10px 22px rgba(65, 87, 255, 0.22)',
                        }}>⤴</div>
                        <h4 style={{ margin: 0, color: '#111b33', fontSize: '16px', fontWeight: '800' }}>Drop files here, or click to browse</h4>
                        <p style={{ margin: '6px 0 0', color: '#7f8ba5', fontSize: '0.88rem' }}>
                          Supports PDF, JPG, PNG · Max 10MB per file
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                          {['Academic', 'Identity', 'Medical', 'Transport', 'Other'].map((c) => (
                            <span key={c} style={{
                              padding: '6px 12px',
                              borderRadius: '999px',
                              background: 'rgba(65, 87, 255, 0.1)',
                              color: '#4157ff',
                              fontSize: '0.76rem',
                              fontWeight: '700',
                            }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="panel-card data-panel" style={{ padding: '18px' }}>
                      <div className="panel-header compact">
                        <div>
                          <p className="panel-kicker">Records</p>
                          <h3>Uploaded Documents</h3>
                        </div>
                        <span style={{ fontSize: '0.82rem', color: '#7f8ba5', fontWeight: '600' }}>{DOCUMENTS.length} files</span>
                      </div>
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Document</th>
                              <th>Category</th>
                              <th>Size</th>
                              <th>Upload Date</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {DOCUMENTS.map((d) => (
                              <tr key={d.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '10px',
                                      background: 'linear-gradient(135deg, rgba(65, 87, 255, 0.14), rgba(124, 140, 255, 0.12))',
                                      color: '#4157ff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: '800',
                                      fontSize: '12px',
                                      flexShrink: 0,
                                    }}>
                                      📄
                                    </div>
                                    <div>
                                      <span className="record-title">{d.name}</span>
                                      <p className="record-subtitle">{d.id}</p>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="status-pill" style={{
                                    background: {
                                      Academic: 'rgba(65, 87, 255, 0.12)',
                                      Identity: 'rgba(23, 179, 152, 0.14)',
                                      Medical: 'rgba(243, 93, 93, 0.12)',
                                      Transport: 'rgba(244, 181, 98, 0.2)',
                                      Other: 'rgba(127, 139, 165, 0.18)',
                                    }[d.category] || 'rgba(65, 87, 255, 0.1)',
                                    color: {
                                      Academic: '#4157ff',
                                      Identity: '#0d8f7a',
                                      Medical: '#f35d5d',
                                      Transport: '#b07820',
                                      Other: '#5c6b8c',
                                    }[d.category] || '#4157ff',
                                  }}>{d.category}</span>
                                </td>
                                <td style={{ color: '#111b33', fontWeight: '700' }}>{d.size}</td>
                                <td>{d.date}</td>
                                <td>
                                  <span className={`status-pill ${d.verified ? 'success' : 'warning'}`}>
                                    {d.verified ? '✓ Verified' : '⏳ Pending'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <button type="button" className="small-action" style={{ padding: '6px 10px', fontSize: '0.76rem' }} onClick={() => setToast('Preview opened')}>👁</button>
                                    <button type="button" className="small-action" style={{ padding: '6px 10px', fontSize: '0.76rem' }} onClick={() => setToast('Download started')}>⬇</button>
                                    {!d.verified && (
                                      <button type="button" className="small-action" style={{ padding: '6px 10px', fontSize: '0.76rem', background: 'rgba(23, 179, 152, 0.12)', color: '#0d8f7a', borderColor: 'rgba(23, 179, 152, 0.2)' }} onClick={() => setToast('Document verified')}>✓</button>
                                    )}
                                    <button type="button" className="small-action" style={{ padding: '6px 10px', fontSize: '0.76rem', color: '#f35d5d', borderColor: 'rgba(243, 93, 93, 0.22)' }} onClick={() => { if (window.confirm(`Delete ${d.name}?`)) setToast('Document deleted') }}>🗑</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #111b33 0%, #3246c7 100%)',
            color: 'white',
            borderRadius: '14px',
            fontWeight: '700',
            boxShadow: '0 18px 40px rgba(17, 27, 51, 0.3)',
            zIndex: 9999,
            animation: 'directSurfaceSlide 300ms ease',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default StudentProfilePage
