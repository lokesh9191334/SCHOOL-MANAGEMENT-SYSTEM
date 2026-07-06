import { Link } from 'react-router-dom'

const TeacherProfilePage = () => {
  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Profile</p>
        <h2>Teacher dossier</h2>
        <p>
          This placeholder route is ready for timetable assignments, payroll identifiers, and professional
          development credits. Select a teacher from the staff list first in a future iteration.
        </p>
        <div className="link-row">
          <Link className="link-pill" to="/teachers">
            Faculty list
          </Link>
          <Link className="link-pill" to="/settings/profile">
            Account settings
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TeacherProfilePage
