/* Class schedule (timetable) rules shared by the admin builder and the
   substitute engine. The schedule is a flat list of week slots: one slot per
   class + day + period with its subject and the real teacher who takes it.
   Bell timing (periods and the lunch break) lives in one school-wide config.
   File I/O stays in server.js so Blob persistence keeps working. */

import { classKey, normalizeClassName } from './studentLeave.js'

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
}

const DAY_BY_WEEKDAY = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const MAX_PERIODS = 16
const MAX_ENTRIES = 4000

export function dayKeyForDate(dateText) {
  const text = String(dateText || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return ''
  const when = new Date(`${text}T12:00:00Z`)
  if (!Number.isFinite(when.getTime())) return ''
  return DAY_BY_WEEKDAY[when.getUTCDay()] || ''
}

export function timeToMinutes(value) {
  const match = TIME_PATTERN.exec(String(value || ''))
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function normalizePeriods(input) {
  const rows = Array.isArray(input) ? input : []
  if (!rows.length) return { ok: false, error: 'Add at least one period with its start and end time.' }
  if (rows.length > MAX_PERIODS) return { ok: false, error: `A school day can have at most ${MAX_PERIODS} periods and breaks.` }
  const seen = new Set()
  const periods = []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || {}
    const no = Number(row.no)
    if (!Number.isInteger(no) || no < 1 || no > MAX_PERIODS) {
      return { ok: false, error: `Slot ${index + 1} needs a valid period number.` }
    }
    if (seen.has(no)) return { ok: false, error: `Period number ${no} is used twice.` }
    seen.add(no)
    const kind = row.kind === 'break' ? 'break' : 'class'
    const start = String(row.start || '').trim()
    const end = String(row.end || '').trim()
    if (timeToMinutes(start) === null || timeToMinutes(end) === null) {
      return { ok: false, error: `Period ${no} needs start and end times in 24-hour HH:MM format.` }
    }
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      return { ok: false, error: `Period ${no} must end after it starts.` }
    }
    const fallbackLabel = kind === 'break' ? 'Break' : `Period ${no}`
    const label = String(row.label || fallbackLabel).trim().replace(/\s+/g, ' ').slice(0, 40) || fallbackLabel
    periods.push({ no, kind, label, start, end })
  }
  periods.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start) || a.no - b.no)
  for (let index = 1; index < periods.length; index += 1) {
    if (timeToMinutes(periods[index].start) < timeToMinutes(periods[index - 1].end)) {
      return {
        ok: false,
        error: `${periods[index].label} starts before ${periods[index - 1].label} ends. Adjust the bell times.`,
      }
    }
  }
  if (!periods.some((period) => period.kind === 'class')) {
    return { ok: false, error: 'Add at least one teaching period (breaks alone are not a timetable).' }
  }
  return { ok: true, value: periods }
}

export function periodLabel(period) {
  if (!period) return ''
  return `${period.label} · ${period.start}–${period.end}`
}

/** Standard number a class belongs to ("Class 10-B" → 10). */
export function classStandard(className) {
  const text = String(className || '').trim()
  const match = /(\d{1,2})/.exec(text.replace(/^class\s*/i, ''))
  if (match) {
    return { kind: 'number', value: Number(match[1]), label: String(Number(match[1])) }
  }
  if (/nursery|pre[\s-]?primary|^\s*(lkg|ukg|kg|nur)\b/i.test(text)) {
    return { kind: 'pre', value: 0, label: 'pre-primary' }
  }
  return { kind: 'other', value: null, label: text.toLowerCase() }
}

/** ±2 standards. Pre-primary covers pre-primary, other labels only themselves. */
export function standardsCompatible(a, b) {
  if (!a || !b) return false
  if (a.kind === 'number' && b.kind === 'number') return Math.abs(a.value - b.value) <= 2
  if (a.kind === 'pre' && b.kind === 'pre') return true
  if (a.kind === 'other' && b.kind === 'other') return a.label === b.label
  return false
}

export function standardDistance(a, b) {
  if (!a || !b) return 99
  if (a.kind === 'number' && b.kind === 'number') return Math.abs(a.value - b.value)
  return 0
}

export function normalizeSubject(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Same subject when either name contains the other ("Maths" ~ "Mathematics"). */
export function subjectMatches(teacherSubject, slotSubject) {
  const a = normalizeSubject(teacherSubject)
  const b = normalizeSubject(slotSubject)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

export function scheduleEntryKey(entry) {
  return `${classKey(entry?.className)}|${String(entry?.day || '')}|${Number(entry?.periodNo) || 0}`
}

export function normalizeScheduleEntries(input, { teachers = [], classes = [], periods = [] } = {}) {
  const rows = Array.isArray(input) ? input : []
  if (rows.length > MAX_ENTRIES) return { ok: false, error: 'The schedule is too large to save at once.' }
  const classByKey = new Map()
  for (const label of Array.isArray(classes) ? classes : []) {
    const normalized = normalizeClassName(label)
    if (normalized) classByKey.set(normalized.key, normalized.label)
  }
  const teacherByEmail = new Map()
  for (const teacher of Array.isArray(teachers) ? teachers : []) {
    const email = String(teacher?.email || '').trim().toLowerCase()
    if (email) teacherByEmail.set(email, teacher)
  }
  const periodByNo = new Map(periods.map((period) => [period.no, period]))
  const slotKeys = new Set()
  const teacherSlots = new Map()
  const entries = []
  for (const row of rows) {
    const normalizedClass = normalizeClassName(row?.className)
    if (!normalizedClass) return { ok: false, error: 'Every slot needs a class.' }
    const className = classByKey.get(normalizedClass.key)
    if (!className) {
      return { ok: false, error: `${normalizedClass.label} has no admitted students yet, so it cannot be scheduled.` }
    }
    const day = String(row?.day || '').toLowerCase()
    if (!DAY_KEYS.includes(day)) return { ok: false, error: `Choose a weekday for ${className}.` }
    const periodNo = Number(row?.periodNo)
    const period = periodByNo.get(periodNo)
    if (!period || period.kind !== 'class') {
      return { ok: false, error: `${className} has a slot on a period that is not a teaching period.` }
    }
    const subject = String(row?.subject || '').trim().replace(/\s+/g, ' ').slice(0, 60)
    if (subject.length < 2) return { ok: false, error: `${className} · ${period.label} needs a subject.` }
    const teacherEmail = String(row?.teacherEmail || '').trim().toLowerCase()
    if (!EMAIL_PATTERN.test(teacherEmail)) {
      return { ok: false, error: `${className} · ${period.label} needs a teacher with a valid email.` }
    }
    const teacher = teacherByEmail.get(teacherEmail)
    if (!teacher) {
      return {
        ok: false,
        error: `${className} · ${period.label}: ${teacherEmail} is not in the teacher list. Add the teacher first.`,
      }
    }
    const slotKey = `${normalizedClass.key}|${day}|${periodNo}`
    if (slotKeys.has(slotKey)) {
      return { ok: false, error: `${className} has two subjects in ${DAY_LABELS[day]} · ${period.label}.` }
    }
    slotKeys.add(slotKey)
    const teacherSlot = `${teacherEmail}|${day}|${periodNo}`
    if (teacherSlots.has(teacherSlot)) {
      return {
        ok: false,
        error: `${teacher.title || teacher.name || teacherEmail} is already teaching ${teacherSlots.get(teacherSlot)} in ${DAY_LABELS[day]} · ${period.label}.`,
      }
    }
    teacherSlots.set(teacherSlot, className)
    const room = String(row?.room || '').trim().slice(0, 40)
    const id = /^[A-Za-z0-9_-]{1,80}$/.test(String(row?.id || '')) ? String(row.id) : `TT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    entries.push({
      id,
      className,
      day,
      periodNo,
      subject,
      teacherEmail,
      teacherName: String(teacher.title || teacher.name || teacherEmail).slice(0, 120),
      room,
    })
  }
  return { ok: true, value: entries }
}

export function normalizeScheduleConfig(body = {}) {
  const normalized = normalizePeriods(body?.periods)
  if (!normalized.ok) return normalized
  return { ok: true, value: { periods: normalized.value } }
}
