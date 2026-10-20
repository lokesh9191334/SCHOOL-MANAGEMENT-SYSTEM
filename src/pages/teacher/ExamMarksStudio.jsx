import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchClassResults, publishResults } from '../../services/results'
import { gradeFromPercent } from '../../../resultsStore.js'
import './ExamMarksStudio.css'

let subjectCounter = 0

function nextSubjectKey() {
  subjectCounter += 1
  return `sub-${Date.now()}-${subjectCounter}`
}

function subjectDraft(subject) {
  return { key: nextSubjectKey(), name: String(subject?.name || ''), max: String(subject?.max ?? 100) }
}

function subjectPayload(subjects) {
  return subjects.map((subject) => ({ name: subject.name.trim(), max: Number(subject.max) }))
}

function marksFromResults(results, subjects) {
  const next = {}
  for (const result of results || []) {
    const entries = {}
    for (const score of result.subjects || []) {
      const match = subjects.find(
        (subject) => subject.name.trim().toLowerCase() === String(score.name || '').trim().toLowerCase(),
      )
      if (match) entries[match.key] = String(score.scored)
    }
    next[String(result.studentId)] = entries
  }
  return next
}

function computeRow(student, subjects, marks) {
  const entries = marks[student.id] || {}
  let total = 0
  let totalMax = 0
  let complete = subjects.length > 0
  for (const subject of subjects) {
    const max = Number(subject.max)
    const raw = entries[subject.key]
    const value = raw === '' || raw === undefined || raw === null ? NaN : Number(raw)
    if (
      !subject.name.trim() ||
      !Number.isFinite(max) ||
      max <= 0 ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > max
    ) {
      complete = false
      continue
    }
    total += value
    totalMax += max
  }
  if (!totalMax) complete = false
  const percent = complete ? Math.round((total / totalMax) * 1000) / 10 : null
  return { complete, total, totalMax, percent, grade: percent === null ? '' : gradeFromPercent(percent) }
}

function emailMessage(email) {
  if (!email) return ''
  const parents = `${email.recipients} parent email${email.recipients === 1 ? '' : 's'}`
  if (email.status === 'queued') return `Result saved. Emailing ${parents} automatically now.`
  if (email.status === 'sent') {
    return email.recipients
      ? `Result saved and emailed to ${parents}.`
      : 'Result saved. No parent email address is on record for this student yet.'
  }
  if (email.status === 'partial') return `Result saved. Email delivered to ${email.sent} of ${email.recipients} parents.`
  if (email.status === 'failed') {
    return `Result saved, but the email could not be delivered. ${email.errors?.[0] || ''}`.trim()
  }
  if (email.status === 'disabled') return 'Result saved. Email delivery is disabled on this server.'
  return 'Result saved.'
}

function validateSetup({ className, examTitle, subjects }) {
  if (!className) return 'Choose a class first.'
  if (!examTitle.trim()) return 'Enter the examination name.'
  if (!subjects.length) return 'Add at least one subject.'
  const names = new Set()
  for (const subject of subjects) {
    const name = subject.name.trim()
    if (!name) return 'Every subject needs a name.'
    const max = Number(subject.max)
    if (!Number.isFinite(max) || max <= 0 || max > 1000) {
      return `Max marks for "${name}" must be between 1 and 1000.`
    }
    if (names.has(name.toLowerCase())) return `Subject "${name}" is listed twice.`
    names.add(name.toLowerCase())
  }
  return ''
}

export default function ExamMarksStudio() {
  const [classes, setClasses] = useState([])
  const [className, setClassName] = useState('')
  const [examTitle, setExamTitle] = useState('')
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [exams, setExams] = useState([])
  const [published, setPublished] = useState([])
  const [marks, setMarks] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [subjectsOpen, setSubjectsOpen] = useState(true)

  const refreshPublished = useCallback(async (targetClass, targetExam) => {
    const body = await fetchClassResults({ className: targetClass, examTitle: targetExam })
    setPublished(Array.isArray(body?.results) ? body.results : [])
    setExams(Array.isArray(body?.exams) ? body.exams : [])
    if (Array.isArray(body?.classes) && body.classes.length) setClasses(body.classes)
  }, [])

  const loadClassData = useCallback(
    async (targetClass, targetExam) => {
      if (!targetClass) return
      setLoading(true)
      setError('')
      try {
        const body = await fetchClassResults({ className: targetClass, examTitle: targetExam })
        const subjectRows = (Array.isArray(body?.subjects) ? body.subjects : []).map(subjectDraft)
        setSubjectsOpen(!subjectRows.length)
        setStudents(Array.isArray(body?.students) ? body.students : [])
        setSubjects(subjectRows)
        setExams(Array.isArray(body?.exams) ? body.exams : [])
        setPublished(Array.isArray(body?.results) ? body.results : [])
        setMarks(marksFromResults(body?.results, subjectRows))
        if (Array.isArray(body?.classes) && body.classes.length) setClasses(body.classes)
      } catch (err) {
        setError(err?.message || 'Could not load this class.')
        setStudents([])
        setSubjects([])
        setExams([])
        setPublished([])
        setMarks({})
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const body = await fetchClassResults()
        if (!active) return
        const list = Array.isArray(body?.classes) ? body.classes : []
        setClasses(list)
        if (list.length) {
          setClassName(list[0].name)
          await loadClassData(list[0].name, '')
        } else {
          setLoading(false)
        }
      } catch (err) {
        if (!active) return
        setError(err?.message || 'Could not load classes.')
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [loadClassData])

  const rowStates = useMemo(() => {
    const map = new Map()
    for (const student of students) map.set(student.id, computeRow(student, subjects, marks))
    return map
  }, [students, subjects, marks])

  const publishedMap = useMemo(
    () => new Map(published.map((result) => [String(result.studentId), result])),
    [published],
  )
  const completed = students.filter((student) => rowStates.get(student.id)?.complete)
  const enteredAverage = completed.length
    ? Math.round(
        (completed.reduce((sum, student) => sum + rowStates.get(student.id).percent, 0) / completed.length) * 10,
      ) / 10
    : null
  const matchingExam = exams.find(
    (exam) => exam.examTitle.trim().toLowerCase() === examTitle.trim().toLowerCase(),
  )

  const changeClass = (nextClass) => {
    setClassName(nextClass)
    setPublished([])
    setStudents([])
    setSubjects([])
    setExams([])
    setMarks({})
    setError('')
    setNotice('')
    if (nextClass) loadClassData(nextClass, examTitle.trim())
    else setLoading(false)
  }

  const updateSubject = (key, field, value) => {
    setSubjects((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)))
  }

  const addSubject = () => {
    setSubjects((rows) => (rows.length >= 20 ? rows : [...rows, subjectDraft({ name: '', max: 100 })]))
  }

  const removeSubject = (key) => {
    setSubjects((rows) => rows.filter((row) => row.key !== key))
  }

  const setMark = (studentId, subjectKey, value) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [subjectKey]: value },
    }))
  }

  const submit = async (studentList) => {
    const setupError = validateSetup({ className, examTitle, subjects })
    if (setupError) {
      setError(setupError)
      setNotice('')
      return
    }
    const incomplete = studentList.find((student) => !rowStates.get(student.id)?.complete)
    if (incomplete) {
      setError(`${incomplete.name}: enter marks for every subject within the max.`)
      setNotice('')
      return
    }
    setBusy(studentList.length === 1 ? studentList[0].id : 'all')
    setError('')
    setNotice('')
    try {
      const body = await publishResults({
        examTitle: examTitle.trim(),
        className,
        subjects: subjectPayload(subjects),
        marks: studentList.map((student) => ({
          studentId: student.id,
          scores: subjects.map((subject) => Number(marks[student.id]?.[subject.key])),
        })),
      })
      await refreshPublished(className, examTitle.trim())
      const saved = Number(body?.saved || studentList.length)
      setNotice(`${emailMessage(body?.email)} (${saved} result${saved === 1 ? '' : 's'})`)
    } catch (err) {
      setError(err?.message || 'The result could not be published.')
    } finally {
      setBusy('')
    }
  }

  const loadSavedMarks = async () => {
    if (!className || !matchingExam) return
    setNotice('')
    await loadClassData(className, matchingExam.examTitle)
    setNotice(`Loaded saved marks for ${matchingExam.examTitle}.`)
  }

  return (
    <div className="ems-page">
      <header className="ems-hero">
        <div>
          <p className="admin-kicker">Examination · Teacher only</p>
          <h2>Result builder</h2>
          <p>
            Pick a class and its saved subjects appear automatically. Enter only the marks — total, percentage, grade
            and class rank are calculated by the server. Confirming a result publishes it to the child’s parent portal
            and emails the parent.
          </p>
        </div>
        <div className="ems-hero-actions">
          <Link className="ems-btn ghost" to="/teacher/exams/report-cards">
            Report cards
          </Link>
        </div>
      </header>

      <section className="ems-toolbar">
        <label>
          <span>Class</span>
          <select value={className} onChange={(event) => changeClass(event.target.value)} disabled={loading}>
            <option value="">Select a class</option>
            {classes.map((entry) => (
              <option key={entry.key} value={entry.name}>
                {entry.name} · {entry.studentCount} student{entry.studentCount === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Examination title</span>
          <input
            list="ems-exam-titles"
            value={examTitle}
            onChange={(event) => setExamTitle(event.target.value)}
            placeholder="e.g. Half Yearly Examination 2026"
            maxLength={120}
          />
          <datalist id="ems-exam-titles">
            {exams.map((exam) => (
              <option key={exam.examTitle} value={exam.examTitle}>
                {exam.studentCount} result{exam.studentCount === 1 ? '' : 's'}
              </option>
            ))}
          </datalist>
          {matchingExam ? (
            <button type="button" className="ems-inline-link" onClick={loadSavedMarks} disabled={Boolean(busy)}>
              Load saved marks for this exam
            </button>
          ) : null}
        </label>
        <div className="ems-stats">
          <article>
            <strong>{students.length}</strong>
            <span>Students</span>
          </article>
          <article>
            <strong>{published.length}</strong>
            <span>Published</span>
          </article>
          <article>
            <strong>{enteredAverage === null ? '—' : `${enteredAverage}%`}</strong>
            <span>Entered average</span>
          </article>
        </div>
      </section>

      {error ? <p className="ems-alert is-error">{error}</p> : null}
      {notice ? <p className="ems-alert is-success">{notice}</p> : null}

      {loading ? (
        <p className="ems-empty">Loading class…</p>
      ) : !classes.length ? (
        <div className="ems-empty">
          <strong>No student records yet.</strong>
          <span>
            Add a student from <Link to="/students/add">New Admission</Link> first — results are built from the real
            student list.
          </span>
        </div>
      ) : className ? (
        <>
          <details
            className="ems-subjects"
            open={subjectsOpen}
            onToggle={(event) => setSubjectsOpen(event.currentTarget.open)}
          >
            <summary>
              <span>Subjects for {className}</span>
              <small>
                {subjects.length} subject{subjects.length === 1 ? '' : 's'} · saved once, reused for every student
              </small>
            </summary>
            <div className="ems-subject-grid">
              {subjects.map((subject) => (
                <div className="ems-subject-row" key={subject.key}>
                  <input
                    type="text"
                    value={subject.name}
                    onChange={(event) => updateSubject(subject.key, 'name', event.target.value)}
                    placeholder="Subject name"
                    maxLength={60}
                    aria-label="Subject name"
                  />
                  <input
                    type="number"
                    value={subject.max}
                    onChange={(event) => updateSubject(subject.key, 'max', event.target.value)}
                    placeholder="Max"
                    min={1}
                    max={1000}
                    aria-label={`Max marks for ${subject.name || 'subject'}`}
                  />
                  <button
                    type="button"
                    className="ems-icon-btn"
                    onClick={() => removeSubject(subject.key)}
                    aria-label={`Remove ${subject.name || 'subject'}`}
                    title="Remove subject"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="ems-add-subject" onClick={addSubject} disabled={subjects.length >= 20}>
                + Add subject
              </button>
            </div>
          </details>

          {students.length ? (
            <div className="ems-table-wrap">
              <table className="ems-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    {subjects.map((subject) => (
                      <th key={subject.key}>
                        {subject.name || 'Subject'}
                        <small>/ {subject.max || '—'}</small>
                      </th>
                    ))}
                    <th>Total</th>
                    <th>%</th>
                    <th>Grade</th>
                    <th>Rank</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const row = rowStates.get(student.id) || { complete: false }
                    const publishedRow = publishedMap.get(String(student.id))
                    return (
                      <tr key={student.id}>
                        <td className="ems-name">
                          {student.name}
                          <small className="ems-roll">Roll {student.rollNo || '—'}</small>
                        </td>
                        {subjects.map((subject) => (
                          <td key={subject.key}>
                            <input
                              className="ems-mark"
                              type="number"
                              min={0}
                              max={Number(subject.max) || 1000}
                              step="any"
                              value={marks[student.id]?.[subject.key] ?? ''}
                              onChange={(event) => setMark(student.id, subject.key, event.target.value)}
                              aria-label={`${student.name} · ${subject.name || 'subject'}`}
                            />
                          </td>
                        ))}
                        <td>
                          <strong>{row.complete ? row.total : '—'}</strong>
                        </td>
                        <td>{row.complete ? `${row.percent}%` : '—'}</td>
                        <td>
                          {row.complete ? (
                            <span className={`ems-grade grade-${row.grade.replace('+', 'p')}`}>{row.grade}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{publishedRow?.rank ? <span className="ems-rank">#{publishedRow.rank}</span> : '—'}</td>
                        <td>
                          <span className={`ems-pill ${publishedRow ? 'is-published' : 'is-draft'}`}>
                            {publishedRow ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ems-confirm"
                            onClick={() => submit([student])}
                            disabled={Boolean(busy) || !row.complete}
                            title="Publish this result and email the parent"
                          >
                            {busy === student.id ? 'Saving…' : 'Confirm'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="ems-empty">This class has no students yet.</p>
          )}

          <div className="ems-publish-bar">
            <div>
              <strong>
                {completed.length} of {students.length} students complete
              </strong>
              <span>
                Only students with a mark in every subject can be published. Re-publishing updates the same result and
                re-ranks the class.
              </span>
            </div>
            <button
              type="button"
              className="ems-btn primary"
              onClick={() => submit(completed)}
              disabled={Boolean(busy) || !completed.length}
            >
              {busy === 'all' ? 'Publishing…' : `Publish ${completed.length} result${completed.length === 1 ? '' : 's'}`}
            </button>
          </div>

          <p className="ems-footnote">
            Grade bands: A+ ≥90 · A ≥80 · B+ ≥70 · B ≥60 · C ≥50 · D ≥35 · F below 35. The server calculates totals and
            ranks, and emails the linked parent after every publish.
          </p>
        </>
      ) : (
        <p className="ems-empty">Select a class to load its students and saved subjects.</p>
      )}
    </div>
  )
}
