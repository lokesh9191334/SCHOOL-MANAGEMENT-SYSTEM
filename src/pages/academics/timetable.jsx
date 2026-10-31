import { useState } from 'react'
import { Link } from 'react-router-dom'
import ClassSchedule from '../../components/ClassSchedule'
import PublishedDocuments from '../../components/PublishedDocuments'

const TimetablePage = () => {
  const [publishedToken, setPublishedToken] = useState(0)

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Academics</p>
        <h2>Class schedule</h2>
        <p>
          Build the bell schedule once, then give every class its weekly periods with the real teacher and room. When a
          teacher&apos;s leave is approved, cover is planned automatically from the same standard ±2 and the substitute is
          emailed.
        </p>
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
      <ClassSchedule onPublished={() => setPublishedToken((token) => token + 1)} />
      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Timetable</p>
            <h3>Published timetables</h3>
          </div>
        </div>
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
