/* Exam result helpers: grade bands, subject/score validation and total
   computation. File I/O stays in server.js so Blob persistence keeps working. */

export const RESULT_GRADE_BANDS = [
  { grade: 'A+', min: 90 },
  { grade: 'A', min: 80 },
  { grade: 'B+', min: 70 },
  { grade: 'B', min: 60 },
  { grade: 'C', min: 50 },
  { grade: 'D', min: 35 },
  { grade: 'F', min: 0 },
]

export const MAX_RESULT_SUBJECTS = 20
export const MAX_SUBJECT_NAME = 60
export const MAX_SUBJECT_MARKS = 1000
export const MAX_EXAM_TITLE = 120

export function gradeFromPercent(percent) {
  const value = Number(percent)
  if (!Number.isFinite(value)) return 'F'
  return (RESULT_GRADE_BANDS.find((band) => value >= band.min) || { grade: 'F' }).grade
}

export function normalizeExamTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, MAX_EXAM_TITLE)
}

/** Trim, dedupe and validate a class subject list. Returns { ok, subjects, error }. */
export function sanitizeSubjects(input) {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: 'Add at least one subject before publishing.' }
  }
  if (input.length > MAX_RESULT_SUBJECTS) {
    return { ok: false, error: `A result can hold at most ${MAX_RESULT_SUBJECTS} subjects.` }
  }
  const seen = new Set()
  const subjects = []
  for (const raw of input) {
    const name = String(raw?.name || '').trim().replace(/\s+/g, ' ').slice(0, MAX_SUBJECT_NAME)
    const max = Number(raw?.max)
    if (!name) return { ok: false, error: 'Every subject needs a name.' }
    if (!Number.isFinite(max) || max <= 0 || max > MAX_SUBJECT_MARKS) {
      return { ok: false, error: `Max marks for "${name}" must be between 1 and ${MAX_SUBJECT_MARKS}.` }
    }
    const key = name.toLowerCase()
    if (seen.has(key)) return { ok: false, error: `Subject "${name}" is listed twice.` }
    seen.add(key)
    subjects.push({ name, max: Math.round(max) })
  }
  return { ok: true, subjects }
}

/**
 * Validate scores for one student (array aligned with the subject list) and
 * compute total, percentage and grade. Returns { ok, error } on bad input.
 */
export function computeResult({ subjects, scores }) {
  if (!Array.isArray(subjects) || !subjects.length) {
    return { ok: false, error: 'Subject list is missing.' }
  }
  if (!Array.isArray(scores) || scores.length !== subjects.length) {
    return { ok: false, error: 'Enter marks for every subject.' }
  }
  const rows = []
  let totalScored = 0
  let totalMax = 0
  for (let i = 0; i < subjects.length; i += 1) {
    const subject = subjects[i]
    const raw = scores[i]
    const scored = Number(raw)
    if (!Number.isFinite(scored) || scored < 0) {
      return { ok: false, error: `Enter a valid mark for ${subject.name}.` }
    }
    if (scored > subject.max) {
      return { ok: false, error: `${subject.name} marks cannot exceed ${subject.max}.` }
    }
    rows.push({ name: subject.name, max: subject.max, scored: Math.round(scored * 10) / 10 })
    totalScored += scored
    totalMax += subject.max
  }
  totalScored = Math.round(totalScored * 10) / 10
  const percent = totalMax ? Math.round((totalScored / totalMax) * 1000) / 10 : 0
  return {
    ok: true,
    subjects: rows,
    totalScored,
    totalMax,
    percent,
    grade: gradeFromPercent(percent),
  }
}

/**
 * Rank a class result list by total (competition ranking: 1, 2, 2, 4).
 * Returns a new array in rank order.
 */
export function rankResults(list) {
  const sorted = [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const byTotal = Number(b.totalScored || 0) - Number(a.totalScored || 0)
    if (byTotal !== 0) return byTotal
    return String(a.studentName || '').localeCompare(String(b.studentName || ''))
  })
  let previousTotal = null
  let currentRank = 0
  return sorted.map((item, index) => {
    const total = Number(item.totalScored || 0)
    if (previousTotal === null || total !== previousTotal) currentRank = index + 1
    previousTotal = total
    return { ...item, rank: currentRank }
  })
}
