import { Link } from 'react-router-dom'
import SmartTimetable from '../../components/SmartTimetable'

const TimetablePage = () => {
  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Academics</p>
        <h2>Institutional timetable</h2>
        <p>Visual grid for room allocation, clashes and substitution planning. Works alongside attendance and exams.</p>
        <div className="link-row">
          <Link className="link-pill" to="/attendance">
            Attendance
          </Link>
          <Link className="link-pill" to="/teachers">
            Staffing
          </Link>
        </div>
      </div>
      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Live board</p>
            <h3>Weekly structure</h3>
          </div>
        </div>
        <SmartTimetable />
      </article>
    </div>
  )
}

export default TimetablePage
