import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS } from '../../data/seed'
import './StudentList.css'

const STATUS_OPTIONS = ['All', 'Active', 'On Hold', 'Alumni']
const SORT_OPTIONS = [
  { value: 'name', label: 'Sort: Name' },
  { value: 'class', label: 'Sort: Class' },
  { value: 'status', label: 'Sort: Status' },
  { value: 'id', label: 'Sort: ID' },
]

function toneForStatus(status) {
  if (status === 'Active') return 'success'
  if (status === 'On Hold') return 'warning'
  return 'muted'
}

function downloadCsv(rows) {
  const headers = ['ID', 'Name', 'Class', 'Status', 'Guardian', 'Email', 'Phone', 'Roll No', 'Admission Date']
  const lines = rows.map((r) =>
    [r.id, r.title, r.subtitle, r.status, r.primary, r.owner, r.phone || '', r.rollNo || '', r.admissionDate || '']
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(','),
  )
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `student-list-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const StudentsPage = () => {
  const navigate = useNavigate()
  const [students, setStudents] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [selectedId, setSelectedId] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const classOptions = useMemo(() => {
    const classes = [...new Set(students.map((s) => s.subtitle).filter(Boolean))].sort()
    return ['All', ...classes]
  }, [students])

  const stats = useMemo(() => {
    const active = students.filter((s) => s.status === 'Active').length
    const onHold = students.filter((s) => s.status === 'On Hold').length
    const alumni = students.filter((s) => s.status === 'Alumni').length
    const classes = new Set(students.map((s) => s.subtitle)).size
    return { total: students.length, active, onHold, alumni, classes }
  }, [students])

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = students.filter((s) => {
      if (classFilter !== 'All' && s.subtitle !== classFilter) return false
      if (statusFilter !== 'All' && s.status !== statusFilter) return false
      if (!q) return true
      return [s.title, s.subtitle, s.primary, s.owner, s.id, s.rollNo, s.phone]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    })

    list.sort((a, b) => {
      if (sortBy === 'class') return String(a.subtitle).localeCompare(String(b.subtitle))
      if (sortBy === 'status') return String(a.status).localeCompare(String(b.status))
      if (sortBy === 'id') return String(a.id).localeCompare(String(b.id))
      return String(a.title).localeCompare(String(b.title))
    })

    return list
  }, [students, searchQuery, classFilter, statusFilter, sortBy])

  const selected = students.find((s) => s.id === selectedId) ?? filteredStudents[0] ?? null

  useEffect(() => {
    if (!selectedId && filteredStudents[0]) {
      setSelectedId(filteredStudents[0].id)
    }
  }, [filteredStudents, selectedId])

  const updateStatus = (id, status) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, tone: toneForStatus(status) } : s)),
    )
    setToast(`Status updated to ${status}`)
  }

  const removeStudent = (id) => {
    const target = students.find((s) => s.id === id)
    if (!target) return
    const confirmed = window.confirm(`Remove ${target.title} from the registry?`)
    if (!confirmed) return
    setStudents((prev) => prev.filter((s) => s.id !== id))
    setSelectedId(null)
    setToast(`${target.title} removed from registry`)
  }

  const resetDemo = () => {
    setStudents(SEED_STUDENTS)
    setSearchQuery('')
    setClassFilter('All')
    setStatusFilter('All')
    setSortBy('name')
    setSelectedId(SEED_STUDENTS[0]?.id ?? null)
    setToast('Demo student list restored')
  }

  return (
    <div className="sl-page">
      <section className="sl-hero">
        <div>
          <p className="admin-kicker">Student Management</p>
          <h2>Student List</h2>
          <p>
            Search the full roll, filter by class or status, open a profile panel, update enrollment state,
            and export the registry — all from one workspace.
          </p>
        </div>
        <div className="sl-hero-actions">
          <button type="button" className="sl-btn sl-btn-secondary" onClick={() => downloadCsv(filteredStudents)}>
            Export CSV
          </button>
          <button type="button" className="sl-btn sl-btn-secondary" onClick={resetDemo}>
            Reset demo
          </button>
          <button type="button" className="sl-btn sl-btn-primary" onClick={() => navigate('/students/add')}>
            New admission
          </button>
        </div>
      </section>

      <section className="sl-stats" aria-label="Registry summary">
        <article className="sl-stat">
          <strong>{stats.total}</strong>
          <span>Total students</span>
          <p>{stats.classes} classes represented</p>
        </article>
        <article className="sl-stat">
          <strong>{stats.active}</strong>
          <span>Active</span>
          <p>Currently enrolled</p>
        </article>
        <article className="sl-stat">
          <strong>{stats.onHold}</strong>
          <span>On hold</span>
          <p>Need follow-up</p>
        </article>
        <article className="sl-stat">
          <strong>{stats.alumni}</strong>
          <span>Alumni</span>
          <p>Archived records</p>
        </article>
      </section>

      <section className="sl-workspace">
        <article className="sl-panel">
          <div className="sl-panel-header">
            <div>
              <p className="admin-kicker">Registry</p>
              <h3>
                {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'} shown
              </h3>
            </div>
            <div className="sl-hero-actions">
              <Link className="sl-btn sl-btn-ghost sl-btn-sm" to="/students/data-files">
                Documents
              </Link>
              <Link className="sl-btn sl-btn-ghost sl-btn-sm" to="/attendance">
                Attendance
              </Link>
              <Link className="sl-btn sl-btn-ghost sl-btn-sm" to="/students/id-card">
                ID cards
              </Link>
            </div>
          </div>

          <div className="sl-toolbar">
            <label className="sl-search">
              <span aria-hidden>⌕</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, ID, class, guardian, phone..."
                aria-label="Search students"
              />
            </label>
            <select
              className="sl-select"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              aria-label="Filter by class"
            >
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  {option === 'All' ? 'All classes' : option}
                </option>
              ))}
            </select>
            <select
              className="sl-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'All' ? 'All statuses' : option}
                </option>
              ))}
            </select>
            <select
              className="sl-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort students"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="sl-empty">
              <strong>No students match these filters</strong>
              <p>Try clearing search or changing class / status filters.</p>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="sl-btn sl-btn-secondary"
                  onClick={() => {
                    setSearchQuery('')
                    setClassFilter('All')
                    setStatusFilter('All')
                  }}
                >
                  Clear filters
                </button>
                <button type="button" className="sl-btn sl-btn-primary" onClick={() => navigate('/students/add')}>
                  Add student
                </button>
              </div>
            </div>
          ) : (
            <div className="sl-table-wrap">
              <table className="sl-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Guardian</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className={selected?.id === student.id ? 'is-selected' : ''}
                      onClick={() => setSelectedId(student.id)}
                    >
                      <td>
                        <div className="sl-student-cell">
                          <div className="sl-avatar" aria-hidden>
                            {student.title.charAt(0)}
                          </div>
                          <div>
                            <h4>{student.title}</h4>
                            <p>
                              {student.id}
                              {student.rollNo ? ` · Roll ${student.rollNo}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="sl-muted">{student.subtitle}</td>
                      <td>
                        <span className={`sl-status ${student.tone || toneForStatus(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td>
                        <div className="sl-muted">{student.primary}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9aa6c2', marginTop: 4 }}>{student.owner}</div>
                      </td>
                      <td>
                        <div className="sl-row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="sl-btn sl-btn-secondary sl-btn-sm"
                            onClick={() => setSelectedId(student.id)}
                          >
                            Open
                          </button>
                          <Link
                            className="sl-btn sl-btn-ghost sl-btn-sm"
                            to="/fees/payments"
                            onClick={() => setToast(`Fee desk opened for ${student.title}`)}
                          >
                            Fees
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className="sl-panel sl-detail" aria-label="Student detail">
          {!selected ? (
            <div className="sl-detail-empty">
              <strong>Select a student</strong>
              <p>Pick a row to review profile details, update status, and jump to related modules.</p>
            </div>
          ) : (
            <>
              <div className="sl-detail-top">
                <div className="sl-detail-avatar" aria-hidden>
                  {selected.title.charAt(0)}
                </div>
                <div>
                  <h3>{selected.title}</h3>
                  <p>
                    {selected.id} · {selected.subtitle}
                  </p>
                  <div style={{ marginTop: 10 }}>
                    <span className={`sl-status ${selected.tone || toneForStatus(selected.status)}`}>
                      {selected.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sl-detail-body">
                <div>
                  <p className="sl-section-label">Profile</p>
                  <div className="sl-meta-grid">
                    <div className="sl-meta">
                      <span>Guardian</span>
                      <strong>{selected.primary}</strong>
                    </div>
                    <div className="sl-meta">
                      <span>Email</span>
                      <strong>{selected.owner || '—'}</strong>
                    </div>
                    <div className="sl-meta">
                      <span>Phone</span>
                      <strong>{selected.phone || '—'}</strong>
                    </div>
                    <div className="sl-meta">
                      <span>Roll no.</span>
                      <strong>{selected.rollNo || '—'}</strong>
                    </div>
                    <div className="sl-meta">
                      <span>Gender</span>
                      <strong>{selected.gender || '—'}</strong>
                    </div>
                    <div className="sl-meta">
                      <span>Admission</span>
                      <strong>{selected.admissionDate || '—'}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="sl-section-label">Update status</p>
                  <div className="sl-status-actions">
                    {['Active', 'On Hold', 'Alumni'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`sl-btn sl-btn-secondary sl-btn-sm ${selected.status === status ? 'is-active' : ''}`}
                        onClick={() => updateStatus(selected.id, status)}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="sl-section-label">Quick actions</p>
                  <div className="sl-quick-grid">
                    <Link className="sl-btn sl-btn-secondary sl-btn-sm" to="/students/data-files">
                      Documents
                    </Link>
                    <Link className="sl-btn sl-btn-secondary sl-btn-sm" to="/attendance">
                      Attendance
                    </Link>
                    <Link className="sl-btn sl-btn-secondary sl-btn-sm" to="/students/id-card">
                      ID card
                    </Link>
                    <Link className="sl-btn sl-btn-secondary sl-btn-sm" to="/examination/results">
                      Results
                    </Link>
                    <Link className="sl-btn sl-btn-secondary sl-btn-sm" to="/fees/payments">
                      Collect fee
                    </Link>
                    <Link className="sl-btn sl-btn-secondary sl-btn-sm" to="/communication/parent-notifications">
                      Notify parent
                    </Link>
                  </div>
                </div>

                <div className="sl-hero-actions" style={{ justifyContent: 'stretch' }}>
                  <button
                    type="button"
                    className="sl-btn sl-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setToast(`Opened workspace for ${selected.title}`)
                      navigate('/students/data-files')
                    }}
                  >
                    Open documents
                  </button>
                  <button type="button" className="sl-btn sl-btn-danger" onClick={() => removeStudent(selected.id)}>
                    Remove
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      {toast ? (
        <div className="sl-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  )
}

export default StudentsPage
