import { SEED_STUDENTS } from '../data/seed'
import { STORAGE_KEYS } from '../utils/constants'

const PARENT_DETAILS_KEY = 'sms_mod__students_parent_details'
const ALERT_LOG_KEY = 'sms_parent_attendance_alerts'
const COMM_NOTIFY_KEY = 'sms_mod__communication_parent_notifications'

/** Hard fallback so demo attendance always has parent contacts */
const FALLBACK_CONTACTS = {
  'aanya sharma': {
    parentName: 'Neha Sharma',
    phone: '+91 98765 41001',
    email: 'parent@example.com',
    relation: 'Mother',
  },
  'kabir khan': {
    parentName: 'Salma Khan',
    phone: '+91 98765 41002',
    email: 'khan.family@example.com',
    relation: 'Mother',
  },
  'diya patel': {
    parentName: 'Ravi Patel',
    phone: '+91 98765 41003',
    email: 'ravi.patel@example.com',
    relation: 'Father',
  },
  'leo fernandes': {
    parentName: 'Maria Fernandes',
    phone: '+91 98765 41004',
    email: 'maria.f@example.com',
    relation: 'Mother',
  },
  'zara ahmed': {
    parentName: 'Imran Ahmed',
    phone: '+91 98765 41005',
    email: 'imran.a@example.com',
    relation: 'Father',
  },
}

function readJson(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null || raw === '') return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota */
  }
}

function readStudents() {
  const stored = readJson(STORAGE_KEYS.students, null)
  if (Array.isArray(stored) && stored.length) return stored
  return SEED_STUDENTS
}

function readParents() {
  const stored = readJson(PARENT_DETAILS_KEY, null)
  if (Array.isArray(stored) && stored.length) return stored
  return []
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '')
}

function launchUri(uri) {
  if (typeof window === 'undefined' || !uri) return false
  try {
    const anchor = document.createElement('a')
    anchor.href = uri
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    return true
  } catch {
    try {
      window.location.href = uri
      return true
    } catch {
      return false
    }
  }
}

async function copyText(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function resolveParentContact(studentName, row = null) {
  const name = String(studentName || '').trim().toLowerCase()

  if (row?.parentPhone || row?.parentEmail || row?.guardianPhone || row?.guardianEmail) {
    return {
      parentName: row.parentName || row.guardianName || row.primary || 'Guardian',
      phone: row.parentPhone || row.guardianPhone || row.phone || '',
      email: row.parentEmail || row.guardianEmail || row.email || row.owner || '',
      relation: row.relation || 'Guardian',
      studentName: row.title || row.name || studentName,
    }
  }

  if (name) {
    const parents = readParents()
    const parentHit = parents.find((p) => String(p.student || '').trim().toLowerCase() === name)
    if (parentHit && (parentHit.phone || parentHit.email)) {
      return {
        parentName: parentHit.title || 'Guardian',
        phone: parentHit.phone || '',
        email: parentHit.email || '',
        relation: parentHit.relation || 'Guardian',
        studentName: parentHit.student || studentName,
      }
    }

    const students = readStudents()
    const studentHit = students.find((s) => String(s.title || '').trim().toLowerCase() === name)
    if (studentHit && (studentHit.phone || studentHit.owner)) {
      return {
        parentName: studentHit.primary || 'Guardian',
        phone: studentHit.phone || '',
        email: studentHit.owner || '',
        relation: 'Guardian',
        studentName: studentHit.title || studentName,
      }
    }

    const fallback = FALLBACK_CONTACTS[name]
    if (fallback) {
      return {
        ...fallback,
        studentName,
      }
    }
  }

  return {
    parentName: 'Guardian',
    phone: '+91 98765 41000',
    email: 'guardian@school.edu',
    relation: 'Guardian',
    studentName: studentName || 'Student',
  }
}

function buildMessage({ studentName, status, className, date, period }) {
  const when = date || new Date().toLocaleDateString()
  const where = className ? ` (Class ${className})` : ''
  const slot = period ? ` · ${period}` : ''
  const statusText = String(status || '').toUpperCase()

  if (statusText === 'ABSENT') {
    return `School Alert: ${studentName}${where} is marked ABSENT on ${when}${slot}. Please contact the school if this is unexpected.`
  }
  if (statusText === 'LATE') {
    return `School Alert: ${studentName}${where} is marked LATE on ${when}${slot}.`
  }
  if (statusText === 'LEAVE') {
    return `School Alert: ${studentName}${where} is marked on LEAVE on ${when}${slot}.`
  }
  if (statusText === 'PRESENT') {
    return `School Alert: ${studentName}${where} is marked PRESENT on ${when}${slot}.`
  }
  return `School Alert: Attendance for ${studentName}${where} updated to ${statusText} on ${when}${slot}.`
}

function appendAlertLog(entry) {
  const prev = readJson(ALERT_LOG_KEY, [])
  writeJson(ALERT_LOG_KEY, [entry, ...prev].slice(0, 200))
}

function mirrorToParentNotifications(entry) {
  const prev = readJson(COMM_NOTIFY_KEY, [])
  const mirrored = {
    id: entry.id,
    title: `Attendance · ${entry.status}`,
    parent: entry.parentName,
    channel: entry.channels.join(' + '),
    message: entry.message,
    status: entry.deliveryStatus,
    tone: entry.deliveryStatus === 'Sent' || entry.deliveryStatus === 'Opened' ? 'success' : 'warning',
    student: entry.studentName,
    createdAt: entry.createdAt,
  }
  writeJson(COMM_NOTIFY_KEY, [mirrored, ...prev].slice(0, 200))
}

/**
 * Notify parent by SMS and/or Email when attendance changes.
 * Opens device SMS / Email apps and logs delivery for the ERP.
 */
export async function notifyParentAttendance({
  studentName,
  status,
  className,
  date,
  period,
  channels = { sms: true, email: true },
  openExternal = true,
  row = null,
}) {
  const contact = resolveParentContact(studentName, row)
  const message = buildMessage({
    studentName: contact.studentName || studentName,
    status,
    className,
    date,
    period,
  })

  const usedChannels = []
  const delivery = []
  let smsCopied = false

  if (channels.sms) {
    usedChannels.push('SMS')
    if (contact.phone) {
      const phone = normalizePhone(contact.phone)
      let launched = false
      if (openExternal) {
        // iOS uses &body=, Android commonly supports ?body=
        const smsUrl = /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? `sms:${phone}&body=${encodeURIComponent(message)}`
          : `sms:${phone}?body=${encodeURIComponent(message)}`
        launched = launchUri(smsUrl)
        smsCopied = await copyText(`To: ${contact.phone}\n\n${message}`)
      }
      delivery.push({
        channel: 'SMS',
        to: contact.phone,
        ok: true,
        launched,
        copied: smsCopied,
      })
    } else {
      delivery.push({ channel: 'SMS', to: '—', ok: false, error: 'No phone on file' })
    }
  }

  if (channels.email) {
    usedChannels.push('Email')
    if (contact.email) {
      let launched = false
      if (openExternal) {
        // Delay email slightly so SMS app launch is not cancelled on desktop
        await new Promise((resolve) => setTimeout(resolve, channels.sms ? 450 : 0))
        const mailUrl = `mailto:${contact.email}?subject=${encodeURIComponent(
          `Attendance update · ${contact.studentName || studentName}`,
        )}&body=${encodeURIComponent(message)}`
        launched = launchUri(mailUrl)
      }
      delivery.push({
        channel: 'Email',
        to: contact.email,
        ok: true,
        launched,
      })
    } else {
      delivery.push({ channel: 'Email', to: '—', ok: false, error: 'No email on file' })
    }
  }

  const allOk = delivery.length > 0 && delivery.every((d) => d.ok)
  const anyOk = delivery.some((d) => d.ok)
  const anyLaunched = delivery.some((d) => d.launched)

  const entry = {
    id: `ATT-ALERT-${Date.now()}`,
    createdAt: new Date().toISOString(),
    studentName: contact.studentName || studentName,
    parentName: contact.parentName,
    phone: contact.phone,
    email: contact.email,
    status,
    className: className || '',
    message,
    channels: usedChannels,
    delivery,
    smsCopied,
    deliveryStatus: anyLaunched ? 'Opened' : allOk ? 'Sent' : anyOk ? 'Partial' : 'Failed',
  }

  appendAlertLog(entry)
  mirrorToParentNotifications(entry)

  return entry
}

export function getAttendanceAlertLog() {
  return readJson(ALERT_LOG_KEY, [])
}
