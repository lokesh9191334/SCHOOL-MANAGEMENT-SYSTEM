/* Substitute teacher planning. When the admin approves a teacher's leave, every
   period that teacher would have taken becomes a substitution slot. A cover
   teacher is chosen only from the same standard ±2 (10th → 8th–12th), must be
   free in that period, must not be on approved leave that day, and must not
   already be covering another class in the same period. Same-subject teachers
   are preferred. If nobody qualifies the slot is stored for the admin to fill.
   File I/O stays in server.js so Blob persistence keeps working. */

import {
  DAY_LABELS,
  classStandard,
  dayKeyForDate,
  standardDistance,
  standardsCompatible,
  subjectMatches,
} from './classSchedule.js'
import { classKey } from './studentLeave.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NO_CANDIDATE_REASON = 'No free teacher in the ±2 standard range for this period.'

const emailOf = (value) => String(value || '').trim().toLowerCase()

export function dateRangeDays(fromDate, toDate) {
  const start = new Date(`${fromDate}T00:00:00Z`)
  const end = new Date(`${toDate}T00:00:00Z`)
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return []
  const days = []
  for (let time = start.getTime(); time <= end.getTime() && days.length < 62; time += 86_400_000) {
    days.push(new Date(time).toISOString().slice(0, 10))
  }
  return days
}

function leaveCoversDate(leave, date) {
  return String(leave?.fromDate || '') <= date && date <= String(leave?.toDate || '')
}

function teacherStandards(teacher, entries) {
  const standards = []
  const seen = new Set()
  const push = (className) => {
    if (!className) return
    const key = classKey(className)
    if (!key || seen.has(key)) return
    seen.add(key)
    standards.push({ className, standard: classStandard(className) })
  }
  for (const entry of entries) {
    if (emailOf(entry?.teacherEmail) === emailOf(teacher?.email)) push(entry.className)
  }
  push(teacher?.classTeacherOf)
  return standards
}

function freeInPeriod(entries, email, day, periodNo) {
  return !entries.some(
    (entry) =>
      entry?.day === day &&
      Number(entry?.periodNo) === Number(periodNo) &&
      emailOf(entry?.teacherEmail) === email,
  )
}

function onApprovedLeave(leaves, email, date) {
  return leaves.some(
    (leave) =>
      String(leave?.status) === 'Approved' &&
      emailOf(leave?.teacherEmail) === email &&
      leaveCoversDate(leave, date),
  )
}

function coveringElsewhere(substitutions, email, date, periodNo) {
  return substitutions.some(
    (row) =>
      String(row?.status) === 'assigned' &&
      emailOf(row?.substituteEmail) === email &&
      String(row?.date || '') === date &&
      Number(row?.periodNo) === Number(periodNo),
  )
}

/**
 * Every teacher who could take this slot, best first. Reused by the engine and
 * by the admin "assign manually" dropdown.
 */
export function rankSubstituteCandidates({
  date,
  periodNo,
  className,
  subject = '',
  entries = [],
  teachers = [],
  leaves = [],
  substitutions = [],
  absentEmail = '',
}) {
  const day = dayKeyForDate(date)
  if (!day) return []
  const slotStandard = classStandard(className)
  const absent = emailOf(absentEmail)
  const seen = new Set()
  const candidates = []
  for (const teacher of teachers) {
    const email = emailOf(teacher?.email)
    if (!EMAIL_PATTERN.test(email) || seen.has(email) || email === absent) continue
    if (String(teacher?.status || 'Active').toLowerCase() === 'resigned') continue
    if (!freeInPeriod(entries, email, day, periodNo)) continue
    if (onApprovedLeave(leaves, email, date)) continue
    if (coveringElsewhere(substitutions, email, date, periodNo)) continue
    const near = teacherStandards(teacher, entries).filter((item) => standardsCompatible(item.standard, slotStandard))
    if (!near.length) continue
    seen.add(email)
    const nearest = near
      .map((item) => standardDistance(item.standard, slotStandard))
      .sort((a, b) => a - b)[0]
    const subjectMatch = subjectMatches(teacher?.subject, subject)
    candidates.push({
      email,
      name: String(teacher?.title || teacher?.name || email).slice(0, 120),
      subject: String(teacher?.subject || '').slice(0, 80),
      subjectMatch,
      distance: nearest,
      teaches: near.map((item) => item.className),
    })
  }
  candidates.sort(
    (a, b) =>
      Number(b.subjectMatch) - Number(a.subjectMatch) ||
      a.distance - b.distance ||
      a.name.localeCompare(b.name),
  )
  return candidates
}

/**
 * Build substitution rows for an approved leave. Existing rows are respected, so
 * running this twice never duplicates or reassigns a slot.
 */
export function planSubstitutions({
  leave,
  date = '',
  entries = [],
  periods = [],
  teachers = [],
  leaves = [],
  substitutions = [],
  holidays = [],
} = {}) {
  const absentEmail = emailOf(leave?.teacherEmail)
  if (!leave?.id || !EMAIL_PATTERN.test(absentEmail)) return []
  const holidaySet = new Set((Array.isArray(holidays) ? holidays : []).map((value) => String(value || '')))
  const periodByNo = new Map((Array.isArray(periods) ? periods : []).map((period) => [Number(period.no), period]))
  const created = []
  const planned = []
  // Recomputed each slot so a teacher picked for one period is not picked again
  // in the same period for another absent colleague.
  const slotsSoFar = () => [...(Array.isArray(substitutions) ? substitutions : []), ...planned]
  const only = String(date || '')
  const dates = only ? dateRangeDays(only, only) : dateRangeDays(leave.fromDate, leave.toDate)

  for (const date of dates) {
    if (holidaySet.has(date)) continue
    const day = dayKeyForDate(date)
    if (!day) continue
    const absentSlots = entries
      .filter((entry) => entry?.day === day && emailOf(entry?.teacherEmail) === absentEmail)
      .sort((a, b) => Number(a.periodNo) - Number(b.periodNo))
    for (const slot of absentSlots) {
      const alreadyPlanned = slotsSoFar().some(
        (row) =>
          String(row?.date || '') === date &&
          Number(row?.periodNo) === Number(slot.periodNo) &&
          classKey(row?.className) === classKey(slot.className),
      )
      if (alreadyPlanned) continue
      const period = periodByNo.get(Number(slot.periodNo)) || null
      const candidates = rankSubstituteCandidates({
        date,
        periodNo: slot.periodNo,
        className: slot.className,
        subject: slot.subject,
        entries,
        teachers,
        leaves,
        substitutions: slotsSoFar(),
        absentEmail,
      })
      const cover = candidates[0] || null
      const row = {
        id: `SUB-${date}-${slot.periodNo}-${Math.random().toString(36).slice(2, 8)}`,
        date,
        day,
        dayLabel: DAY_LABELS[day] || day,
        periodNo: Number(slot.periodNo),
        periodLabel: period?.label || `Period ${slot.periodNo}`,
        time: period ? `${period.start}–${period.end}` : '',
        className: slot.className,
        subject: slot.subject || '',
        absentTeacherEmail: absentEmail,
        absentTeacherName: String(leave.teacherName || '').slice(0, 120),
        leaveRequestId: String(leave.id),
        substituteEmail: cover?.email || '',
        substituteName: cover?.name || '',
        substituteSubject: cover?.subject || '',
        status: cover ? 'assigned' : 'needs_admin',
        reason: cover ? '' : NO_CANDIDATE_REASON,
        notified: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      planned.push(row)
      created.push(row)
    }
  }
  return created
}

export function publicSubstitution(row) {
  return {
    id: row.id,
    date: row.date || '',
    day: row.day || '',
    dayLabel: row.dayLabel || DAY_LABELS[row.day] || row.day || '',
    periodNo: Number(row.periodNo) || 0,
    periodLabel: row.periodLabel || `Period ${row.periodNo}`,
    time: row.time || '',
    className: row.className || '',
    subject: row.subject || '',
    absentTeacherName: row.absentTeacherName || '',
    absentTeacherEmail: row.absentTeacherEmail || '',
    leaveRequestId: row.leaveRequestId || '',
    substituteEmail: row.substituteEmail || '',
    substituteName: row.substituteName || '',
    substituteSubject: row.substituteSubject || '',
    status: row.status === 'assigned' ? 'assigned' : 'needs_admin',
    reason: row.reason || '',
    notified: row.notified && typeof row.notified === 'object' ? row.notified : null,
    createdAt: row.createdAt || '',
  }
}

export { NO_CANDIDATE_REASON, leaveCoversDate }
