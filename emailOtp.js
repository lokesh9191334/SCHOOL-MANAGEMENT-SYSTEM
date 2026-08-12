import bcrypt from 'bcryptjs'
import fs from 'fs'
import nodemailer from 'nodemailer'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataDir = join(__dirname, 'data')
const OUTBOX_FILE = join(dataDir, 'email_outbox.json')
const PENDING_FILE = join(dataDir, 'auth_pending.json')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
}

function readJson(file, fallback) {
  ensureDataDir()
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf8')
      return fallback
    }
    return JSON.parse(fs.readFileSync(file, 'utf8') || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function writeJson(file, data) {
  ensureDataDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function hashOtp(otp) {
  return bcrypt.hashSync(String(otp), 8)
}

export function verifyOtpHash(otp, hash) {
  try {
    return bcrypt.compareSync(String(otp), hash)
  } catch {
    return false
  }
}

export function maskEmail(email) {
  const [user, domain] = String(email).split('@')
  if (!user || !domain) return email
  const visible = user.slice(0, 2)
  return `${visible}${'*'.repeat(Math.max(user.length - 2, 2))}@${domain}`
}

function buildEmailHtml({ title, code, purpose, codeLabel = 'one-time password' }) {
  return `<!doctype html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e6ebf5">
    <h2 style="margin:0 0 8px;color:#111b33">${title}</h2>
    <p style="color:#5c6b8c;line-height:1.5">Use this ${codeLabel} to ${purpose}. It expires in 10 minutes and works only once.</p>
    <div style="margin:22px 0;padding:18px;border-radius:12px;background:#10182f;color:#fff;text-align:center;font-size:22px;letter-spacing:4px;font-weight:700">${code}</div>
    <p style="color:#8b97b3;font-size:13px">If you did not request this, ignore this email. Every new login generates a fresh key.</p>
    <p style="color:#1b2a55;font-weight:700;margin-top:18px">School Management System · Security Desk</p>
  </div>
</body></html>`
}

function getSmtpConfig() {
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

export function isSmtpConfigured() {
  return Boolean(getSmtpConfig())
}

export function allowDemoEmail() {
  return String(process.env.SMTP_ALLOW_DEMO || 'false').toLowerCase() === 'true'
}

async function deliverMail({ to, subject, html, text, demoCode, purpose, logLabel }) {
  const smtp = getSmtpConfig()
  const mailSubject = subject

  if (!smtp) {
    if (allowDemoEmail()) {
      return saveDemoDelivery({ to, otp: demoCode, purpose, mailSubject, html, text })
    }
    throw new Error(
      'Real email is required. Add SMTP_HOST, SMTP_USER and SMTP_PASS in your .env file (see .env.example).',
    )
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    })

    await transporter.verify()
    await transporter.sendMail({
      from: smtp.from,
      to,
      subject: mailSubject,
      text,
      html,
    })

    const outbox = readJson(OUTBOX_FILE, [])
    writeJson(OUTBOX_FILE, [
      {
        id: `MAIL-${Date.now()}`,
        to,
        subject: mailSubject,
        purpose,
        delivery: 'smtp',
        createdAt: new Date().toISOString(),
      },
      ...outbox,
    ].slice(0, 100))

    console.log(`[email] SMTP → ${to} · ${logLabel} sent (hidden)`)

    return {
      delivery: 'smtp',
      maskedEmail: maskEmail(to),
      demoOtp: undefined,
      message: `Sent to ${maskEmail(to)}. Check your inbox (and spam folder).`,
    }
  } catch (err) {
    const detail = err?.message || String(err)
    console.error('[email] SMTP failed:', detail)

    if (allowDemoEmail()) {
      return saveDemoDelivery({
        to,
        otp: demoCode,
        purpose,
        mailSubject,
        html,
        text,
        smtpError: detail,
      })
    }

    throw new Error(`Could not send email: ${detail}. Check SMTP settings in .env.`)
  }
}

/**
 * Deliver OTP email via real SMTP.
 * Demo fallback only when SMTP_ALLOW_DEMO=true.
 */
export async function sendOtpEmail({ to, otp, purpose = 'complete verification', subject }) {
  const title = 'Your SMS security code'
  const html = buildEmailHtml({ title, code: otp, purpose, codeLabel: 'one-time password' })
  const text = `Your School Management System OTP is ${otp}. It expires in 10 minutes.`
  const mailSubject = subject || 'SMS security code · Email OTP'
  return deliverMail({
    to,
    subject: mailSubject,
    html,
    text,
    demoCode: otp,
    purpose,
    logLabel: 'OTP',
  })
}

/** Admin login: email OTP + 7-char special key (e.g. lok@010) in one mail */
export async function sendAdminLoginKeyEmail({
  to,
  loginKey,
  otp,
  purpose = 'sign in as school admin',
}) {
  const title = 'Your admin login codes'
  const html = `<!doctype html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6fb;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e6ebf5">
    <h2 style="margin:0 0 8px;color:#111b33">${title}</h2>
    <p style="color:#5c6b8c;line-height:1.5">Enter <strong>both</strong> codes to ${purpose}. They expire in 10 minutes. The special key changes on every login.</p>
    <p style="margin:18px 0 6px;color:#5c6b8c;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">Email OTP</p>
    <div style="padding:16px;border-radius:12px;background:#10182f;color:#fff;text-align:center;font-size:28px;letter-spacing:8px;font-weight:700">${otp}</div>
    <p style="margin:18px 0 6px;color:#5c6b8c;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">Special key (7 characters)</p>
    <div style="padding:16px;border-radius:12px;background:#1b2a55;color:#fff;text-align:center;font-size:24px;letter-spacing:3px;font-weight:700">${loginKey}</div>
    <p style="color:#8b97b3;font-size:13px;margin-top:16px">If you did not request this, ignore this email.</p>
    <p style="color:#1b2a55;font-weight:700;margin-top:18px">School Management System · Security Desk</p>
  </div>
</body></html>`
  const text = `Admin login codes:\nOTP: ${otp}\nSpecial key: ${loginKey}\nBoth are required. They expire in 10 minutes. Special key changes every login.`
  return deliverMail({
    to,
    subject: 'SMS Admin Login · OTP + Special Key',
    html,
    text,
    demoCode: `OTP ${otp} · KEY ${loginKey}`,
    purpose,
    logLabel: 'Admin OTP+key',
  })
}

function saveDemoDelivery({ to, otp, purpose, mailSubject, html, text, smtpError = null }) {
  const outbox = readJson(OUTBOX_FILE, [])
  writeJson(OUTBOX_FILE, [
    {
      id: `MAIL-${Date.now()}`,
      to,
      subject: mailSubject,
      purpose,
      otp,
      html,
      text,
      delivery: 'demo',
      smtpError,
      createdAt: new Date().toISOString(),
    },
    ...outbox,
  ].slice(0, 100))

  console.log(`[email-otp] DEMO → ${to} · OTP ${otp}`)

  return {
    delivery: 'demo',
    maskedEmail: maskEmail(to),
    demoOtp: otp,
    message: `Demo mode: OTP shown on screen for ${maskEmail(to)}.`,
  }
}

export function savePending(key, payload) {
  const all = readJson(PENDING_FILE, {})
  all[key] = { ...payload, updatedAt: Date.now() }
  writeJson(PENDING_FILE, all)
}

export function readPending(key) {
  const all = readJson(PENDING_FILE, {})
  return all[key] || null
}

export function clearPending(key) {
  const all = readJson(PENDING_FILE, {})
  delete all[key]
  writeJson(PENDING_FILE, all)
}

export function pendingKey(purpose, email) {
  return `${purpose}:${String(email).trim().toLowerCase()}`
}
