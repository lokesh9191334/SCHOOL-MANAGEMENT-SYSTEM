import { useState } from 'react'
import { Link } from 'react-router-dom'
import './PremiumReportCard.css'

const SAMPLE = {
  school: 'Elite Scholar Academy',
  exam: 'Unit Test II · 2026–27',
  student: 'Aanya Sharma',
  className: '9-B',
  roll: '14',
  subjects: [
    { name: 'Mathematics', max: 40, scored: 38 },
    { name: 'Science', max: 40, scored: 36 },
    { name: 'English', max: 40, scored: 34 },
    { name: 'Social Studies', max: 40, scored: 32 },
  ],
  remarks: 'Outstanding conceptual clarity and consistent classroom participation.',
  teacher: 'Dr. Meera Iyer',
  principal: 'Dr. A. Rao',
}

function buildCard(data) {
  const totalMax = data.subjects.reduce((s, x) => s + x.max, 0)
  const totalScored = data.subjects.reduce((s, x) => s + x.scored, 0)
  const percent = Math.round((totalScored / totalMax) * 1000) / 10
  const grade = percent >= 90 ? 'A+' : percent >= 80 ? 'A' : percent >= 70 ? 'B+' : 'B'
  return { ...data, totalMax, totalScored, percent, grade }
}

export default function PremiumReportCard() {
  const [card] = useState(() => buildCard(SAMPLE))

  const printCard = () => window.print()

  return (
    <div className="prc-page">
      <header className="prc-toolbar no-print">
        <div>
          <p className="admin-kicker">Teacher · Report cards</p>
          <h2>Premium student report card</h2>
          <p>Professional print layout for parent packs and school records.</p>
        </div>
        <div className="prc-actions">
          <Link className="prc-btn ghost" to="/teacher/exams/marks">
            Back to marks studio
          </Link>
          <button type="button" className="prc-btn primary" onClick={printCard}>
            Print report card
          </button>
        </div>
      </header>

      <article className="prc-card" id="report-card-print">
        <div className="prc-card__top">
          <div>
            <p className="prc-school">{card.school}</p>
            <h3>Academic Report Card</h3>
            <p className="prc-exam">{card.exam}</p>
          </div>
          <div className="prc-badge">{card.grade}</div>
        </div>

        <div className="prc-meta">
          <div>
            <span>Student</span>
            <strong>{card.student}</strong>
          </div>
          <div>
            <span>Class</span>
            <strong>{card.className}</strong>
          </div>
          <div>
            <span>Roll no.</span>
            <strong>{card.roll}</strong>
          </div>
          <div>
            <span>Overall</span>
            <strong>
              {card.percent}% · {card.totalScored}/{card.totalMax}
            </strong>
          </div>
        </div>

        <table className="prc-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Max</th>
              <th>Scored</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {card.subjects.map((subject) => {
              const pct = Math.round((subject.scored / subject.max) * 1000) / 10
              return (
                <tr key={subject.name}>
                  <td>{subject.name}</td>
                  <td>{subject.max}</td>
                  <td>{subject.scored}</td>
                  <td>{pct}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="prc-remarks">
          <span>Class teacher remarks</span>
          <p>{card.remarks}</p>
        </div>

        <div className="prc-signs">
          <div>
            <strong>{card.teacher}</strong>
            <span>Class Teacher</span>
          </div>
          <div>
            <strong>{card.principal}</strong>
            <span>Principal</span>
          </div>
          <div>
            <strong>Parent / Guardian</strong>
            <span>Signature</span>
          </div>
        </div>
      </article>
    </div>
  )
}
