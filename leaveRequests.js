/* Teacher leave request rules: request validation, day count, overlap checks
   and the public shape sent to the browser. File I/O stays in server.js so
   Blob persistence keeps working. */

export const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick leave' },
  { value: 'casual', label: 'Casual leave' },
  { value: 'personal', label: 'Personal leave' },
  { value: 'duty', label: 'Official duty' },
  { value: 'other', label: 'Other' },
]

export const MAX_LEAVE_REASON = 500
export const MAX_LEAVE_NOTE = 500
export const MAX_LEAVE_RANGE_DAYS = 60
export const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected']

const DAY_MS = 24 * 60 * 60 * 1000

export function leaveTypeLabel(type) {
  const match = LEAVE_TYPES.find((entry) => entry.value === String(type || '').toLowerCase())
  return match ? match.label : 'Leave'
}

export function validLeaveDate(value) {
  const text = String(value || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const time = Date.parse(`${text}T00:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === text
}

/** Inclusive day count between two YYYY-MM-DD dates (same day = 1). */
export function leaveDayCount(fromDate, toDate) {
  const from = Date.parse(`${fromDate}T00:00:00Z`)
  const to = Date.parse(`${toDate}T00:00:00Z`)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0
  return Math.round((to - from) / DAY_MS) + 1
}

export function normalizeLeavePayload(body = {}) {
  const type = String(body?.type || '').trim().toLowerCase()
  if (!LEAVE_TYPES.some((entry) => entry.value === type)) {
    return { ok: false, error: 'Choose a leave type.' }
  }
  const fromDate = String(body?.fromDate || '').trim()
  const toDate = String(body?.toDate || '').trim()
  if (!validLeaveDate(fromDate)) return { ok: false, error: 'Choose a valid start date.' }
  if (!validLeaveDate(toDate)) return { ok: false, error: 'Choose a valid end date.' }
  if (toDate < fromDate) {
    return { ok: false, error: 'The end date cannot be before the start date.' }
  }
  const days = leaveDayCount(fromDate, toDate)
  if (!days || days > MAX_LEAVE_RANGE_DAYS) {
    return { ok: false, error: `A leave request can cover 1 to ${MAX_LEAVE_RANGE_DAYS} days.` }
  }
  const reason = String(body?.reason || '').trim().replace(/\s+/g, ' ').slice(0, MAX_LEAVE_REASON)
  if (reason.length < 5) {
    return { ok: false, error: 'Write a short reason (at least 5 characters) for the admin.' }
  }
  return { ok: true, value: { type, typeLabel: leaveTypeLabel(type), fromDate, toDate, days, reason } }
}

export function normalizeLeaveDecision(body = {}) {
  const status = String(body?.status || '').trim()
  if (!['Approved', 'Rejected'].includes(status)) {
    return { ok: false, error: 'Choose Approve or Reject.' }
  }
  const note = String(body?.note || '').trim().replace(/\s+/g, ' ').slice(0, MAX_LEAVE_NOTE)
  if (status === 'Rejected' && note.length < 5) {
    return { ok: false, error: 'Enter a reason for rejecting this leave (at least 5 characters).' }
  }
  return { ok: true, value: { status, note } }
}

/** True when two requests share at least one calendar day. */
export function leaveOverlaps(a, b) {
  return String(a?.fromDate || '') <= String(b?.toDate || '') && String(b?.fromDate || '') <= String(a?.toDate || '')
}

export function publicLeaveRequest(row) {
  return {
    id: row.id,
    teacherName: row.teacherName || '',
    teacherEmail: row.teacherEmail || '',
    type: row.type,
    typeLabel: row.typeLabel || leaveTypeLabel(row.type),
    fromDate: row.fromDate,
    toDate: row.toDate,
    days: row.days,
    reason: row.reason || '',
    status: LEAVE_STATUSES.includes(row.status) ? row.status : 'Pending',
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
    decidedAt: row.decidedAt || '',
    decidedByName: row.decidedByName || '',
    decisionNote: row.decisionNote || '',
  }
}
