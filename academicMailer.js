import process from 'node:process'
import nodemailer from 'nodemailer'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function smtpConfig() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    user,
    pass,
    from: process.env.SMTP_FROM || user,
  }
}

export function isAcademicSmtpConfigured() {
  return Boolean(smtpConfig())
}

function maskEmail(email) {
  const [user, domain] = String(email).split('@')
  if (!user || !domain) return String(email)
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(user.length - 2, 2))}@${domain}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Every parent account + guardian email on student records + every super admin. */
export function collectAcademicRecipients({ users = [], students = [] } = {}) {
  const recipients = new Set()
  const add = (email) => {
    const normalized = String(email || '').trim().toLowerCase()
    if (EMAIL_PATTERN.test(normalized)) recipients.add(normalized)
  }
  users.forEach((user) => {
    const role = String(user?.role || '').toLowerCase()
    if (role === 'super_admin' || role === 'parent') add(user?.email)
  })
  students.forEach((student) => {
    add(student?.guardianEmail)
    add(student?.fatherEmail)
    add(student?.motherEmail)
  })
  add(process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL)
  return [...recipients]
}

function buildMailContent(docModel) {
  const isTimetable = docModel.type === 'timetable'
  const heading = isTimetable ? 'Weekly timetable published' : 'Exam datesheet published'
  const subject = isTimetable
    ? `Weekly timetable · ${docModel.subtitle}`
    : `${docModel.payload?.examName || 'Examination'} datesheet${docModel.payload?.className ? ` · ${docModel.payload.className}` : ''}`
  const description = isTimetable
    ? `The school has published the weekly timetable for ${escapeHtml(docModel.subtitle)}.`
    : `The school has published the datesheet for ${escapeHtml(docModel.payload?.examName || 'the examination')}${docModel.payload?.className ? ` (${escapeHtml(docModel.payload.className)})` : ''}.`
  const html = `<!doctype html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e6ebf5">
    <p style="margin:0 0 6px;color:#4157ff;font-size:12px;font-weight:700;letter-spacing:1px">SCHOOL MANAGEMENT SYSTEM</p>
    <h2 style="margin:0 0 10px;color:#111b33">${heading}</h2>
    <p style="color:#5c6b8c;line-height:1.6">Dear Parent / Guardian,</p>
    <p style="color:#5c6b8c;line-height:1.6">${description}</p>
    <p style="color:#5c6b8c;line-height:1.6">The PDF is attached to this email, so you can view it directly even if you cannot download it from the website.</p>
    <p style="color:#8b97b3;font-size:13px;margin-top:22px">Published ${new Date(docModel.publishedAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
    <p style="color:#1b2a55;font-weight:700;margin-top:18px">School Management System · Academics Desk</p>
  </div>
</body></html>`
  const text = `${heading}\n\nDear Parent / Guardian,\n\n${description.replace(/<[^>]+>/g, '')}\nThe PDF is attached to this email.\n\nSchool Management System · Academics Desk`
  return { subject, html, text }
}

export async function sendAcademicDocumentEmails({ docModel, recipients, pdfBuffer, attachmentName }) {
  const list = Array.isArray(recipients) ? recipients : []
  const smtp = smtpConfig()
  if (!smtp) {
    return {
      status: 'unavailable',
      recipients: list.length,
      sent: 0,
      failed: 0,
      errors: ['SMTP is not configured on the server.'],
      updatedAt: new Date().toISOString(),
    }
  }
  if (!list.length) {
    return {
      status: 'sent',
      recipients: 0,
      sent: 0,
      failed: 0,
      errors: [],
      updatedAt: new Date().toISOString(),
    }
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    pool: true,
    maxConnections: 2,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 45000,
  })
  const content = buildMailContent(docModel)
  const errors = []
  let sent = 0
  let failed = 0

  for (const to of list) {
    try {
      const result = await transporter.sendMail({
        from: smtp.from,
        to,
        subject: content.subject,
        text: content.text,
        html: content.html,
        attachments: [
          {
            filename: attachmentName,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      })
      const accepted = Array.isArray(result?.accepted) && result.accepted.some(
        (recipient) => String(recipient).trim().toLowerCase() === to,
      )
      if (!accepted) throw new Error('The mail server did not accept the recipient.')
      sent += 1
    } catch (error) {
      failed += 1
      const detail = error?.message || String(error)
      if (errors.length < 8) errors.push(`${maskEmail(to)}: ${detail}`)
      console.error(`[academic-email] failed for ${maskEmail(to)}: ${detail}`)
    }
  }

  try {
    transporter.close()
  } catch {
    /* connection already closed */
  }

  return {
    status: failed === 0 ? 'sent' : sent > 0 ? 'partial' : 'failed',
    recipients: list.length,
    sent,
    failed,
    errors,
    updatedAt: new Date().toISOString(),
  }
}
