import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import './ExamMarksStudio.css'

const GRADE_BANDS = [
  { grade: 'A+', min: 90 },
  { grade: 'A', min: 80 },
  { grade: 'B+', min: 70 },
  { grade: 'B', min: 60 },
  { grade: 'C', min: 50 },
  { grade: 'D', min: 35 },
  { grade: 'F', min: 0 },
]

function gradeFromPercent(percent) {
  const band = GRADE_BANDS.find((g) => percent >= g.min)
  return band?.grade || 'F'
}

const SEED_ROWS = [
  { id: '1', name: 'Aanya Sharma', math: 38, science: 36, english: 34, sst: 32 },
  { id: '2', name: 'Kabir Khan', math: 34, science: 33, english: 31, sst: 30 },
  { id: '3', name: 'Diya Patel', math: 28, science: 30, english: 35, sst: 29 },
  { id: '4', name: 'Arjun Mehta', math: 40, science: 39, english: 37, sst: 36 },
  { id: '5', name: 'Sara Ali', math: 22, science: 25, english: 28, sst: 24 },
]

const SUBJECTS = [
  { key: 'math', label: 'Mathematics', max: 40 },
  { key: 'science', label: 'Science', max: 40 },
  { key: 'english', label: 'English', max: 40 },
  { key: 'sst', label: 'S.St', max: 40 },
]

export default function ExamMarksStudio() {
  const [rows, setRows] = usePersistentState('sms_teacher_marks_studio', SEED_ROWS)
  const [examTitle, setExamTitle] = useState('Unit Test II — Class 9-B')

  const computed = useMemo(() => {
    const maxTotal = SUBJECTS.reduce((sum, s) => sum + s.max, 0)
    const withTotals = rows.map((row) => {
      const total = SUBJECTS.reduce((sum, s) => sum + (Number(row[s.key]) || 0), 0)
      const percent = maxTotal ? Math.round((total / maxTotal) * 1000) / 10 : 0
      return {
        ...row,
        total,
        percent,
        grade: gradeFromPercent(percent),
      }
    })
    const ranked = [...withTotals].sort((a, b) => b.total - a.total)
    return ranked.map((row, index) => ({ ...row, rank: index + 1 }))
  }, [rows])

  const updateMark = (id, subjectKey, value) => {
    const subject = SUBJECTS.find((s) => s.key === subjectKey)
    const max = subject?.max ?? 100
    let next = Number(value)
    if (Number.isNaN(next)) next = 0
    next = Math.max(0, Math.min(max, next))
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [subjectKey]: next } : row)))
  }

  const classAverage = computed.length
    ? Math.round((computed.reduce((s, r) => s + r.percent, 0) / computed.length) * 10) / 10
    : 0

  return (
    <div className="ems-page">
      <header className="ems-hero">
        <div>
          <p className="admin-kicker">Examination · Auto calculate</p>
          <h2>Marks studio</h2>
          <p>
            Enter subject marks — totals, percentage, grades and class ranks calculate automatically for premium result
            packs.
          </p>
        </div>
        <div className="ems-hero-actions">
          <Link className="ems-btn ghost" to="/teacher/exams/report-cards">
            Open report cards
          </Link>
          <Link className="ems-btn primary" to="/teacher/exams/ranking">
            Ranking board
          </Link>
        </div>
      </header>

      <section className="ems-toolbar">
        <label>
          <span>Exam title</span>
          <input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} />
        </label>
        <div className="ems-stats">
          <article>
            <strong>{computed.length}</strong>
            <span>Students</span>
          </article>
          <article>
            <strong>{classAverage}%</strong>
            <span>Class average</span>
          </article>
          <article>
            <strong>{computed[0]?.name?.split(' ')[0] || '—'}</strong>
            <span>Top rank</span>
          </article>
        </div>
      </section>

      <div className="ems-table-wrap">
        <table className="ems-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Student</th>
              {SUBJECTS.map((s) => (
                <th key={s.key}>
                  {s.label}
                  <small> / {s.max}</small>
                </th>
              ))}
              <th>Total</th>
              <th>%</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {computed.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="ems-rank">#{row.rank}</span>
                </td>
                <td className="ems-name">{row.name}</td>
                {SUBJECTS.map((s) => (
                  <td key={s.key}>
                    <input
                      className="ems-mark"
                      type="number"
                      min={0}
                      max={s.max}
                      value={row[s.key]}
                      onChange={(e) => updateMark(row.id, s.key, e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <strong>{row.total}</strong>
                </td>
                <td>{row.percent}%</td>
                <td>
                  <span className={`ems-grade grade-${row.grade.replace('+', 'p')}`}>{row.grade}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="ems-footnote">
        Grade bands: A+ ≥90 · A ≥80 · B+ ≥70 · B ≥60 · C ≥50 · D ≥35 · F below 35. Max per subject is auto-capped.
      </p>
    </div>
  )
}
