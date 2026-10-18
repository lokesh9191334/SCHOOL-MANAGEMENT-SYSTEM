import PublishedDocuments from '../../components/PublishedDocuments'
import { getAuthUser } from '../../utils/session'

const AcademicDocumentsPage = () => {
  const role = String(getAuthUser()?.role || '').toLowerCase()
  const canSeeEmailStatus = role === 'admin' || role === 'super_admin'

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Academics</p>
        <h2>Timetable &amp; datesheets</h2>
        <p>
          Every timetable and datesheet published by the school arrives here and by email as a PDF.
          Open the PDF right in your browser — you do not need to download it from the website.
        </p>
      </div>
      <article className="panel-card data-panel">
        <PublishedDocuments
          title="Published documents"
          description="The latest documents are shown first. New publications appear here as soon as the school publishes them."
          emptyHint="No timetable or datesheet has been published yet. They will appear here as soon as the school publishes one."
          showEmailStatus={canSeeEmailStatus}
        />
      </article>
    </div>
  )
}

export default AcademicDocumentsPage
