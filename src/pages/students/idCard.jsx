import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS } from '../../data/seed'
import './IDCardPage.css'

const IDCardPage = () => {
  const [students] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState('')

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return students

    return students.filter((student) => {
      const name = student.title?.toLowerCase() || ''
      const className = student.subtitle?.toLowerCase() || ''
      const id = student.id?.toLowerCase() || ''
      const guardian = student.primary?.toLowerCase() || ''
      return (
        name.includes(query) ||
        className.includes(query) ||
        id.includes(query) ||
        guardian.includes(query)
      )
    })
  }, [students, searchTerm])

  useEffect(() => {
    if (!selectedId && filteredStudents.length > 0) {
      setSelectedId(filteredStudents[0].id)
    }
  }, [filteredStudents, selectedId])

  useEffect(() => {
    if (selectedId && !filteredStudents.some((student) => student.id === selectedId)) {
      setSelectedId(filteredStudents[0]?.id || '')
    }
  }, [filteredStudents, selectedId])

  const selectedStudent = students.find((student) => student.id === selectedId) || filteredStudents[0] || null

  const formattedDate = (value) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const handleDownloadPdf = () => {
    const s = selectedStudent
    if (!s) return
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>ID Card - ${s.id}</title><style>
      @page{size:A4 portrait; margin:0}
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;margin:0;padding:0;display:flex;align-items:center;justify-content:center;height:297mm;background:white}
      .card{width:170mm;height:100mm;box-sizing:border-box;padding:12mm;border:2px solid #1f3c88;border-radius:8px;background:#fff}
      .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:1px solid #eee}
      .brand{font-weight:900;letter-spacing:0.22em;text-transform:uppercase;color:#4157ff;font-size:14px}
      .title{font-size:18px;font-weight:800;margin:6px 0}
      .body{display:flex;gap:18px;margin-top:10px}
      .photo{width:120px;height:140px;border-radius:8px;overflow:hidden;border:1px solid #ddd}
      .label{font-size:9px;color:#6d7996;font-weight:700;text-transform:uppercase}
      .value{font-size:13px;font-weight:800;color:#111b33;margin-bottom:8px}
      .footer{display:flex;justify-content:space-between;margin-top:12px;border-top:1px solid #eee;padding-top:8px;font-size:12px}
    </style></head><body>
      <div class="card">
        <div class="header"><div><div class="brand">Elite Scholar Academy</div><div class="title">Student Identification</div></div><div class="status">${s.status||'Active'}</div></div>
        <div class="body">
          <div style="flex:1">
            <div style="margin-bottom:8px"><div class="label">Name</div><div class="value">${s.title || ''}</div></div>
            <div style="margin-bottom:8px"><div class="label">Class</div><div class="value">${s.subtitle || ''}</div></div>
            <div style="margin-bottom:8px"><div class="label">Student ID</div><div class="value">${s.id || ''}</div></div>
            <div style="margin-bottom:8px"><div class="label">Guardian</div><div class="value">${s.primary || ''}</div></div>
            <div style="margin-bottom:8px"><div class="label">Mobile</div><div class="value">${s.phone || s.owner || 'N/A'}</div></div>
            <div style="margin-bottom:8px"><div class="label">Address</div><div class="value">${s.currentAddress || s.permanentAddress || 'N/A'}</div></div>
          </div>
          <div class="photo">
            ${s.studentPhotoUrl ? `<img src="${s.studentPhotoUrl}" style="width:100%;height:100%;object-fit:cover"/>` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#6b7a9d">Photo not available</div>`}
          </div>
        </div>
        <div class="footer"><div>Issued ${formattedDate(new Date())}</div><div>Signature: Principal</div></div>
      </div>
    </body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div className="id-card-page">
      <section className="page-card id-card-page__hero">
        <div>
          <p className="admin-kicker">Student Management</p>
          <h2>Student ID Cards</h2>
          <p className="id-card-page__hero-copy">
            Generate and preview professional student ID cards from current school records.
            Select a student from the registry and print a polished card with registration details.
          </p>
        </div>

        <div className="link-row id-card-page__hero-links">
          <Link className="link-pill" to="/students/add">
            Add new student
          </Link>
          <Link className="link-pill" to="/students">
            View registry
          </Link>
        </div>
      </section>

      <div className="id-card-page__content">
        <aside className="panel-card id-card-page__list-panel">
          <div className="panel-header id-card-page__list-header">
            <div>
              <p className="panel-kicker">Active Students</p>
              <h3>Choose a record</h3>
            </div>
            <div className="id-card-page__search-wrap">
              <input
                className="search-input"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, class, guardian, or ID"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="empty-state id-card-page__empty">
              <p>No matching students found.</p>
              <Link className="btn-primary" to="/students/add">
                Add a student
              </Link>
            </div>
          ) : (
            <div className="id-card-page__table-wrap">
              <table className="data-table id-card-page__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Class</th>
                    <th>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className={selectedId === student.id ? 'selected' : ''}
                      onClick={() => setSelectedId(student.id)}
                    >
                      <td>
                        <div className="record-title">{student.title}</div>
                        <div className="record-subtitle">{student.primary}</div>
                      </td>
                      <td>{student.subtitle}</td>
                      <td>{student.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </aside>

        <article className="panel-card id-card-page__preview-panel">
          <div className="panel-header id-card-page__preview-header">
            <div>
              <p className="panel-kicker">ID Card Preview</p>
              <h3>{selectedStudent ? 'Preview ready' : 'No student selected'}</h3>
            </div>
            <div>
              <button
                type="button"
                className="btn-secondary"
                disabled={!selectedStudent}
                onClick={handleDownloadPdf}
              >
                Print ID Card
              </button>
            </div>
          </div>

          {selectedStudent ? (
            <div className="student-id-preview">
              <div className="student-id-preview__header">
                <div>
                  <p className="student-id-preview__brand">Elite Scholar Academy</p>
                  <p className="student-id-preview__title">Student Identification</p>
                </div>
                <div className="student-id-preview__status">
                  <span>Active</span>
                </div>
              </div>

              <div className="student-id-preview__body">
                <div className="student-id-preview__photo">
                  {selectedStudent.studentPhotoUrl ? (
                    <img src={selectedStudent.studentPhotoUrl} alt={selectedStudent.title} />
                  ) : (
                    <div className="student-id-preview__photo-fallback">
                      {selectedStudent.title?.charAt(0).toUpperCase() ?? 'S'}
                    </div>
                  )}
                </div>

                <div className="student-id-preview__details">
                  <div className="student-id-preview__row">
                    <span className="label">Name</span>
                    <strong>{selectedStudent.title}</strong>
                  </div>
                  <div className="student-id-preview__row">
                    <span className="label">Class</span>
                    <strong>{selectedStudent.subtitle}</strong>
                  </div>
                  <div className="student-id-preview__row">
                    <span className="label">Student ID</span>
                    <strong>{selectedStudent.id}</strong>
                  </div>
                  <div className="student-id-preview__row">
                    <span className="label">Guardian</span>
                    <strong>{selectedStudent.primary}</strong>
                  </div>
                  <div className="student-id-preview__row">
                    <span className="label">Mobile</span>
                    <strong>{selectedStudent.phone || 'N/A'}</strong>
                  </div>
                  <div className="student-id-preview__row">
                    <span className="label">Address</span>
                    <strong>{selectedStudent.currentAddress || selectedStudent.permanentAddress || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <div className="student-id-preview__footer">
                <div>
                  <span className="label">Issued</span>
                  <strong>{formattedDate(new Date())}</strong>
                </div>
                <div>
                  <span className="label">Signature</span>
                  <div className="student-id-preview__signature">Principal</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state id-card-page__preview-empty">
              <p>Select a student from the left to generate an ID card preview.</p>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}

export default IDCardPage
