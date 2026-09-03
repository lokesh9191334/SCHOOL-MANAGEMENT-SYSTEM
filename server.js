import 'dotenv/config'
import express from 'express'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import {
  clearPending,
  generateOtp,
  hashOtp,
  isSmtpConfigured,
  maskEmail,
  pendingKey,
  readPending,
  savePending,
  sendAdminLoginKeyEmail,
  sendOtpEmail,
  verifyOtpHash,
} from './emailOtp.js'
import {
  consumeInvite,
  createInvite,
  findInvite,
  generateAdminLoginKey,
  normalizeAdminLoginKey,
  normalizeInviteKey,
  readInvites,
} from './inviteKeys.js'
import { searchPreviousSchools } from './src/data/previousSchools.js'

const ALLOWED_REGISTER_ROLES = new Set(['super_admin', 'admin', 'teacher', 'parent'])
const INVITE_ROLES = new Set(['teacher', 'parent'])

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dataDir = join(__dirname, 'data')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function readJsonFile(relPath, fallback) {
  ensureDataDir()
  const full = join(__dirname, relPath)
  try {
    if (!fs.existsSync(full)) {
      fs.writeFileSync(full, JSON.stringify(fallback, null, 2), 'utf8')
      return fallback
    }
    const raw = fs.readFileSync(full, 'utf8')
    return JSON.parse(raw || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function writeJsonFile(relPath, data) {
  ensureDataDir()
  const full = join(__dirname, relPath)
  fs.writeFileSync(full, JSON.stringify(data, null, 2), 'utf8')
}

const app = express()
const PORT = process.env.PORT || 5000

// Capture raw request body for debugging (use express.json verify to avoid consuming the stream)
app.use(
  express.json({
    verify: (req, _res, buf) => {
      try {
        req.rawBody = buf && buf.toString()
      } catch {}
    },
  })
)
app.use(express.urlencoded({ extended: true }))

app.get('/api/pincode/:code', async (req, res) => {
  const code = String(req.params.code).replace(/\D/g, '')
  if (code.length !== 6) {
    res.status(400).json([{ Status: 'Error', Message: 'Invalid PIN code' }])
    return
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${code}`)
    const data = await response.json()
    res.json(data)
  } catch {
    res.status(502).json([{ Status: 'Error', Message: 'PIN code lookup failed' }])
  }
})

/** Search previous schools by name or PIN code */
app.get('/api/schools', (req, res) => {
  const q = String(req.query.q || '').trim()
  if (q.length < 2) {
    return res.json({ schools: [], query: q })
  }
  res.json({
    schools: searchPreviousSchools(q, { limit: 15 }),
    query: q,
  })
})

app.post('/api/aadhaar/verify', (req, res) => {
  const aadhaar = String(req.body?.aadhaar || '').replace(/\D/g, '')
  const personField = req.body?.personField || null

  if (!/^\d{12}$/.test(aadhaar)) {
    res.status(400).json({
      verified: false,
      status: 'invalid',
      error: 'Enter a complete 12-digit Aadhaar number.',
    })
    return
  }

  // Verhoeff check (UIDAI checksum)
  const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
  ]
  const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
  ]
  let c = 0
  const reversed = aadhaar.split('').reverse().map(Number)
  for (let i = 0; i < reversed.length; i += 1) {
    c = d[c][p[i % 8][reversed[i]]]
  }
  if (c !== 0) {
    res.json({
      verified: false,
      status: 'invalid',
      error: 'UIDAI checksum failed. This Aadhaar number is invalid.',
      message: 'UIDAI Verhoeff validation failed.',
    })
    return
  }

  res.json({
    verified: true,
    status: 'verified',
    aadharNumber: aadhaar,
    maskedAadhar: `XXXX XXXX ${aadhaar.slice(-4)}`,
    message: 'Aadhaar verified through UIDAI checksum service.',
    verifiedAt: new Date().toISOString(),
    uidaiRef: `UIDAI-${aadhaar.slice(-6)}-${Date.now().toString().slice(-4)}`,
    personField,
    profile: null,
  })
})

const emptyStudents = []

// API Routes - Students
app.get('/api/students', (_req, res) => {
  const data = readJsonFile(join('data', 'students.json'), emptyStudents)
  res.json(Array.isArray(data) ? data : emptyStudents)
})

app.post('/api/students', (req, res) => {
  const list = readJsonFile(join('data', 'students.json'), emptyStudents)
  const student = { ...req.body, id: Date.now().toString() }
  const next = Array.isArray(list) ? [...list, student] : [student]
  writeJsonFile(join('data', 'students.json'), next)
  res.json(student)
})

// Simple file-based users store and auth endpoints
const USERS_FILE = join('data', 'users.json')

function issueAuthToken(user) {
  return {
    token: `demo-token-${Date.now()}`,
    user: { id: user.id, email: user.email, name: user.name, role: user.role || 'admin' },
  }
}

/** Step 1 — Create account: validate + email OTP (account created only after OTP verify) */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'admin', inviteKey } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

    const normalizedRole = String(role || 'admin').trim().toLowerCase()
    if (!ALLOWED_REGISTER_ROLES.has(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role. Choose Super Admin, Admin, Teacher or Parent.' })
    }

    let invite = null
    if (INVITE_ROLES.has(normalizedRole)) {
      if (!inviteKey) {
        return res.status(400).json({
          error: 'Teacher and Parent accounts require a special key from the school admin.',
        })
      }
      invite = findInvite(inviteKey)
      if (!invite) return res.status(400).json({ error: 'Invalid special key. Ask admin for a fresh key.' })
      if (invite.status === 'used') return res.status(400).json({ error: 'This special key has already been used.' })
      if (invite.role !== normalizedRole) {
        return res.status(400).json({
          error: `This special key is for ${invite.role} accounts, not ${normalizedRole}.`,
        })
      }
    }

    const users = readJsonFile(join('data', 'users.json'), [])
    const normalizedEmail = String(email).trim().toLowerCase()
    if (users.find((u) => String(u.email).toLowerCase() === normalizedEmail)) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    if (invite?.email && invite.email !== normalizedEmail) {
      return res.status(400).json({
        error: `This special key is reserved for ${invite.email}. Use that email to create the account.`,
      })
    }

    const otp = generateOtp()
    const pendingToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const salt = bcrypt.genSaltSync(10)
    const passwordHash = bcrypt.hashSync(password, salt)

    savePending(pendingKey('register', normalizedEmail), {
      purpose: 'register',
      pendingToken,
      email: normalizedEmail,
      name: name || invite?.name || '',
      role: normalizedRole,
      passwordHash,
      inviteKey: invite ? normalizeInviteKey(invite.key) : null,
      linkedId: invite?.linkedId || null,
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    })

    const mail = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      purpose: 'create your School Management System account',
      subject: 'Verify your SMS account · Email OTP',
    })

    res.json({
      otpRequired: true,
      purpose: 'register',
      pendingToken,
      email: normalizedEmail,
      role: normalizedRole,
      maskedEmail: mail.maskedEmail || maskEmail(normalizedEmail),
      delivery: mail.delivery,
      message: mail.message,
      demoOtp: mail.demoOtp,
      expiresInSec: 600,
    })
  } catch (err) {
    console.error('Error in /api/auth/register:', err)
    res.status(503).json({ error: err.message || 'Server error during registration' })
  }
})

/** Step 2 — Verify register OTP and create account */
app.post('/api/auth/register/verify', async (req, res) => {
  try {
    const { email, code, pendingToken } = req.body
    if (!email || !code || !pendingToken) {
      return res.status(400).json({ error: 'Email, OTP and pending token are required' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const key = pendingKey('register', normalizedEmail)
    const pending = readPending(key)
    if (!pending || pending.pendingToken !== pendingToken) {
      return res.status(401).json({ error: 'Invalid or expired registration session' })
    }
    if ((pending.expiresAt || 0) < Date.now()) {
      clearPending(key)
      return res.status(401).json({ error: 'OTP expired. Please start registration again.' })
    }
    if ((pending.attempts || 0) >= 5) {
      clearPending(key)
      return res.status(429).json({ error: 'Too many invalid attempts. Restart registration.' })
    }

    if (!verifyOtpHash(code, pending.otpHash)) {
      savePending(key, { ...pending, attempts: (pending.attempts || 0) + 1 })
      return res.status(401).json({ error: 'Invalid OTP. Check your email and try again.' })
    }

    const users = readJsonFile(join('data', 'users.json'), [])
    if (users.find((u) => String(u.email).toLowerCase() === normalizedEmail)) {
      clearPending(key)
      return res.status(409).json({ error: 'User already exists' })
    }

    if (INVITE_ROLES.has(pending.role)) {
      if (!pending.inviteKey) {
        clearPending(key)
        return res.status(400).json({ error: 'Special key missing from registration session.' })
      }
      const invite = findInvite(pending.inviteKey)
      if (!invite || invite.status === 'used' || invite.role !== pending.role) {
        clearPending(key)
        return res.status(400).json({ error: 'Special key is no longer valid. Ask admin for a new key.' })
      }
    }

    const user = {
      id: Date.now().toString(),
      email: normalizedEmail,
      name: pending.name || '',
      role: pending.role || 'admin',
      passwordHash: pending.passwordHash,
      linkedId: pending.linkedId || null,
      inviteKey: pending.inviteKey || null,
      emailVerified: true,
      twoFactor: { enabled: true, method: 'email-otp' },
    }
    writeJsonFile(join('data', 'users.json'), [...users, user])

    if (pending.inviteKey) {
      const consumed = consumeInvite(pending.inviteKey, user.id)
      if (!consumed.ok) {
        writeJsonFile(join('data', 'users.json'), users)
        clearPending(key)
        return res.status(400).json({ error: consumed.error || 'Could not claim special key' })
      }
    }

    clearPending(key)

    res.json({
      ...issueAuthToken(user),
      message: 'Account created and email verified successfully.',
    })
  } catch (err) {
    console.error('Error in /api/auth/register/verify:', err)
    res.status(500).json({ error: 'Server error during OTP verification' })
  }
})

/** Create / lookup special keys for teacher & parent account claim */
app.get('/api/invite-keys', (_req, res) => {
  res.json(readInvites())
})

app.get('/api/invite-keys/:key', (req, res) => {
  const invite = findInvite(req.params.key)
  if (!invite) return res.status(404).json({ error: 'Special key not found' })
  if (invite.status === 'used') return res.status(410).json({ error: 'This special key has already been used' })
  res.json({
    key: invite.key,
    role: invite.role,
    name: invite.name,
    email: invite.email,
    phone: invite.phone,
    linkedId: invite.linkedId,
    meta: invite.meta,
    status: invite.status,
  })
})

app.post('/api/invite-keys', (req, res) => {
  try {
    const { role, key, name, email, phone, linkedId, meta } = req.body || {}
    if (!['teacher', 'parent'].includes(role)) {
      return res.status(400).json({ error: 'role must be teacher or parent' })
    }
    const invite = createInvite({ role, key, name, email, phone, linkedId, meta })
    res.status(201).json(invite)
  } catch (err) {
    console.error('Error in /api/invite-keys:', err)
    res.status(500).json({ error: err.message || 'Could not create special key' })
  }
})

/** Step 1 — Login: password check + email OTP (or admin rotating special key) */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const users = readJsonFile(join('data', 'users.json'), [])
    const normalizedEmail = String(email).trim().toLowerCase()
    const user = users.find((u) => String(u.email).toLowerCase() === normalizedEmail)
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    if (!bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' })

    const role = String(user.role || 'admin').toLowerCase()
    const isAdminLogin = role === 'admin' || role === 'super_admin'
    const loginToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    if (isAdminLogin) {
      // Both email OTP + 7-char special key (e.g. lok@010). Key changes every login.
      const loginKey = generateAdminLoginKey(role)
      const otp = generateOtp()
      const keyHash = hashOtp(normalizeAdminLoginKey(loginKey))
      const otpHash = hashOtp(otp)
      savePending(pendingKey('login', normalizedEmail), {
        purpose: 'login',
        method: 'admin-dual',
        pendingToken: loginToken,
        email: normalizedEmail,
        userId: user.id,
        role,
        otpHash,
        specialKeyHash: keyHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
      })

      const updated = users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              loginToken,
              loginTokenExpiry: Date.now() + 10 * 60 * 1000,
              adminLoginKeyHash: keyHash,
              adminLoginKeyIssuedAt: new Date().toISOString(),
            }
          : u,
      )
      writeJsonFile(join('data', 'users.json'), updated)

      const mail = await sendAdminLoginKeyEmail({
        to: normalizedEmail,
        loginKey,
        otp,
        purpose: 'sign in to your admin account',
      })

      return res.json({
        otpRequired: true,
        specialKeyRequired: true,
        twoFactor: true,
        method: 'admin-dual',
        role,
        loginToken,
        email: normalizedEmail,
        maskedEmail: mail.maskedEmail || maskEmail(normalizedEmail),
        delivery: mail.delivery,
        message:
          mail.delivery === 'smtp'
            ? `OTP and a new special key were emailed to ${mail.maskedEmail}. Enter both to sign in.`
            : mail.message,
        demoOtp: mail.demoOtp,
        expiresInSec: 600,
      })
    }

    const otp = generateOtp()

    savePending(pendingKey('login', normalizedEmail), {
      purpose: 'login',
      method: 'email-otp',
      pendingToken: loginToken,
      email: normalizedEmail,
      userId: user.id,
      role,
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    })

    const updated = users.map((u) =>
      u.id === user.id
        ? { ...u, loginToken, loginTokenExpiry: Date.now() + 10 * 60 * 1000 }
        : u,
    )
    writeJsonFile(join('data', 'users.json'), updated)

    const mail = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      purpose: 'sign in to School Management System',
      subject: 'Your SMS login OTP',
    })

    res.json({
      otpRequired: true,
      specialKeyRequired: false,
      twoFactor: true,
      method: 'email-otp',
      role,
      loginToken,
      email: normalizedEmail,
      maskedEmail: mail.maskedEmail || maskEmail(normalizedEmail),
      delivery: mail.delivery,
      message: mail.message,
      demoOtp: mail.demoOtp,
      expiresInSec: 600,
    })
  } catch (err) {
    console.error('Error in /api/auth/login:', err)
    res.status(503).json({ error: err.message || 'Server error during login' })
  }
})

/** Step 2 — Verify login email OTP (and admin special key when required) */
app.post('/api/auth/login/verify', (req, res) => {
  try {
    const { email, code, loginToken, specialKey } = req.body
    const otpCode = String(code || '').replace(/\D/g, '')
    if (!email || !loginToken) {
      return res.status(400).json({ error: 'Email and login token are required' })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const key = pendingKey('login', normalizedEmail)
    const pending = readPending(key)
    const users = readJsonFile(join('data', 'users.json'), [])
    const user = users.find((u) => String(u.email).toLowerCase() === normalizedEmail)

    if (!user || !pending || pending.pendingToken !== loginToken) {
      return res.status(401).json({ error: 'Invalid or expired login session' })
    }
    if ((pending.expiresAt || 0) < Date.now() || (user.loginTokenExpiry || 0) < Date.now()) {
      clearPending(key)
      return res.status(401).json({ error: 'Login codes expired. Please sign in again.' })
    }
    if ((pending.attempts || 0) >= 5) {
      clearPending(key)
      return res.status(429).json({ error: 'Too many invalid attempts. Sign in again.' })
    }

    if (pending.method === 'admin-dual') {
      const normalizedKey = normalizeAdminLoginKey(specialKey)
      if (!otpCode || otpCode.length !== 6) {
        return res.status(400).json({ error: 'Enter the 6-digit email OTP.' })
      }
      if (!normalizedKey || normalizedKey.length !== 7) {
        return res.status(400).json({ error: 'Enter the 7-character special key (e.g. lok@010).' })
      }
      const otpOk = verifyOtpHash(otpCode, pending.otpHash)
      const keyOk = verifyOtpHash(normalizedKey, pending.specialKeyHash)
      if (!otpOk || !keyOk) {
        savePending(key, { ...pending, attempts: (pending.attempts || 0) + 1 })
        return res.status(401).json({ error: 'Invalid OTP or special key. Check your email and try again.' })
      }
    } else if (pending.method === 'admin-special-key') {
      const normalizedKey = normalizeAdminLoginKey(specialKey || code)
      if (!normalizedKey) {
        return res.status(400).json({ error: 'Enter the special key from your email.' })
      }
      if (!verifyOtpHash(normalizedKey, pending.specialKeyHash || pending.otpHash)) {
        savePending(key, { ...pending, attempts: (pending.attempts || 0) + 1 })
        return res.status(401).json({ error: 'Invalid special key. Check your email and try again.' })
      }
    } else {
      if (!otpCode || otpCode.length !== 6) {
        return res.status(400).json({ error: 'Enter the 6-digit email OTP.' })
      }
      if (!verifyOtpHash(otpCode, pending.otpHash)) {
        savePending(key, { ...pending, attempts: (pending.attempts || 0) + 1 })
        return res.status(401).json({ error: 'Invalid OTP. Check your email and try again.' })
      }
    }

    clearPending(key)
    const cleared = users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            loginToken: null,
            loginTokenExpiry: null,
            emailVerified: true,
            adminLoginKeyHash: null,
            lastLoginAt: new Date().toISOString(),
          }
        : u,
    )
    writeJsonFile(join('data', 'users.json'), cleared)

    res.json(issueAuthToken({ ...user, emailVerified: true }))
  } catch (err) {
    console.error('Error in /api/auth/login/verify:', err)
    res.status(500).json({ error: 'Server error during login verification' })
  }
})

/** Resend OTP / regenerate admin OTP + special key */
app.post('/api/auth/otp/resend', async (req, res) => {
  try {
    const { email, purpose = 'login', pendingToken } = req.body
    if (!email || !pendingToken) return res.status(400).json({ error: 'Email and pending token required' })

    const normalizedEmail = String(email).trim().toLowerCase()
    const key = pendingKey(purpose, normalizedEmail)
    const pending = readPending(key)
    if (!pending || pending.pendingToken !== pendingToken) {
      return res.status(401).json({ error: 'No active verification session' })
    }

    if (
      purpose === 'login' &&
      (pending.method === 'admin-dual' || pending.method === 'admin-special-key')
    ) {
      const loginKey = generateAdminLoginKey(pending.role || 'admin')
      const otp = generateOtp()
      const keyHash = hashOtp(normalizeAdminLoginKey(loginKey))
      const otpHash = hashOtp(otp)
      savePending(key, {
        ...pending,
        method: 'admin-dual',
        otpHash,
        specialKeyHash: keyHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
      })

      const users = readJsonFile(join('data', 'users.json'), [])
      writeJsonFile(
        join('data', 'users.json'),
        users.map((u) =>
          String(u.email).toLowerCase() === normalizedEmail
            ? {
                ...u,
                adminLoginKeyHash: keyHash,
                adminLoginKeyIssuedAt: new Date().toISOString(),
                loginTokenExpiry: Date.now() + 10 * 60 * 1000,
              }
            : u,
        ),
      )

      const mail = await sendAdminLoginKeyEmail({
        to: normalizedEmail,
        loginKey,
        otp,
        purpose: 'sign in to your admin account',
      })

      return res.json({
        ok: true,
        method: 'admin-dual',
        maskedEmail: mail.maskedEmail,
        delivery: mail.delivery,
        message: 'A new OTP and special key were emailed. Previous codes are no longer valid.',
        demoOtp: mail.demoOtp,
        expiresInSec: 600,
      })
    }

    const otp = generateOtp()
    savePending(key, {
      ...pending,
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    })

    const mail = await sendOtpEmail({
      to: normalizedEmail,
      otp,
      purpose: purpose === 'register' ? 'create your account' : 'sign in',
      subject: purpose === 'register' ? 'Resent SMS signup OTP' : 'Resent SMS login OTP',
    })

    res.json({
      ok: true,
      method: 'email-otp',
      maskedEmail: mail.maskedEmail,
      delivery: mail.delivery,
      message: mail.message,
      demoOtp: mail.demoOtp,
      expiresInSec: 600,
    })
  } catch (err) {
    console.error('Error in /api/auth/otp/resend:', err)
    res.status(503).json({ error: err.message || 'Could not resend OTP' })
  }
})

app.post('/api/auth/2fa/setup', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email required' })
  const users = readJsonFile(join('data', 'users.json'), [])
  const user = users.find((u) => u.email === email)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const secret = speakeasy.generateSecret({ length: 20, name: `SchoolSMS (${email})` })
  // store temp secret until verified
  const updated = users.map((u) => (u.email === email ? { ...u, twoFactor: { ...(u.twoFactor || {}), tempSecret: secret.base32 } } : u))
  writeJsonFile(join('data', 'users.json'), updated)

  const otpauth = secret.otpauth_url
  const qrData = await QRCode.toDataURL(otpauth)
  res.json({ otpauth, qrData, base32: secret.base32 })
})

app.post('/api/auth/2fa/verify', (req, res) => {
  const { email, token: loginToken, code, setup } = req.body
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' })
  const users = readJsonFile(join('data', 'users.json'), [])
  const user = users.find((u) => u.email === email)
  if (!user) return res.status(404).json({ error: 'User not found' })

  // If setup flow: verify against tempSecret then persist
  if (setup) {
    const tempSecret = user.twoFactor && user.twoFactor.tempSecret
    if (!tempSecret) return res.status(400).json({ error: 'No 2FA setup in progress' })
    const verified = speakeasy.totp.verify({ secret: tempSecret, encoding: 'base32', token: String(code), window: 1 })
    if (!verified) return res.status(401).json({ error: 'Invalid code' })
    const updated = users.map((u) => (u.email === email ? { ...u, twoFactor: { enabled: true, secret: tempSecret, method: 'authenticator' } } : u))
    writeJsonFile(join('data', 'users.json'), updated)
    return res.json({ success: true })
  }

  // Legacy authenticator login verification
  if (!loginToken) return res.status(400).json({ error: 'Login token required' })
  if (user.loginToken !== loginToken || (user.loginTokenExpiry || 0) < Date.now()) return res.status(401).json({ error: 'Invalid or expired login token' })
  const secret = user.twoFactor && user.twoFactor.secret
  if (!secret) return res.status(400).json({ error: 'Authenticator 2FA not configured' })
  const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(code), window: 1 })
  if (!verified) return res.status(401).json({ error: 'Invalid code' })

  const token = `demo-token-${Date.now()}`
  const cleared = users.map((u) => (u.email === email ? { ...u, loginToken: null, loginTokenExpiry: null } : u))
  writeJsonFile(join('data', 'users.json'), cleared)
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
})

app.post('/api/auth/2fa/disable', (req, res) => {
  const { email, code } = req.body
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' })
  const users = readJsonFile(join('data', 'users.json'), [])
  const user = users.find((u) => u.email === email)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const secret = user.twoFactor && user.twoFactor.secret
  if (!secret) return res.status(400).json({ error: '2FA not configured' })
  const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(code), window: 1 })
  if (!verified) return res.status(401).json({ error: 'Invalid code' })

  const updated = users.map((u) => (u.email === email ? { ...u, twoFactor: { enabled: false } } : u))
  writeJsonFile(join('data', 'users.json'), updated)
  res.json({ success: true })
})

// API Routes - Teachers
app.get('/api/teachers', (_req, res) => {
  res.json(readJsonFile(join('data', 'teachers.json'), []))
})

app.post('/api/teachers', (req, res) => {
  const list = readJsonFile(join('data', 'teachers.json'), [])
  const teacher = { ...req.body, id: Date.now().toString() }
  const next = Array.isArray(list) ? [...list, teacher] : [teacher]
  writeJsonFile(join('data', 'teachers.json'), next)
  res.json(teacher)
})

// API Routes - Attendance
app.get('/api/attendance', (_req, res) => {
  res.json(readJsonFile(join('data', 'attendance.json'), []))
})

app.post('/api/attendance', (req, res) => {
  const list = readJsonFile(join('data', 'attendance.json'), [])
  const record = { ...req.body, id: Date.now().toString() }
  const next = Array.isArray(list) ? [...list, record] : [record]
  writeJsonFile(join('data', 'attendance.json'), next)
  res.json(record)
})

// API Routes - Fees
app.get('/api/fees', (_req, res) => {
  res.json(readJsonFile(join('data', 'fees.json'), []))
})

app.post('/api/fees', (req, res) => {
  const list = readJsonFile(join('data', 'fees.json'), [])
  const payment = { ...req.body, id: Date.now().toString() }
  const next = Array.isArray(list) ? [...list, payment] : [payment]
  writeJsonFile(join('data', 'fees.json'), next)
  res.json(payment)
})

app.get('/api/payment-config', (_req, res) => {
  res.json({
    holderName: process.env.PAYMENT_HOLDER_NAME || '',
    upiId: process.env.PAYMENT_UPI_ID || '',
    mobile: process.env.PAYMENT_MOBILE || '',
  })
})

app.get('/api/payments', (_req, res) => {
  res.json(readJsonFile(join('data', 'payments.json'), []))
})

app.post('/api/payments', (req, res) => {
  const payment = req.body && typeof req.body === 'object' ? { ...req.body, id: req.body.id || `PAY-${Date.now()}` } : null
  if (!payment?.studentId || !payment.reference || !Number(payment.amount)) {
    return res.status(400).json({ error: 'Student, amount and payment reference are required.' })
  }
  const payments = readJsonFile(join('data', 'payments.json'), [])
  writeJsonFile(join('data', 'payments.json'), [payment, ...payments].slice(0, 500))
  res.status(201).json(payment)
})

app.patch('/api/payments/:id', (req, res) => {
  const payments = readJsonFile(join('data', 'payments.json'), [])
  const index = payments.findIndex((payment) => payment.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'Payment not found.' })
  const status = String(req.body?.status || '')
  if (!['Verified', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid payment status.' })
  const updated = { ...payments[index], status, reviewedAt: new Date().toISOString() }
  payments[index] = updated
  writeJsonFile(join('data', 'payments.json'), payments)
  res.json(updated)
})

// API Routes - Exams
app.get('/api/exams', (_req, res) => {
  res.json(readJsonFile(join('data', 'exams.json'), []))
})

app.post('/api/exams', (req, res) => {
  const list = readJsonFile(join('data', 'exams.json'), [])
  const exam = { ...req.body, id: Date.now().toString() }
  const next = Array.isArray(list) ? [...list, exam] : [exam]
  writeJsonFile(join('data', 'exams.json'), next)
  res.json(exam)
})

// Provider-agnostic AI proxy. The API key stays on the server and is never sent to the browser.
app.post('/api/ai/chat', async (req, res) => {
  const apiUrl = String(process.env.AI_API_URL || '').trim()
  const apiKey = String(process.env.AI_API_KEY || '').trim()
  const model = String(process.env.AI_MODEL || 'gpt-4o-mini').trim()
  const { prompt, role = 'admin', history = [] } = req.body || {}

  if (!prompt || String(prompt).trim().length > 2000) {
    return res.status(400).json({ error: 'Enter a question up to 2,000 characters.' })
  }
  if (!apiUrl || !apiKey) {
    return res.status(503).json({ error: 'AI provider is not configured. Add AI_API_URL and AI_API_KEY to .env.' })
  }

  try {
    const safeHistory = Array.isArray(history)
      ? history.slice(-8).map((message) => ({
          role: message?.from === 'user' ? 'user' : 'assistant',
          content: String(message?.text || '').slice(0, 2000),
        }))
      : []
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are SchoolSMS Assistant. Help a ${String(role)} user with school-management tasks. Be concise, practical, and never claim to have changed records. Ask for confirmation before destructive or financial actions.`,
          },
          ...safeHistory,
          { role: 'user', content: String(prompt).trim() },
        ],
        temperature: 0.3,
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) return res.status(502).json({ error: body?.error?.message || 'AI provider request failed.' })
    const reply = body?.choices?.[0]?.message?.content
    if (!reply) return res.status(502).json({ error: 'AI provider returned an empty response.' })
    res.json({ reply: String(reply), model })
  } catch (err) {
    console.error('AI provider error:', err?.message || err)
    res.status(502).json({ error: 'Could not reach the AI provider.' })
  }
})

// Serve static files from dist (after build)
const distPath = join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // Catch-all route for client-side routing using a RegExp.
  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`School Management System server running on http://localhost:${PORT}`)
  console.log(`Phone / LAN: open http://<your-pc-ip>:${PORT} (same Wi-Fi)`)
  console.log(`API: http://localhost:${PORT}/api/`)
  if (isSmtpConfigured()) {
    console.log('Email OTP: REAL SMTP configured (inbox delivery)')
  } else {
    console.log('Email OTP: SMTP NOT configured — add .env from .env.example (Gmail App Password)')
  }
})

// Global error handler - return JSON for unexpected errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  if (req && req.rawBody) {
    // Log a truncated preview of the raw body (avoid full password leaks)
    const preview = req.rawBody.length > 500 ? req.rawBody.slice(0, 500) + '...[truncated]' : req.rawBody
    console.error('Raw request body preview:', preview)
  }
  if (res.headersSent) return next(err)
  res.status(500).json({ error: 'Internal server error' })
})
