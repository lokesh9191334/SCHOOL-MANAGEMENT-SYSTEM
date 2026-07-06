import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS } from '../../data/seed'

const StudentProfilePage = () => {
  const [students] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const first = students[0]

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">360° view</p>
        <h2>Student profile</h2>
        <p>Snapshot of the first enrolled learner for demo purposes. Extend this route with dynamic IDs from the registry.</p>
        <div className="link-row">
          <Link className="link-pill" to="/students">
            Registry
          </Link>
          <Link className="link-pill" to="/students/data-files">
            Files
          </Link>
        </div>
      </div>
      {first ? (
        <article className="panel-card data-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Active learner</p>
              <h3>{first.title}</h3>
            </div>
            <span className={`status-pill ${first.tone === 'success' ? 'success' : 'warning'}`}>{first.status}</span>
          </div>
          <div className="module-form-grid">
            <div className="form-field">
              <span>Class</span>
              <p style={{ margin: 0, fontWeight: 700, color: '#111b33' }}>{first.subtitle}</p>
            </div>
            <div className="form-field">
              <span>Guardian</span>
              <p style={{ margin: 0, fontWeight: 700, color: '#111b33' }}>{first.primary}</p>
            </div>
            <div className="form-field">
              <span>Contact</span>
              <p style={{ margin: 0, fontWeight: 700, color: '#111b33' }}>{first.owner}</p>
            </div>
          </div>
        </article>
      ) : (
        <p className="empty-state">No students yet — add one from the registry.</p>
      )}
    </div>
  )
}

export default StudentProfilePage
