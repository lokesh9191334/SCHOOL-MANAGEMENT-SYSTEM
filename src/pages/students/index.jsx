import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS } from '../../data/seed'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const STAT_ICONS = {
  total: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  active: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  new: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  transport: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
}

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #4157ff 0%, #7c8cff 100%)',
  'linear-gradient(135deg, #17b398 0%, #5fe0c6 100%)',
  'linear-gradient(135deg, #f4b562 0%, #ffd9a8 100%)',
  'linear-gradient(135deg, #f35d5d 0%, #ff9b9b 100%)',
]

const CHART_COLORS = ['#4157ff', '#17b398', '#f4b562', '#f35d5d', '#7c8cff', '#5fe0c6']

const GENDERS = ['All', 'Male', 'Female', 'Other']
const STATUSES = ['All', 'Active', 'Inactive', 'On Leave']
const SECTIONS = ['All', 'A', 'B', 'C', 'D']

const StudentsPage = () => {
  const [students, setStudents] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [filterClass, setFilterClass] = useState('All')
  const [filterSection, setFilterSection] = useState('All')
  const [filterGender, setFilterGender] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [selectedStudents, setSelectedStudents] = useState([])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  const classOptions = useMemo(() => {
    const classes = [...new Set(students.map((s) => s.subtitle?.split(' -')[0] || s.subtitle || 'Unassigned'))]
    return ['All', ...classes.sort((a, b) => {
      const getSortKey = (str) => {
        const match = str.match(/Class (\d+)/)
        return match ? parseInt(match[1], 10) : str.toLowerCase()
      }
      const keyA = getSortKey(a)
      const keyB = getSortKey(b)
      if (typeof keyA === 'number' && typeof keyB === 'number') return keyA - keyB
      return String(keyA).localeCompare(String(keyB))
    })]
  }, [students])

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (searchQuery) {
        const normalizedQuery = searchQuery.toLowerCase()
        const studentName = student.title?.toLowerCase() || ''
        const studentClass = student.subtitle?.toLowerCase() || ''
        const studentParent = student.primary?.toLowerCase() || ''
        const studentId = student.id?.toLowerCase() || ''
        const matches =
          studentName.includes(normalizedQuery) ||
          studentClass.includes(normalizedQuery) ||
          studentParent.includes(normalizedQuery) ||
          studentId.includes(normalizedQuery)
        if (!matches) return false
      }

      if (filterClass !== 'All') {
        if (!student.subtitle?.startsWith(filterClass)) return false
      }

      if (filterSection !== 'All') {
        const section = student.subtitle?.split('-')[1]?.trim()
        if (section !== filterSection) return false
      }

      if (filterGender !== 'All') {
        if (student.gender !== filterGender) return false
      }

      if (filterStatus !== 'All') {
        if (student.status !== filterStatus) return false
      }

      return true
    })
  }, [students, searchQuery, filterClass, filterSection, filterGender, filterStatus])

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter((s) => s.status === 'Active').length,
    newAdmissions: students.filter((s) => {
      const daysAgo = 30
      const cutoff = Date.now() - daysAgo * 24 * 60 * 60 * 1000
      return !s.admissionDate || new Date(s.admissionDate).getTime() > cutoff
    }).length || Math.max(1, Math.floor(students.length * 0.15)),
    transport: students.filter((s) => s.transportRequired).length,
  }), [students])

  const classDistribution = useMemo(() => {
    const groups = {}
    students.forEach((s) => {
      const cls = s.subtitle?.split(' -')[0] || s.subtitle || 'Unassigned'
      groups[cls] = (groups[cls] || 0) + 1
    })
    return Object.entries(groups)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const getSortKey = (str) => {
          const match = str.match(/Class (\d+)/)
          return match ? parseInt(match[1], 10) : str.toLowerCase()
        }
        return getSortKey(a.name) - getSortKey(b.name)
      })
  }, [students])

  const recentAdmissions = useMemo(() => {
    return students
      .slice()
      .sort((a, b) => new Date(b.admissionDate || 0).getTime() - new Date(a.admissionDate || 0).getTime())
      .slice(0, 6)
  }, [students])

  const toggleSelect = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.id))
    }
  }

  const getAvatarGradient = (student) => {
    if (student.gender === 'Male') return 'linear-gradient(135deg,#6fc3ff,#7c6cff)'
    if (student.gender === 'Female') return 'linear-gradient(135deg,#ff93c2,#7c6cff)'
    return 'linear-gradient(135deg,#a8b5cf,#7c8cff)'
  }

  const getToneForStatus = (status) => {
    if (status === 'Active') return 'success'
    if (status === 'On Leave') return 'warning'
    if (status === 'Inactive') return 'danger'
    return ''
  }

  const handleBulkDelete = () => {
    if (selectedStudents.length === 0) return
    if (window.confirm(`Delete ${selectedStudents.length} selected student(s)?`)) {
      setStudents((prev) => prev.filter((s) => !selectedStudents.includes(s.id)))
      setSelectedStudents([])
      setToast('Selected students deleted')
    }
  }

  const handleBulkPromote = () => {
    if (selectedStudents.length === 0) return
    setStudents((prev) =>
      prev.map((s) => {
        if (!selectedStudents.includes(s.id)) return s
        const match = s.subtitle?.match(/Class (\d+)/)
        if (match) {
          const nextClass = parseInt(match[1], 10) + 1
          return { ...s, subtitle: s.subtitle.replace(/Class \d+/, `Class ${nextClass}`) }
        }
        return s
      })
    )
    setToast(`Promoted ${selectedStudents.length} students`)
  }

  const handleBulkExport = () => {
    const exportList = selectedStudents.length > 0
      ? students.filter((s) => selectedStudents.includes(s.id))
      : filteredStudents
    const headers = ['ID', 'Name', 'Class', 'Gender', 'Status', 'Parent', 'Phone', 'Email']
    const rows = exportList.map((s) => [
      s.id,
      s.title,
      s.subtitle,
      s.gender || 'N/A',
      s.status,
      s.primary || s.fatherName || 'N/A',
      s.phone || s.fatherPhone || 'N/A',
      s.email || 'N/A',
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setToast(`Exported ${exportList.length} records`)
  }

  const handleBulkSMS = () => {
    const count = selectedStudents.length > 0 ? selectedStudents.length : filteredStudents.length
    if (count === 0) return
    const msg = window.prompt(`Send SMS to ${count} parents`, 'Dear parent, this is a school notification...')
    if (msg) setToast(`SMS queued to ${count} recipients`)
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Registry</p>
        <h2>Student Directory</h2>
        <p>Search, filter, and manage student records with comprehensive KPI insights and class-wise analytics.</p>
        <div className="link-row" style={{ gap: '10px', marginTop: '16px' }}>
          <Link className="link-pill" to="/students/add">
            ＋ Add New Student
          </Link>
          <Link className="link-pill" to="/students/data-files">
            📁 Documents
          </Link>
          <Link className="link-pill" to="/students/performance">
            📊 Performance
          </Link>
          <Link className="link-pill" to="/students/parent-details">
            👨‍👩‍👧 Parents
          </Link>
          <button
            type="button"
            className="link-pill"
            onClick={() => {
              setStudents(SEED_STUDENTS)
              setToast('Demo student data restored')
            }}
          >
            🔄 Reset Demo Data
          </button>
        </div>
      </div>

      <div className="content-grid">
        {[
          { label: 'Total Students', value: stats.total, icon: STAT_ICONS.total, note: 'Across all classes', gradient: GRADIENT_COLORS[0] },
          { label: 'Active', value: stats.active, icon: STAT_ICONS.active, note: 'Currently enrolled', gradient: GRADIENT_COLORS[1] },
          { label: 'New Admissions', value: stats.newAdmissions, icon: STAT_ICONS.new, note: 'Last 30 days', gradient: GRADIENT_COLORS[2] },
          { label: 'Transport Users', value: stats.transport, icon: STAT_ICONS.transport, note: 'Bus service availed', gradient: GRADIENT_COLORS[3] },
        ].map((stat, idx) => (
          <div key={idx} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: stat.gradient,
                  color: 'white',
                  boxShadow: '0 8px 18px rgba(65, 87, 255, 0.2)',
                }}
              >
                {stat.icon}
              </div>
            </div>
            <span>{stat.label}</span>
            <strong className="stat-value">{stat.value}</strong>
            <p className="stat-note">{stat.note}</p>
          </div>
        ))}
      </div>

      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Filters</p>
            <h3>Advanced Search</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className={`small-action ${viewMode === 'grid' ? 'primary' : ''}`}
              onClick={() => setViewMode('grid')}
              style={viewMode === 'grid' ? { background: 'linear-gradient(135deg, #4157ff, #7c8cff)', color: 'white', border: 'none' } : {}}
            >
              ▦ Grid
            </button>
            <button
              type="button"
              className={`small-action ${viewMode === 'table' ? 'primary' : ''}`}
              onClick={() => setViewMode('table')}
              style={viewMode === 'table' ? { background: 'linear-gradient(135deg, #4157ff, #7c8cff)', color: 'white', border: 'none' } : {}}
            >
              ☰ Table
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div style={{ gridColumn: 'span 1 / -1', display: 'flex' }}>
            <input
              type="text"
              placeholder="🔍 Search by name, ID, class, or parent..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c6b8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Class</label>
            <select
              className="search-input"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c6b8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Section</label>
            <select
              className="search-input"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c6b8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Gender</label>
            <select
              className="search-input"
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c6b8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</label>
            <select
              className="search-input"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #f4f7ff 0%, #eef1ff 100%)',
          borderRadius: '14px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', color: '#5c6b8c', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                onChange={toggleSelectAll}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4157ff' }}
              />
              Select All
            </label>
            <span style={{ fontSize: '0.88rem', color: '#7f8ba5', fontWeight: '600' }}>
              {selectedStudents.length > 0 ? `${selectedStudents.length} selected of ${filteredStudents.length}` : `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="small-action" onClick={handleBulkExport}>
              📥 Export CSV
            </button>
            <button type="button" className="small-action" onClick={handleBulkPromote}>
              ⏫ Promote
            </button>
            <button type="button" className="small-action" onClick={handleBulkSMS}>
              ✉ Send SMS
            </button>
            <button
              type="button"
              className="small-action"
              onClick={handleBulkDelete}
              style={{ color: '#f35d5d', borderColor: 'rgba(243, 93, 93, 0.3)' }}
            >
              🗑 Delete
            </button>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="empty-state">
            <p>No students found matching your filters. Try adjusting your search criteria.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  border: selectedStudents.includes(student.id)
                    ? '2px solid rgba(65, 87, 255, 0.4)'
                    : '1px solid rgba(65, 87, 255, 0.08)',
                  padding: '18px',
                  boxShadow: selectedStudents.includes(student.id)
                    ? '0 16px 36px rgba(65, 87, 255, 0.15)'
                    : '0 10px 28px rgba(13, 25, 62, 0.06)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => toggleSelect(student.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4157ff' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: '800',
                      color: 'white',
                      background: getAvatarGradient(student),
                      boxShadow: '0 6px 16px rgba(65, 87, 255, 0.2)',
                      flexShrink: 0,
                    }}
                  >
                    {student.title.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#111b33', fontWeight: '800' }}>{student.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: '#4157ff', background: 'rgba(65, 87, 255, 0.1)', padding: '3px 10px', borderRadius: '999px', fontWeight: '700' }}>
                        {student.subtitle}
                      </span>
                      <span className={`status-pill ${getToneForStatus(student.status)}`}>{student.status}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', fontSize: '0.86rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Roll No</span>
                    <span style={{ color: '#111b33', fontWeight: '700' }}>{student.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Parent</span>
                    <span style={{ color: '#111b33', fontWeight: '700' }}>{student.primary || student.fatherName || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Contact</span>
                    <span style={{ color: '#111b33', fontWeight: '700' }}>{student.phone || student.fatherPhone || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Transport</span>
                    <span style={{ color: student.transportRequired ? '#17b398' : '#f35d5d', fontWeight: '700' }}>
                      {student.transportRequired ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <Link to={`/students/profile`} state={{ studentId: student.id }} className="small-action" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>
                    👁 View
                  </Link>
                  <Link to={`/students/add`} state={{ editId: student.id }} className="small-action" style={{ textDecoration: 'none', flex: 1, textAlign: 'center' }}>
                    ✏ Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Class / Section</th>
                  <th>Gender</th>
                  <th>Parent</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Transport</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className={selectedStudents.includes(student.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleSelect(student.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4157ff' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            color: 'white',
                            background: getAvatarGradient(student),
                            fontSize: '14px',
                          }}
                        >
                          {student.title.charAt(0).toUpperCase()}
                        </div>
                        <span className="record-title">{student.title}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '700', color: '#4157ff' }}>{student.id}</td>
                    <td>{student.subtitle}</td>
                    <td>{student.gender || 'N/A'}</td>
                    <td>{student.primary || student.fatherName || 'N/A'}</td>
                    <td>{student.phone || student.fatherPhone || 'N/A'}</td>
                    <td><span className={`status-pill ${getToneForStatus(student.status)}`}>{student.status}</span></td>
                    <td>
                      <span style={{
                        fontWeight: '700',
                        color: student.transportRequired ? '#17b398' : '#7f8ba5',
                        fontSize: '0.86rem',
                      }}>
                        {student.transportRequired ? '✓ Yes' : '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <Link to={`/students/profile`} state={{ studentId: student.id }} className="small-action" style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '0.76rem' }}>
                          👁
                        </Link>
                        <button
                          type="button"
                          className="small-action"
                          style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                          onClick={() => {
                            const msg = window.prompt(`Message to ${student.primary || student.title}`, '')
                            if (msg) setToast('Message sent')
                          }}
                        >
                          ✉
                        </button>
                        <button
                          type="button"
                          className="small-action"
                          style={{ padding: '6px 10px', fontSize: '0.76rem', color: '#f35d5d', borderColor: 'rgba(243, 93, 93, 0.3)' }}
                          onClick={() => {
                            if (window.confirm(`Delete ${student.title}?`)) {
                              setStudents((prev) => prev.filter((s) => s.id !== student.id))
                              setToast('Student deleted')
                            }
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <div className="content-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <article className="panel-card data-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Analytics</p>
              <h3>Class-wise Distribution</h3>
            </div>
            <span style={{ fontSize: '0.82rem', color: '#7f8ba5', fontWeight: '600' }}>
              {classDistribution.reduce((s, c) => s + c.count, 0)} total students
            </span>
          </div>
          <div style={{ height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={8} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    fontWeight: '600',
                  }}
                  cursor={{ fill: 'rgba(65, 87, 255, 0.05)' }}
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={44}>
                  {classDistribution.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel-card data-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Timeline</p>
              <h3>Recent Admissions</h3>
            </div>
          </div>
          <div className="timeline-list" style={{ gap: '10px' }}>
            {recentAdmissions.map((student, idx) => (
              <div
                key={student.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderRadius: '14px',
                  background: idx === 0 ? 'linear-gradient(135deg, rgba(65, 87, 255, 0.08), rgba(255,255,255,1))' : 'white',
                  border: '1px solid rgba(65, 87, 255, 0.06)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    color: 'white',
                    background: getAvatarGradient(student),
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  {student.title.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#111b33', fontWeight: '800' }}>{student.title}</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#7f8ba5', fontWeight: '600' }}>
                    {student.subtitle} · {student.id}
                  </p>
                </div>
                <span className={`status-pill ${getToneForStatus(student.status)}`} style={{ padding: '4px 10px', fontSize: '0.68rem' }}>
                  {student.status}
                </span>
              </div>
            ))}
          </div>
        </article>
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

export default StudentsPage
