/* Live (video) session rules shared by the parent scheduler and the teacher
   desk. A parent picks a teacher who actually teaches their child's class, a
   date and a genuinely free 15-minute slot; the teacher accepts or rejects it
   with a reason. File I/O stays in server.js so Blob persistence keeps working. */

import { randomBytes } from 'node:crypto'
import { dayKeyForDate, DAY_KEYS, DAY_LABELS, timeToMinutes } from './classSchedule.js'
import { classKey } from './studentLeave.js'

export const LIVE_SESSION_STATUSES = ['Pending', 'Accepted', 'Rejected', 'Cancelled']
export const LIVE_SESSION_DURATION_MINUTES = 15
export const LIVE_SESSION_STEP_MINUTES = 15
export const LIVE_SESSION_MAX_DAYS_AHEAD = 14
export const LIVE_SESSION_MIN_NOTICE_MINUTES = 30
export const LIVE_SESSION_MAX_AGENDA = 500
export const LIVE_SESSION_MAX_NOTE = 500

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DEFAULT_WINDOW = { start: '08:00', end: '16:00' }
// Meetings after the last period are useful, so the grid always runs to 16:00
// (or later when the school day itself ends later).
const MIN_WINDOW_END = '16:00'

export function isIsoDate(value) {
  const text = String(value || '')
  if (!DATE_PATTERN.test(text)) return false
  const when = new Date(`${text}T12:00:00Z`)
  return Number.isFinite(when.getTime()) && when.toISOString().slice(0, 10) === text
}

/** Move a calendar date by whole days without DST drift. */
export function addDaysIso(date, days) {
  const when = new Date(`${date}T12:00:00Z`)
  when.setUTCDate(when.getUTCDate() + days)
  return when.toISOString().slice(0, 10)
}

export function minutesToTime(minutes) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(Number(minutes) || 0)))
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

function istClockMinutes(now) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const pick = (type) => Number(parts.find((part) => part.type === type)?.value || 0)
  return pick('hour') * 60 + pick('minute')
}

/** "Mon, 17 Nov 2026" on the IST calendar. */
export function liveSessionDateLabel(date) {
  if (!isIsoDate(date)) return '—'
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function liveSessionTimeRange(startTime, endTime) {
  const start = String(startTime || '')
  const end = String(endTime || '')
  if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) return '—'
  return `${start}–${end}`
}

/** True when two minute ranges share any minute. */
function overlaps(startA, endA, startB, endB) {
  return startA < endB && startB < endA
}

export function newMeetingUrl() {
  return `https://meet.jit.si/sms-live-${randomBytes(9).toString('hex')}`
}

export function normalizeLiveSessionRequest(body = {}) {
  const teacherEmail = String(body?.teacherEmail || '').trim().toLowerCase()
  if (!EMAIL_PATTERN.test(teacherEmail)) {
    return { ok: false, error: 'Choose the teacher you want to meet.' }
  }
  const studentId = String(body?.studentId || '').trim().slice(0, 120)
  if (!studentId) return { ok: false, error: 'Choose your child for this session.' }
  const date = String(body?.date || '').trim()
  if (!isIsoDate(date)) return { ok: false, error: 'Choose a valid meeting date.' }
  const startTime = String(body?.startTime || '').trim()
  if (!TIME_PATTERN.test(startTime)) return { ok: false, error: 'Choose a meeting time slot.' }
  const agenda = String(body?.agenda || '').trim().replace(/\s+/g, ' ').slice(0, LIVE_SESSION_MAX_AGENDA)
  const startMinutes = timeToMinutes(startTime)
  return {
    ok: true,
    value: {
      teacherEmail,
      studentId,
      date,
      startTime,
      endTime: minutesToTime(startMinutes + LIVE_SESSION_DURATION_MINUTES),
      agenda,
    },
  }
}

export function normalizeLiveSessionDecision(body = {}) {
  const status = String(body?.status || '').trim()
  if (!['Accepted', 'Rejected'].includes(status)) {
    return { ok: false, error: 'Choose Accept or Reject for this session.' }
  }
  const note = String(body?.note || '').trim().replace(/\s+/g, ' ').slice(0, LIVE_SESSION_MAX_NOTE)
  if (status === 'Rejected' && note.length < 5) {
    return { ok: false, error: 'Write the reason for cancelling this session (at least 5 characters). It is emailed to the parent.' }
  }
  return { ok: true, value: { status, note } }
}

export function normalizeLiveSessionCancellation(body = {}) {
  const note = String(body?.note || '').trim().replace(/\s+/g, ' ').slice(0, 300)
  return { ok: true, value: { note } }
}

/**
 * Every teacher who really takes this class: timetable teachers first, then the
 * class teacher and the roster's classTeacherOf assignment. When the school has
 * not published a timetable yet this honestly falls back to the class teacher.
 */
export function teachersForClass({ className, entries = [], roster = [], assignments = [] } = {}) {
  const key = classKey(className)
  if (!key) return []
  const rosterByEmail = new Map(
    (Array.isArray(roster) ? roster : [])
      .filter((row) => row?.email)
      .map((row) => [String(row.email).trim().toLowerCase(), row]),
  )
  const map = new Map()
  const ensure = (email, name) => {
    const normalized = String(email || '').trim().toLowerCase()
    if (!EMAIL_PATTERN.test(normalized)) return null
    const existing = map.get(normalized)
    if (existing) {
      if (!existing.name && name) existing.name = String(name).slice(0, 120)
      return existing
    }
    const rosterRow = rosterByEmail.get(normalized)
    const entry = {
      email: normalized,
      name: String(rosterRow?.title || name || normalized).slice(0, 120),
      subject: String(rosterRow?.subject || '').slice(0, 80),
      subjects: [],
      isClassTeacher: false,
      teacherRecordId: String(rosterRow?.id || ''),
    }
    map.set(normalized, entry)
    return entry
  }

  for (const row of Array.isArray(entries) ? entries : []) {
    if (classKey(row?.className) !== key) continue
    const teacher = ensure(row.teacherEmail, row.teacherName)
    if (!teacher) continue
    const subject = String(row.subject || '').trim().slice(0, 60)
    if (subject && !teacher.subjects.includes(subject)) teacher.subjects.push(subject)
  }

  for (const row of Array.isArray(roster) ? roster : []) {
    if (classKey(row?.classTeacherOf) !== key) continue
    const teacher = ensure(row.email, row.title || row.name)
    if (teacher) teacher.isClassTeacher = true
  }

  for (const row of Array.isArray(assignments) ? assignments : []) {
    if (classKey(row?.className) !== key) continue
    const teacher = ensure(row.teacherEmail, row.teacherName)
    if (teacher) {
      teacher.isClassTeacher = true
      teacher.teacherRecordId = teacher.teacherRecordId || String(row.teacherRecordId || '')
    }
  }

  return [...map.values()]
    .map((teacher) => ({
      ...teacher,
      subjectLabel: teacher.subjects.slice(0, 4).join(', ') || teacher.subject,
    }))
    .sort(
      (a, b) =>
        Number(b.isClassTeacher) - Number(a.isClassTeacher) ||
        a.name.localeCompare(b.name) ||
        a.email.localeCompare(b.email),
    )
}

/**
 * Free 15-minute slots for one teacher on one date. Teaching periods and the
 * school break are busy, existing pending/accepted sessions are busy, past
 * times are dropped, and weekends/published holidays have no slots at all.
 */
export function buildLiveSlots({
  date,
  periods = [],
  dayEntries = [],
  booked = [],
  holiday = null,
  todayIso,
  now = new Date(),
  teacherOnLeave = false,
} = {}) {
  if (!isIsoDate(date) || !isIsoDate(todayIso)) {
    return { ok: false, error: 'Choose a valid meeting date.' }
  }
  if (date < todayIso) {
    return { ok: false, error: 'This date has already passed. Choose today or a later date.' }
  }
  if (date > addDaysIso(todayIso, LIVE_SESSION_MAX_DAYS_AHEAD)) {
    return {
      ok: false,
      error: `Live sessions can be booked up to ${LIVE_SESSION_MAX_DAYS_AHEAD} days ahead.`,
    }
  }
  if (holiday?.active) {
    return {
      ok: true,
      slots: [],
      note: `${holiday.title || 'School holiday'} — the school is closed on ${liveSessionDateLabel(date)}, so no session can be booked.`,
      holiday,
    }
  }
  if (teacherOnLeave) {
    return {
      ok: true,
      slots: [],
      note: `This teacher is on approved leave on ${liveSessionDateLabel(date)}. Choose another date.`,
      holiday: null,
    }
  }

  const classPeriods = (Array.isArray(periods) ? periods : [])
    .map((period) => ({
      no: Number(period.no),
      kind: period.kind === 'break' ? 'break' : 'class',
      start: timeToMinutes(period.start),
      end: timeToMinutes(period.end),
    }))
    .filter((period) => period.start !== null && period.end !== null && period.end > period.start)

  const hasBell = classPeriods.length > 0
  const windowStart = hasBell
    ? Math.min(...classPeriods.map((period) => period.start))
    : timeToMinutes(DEFAULT_WINDOW.start)
  const windowEnd = hasBell
    ? Math.max(Math.max(...classPeriods.map((period) => period.end)), timeToMinutes(MIN_WINDOW_END))
    : timeToMinutes(DEFAULT_WINDOW.end)

  const busy = classPeriods
    .filter((period) => period.kind === 'break')
    .map((period) => [period.start, period.end])
  const periodByNo = new Map(classPeriods.filter((period) => period.kind === 'class').map((period) => [period.no, period]))
  for (const entry of Array.isArray(dayEntries) ? dayEntries : []) {
    const period = periodByNo.get(Number(entry.periodNo))
    if (period) busy.push([period.start, period.end])
  }
  for (const row of Array.isArray(booked) ? booked : []) {
    const start = timeToMinutes(row.startTime)
    const end = timeToMinutes(row.endTime)
    if (start !== null && end !== null && end > start) busy.push([start, end])
  }

  const isToday = date === todayIso
  const earliest = isToday ? istClockMinutes(now) + LIVE_SESSION_MIN_NOTICE_MINUTES : 0
  const slots = []
  for (
    let start = windowStart;
    start + LIVE_SESSION_DURATION_MINUTES <= windowEnd;
    start += LIVE_SESSION_STEP_MINUTES
  ) {
    const end = start + LIVE_SESSION_DURATION_MINUTES
    if (earliest && start < earliest) continue
    if (busy.some(([busyStart, busyEnd]) => overlaps(start, end, busyStart, busyEnd))) continue
    slots.push({ startTime: minutesToTime(start), endTime: minutesToTime(end) })
  }

  const notes = []
  if (!slots.length && isToday && earliest >= windowEnd) {
    notes.push("Today's school hours have already passed. Choose another date.")
  }
  if (!hasBell) {
    notes.push('The school bell schedule is not set yet, so slots use a standard 08:00–16:00 day.')
  } else if (!Array.isArray(dayEntries) || !dayEntries.length) {
    notes.push('No timetable is published for this teacher on this day, so all free time outside breaks is shown.')
  }

  return { ok: true, slots, note: notes.join(' '), holiday: null, dayKey: dayKeyForDate(date) }
}

export function dayLabelForDate(date) {
  const key = dayKeyForDate(date)
  return DAY_KEYS.includes(key) ? DAY_LABELS[key] : ''
}

export function liveSessionMatchesTeacher(row, { email, linkedId } = {}) {
  if (!row) return false
  const wanted = String(email || '').trim().toLowerCase()
  if (wanted && String(row.teacherEmail || '').trim().toLowerCase() === wanted) return true
  const record = String(linkedId || '').trim()
  return Boolean(record && String(row.teacherRecordId || '').trim() === record)
}

export function liveSessionSummary(rows) {
  const list = Array.isArray(rows) ? rows : []
  return {
    total: list.length,
    pending: list.filter((row) => row.status === 'Pending').length,
    accepted: list.filter((row) => row.status === 'Accepted').length,
    rejected: list.filter((row) => row.status === 'Rejected').length,
    cancelled: list.filter((row) => row.status === 'Cancelled').length,
  }
}

export function publicLiveSession(row, { includeJoin = false } = {}) {
  const status = LIVE_SESSION_STATUSES.includes(row?.status) ? row.status : 'Pending'
  return {
    id: row.id,
    studentId: row.studentId || '',
    studentName: row.studentName || '',
    className: row.className || '',
    parentName: row.parentName || '',
    parentEmail: row.parentEmail || '',
    teacherName: row.teacherName || '',
    teacherEmail: row.teacherEmail || '',
    teacherSubject: row.teacherSubject || '',
    date: row.date || '',
    dateLabel: liveSessionDateLabel(row.date),
    startTime: row.startTime || '',
    endTime: row.endTime || '',
    timeLabel: liveSessionTimeRange(row.startTime, row.endTime),
    agenda: row.agenda || '',
    status,
    meetingUrl: includeJoin && status === 'Accepted' ? row.meetingUrl || '' : '',
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
    decidedAt: row.decidedAt || '',
    decidedByName: row.decidedByName || '',
    decidedByRole: row.decidedByRole || '',
    decisionNote: row.decisionNote || '',
  }
}
