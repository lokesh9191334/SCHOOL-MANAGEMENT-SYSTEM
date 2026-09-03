import { useState, useMemo } from 'react'
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
  LineChart,
  Line,
  Legend,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

const SUBJECTS_PER_STUDENT = [
  { subject: 'Mathematics', marks: 87, grade: 'A+', status: 'Pass', teacher: 'Dr. Meera Iyer', progress: [58, 65, 72, 78, 82, 87] },
  { subject: 'Science', marks: 92, grade: 'A+', status: 'Pass', teacher: 'James Okonkwo', progress: [70, 78, 80, 85, 88, 92] },
  { subject: 'English', marks: 78, grade: 'B+', status: 'Pass', teacher: 'Sara Lindqvist', progress: [52, 60, 65, 70, 72, 78] },
  { subject: 'History', marks: 71, grade: 'B', status: 'Pass', teacher: 'R. Menon', progress: [45, 55, 60, 62, 66, 71] },
  { subject: 'Geography', marks: 84, grade: 'A', status: 'Pass', teacher: 'P. Sharma', progress: [60, 70, 73, 77, 80, 84] },
  { subject: 'Computer Science', marks: 95, grade: 'A+', status: 'Pass', teacher: 'A. Gupta', progress: [75, 82, 85, 88, 90, 95] },
]

const TERM_DATA = [
  { name: 'Term 1', overall: 74, classAvg: 68 },
  { name: 'Term 2', overall: 79, classAvg: 70 },
  { name: 'Term 3', overall: 84, classAvg: 72 },
]

const STRENGTHS = [
  { title: 'Logical Reasoning', desc: 'Exceptional problem-solving and analytical ability in Math and Science.', level: 'Excellent' },
  { title: 'Technical Aptitude', desc: 'Demonstrates advanced proficiency in computer science and coding.', level: 'Excellent' },
  { title: 'Memory & Retention', desc: 'Strong retention of concepts across all subjects.', level: 'Very Good' },
]

const WEAKNESSES = [
  { title: 'Writing Speed', desc: 'Needs improvement in completing written assessments on time.', level: 'Needs Work' },
  { title: 'History Dates', desc: 'Struggles with memorizing historical timelines and dates.', level: 'Needs Work' },
  { title: 'Handwriting', desc: 'Handwriting legibility can be improved for better scoring.', level: 'Improving' },
]

const TEACHER_REMARKS = [
  { teacher: 'Dr. Meera Iyer', subject: 'Mathematics', date: '2026-07-22', remark: 'Aanya shows strong logical thinking. Encourage participation in Olympiad preparation. Overall outstanding progress this term.' },
  { teacher: 'James Okonkwo', subject: 'Science', date: '2026-07-20', remark: 'Excellent practical knowledge and laboratory discipline. Active participant in science fairs.' },
  { teacher: 'Sara Lindqvist', subject: 'English', date: '2026-07-18', remark: 'Great vocabulary and comprehension. Reading fluency is a strength. Focus on essay structure.' },
]

const getAvatarGradient = (student) => {
  if (student?.gender === 'Male') return 'linear-gradient(135deg,#6fc3ff,#7c6cff)'
  if (student?.gender === 'Female') return 'linear-gradient(135deg,#ff93c2,#7c6cff)'
  return 'linear-gradient(135deg,#a8b5cf,#7c8cff)'
}

const PerformancePage = () => {
  const [students] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [toast, setToast] = useState('')
  const [selectedClass, setSelectedClass] = useState('All')
  const [selectedSection, setSelectedSection] = useState('All')
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '')

  const classOptions = useMemo(() => {
    const classes = [...new Set(students.map((s) => s.subtitle?.split(' -')[0] || s.subtitle || 'All'))]
    return ['All', ...classes]
  }, [students])

  const filteredByClassSection = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass !== 'All' && !s.subtitle?.startsWith(selectedClass)) return false
      if (selectedSection !== 'All') {
        const section = s.subtitle?.split('-')[1]?.trim()
        if (section !== selectedSection) return false
      }
      return true
    })
  }, [students, selectedClass, selectedSection])

  const student = students.find((s) => s.id === selectedStudentId) || students[0]

  const overallPct = useMemo(() => {
    return Math.round(SUBJECTS_PER_STUDENT.reduce((s, x) => s + x.marks, 0) / SUBJECTS_PER_STUDENT.length)
  }, [])

  const cgpa = (overallPct / 9.5).toFixed(2)
  const subjectsPassed = SUBJECTS_PER_STUDENT.filter((s) => s.status === 'Pass').length
  const attendancePct = 89
  const classRank = 5
  const classStrength = 45

  const handlePrintReport = () => {
    setToast('Report card download started')
    setTimeout(() => window.print(), 400)
  }

  const handleSendToParent = () => {
    const email = window.prompt(`Email report card to parent (${student?.fatherEmail || student?.motherEmail || 'parent@email.com'})`, student?.fatherEmail || '')
    if (email) setToast(`Report card emailed to ${email}`)
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
          <div>
            <p className="admin-kicker">Analytics</p>
            <h2>Student Performance Dashboard</h2>
            <p>Track academic outcomes, subject mastery, progress trends and teacher insights for every student.</p>
          </div>
          <div className="link-row" style={{ gap: '10px' }}>
            <Link className="link-pill" to="/students">← Registry</Link>
            <Link className="link-pill" to="/examination/results">📋 Results</Link>
            <Link className="link-pill" to="/students/profile">👤 Profiles</Link>
          </div>
        </div>
      </div>

      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Student Selector</p>
            <h3>Choose a Student</h3>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c6b8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Class</label>
            <select
              className="search-input"
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); if (filteredByClassSection[0]) setSelectedStudentId(filteredByClassSection[0].id) }}
              style={{ marginBottom: 0 }}
            >
              {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c6b8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Section</label>
            <select
              className="search-input"
              value={selectedSection}
              onChange={(e) => { setSelectedSection(e.target.value); if (filteredByClassSection[0]) setSelectedStudentId(filteredByClassSection[0].id) }}
              style={{ marginBottom: 0 }}
            >
              {['All', 'A', 'B', 'C', 'D'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2 / auto' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c6b8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Student</label>
            <select
              className="search-input"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              style={{ marginBottom: 0 }}
            >
              {filteredByClassSection.length === 0 && <option value="">No students</option>}
              {filteredByClassSection.map((s) => (
                <option key={s.id} value={s.id}>{s.id} — {s.title} ({s.subtitle})</option>
              ))}
            </select>
          </div>
        </div>
      </article>

      {student ? (
        <>
          <div className="content-grid">
            {[
              { label: 'Overall %', value: `${overallPct}%`, note: 'Across all subjects', icon: '🎯', grad: 'linear-gradient(135deg, #4157ff, #7c8cff)' },
              { label: 'CGPA', value: cgpa, note: 'On 10.0 scale', icon: '🏆', grad: 'linear-gradient(135deg, #17b398, #5fe0c6)' },
              { label: 'Class Rank', value: `${classRank} / ${classStrength}`, note: `Top ${Math.round((classRank / classStrength) * 100)} percentile`, icon: '🥇', grad: 'linear-gradient(135deg, #f4b562, #ffd9a8)' },
              { label: 'Subjects Passed', value: `${subjectsPassed}/${SUBJECTS_PER_STUDENT.length}`, note: 'Passing mark ≥ 40', icon: '📚', grad: 'linear-gradient(135deg, #f35d5d, #ff9b9b)' },
              { label: 'Attendance %', value: `${attendancePct}%`, note: 'Term attendance rate', icon: '📅', grad: 'linear-gradient(135deg, #7c8cff, #a5b3ff)' },
            ].map((k, idx) => (
              <div key={idx} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: k.grad,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    boxShadow: '0 8px 18px rgba(65, 87, 255, 0.2)',
                  }}>{k.icon}</div>
                </div>
                <span>{k.label}</span>
                <strong className="stat-value">{k.value}</strong>
                <p className="stat-note">{k.note}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '18px' }}>
            <article className="panel-card data-panel">
              <div className="panel-header compact">
                <div>
                  <p className="panel-kicker">Comparison</p>
                  <h3>Term-wise Performance Trend</h3>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#4157ff', display: 'inline-block' }} />
                    <span style={{ color: '#5c6b8c', fontWeight: '600' }}>Student</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#17b398', display: 'inline-block' }} />
                    <span style={{ color: '#5c6b8c', fontWeight: '600' }}>Class Avg</span>
                  </div>
                </div>
              </div>
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TERM_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[40, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: '600' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="overall" name="Student %" stroke="#4157ff" strokeWidth={3} dot={{ r: 6, fill: '#4157ff', stroke: '#fff', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="classAvg" name="Class Avg" stroke="#17b398" strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 5, fill: '#17b398', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="panel-card data-panel" style={{
              background: 'linear-gradient(145deg, rgba(65, 87, 255, 0.08) 0%, rgba(255,255,255,1) 65%)',
            }}>
              <div className="panel-header compact">
                <div>
                  <p className="panel-kicker">Student</p>
                  <h3>Academic Profile</h3>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '12px' }}>
                <div style={{
                  width: '108px',
                  height: '108px',
                  borderRadius: '28px',
                  overflow: 'hidden',
                  background: getAvatarGradient(student),
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '46px',
                  fontWeight: '800',
                  border: '4px solid rgba(255,255,255,0.9)',
                  boxShadow: '0 16px 32px rgba(65, 87, 255, 0.22)',
                  marginBottom: '14px',
                }}>
                  {student.title.charAt(0).toUpperCase()}
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111b33' }}>{student.title}</h3>
                <p style={{ margin: '4px 0 14px', color: '#5c6b8c', fontWeight: '600', fontSize: '0.9rem' }}>{student.subtitle} · {student.id}</p>
                <div style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(65, 87, 255, 0.1)',
                  marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#7f8ba5', fontWeight: '600' }}>Academic Year</span>
                    <strong style={{ fontSize: '0.86rem', color: '#111b33' }}>2025-2026</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#7f8ba5', fontWeight: '600' }}>Class Teacher</span>
                    <strong style={{ fontSize: '0.86rem', color: '#111b33' }}>Dr. Meera Iyer</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.82rem', color: '#7f8ba5', fontWeight: '600' }}>Current Term</span>
                    <strong style={{ fontSize: '0.86rem', color: '#4157ff' }}>Term 3 (Final)</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    className="small-action"
                    onClick={handlePrintReport}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #4157ff, #7c8cff)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 14px',
                      fontWeight: '700',
                    }}
                  >
                    📄 Download Report
                  </button>
                  <button
                    type="button"
                    className="small-action"
                    onClick={handleSendToParent}
                    style={{
                      padding: '10px 14px',
                    }}
                  >
                    ✉ Parent
                  </button>
                </div>
              </div>
            </article>
          </div>

          <article className="panel-card data-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Subjects</p>
                <h3>Subject-wise Performance</h3>
              </div>
              <span style={{ fontSize: '0.82rem', color: '#7f8ba5', fontWeight: '600' }}>Current Term</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
              <div style={{ height: '360px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={SUBJECTS_PER_STUDENT} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: '600' }}
                      cursor={{ fill: 'rgba(65, 87, 255, 0.04)' }}
                    />
                    <Bar dataKey="marks" name="Marks %" radius={[0, 10, 10, 0]} barSize={26}>
                      {SUBJECTS_PER_STUDENT.map((_, idx) => (
                        <Cell key={idx} fill={['#4157ff', '#17b398', '#f4b562', '#f35d5d', '#7c8cff', '#5fe0c6'][idx % 6]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="table-responsive" style={{ borderRadius: '16px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Marks</th>
                      <th>Grade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUBJECTS_PER_STUDENT.map((sp) => (
                      <tr key={sp.subject}>
                        <td>
                          <span className="record-title">{sp.subject}</span>
                          <p className="record-subtitle">{sp.teacher}</p>
                        </td>
                        <td style={{ fontWeight: '800', fontSize: '1.05rem', color: '#111b33' }}>{sp.marks}</td>
                        <td>
                          <span style={{
                            background: 'linear-gradient(135deg, #4157ff, #7c8cff)',
                            color: 'white',
                            padding: '5px 12px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.86rem',
                            boxShadow: '0 4px 10px rgba(65, 87, 255, 0.2)',
                          }}>{sp.grade}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${sp.status === 'Pass' ? 'success' : 'warning'}`} style={sp.status === 'Pass' ? { background: 'rgba(23, 179, 152, 0.14)', color: '#0d8f7a' } : { background: 'rgba(243, 93, 93, 0.14)', color: '#f35d5d' }}>
                            {sp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>

          <article className="panel-card data-panel">
            <div className="panel-header compact">
              <div>
                <p className="panel-kicker">Progress</p>
                <h3>Progress Over Time — Sparklines per Subject</h3>
              </div>
              <span style={{ fontSize: '0.82rem', color: '#7f8ba5', fontWeight: '600' }}>Last 6 assessments</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {SUBJECTS_PER_STUDENT.map((sp, i) => {
                const gradColor = sp.marks >= 85 ? '#17b398' : sp.marks >= 65 ? '#4157ff' : '#f4b562'
                return (
                  <div key={sp.subject} style={{
                    background: 'linear-gradient(180deg, #ffffff, #f7f8ff)',
                    borderRadius: '18px',
                    padding: '14px',
                    border: '1px solid rgba(65, 87, 255, 0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '13px', color: '#111b33', fontWeight: '800' }}>{sp.subject}</h4>
                      <span style={{ fontSize: '0.76rem', color: gradColor, fontWeight: '800' }}>{sp.grade}</span>
                    </div>
                    <div style={{ height: '80px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sp.progress.map((m, j) => ({ i: `T${j + 1}`, v: m }))}>
                          <defs>
                            <linearGradient id={`s${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={gradColor} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={gradColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="v" stroke={gradColor} strokeWidth={2.5} fill={`url(#s${i})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.78rem', color: '#7f8ba5', fontWeight: '600' }}>
                      <span>First: {sp.progress[0]}</span>
                      <span style={{ color: gradColor, fontWeight: '800' }}>Latest: {sp.progress[sp.progress.length - 1]}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
            <article className="panel-card data-panel" style={{ background: 'linear-gradient(180deg, rgba(23, 179, 152, 0.08), rgba(255,255,255,1) 60%)' }}>
              <div className="panel-header compact">
                <div>
                  <p className="panel-kicker" style={{ color: '#0d8f7a' }}>Strengths</p>
                  <h3>🏆 Academic Strengths</h3>
                </div>
              </div>
              <div className="side-stack" style={{ gap: '10px' }}>
                {STRENGTHS.map((s, i) => (
                  <div key={i} style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'white',
                    border: '1px solid rgba(23, 179, 152, 0.15)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#111b33', fontWeight: '800' }}>{s.title}</h4>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: 'rgba(23, 179, 152, 0.14)',
                        color: '#0d8f7a',
                      }}>{s.level}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#5c6b8c', lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card data-panel" style={{ background: 'linear-gradient(180deg, rgba(244, 181, 98, 0.1), rgba(255,255,255,1) 60%)' }}>
              <div className="panel-header compact">
                <div>
                  <p className="panel-kicker" style={{ color: '#b07820' }}>Areas to Improve</p>
                  <h3>⚠️ Weaknesses</h3>
                </div>
              </div>
              <div className="side-stack" style={{ gap: '10px' }}>
                {WEAKNESSES.map((w, i) => (
                  <div key={i} style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'white',
                    border: '1px solid rgba(244, 181, 98, 0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#111b33', fontWeight: '800' }}>{w.title}</h4>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        background: w.level === 'Improving' ? 'rgba(65, 87, 255, 0.14)' : 'rgba(244, 181, 98, 0.2)',
                        color: w.level === 'Improving' ? '#4157ff' : '#b07820',
                      }}>{w.level}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#5c6b8c', lineHeight: 1.6 }}>{w.desc}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel-card data-panel">
              <div className="panel-header compact">
                <div>
                  <p className="panel-kicker">Feedback</p>
                  <h3>💬 Teacher Remarks</h3>
                </div>
              </div>
              <div className="side-stack" style={{ gap: '10px' }}>
                {TEACHER_REMARKS.map((r, i) => (
                  <div key={i} style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(65, 87, 255, 0.06), rgba(255,255,255,1))',
                    border: '1px solid rgba(65, 87, 255, 0.1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#111b33', fontWeight: '800' }}>{r.teacher}</h4>
                        <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#7f8ba5', fontWeight: '600' }}>{r.subject}</p>
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#7f8ba5', fontWeight: '600' }}>{r.date}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#5c6b8c', lineHeight: 1.6 }}>"{r.remark}"</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </>
      ) : (
        <article className="panel-card data-panel">
          <div className="empty-state">
            <p>No students available. Add some students first to view performance.</p>
            <div style={{ marginTop: 12 }}>
              <Link to="/students/add" className="link-pill">Add Student</Link>
            </div>
          </div>
        </article>
      )}

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

export default PerformancePage
