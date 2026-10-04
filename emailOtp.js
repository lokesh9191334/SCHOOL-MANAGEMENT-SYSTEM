import bcrypt from 'bcryptjs'
import fs from 'fs'
import nodemailer from 'nodemailer'
import { join } from 'node:path'
import process from 'node:process'
import { getDataDirectory } from './vercelBlobStore.js'

const dataDir = getDataDirectory()
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

export function wasRecipientAccepted(info, email) {
  const normalizedEmail = String(email).trim().toLowerCase()
  return Array.isArray(info?.accepted) && info.accepted.some(
    (recipient) => String(recipient).trim().toLowerCase() === normalizedEmail,
  )
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
    const result = await transporter.sendMail({
      from: smtp.from,
      to,
      subject: mailSubject,
      text,
      html,
    })
    if (!wasRecipientAccepted(result, to)) {
      throw new Error(`The mail server did not accept the recipient ${maskEmail(to)}.`)
    }

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
      message: `Your email provider accepted the OTP message for ${maskEmail(to)}. Delivery may take a few minutes; check your inbox, spam and Promotions folders.`,
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

    throw new Error(`Could not send email: ${detail}. Check SMTP settings in .env.`, { cause: err })
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatLocation(geo) {
  if (!geo || !Number.isFinite(Number(geo.lat)) || !Number.isFinite(Number(geo.lon))) {
    return 'Location unavailable'
  }
  const label = [geo.city, geo.region, geo.country].map((part) => String(part || '').trim()).filter(Boolean).join(', ')
  const coords = `${Number(geo.lat).toFixed(4)}, ${Number(geo.lon).toFixed(4)}`
  let source = 'IP-based, server-verified'
  if (geo.source === 'gps') {
    source = geo.verified ? 'device GPS, verified against IP' : 'device-reported, unverified'
  }
  return `${label ? `${label} · ` : ''}${coords} (${source})`
}

/**
 * Security alert for a high-risk successful login. Never throws —
 * a failed alert must not break the login flow.
 */
export async function sendSecurityAlertEmail({ to, event }) {
  const flags = Array.isArray(event?.flags) ? event.flags : []
  const when = event?.at ? new Date(event.at).toLocaleString() : new Date().toLocaleString()
  const location = formatLocation(event?.geo)
  const mapLink =
    event?.geo && Number.isFinite(Number(event.geo.lat))
      ? `https://www.google.com/maps?q=${Number(event.geo.lat)},${Number(event.geo.lon)}`
      : ''

  const row = (label, value) => `
    <tr>
      <td style="padding:10px 14px;color:#8b97b3;font-size:13px;border-bottom:1px solid #f0f3fa;white-space:nowrap">${escapeHtml(label)}</td>
      <td style="padding:10px 14px;color:#111b33;font-size:13px;font-weight:600;border-bottom:1px solid #f0f3fa">${value}</td>
    </tr>`

  const html = `<!doctype html>
<html><body style="font-family:Segoe UI,Arial,sans-serif;background:#fdf4f4;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:0;border:1px solid #f3d6d6;overflow:hidden">
    <div style="background:#7f1d1d;padding:22px 28px">
      <p style="margin:0;color:#fecaca;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">SMS · Security Alert</p>
      <h2 style="margin:6px 0 0;color:#fff;font-size:20px">High-risk login detected</h2>
    </div>
    <div style="padding:22px 28px">
      <p style="color:#5c6b8c;line-height:1.5;margin:0 0 16px">
        A successful sign-in on your account matched our high-risk rules. If this was you, no action is needed.
        If not, change your password immediately and review Login Tracks in the dashboard.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f0f3fa;border-radius:12px;overflow:hidden">
        ${row('When', escapeHtml(when))}
        ${row('Account', escapeHtml(event?.email || '—'))}
        ${row('Role', escapeHtml(event?.role || '—'))}
        ${row('IP address', escapeHtml(event?.ip || '—'))}
        ${row('Device', escapeHtml(`${event?.device?.browser || 'Unknown'} on ${event?.device?.os || 'Unknown'} (${event?.device?.type || 'unknown'})`))}
        ${row('Location', escapeHtml(location))}
        ${mapLink ? row('Map', `<a href="${escapeHtml(mapLink)}" style="color:#1b2a55">Open in Google Maps</a>`) : ''}
      </table>
      <p style="margin:18px 0 6px;color:#8b97b3;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">Why it was flagged</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#7f1d1d;font-size:13px;line-height:1.7">
        ${flags.map((f) => `<li><strong>${escapeHtml(f.label)}</strong> — ${escapeHtml(f.detail)}</li>`).join('') || '<li>Unusual activity pattern</li>'}
      </ul>
      <p style="color:#8b97b3;font-size:12px;margin:18px 0 0">Risk score ${escapeHtml(event?.score ?? '—')} / 100 · This alert is sent at most once every 30 minutes per account.</p>
      <p style="color:#1b2a55;font-weight:700;margin-top:16px">School Management System · Security Desk</p>
    </div>
  </div>
</body></html>`

  const text = [
    'SMS SECURITY ALERT — High-risk login detected',
    `When: ${when}`,
    `Account: ${event?.email || '—'} (${event?.role || '—'})`,
    `IP: ${event?.ip || '—'}`,
    `Device: ${event?.device?.browser || 'Unknown'} on ${event?.device?.os || 'Unknown'}`,
    `Location: ${location}`,
    mapLink ? `Map: ${mapLink}` : '',
    `Flags: ${flags.map((f) => f.label).join(', ') || 'Unusual activity pattern'}`,
    'If this was not you, change your password immediately.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const mail = await deliverMail({
      to,
      subject: 'SMS Security Alert · High-risk login detected',
      html,
      text,
      demoCode: null,
      purpose: 'security-alert',
      logLabel: 'Security alert',
    })
    return { sent: true, delivery: mail.delivery }
  } catch (err) {
    console.error('[email] security alert failed:', err?.message || err)
    return { sent: false, error: err?.message || String(err) }
  }
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
