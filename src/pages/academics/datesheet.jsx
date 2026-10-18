import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublishedDocuments from '../../components/PublishedDocuments'
import { publishDatesheet, publishResultMessage } from '../../services/academicDocuments'
import './datesheet.css'

let paperCounter = 0

function blankPaper() {
  paperCounter += 1
  return { key: `paper-${Date.now()}-${paperCounter}`, date: '', subject: '', time: '', room: '' }
}

const DatesheetPage = () => {
  const [examName, setExamName] = useState('')
  const [className, setClassName] = useState('')
  const [papers, setPapers] = useState(() => [blankPaper()])
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [listToken, setListToken] = useState(0)

  const updatePaper = (key, field, value) => {
    setPapers((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)))
  }

  const addPaper = () => {
    setPapers((rows) => [...rows, blankPaper()])
  }

  const removePaper = (key) => {
    setPapers((rows) => (rows.length > 1 ? rows.filter((row) => row.key !== key) : rows))
  }

  const submit = async (event) => {
    event.preventDefault()
    const cleanExam = examName.trim()
    const cleanClass = className.trim()
    if (!cleanExam) {
      setError('Enter the examination name.')
      return
    }
    if (!cleanClass) {
      setError('Enter the class or grade this datesheet is for.')
      return
    }
    const incomplete = papers.findIndex((row) => !row.date || !row.subject.trim())
    if (incomplete >= 0) {
      setError(`Paper ${incomplete + 1} needs a date and a subject.`)
      return
    }

    setPublishing(true)
    setError('')
    setMessage('')
    try {
      const rows = [...papers]
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((row) => ({
          date: row.date,
          subject: row.subject.trim(),
          time: row.time.trim(),
          room: row.room.trim(),
        }))
      const body = await publishDatesheet({ examName: cleanExam, className: cleanClass, rows })
      setMessage(publishResultMessage(body, 'Datesheet'))
      setPapers([blankPaper()])
      setListToken((token) => token + 1)
    } catch (publishError) {
      setError(publishError?.message || 'The datesheet could not be published.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="sms-page-stack datesheet-page">
      <div className="page-card">
        <p className="admin-kicker">Academics</p>
        <h2>Exam datesheet</h2>
        <p>
          Build the datesheet once and publish it. Every parent and super admin gets it in their
          portal, and the same PDF is emailed to all parent addresses on record.
        </p>
        <div className="link-row">
          <Link className="link-pill" to="/academics/timetable">
            Timetable
          </Link>
          <Link className="link-pill" to="/academics/documents">
            Published documents
          </Link>
        </div>
      </div>

      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Datesheet builder</p>
            <h3>Exam schedule</h3>
          </div>
          <span className="ds-count">{papers.length} paper{papers.length === 1 ? '' : 's'}</span>
        </div>

        <form className="ds-form" onSubmit={submit}>
          <div className="ds-meta">
            <label className="form-field">
              Examination name
              <input
                type="text"
                value={examName}
                onChange={(event) => setExamName(event.target.value)}
                placeholder="e.g. Half Yearly Examination 2026"
                maxLength={120}
              />
            </label>
            <label className="form-field">
              Class / grade
              <input
                type="text"
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                placeholder="e.g. Class 8 - A"
                maxLength={80}
              />
            </label>
          </div>

          <div className="ds-papers-wrap">
            <div className="ds-papers">
              <div className="ds-paper ds-paper--head">
                <span>#</span>
                <span>Date</span>
                <span>Subject</span>
                <span>Time</span>
                <span>Room</span>
                <span />
              </div>
              {papers.map((paper, index) => (
                <div className="ds-paper" key={paper.key}>
                  <span className="ds-paper__index">{index + 1}</span>
                  <input
                    type="date"
                    value={paper.date}
                    onChange={(event) => updatePaper(paper.key, 'date', event.target.value)}
                    aria-label={`Paper ${index + 1} date`}
                  />
                  <input
                    type="text"
                    value={paper.subject}
                    onChange={(event) => updatePaper(paper.key, 'subject', event.target.value)}
                    placeholder="Subject"
                    maxLength={120}
                    aria-label={`Paper ${index + 1} subject`}
                  />
                  <input
                    type="text"
                    value={paper.time}
                    onChange={(event) => updatePaper(paper.key, 'time', event.target.value)}
                    placeholder="9:00 - 12:00"
                    maxLength={60}
                    aria-label={`Paper ${index + 1} time`}
                  />
                  <input
                    type="text"
                    value={paper.room}
                    onChange={(event) => updatePaper(paper.key, 'room', event.target.value)}
                    placeholder="Room"
                    maxLength={60}
                    aria-label={`Paper ${index + 1} room`}
                  />
                  <button
                    type="button"
                    className="ds-remove"
                    onClick={() => removePaper(paper.key)}
                    disabled={papers.length === 1}
                    aria-label={`Remove paper ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="button" className="ds-add" onClick={addPaper}>
            + Add paper
          </button>

          {error ? <p className="ds-alert ds-alert--error">{error}</p> : null}
          {message ? <p className="ds-alert ds-alert--success">{message}</p> : null}

          <div className="ds-actions">
            <button type="submit" className="ds-publish" disabled={publishing}>
              {publishing ? 'Publishing…' : 'Publish & email PDF'}
            </button>
            <p className="ds-note">
              Publishing saves the datesheet for every parent and super admin and emails the PDF to
              all parent addresses on record.
            </p>
          </div>
        </form>
      </article>

      <article className="panel-card data-panel">
        <PublishedDocuments
          type="datesheet"
          title="Published datesheets"
          description="Every datesheet that has been delivered to parents, with the PDF ready to open or download."
          emptyHint="No datesheet has been published yet. Publish one above to deliver it to parents."
          showEmailStatus
          reloadToken={listToken}
        />
      </article>
    </div>
  )
}

export default DatesheetPage
