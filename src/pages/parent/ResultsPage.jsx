import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyResults } from '../../services/results'
import './ResultsPage.css'

function formatDate(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ResultsPage() {
  const [data, setData] = useState({ student: null, results: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchMyResults()
      .then((body) => {
        if (!active) return
        setData({
          student: body?.student || null,
          results: Array.isArray(body?.results) ? body.results : [],
        })
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Could not load your child’s results.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const student = data.student

  return (
    <div className="pr-page">
      <header className="pr-hero">
        <div>
          <p className="admin-kicker">Parent portal · Examination</p>
          <h2>Results</h2>
          <p>
            {student
              ? `${student.name} · ${student.className || 'Class not set'}${student.rollNo ? ` · Roll ${student.rollNo}` : ''}`
              : 'Every result the class teacher confirms appears here instantly, along with the total, percentage, grade and class rank.'}
          </p>
        </div>
        <div className="pr-hero-actions">
          <Link className="pr-btn ghost" to="/parent/academics">
            Timetable & datesheet
          </Link>
        </div>
      </header>

      {loading ? <p className="pr-empty">Loading results…</p> : null}
      {error ? <p className="pr-alert">{error}</p> : null}

      {!loading && !error && !data.results.length ? (
        <div className="pr-empty">
          <strong>No result published yet.</strong>
          <span>
            When the class teacher confirms a result for your child, it will show up here and the same report is emailed
            to your registered parent address.
          </span>
        </div>
      ) : null}

      {data.results.map((result) => (
        <article className="pr-card" key={result.id}>
          <div className="pr-card-head">
            <div>
              <p className="pr-kicker">{result.className || student?.className || 'Class result'}</p>
              <h3>{result.examTitle}</h3>
              <span>
                Published {formatDate(result.publishedAt)}
                {result.teacherName ? ` · Marked by ${result.teacherName}` : ''}
              </span>
            </div>
            <span className="pr-grade">{result.grade}</span>
          </div>

          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Out of</th>
                </tr>
              </thead>
              <tbody>
                {(result.subjects || []).map((subject) => (
                  <tr key={`${result.id}-${subject.name}`}>
                    <td>{subject.name}</td>
                    <td>{subject.scored}</td>
                    <td>{subject.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pr-chips">
            <div>
              <span>Total</span>
              <strong>
                {result.totalScored} / {result.totalMax}
              </strong>
            </div>
            <div>
              <span>Percentage</span>
              <strong>{result.percent}%</strong>
            </div>
            <div>
              <span>Grade</span>
              <strong>{result.grade}</strong>
            </div>
            <div>
              <span>Class rank</span>
              <strong>{result.rank ? `#${result.rank}` : '—'}</strong>
            </div>
          </div>
        </article>
      ))}

      {!loading && data.results.length ? (
        <p className="pr-footnote">
          Results are calculated and published by the class teacher. For any correction in marks, contact the school
          office.
        </p>
      ) : null}
    </div>
  )
}
