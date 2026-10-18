import { useState } from 'react'
import { Link } from 'react-router-dom'
import SmartTimetable from '../../components/SmartTimetable'
import PublishedDocuments from '../../components/PublishedDocuments'

const TimetablePage = () => {
  const [publishedToken, setPublishedToken] = useState(0)

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Academics</p>
        <h2>Institutional timetable</h2>
        <p>Build each class section's weekly timetable — periods, subjects, teachers and rooms — and save it to the system.</p>
        <div className="link-row">
          <Link className="link-pill" to="/attendance">
            Attendance
          </Link>
          <Link className="link-pill" to="/academics/datesheet">
            Exam datesheet
          </Link>
          <Link className="link-pill" to="/academics/documents">
            Published documents
          </Link>
        </div>
      </div>
      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Timetable</p>
            <h3>Weekly structure</h3>
          </div>
        </div>
        <SmartTimetable onPublished={() => setPublishedToken((token) => token + 1)} />
      </article>
      <article className="panel-card data-panel">
        <PublishedDocuments
          type="timetable"
          title="Published timetables"
          description="Saving a timetable publishes it to the parent portal and emails the PDF to every parent and super admin."
          emptyHint="No timetable has been published yet. Save a timetable above to deliver it to parents."
          showEmailStatus
          reloadToken={publishedToken}
        />
      </article>
    </div>
  )
}

export default TimetablePage
