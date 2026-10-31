import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchClassResults } from '../../services/results'
import { fetchStudents } from '../../services/students'
import { getApiAuthHeaders } from '../../services/apiAuth'
import { gradeFromPercent, RESULT_GRADE_BANDS } from '../../../resultsStore.js'
import { readSchoolIdentity, schoolForCard, writeSchoolIdentity } from '../../utils/schoolIdentity'
import './PremiumReportCard.css'

const DASH = '—'

function text(value) {
  return String(value ?? '').trim()
}

function show(value) {
  const next = text(value)
  return next || DASH
}

function formatDate(iso) {
  if (!iso) return DASH
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return DASH
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function percentOf(scored, max) {
  const total = Number(max)
  if (!Number.isFinite(total) || total <= 0) return 0
  return Math.round((Number(scored) / total) * 1000) / 10
}

function bandRangeLabel(index) {
  const band = RESULT_GRADE_BANDS[index]
  const higher = RESULT_GRADE_BANDS[index - 1]
  if (!higher) return `${band.grade} ${band.min}% and above`
  return `${band.grade} ${band.min}–${(higher.min - 0.1).toFixed(1)}%`
}

function guardianPhoneOf(student) {
  return (
    text(student?.guardianPhone) ||
    text(student?.fatherPhone) ||
    text(student?.motherPhone) ||
    text(student?.phone) ||
    ''
  )
}

function teacherPhoneOf(teachers, teacherName) {
  const needle = text(teacherName).toLowerCase()
  if (!needle) return ''
  const match = (teachers || []).find((entry) => {
    const name = text(entry?.title || entry?.name).toLowerCase()
    const email = text(entry?.email).toLowerCase()
    return name === needle || (email && email === needle)
  })
  return text(match?.phone)
}

function ReportCardSheet({ result, student, school, teacherPhone, remarks }) {
  const subjects = Array.isArray(result.subjects) ? result.subjects : []
  const totalScored = Number(result.totalScored) || 0
  const totalMax = Number(result.totalMax) || 0
  const percent = percentOf(totalScored, totalMax)
  const grade = gradeFromPercent(percent)
  const schoolLine = [school.phone, school.email, school.website].filter(Boolean).join(' · ')
  const teacherName = text(result.teacherName) || DASH
  const crestSrc = school.logoData || '/brand/sms-mark.svg'

  return (
    <article className="rc-sheet">
      <header className="rc-head">
        <img className="rc-crest" src={crestSrc} alt="" />
        <div className="rc-head__school">
          <h2>{school.name || 'School name not set'}</h2>
          <p>{school.address || 'Add the school address in Settings'}</p>
          <p className="rc-head__contact">{schoolLine || DASH}</p>
        </div>
        <div className="rc-head__grade">
          <span>Grade</span>
          <strong>{grade}</strong>
        </div>
      </header>

      <div className="rc-title">
        <span className="rc-title__kicker">Academic Report Card</span>
        <p className="rc-title__exam">{show(result.examTitle)}</p>
        <p className="rc-title__meta">
          {show(result.className)} · Published {formatDate(result.publishedAt)}
        </p>
      </div>

      <dl className="rc-meta">
        <div>
          <dt>Student</dt>
          <dd>{show(result.studentName)}</dd>
        </div>
        <div>
          <dt>Father's name</dt>
          <dd>{show(student?.fatherName)}</dd>
        </div>
        <div>
          <dt>Mother's name</dt>
          <dd>{show(student?.motherName)}</dd>
        </div>
        <div>
          <dt>Guardian phone</dt>
          <dd>{show(guardianPhoneOf(student))}</dd>
        </div>
        <div>
          <dt>Class / section</dt>
          <dd>{show(result.className)}</dd>
        </div>
        <div>
          <dt>Roll no.</dt>
          <dd>{show(result.rollNo)}</dd>
        </div>
        <div>
          <dt>Admission no.</dt>
          <dd>{show(student?.applicationId)}</dd>
        </div>
        <div>
          <dt>Class rank</dt>
          <dd>{result.rank ? `#${result.rank}` : DASH}</dd>
        </div>
      </dl>

      <table className="rc-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Max marks</th>
            <th>Marks obtained</th>
            <th>Percentage</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => {
            const pct = percentOf(subject.scored, subject.max)
            return (
              <tr key={subject.name}>
                <td>{subject.name}</td>
                <td>{subject.max}</td>
                <td>{subject.scored}</td>
                <td>{pct}%</td>
                <td>
                  <b className={`rc-grade rc-grade--${gradeFromPercent(pct).replace('+', 'p')}`}>
                    {gradeFromPercent(pct)}
                  </b>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td>{totalMax}</td>
            <td>{totalScored}</td>
            <td>{percent}%</td>
            <td>
              <b className={`rc-grade rc-grade--${grade.replace('+', 'p')}`}>{grade}</b>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="rc-summary">
        <div>
          <span>Total scored</span>
          <strong>
            {totalScored}
            <em> / {totalMax}</em>
          </strong>
        </div>
        <div>
          <span>Percentage</span>
          <strong>{percent}%</strong>
        </div>
        <div>
          <span>Grade</span>
          <strong>{grade}</strong>
        </div>
        <div>
          <span>Class rank</span>
          <strong>{result.rank ? `#${result.rank}` : DASH}</strong>
        </div>
      </div>

      <section className="rc-remarks">
        <span>Class teacher's remarks</span>
        {text(remarks) ? (
          <p>{remarks}</p>
        ) : (
          <div className="rc-remarks__blank" aria-label="Write remarks by hand" />
        )}
      </section>

      <footer className="rc-foot">
        <div className="rc-legend">
          <span>Grading scale</span>
          {RESULT_GRADE_BANDS.map((band, index) => (
            <em key={band.grade}>
              <b>{band.grade}</b> {bandRangeLabel(index)}
            </em>
          ))}
        </div>

        <div className="rc-signs">
          <div>
            <strong>{teacherName}</strong>
            <span>Class teacher{teacherPhone ? ` · ${teacherPhone}` : ''}</span>
          </div>
          <div>
            <strong>{show(school.principalName)}</strong>
            <span>Principal</span>
          </div>
          <div>
            <strong aria-hidden>&nbsp;</strong>
            <span>Parent / guardian</span>
          </div>
        </div>

        <p className="rc-foot__contact">
          {[school.name, school.phone, school.email].filter(Boolean).join(' · ') || DASH}
        </p>
        <p className="rc-foot__note">
          Computer generated on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ·
          Percentage is total marks obtained ÷ total maximum marks. Contact the class teacher for any correction.
        </p>
      </footer>
    </article>
  )
}

export default function PremiumReportCard() {
  const [classes, setClasses] = useState([])
  const [className, setClassName] = useState('')
  const [classStudents, setClassStudents] = useState([])
  const [exams, setExams] = useState([])
  const [examTitle, setExamTitle] = useState('')
  const [results, setResults] = useState([])
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [school, setSchool] = useState(() => schoolForCard(readSchoolIdentity()))
  const [selectedStudent, setSelectedStudent] = useState('all')
  const [remarks, setRemarks] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const examLoading = pending !== ''

  useEffect(() => {
    let active = true
    Promise.all([
      fetchClassResults(),
      fetchStudents().catch(() => []),
      fetch('/api/teachers', { headers: getApiAuthHeaders() })
        .then((response) => (response.ok ? response.json() : []))
        .catch(() => []),
      fetch('/api/school-profile', { headers: getApiAuthHeaders() })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null),
    ])
      .then(([meta, studentList, teacherList, profile]) => {
        if (!active) return
        setClasses(Array.isArray(meta?.classes) ? meta.classes : [])
        setStudents(Array.isArray(studentList) ? studentList : [])
        setTeachers(Array.isArray(teacherList) ? teacherList : [])
        if (profile?.name) {
          const cached = writeSchoolIdentity(profile)
          setSchool(schoolForCard(cached))
        }
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || 'Could not load classes.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!className) return undefined
    let active = true
    fetchClassResults({ className })
      .then((body) => {
        if (!active) return
        const nextExams = Array.isArray(body?.exams) ? body.exams : []
        setClassStudents(Array.isArray(body?.students) ? body.students : [])
        setExams(nextExams)
        setResults([])
        setSelectedStudent('all')
        setPending(nextExams.length ? 'results' : '')
        setExamTitle((current) => {
          if (current && nextExams.some((exam) => exam.examTitle === current)) return current
          return nextExams[0]?.examTitle || ''
        })
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || 'Could not load this class.')
        setPending('')
      })
    return () => {
      active = false
    }
  }, [className])

  useEffect(() => {
    if (!className || !examTitle) return undefined
    let active = true
    fetchClassResults({ className, examTitle })
      .then((body) => {
        if (!active) return
        setResults(Array.isArray(body?.results) ? body.results : [])
        setPending('')
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || 'Could not load this result.')
        setPending('')
      })
    return () => {
      active = false
    }
  }, [className, examTitle])

  const studentById = useMemo(() => {
    const map = new Map()
    for (const student of students) {
      if (student?.id !== undefined) map.set(String(student.id), student)
      if (student?.applicationId) map.set(String(student.applicationId), student)
    }
    return map
  }, [students])

  const cards = useMemo(() => {
    if (!examTitle) return []
    return results
      .filter((result) => selectedStudent === 'all' || String(result.studentId) === selectedStudent)
      .map((result) => ({
        result,
        student: studentById.get(String(result.studentId)) || null,
        teacherPhone: teacherPhoneOf(teachers, result.teacherName),
      }))
  }, [results, examTitle, selectedStudent, studentById, teachers])

  const printCards = () => {
    if (!cards.length) return
    window.print()
  }

  const selectedExam = exams.find((exam) => exam.examTitle === examTitle)

  return (
    <div className="rc-page">
      <header className="rc-toolbar no-print">
        <div>
          <p className="admin-kicker">Teacher · Report cards</p>
          <h2>Student report cards</h2>
          <p>Published result se A4 report card — ek student ya poori class print karein.</p>
        </div>
        <div className="rc-actions">
          <Link className="rc-btn ghost" to="/teacher/exams/marks">
            Marks studio
          </Link>
          <button type="button" className="rc-btn primary" onClick={printCards} disabled={!cards.length}>
            {selectedStudent === 'all' && cards.length > 1
              ? `Print all ${cards.length} cards`
              : 'Print report card'}
          </button>
        </div>
      </header>

      <section className="rc-controls no-print">
        <label className="rc-field">
          <span>Class</span>
          <select
            value={className}
            onChange={(event) => {
              setError('')
              setPending(event.target.value ? 'class' : '')
              setClassName(event.target.value)
            }}
          >
            <option value="">Choose a class</option>
            {classes.map((entry) => (
              <option key={entry.key} value={entry.name}>
                {entry.name} · {entry.studentCount} students
              </option>
            ))}
          </select>
        </label>

        <label className="rc-field">
          <span>Examination</span>
          <select
            value={examTitle}
            onChange={(event) => {
              setError('')
              setPending(event.target.value ? 'results' : '')
              setExamTitle(event.target.value)
            }}
            disabled={!exams.length}
          >
            <option value="">{exams.length ? 'Choose an exam' : 'No published result'}</option>
            {exams.map((exam) => (
              <option key={exam.examTitle} value={exam.examTitle}>
                {exam.examTitle} · {exam.studentCount} students
              </option>
            ))}
          </select>
        </label>

        <label className="rc-field">
          <span>Student</span>
          <select
            value={selectedStudent}
            onChange={(event) => setSelectedStudent(event.target.value)}
            disabled={!results.length}
          >
            <option value="all">All students ({results.length})</option>
            {results.map((result) => (
              <option key={result.id || result.studentId} value={String(result.studentId)}>
                {result.studentName}
                {result.rollNo ? ` · Roll ${result.rollNo}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="rc-field rc-field--wide">
          <span>Class teacher's remarks (prints on every card)</span>
          <input
            type="text"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="e.g. Consistent effort across all subjects."
            maxLength={140}
          />
        </label>

        <p className="rc-controls__meta">
          {selectedExam
            ? `${selectedExam.examTitle} · ${classStudents.length} students in ${className}`
            : loading
              ? 'Loading classes…'
              : 'Class choose karein — sirf published results dikhte hain.'}
        </p>
      </section>

      {error ? <p className="rc-alert">{error}</p> : null}

      {loading ? (
        <div className="rc-empty">
          <strong>Loading classes…</strong>
          <span>Published results server se aa rahe hain.</span>
        </div>
      ) : null}

      {!loading && !classes.length ? (
        <div className="rc-empty">
          <strong>No enrolled class yet.</strong>
          <span>Admission complete hone ke baad class yahan dikhegi.</span>
        </div>
      ) : null}

      {!loading && classes.length && !exams.length && className && !examLoading ? (
        <div className="rc-empty">
          <strong>No published result for {className}.</strong>
          <span>Marks studio me marks publish karein — uske baad report cards yahan ban jayenge.</span>
        </div>
      ) : null}

      {!loading && !className && classes.length ? (
        <div className="rc-empty">
          <strong>Choose a class to begin.</strong>
          <span>Result publish hone ke baad har student ka card generate hota hai.</span>
        </div>
      ) : null}

      {examLoading && !cards.length ? (
        <div className="rc-empty">
          <strong>Loading results…</strong>
          <span>Ek moment.</span>
        </div>
      ) : null}

      <div className="rc-stack">
        {cards.map(({ result, student, teacherPhone }) => (
          <ReportCardSheet
            key={result.id || `${result.studentId}-${examTitle}`}
            result={result}
            student={student}
            school={school}
            teacherPhone={teacherPhone}
            remarks={remarks}
          />
        ))}
      </div>
    </div>
  )
}
