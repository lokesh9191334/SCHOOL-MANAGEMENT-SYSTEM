import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'

const DETAILED_TEACHERS = [
  {
    id: 'TCH-501',
    title: 'Dr. Meera Iyer',
    firstName: 'Meera',
    lastName: 'Iyer',
    subtitle: 'Mathematics',
    subject: 'Mathematics',
    department: 'Science & Math',
    primary: 'm.iyer@school.edu',
    email: 'm.iyer@school.edu',
    phone: '+91 90000 10001',
    status: 'Active',
    owner: '+91 90000 10001',
    tone: 'success',
    qualification: 'Ph.D Mathematics',
    experience: 12,
    gender: 'Female',
    dateOfBirth: '1985-04-22',
    bloodGroup: 'A+',
    address: '45 Green Avenue, Bangalore',
    pan: 'ABCDE1234F',
    aadhar: '1234 5678 9012',
    photoUrl: '',
    classes: [
      { name: 'Class 10-A', section: 'A', studentCount: 42, periods: [{ day: 'Mon', period: 1 }, { day: 'Wed', period: 1 }, { day: 'Fri', period: 2 }] },
      { name: 'Class 9-B', section: 'B', studentCount: 38, periods: [{ day: 'Tue', period: 3 }, { day: 'Thu', period: 3 }] },
      { name: 'Class 11-A', section: 'A', studentCount: 45, periods: [{ day: 'Mon', period: 5 }, { day: 'Tue', period: 5 }, { day: 'Thu', period: 6 }] },
    ],
    joiningDate: '2014-06-01',
    salary: 85000,
    specialization: 'Calculus & Linear Algebra',
    emergencyContact: { name: 'Ravi Iyer', relation: 'Husband', phone: '+91 90000 20001' },
    bio: 'Passionate mathematics educator with 12+ years of experience in teaching advanced mathematics. Published researcher in applied mathematics. Believes in conceptual learning over rote memorization and encourages students to explore mathematical patterns in daily life.',
    attendance: {
      present: 22,
      leave: 1,
      late: 2,
      absent: 0,
      monthlyData: [
        { month: 'Mar', present: 24, leave: 1, late: 1 },
        { month: 'Apr', present: 22, leave: 1, late: 2 },
        { month: 'May', present: 20, leave: 3, late: 0 },
        { month: 'Jun', present: 23, leave: 0, late: 1 },
        { month: 'Jul', present: 21, leave: 2, late: 2 },
        { month: 'Aug', present: 22, leave: 1, late: 2 },
      ],
      leaveBalance: { casual: 8, sick: 6, earned: 12, total: 26 },
    },
    salaryDetails: {
      basic: 48000,
      hra: 14400,
      da: 9600,
      allowances: 8000,
      specialAllowance: 5000,
      pfDeduction: 5760,
      esiDeduction: 750,
      incomeTax: 2840,
      netPay: 65650,
      payslips: [
        { month: 'Aug 2026', status: 'Paid', date: '2026-08-01', gross: 85000, deductions: 9350, net: 75650 },
        { month: 'Jul 2026', status: 'Paid', date: '2026-07-01', gross: 85000, deductions: 9350, net: 75650 },
        { month: 'Jun 2026', status: 'Paid', date: '2026-06-01', gross: 85000, deductions: 9350, net: 75650 },
        { month: 'May 2026', status: 'Paid', date: '2026-05-01', gross: 85000, deductions: 9350, net: 75650 },
        { month: 'Apr 2026', status: 'Paid', date: '2026-04-01', gross: 85000, deductions: 9350, net: 75650 },
        { month: 'Mar 2026', status: 'Paid', date: '2026-03-01', gross: 85000, deductions: 9350, net: 75650 },
      ],
    },
    documents: [
      { type: 'CV / Resume', verified: true, expiry: null, file: 'Meera_Iyer_CV.pdf' },
      { type: 'Degree Certificate', verified: true, expiry: null, file: 'PhD_Degree.pdf' },
      { type: 'Teaching Certification', verified: true, expiry: '2028-12-31', file: 'B.Ed_Cert.pdf' },
      { type: 'ID Proof (Aadhar)', verified: true, expiry: null, file: 'Aadhar.pdf' },
      { type: 'ID Proof (PAN)', verified: true, expiry: null, file: 'PAN_Card.pdf' },
      { type: 'Experience Letters', verified: true, expiry: null, file: 'Experience_Letters.pdf' },
      { type: 'Background Verification', verified: true, expiry: '2027-06-01', file: 'BG_Verification.pdf' },
    ],
  },
  {
    id: 'TCH-502',
    title: 'James Okonkwo',
    firstName: 'James',
    lastName: 'Okonkwo',
    subtitle: 'Physics',
    subject: 'Physics',
    department: 'Science & Math',
    email: 'j.okonkwo@school.edu',
    phone: '+91 90000 10002',
    status: 'Active',
    tone: 'success',
    qualification: 'M.Sc Physics',
    experience: 8,
    gender: 'Male',
    dateOfBirth: '1988-11-10',
    bloodGroup: 'O+',
    address: '12 Lake View, Chennai',
    photoUrl: '',
    classes: [
      { name: 'Class 11-A', section: 'A', studentCount: 45, periods: [] },
      { name: 'Class 12-B', section: 'B', studentCount: 40, periods: [] },
    ],
    joiningDate: '2018-03-15',
    salary: 72000,
    specialization: 'Quantum Mechanics',
    emergencyContact: { name: 'Ada Okonkwo', relation: 'Sister', phone: '+91 90000 20002' },
    bio: 'Experienced physics teacher with expertise in modern physics and laboratory experiments. Passionate about making physics accessible to all students through demos and practical examples.',
    attendance: { present: 21, leave: 2, late: 1, absent: 0, monthlyData: [], leaveBalance: { casual: 10, sick: 8, earned: 8, total: 26 } },
    salaryDetails: {
      basic: 40000, hra: 12000, da: 8000, allowances: 6000, specialAllowance: 6000,
      pfDeduction: 4800, esiDeduction: 650, incomeTax: 1550, netPay: 59000,
      payslips: [],
    },
    documents: [
      { type: 'CV / Resume', verified: true },
      { type: 'Degree Certificate', verified: true },
      { type: 'Teaching Certification', verified: true },
    ],
  },
  {
    id: 'TCH-503',
    title: 'Sara Lindqvist',
    firstName: 'Sara',
    lastName: 'Lindqvist',
    subtitle: 'English',
    subject: 'English',
    department: 'Languages',
    email: 's.lindqvist@school.edu',
    phone: '+91 90000 10003',
    status: 'On leave',
    tone: 'warning',
    qualification: 'MA English Literature',
    experience: 6,
    gender: 'Female',
    dateOfBirth: '1990-08-05',
    bloodGroup: 'B+',
    address: '88 Palace Road, Mysore',
    photoUrl: '',
    classes: [
      { name: 'Class 8-A', section: 'A', studentCount: 36, periods: [] },
      { name: 'Class 9-C', section: 'C', studentCount: 34, periods: [] },
    ],
    joiningDate: '2020-01-10',
    salary: 62000,
    specialization: 'Creative Writing',
    emergencyContact: { name: 'Erik Lindqvist', relation: 'Father', phone: '+91 90000 20003' },
    bio: 'Literature enthusiast and creative writing mentor with international teaching experience. Leads the school\'s literary club and annual magazine.',
    attendance: { present: 18, leave: 5, late: 0, absent: 0, monthlyData: [], leaveBalance: { casual: 5, sick: 10, earned: 6, total: 21 } },
    salaryDetails: { basic: 34000, hra: 10200, da: 6800, allowances: 5000, specialAllowance: 6000, pfDeduction: 4080, esiDeduction: 560, incomeTax: 860, netPay: 56500, payslips: [] },
    documents: [],
  },
  {
    id: 'TCH-504',
    title: 'Rajesh Kumar',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    subtitle: 'Chemistry',
    subject: 'Chemistry',
    department: 'Science & Math',
    email: 'r.kumar@school.edu',
    phone: '+91 90000 10004',
    status: 'Active',
    tone: 'success',
    qualification: 'M.Sc Organic Chemistry',
    experience: 15,
    gender: 'Male',
    dateOfBirth: '1982-03-18',
    bloodGroup: 'AB+',
    address: '23 River Bank, Hyderabad',
    photoUrl: '',
    classes: [
      { name: 'Class 12-A', section: 'A', studentCount: 40, periods: [] },
      { name: 'Class 11-B', section: 'B', studentCount: 42, periods: [] },
      { name: 'Class 10-C', section: 'C', studentCount: 38, periods: [] },
    ],
    joiningDate: '2011-08-20',
    salary: 92000,
    specialization: 'Organic Chemistry',
    emergencyContact: { name: 'Priya Kumar', relation: 'Wife', phone: '+91 90000 20004' },
    bio: 'Senior chemistry faculty with focus on competitive exam preparation and lab safety. Head of Science Department.',
    attendance: { present: 23, leave: 0, late: 1, absent: 0, monthlyData: [], leaveBalance: { casual: 12, sick: 10, earned: 15, total: 37 } },
    salaryDetails: { basic: 52000, hra: 15600, da: 10400, allowances: 8000, specialAllowance: 6000, pfDeduction: 6240, esiDeduction: 820, incomeTax: 3940, netPay: 81000, payslips: [] },
    documents: [],
  },
  {
    id: 'TCH-507',
    title: 'Fatima Ali',
    firstName: 'Fatima',
    lastName: 'Ali',
    subtitle: 'Computer Science',
    subject: 'Computer Science',
    department: 'Technology',
    email: 'f.ali@school.edu',
    phone: '+91 90000 10007',
    status: 'Active',
    tone: 'success',
    qualification: 'B.Tech Computer Science',
    experience: 5,
    gender: 'Female',
    dateOfBirth: '1992-02-28',
    bloodGroup: 'A-',
    address: '33 Tech Park, Gurgaon',
    photoUrl: '',
    classes: [
      { name: 'Class 11-A', section: 'A', studentCount: 45, periods: [] },
      { name: 'Class 12-A', section: 'A', studentCount: 42, periods: [] },
      { name: 'Class 10-B', section: 'B', studentCount: 40, periods: [] },
    ],
    joiningDate: '2021-05-20',
    salary: 70000,
    specialization: 'Python & Web Development',
    emergencyContact: { name: 'Ahmed Ali', relation: 'Brother', phone: '+91 90000 20007' },
    bio: 'Computer science educator and coding bootcamp instructor with industry background. Leads the coding club and robotics team.',
    attendance: { present: 22, leave: 1, late: 1, absent: 0, monthlyData: [], leaveBalance: { casual: 8, sick: 6, earned: 5, total: 19 } },
    salaryDetails: { basic: 40000, hra: 12000, da: 8000, allowances: 6000, specialAllowance: 4000, pfDeduction: 4800, esiDeduction: 650, incomeTax: 1550, netPay: 63000, payslips: [] },
    documents: [],
  },
]

const TABS = [
  { id: 'overview', label: 'Overview', icon: '◉' },
  { id: 'classes', label: 'Classes', icon: '🏫' },
  { id: 'attendance', label: 'Attendance', icon: '☑' },
  { id: 'salary', label: 'Salary', icon: '₹' },
  { id: 'documents', label: 'Documents', icon: '📁' },
]

const TeacherProfilePage = () => {
  const navigate = useNavigate()
  const [teachers] = usePersistentState(STORAGE_KEYS.teachers, DETAILED_TEACHERS)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('TCH-501')
  const [tab, setTab] = useState('overview')
  const [showPayslip, setShowPayslip] = useState(null)

  const filteredList = useMemo(() => {
    const list = Array.isArray(teachers) && teachers.length > 0 ? teachers : DETAILED_TEACHERS
    return list.filter((t) => {
      if (!search) return true
      const q = search.toLowerCase()
      return t.title?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q)
    })
  }, [teachers, search])

  const selected = useMemo(() => {
    const list = Array.isArray(teachers) && teachers.length > 0 ? teachers : DETAILED_TEACHERS
    return list.find((t) => t.id === selectedId) || list[0]
  }, [teachers, selectedId])

  const avatarInitials = (name) => {
    const parts = (name || '?').split(' ')
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')
  }

  const avatarColor = (id) => {
    const colors = [
      ['#4157ff', '#7c8cff'],
      ['#17b398', '#5ce0c4'],
      ['#f4b562', '#f7d095'],
      ['#8b5cf6', '#b5a0f5'],
      ['#ec4899', '#f49fc6'],
    ]
    const idx = (id?.charCodeAt(id.length - 1) || 0) % colors.length
    return colors[idx]
  }

  const renderAvatar = (t, size = 'md') => {
    const dims = size === 'sm' ? { w: 36, h: 36, fs: 12, r: 10 } : size === 'lg' ? { w: 140, h: 140, fs: 52, r: 32 } : { w: 56, h: 56, fs: 20, r: 18 }
    const [c1, c2] = avatarColor(t?.id)
    return (
      <div
        style={{
          width: dims.w, height: dims.h, borderRadius: dims.r, display: 'grid', placeItems: 'center',
          fontWeight: 800, fontSize: dims.fs, color: '#fff',
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          border: '3px solid #fff', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', letterSpacing: '-0.02em', flexShrink: 0,
        }}
      >
        {avatarInitials(t?.title || t?.name || '?').toUpperCase()}
      </div>
    )
  }

  const s = selected || DETAILED_TEACHERS[0]
  const att = s.attendance || { present: 20, leave: 1, late: 1, absent: 0 }
  const workingDays = att.present + att.leave + att.late + att.absent
  const attendancePercent = workingDays ? Math.round((att.present / workingDays) * 100) : 0

  const sal = s.salaryDetails || {}
  const totalEarnings = (sal.basic || 0) + (sal.hra || 0) + (sal.da || 0) + (sal.allowances || 0) + (sal.specialAllowance || 0)
  const totalDeductions = (sal.pfDeduction || 0) + (sal.esiDeduction || 0) + (sal.incomeTax || 0)
  const net = totalEarnings - totalDeductions

  const attendanceChart = s.attendance?.monthlyData?.length > 0 ? s.attendance.monthlyData : [
    { month: 'Mar', present: 24, leave: 1, late: 1 },
    { month: 'Apr', present: 22, leave: 1, late: 2 },
    { month: 'May', present: 20, leave: 3, late: 0 },
    { month: 'Jun', present: 23, leave: 0, late: 1 },
    { month: 'Jul', present: 21, leave: 2, late: 2 },
    { month: 'Aug', present: 22, leave: 1, late: 2 },
  ]

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <div className="admin-header">
          <div className="header-left">
            <p className="admin-kicker">HR · Teacher Dossier</p>
            <h2>Teacher Profile</h2>
            <p>Complete 360° view of faculty records including academics, attendance, payroll, and documents. Select a teacher from the sidebar to view details.</p>
          </div>
          <div className="header-actions">
            <Link className="link-pill" to="/teachers">← Staff Directory</Link>
            <Link className="link-pill" to="/teachers/salary">Salary</Link>
            <Link className="link-pill" to="/teachers/timetable">Timetable</Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        <div className="panel-card" style={{ padding: 14, alignSelf: 'start', position: 'sticky', top: 20 }}>
          <div className="panel-header compact" style={{ marginBottom: 12 }}>
            <div>
              <p className="panel-kicker">Staff List</p>
              <h3 style={{ fontSize: '1rem' }}>Select Teacher</h3>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <input className="search-input" placeholder="Search teacher..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
            {filteredList.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelectedId(t.id); setTab('overview') }}
                style={{
                  all: 'unset', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', padding: 10,
                  borderRadius: 14, border: selectedId === t.id ? '2px solid #4157ff' : '2px solid transparent',
                  background: selectedId === t.id ? 'rgba(65, 87, 255, 0.08)' : '#f7f8ff',
                  transition: 'all 0.15s ease',
                }}
              >
                {renderAvatar(t, 'sm')}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111b33', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                  <div style={{ fontSize: '0.74rem', color: '#4157ff', fontWeight: 600 }}>{t.subject}</div>
                </div>
                <span className={`status-pill ${t.tone === 'warning' ? 'warning' : 'success'}`} style={{ fontSize: '0.6rem', padding: '3px 6px' }}>
                  {t.status === 'Active' ? '✓' : '◷'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="panel-card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {renderAvatar(s, 'lg')}
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: '#111b33', letterSpacing: '-0.02em' }}>{s.title}</h2>
                  <span className={`status-pill ${s.tone === 'warning' ? 'warning' : 'success'}`} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>{s.status}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: '0.92rem', color: '#4157ff', fontWeight: 700 }}>🎓 {s.subject}</span>
                  <span style={{ fontSize: '0.88rem', color: '#5c6b8c' }}>📚 {s.qualification}</span>
                  <span style={{ fontSize: '0.88rem', color: '#5c6b8c' }}>⏱ {s.experience} yrs experience</span>
                  <span style={{ fontSize: '0.88rem', color: '#5c6b8c' }}>🏷 {s.id}</span>
                </div>
                <p style={{ margin: 0, color: '#7f8ba5', fontSize: '0.94rem', lineHeight: 1.6 }}>{s.bio || 'Teacher bio not available.'}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                  <button className="small-action" style={{ background: 'linear-gradient(135deg, #4157ff 0%, #7c8cff 100%)', color: '#fff', border: 'none' }}>✉ Send Message</button>
                  <button className="small-action">📞 Call</button>
                  <button className="small-action" onClick={() => navigate('/teachers/add')}>✎ Edit Profile</button>
                  <button className="small-action" onClick={() => navigate('/teachers/timetable')}>▦ Timetable</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 26, padding: 12, background: '#f7f8ff', borderRadius: 16 }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    all: 'unset', cursor: 'pointer', padding: '10px 18px', borderRadius: 12,
                    fontWeight: 700, fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: tab === t.id ? 'linear-gradient(135deg, #4157ff 0%, #7c8cff 100%)' : 'transparent',
                    color: tab === t.id ? '#fff' : '#5c6b8c',
                    boxShadow: tab === t.id ? '0 8px 18px rgba(65, 87, 255, 0.22)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              <div className="panel-card">
                <div className="panel-header compact">
                  <div>
                    <p className="panel-kicker">Quick Facts</p>
                    <h3>General Information</h3>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.88rem' }}>
                  <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Department</div><strong style={{ color: '#111b33' }}>{s.department || 'Science & Math'}</strong></div>
                  <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Specialization</div><strong style={{ color: '#111b33' }}>{s.specialization || '—'}</strong></div>
                  <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Joining Date</div><strong style={{ color: '#111b33' }}>{s.joiningDate || '—'}</strong></div>
                  <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>DOB</div><strong style={{ color: '#111b33' }}>{s.dateOfBirth || '—'}</strong></div>
                  <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gender</div><strong style={{ color: '#111b33' }}>{s.gender || '—'}</strong></div>
                  <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Blood Group</div><strong style={{ color: '#f35d5d' }}>{s.bloodGroup || '—'}</strong></div>
                  <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>PAN</div><strong style={{ color: '#111b33' }}>{s.pan || '—'}</strong></div>
                  <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aadhar</div><strong style={{ color: '#111b33' }}>{s.aadhar || '—'}</strong></div>
                </div>
              </div>

              <div className="panel-card" style={{ background: 'linear-gradient(180deg, rgba(23, 179, 152, 0.06) 0%, #fff 100%)', borderColor: 'rgba(23, 179, 152, 0.15)' }}>
                <div className="panel-header compact">
                  <div>
                    <p className="panel-kicker">Contact</p>
                    <h3 style={{ color: '#0d8f7a' }}>Contact Details</h3>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(65, 87, 255, 0.12)', display: 'grid', placeItems: 'center', fontSize: 18 }}>✉</div>
                    <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem' }}>Email</div><strong style={{ color: '#111b33' }}>{s.email}</strong></div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(23, 179, 152, 0.15)', display: 'grid', placeItems: 'center', fontSize: 18 }}>📱</div>
                    <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem' }}>Phone</div><strong style={{ color: '#111b33' }}>{s.phone}</strong></div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(244, 181, 98, 0.18)', display: 'grid', placeItems: 'center', fontSize: 18, flexShrink: 0 }}>📍</div>
                    <div><div style={{ color: '#7f8ba5', fontSize: '0.76rem' }}>Address</div><strong style={{ color: '#111b33' }}>{s.address}</strong></div>
                  </div>
                </div>
              </div>

              <div className="panel-card" style={{ background: 'linear-gradient(180deg, rgba(243, 93, 93, 0.05) 0%, #fff 100%)', borderColor: 'rgba(243, 93, 93, 0.12)' }}>
                <div className="panel-header compact">
                  <div>
                    <p className="panel-kicker">Emergency</p>
                    <h3 style={{ color: '#d33' }}>Emergency Contact</h3>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7f8ba5' }}>Name</span>
                    <strong style={{ color: '#111b33' }}>{s.emergencyContact?.name || 'Not set'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7f8ba5' }}>Relation</span>
                    <strong style={{ color: '#111b33' }}>{s.emergencyContact?.relation || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7f8ba5' }}>Phone</span>
                    <strong style={{ color: '#f35d5d' }}>{s.emergencyContact?.phone || '—'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'classes' && (
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Academics</p>
                  <h3>Assigned Classes & Subjects</h3>
                </div>
                <button className="small-action" onClick={() => navigate('/teachers/subjects')}>◉ Manage Assignments</button>
              </div>
              <div className="content-grid">
                <div className="stat-card">
                  <span>Total Classes</span>
                  <strong className="stat-value">{s.classes?.length || 0}</strong>
                  <p className="stat-note">Across all sections</p>
                </div>
                <div className="stat-card">
                  <span>Total Students</span>
                  <strong className="stat-value">{s.classes?.reduce((sum, c) => sum + (c.studentCount || 0), 0) || 0}</strong>
                  <p className="stat-note">Combined enrollment</p>
                </div>
                <div className="stat-card">
                  <span>Weekly Periods</span>
                  <strong className="stat-value">18</strong>
                  <p className="stat-note">@45 mins each</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(180deg, #fff 0%, #f0fdf9 100%)', borderColor: 'rgba(23,179,152,0.12)' }}>
                  <span style={{ color: '#0d8f7a' }}>Workload</span>
                  <strong className="stat-value" style={{ color: '#0d8f7a' }}>Medium</strong>
                  <p className="stat-note">Within target load</p>
                </div>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Section</th>
                      <th>Subject</th>
                      <th>Students</th>
                      <th>Weekly Periods</th>
                      <th>Schedule</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(s.classes || []).map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{c.name}</td>
                        <td><span className="status-pill">{c.section}</span></td>
                        <td style={{ color: '#4157ff', fontWeight: 600 }}>{s.subject}</td>
                        <td>{c.studentCount}</td>
                        <td>{c.periods?.length || 5 + i}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {['Mon', 'Tue', 'Wed'].slice(0, 2 + (i % 2)).map((d) => (
                              <span key={d} style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: 8, background: 'rgba(65, 87, 255, 0.08)', color: '#3246c7', fontWeight: 700 }}>{d}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="content-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 0 }}>
                <div className="stat-card" style={{ background: 'linear-gradient(180deg, #fff 0%, #f0fdf9 100%)', borderColor: 'rgba(23,179,152,0.15)' }}>
                  <span style={{ color: '#0d8f7a' }}>Present (This Month)</span>
                  <strong className="stat-value" style={{ color: '#0d8f7a' }}>{att.present}d</strong>
                  <p className="stat-note">{attendancePercent}% attendance rate</p>
                </div>
                <div className="stat-card">
                  <span>Leave Taken</span>
                  <strong className="stat-value">{att.leave}d</strong>
                  <p className="stat-note">Paid + unpaid</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(180deg, #fff 0%, #fff8ec 100%)', borderColor: 'rgba(244,181,98,0.18)' }}>
                  <span style={{ color: '#b07820' }}>Late Entries</span>
                  <strong className="stat-value" style={{ color: '#b07820' }}>{att.late}</strong>
                  <p className="stat-note">Grace periods used</p>
                </div>
                <div className="stat-card">
                  <span>Leave Balance</span>
                  <strong className="stat-value">{s.attendance?.leaveBalance?.total || 24}d</strong>
                  <p className="stat-note">Total remaining</p>
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header compact">
                  <div>
                    <p className="panel-kicker">Trend · 6 Months</p>
                    <h3>Monthly Attendance Summary</h3>
                  </div>
                </div>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" name="Present" fill="#17b398" radius={[6, 6, 0, 0]} stackId="a" />
                      <Bar dataKey="late" name="Late" fill="#f4b562" radius={[6, 6, 0, 0]} stackId="a" />
                      <Bar dataKey="leave" name="Leave" fill="#f35d5d" radius={[6, 6, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header compact">
                  <div>
                    <p className="panel-kicker">Leave Balances</p>
                    <h3>Leave Account</h3>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  {[
                    { label: 'Casual Leave', used: 4, total: s.attendance?.leaveBalance?.casual || 8, color: '#4157ff' },
                    { label: 'Sick Leave', used: 2, total: s.attendance?.leaveBalance?.sick || 6, color: '#17b398' },
                    { label: 'Earned Leave', used: 3, total: s.attendance?.leaveBalance?.earned || 12, color: '#f4b562' },
                    { label: 'Compensatory Off', used: 1, total: 4, color: '#8b5cf6' },
                  ].map((lv) => (
                    <div key={lv.label} style={{ padding: 16, borderRadius: 16, background: `${lv.color}10`, border: `1px solid ${lv.color}20` }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: lv.color, marginBottom: 8 }}>{lv.label}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111b33' }}>{lv.total - lv.used}<span style={{ fontSize: '0.9rem', color: '#7f8ba5', fontWeight: 500 }}>/{lv.total}d</span></div>
                      <div style={{ height: 6, marginTop: 10, background: '#fff', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${(lv.used / lv.total) * 100}%`, height: '100%', background: lv.color, borderRadius: 4 }} />
                      </div>
                      <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#7f8ba5' }}>{lv.used}d used</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'salary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="content-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 0 }}>
                <div className="stat-card">
                  <span>Basic Salary</span>
                  <strong className="stat-value">₹{(sal.basic || 0).toLocaleString()}</strong>
                  <p className="stat-note">Monthly fixed</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(180deg, #fff 0%, #f0fdf9 100%)', borderColor: 'rgba(23,179,152,0.15)' }}>
                  <span style={{ color: '#0d8f7a' }}>Gross Pay</span>
                  <strong className="stat-value" style={{ color: '#0d8f7a' }}>₹{totalEarnings.toLocaleString()}</strong>
                  <p className="stat-note">Before deductions</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(180deg, #fff 0%, #fff0f0 100%)', borderColor: 'rgba(243,93,93,0.12)' }}>
                  <span style={{ color: '#d33' }}>Total Deductions</span>
                  <strong className="stat-value" style={{ color: '#d33' }}>₹{totalDeductions.toLocaleString()}</strong>
                  <p className="stat-note">PF, ESI, Tax</p>
                </div>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(65,87,255,0.15) 0%, rgba(124,140,255,0.12) 100%)', borderColor: 'rgba(65,87,255,0.25)' }}>
                  <span style={{ color: '#3246c7' }}>Net Take-Home</span>
                  <strong className="stat-value" style={{ color: '#4157ff' }}>₹{net.toLocaleString()}</strong>
                  <p className="stat-note">In-hand salary</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div className="panel-card">
                  <div className="panel-header compact">
                    <div><p className="panel-kicker">Earnings</p><h3 style={{ color: '#0d8f7a' }}>Earnings Breakdown</h3></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { l: 'Basic Salary', v: sal.basic || 0 },
                      { l: 'HRA (30%)', v: sal.hra || 0 },
                      { l: 'Dearness Allowance', v: sal.da || 0 },
                      { l: 'Other Allowances', v: sal.allowances || 0 },
                      { l: 'Special Allowance', v: sal.specialAllowance || 0 },
                    ].map((e) => (
                      <div key={e.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: '#f7f8ff', fontSize: '0.88rem' }}>
                        <span style={{ color: '#5c6b8c' }}>{e.l}</span>
                        <strong style={{ color: '#0d8f7a' }}>₹{e.v.toLocaleString()}</strong>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 12px', borderRadius: 12, background: 'rgba(23, 179, 152, 0.1)', borderTop: '2px solid #17b398', marginTop: 4 }}>
                      <span style={{ fontWeight: 800, color: '#0d8f7a' }}>GROSS EARNINGS</span>
                      <strong style={{ color: '#0d8f7a', fontSize: '1.05rem' }}>₹{totalEarnings.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-header compact">
                    <div><p className="panel-kicker">Deductions</p><h3 style={{ color: '#d33' }}>Deductions Breakdown</h3></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { l: 'PF Contribution (12%)', v: sal.pfDeduction || 0 },
                      { l: 'ESI Deduction', v: sal.esiDeduction || 0 },
                      { l: 'Professional Tax', v: 200 },
                      { l: 'Income Tax (TDS)', v: sal.incomeTax || 0 },
                    ].map((d) => (
                      <div key={d.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: '#fdf2f2', fontSize: '0.88rem' }}>
                        <span style={{ color: '#5c6b8c' }}>{d.l}</span>
                        <strong style={{ color: '#d33' }}>₹{d.v.toLocaleString()}</strong>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 12px', borderRadius: 12, background: 'rgba(243, 93, 93, 0.1)', borderTop: '2px solid #f35d5d', marginTop: 4 }}>
                      <span style={{ fontWeight: 800, color: '#d33' }}>TOTAL DEDUCTIONS</span>
                      <strong style={{ color: '#d33', fontSize: '1.05rem' }}>₹{totalDeductions.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-header compact">
                  <div><p className="panel-kicker">Payslips · Last 6 Months</p><h3>Payment History</h3></div>
                  <span className="status-pill success">All Paid ✓</span>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Month</th><th>Pay Date</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sal.payslips?.length > 0 ? sal.payslips : [
                        { month: 'Aug 2026', date: '2026-08-01', gross: totalEarnings, deductions: totalDeductions, net: net, status: 'Paid' },
                        { month: 'Jul 2026', date: '2026-07-01', gross: totalEarnings, deductions: totalDeductions, net: net, status: 'Paid' },
                        { month: 'Jun 2026', date: '2026-06-01', gross: totalEarnings, deductions: totalDeductions, net: net, status: 'Paid' },
                        { month: 'May 2026', date: '2026-05-01', gross: totalEarnings, deductions: totalDeductions, net: net, status: 'Paid' },
                        { month: 'Apr 2026', date: '2026-04-01', gross: totalEarnings, deductions: totalDeductions, net: net, status: 'Paid' },
                        { month: 'Mar 2026', date: '2026-03-01', gross: totalEarnings, deductions: totalDeductions, net: net, status: 'Paid' },
                      ]).map((p, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700 }}>{p.month}</td>
                          <td>{p.date}</td>
                          <td>₹{(p.gross || 0).toLocaleString()}</td>
                          <td style={{ color: '#d33' }}>- ₹{(p.deductions || 0).toLocaleString()}</td>
                          <td style={{ fontWeight: 800, color: '#0d8f7a' }}>₹{(p.net || 0).toLocaleString()}</td>
                          <td><span className="status-pill success">{p.status}</span></td>
                          <td><button className="small-action" onClick={() => setShowPayslip(p)}>⬇ Payslip</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'documents' && (
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">HR & Compliance</p>
                  <h3>Professional Documents Verification</h3>
                </div>
                <button className="small-action">⇪ Upload New</button>
              </div>
              <div className="side-stack" style={{ gap: 12 }}>
                {(s.documents?.length > 0 ? s.documents : [
                  { type: 'CV / Resume', verified: true, expiry: null, file: 'Resume.pdf' },
                  { type: 'Degree Certificate', verified: true, expiry: null, file: 'Degree.pdf' },
                  { type: 'Teaching Certification / B.Ed', verified: true, expiry: '2028-12-31', file: 'BEd.pdf' },
                  { type: 'ID Proof (Aadhar)', verified: true, expiry: null, file: 'Aadhar.pdf' },
                  { type: 'ID Proof (PAN)', verified: true, expiry: null, file: 'PAN.pdf' },
                  { type: 'Experience Letter (Previous)', verified: true, expiry: null, file: 'Experience.pdf' },
                  { type: 'Background Verification Report', verified: true, expiry: '2027-06-01', file: 'BG_Verify.pdf' },
                  { type: 'Recent Passport Photo', verified: false, expiry: null, file: null },
                ]).map((d, i) => (
                  <div key={i} style={{
                    padding: 16, borderRadius: 18,
                    background: d.verified ? 'linear-gradient(180deg, rgba(23, 179, 152, 0.06) 0%, #fff 100%)' : 'linear-gradient(180deg, rgba(244, 181, 98, 0.08) 0%, #fff 100%)',
                    border: `1px solid ${d.verified ? 'rgba(23, 179, 152, 0.2)' : 'rgba(244, 181, 98, 0.2)'}`,
                    display: 'flex', gap: 14, alignItems: 'center',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 22,
                      background: d.verified ? 'rgba(23, 179, 152, 0.15)' : 'rgba(244, 181, 98, 0.18)',
                      color: d.verified ? '#0d8f7a' : '#b07820',
                    }}>{d.verified ? '✓' : '📄'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#111b33' }}>{d.type}</strong>
                        <span className={`status-pill ${d.verified ? 'success' : 'warning'}`} style={{ fontSize: '0.65rem' }}>
                          {d.verified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap', fontSize: '0.8rem', color: '#7f8ba5' }}>
                        {d.file && <span>📎 {d.file}</span>}
                        {d.expiry && <span>⏱ Valid until: {d.expiry}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {d.file && <button className="small-action">⬇</button>}
                      <button className="small-action">✎</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPayslip && (
        <div className="modal-overlay" onClick={() => setShowPayslip(null)}>
          <div className="modal-panel" style={{ maxWidth: 620, padding: 32 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111b33' }}>📄 Payslip</h2>
                <p style={{ margin: '4px 0 0', color: '#7f8ba5' }}>{s.title} · {showPayslip.month}</p>
              </div>
              <button onClick={() => setShowPayslip(null)} style={{ all: 'unset', cursor: 'pointer', fontSize: 24, color: '#7f8ba5' }}>✕</button>
            </div>
            <div style={{ padding: 24, background: 'linear-gradient(135deg, #f7f8ff 0%, #fff 100%)', borderRadius: 18, border: '1px solid rgba(65,87,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '2px dashed #e2e8f0' }}>
                <div><div style={{ fontSize: '0.76rem', color: '#7f8ba5' }}>Pay Date</div><strong>{showPayslip.date}</strong></div>
                <div><div style={{ fontSize: '0.76rem', color: '#7f8ba5' }}>Employee ID</div><strong>{s.id}</strong></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: '0.76rem', color: '#7f8ba5' }}>NET SALARY</div><strong style={{ fontSize: '1.4rem', color: '#17b398' }}>₹{(showPayslip.net || net).toLocaleString()}</strong></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.86rem' }}>
                {[{ l: 'Basic', v: sal.basic || 0 }, { l: 'HRA', v: sal.hra || 0 }, { l: 'DA', v: sal.da || 0 }, { l: 'Allowances', v: (sal.allowances || 0) + (sal.specialAllowance || 0) }].map((e) => (
                  <div key={e.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fff', borderRadius: 8 }}>
                    <span style={{ color: '#5c6b8c' }}>{e.l}</span><strong>₹{e.v.toLocaleString()}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="small-action" onClick={() => window.print()}>🖨 Print</button>
              <button className="small-action" style={{ background: 'linear-gradient(135deg, #4157ff 0%, #7c8cff 100%)', color: '#fff', border: 'none' }}>⬇ Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherProfilePage
