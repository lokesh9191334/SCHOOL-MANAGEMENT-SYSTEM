/* Student (parent) leave rules: the parent files a request for their child and
   the class teacher of the child's class reviews it. If a class has no class
   teacher yet the request goes to the school admin instead. File I/O stays in
   server.js so Blob persistence keeps working. */

import {
  LEAVE_TYPES,
  leaveDayCount,
  leaveOverlaps,
  leaveTypeLabel,
  MAX_LEAVE_RANGE_DAYS,
  MAX_LEAVE_REASON,
} from './leaveRequests.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Canonical class label ("8", "class 8" and "Class 8" all become "Class 8"). */
export function normalizeClassName(value) {
  const raw = String(value || '').trim().replace(/\s+/g, ' ')
  if (!raw) return null
  const stripped = raw.replace(/^class\s+/i, '').trim()
  if (!stripped) return null
  const label = `Class ${stripped}`.slice(0, 60)
  return { label, key: label.toLowerCase() }
}

export function classKey(value) {
  return normalizeClassName(value)?.key || ''
}

/** Class stored on a student record, in the order the admission form fills it. */
export function studentClassLabel(student) {
  const candidates = [
    student?.applyingForClass,
    student?.studentClass,
    student?.applyClass,
    student?.class,
    student?.grade,
    student?.subtitle,
  ]
  for (const value of candidates) {
    const normalized = normalizeClassName(value)
    if (normalized) return normalized.label
  }
  return ''
}

/** Sorted, de-duplicated class labels from student records. */
export function classLabelsFromStudents(students) {
  const seen = new Map()
  for (const student of Array.isArray(students) ? students : []) {
    const label = studentClassLabel(student)
    if (!label) continue
    const normalized = normalizeClassName(label)
    if (normalized && !seen.has(normalized.key)) seen.set(normalized.key, normalized.label)
  }
  const rank = (label) => {
    const number = Number(String(label).replace(/[^\d.]/g, ''))
    return Number.isFinite(number) && number > 0 ? number : Number.MAX_SAFE_INTEGER
  }
  return [...seen.values()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export function normalizeClassTeacherAssignment(body = {}) {
  const normalized = normalizeClassName(body?.className)
  if (!normalized) return { ok: false, error: 'Choose the class this class teacher will handle.' }
  const teacherName = String(body?.teacherName || '').trim().replace(/\s+/g, ' ').slice(0, 120)
  if (teacherName.length < 2) return { ok: false, error: 'Enter the class teacher name.' }
  const teacherEmail = String(body?.teacherEmail || '').trim().toLowerCase()
  if (!EMAIL_PATTERN.test(teacherEmail)) {
    return { ok: false, error: 'A class teacher needs a valid email so leave requests reach them.' }
  }
  const teacherPhone = String(body?.teacherPhone || '').trim().slice(0, 30)
  const teacherRecordId = String(body?.teacherRecordId || '').trim().slice(0, 80)
  return {
    ok: true,
    value: {
      className: normalized.label,
      classKey: normalized.key,
      teacherName,
      teacherEmail,
      teacherPhone,
      teacherRecordId,
    },
  }
}

export function normalizeStudentLeavePayload(body = {}) {
  const type = String(body?.type || '').trim().toLowerCase()
  if (!LEAVE_TYPES.some((entry) => entry.value === type)) {
    return { ok: false, error: 'Choose a leave type.' }
  }
  const fromDate = String(body?.fromDate || '').trim()
  const toDate = String(body?.toDate || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    return { ok: false, error: 'Choose a valid start and end date.' }
  }
  if (toDate < fromDate) {
    return { ok: false, error: 'The end date cannot be before the start date.' }
  }
  const days = leaveDayCount(fromDate, toDate)
  if (!days || days > MAX_LEAVE_RANGE_DAYS) {
    return { ok: false, error: `A leave request can cover 1 to ${MAX_LEAVE_RANGE_DAYS} days.` }
  }
  const reason = String(body?.reason || '').trim().replace(/\s+/g, ' ').slice(0, MAX_LEAVE_REASON)
  if (reason.length < 5) {
    return { ok: false, error: 'Write a short reason (at least 5 characters) for the class teacher.' }
  }
  return { ok: true, value: { type, typeLabel: leaveTypeLabel(type), fromDate, toDate, days, reason } }
}

export { leaveOverlaps }

/** Class teacher owns this request: matched by email, then by linked record id. */
export function assignmentMatchesTeacher(assignment, { email, linkedId } = {}) {
  if (!assignment) return false
  const wanted = String(email || '').trim().toLowerCase()
  if (wanted && String(assignment.teacherEmail || '').trim().toLowerCase() === wanted) return true
  const record = String(linkedId || '').trim()
  return Boolean(record && String(assignment.teacherRecordId || '').trim() === record)
}

/** Class keys of every class currently assigned to this teacher. */
export function teacherClassKeys(assignments, { email, linkedId } = {}) {
  const keys = new Set()
  for (const assignment of Array.isArray(assignments) ? assignments : []) {
    if (!assignmentMatchesTeacher(assignment, { email, linkedId })) continue
    const key = classKey(assignment.className)
    if (key) keys.add(key)
  }
  return keys
}

/** True only while this teacher holds the class the request belongs to. */
export function teacherCanDecide(row, assignments, { email, linkedId } = {}) {
  if (!row || row.assignedTo !== 'teacher') return false
  return teacherClassKeys(assignments, { email, linkedId }).has(classKey(row.className))
}

export function publicStudentLeaveRequest(row) {
  return {
    id: row.id,
    studentId: row.studentId || '',
    studentName: row.studentName || '',
    className: row.className || '',
    parentName: row.parentName || '',
    parentEmail: row.parentEmail || '',
    classTeacherName: row.classTeacherName || '',
    classTeacherEmail: row.classTeacherEmail || '',
    assignedTo: row.assignedTo === 'teacher' ? 'teacher' : 'admin',
    type: row.type,
    typeLabel: row.typeLabel || leaveTypeLabel(row.type),
    fromDate: row.fromDate,
    toDate: row.toDate,
    days: row.days,
    reason: row.reason || '',
    status: ['Pending', 'Approved', 'Rejected'].includes(row.status) ? row.status : 'Pending',
    createdAt: row.createdAt || '',
    updatedAt: row.updatedAt || '',
    decidedAt: row.decidedAt || '',
    decidedByName: row.decidedByName || '',
    decisionNote: row.decisionNote || '',
  }
}

export function studentLeaveSummary(rows) {
  return {
    total: rows.length,
    pending: rows.filter((row) => row.status === 'Pending').length,
    approved: rows.filter((row) => row.status === 'Approved').length,
    rejected: rows.filter((row) => row.status === 'Rejected').length,
  }
}
