import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_TEACHERS } from '../../data/seed'

const EXPANDED_TEACHERS = [
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
    classes: ['Class 10-A', 'Class 9-B', 'Class 11-A'],
    joiningDate: '2014-06-01',
    salary: 85000,
    specialization: 'Calculus & Linear Algebra',
    emergencyContact: 'Ravi Iyer - +91 90000 20001',
    bio: 'Passionate mathematics educator with 12+ years of experience in teaching advanced mathematics. Published researcher in applied mathematics.',
  },
  {
    id: 'TCH-502',
    title: 'James Okonkwo',
    firstName: 'James',
    lastName: 'Okonkwo',
    subtitle: 'Physics',
    subject: 'Physics',
    department: 'Science & Math',
    primary: 'j.okonkwo@school.edu',
    email: 'j.okonkwo@school.edu',
    phone: '+91 90000 10002',
    status: 'Active',
    owner: '+91 90000 10002',
    tone: 'success',
    qualification: 'M.Sc Physics',
    experience: 8,
    gender: 'Male',
    dateOfBirth: '1988-11-10',
    bloodGroup: 'O+',
    address: '12 Lake View, Chennai',
    pan: 'FGHIJ5678K',
    aadhar: '2345 6789 0123',
    photoUrl: '',
    classes: ['Class 11-A', 'Class 12-B'],
    joiningDate: '2018-03-15',
    salary: 72000,
    specialization: 'Quantum Mechanics',
    emergencyContact: 'Ada Okonkwo - +91 90000 20002',
    bio: 'Experienced physics teacher with expertise in modern physics and laboratory experiments.',
  },
  {
    id: 'TCH-503',
    title: 'Sara Lindqvist',
    firstName: 'Sara',
    lastName: 'Lindqvist',
    subtitle: 'English',
    subject: 'English',
    department: 'Languages',
    primary: 's.lindqvist@school.edu',
    email: 's.lindqvist@school.edu',
    phone: '+91 90000 10003',
    status: 'On leave',
    owner: '+91 90000 10003',
    tone: 'warning',
    qualification: 'MA English Literature',
    experience: 6,
    gender: 'Female',
    dateOfBirth: '1990-08-05',
    bloodGroup: 'B+',
    address: '88 Palace Road, Mysore',
    pan: 'KLMNO9012P',
    aadhar: '3456 7890 1234',
    photoUrl: '',
    classes: ['Class 8-A', 'Class 9-C'],
    joiningDate: '2020-01-10',
    salary: 62000,
    specialization: 'Creative Writing',
    emergencyContact: 'Erik Lindqvist - +91 90000 20003',
    bio: 'Literature enthusiast and creative writing mentor with international teaching experience.',
  },
  {
    id: 'TCH-504',
    title: 'Rajesh Kumar',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    subtitle: 'Chemistry',
    subject: 'Chemistry',
    department: 'Science & Math',
    primary: 'r.kumar@school.edu',
    email: 'r.kumar@school.edu',
    phone: '+91 90000 10004',
    status: 'Active',
    owner: '+91 90000 10004',
    tone: 'success',
    qualification: 'M.Sc Organic Chemistry',
    experience: 15,
    gender: 'Male',
    dateOfBirth: '1982-03-18',
    bloodGroup: 'AB+',
    address: '23 River Bank, Hyderabad',
    pan: 'PQRST3456U',
    aadhar: '4567 8901 2345',
    photoUrl: '',
    classes: ['Class 12-A', 'Class 11-B', 'Class 10-C'],
    joiningDate: '2011-08-20',
    salary: 92000,
    specialization: 'Organic Chemistry',
    emergencyContact: 'Priya Kumar - +91 90000 20004',
    bio: 'Senior chemistry faculty with focus on competitive exam preparation and lab safety.',
  },
  {
    id: 'TCH-505',
    title: 'Anita Desai',
    firstName: 'Anita',
    lastName: 'Desai',
    subtitle: 'Biology',
    subject: 'Biology',
    department: 'Science & Math',
    primary: 'a.desai@school.edu',
    email: 'a.desai@school.edu',
    phone: '+91 90000 10005',
    status: 'Active',
    owner: '+91 90000 10005',
    tone: 'success',
    qualification: 'M.Sc Botany',
    experience: 10,
    gender: 'Female',
    dateOfBirth: '1986-12-30',
    bloodGroup: 'O-',
    address: '56 Hill Top, Pune',
    pan: 'VWXYZ7890A',
    aadhar: '5678 9012 3456',
    photoUrl: '',
    classes: ['Class 10-A', 'Class 11-B'],
    joiningDate: '2016-04-05',
    salary: 68000,
    specialization: 'Genetics & Ecology',
    emergencyContact: 'Arjun Desai - +91 90000 20005',
    bio: 'Biology teacher with a passion for environmental education and student research projects.',
  },
  {
    id: 'TCH-506',
    title: 'Vikram Singh',
    firstName: 'Vikram',
    lastName: 'Singh',
    subtitle: 'History',
    subject: 'History',
    department: 'Social Studies',
    primary: 'v.singh@school.edu',
    email: 'v.singh@school.edu',
    phone: '+91 90000 10006',
    status: 'Active',
    owner: '+91 90000 10006',
    tone: 'success',
    qualification: 'MA History',
    experience: 9,
    gender: 'Male',
    dateOfBirth: '1987-07-14',
    bloodGroup: 'B-',
    address: '77 Fort Road, Jaipur',
    pan: 'BCDEF1234G',
    aadhar: '6789 0123 4567',
    photoUrl: '',
    classes: ['Class 8-B', 'Class 9-A', 'Class 7-C'],
    joiningDate: '2017-09-12',
    salary: 65000,
    specialization: 'Ancient Indian History',
    emergencyContact: 'Neha Singh - +91 90000 20006',
    bio: 'History teacher specializing in interactive lessons and museum-based learning.',
  },
  {
    id: 'TCH-507',
    title: 'Fatima Ali',
    firstName: 'Fatima',
    lastName: 'Ali',
    subtitle: 'Computer Science',
    subject: 'Computer Science',
    department: 'Technology',
    primary: 'f.ali@school.edu',
    email: 'f.ali@school.edu',
    phone: '+91 90000 10007',
    status: 'Active',
    owner: '+91 90000 10007',
    tone: 'success',
    qualification: 'B.Tech Computer Science',
    experience: 5,
    gender: 'Female',
    dateOfBirth: '1992-02-28',
    bloodGroup: 'A-',
    address: '33 Tech Park, Gurgaon',
    pan: 'HIJKL5678M',
    aadhar: '7890 1234 5678',
    photoUrl: '',
    classes: ['Class 11-A', 'Class 12-A', 'Class 10-B'],
    joiningDate: '2021-05-20',
    salary: 70000,
    specialization: 'Python & Web Development',
    emergencyContact: 'Ahmed Ali - +91 90000 20007',
    bio: 'Computer science educator and coding bootcamp instructor with industry background.',
  },
  {
    id: 'TCH-508',
    title: 'Priya Nair',
    firstName: 'Priya',
    lastName: 'Nair',
    subtitle: 'Geography',
    subject: 'Geography',
    department: 'Social Studies',
    primary: 'p.nair@school.edu',
    email: 'p.nair@school.edu',
    phone: '+91 90000 10008',
    status: 'On leave',
    owner: '+91 90000 10008',
    tone: 'warning',
    qualification: 'MA Geography',
    experience: 7,
    gender: 'Female',
    dateOfBirth: '1989-09-08',
    bloodGroup: 'O+',
    address: '99 Coastal Lane, Kochi',
    pan: 'NOPQR9012S',
    aadhar: '8901 2345 6789',
    photoUrl: '',
    classes: ['Class 7-A', 'Class 8-C'],
    joiningDate: '2019-02-28',
    salary: 60000,
    specialization: 'Climatology',
    emergencyContact: 'Menon Nair - +91 90000 20008',
    bio: 'Geography expert with a focus on GIS mapping and environmental sustainability.',
  },
]

const COLORS = ['#4157ff', '#17b398', '#f4b562', '#f35d5d', '#8b5cf6', '#ec4899']

const SUBJECT_OPTIONS = ['All', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
const QUALIFICATION_OPTIONS = ['All', 'Ph.D', 'M.Sc', 'MA', 'M.Tech', 'B.Tech', 'B.Ed']
const STATUS_OPTIONS = ['All', 'Active', 'On leave', 'Resigned']
const EXPERIENCE_RANGES = [
  { label: 'All', min: 0, max: 50 },
  { label: '0-3 yrs', min: 0, max: 3 },
  { label: '3-7 yrs', min: 3, max: 7 },
  { label: '7-12 yrs', min: 7, max: 12 },
  { label: '12+ yrs', min: 12, max: 50 },
]

const TeachersPage = () => {
  const navigate = useNavigate()
  const [teachers, setTeachers] = usePersistentState(STORAGE_KEYS.teachers, EXPANDED_TEACHERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('All')
  const [qualificationFilter, setQualificationFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [experienceRange, setExperienceRange] = useState(EXPERIENCE_RANGES[0])
  const [viewMode, setViewMode] = useState('card')
  const [selectedIds, setSelectedIds] = useState([])
  const [toast, setToast] = useState('')
  const [bulkAction, setBulkAction] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!(t.title?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q))) {
          return false
        }
      }
      if (subjectFilter !== 'All' && t.subject !== subjectFilter) return false
      if (qualificationFilter !== 'All') {
        if (!t.qualification || !t.qualification.toLowerCase().includes(qualificationFilter.toLowerCase().replace('.', ''))) {
          if (!(qualificationFilter === 'Ph.D' && t.qualification?.toLowerCase().includes('phd'))) {
            return false
          }
        }
      }
      if (statusFilter !== 'All' && t.status !== statusFilter) return false
      const exp = t.experience || 0
      if (exp < experienceRange.min || exp > experienceRange.max) return false
      return true
    })
  }, [teachers, searchQuery, subjectFilter, qualificationFilter, statusFilter, experienceRange])

  const totalTeachers = teachers.length
  const activeTeachers = teachers.filter((t) => t.status === 'Active').length
  const onLeaveTeachers = teachers.filter((t) => t.status === 'On leave').length
  const totalStudents = 650
  const studentTeacherRatio = (totalStudents / Math.max(totalTeachers, 1)).toFixed(1)
  const avgExperience = (teachers.reduce((sum, t) => sum + (t.experience || 0), 0) / Math.max(totalTeachers, 1)).toFixed(1)

  const departmentData = useMemo(() => {
    const map = {}
    teachers.forEach((t) => {
      const dept = t.department || 'General'
      map[dept] = (map[dept] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [teachers])

  const experienceData = useMemo(() => {
    const ranges = ['0-3', '3-7', '7-12', '12+']
    const counts = [0, 0, 0, 0]
    teachers.forEach((t) => {
      const exp = t.experience || 0
      if (exp < 3) counts[0]++
      else if (exp < 7) counts[1]++
      else if (exp < 12) counts[2]++
      else counts[3]++
    })
    return ranges.map((r, i) => ({ range: r, count: counts[i] }))
  }, [teachers])

  const upcomingBirthdays = useMemo(() => {
    const today = new Date()
    const currMonth = today.getMonth() + 1
    const currDay = today.getDate()
    return teachers
      .filter((t) => t.dateOfBirth)
      .map((t) => {
        const parts = t.dateOfBirth.split('-')
        const month = parseInt(parts[1], 10)
        const day = parseInt(parts[2], 10)
        let daysLeft
        if (month > currMonth || (month === currMonth && day >= currDay)) {
          const next = new Date(today.getFullYear(), month - 1, day)
          daysLeft = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
        } else {
          const next = new Date(today.getFullYear() + 1, month - 1, day)
          daysLeft = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
        }
        return { ...t, month, day, daysLeft }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6)
  }, [teachers])

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTeachers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredTeachers.map((t) => t.id))
    }
  }

  const handleBulkExport = () => {
    setToast(`Exported ${selectedIds.length || filteredTeachers.length} teacher records`)
  }

  const handleBulkAnnouncement = () => {
    setToast(`Announcement sent to ${selectedIds.length || filteredTeachers.length} teachers`)
  }

  const handleBulkAssign = () => {
    setBulkAction({ type: 'assign' })
    setTimeout(() => {
      setBulkAction(null)
      setToast(`Subject assignment updated for ${selectedIds.length || filteredTeachers.length} teachers`)
    }, 1500)
  }

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
      ['#f35d5d', '#f59595'],
    ]
    const idx = (id?.charCodeAt(id.length - 1) || 0) % colors.length
    return colors[idx]
  }

  const renderAvatar = (t, size = 'md') => {
    const dims = size === 'sm' ? { w: 40, h: 40, fs: 14, r: 12 } : size === 'lg' ? { w: 100, h: 100, fs: 36, r: 24 } : { w: 56, h: 56, fs: 20, r: 18 }
    const [c1, c2] = avatarColor(t.id)
    if (t.photoUrl) {
      return (
        <div style={{ width: dims.w, height: dims.h, borderRadius: dims.r, overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <img src={t.photoUrl} alt={t.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )
    }
    return (
      <div
        style={{
          width: dims.w,
          height: dims.h,
          borderRadius: dims.r,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: dims.fs,
          color: '#fff',
          background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
          border: '2px solid #fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          letterSpacing: '-0.02em',
        }}
      >
        {avatarInitials(t.title).toUpperCase()}
      </div>
    )
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <div className="admin-header">
          <div className="header-left">
            <p className="admin-kicker">People · Faculty Registry</p>
            <h2>Teaching Staff Directory</h2>
            <p>Comprehensive overview of all teaching faculty with workload distribution, departmental analytics, and quick administrative actions.</p>
          </div>
          <div className="header-actions">
            <Link className="link-pill" to="/teachers/add" style={{ background: 'linear-gradient(135deg, #4157ff 0%, #7c8cff 100%)', color: '#fff', border: 'none', boxShadow: '0 8px 20px rgba(65, 87, 255, 0.25)' }}>
              ＋ Add Teacher
            </Link>
            <Link className="link-pill" to="/teachers/timetable">▦ Timetable</Link>
            <Link className="link-pill" to="/teachers/attendance">☑ Attendance</Link>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="stat-card">
          <span>Total Teachers</span>
          <strong className="stat-value">{totalTeachers}</strong>
          <p className="stat-note">Faculty profiles on file</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f0fdf9 100%)', borderColor: 'rgba(23, 179, 152, 0.15)' }}>
          <span style={{ color: '#0d8f7a' }}>Active Now</span>
          <strong className="stat-value" style={{ color: '#0d8f7a' }}>{activeTeachers}</strong>
          <p className="stat-note">{Math.round((activeTeachers / totalTeachers) * 100)}% of workforce</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #fff8ec 100%)', borderColor: 'rgba(244, 181, 98, 0.18)' }}>
          <span style={{ color: '#b07820' }}>On Leave</span>
          <strong className="stat-value" style={{ color: '#b07820' }}>{onLeaveTeachers}</strong>
          <p className="stat-note">Substitute coverage active</p>
        </div>
        <div className="stat-card" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f3f5ff 100%)' }}>
          <span>Student-Teacher Ratio</span>
          <strong className="stat-value">{studentTeacherRatio}:1</strong>
          <p className="stat-note">{totalStudents} students · Ideal 25:1</p>
        </div>
        <div className="stat-card">
          <span>Avg Experience</span>
          <strong className="stat-value">{avgExperience} yrs</strong>
          <p className="stat-note">Across all departments</p>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Filters & Search</p>
              <h3>Browse Faculty</h3>
            </div>
            <div className="panel-actions">
              <button className={`action-tab ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')} style={{ cursor: 'pointer' }}>▦ Card View</button>
              <button className={`action-tab ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} style={{ cursor: 'pointer' }}>▤ Table View</button>
            </div>
          </div>
          <div className="module-form-grid" style={{ marginBottom: '16px' }}>
            <label className="form-field">
              <span>Search</span>
              <input className="search-input" placeholder="Search by name, subject, email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Subject</span>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                {SUBJECT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Qualification</span>
              <select value={qualificationFilter} onChange={(e) => setQualificationFilter(e.target.value)}>
                {QUALIFICATION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Experience</span>
              <select value={experienceRange.label} onChange={(e) => setExperienceRange(EXPERIENCE_RANGES.find((r) => r.label === e.target.value))}>
                {EXPERIENCE_RANGES.map((o) => <option key={o.label}>{o.label}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '10px 14px', background: '#f7f8ff', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.86rem', color: '#5c6b8c', fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedIds.length === filteredTeachers.length && filteredTeachers.length > 0} onChange={toggleSelectAll} style={{ width: 18, height: 18 }} />
                Select all ({filteredTeachers.length})
              </label>
              {selectedIds.length > 0 && <span className="status-pill">{selectedIds.length} selected</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="small-action" onClick={handleBulkExport}>⇪ Export</button>
              <button className="small-action" onClick={handleBulkAnnouncement}>✉ Announcement</button>
              <button className="small-action" onClick={handleBulkAssign}>◉ Assign Subject</button>
            </div>
          </div>

          {viewMode === 'card' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filteredTeachers.map((t) => (
                <div key={t.id} className={`panel-card ${selectedIds.includes(t.id) ? 'selected' : ''}`} style={{ padding: 18, cursor: 'pointer', border: selectedIds.includes(t.id) ? '2px solid #4157ff' : undefined }} onClick={() => toggleSelect(t.id)}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    {renderAvatar(t)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#111b33' }}>{t.title}</h4>
                          <p style={{ margin: '2px 0 0', color: '#4157ff', fontSize: '0.84rem', fontWeight: 600 }}>{t.subject}</p>
                        </div>
                        <span className={`status-pill ${t.tone === 'success' ? 'success' : 'warning'}`}>{t.status}</span>
                      </div>
                      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.82rem', color: '#5c6b8c' }}>
                        <div>🎓 {t.qualification}</div>
                        <div>⏱ {t.experience} yrs exp</div>
                        <div>✉ {t.email?.split('@')[0]}</div>
                        <div>📱 {t.phone?.slice(-5)}</div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.classes?.slice(0, 3).map((c) => (
                          <span key={c} style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(65, 87, 255, 0.08)', color: '#3246c7', fontSize: '0.72rem', fontWeight: 700 }}>{c}</span>
                        ))}
                        {t.classes?.length > 3 && <span style={{ padding: '4px 10px', fontSize: '0.72rem', color: '#7f8ba5' }}>+{t.classes.length - 3}</span>}
                      </div>
                      <div style={{ marginTop: 14, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button className="small-action" style={{ flex: 1, padding: '8px 10px', fontSize: '0.78rem' }} onClick={() => navigate('/teachers/profile')}>View</button>
                        <button className="small-action" style={{ padding: '8px 10px', fontSize: '0.78rem' }}>📧</button>
                        <button className="small-action" style={{ padding: '8px 10px', fontSize: '0.78rem' }}>✎</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}></th>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>Qualification</th>
                    <th>Exp</th>
                    <th>Classes</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.map((t) => (
                    <tr key={t.id} className={selectedIds.includes(t.id) ? 'selected' : ''}>
                      <td><input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleSelect(t.id)} style={{ width: 16, height: 16 }} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {renderAvatar(t, 'sm')}
                          <div>
                            <div className="record-title">{t.title}</div>
                            <div className="record-subtitle">{t.id} · {t.department}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#4157ff' }}>{t.subject}</td>
                      <td>{t.qualification}</td>
                      <td>{t.experience} yrs</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {t.classes?.slice(0, 2).map((c) => (
                            <span key={c} className="status-pill" style={{ fontSize: '0.65rem', padding: '3px 8px' }}>{c}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.82rem' }}>
                          <div>{t.phone}</div>
                          <div style={{ color: '#7f8ba5' }}>{t.email}</div>
                        </div>
                      </td>
                      <td><span className={`status-pill ${t.tone === 'success' ? 'success' : 'warning'}`}>{t.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="small-action" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => navigate('/teachers/profile')}>View</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredTeachers.length === 0 && (
            <p className="empty-state" style={{ marginTop: 20 }}>No teachers match the current filters.</p>
          )}
        </div>

        <div className="side-stack">
          <div className="panel-card">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Analytics</p>
                <h3>Department Distribution</h3>
              </div>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={departmentData} cx="50%" cy="48%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {departmentData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.78rem', paddingTop: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Experience</p>
                <h3>Workforce Tenure</h3>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={experienceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                  <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#4157ff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Upcoming</p>
                <h3>🎂 Birthdays This Month</h3>
              </div>
            </div>
            <div className="activity-list">
              {upcomingBirthdays.map((t) => (
                <div key={t.id} className="activity-item" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {renderAvatar(t, 'sm')}
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.88rem' }}>{t.title}</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem' }}>{t.month}/{t.day} · in {t.daysLeft} days</p>
                  </div>
                  <span className="status-pill" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#db2777', fontSize: '0.68rem' }}>{t.daysLeft === 0 ? 'TODAY' : `${t.daysLeft}d`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 30, right: 30, background: '#111b33', color: '#fff', padding: '14px 22px', borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 9999, fontWeight: 600, fontSize: '0.9rem' }}>
          {toast}
        </div>
      )}

      {bulkAction && (
        <div className="modal-overlay" onClick={() => setBulkAction(null)}>
          <div className="modal-panel" style={{ textAlign: 'center', padding: 32 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 60, height: 60, margin: '0 auto 16px', borderRadius: 20, background: 'rgba(65, 87, 255, 0.12)', display: 'grid', placeItems: 'center', fontSize: 28 }}>◉</div>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Assign Subject</h3>
            <p style={{ color: '#7f8ba5', marginTop: 8 }}>Updating subject assignments for selected teachers...</p>
            <div style={{ marginTop: 18, display: 'inline-block', width: 40, height: 40, border: '3px solid rgba(65, 87, 255, 0.2)', borderTopColor: '#4157ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeachersPage
