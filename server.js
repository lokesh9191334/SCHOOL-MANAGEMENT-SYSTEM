import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { fileURLToPath } from 'url'
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import fs from 'fs'
// Imported before vercelBlobStore.js on purpose: on Netlify this module
// sets DATA_DIR to the per-invocation /tmp copy before any module below
// resolves getDataDirectory().
import {
  isNetlifyRuntime,
  netlifyBlobDataMiddleware,
} from './netlifyBlobStore.js'
import {
  getDataDirectory,
  hasVercelBlobCredentials,
  vercelBlobDataMiddleware,
} from './vercelBlobStore.js'
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
  sendEventEmail,
  sendLeaveDecisionEmail,
  sendOtpEmail,
  sendStudentLeaveDecisionEmail,
  sendStudentLeaveRequestEmail,
  sendOverspeedAlertEmail,
  sendParentAttendanceEmail,
  sendResultEmail,
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
import {
  computeAnalytics,
  getClientIp,
  listKnownDevices,
  listTracks,
  listWatchlist,
  markReviewed,
  recordLoginEvent,
  setDeviceTrust,
  setWatchlistEntry,
  summarizeTracks,
} from './loginTracks.js'
import {
  ATTENDANCE_COOLDOWN_MS,
  assertLiveFrames,
  FACE_ENROLL_UNIQUENESS_THRESHOLD,
  FACE_LOGIN_FRAMES,
  enrollmentConflict,
  findBestMatch,
  findDuplicateFaces,
  isLate,
  isValidDescriptor,
  isValidPhotoThumb,
  istParts,
  lastRecordFor,
  matchPercent,
  nextAttendanceType,
  normalizeEmail,
  sanitizeLocation,
  strictMatchFrames,
  validDescriptors,
} from './faceAttendance.js'
import {
  generateTrackingKey,
  isTrackOnline,
  normalizeTrackKey,
  OVERSPEED_END_MS,
  OVERSPEED_EVENT_WINDOW_MS,
  OVERSPEED_LIMIT_KMH,
  sanitizeDevice,
  sanitizeFix,
  smoothSpeedKmh,
  speedReading,
  trailPoint,
  TRACK_MIN_PING_GAP_MS,
  TRACK_STALE_MS,
  TRACK_TRAIL_MAX,
  TRACKING_KEYS_MAX,
} from './transportLive.js'
import {
  fetchRoadGeometry,
  newTransportId,
  normalizeAllocation,
  normalizeDriver,
  normalizeRoute,
  normalizeVehicle,
  routeSignature,
  straightGeometry,
  TRANSPORT_ALLOCATIONS_MAX,
  TRANSPORT_DRIVERS_MAX,
  TRANSPORT_ROUTES_MAX,
  TRANSPORT_VEHICLES_MAX,
} from './transportRoutes.js'
import {
  dailyDeliveryStamp,
  markAutoFailed,
  markAutoSent,
  runDailyWhatsApp,
} from './driverWhatsApp.js'
import {
  maskWhatsAppPhone,
  normalizeWhatsAppPhone,
  sendDailyTrackingWhatsApp,
  whatsAppConfigStatus,
} from './whatsappCloud.js'
import {
  buildSnapshot,
  chunkText,
  offlineReply,
  snapshotToContext,
  systemInstructions,
} from './aiAssistant.js'
import { academicPdfFilename, buildAcademicPdf } from './academicDocs.js'
import { collectAcademicRecipients, sendAcademicDocumentEmails } from './academicMailer.js'
import {
  computeResult,
  gradeFromPercent,
  normalizeExamTitle,
  rankResults,
  sanitizeSubjects,
} from './resultsStore.js'
import { holidayForDate } from './schoolCalendar.js'
import { buildFeeSchedule, coverFeeSchedule } from './feeSchedule.js'
import {
  leaveOverlaps,
  normalizeLeaveDecision,
  normalizeLeavePayload,
  publicLeaveRequest,
} from './leaveRequests.js'
import {
  assignmentMatchesTeacher,
  classKey,
  classLabelsFromStudents,
  normalizeClassTeacherAssignment,
  normalizeStudentLeavePayload,
  publicStudentLeaveRequest,
  studentClassLabel,
  studentLeaveSummary,
  teacherCanDecide,
  teacherClassKeys,
} from './studentLeave.js'

const ALLOWED_REGISTER_ROLES = new Set(['super_admin', 'admin', 'teacher', 'parent'])
const INVITE_ROLES = new Set(['teacher', 'parent'])

function moduleDirectory() {
  try {
    return dirname(fileURLToPath(import.meta.url))
  } catch {
    // When bundled to CJS (Netlify esbuild) import.meta.url is empty; any
    // stable base directory works because data paths resolve relative to it.
    return process.cwd()
  }
}

const __dirname = moduleDirectory()

const dataDir = getDataDirectory()

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function dataFilePath(relPath) {
  const projectDataDir = join(__dirname, 'data')
  const pathFromDataDir = relative(projectDataDir, resolve(__dirname, relPath))
  if (
    !pathFromDataDir ||
    pathFromDataDir === '..' ||
    pathFromDataDir.startsWith(`..${sep}`) ||
    isAbsolute(pathFromDataDir)
  ) {
    throw new Error('Invalid data file path')
  }
  return resolve(dataDir, pathFromDataDir)
}

function readJsonFile(relPath, fallback) {
  ensureDataDir()
  const full = dataFilePath(relPath)
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
  const full = dataFilePath(relPath)
  fs.mkdirSync(dirname(full), { recursive: true })
  fs.writeFileSync(full, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * Login tracking. Fire-and-forget locally; on serverless hosts (Vercel,
 * Netlify) the promise is awaited (capped) because data writes only persist
 * when they finish before the response is sent.
 */
const TRACK_LOGIN_TIMEOUT_MS = 3000

function trackLogin(req, payload) {
  const task = recordLoginEvent({
    ip: getClientIp(req),
    userAgent: req.headers?.['user-agent'] || '',
    geo: req.body?.geo || null,
    ...payload,
  }).catch((err) => {
    console.error('trackLogin failed:', err?.message || err)
    return null
  })
  if (isServerlessRuntime) {
    return Promise.race([task, new Promise((done) => setTimeout(done, TRACK_LOGIN_TIMEOUT_MS))])
  }
  return task
}

const app = express()
const PORT = process.env.PORT || 5000

/** True on hosted serverless platforms (Vercel / Netlify), false for local runs. */
const isServerlessRuntime = Boolean(process.env.VERCEL || isNetlifyRuntime)

function hasAuthTokenSecret() {
  return Buffer.byteLength(process.env.AUTH_TOKEN_SECRET || '') >= 32
}

function authTokenSecret() {
  if (hasAuthTokenSecret()) return process.env.AUTH_TOKEN_SECRET
  if (isServerlessRuntime) return null
  return 'local-development-only-school-management-auth-secret'
}

function signAuthPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', authTokenSecret()).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

/** Revocation guard: a token issued before the latest password change must die.
 * Stamps are cached briefly per instance so requests do not pay a users.json read each time. */
const PWD_STAMP_TTL_MS = 30 * 1000
let pwdStampCache = { at: 0, map: new Map() }
function passwordStampMap() {
  if (Date.now() - pwdStampCache.at > PWD_STAMP_TTL_MS) {
    pwdStampCache = {
      at: Date.now(),
      map: new Map(
        readJsonFile(USERS_FILE, []).map((u) => [String(u.email).toLowerCase(), u.passwordChangedAt || 0]),
      ),
    }
  }
  return pwdStampCache.map
}
function passwordStampChanged(tokenUser) {
  if (tokenUser.pwd === undefined) return false
  const current = passwordStampMap().get(String(tokenUser.email).toLowerCase())
  return (current || 0) !== (tokenUser.pwd || 0)
}

function requireRoles(...roles) {
  return (req, res, next) => {
    const header = String(req.get('authorization') || '')
    const match = header.match(/^Bearer ([A-Za-z0-9_.-]+)$/)
    const secret = authTokenSecret()
    if (!match || !secret) {
      return res.status(401).json({ error: 'Sign in is required to access this data.' })
    }

    const [encoded, providedSignature] = match[1].split('.')
    if (!encoded || !providedSignature) {
      return res.status(401).json({ error: 'Your sign-in session is invalid. Sign in again.' })
    }

    const expectedSignature = createHmac('sha256', secret).update(encoded).digest()
    let actualSignature
    try {
      actualSignature = Buffer.from(providedSignature, 'base64url')
    } catch {
      return res.status(401).json({ error: 'Your sign-in session is invalid. Sign in again.' })
    }
    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return res.status(401).json({ error: 'Your sign-in session is invalid. Sign in again.' })
    }

    let user
    try {
      user = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    } catch {
      return res.status(401).json({ error: 'Your sign-in session is invalid. Sign in again.' })
    }
    if (!user.id || !user.email || !user.role || user.expiresAt <= Date.now()) {
      return res.status(401).json({ error: 'Your sign-in session expired. Sign in again.' })
    }
    if (passwordStampChanged(user)) {
      return res.status(401).json({ error: 'Your session was revoked by a password change. Sign in again.' })
    }
    if (roles.length && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Your account does not have access to this data.' })
    }
    if (!roles.length && user.role === 'driver') {
      return res.status(403).json({ error: 'Driver accounts can only use the driver portal.' })
    }
    req.authUser = user
    next()
  }
}

app.get('/api/health', (_req, res) => {
  if (process.env.VERCEL && !hasVercelBlobCredentials()) {
    return res.status(503).json({
      status: 'error',
      error: 'Connect a private Vercel Blob store to enable persistent API storage.',
    })
  }
  if (isServerlessRuntime && !hasAuthTokenSecret()) {
    return res.status(503).json({
      status: 'error',
      error: 'Set AUTH_TOKEN_SECRET to a random secret of at least 32 characters.',
    })
  }
  if (
    isServerlessRuntime &&
    (
      !process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ||
      !process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ||
      process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD.length < 12
    )
  ) {
    return res.status(503).json({
      status: 'error',
      error: 'Set BOOTSTRAP_SUPER_ADMIN_EMAIL and a BOOTSTRAP_SUPER_ADMIN_PASSWORD of at least 12 characters.',
    })
  }
  if (isServerlessRuntime && !isSmtpConfigured()) {
    return res.status(503).json({
      status: 'error',
      error: 'Configure SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM to deliver login codes.',
    })
  }
  res.json({ status: 'ok' })
})

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
)

app.use(
  express.json({
    limit: '10mb',
  })
)

app.use(express.urlencoded({ extended: true }))
app.use(vercelBlobDataMiddleware)
app.use(netlifyBlobDataMiddleware)

app.use('/api/records', requireRoles('admin', 'super_admin', 'teacher'))
app.use('/api/students', requireRoles('admin', 'super_admin', 'teacher'))
app.use('/api/teachers', requireRoles('admin', 'super_admin'))
app.use('/api/attendance', requireRoles('admin', 'super_admin', 'teacher'))
app.use('/api/face', requireRoles('admin', 'super_admin', 'teacher', 'parent'))
app.use('/api/fees', requireRoles('admin', 'super_admin', 'teacher'))
app.use('/api/exams', requireRoles('admin', 'super_admin', 'teacher'))
app.use('/api/school-requests', requireRoles('super_admin'))
app.use('/api/payment-config', requireRoles('admin', 'super_admin', 'teacher', 'parent'))
app.use('/api/payments', requireRoles('admin', 'super_admin', 'parent'))
app.use('/api/ai/chat', requireRoles('admin', 'super_admin', 'teacher', 'parent'))

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

app.post('/api/aadhaar/verify', requireRoles('admin', 'super_admin', 'teacher'), (req, res) => {
  const aadhaar = String(req.body?.aadhaar || '').replace(/\D/g, '')

  if (!/^\d{12}$/.test(aadhaar)) {
    res.status(400).json({
      valid: false,
      status: 'invalid',
      error: 'Enter a complete 12-digit Aadhaar number.',
    })
    return
  }

  // Verhoeff check (the UIDAI checksum). This is a typo check only —
  // the app has no UIDAI connection, so it must never claim "verified".
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
      valid: false,
      status: 'invalid',
      error: 'Aadhaar checksum failed. Check the number for typos.',
    })
    return
  }

  res.json({
    valid: true,
    status: 'checksum-valid',
    maskedAadhar: `XXXX XXXX ${aadhaar.slice(-4)}`,
    message:
      'Aadhaar format and checksum are valid. This is a typo check only — the app does not verify Aadhaar with UIDAI.',
  })
})

// Attendance alert to a parent/guardian, sent from the school's SMTP account.
// Message text is built here (never taken from the request body) so the email
// content can't be tampered with.
app.post('/api/notify/parent', requireRoles('admin', 'super_admin', 'teacher'), async (req, res) => {
  const to = String(req.body?.to || '').trim()
  const studentName = String(req.body?.studentName || 'Student').slice(0, 120)
  const status = String(req.body?.status || 'Updated').slice(0, 20)
  const className = String(req.body?.className || '').slice(0, 40)
  const date = String(req.body?.date || '').slice(0, 40)
  const period = String(req.body?.period || '').slice(0, 40)

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ sent: false, error: 'A valid parent email address is required.' })
    return
  }
  if (!isSmtpConfigured()) {
    res.status(503).json({ sent: false, error: 'Email is not configured on the server (SMTP missing).' })
    return
  }

  const result = await sendParentAttendanceEmail({ to, studentName, status, className, date, period })
  if (!result.sent) {
    res.status(502).json({ sent: false, error: result.error || 'The email could not be delivered.' })
    return
  }
  res.json({ sent: true, delivery: result.delivery })
})

// Students live in the shared records store (data/records/sms_students.json) —
// the same store the admission form and student list write — so fee setup,
// payments and the registry all read one student list.
const STUDENT_RECORDS_KEY = 'sms_students'
const studentRecordsFile = () => join('data', 'records', `${STUDENT_RECORDS_KEY}.json`)
function readStudentRecords() {
  const rows = readJsonFile(studentRecordsFile(), [])
  return Array.isArray(rows) ? rows : []
}
function writeStudentRecords(rows) {
  writeJsonFile(studentRecordsFile(), Array.isArray(rows) ? rows : [])
}

// API Routes - Students
app.get('/api/students', (_req, res) => {
  res.json(readStudentRecords())
})

app.post('/api/students', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Student record must be an object' })
  }
  const list = readStudentRecords()
  const student = { ...req.body, id: String(req.body.id || Date.now()) }
  writeStudentRecords([...list, student])
  res.status(201).json(student)
})

app.put('/api/students', (req, res) => {
  if (!Array.isArray(req.body) || req.body.some((student) => !student || typeof student !== 'object' || Array.isArray(student))) {
    return res.status(400).json({ error: 'Students must be an array of student records' })
  }
  writeStudentRecords(req.body)
  res.json(req.body)
})

app.patch('/api/students/:id/fee', requireRoles('admin', 'super_admin'), (req, res) => {
  const list = readStudentRecords()
  const index = list.findIndex((student) => String(student.id) === String(req.params.id))
  if (index < 0) return res.status(404).json({ error: 'Student not found.' })
  const raw = req.body?.totalFee
  const totalFee = raw === null || raw === undefined || raw === '' ? null : Number(raw)
  if (totalFee !== null && (!Number.isFinite(totalFee) || totalFee < 0)) {
    return res.status(400).json({ error: 'Enter a valid total fee amount.' })
  }
  const updated = { ...list[index], totalFee }
  list[index] = updated
  writeStudentRecords(list)
  res.json(updated)
})

// Simple file-based users store and auth endpoints
const USERS_FILE = join('data', 'users.json')
function issueAuthToken(user) {
  const secret = authTokenSecret()
  if (!secret) throw new Error('AUTH_TOKEN_SECRET is not configured for this deployment.')
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000
  return {
    token: signAuthPayload({
      id: user.id,
      email: user.email,
      role: user.role || 'admin',
      pwd: user.passwordChangedAt || 0,
      iat: Date.now(),
      expiresAt,
    }),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'admin',
      ...(user.linkedId ? { linkedId: user.linkedId } : {}),
      ...(user.accountStatus ? { accountStatus: user.accountStatus } : {}),
      ...(user.subscriptionStatus ? { subscriptionStatus: user.subscriptionStatus } : {}),
      ...(user.subscriptionPlan ? { subscriptionPlan: user.subscriptionPlan } : {}),
    },
  }
}

function accountBlocked(user) {
  return Boolean(user.accountStatus) && user.accountStatus !== 'Active'
}

function accountBlockedMessage(user) {
  return user.accountStatus === 'Pending approval'
    ? 'Your school account is awaiting Super Admin approval and subscription assignment.'
    : 'Your account has been rejected or deactivated. Contact your Super Admin.'
}

function ensureBootstrapSuperAdmin(users) {
  if (
    !isServerlessRuntime ||
    users.some((user) => user.role === 'super_admin') ||
    !process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL ||
    !process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD ||
    process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD.length < 12
  ) {
    return users
  }

  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL.trim().toLowerCase()
  if (users.some((user) => String(user.email).toLowerCase() === email)) return users

  const user = {
    id: `super-admin-${Date.now()}`,
    email,
    name: process.env.BOOTSTRAP_SUPER_ADMIN_NAME || 'Super Admin',
    role: 'super_admin',
    passwordHash: bcrypt.hashSync(process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD, 12),
    emailVerified: true,
    accountStatus: 'Active',
    subscriptionStatus: 'Active',
    twoFactor: { enabled: true, method: 'email-otp' },
  }
  const next = [...users, user]
  writeJsonFile(join('data', 'users.json'), next)
  return next
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
    if (isServerlessRuntime && normalizedRole === 'super_admin') {
      return res.status(403).json({
        error: 'Super Admin accounts must be initialized by the project owner.',
      })
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
    const pendingToken = randomBytes(12).toString('hex')
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
      accountStatus: pending.role === 'admin' ? 'Pending approval' : 'Active',
      subscriptionStatus: pending.role === 'admin' ? 'Awaiting plan' : null,
    }
    writeJsonFile(join('data', 'users.json'), [...users, user])

    if (pending.role === 'admin') {
      const requests = readJsonFile(join('data', 'school_requests.json'), [])
      writeJsonFile(join('data', 'school_requests.json'), [{
        id: `REQ-${Date.now()}`,
        userId: user.id,
        schoolName: pending.name || `${normalizedEmail} school`,
        adminName: pending.name || '',
        email: normalizedEmail,
        status: 'Pending',
        requestedAt: new Date().toISOString(),
        plan: null,
      }, ...requests])
      clearPending(key)
      return res.json({ pendingApproval: true, message: 'Email verified. Your school request is waiting for Super Admin approval.' })
    }

    if (pending.inviteKey) {
      const consumed = consumeInvite(pending.inviteKey, user.id)
      if (!consumed.ok) {
        writeJsonFile(join('data', 'users.json'), users)
        clearPending(key)
        return res.status(400).json({ error: consumed.error || 'Could not claim special key' })
      }
    }

    clearPending(key)

    const payload = issueAuthToken({ ...user, emailVerified: true })
    /* Server truth: face enrollment is mandatory before first entry. */
    if (!selfProfileFor(user.email)) payload.faceSetupRequired = true
    res.json({
      ...payload,
      message: 'Account created and email verified successfully.',
    })
  } catch (err) {
    console.error('Error in /api/auth/register/verify:', err)
    res.status(500).json({ error: 'Server error during OTP verification' })
  }
})

app.post('/api/auth/password-reset', async (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Enter a valid registered email address.' })
    }

    const users = readJsonFile(USERS_FILE, [])
    const user = users.find((item) => String(item.email).toLowerCase() === normalizedEmail)
    const message = 'If an account exists for this email, a password reset code has been sent.'
    let demoOtp = null

    if (user) {
      const code = generateOtp()
      const key = pendingKey('password-reset', normalizedEmail)
      savePending(key, {
        purpose: 'password-reset',
        userId: user.id,
        otpHash: hashOtp(code),
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
      })

      try {
        const mail = await sendOtpEmail({
          to: normalizedEmail,
          otp: code,
          purpose: 'reset your School Management System password',
          subject: 'Your SMS password reset code',
        })
        demoOtp = mail.demoOtp || null
      } catch (err) {
        clearPending(key)
        throw err
      }
    }

    res.json({
      ok: true,
      maskedEmail: maskEmail(normalizedEmail),
      message,
      demoOtp,
      expiresInSec: 600,
    })
  } catch (err) {
    console.error('Error in /api/auth/password-reset:', err)
    res.status(503).json({ error: 'Could not send a password reset code. Please try again later.' })
  }
})

app.post('/api/auth/password-reset/verify', (req, res) => {
  try {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase()
    const code = String(req.body?.code || '').replace(/\D/g, '')
    const password = String(req.body?.password || '')
    if (!normalizedEmail || code.length !== 6) {
      return res.status(400).json({ error: 'Enter the six-digit email code to continue.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Your new password must contain at least 8 characters.' })
    }

    const key = pendingKey('password-reset', normalizedEmail)
    const pending = readPending(key)
    if (!pending) {
      return res.status(401).json({ error: 'Invalid or expired reset code. Request a new code.' })
    }
    if (pending.expiresAt < Date.now()) {
      clearPending(key)
      return res.status(401).json({ error: 'This reset code expired. Request a new one.' })
    }
    if ((pending.attempts || 0) >= 5) {
      clearPending(key)
      return res.status(429).json({ error: 'Too many incorrect codes. Request a new reset code.' })
    }
    if (!verifyOtpHash(code, pending.otpHash)) {
      savePending(key, { ...pending, attempts: (pending.attempts || 0) + 1 })
      return res.status(401).json({ error: 'Invalid or expired reset code. Request a new code.' })
    }

    const users = readJsonFile(USERS_FILE, [])
    const userIndex = users.findIndex(
      (user) => user.id === pending.userId && String(user.email).toLowerCase() === normalizedEmail,
    )
    if (userIndex < 0) {
      clearPending(key)
      return res.status(401).json({ error: 'Invalid or expired reset code. Request a new code.' })
    }

    users[userIndex] = {
      ...users[userIndex],
      passwordHash: bcrypt.hashSync(password, 12),
      passwordChangedAt: new Date().toISOString(),
    }
    writeJsonFile(USERS_FILE, users)
    clearPending(key)
    res.json({ ok: true, message: 'Password updated. You can now sign in with your new password.' })
  } catch (err) {
    console.error('Error in /api/auth/password-reset/verify:', err)
    res.status(500).json({ error: 'Could not update your password. Please request a new reset code.' })
  }
})

/** Create / lookup special keys for teacher & parent account claim */
app.get('/api/invite-keys', requireRoles('admin', 'super_admin'), (_req, res) => {
  res.json(readInvites())
})

app.get('/api/school-requests', (_req, res) => {
  res.json(readJsonFile(join('data', 'school_requests.json'), []))
})

app.patch('/api/school-requests/:id', (req, res) => {
  const requests = readJsonFile(join('data', 'school_requests.json'), [])
  const request = requests.find((item) => item.id === req.params.id)
  if (!request) return res.status(404).json({ error: 'School request not found.' })
  const status = String(req.body?.status || '')
  const plan = String(req.body?.plan || '')
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Invalid request status.' })
  if (status === 'Approved' && !['Starter', 'Growth', 'Enterprise'].includes(plan)) return res.status(400).json({ error: 'Choose a subscription plan before approval.' })
  const updatedRequest = { ...request, status, plan: status === 'Approved' ? plan : null, reviewedAt: new Date().toISOString() }
  writeJsonFile(join('data', 'school_requests.json'), requests.map((item) => (item.id === request.id ? updatedRequest : item)))
  const users = readJsonFile(join('data', 'users.json'), [])
  writeJsonFile(join('data', 'users.json'), users.map((user) => (user.id === request.userId ? { ...user, accountStatus: status === 'Approved' ? 'Active' : 'Rejected', subscriptionStatus: status === 'Approved' ? 'Active' : 'Rejected', subscriptionPlan: status === 'Approved' ? plan : null } : user)))
  res.json(updatedRequest)
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

app.post('/api/invite-keys', requireRoles('admin', 'super_admin'), (req, res) => {
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

    const users = ensureBootstrapSuperAdmin(readJsonFile(join('data', 'users.json'), []))
    const normalizedEmail = String(email).trim().toLowerCase()
    const user = users.find((u) => String(u.email).toLowerCase() === normalizedEmail)
    if (!user) {
      await trackLogin(req, {
        stage: 'login-failed',
        email: normalizedEmail,
        method: 'password',
        note: 'Unknown email — no such account',
      })
      return res.status(401).json({ error: 'Wrong username or email address.' })
    }
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      await trackLogin(req, {
        stage: 'login-failed',
        email: normalizedEmail,
        userId: user.id,
        name: user.name,
        role: user.role,
        method: 'password',
        note: 'Wrong password',
      })
      return res.status(401).json({ error: 'Wrong password.' })
    }
    if (accountBlocked(user)) return res.status(403).json({ error: accountBlockedMessage(user) })

    const role = String(user.role || 'admin').toLowerCase()
    const isAdminLogin = role === 'admin' || role === 'super_admin'
    const loginToken = randomBytes(12).toString('hex')

    await trackLogin(req, {
      stage: 'login-attempt',
      email: normalizedEmail,
      userId: user.id,
      name: user.name,
      role,
      method: isAdminLogin ? 'admin-dual' : 'email-otp',
      note: 'Password accepted — OTP required',
    })

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

/** Face sign-in (staff roles only) — strict multi-frame match, then the usual OTP step */
app.post('/api/auth/face-login', async (req, res) => {
  try {
    const descriptors = validDescriptors(req.body?.descriptors)
    if (descriptors.length < FACE_LOGIN_FRAMES) {
      return res.status(400).json({
        error: `Camera captured ${descriptors.length} of ${FACE_LOGIN_FRAMES} frames. Hold still in good light and try again.`,
      })
    }

    const attemptIp = getClientIp(req)
    if (faceLoginBlocked(attemptIp)) {
      return res.status(429).json({
        error: 'Too many failed face attempts. Wait 10 minutes or sign in with your password.',
      })
    }

    const profiles = readFaceProfiles().filter(
      (profile) =>
        FACE_CAPABLE_ROLES.has(String(profile.role || '').toLowerCase()) &&
        Array.isArray(profile.descriptors) &&
        profile.descriptors.length,
    )
    if (!profiles.length) {
      return res.status(409).json({
        error: 'No staff faces are enrolled yet. Sign in with password first, then set up your face under “My Face”.',
      })
    }

    const match = strictMatchFrames(descriptors, profiles)
    if (!match.ok) {
      recordFaceLoginFailure(attemptIp)
      await trackLogin(req, {
        stage: 'login-failed',
        method: 'face',
        note: `Face sign-in rejected — ${match.reason}`,
      })
      return res.status(401).json({ error: match.message, reason: match.reason })
    }
    clearFaceLoginFailures(attemptIp)

    const matchedEmail = normalizeEmail(match.profile.email)
    const users = ensureBootstrapSuperAdmin(readJsonFile(join('data', 'users.json'), []))
    const user = users.find((u) => String(u.email).toLowerCase() === matchedEmail)
    if (!user) {
      await trackLogin(req, {
        stage: 'login-failed',
        email: matchedEmail,
        method: 'face',
        note: 'Face matched an enrolled profile with no linked account',
      })
      return res.status(401).json({ error: 'Face matched but the linked staff account no longer exists. Contact your admin.' })
    }
    if (accountBlocked(user)) {
      return res.status(403).json({ error: accountBlockedMessage(user) })
    }

    const role = String(user.role || '').toLowerCase()
    if (!FACE_CAPABLE_ROLES.has(role)) {
      return res.status(403).json({ error: 'Face sign-in is not available for this account role. Use password sign-in instead.' })
    }

    const isAdminLogin = role === 'admin' || role === 'super_admin'
    const loginToken = randomBytes(12).toString('hex')
    const faceMatch = {
      name: match.profile.name || user.name || matchedEmail.split('@')[0],
      percent: match.percent,
      distance: Number(match.distance.toFixed(3)),
      margin: Number(match.margin.toFixed(3)),
      frames: match.frames,
    }
    const verifyLine = `Face verified as ${faceMatch.name} (${faceMatch.percent}% match). `
    const geo = clientGeoToLocation(req.body?.geo)
    const device = String(req.body?.device || '').slice(0, 120)

    await trackLogin(req, {
      stage: 'login-attempt',
      email: matchedEmail,
      userId: user.id,
      name: user.name,
      role,
      method: 'face',
      note: `Face verified ${faceMatch.percent}% (margin ${faceMatch.margin.toFixed(2)}) — OTP required`,
    })

    if (isAdminLogin) {
      // Both email OTP + 7-char special key (e.g. lok@010). Key changes every login.
      const loginKey = generateAdminLoginKey(role)
      const otp = generateOtp()
      const keyHash = hashOtp(normalizeAdminLoginKey(loginKey))
      const otpHash = hashOtp(otp)
      savePending(pendingKey('login', matchedEmail), {
        purpose: 'login',
        method: 'admin-dual',
        pendingToken: loginToken,
        email: matchedEmail,
        userId: user.id,
        role,
        otpHash,
        specialKeyHash: keyHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
        origin: 'face',
        faceMatch,
        geo,
        device,
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
        to: matchedEmail,
        loginKey,
        otp,
        purpose: 'sign in to your admin account',
      })

      return res.json({
        otpRequired: true,
        specialKeyRequired: true,
        twoFactor: true,
        method: 'admin-dual',
        faceLogin: true,
        faceMatch,
        role,
        loginToken,
        email: matchedEmail,
        maskedEmail: mail.maskedEmail || maskEmail(matchedEmail),
        delivery: mail.delivery,
        message:
          mail.delivery === 'smtp'
            ? `${verifyLine}OTP and a new special key were emailed to ${mail.maskedEmail}. Enter both to sign in.`
            : `${verifyLine}${mail.message}`,
        demoOtp: mail.demoOtp,
        expiresInSec: 600,
      })
    }

    const otp = generateOtp()
    savePending(pendingKey('login', matchedEmail), {
      purpose: 'login',
      method: 'email-otp',
      pendingToken: loginToken,
      email: matchedEmail,
      userId: user.id,
      role,
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      origin: 'face',
      faceMatch,
      geo,
      device,
    })

    const updated = users.map((u) =>
      u.id === user.id
        ? { ...u, loginToken, loginTokenExpiry: Date.now() + 10 * 60 * 1000 }
        : u,
    )
    writeJsonFile(join('data', 'users.json'), updated)

    const mail = await sendOtpEmail({
      to: matchedEmail,
      otp,
      purpose: 'sign in to School Management System',
      subject: 'Your SMS login OTP',
    })

    res.json({
      otpRequired: true,
      specialKeyRequired: false,
      twoFactor: true,
      method: 'email-otp',
      faceLogin: true,
      faceMatch,
      role,
      loginToken,
      email: matchedEmail,
      maskedEmail: mail.maskedEmail || maskEmail(matchedEmail),
      delivery: mail.delivery,
      message: `${verifyLine}${mail.message}`,
      demoOtp: mail.demoOtp,
      expiresInSec: 600,
    })
  } catch (err) {
    console.error('Error in /api/auth/face-login:', err)
    res.status(503).json({ error: err.message || 'Server error during face sign-in' })
  }
})

/** Step 2 — Verify login email OTP (and admin special key when required) */
app.post('/api/auth/login/verify', async (req, res) => {
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
      if (user) {
        await trackLogin(req, {
          stage: 'otp-failed',
          email: normalizedEmail,
          userId: user.id,
          name: user.name,
          role: user.role,
          method: pending?.method || 'email-otp',
          note: 'Invalid or expired login session',
        })
      }
      return res.status(401).json({ error: 'Invalid or expired login session' })
    }
    if ((pending.expiresAt || 0) < Date.now() || (user.loginTokenExpiry || 0) < Date.now()) {
      clearPending(key)
      await trackLogin(req, {
        stage: 'otp-failed',
        email: normalizedEmail,
        userId: user.id,
        name: user.name,
        role: user.role,
        method: pending.method || 'email-otp',
        note: 'Login codes expired before verification',
      })
      return res.status(401).json({ error: 'Login codes expired. Please sign in again.' })
    }
    if ((pending.attempts || 0) >= 5) {
      clearPending(key)
      await trackLogin(req, {
        stage: 'otp-failed',
        email: normalizedEmail,
        userId: user.id,
        name: user.name,
        role: user.role,
        method: pending.method || 'email-otp',
        note: 'Blocked — too many invalid attempts',
      })
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
        await trackLogin(req, {
          stage: 'otp-failed',
          email: normalizedEmail,
          userId: user.id,
          name: user.name,
          role: user.role,
          method: 'admin-dual',
          note: !otpOk && !keyOk ? 'Wrong OTP and special key' : !otpOk ? 'Wrong email OTP' : 'Wrong special key',
        })
        return res.status(401).json({ error: 'Invalid OTP or special key. Check your email and try again.' })
      }
    } else if (pending.method === 'admin-special-key') {
      const normalizedKey = normalizeAdminLoginKey(specialKey || code)
      if (!normalizedKey) {
        return res.status(400).json({ error: 'Enter the special key from your email.' })
      }
      if (!verifyOtpHash(normalizedKey, pending.specialKeyHash || pending.otpHash)) {
        savePending(key, { ...pending, attempts: (pending.attempts || 0) + 1 })
        await trackLogin(req, {
          stage: 'otp-failed',
          email: normalizedEmail,
          userId: user.id,
          name: user.name,
          role: user.role,
          method: 'admin-special-key',
          note: 'Wrong special key',
        })
        return res.status(401).json({ error: 'Invalid special key. Check your email and try again.' })
      }
    } else {
      if (!otpCode || otpCode.length !== 6) {
        return res.status(400).json({ error: 'Enter the 6-digit email OTP.' })
      }
      if (!verifyOtpHash(otpCode, pending.otpHash)) {
        savePending(key, { ...pending, attempts: (pending.attempts || 0) + 1 })
        await trackLogin(req, {
          stage: 'otp-failed',
          email: normalizedEmail,
          userId: user.id,
          name: user.name,
          role: user.role,
          method: 'email-otp',
          note: 'Wrong email OTP',
        })
        return res.status(401).json({ error: 'Invalid OTP. Check your email and try again.' })
      }
    }

    if (accountBlocked(user)) {
      return res.status(403).json({ error: accountBlockedMessage(user) })
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

    let attendance = null
    if (pending.origin === 'face' && STAFF_ROLES.has(String(user.role || '').toLowerCase())) {
      const profile = selfProfileFor(normalizedEmail)
      attendance = recordFaceAttendance({
        email: normalizedEmail,
        name: user.name,
        role: user.role,
        photoThumb: profile?.photoThumb || null,
        distance: pending.faceMatch?.distance,
        location: clientGeoToLocation(req.body?.geo) || pending.geo,
        device: pending.device || '',
        source: 'face-login',
      })
    }

    await trackLogin(req, {
      stage: 'login-success',
      email: normalizedEmail,
      userId: user.id,
      name: user.name,
      role: user.role,
      method: pending.method || 'email-otp',
      note: pending.origin === 'face' ? 'Face + OTP verified' : 'Login verified',
    })

    const payload = issueAuthToken({ ...user, emailVerified: true })
    /* Server truth: every role must finish face enrollment before entering. */
    if (!selfProfileFor(normalizedEmail)) payload.faceSetupRequired = true
    if (attendance) {
      payload.faceLogin = true
      payload.attendance = attendance
    }
    res.json(payload)
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

app.post('/api/auth/2fa/setup', requireRoles(), async (req, res) => {
  const email = String(req.authUser.email || '').trim().toLowerCase()
  const users = readJsonFile(join('data', 'users.json'), [])
  const user = users.find((u) => String(u.email).toLowerCase() === email)
  if (!user) return res.status(404).json({ error: 'User not found' })

  const secret = speakeasy.generateSecret({ length: 20, name: `SchoolSMS (${email})` })
  // store temp secret until verified
  const updated = users.map((u) => (String(u.email).toLowerCase() === email ? { ...u, twoFactor: { ...(u.twoFactor || {}), tempSecret: secret.base32 } } : u))
  writeJsonFile(join('data', 'users.json'), updated)

  const otpauth = secret.otpauth_url
  const qrData = await QRCode.toDataURL(otpauth)
  res.json({ otpauth, qrData, base32: secret.base32 })
})

app.post('/api/auth/2fa/verify', requireRoles(), (req, res) => {
  const { code, setup } = req.body
  const email = String(req.authUser.email || '').trim().toLowerCase()
  if (!code) return res.status(400).json({ error: 'Email and code required' })
  const users = readJsonFile(join('data', 'users.json'), [])
  const user = users.find((u) => String(u.email).toLowerCase() === email)
  if (!user) return res.status(404).json({ error: 'User not found' })

  // Setup flow: verify against tempSecret then persist
  if (setup) {
    const tempSecret = user.twoFactor && user.twoFactor.tempSecret
    if (!tempSecret) return res.status(400).json({ error: 'No 2FA setup in progress' })
    const verified = speakeasy.totp.verify({ secret: tempSecret, encoding: 'base32', token: String(code), window: 1 })
    if (!verified) return res.status(401).json({ error: 'Invalid code' })
    const updated = users.map((u) => (String(u.email).toLowerCase() === email ? { ...u, twoFactor: { enabled: true, secret: tempSecret, method: 'authenticator' } } : u))
    writeJsonFile(join('data', 'users.json'), updated)
    return res.json({ success: true })
  }

  // Legacy demo-token login issuance removed — sessions are only minted by the real login endpoints
  return res.status(400).json({ error: 'Authenticator login is not supported. Log in with email OTP.' })
})

app.post('/api/auth/2fa/disable', requireRoles(), (req, res) => {
  const { code } = req.body
  const email = String(req.authUser.email || '').trim().toLowerCase()
  if (!code) return res.status(400).json({ error: 'Email and code required' })
  const users = readJsonFile(join('data', 'users.json'), [])
  const user = users.find((u) => String(u.email).toLowerCase() === email)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const secret = user.twoFactor && user.twoFactor.secret
  if (!secret) return res.status(400).json({ error: '2FA not configured' })
  const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(code), window: 1 })
  if (!verified) return res.status(401).json({ error: 'Invalid code' })

  const updated = users.map((u) => (String(u.email).toLowerCase() === email ? { ...u, twoFactor: { enabled: false } } : u))
  writeJsonFile(join('data', 'users.json'), updated)
  res.json({ success: true })
})

/** Guard: verified admin/super admin session token required (Bearer auth, role-checked) */
function requireAdmin(req, res, next) {
  requireRoles('admin', 'super_admin')(req, res, () => {
    req.adminUser = req.authUser
    next()
  })
}

// Login Tracks — security audit of every login attempt (admin & super admin only)
app.get('/api/login-tracks', requireAdmin, (req, res) => {
  const { range = 'all', risk = '', stage = '', role = '', q = '', limit } = req.query
  res.json({
    events: listTracks({ range, risk, stage, role, q, limit }),
    summary: summarizeTracks(),
  })
})

app.get('/api/login-tracks/summary', requireAdmin, (_req, res) => {
  res.json(summarizeTracks())
})

app.post('/api/login-tracks/:id/review', requireAdmin, (req, res) => {
  const updated = markReviewed(req.params.id, req.body?.reviewer || req.adminUser.email)
  if (!updated) return res.status(404).json({ error: 'Track event not found' })
  res.json(updated)
})

app.get('/api/login-tracks/analytics', requireAdmin, (_req, res) => {
  res.json(computeAnalytics())
})

app.get('/api/login-tracks/devices', requireAdmin, (_req, res) => {
  res.json({ devices: listKnownDevices() })
})

app.post('/api/login-tracks/devices/trust', requireAdmin, (req, res) => {
  const { email, fingerprint, trust } = req.body || {}
  if (!email || !fingerprint) return res.status(400).json({ error: 'email and fingerprint are required' })
  if (!['trusted', 'suspicious', ''].includes(String(trust || ''))) {
    return res.status(400).json({ error: 'trust must be "trusted", "suspicious" or empty' })
  }
  const updated = setDeviceTrust({ email, fingerprint, trust, by: req.adminUser.email })
  if (!updated) return res.status(404).json({ error: 'Device not found for this account' })
  res.json(updated)
})

app.get('/api/login-tracks/watchlist', requireAdmin, (_req, res) => {
  res.json({ watchlist: listWatchlist() })
})

app.post('/api/login-tracks/watchlist', requireAdmin, (req, res) => {
  try {
    const entry = setWatchlistEntry({
      ip: req.body?.ip,
      action: req.body?.action || 'add',
      note: req.body?.note,
      by: req.adminUser.email,
    })
    if (!entry) return res.status(404).json({ error: 'IP is not on the watchlist' })
    res.json(entry)
  } catch (err) {
    res.status(400).json({ error: err?.message || 'Invalid request' })
  }
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

// API Routes - Staff Face Attendance (teachers, admin and staff — not parents)
const FACE_PROFILES_FILE = join('data', 'staff_face_profiles.json')
const STAFF_ATTENDANCE_FILE = join('data', 'staff_attendance.json')
const STAFF_ATTENDANCE_MAX = 10000
const STAFF_LATE_AFTER = /^\d{2}:\d{2}$/.test(process.env.STAFF_LATE_AFTER || '')
  ? process.env.STAFF_LATE_AFTER
  : '09:30'
const STAFF_ROLES = new Set(['admin', 'super_admin', 'teacher'])
/* Every account role enrolls a face at signup and may sign in with it. */
const FACE_CAPABLE_ROLES = new Set(['admin', 'super_admin', 'teacher', 'parent'])

/* Best-effort brute-force brake for face sign-in (per IP, in-memory). */
const FACE_LOGIN_ATTEMPT_LIMIT = 8
const FACE_LOGIN_WINDOW_MS = 10 * 60 * 1000
const faceLoginFailures = new Map()

function faceLoginBlocked(ip) {
  const now = Date.now()
  const list = (faceLoginFailures.get(ip) || []).filter((ts) => now - ts < FACE_LOGIN_WINDOW_MS)
  faceLoginFailures.set(ip, list)
  return list.length >= FACE_LOGIN_ATTEMPT_LIMIT
}

function recordFaceLoginFailure(ip) {
  const now = Date.now()
  const list = (faceLoginFailures.get(ip) || []).filter((ts) => now - ts < FACE_LOGIN_WINDOW_MS)
  list.push(now)
  faceLoginFailures.set(ip, list)
}

function clearFaceLoginFailures(ip) {
  faceLoginFailures.delete(ip)
}

function readFaceProfiles() {
  const list = readJsonFile(FACE_PROFILES_FILE, [])
  return Array.isArray(list) ? list : []
}

function writeFaceProfiles(list) {
  writeJsonFile(FACE_PROFILES_FILE, list)
}

function readStaffAttendance() {
  const list = readJsonFile(STAFF_ATTENDANCE_FILE, [])
  return Array.isArray(list) ? list : []
}

function staffRoster() {
  const users = readJsonFile(USERS_FILE, [])
  return (Array.isArray(users) ? users : [])
    .filter((user) => STAFF_ROLES.has(String(user.role || '').toLowerCase()))
    .map((user) => ({
      email: normalizeEmail(user.email),
      name: user.name || user.username || normalizeEmail(user.email).split('@')[0],
      role: user.role,
    }))
}

function selfProfileFor(email) {
  return readFaceProfiles().find((profile) => normalizeEmail(profile.email) === email) || null
}

app.get('/api/face/me', (req, res) => {
  const email = normalizeEmail(req.authUser.email)
  const profile = selfProfileFor(email)
  if (!profile) return res.json({ enrolled: false })
  res.json({
    enrolled: true,
    name: profile.name,
    role: profile.role,
    enrolledAt: profile.enrolledAt,
    updatedAt: profile.updatedAt,
    descriptorCount: Array.isArray(profile.descriptors) ? profile.descriptors.length : 0,
    photoThumb: profile.photoThumb || null,
  })
})

app.post('/api/face/me', (req, res) => {
  const descriptors = validDescriptors(req.body?.descriptors)
  if (!descriptors.length) {
    return res.status(400).json({ error: 'No valid face samples were received. Look straight at the camera in good light and try again.' })
  }
  const live = assertLiveFrames(descriptors)
  if (!live.ok) {
    return res.status(400).json({ error: live.message, reason: live.reason })
  }
  const photoThumb = isValidPhotoThumb(req.body?.photoThumb) ? req.body.photoThumb : null
  const email = normalizeEmail(req.authUser.email)
  const conflict = enrollmentConflict(descriptors, readFaceProfiles(), email)
  if (conflict.conflict) {
    return res.status(409).json({
      error: 'This face is already enrolled on another account. One face protects one account only — sign in with that account or use a different face.',
      reason: 'face-already-enrolled',
    })
  }
  const users = readJsonFile(USERS_FILE, [])
  const self = (Array.isArray(users) ? users : []).find((user) => normalizeEmail(user.email) === email)
  const name = self?.name || self?.username || email.split('@')[0]
  const role = self?.role || req.authUser.role
  const now = new Date().toISOString()
  const profiles = readFaceProfiles()
  const index = profiles.findIndex((profile) => normalizeEmail(profile.email) === email)
  const existing = index >= 0 ? profiles[index] : null
  const entry = {
    email,
    userId: req.authUser.id,
    name,
    role,
    descriptors,
    photoThumb: photoThumb || existing?.photoThumb || null,
    enrolledAt: existing?.enrolledAt || now,
    updatedAt: now,
  }
  if (index >= 0) profiles[index] = entry
  else profiles.push(entry)
  writeFaceProfiles(profiles)
  res.json({
    enrolled: true,
    name,
    role,
    enrolledAt: entry.enrolledAt,
    updatedAt: entry.updatedAt,
    descriptorCount: descriptors.length,
    photoThumb: entry.photoThumb,
  })
})

app.delete('/api/face/me', (req, res) => {
  const email = normalizeEmail(req.authUser.email)
  const profiles = readFaceProfiles()
  const next = profiles.filter((profile) => normalizeEmail(profile.email) !== email)
  if (next.length === profiles.length) return res.json({ removed: false })
  writeFaceProfiles(next)
  res.json({ removed: true })
})

/* Read-only audit: accounts sharing a face. Enrollment blocks new clashes, so
   any hit here is older data an admin should look at. Nothing is deleted. */
app.get('/api/face/duplicates', requireRoles('admin', 'super_admin'), (req, res) => {
  const profiles = readFaceProfiles()
  const enrolled = profiles.filter(
    (profile) => Array.isArray(profile.descriptors) && profile.descriptors.length,
  )
  const pairs = findDuplicateFaces(profiles).map(({ a, b, distance, percent }) => {
    const slim = (profile) => ({
      email: normalizeEmail(profile.email),
      name: profile.name || normalizeEmail(profile.email).split('@')[0],
      role: profile.role || '',
      enrolledAt: profile.enrolledAt || null,
      updatedAt: profile.updatedAt || null,
      descriptorCount: Array.isArray(profile.descriptors) ? profile.descriptors.length : 0,
      photoThumb: profile.photoThumb || null,
    })
    return { distance: Number(distance.toFixed(3)), matchPercent: percent, a: slim(a), b: slim(b) }
  })
  res.json({
    threshold: FACE_ENROLL_UNIQUENESS_THRESHOLD,
    profileCount: enrolled.length,
    pairCount: pairs.length,
    pairs,
  })
})

/** Browser geo objects use `lon`; attendance storage expects `lng`. */
function clientGeoToLocation(geo) {
  if (!geo || typeof geo !== 'object') return null
  return sanitizeLocation({
    lat: geo.lat ?? geo.latitude,
    lng: geo.lng ?? geo.lon ?? geo.longitude,
    accuracy: geo.accuracy,
  })
}

/** Shared by kiosk scans and face sign-in: cooldown check, in/out toggle, IST record. */
function recordFaceAttendance({ email, name, role, photoThumb, distance, location, device, source }) {
  const attendance = readStaffAttendance()
  const last = lastRecordFor(attendance, email)
  const person = {
    name: name || email.split('@')[0],
    role: role || 'teacher',
    photoThumb: photoThumb || null,
  }
  if (last && Date.now() - Date.parse(last.at) < ATTENDANCE_COOLDOWN_MS) {
    return {
      cooldown: true,
      person,
      record: last,
      type: last.type,
      message: last.type === 'in' ? 'Already checked in moments ago.' : 'Already checked out moments ago.',
    }
  }
  const now = istParts()
  const todayForPerson = attendance.filter(
    (record) => record.date === now.date && normalizeEmail(record.email) === email,
  )
  const type = nextAttendanceType(todayForPerson)
  const distanceValue = Number.isFinite(Number(distance)) ? Number(distance) : 0
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    name: person.name,
    role: person.role,
    type,
    at: now.iso,
    atIST: `${now.date} ${now.time} IST`,
    date: now.date,
    time: now.time,
    matchDistance: Number(distanceValue.toFixed(3)),
    matchPercent: matchPercent(distanceValue),
    location: sanitizeLocation(location),
    device: String(device || '').slice(0, 120),
    source: source || 'face',
  }
  writeStaffAttendance([record, ...attendance].slice(0, STAFF_ATTENDANCE_MAX))
  return {
    cooldown: false,
    person,
    record,
    type,
    message: type === 'in' ? 'Checked in' : 'Checked out',
  }
}

app.post('/api/face/attendance', (req, res) => {
  const descriptor = isValidDescriptor(req.body?.descriptor) ? req.body.descriptor : null
  if (!descriptor) {
    return res.status(400).json({ matched: false, error: 'Camera scan was incomplete. Hold still and try again.' })
  }
  const profiles = readFaceProfiles().filter(
    (profile) => STAFF_ROLES.has(String(profile.role || '').toLowerCase()),
  )
  if (!profiles.length) {
    return res.status(409).json({ matched: false, error: 'No staff faces are enrolled yet. Open “My Face” and enroll first.' })
  }
  const match = findBestMatch(descriptor, profiles)
  if (!match) {
    return res.json({ matched: false, error: 'Face not recognized. Come closer, face the light and try again.' })
  }
  const result = recordFaceAttendance({
    email: normalizeEmail(match.profile.email),
    name: match.profile.name,
    role: match.profile.role,
    photoThumb: match.profile.photoThumb,
    distance: match.distance,
    location: req.body?.location,
    device: req.body?.device,
    source: 'face',
  })
  res.json({ matched: true, ...result })
})

app.get('/api/face/attendance', requireRoles('admin', 'super_admin'), (req, res) => {
  const requested = String(req.query.date || '')
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : istParts().date
  const profiles = readFaceProfiles()
  const enrolledEmails = new Set(profiles.map((profile) => normalizeEmail(profile.email)))
  const thumbByEmail = new Map(profiles.map((profile) => [normalizeEmail(profile.email), profile.photoThumb || null]))
  const records = readStaffAttendance().filter((record) => record.date === date)
  const byEmail = new Map()
  for (const record of records) {
    const email = normalizeEmail(record.email)
    if (!byEmail.has(email)) byEmail.set(email, [])
    byEmail.get(email).push(record)
  }
  const roster = staffRoster()
    .map((person) => {
      const personRecords = (byEmail.get(person.email) || []).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
      const firstIn = personRecords.find((record) => record.type === 'in') || null
      const lastOut = [...personRecords].reverse().find((record) => record.type === 'out') || null
      return {
        email: person.email,
        name: person.name,
        role: person.role,
        enrolled: enrolledEmails.has(person.email),
        photoThumb: thumbByEmail.get(person.email) || null,
        present: personRecords.length > 0,
        firstIn: firstIn?.time || null,
        lastOut: lastOut?.time || null,
        scans: personRecords.length,
        late: isLate(firstIn?.time, STAFF_LATE_AFTER),
      }
    })
    .sort((a, b) => Number(b.present) - Number(a.present) || String(a.name).localeCompare(String(b.name)))
  const summary = {
    total: roster.length,
    present: roster.filter((person) => person.present).length,
    late: roster.filter((person) => person.late).length,
    absent: roster.filter((person) => person.enrolled && !person.present).length,
    notEnrolled: roster.filter((person) => !person.enrolled).length,
    enrolledTotal: profiles.length,
    lateAfter: STAFF_LATE_AFTER,
  }
  res.json({ date, summary, roster, records: records.slice(0, 300) })
})

function writeStaffAttendance(list) {
  writeJsonFile(STAFF_ATTENDANCE_FILE, list)
}

// API Routes - Bus & Driver Live Tracking
const TRACKING_KEYS_FILE = join('data', 'tracking_keys.json')
const TRANSPORT_LIVE_FILE = join('data', 'transport_live.json')

function readTrackingKeys() {
  const list = readJsonFile(TRACKING_KEYS_FILE, [])
  return Array.isArray(list) ? list : []
}

function writeTrackingKeys(list) {
  writeJsonFile(TRACKING_KEYS_FILE, list)
}

function readTransportLive() {
  const map = readJsonFile(TRANSPORT_LIVE_FILE, {})
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {}
}

function writeTransportLive(map) {
  writeJsonFile(TRANSPORT_LIVE_FILE, map)
}

function findTrackingKeyByKey(key) {
  const normalized = normalizeTrackKey(key)
  if (!normalized) return null
  return readTrackingKeys().find((record) => record.key === normalized) || null
}

// --- Daily WhatsApp delivery of driver tracking links ---
const WHATSAPP_DAILY_LOG_FILE = join('data', 'transport_whatsapp_log.json')
const WHATSAPP_DAILY_LOG_MAX = 500
const WHATSAPP_DAILY_AUTO_AT = '6:00 AM IST'
const WHATSAPP_DAILY_CRON = '30 0 * * *'

function readWhatsAppDailyLog() {
  const list = readJsonFile(WHATSAPP_DAILY_LOG_FILE, [])
  return Array.isArray(list) ? list : []
}

function appendWhatsAppDailyLog(entries) {
  const fresh = (Array.isArray(entries) ? entries : []).filter(Boolean)
  if (!fresh.length) return readWhatsAppDailyLog()
  const next = [...fresh, ...readWhatsAppDailyLog()].slice(0, WHATSAPP_DAILY_LOG_MAX)
  writeJsonFile(WHATSAPP_DAILY_LOG_FILE, next)
  return next
}

function safeSecretMatch(provided, expected) {
  const left = Buffer.from(String(provided || ''))
  const right = Buffer.from(String(expected || ''))
  if (!left.length || !right.length || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

function publicAppOrigin(req) {
  const configured = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')
  if (/^https?:\/\/[^/]+/i.test(configured)) return configured
  const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '')
    .split(',')[0]
    .trim()
  if (host) {
    const proto = String(req?.headers?.['x-forwarded-proto'] || req?.protocol || 'https')
      .split(',')[0]
      .trim()
    return `${proto === 'http' ? 'http' : 'https'}://${host}`
  }
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || ''
  return vercelHost
    ? `https://${String(vercelHost).replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    : ''
}

function trackingLinkFor(req, record) {
  const origin = publicAppOrigin(req)
  if (!origin || !record?.key) return ''
  return `${origin}/track/${encodeURIComponent(record.key)}`
}

function trackingKeyView(record) {
  return {
    ...record,
    autoSend: record.autoSend === true,
    phone: record.phone || '',
    phoneMasked: maskWhatsAppPhone(record.phone),
    lastAutoSentOn: record.lastAutoSentOn || '',
    lastAutoSendAt: record.lastAutoSendAt || '',
    lastAutoSendAtIST: record.lastAutoSendAtIST || '',
    lastAutoSendStatus: record.lastAutoSendStatus || '',
    lastAutoSendError: record.lastAutoSendError || '',
  }
}

function whatsAppDeliverySummary(req, keys) {
  const todayIST = istParts().date
  const config = whatsAppConfigStatus()
  const autoEnabled = keys.filter(
    (record) => record.active !== false && record.autoSend === true,
  )
  return {
    ...config,
    provider: 'Meta WhatsApp Cloud API',
    dailyAt: WHATSAPP_DAILY_AUTO_AT,
    cronSchedule: WHATSAPP_DAILY_CRON,
    cronReady: Boolean(String(process.env.CRON_SECRET || '').trim()),
    publicBaseUrl: publicAppOrigin(req),
    todayIST,
    totalKeys: keys.length,
    autoSendEnabled: autoEnabled.length,
    autoSendMissingPhone: autoEnabled.filter(
      (record) => !normalizeWhatsAppPhone(record.phone),
    ).length,
    sentToday: keys.filter(
      (record) =>
        record.lastAutoSentOn === todayIST && record.lastAutoSendStatus === 'sent',
    ).length,
    failedToday: keys.filter(
      (record) =>
        record.lastAutoSendStatus === 'failed' &&
        String(record.lastAutoSendAtIST || '').startsWith(todayIST),
    ).length,
    recent: readWhatsAppDailyLog().slice(0, 12),
  }
}

// --- Transport master data: routes, drivers, buses and student allocation ---
const TRANSPORT_ROUTES_FILE = join('data', 'transport_routes.json')
const TRANSPORT_DRIVERS_FILE = join('data', 'transport_drivers.json')
const TRANSPORT_VEHICLES_FILE = join('data', 'transport_vehicles.json')
const TRANSPORT_ALLOCATIONS_FILE = join('data', 'transport_allocations.json')
const TRANSPORT_GEOMETRY_FILE = join('data', 'transport_geometry.json')

function readTransportRoutes() {
  const list = readJsonFile(TRANSPORT_ROUTES_FILE, [])
  return Array.isArray(list) ? list : []
}

function writeTransportRoutes(list) {
  writeJsonFile(TRANSPORT_ROUTES_FILE, (Array.isArray(list) ? list : []).slice(0, TRANSPORT_ROUTES_MAX))
}

/** One-time import of drivers added through the old generic module store. */
function readTransportDrivers() {
  const stored = readJsonFile(TRANSPORT_DRIVERS_FILE, null)
  if (Array.isArray(stored)) return stored
  const legacy = readJsonFile(join('data', 'records', 'sms_mod_transport_drivers.json'), [])
  const stamp = new Date().toISOString()
  const migrated = (Array.isArray(legacy) ? legacy : [])
    .map((item, index) => ({
      id: String(item?.id || `drv_legacy_${index}`),
      name: String(item?.title || item?.name || '').trim().slice(0, 80),
      phone: String(item?.phone || '').trim().slice(0, 24),
      licenseNo: String(item?.license || '').trim().slice(0, 40),
      licenseExpiry: '',
      address: '',
      vehicleLabel: String(item?.vehicle || '').trim().slice(0, 40),
      status: ['On duty', 'Off duty', 'Leave'].includes(item?.status) ? item.status : 'Off duty',
      notes: '',
      createdAt: item?.createdAt || stamp,
      updatedAt: item?.updatedAt || stamp,
    }))
    .filter((driver) => driver.name)
  writeJsonFile(TRANSPORT_DRIVERS_FILE, migrated.slice(0, TRANSPORT_DRIVERS_MAX))
  return migrated
}

function writeTransportDrivers(list) {
  writeJsonFile(TRANSPORT_DRIVERS_FILE, (Array.isArray(list) ? list : []).slice(0, TRANSPORT_DRIVERS_MAX))
}

const DRIVER_PIN_ATTEMPTS_MAX = 5
const DRIVER_PIN_LOCK_MS = 15 * 60 * 1000
const DRIVER_SESSION_MS = 7 * 24 * 60 * 60 * 1000
// Keeps unknown-phone logins as slow as registered ones, so timing cannot reveal drivers.
const DRIVER_DUMMY_PIN_HASH = bcrypt.hashSync('000000', 10)

function normalizeDriverPhone(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10) digits = `91${digits}`
  return /^[1-9]\d{9,14}$/.test(digits) ? digits : ''
}

function driverLoginView(driver) {
  const login = driver?.login && typeof driver.login === 'object' ? driver.login : {}
  const lockedUntil = Number(login.lockedUntil) || 0
  return {
    enabled: Boolean(login.pinHash) && login.enabled !== false,
    hasPin: Boolean(login.pinHash),
    lastLoginAt: login.lastLoginAt || '',
    lastLoginAtIST: login.lastLoginAtIST || '',
    pinSetAtIST: login.pinSetAtIST || '',
    lockedUntil: lockedUntil > Date.now() ? lockedUntil : 0,
  }
}

function driverView(driver, routes) {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone || '',
    licenseNo: driver.licenseNo || '',
    licenseExpiry: driver.licenseExpiry || '',
    address: driver.address || '',
    vehicleLabel: driver.vehicleLabel || '',
    status: driver.status || 'On duty',
    notes: driver.notes || '',
    createdAt: driver.createdAt || '',
    updatedAt: driver.updatedAt || '',
    routeId: routes.find((route) => route.driverId === driver.id)?.id || '',
    login: driverLoginView(driver),
  }
}

function issueDriverToken(driver) {
  const secret = authTokenSecret()
  if (!secret) throw new Error('AUTH_TOKEN_SECRET is not configured for this deployment.')
  const expiresAt = Date.now() + DRIVER_SESSION_MS
  return {
    token: signAuthPayload({
      id: driver.id,
      email: `driver.${driver.id}@transport.local`,
      role: 'driver',
      dv: Number(driver.login?.version) || 0,
      iat: Date.now(),
      expiresAt,
    }),
    expiresAt,
    user: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone || '',
      role: 'driver',
    },
  }
}

function requireDriver(req, res, next) {
  requireRoles('driver')(req, res, () => {
    const driver = readTransportDrivers().find((item) => item.id === req.authUser.id)
    if (!driver || !driver.login?.pinHash || driver.login.enabled === false) {
      return res.status(401).json({ error: 'This driver login is no longer active. Sign in again.' })
    }
    if ((Number(driver.login.version) || 0) !== (Number(req.authUser.dv) || 0)) {
      return res.status(401).json({ error: 'Your PIN was reset by the school. Sign in again with the new PIN.' })
    }
    req.driver = driver
    next()
  })
}

function driverTrackingRecord(driver) {
  const route = readTransportRoutes().find((item) => item.driverId === driver.id) || null
  const tracking = route?.trackingId
    ? readTrackingKeys().find((item) => item.id === route.trackingId) || null
    : null
  return { route, tracking }
}

function readTransportVehicles() {
  const stored = readJsonFile(TRANSPORT_VEHICLES_FILE, null)
  if (Array.isArray(stored)) return stored
  const legacy = readJsonFile(join('data', 'records', 'sms_mod_transport_vehicles.json'), [])
  const stamp = new Date().toISOString()
  const migrated = (Array.isArray(legacy) ? legacy : [])
    .map((item, index) => {
      const seats = parseInt(String(item?.capacity || '').replace(/[^\d]/g, ''), 10)
      return {
        id: String(item?.id || `veh_legacy_${index}`),
        number: String(item?.title || item?.number || '').trim().slice(0, 40),
        model: String(item?.model || '').trim().slice(0, 60),
        capacity: Number.isFinite(seats) && seats > 0 ? seats : null,
        insuranceTill: /^\d{4}-\d{2}-\d{2}$/.test(String(item?.insurance || '')) ? item.insurance : '',
        status: ['Active', 'Maintenance', 'Retired'].includes(item?.status) ? item.status : 'Active',
        notes: '',
        createdAt: item?.createdAt || stamp,
        updatedAt: item?.updatedAt || stamp,
      }
    })
    .filter((vehicle) => vehicle.number)
  writeJsonFile(TRANSPORT_VEHICLES_FILE, migrated.slice(0, TRANSPORT_VEHICLES_MAX))
  return migrated
}

function writeTransportVehicles(list) {
  writeJsonFile(TRANSPORT_VEHICLES_FILE, (Array.isArray(list) ? list : []).slice(0, TRANSPORT_VEHICLES_MAX))
}

function readTransportAllocations() {
  const list = readJsonFile(TRANSPORT_ALLOCATIONS_FILE, [])
  return Array.isArray(list) ? list : []
}

function writeTransportAllocations(list) {
  writeJsonFile(TRANSPORT_ALLOCATIONS_FILE, (Array.isArray(list) ? list : []).slice(0, TRANSPORT_ALLOCATIONS_MAX))
}

/** Route.trackingId is the source of truth; mirror it onto the key record. */
function syncRouteTrackingLinks() {
  const routes = readTransportRoutes()
  const keys = readTrackingKeys()
  const routeByKey = new Map()
  for (const route of routes) {
    if (route.trackingId) routeByKey.set(route.trackingId, route.id)
  }
  let changed = false
  const next = keys.map((key) => {
    const wanted = routeByKey.get(key.id) || ''
    if (String(key.routeId || '') !== wanted) {
      changed = true
      return { ...key, routeId: wanted }
    }
    return key
  })
  if (changed) writeTrackingKeys(next)
}

function keepRouteAssignmentUnique(routeId, field, value) {
  if (!value) return
  const routes = readTransportRoutes()
  const stamp = istParts().iso
  let changed = false
  const next = routes.map((route) => {
    if (route.id !== routeId && route[field] === value) {
      changed = true
      return { ...route, [field]: '', updatedAt: stamp }
    }
    return route
  })
  if (changed) writeTransportRoutes(next)
}

function assignDriverRoute(driverId, routeId) {
  if (!driverId) return
  const routes = readTransportRoutes()
  const stamp = istParts().iso
  let changed = false
  const next = routes.map((route) => {
    if (routeId && route.id === routeId) {
      if (route.driverId === driverId) return route
      changed = true
      return { ...route, driverId, updatedAt: stamp }
    }
    if (route.driverId === driverId) {
      changed = true
      return { ...route, driverId: '', updatedAt: stamp }
    }
    return route
  })
  if (changed) writeTransportRoutes(next)
}

function assignVehicleRoute(vehicleId, routeId) {
  if (!vehicleId) return
  const routes = readTransportRoutes()
  const stamp = istParts().iso
  let changed = false
  const next = routes.map((route) => {
    if (routeId && route.id === routeId) {
      if (route.vehicleId === vehicleId) return route
      changed = true
      return { ...route, vehicleId, updatedAt: stamp }
    }
    if (route.vehicleId === vehicleId) {
      changed = true
      return { ...route, vehicleId: '', updatedAt: stamp }
    }
    return route
  })
  if (changed) writeTransportRoutes(next)
}

function routeRelationError(value, routeId = '') {
  const routes = readTransportRoutes()
  if (value.driverId && !readTransportDrivers().some((driver) => driver.id === value.driverId)) {
    return 'Selected driver was not found.'
  }
  if (value.vehicleId && !readTransportVehicles().some((vehicle) => vehicle.id === value.vehicleId)) {
    return 'Selected bus was not found.'
  }
  if (value.trackingId) {
    if (!readTrackingKeys().some((key) => key.id === value.trackingId)) return 'Selected tracking link was not found.'
    if (routes.some((route) => route.id !== routeId && route.trackingId === value.trackingId)) {
      return 'That tracking link is already assigned to another route.'
    }
  }
  return ''
}

function allocationRelationError(value, allocationId = '') {
  const students = readStudentRecords()
  const student = students.find(
    (item) => String(item.id) === String(value.studentId) || String(item.applicationId) === String(value.studentId),
  )
  if (!student) return { error: 'Student was not found.' }
  const route = readTransportRoutes().find((item) => item.id === value.routeId)
  if (!route) return { error: 'Select a valid route.' }
  if (value.pickupStopId) {
    const stop = route.stops.find((item) => item.id === value.pickupStopId)
    if (!stop || !['pickup', 'both'].includes(stop.kind)) {
      return { error: 'Selected pickup point does not belong to this route.' }
    }
  }
  if (value.dropStopId) {
    const stop = route.stops.find((item) => item.id === value.dropStopId)
    if (!stop || !['drop', 'both'].includes(stop.kind)) {
      return { error: 'Selected drop point does not belong to this route.' }
    }
  }
  const studentKeys = [student.id, student.applicationId].filter(Boolean).map(String)
  const duplicate = readTransportAllocations().find((allocation) => {
    if (allocation.id === allocationId) return false
    const existingKeys = [allocation.studentId, allocation.studentApplicationId].filter(Boolean).map(String)
    return existingKeys.some((key) => studentKeys.includes(key))
  })
  if (duplicate) return { error: 'This student already has a bus allocation.' }
  return {
    student,
    route,
    value: {
      ...value,
      studentId: String(student.id ?? value.studentId),
      studentApplicationId: String(student.applicationId || ''),
    },
  }
}

function serializeLiveVehicle(record, ping, now) {
  const active = record.active !== false
  return {
    id: record.id,
    key: record.key,
    driverName: record.driverName,
    vehicleLabel: record.vehicleLabel,
    routeLabel: record.routeLabel,
    routeId: record.routeId || '',
    phone: record.phone || '',
    active,
    online: active && ping ? isTrackOnline(ping.at, now) : false,
    autoSend: record.autoSend === true,
    lastAutoSentOn: record.lastAutoSentOn || '',
    lastAutoSendAt: record.lastAutoSendAt || '',
    lastAutoSendAtIST: record.lastAutoSendAtIST || '',
    lastAutoSendStatus: record.lastAutoSendStatus || '',
    lastAutoSendError: record.lastAutoSendError || '',
    lastPing: ping
      ? {
          lat: ping.lat,
          lng: ping.lng,
          accuracy: ping.accuracy,
          speed: ping.speed,
          speedKmh: ping.speedKmh ?? null,
          speedSource: ping.speedSource || '',
          heading: ping.heading,
          battery: ping.battery,
          at: ping.at,
          atIST: ping.atIST,
          device: ping.device || '',
        }
      : null,
    trail: Array.isArray(ping?.trail) ? ping.trail : [],
  }
}

function parentTransportContext(authUser) {
  const user = readJsonFile(USERS_FILE, []).find((item) => String(item.id) === String(authUser?.id)) || null
  const linkedId = String(user?.linkedId || '')
  const students = readStudentRecords()
  let student = linkedId
    ? students.find((item) => String(item.id) === linkedId || String(item.applicationId) === linkedId) || null
    : null
  if (!student && user?.email) {
    const email = String(user.email).trim().toLowerCase()
    student =
      students.find((item) =>
        ['guardianEmail', 'fatherEmail', 'motherEmail']
          .map((field) => String(item?.[field] || '').trim().toLowerCase())
          .filter(Boolean)
          .includes(email),
      ) || null
  }
  const studentKeys = [linkedId, student?.id, student?.applicationId].filter(Boolean).map(String)
  const allocation = studentKeys.length
    ? readTransportAllocations().find((item) =>
        [item.studentId, item.studentApplicationId]
          .filter(Boolean)
          .map(String)
          .some((key) => studentKeys.includes(key)),
      ) || null
    : null
  const route = allocation ? readTransportRoutes().find((item) => item.id === allocation.routeId) || null : null
  const driver = route?.driverId ? readTransportDrivers().find((item) => item.id === route.driverId) || null : null
  const keys = readTrackingKeys()
  const tracking = route
    ? keys.find((item) => item.id === route.trackingId) || keys.find((item) => item.routeId === route.id) || null
    : null
  return { user, student, allocation, route, driver, tracking }
}

function parentRouteView(route) {
  return {
    id: route.id,
    name: route.name,
    code: route.code || '',
    status: route.status || 'Active',
    vehicleLabel: route.vehicleLabel || '',
    stops: route.stops.map((stop) => ({
      id: stop.id,
      name: stop.name,
      kind: stop.kind,
      time: stop.time || '',
      landmark: stop.landmark || '',
      lat: stop.lat,
      lng: stop.lng,
    })),
  }
}

app.get('/api/transport/routes', requireRoles('admin', 'super_admin'), (_req, res) => {
  res.json(readTransportRoutes())
})

app.post('/api/transport/routes', requireRoles('admin', 'super_admin'), (req, res) => {
  const parsed = normalizeRoute(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const relationError = routeRelationError(parsed.value)
  if (relationError) return res.status(400).json({ error: relationError })
  const stamp = istParts().iso
  const record = {
    id: newTransportId('rte'),
    ...parsed.value,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: req.authUser?.email || '',
  }
  writeTransportRoutes([record, ...readTransportRoutes()])
  keepRouteAssignmentUnique(record.id, 'driverId', record.driverId)
  keepRouteAssignmentUnique(record.id, 'vehicleId', record.vehicleId)
  syncRouteTrackingLinks()
  res.status(201).json(record)
})

app.patch('/api/transport/routes/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const routes = readTransportRoutes()
  const existing = routes.find((route) => route.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Route not found.' })
  const parsed = normalizeRoute(req.body, existing)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const relationError = routeRelationError(parsed.value, existing.id)
  if (relationError) return res.status(400).json({ error: relationError })
  const updated = { ...existing, ...parsed.value, updatedAt: istParts().iso }
  writeTransportRoutes(routes.map((route) => (route.id === existing.id ? updated : route)))
  keepRouteAssignmentUnique(updated.id, 'driverId', updated.driverId)
  keepRouteAssignmentUnique(updated.id, 'vehicleId', updated.vehicleId)
  syncRouteTrackingLinks()
  res.json(updated)
})

app.delete('/api/transport/routes/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const routes = readTransportRoutes()
  if (!routes.some((route) => route.id === req.params.id)) {
    return res.status(404).json({ error: 'Route not found.' })
  }
  if (readTransportAllocations().some((allocation) => allocation.routeId === req.params.id)) {
    return res.status(409).json({ error: 'Remove the student allocations for this route before deleting it.' })
  }
  writeTransportRoutes(routes.filter((route) => route.id !== req.params.id))
  syncRouteTrackingLinks()
  res.json({ deleted: true })
})

app.get('/api/transport/routes/:id/geometry', requireRoles('admin', 'super_admin', 'parent'), async (req, res) => {
  const route = readTransportRoutes().find((item) => item.id === req.params.id)
  if (!route) return res.status(404).json({ error: 'Route not found.' })
  if (req.authUser.role === 'parent') {
    const context = parentTransportContext(req.authUser)
    if (!context.route || context.route.id !== route.id) {
      return res.status(403).json({ error: 'This route is not assigned to your child.' })
    }
  }
  const signature = routeSignature(route.stops)
  const cacheRaw = readJsonFile(TRANSPORT_GEOMETRY_FILE, {})
  const cache = cacheRaw && typeof cacheRaw === 'object' && !Array.isArray(cacheRaw) ? cacheRaw : {}
  const cached = cache[route.id]
  const cachedFresh =
    cached &&
    cached.signature === signature &&
    (cached.source === 'osrm' || Date.now() - Number(cached.fetchedAt || 0) < 10 * 60 * 1000)
  if (cachedFresh) return res.json({ id: route.id, ...cached })

  let geometry = route.stops.length >= 2 ? await fetchRoadGeometry(route.stops) : null
  if (!geometry) geometry = straightGeometry(route.stops)
  const record = { signature, ...geometry, fetchedAt: Date.now() }
  const routeIds = new Set(readTransportRoutes().map((item) => item.id))
  const nextCache = {}
  for (const [key, value] of Object.entries(cache)) {
    if (routeIds.has(key)) nextCache[key] = value
  }
  nextCache[route.id] = record
  writeJsonFile(TRANSPORT_GEOMETRY_FILE, nextCache)
  res.json({ id: route.id, ...record })
})

app.get('/api/transport/drivers', requireRoles('admin', 'super_admin'), (_req, res) => {
  const routes = readTransportRoutes()
  res.json(readTransportDrivers().map((driver) => driverView(driver, routes)))
})

app.post('/api/transport/drivers', requireRoles('admin', 'super_admin'), (req, res) => {
  const parsed = normalizeDriver(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const routeId = String(req.body?.routeId || '').trim()
  if (routeId && !readTransportRoutes().some((route) => route.id === routeId)) {
    return res.status(400).json({ error: 'Selected route was not found.' })
  }
  const stamp = istParts().iso
  const record = { id: newTransportId('drv'), ...parsed.value, createdAt: stamp, updatedAt: stamp }
  writeTransportDrivers([record, ...readTransportDrivers()])
  assignDriverRoute(record.id, routeId)
  res.status(201).json(driverView(record, readTransportRoutes()))
})

app.patch('/api/transport/drivers/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const drivers = readTransportDrivers()
  const existing = drivers.find((driver) => driver.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Driver not found.' })
  const parsed = normalizeDriver(req.body, existing)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const routeId = req.body?.routeId !== undefined ? String(req.body.routeId || '').trim() : null
  if (routeId && !readTransportRoutes().some((route) => route.id === routeId)) {
    return res.status(400).json({ error: 'Selected route was not found.' })
  }
  const updated = { ...existing, ...parsed.value, updatedAt: istParts().iso }
  writeTransportDrivers(drivers.map((driver) => (driver.id === existing.id ? updated : driver)))
  if (routeId !== null) assignDriverRoute(updated.id, routeId)
  res.json(driverView(updated, readTransportRoutes()))
})

app.delete('/api/transport/drivers/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const drivers = readTransportDrivers()
  if (!drivers.some((driver) => driver.id === req.params.id)) {
    return res.status(404).json({ error: 'Driver not found.' })
  }
  writeTransportDrivers(drivers.filter((driver) => driver.id !== req.params.id))
  const stamp = istParts().iso
  const routes = readTransportRoutes()
  if (routes.some((route) => route.driverId === req.params.id)) {
    writeTransportRoutes(
      routes.map((route) => (route.driverId === req.params.id ? { ...route, driverId: '', updatedAt: stamp } : route)),
    )
  }
  res.json({ deleted: true })
})

app.post('/api/transport/drivers/:id/login/pin', requireRoles('admin', 'super_admin'), (req, res) => {
  const drivers = readTransportDrivers()
  const existing = drivers.find((driver) => driver.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Driver not found.' })
  if (!normalizeDriverPhone(existing.phone)) {
    return res.status(400).json({ error: 'Add a valid phone number to this driver before creating a login.' })
  }
  const pin = String(randomInt(0, 1000000)).padStart(6, '0')
  const stamp = istParts()
  const login = {
    ...(existing.login && typeof existing.login === 'object' ? existing.login : {}),
    pinHash: bcrypt.hashSync(pin, 10),
    enabled: true,
    version: (Number(existing.login?.version) || 0) + 1,
    failedAttempts: 0,
    lockedUntil: 0,
    pinSetAt: stamp.iso,
    pinSetAtIST: `${stamp.date} ${stamp.time}`,
  }
  const updated = { ...existing, login, updatedAt: stamp.iso }
  writeTransportDrivers(drivers.map((driver) => (driver.id === existing.id ? updated : driver)))
  res.json({ pin, driver: driverView(updated, readTransportRoutes()) })
})

app.patch('/api/transport/drivers/:id/login', requireRoles('admin', 'super_admin'), (req, res) => {
  const enabled = req.body?.enabled
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be true or false.' })
  const drivers = readTransportDrivers()
  const existing = drivers.find((driver) => driver.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Driver not found.' })
  if (enabled && !existing.login?.pinHash) {
    return res.status(400).json({ error: 'Generate a PIN before enabling this login.' })
  }
  const stamp = istParts()
  const nextLogin = {
    ...existing.login,
    enabled,
    ...(enabled
      ? {}
      : {
          version: (Number(existing.login?.version) || 0) + 1,
          failedAttempts: 0,
          lockedUntil: 0,
        }),
  }
  const updated = { ...existing, login: nextLogin, updatedAt: stamp.iso }
  writeTransportDrivers(drivers.map((driver) => (driver.id === existing.id ? updated : driver)))
  res.json({ driver: driverView(updated, readTransportRoutes()) })
})

/** Driver phone + PIN login — no email/OTP needed, only the driver portal opens. */
app.post('/api/auth/driver/login', async (req, res) => {
  const phone = normalizeDriverPhone(req.body?.phone)
  const pin = String(req.body?.pin || '').replace(/\D/g, '')
  if (!phone || pin.length !== 6) {
    return res.status(400).json({ error: 'Enter your phone number and 6-digit PIN.' })
  }

  const drivers = readTransportDrivers()
  const driver = drivers.find((item) => normalizeDriverPhone(item.phone) === phone) || null
  const login = driver?.login && typeof driver.login === 'object' ? driver.login : null
  if (login?.lockedUntil && login.lockedUntil > Date.now()) {
    const minutes = Math.max(1, Math.ceil((login.lockedUntil - Date.now()) / 60000))
    return res.status(429).json({ error: `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` })
  }

  const pinOk = bcrypt.compareSync(pin, login?.pinHash || DRIVER_DUMMY_PIN_HASH)
  if (!driver || !login?.pinHash || !pinOk) {
    if (driver && login?.pinHash) {
      const attempts = (Number(login.failedAttempts) || 0) + 1
      const locked = attempts >= DRIVER_PIN_ATTEMPTS_MAX
      const stamp = istParts()
      const nextLogin = {
        ...login,
        failedAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? Date.now() + DRIVER_PIN_LOCK_MS : 0,
      }
      const updated = { ...driver, login: nextLogin, updatedAt: stamp.iso }
      writeTransportDrivers(drivers.map((item) => (item.id === driver.id ? updated : item)))
      if (locked) {
        return res.status(429).json({ error: 'Too many wrong attempts. Try again in 15 minutes.' })
      }
    }
    return res.status(401).json({ error: 'Wrong phone number or PIN.' })
  }

  if (login.enabled === false) {
    return res.status(403).json({ error: 'This driver login is switched off by the school.' })
  }

  const stamp = istParts()
  const updated = {
    ...driver,
    login: {
      ...login,
      failedAttempts: 0,
      lockedUntil: 0,
      lastLoginAt: stamp.iso,
      lastLoginAtIST: `${stamp.date} ${stamp.time}`,
    },
    updatedAt: stamp.iso,
  }
  writeTransportDrivers(drivers.map((item) => (item.id === driver.id ? updated : item)))
  res.json({ ...issueDriverToken(updated), expiresInSec: Math.round(DRIVER_SESSION_MS / 1000) })
})

app.get('/api/transport/vehicles', requireRoles('admin', 'super_admin'), (_req, res) => {
  const routes = readTransportRoutes()
  const vehicles = readTransportVehicles().map((vehicle) => ({
    ...vehicle,
    routeId: routes.find((route) => route.vehicleId === vehicle.id)?.id || '',
  }))
  res.json(vehicles)
})

app.post('/api/transport/vehicles', requireRoles('admin', 'super_admin'), (req, res) => {
  const parsed = normalizeVehicle(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const routeId = String(req.body?.routeId || '').trim()
  if (routeId && !readTransportRoutes().some((route) => route.id === routeId)) {
    return res.status(400).json({ error: 'Selected route was not found.' })
  }
  const stamp = istParts().iso
  const record = { id: newTransportId('veh'), ...parsed.value, createdAt: stamp, updatedAt: stamp }
  writeTransportVehicles([record, ...readTransportVehicles()])
  assignVehicleRoute(record.id, routeId)
  res.status(201).json({ ...record, routeId })
})

app.patch('/api/transport/vehicles/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const vehicles = readTransportVehicles()
  const existing = vehicles.find((vehicle) => vehicle.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Bus not found.' })
  const parsed = normalizeVehicle(req.body, existing)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const routeId = req.body?.routeId !== undefined ? String(req.body.routeId || '').trim() : null
  if (routeId && !readTransportRoutes().some((route) => route.id === routeId)) {
    return res.status(400).json({ error: 'Selected route was not found.' })
  }
  const updated = { ...existing, ...parsed.value, updatedAt: istParts().iso }
  writeTransportVehicles(vehicles.map((vehicle) => (vehicle.id === existing.id ? updated : vehicle)))
  if (routeId !== null) assignVehicleRoute(updated.id, routeId)
  const assigned = readTransportRoutes().find((route) => route.vehicleId === updated.id)
  res.json({ ...updated, routeId: assigned?.id || '' })
})

app.delete('/api/transport/vehicles/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const vehicles = readTransportVehicles()
  if (!vehicles.some((vehicle) => vehicle.id === req.params.id)) {
    return res.status(404).json({ error: 'Bus not found.' })
  }
  writeTransportVehicles(vehicles.filter((vehicle) => vehicle.id !== req.params.id))
  const stamp = istParts().iso
  const routes = readTransportRoutes()
  if (routes.some((route) => route.vehicleId === req.params.id)) {
    writeTransportRoutes(
      routes.map((route) => (route.vehicleId === req.params.id ? { ...route, vehicleId: '', updatedAt: stamp } : route)),
    )
  }
  res.json({ deleted: true })
})

app.get('/api/transport/allocations', requireRoles('admin', 'super_admin'), (_req, res) => {
  res.json(readTransportAllocations())
})

app.post('/api/transport/allocations', requireRoles('admin', 'super_admin'), (req, res) => {
  const parsed = normalizeAllocation(req.body)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const relation = allocationRelationError(parsed.value)
  if (relation.error) return res.status(400).json({ error: relation.error })
  const stamp = istParts().iso
  const record = {
    id: newTransportId('alo'),
    ...relation.value,
    createdAt: stamp,
    updatedAt: stamp,
    createdBy: req.authUser?.email || '',
  }
  writeTransportAllocations([record, ...readTransportAllocations()])
  res.status(201).json(record)
})

app.patch('/api/transport/allocations/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const allocations = readTransportAllocations()
  const existing = allocations.find((allocation) => allocation.id === req.params.id)
  if (!existing) return res.status(404).json({ error: 'Allocation not found.' })
  const parsed = normalizeAllocation(req.body, existing)
  if (parsed.error) return res.status(400).json({ error: parsed.error })
  const relation = allocationRelationError(parsed.value, existing.id)
  if (relation.error) return res.status(400).json({ error: relation.error })
  const updated = { ...existing, ...relation.value, updatedAt: istParts().iso }
  writeTransportAllocations(allocations.map((allocation) => (allocation.id === existing.id ? updated : allocation)))
  res.json(updated)
})

app.delete('/api/transport/allocations/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const allocations = readTransportAllocations()
  if (!allocations.some((allocation) => allocation.id === req.params.id)) {
    return res.status(404).json({ error: 'Allocation not found.' })
  }
  writeTransportAllocations(allocations.filter((allocation) => allocation.id !== req.params.id))
  res.json({ deleted: true })
})

app.get('/api/transport/my', requireRoles('parent'), (req, res) => {
  const context = parentTransportContext(req.authUser)
  const now = Date.now()
  const { student, allocation, route, driver, tracking } = context
  const ping = tracking ? readTransportLive()[tracking.id] || null : null
  const active = tracking ? tracking.active !== false : false
  res.json({
    student: student
      ? {
          id: student.id,
          applicationId: student.applicationId || '',
          name: student.title || student.name || '',
          className: student.subtitle || student.className || '',
          rollNo: student.rollNo || '',
        }
      : null,
    allocation: allocation
      ? {
          id: allocation.id,
          routeId: allocation.routeId,
          pickupStopId: allocation.pickupStopId || '',
          dropStopId: allocation.dropStopId || '',
        }
      : null,
    route: route ? parentRouteView(route) : null,
    driver: driver
      ? {
          name: driver.name,
          phone: driver.phone || '',
          status: driver.status || '',
          licenseExpiry: driver.licenseExpiry || '',
        }
      : tracking
        ? {
            name: tracking.driverName || '',
            phone: tracking.phone || '',
            status: 'On duty',
            licenseExpiry: '',
          }
        : null,
    vehicle: tracking
      ? {
          driverName: tracking.driverName || '',
          vehicleLabel: tracking.vehicleLabel || '',
          active,
          online: active && ping ? isTrackOnline(ping.at, now) : false,
          lastPing: ping
            ? {
                lat: ping.lat,
                lng: ping.lng,
                accuracy: ping.accuracy,
                speed: ping.speed,
                speedKmh: ping.speedKmh ?? null,
                speedSource: ping.speedSource || '',
                heading: ping.heading,
                battery: ping.battery,
                at: ping.at,
                atIST: ping.atIST,
              }
            : null,
          trail: Array.isArray(ping?.trail) ? ping.trail.slice(-40) : [],
        }
      : null,
    staleAfterSec: Math.round(TRACK_STALE_MS / 1000),
    now,
  })
})

app.get('/api/transport/tracking-keys', requireRoles('admin', 'super_admin'), (_req, res) => {
  res.json(readTrackingKeys().map(trackingKeyView))
})

app.post('/api/transport/tracking-keys', requireRoles('admin', 'super_admin'), (req, res) => {
  const driverName = String(req.body?.driverName || '').trim().slice(0, 80)
  const routeId = String(req.body?.routeId || '').trim()
  const route = routeId ? readTransportRoutes().find((item) => item.id === routeId) : null
  if (routeId && !route) return res.status(400).json({ error: 'Selected route was not found.' })
  const vehicleLabel = String(req.body?.vehicleLabel || '').trim().slice(0, 80) || route?.vehicleLabel || ''
  const routeLabel = String(req.body?.routeLabel || '').trim().slice(0, 80) || route?.name || ''
  const rawPhone = String(req.body?.phone || '').trim().slice(0, 24)
  const phone = normalizeWhatsAppPhone(rawPhone)
  const autoSend = Boolean(req.body?.autoSend)
  if (!driverName) return res.status(400).json({ error: 'Driver name is required.' })
  if (rawPhone && !phone) {
    return res.status(400).json({ error: 'Enter a valid WhatsApp number with country code, e.g. +91 98765 43210.' })
  }
  if (autoSend && !phone) {
    return res.status(400).json({ error: 'A valid WhatsApp number is required for daily auto-send.' })
  }
  const keys = readTrackingKeys()
  const record = {
    id: `trk_${Date.now().toString(36)}`,
    key: generateTrackingKey(),
    driverName,
    vehicleLabel,
    routeLabel,
    routeId,
    phone,
    active: true,
    autoSend,
    createdAt: istParts().iso,
    createdBy: req.authUser?.email || '',
  }
  writeTrackingKeys([record, ...keys].slice(0, TRACKING_KEYS_MAX))
  if (routeId) {
    const stamp = istParts().iso
    writeTransportRoutes(
      readTransportRoutes().map((item) =>
        item.id === routeId ? { ...item, trackingId: record.id, vehicleLabel: item.vehicleLabel || vehicleLabel, updatedAt: stamp } : item,
      ),
    )
    syncRouteTrackingLinks()
  }
  res.status(201).json(trackingKeyView(record))
})

app.patch('/api/transport/tracking-keys/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const keys = readTrackingKeys()
  const record = keys.find((item) => item.id === req.params.id)
  if (!record) return res.status(404).json({ error: 'Tracking link not found.' })
  const body = req.body || {}
  const patch = {}
  if ('active' in body) patch.active = Boolean(body.active)
  if ('autoSend' in body) patch.autoSend = Boolean(body.autoSend)
  let nextPhone = record.phone || ''
  if ('phone' in body) {
    const rawPhone = String(body.phone || '').trim().slice(0, 24)
    nextPhone = normalizeWhatsAppPhone(rawPhone)
    if (rawPhone && !nextPhone) {
      return res.status(400).json({ error: 'Enter a valid WhatsApp number with country code, e.g. +91 98765 43210.' })
    }
    patch.phone = nextPhone
  }
  const nextAutoSend = 'autoSend' in patch ? patch.autoSend : record.autoSend === true
  if (nextAutoSend && !normalizeWhatsAppPhone(nextPhone)) {
    return res.status(400).json({ error: 'A valid WhatsApp number is required for daily auto-send.' })
  }
  if (!Object.keys(patch).length) return res.json(trackingKeyView(record))
  const updated = { ...record, ...patch, updatedAt: istParts().iso }
  writeTrackingKeys(keys.map((item) => (item.id === record.id ? updated : item)))
  res.json(trackingKeyView(updated))
})

app.get('/api/transport/whatsapp/status', requireRoles('admin', 'super_admin'), (req, res) => {
  res.json(whatsAppDeliverySummary(req, readTrackingKeys()))
})

app.post('/api/transport/tracking-keys/:id/send-now', requireRoles('admin', 'super_admin'), async (req, res) => {
  const keys = readTrackingKeys()
  const record = keys.find((item) => item.id === req.params.id)
  if (!record) return res.status(404).json({ error: 'Tracking link not found.' })
  if (record.active === false) {
    return res.status(409).json({ error: 'Switch this tracking link on before sending it.' })
  }
  if (!normalizeWhatsAppPhone(record.phone)) {
    return res.status(400).json({ error: 'Save a valid WhatsApp number before sending.' })
  }
  const link = trackingLinkFor(req, record)
  if (!link) return res.status(503).json({ error: 'The public app link is not configured. Set PUBLIC_APP_URL on the server.' })
  try {
    const result = await sendDailyTrackingWhatsApp({
      to: record.phone,
      driverName: record.driverName,
      vehicleLabel: record.vehicleLabel,
      routeLabel: record.routeLabel,
      link,
    })
    const updated = markAutoSent(record)
    writeTrackingKeys(keys.map((item) => (item.id === record.id ? updated : item)))
    appendWhatsAppDailyLog([
      {
        at: updated.lastAutoSendAt,
        atIST: updated.lastAutoSendAtIST,
        trigger: 'manual',
        id: record.id,
        driverName: record.driverName,
        phone: maskWhatsAppPhone(record.phone),
        status: 'sent',
        messageId: result.messageId,
      },
    ])
    res.json({ key: trackingKeyView(updated), messageId: result.messageId, sentAtIST: updated.lastAutoSendAtIST })
  } catch (error) {
    const updated = markAutoFailed(record, error)
    writeTrackingKeys(keys.map((item) => (item.id === record.id ? updated : item)))
    appendWhatsAppDailyLog([
      {
        at: updated.lastAutoSendAt,
        atIST: updated.lastAutoSendAtIST,
        trigger: 'manual',
        id: record.id,
        driverName: record.driverName,
        phone: maskWhatsAppPhone(record.phone),
        status: 'failed',
        error: updated.lastAutoSendError,
      },
    ])
    const status = Number(error?.status) >= 500 ? Number(error.status) : 502
    res.status(status).json({
      error: updated.lastAutoSendError,
      missing: Array.isArray(error?.missing) ? error.missing : undefined,
      key: trackingKeyView(updated),
    })
  }
})

/** Cron runs stay silent on a school holiday and log one skip entry. */
function respondHolidayCronSkip(res, holiday = currentHoliday()) {
  if (!holiday.active) return false
  const stamp = dailyDeliveryStamp()
  appendWhatsAppDailyLog([
    {
      at: stamp.iso,
      atIST: stamp.atIST,
      trigger: 'cron',
      status: 'skipped-holiday',
      error: holiday.title,
    },
  ])
  res.json({
    ok: true,
    skippedHoliday: true,
    holiday,
    todayIST: stamp.date,
    counts: { eligible: 0, sent: 0, failed: 0, skipped: 0 },
  })
  return true
}

// Vercel Cron entry point: 6:00 AM IST daily. Configure CRON_SECRET so Vercel
// sends the bearer header; the endpoint also refuses to run without it.
app.get('/api/cron/transport-daily-links', async (req, res) => {
  const secret = String(process.env.CRON_SECRET || '').trim()
  if (!secret) {
    return res.status(503).json({ error: 'CRON_SECRET is not set on the server, so cron runs are disabled.' })
  }
  if (!safeSecretMatch(req.headers.authorization, `Bearer ${secret}`)) {
    return res.status(401).json({ error: 'Unauthorized cron request.' })
  }
  if (respondHolidayCronSkip(res)) return
  const config = whatsAppConfigStatus()
  if (!config.configured) {
    const stamp = dailyDeliveryStamp()
    appendWhatsAppDailyLog([
      {
        at: stamp.iso,
        atIST: stamp.atIST,
        trigger: 'cron',
        status: 'skipped-config',
        error: `Missing: ${config.missing.join(', ')}`,
      },
    ])
    return res.status(503).json({
      error: 'WhatsApp Cloud API is not configured.',
      missing: config.missing,
    })
  }
  if (!publicAppOrigin(req)) {
    return res.status(503).json({ error: 'PUBLIC_APP_URL is required so tracking links point at the public app.' })
  }
  if (respondHolidayCronSkip(res)) return
  const todayIST = istParts().date
  const result = await runDailyWhatsApp({
    records: readTrackingKeys(),
    todayIST,
    linkFor: (record) => trackingLinkFor(req, record),
    send: (payload) => sendDailyTrackingWhatsApp(payload),
  })
  writeTrackingKeys(result.records)
  const runStamp = dailyDeliveryStamp()
  appendWhatsAppDailyLog([
    ...result.sent.map((item) => ({
      at: runStamp.iso,
      atIST: runStamp.atIST,
      trigger: 'cron',
      id: item.id,
      driverName: item.driverName,
      status: 'sent',
      messageId: item.messageId,
    })),
    ...result.failed.map((item) => ({
      at: runStamp.iso,
      atIST: runStamp.atIST,
      trigger: 'cron',
      id: item.id,
      driverName: item.driverName,
      status: 'failed',
      error: item.error,
    })),
  ])
  res.json({
    ok: result.failed.length === 0,
    todayIST,
    counts: result.counts,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped,
  })
})

app.delete('/api/transport/tracking-keys/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const keys = readTrackingKeys()
  if (!keys.some((item) => item.id === req.params.id)) {
    return res.status(404).json({ error: 'Tracking link not found.' })
  }
  writeTrackingKeys(keys.filter((item) => item.id !== req.params.id))
  const live = readTransportLive()
  if (live[req.params.id]) {
    delete live[req.params.id]
    writeTransportLive(live)
  }
  const routes = readTransportRoutes()
  if (routes.some((route) => route.trackingId === req.params.id)) {
    writeTransportRoutes(
      routes.map((route) => (route.trackingId === req.params.id ? { ...route, trackingId: '' } : route)),
    )
  }
  syncRouteTrackingLinks()
  res.json({ deleted: true })
})

app.get('/api/transport/live', requireRoles('admin', 'super_admin'), (_req, res) => {
  const keys = readTrackingKeys()
  const live = readTransportLive()
  const now = Date.now()
  const vehicles = keys.map((record) => serializeLiveVehicle(record, live[record.id] || null, now))
  res.json({ vehicles, routes: readTransportRoutes(), staleAfterSec: Math.round(TRACK_STALE_MS / 1000), now })
})

function currentHoliday(date = new Date()) {
  return holidayForDate(date, readEvents())
}

function rejectHolidayTracking(res, holiday = currentHoliday()) {
  if (!holiday.active) return false
  res.status(409).json({
    error: `Today is ${holiday.title}. School transport and live tracking are off.`,
    code: 'HOLIDAY',
    holiday,
  })
  return true
}

app.get('/api/driver/me', requireDriver, (req, res) => {
  const { route, tracking } = driverTrackingRecord(req.driver)
  const vehicle = route?.vehicleId
    ? readTransportVehicles().find((item) => item.id === route.vehicleId) || null
    : null
  const live = tracking ? readTransportLive()[tracking.id] || null : null
  res.json({
    driver: {
      id: req.driver.id,
      name: req.driver.name,
      phone: req.driver.phone || '',
    },
    route: route
      ? {
          id: route.id,
          name: route.name,
          code: route.code || '',
          status: route.status || 'Active',
          stops: Array.isArray(route.stops) ? route.stops : [],
        }
      : null,
    bus: vehicle
      ? { id: vehicle.id, number: vehicle.number, model: vehicle.model || '', capacity: vehicle.capacity ?? null }
      : route?.vehicleLabel
        ? { id: '', number: route.vehicleLabel, model: '', capacity: null }
        : null,
    tracking: tracking
      ? {
          active: tracking.active !== false,
          pingEverySec: 15,
          lastPingAt: live?.at || '',
          lastPingAtIST: live?.atIST || '',
          staleAfterSec: Math.round(TRACK_STALE_MS / 1000),
        }
      : null,
    holiday: currentHoliday(),
    now: Date.now(),
  })
})

app.post('/api/driver/ping', requireDriver, async (req, res) => {
  if (rejectHolidayTracking(res)) return
  const { tracking } = driverTrackingRecord(req.driver)
  if (!tracking) {
    return res.status(409).json({ error: 'No tracking link is connected to your route. Contact the school office.' })
  }
  if (tracking.active === false) {
    return res.status(410).json({ error: 'Live tracking is switched off by the school.' })
  }
  return handleTrackPing(req, res, tracking)
})

// Public driver endpoints — the link key itself is the capability.
app.get('/api/track/:key', (req, res) => {
  const record = findTrackingKeyByKey(req.params.key)
  if (!record) return res.status(404).json({ error: 'This tracking link is not valid.' })
  if (record.active === false) return res.status(410).json({ error: 'This tracking link has been switched off by the school.' })
  res.json({
    driverName: record.driverName,
    vehicleLabel: record.vehicleLabel,
    routeLabel: record.routeLabel,
    active: true,
    pingEverySec: 15,
  })
})

async function handleTrackPing(req, res, record) {
  if (rejectHolidayTracking(res)) return
  const fix = sanitizeFix(req.body)
  if (!fix) return res.status(400).json({ error: 'A valid GPS position is required.' })
  const live = readTransportLive()
  const prev = live[record.id] || null
  if (prev && Date.now() - Date.parse(prev.at) < TRACK_MIN_PING_GAP_MS) {
    return res.json({ ok: true, throttled: true })
  }
  const reading = speedReading(fix, prev)
  const shownKmh = smoothSpeedKmh(reading.kmh, prev)
  const speedSource = shownKmh == null ? null : reading.source
  const ist = istParts()
  const entry = {
    ...fix,
    at: ist.iso,
    atIST: `${ist.date} ${ist.time}`,
    device: sanitizeDevice(req.body?.device),
    speedKmh: shownKmh == null ? null : Math.round(shownKmh * 10) / 10,
    speedSource,
    trail: [...(Array.isArray(prev?.trail) ? prev.trail : []), trailPoint(fix)].slice(-TRACK_TRAIL_MAX),
  }
  // Older screens read speed in m/s; keep it equal to the shown value so both agree.
  entry.speed = shownKmh == null ? null : Math.round((shownKmh / 3.6) * 10) / 10
  live[record.id] = entry
  writeTransportLive(live)
  let overspeedNotice = null
  // Alerts use the unsmoothed reading so a real overspeed is not delayed by the average.
  const detection = recordOverspeedDetection({ record, fix, kmh: reading.kmh, device: entry.device, speedSource })
  if (detection) {
    if (detection.isNew) {
      const recipients = overspeedAdminEmails()
      let sent = 0
      for (const email of recipients) {
        const result = await sendOverspeedAlertEmail({ to: email, event: { ...detection.event, limitKmh: OVERSPEED_LIMIT_KMH } })
        if (result.sent) sent += 1
      }
      const alerts = readOverspeedAlerts()
      const idx = alerts.findIndex((a) => a.id === detection.event.id)
      if (idx >= 0) {
        alerts[idx] = { ...alerts[idx], email: { sent: sent > 0, recipients: recipients.length, sentCount: sent } }
        writeOverspeedAlerts(alerts)
      }
      overspeedNotice = { raised: true, speedKmh: detection.event.speedKmh, limitKmh: OVERSPEED_LIMIT_KMH }
    } else {
      overspeedNotice = { raised: false, speedKmh: detection.event.lastKmh, limitKmh: OVERSPEED_LIMIT_KMH }
    }
  } else if (reading.kmh != null && reading.kmh <= OVERSPEED_LIMIT_KMH) {
    endOverspeedIfStale(record)
  }

  res.json({ ok: true, atIST: entry.atIST, speedKmh: entry.speedKmh, speedSource, staleAfterSec: Math.round(TRACK_STALE_MS / 1000), ...(overspeedNotice ? { overspeed: overspeedNotice } : {}) })
}

app.post('/api/track/:key/ping', async (req, res) => {
  const record = findTrackingKeyByKey(req.params.key)
  if (!record) return res.status(404).json({ error: 'This tracking link is not valid.' })
  if (record.active === false) return res.status(410).json({ error: 'This tracking link has been switched off by the school.' })
  return handleTrackPing(req, res, record)
})

// --- Overspeed alerts: bus above 55 km/h → admin email + dashboard warning + admin respond
const OVERSPEED_FILE = join('data', 'overspeed_alerts.json')
const OVERSPEED_KEEP_MAX = 300

function readOverspeedAlerts() {
  const list = readJsonFile(OVERSPEED_FILE, [])
  return Array.isArray(list) ? list : []
}

function writeOverspeedAlerts(list) {
  writeJsonFile(OVERSPEED_FILE, list.slice(0, OVERSPEED_KEEP_MAX))
}

function overspeedAdminEmails() {
  return [...new Set(
    readJsonFile(join('data', 'users.json'), [])
      .filter((u) => ['admin', 'super_admin'].includes(String(u.role || '').toLowerCase()))
      .map((u) => String(u.email || '').trim().toLowerCase())
      .filter((email) => RESULT_EMAIL_REGEX.test(email)),
  )]
}

function recordOverspeedDetection({ record, fix, kmh, device = '', speedSource = '' }) {
  if (kmh == null || kmh <= OVERSPEED_LIMIT_KMH) return null
  const ist = istParts()
  const alerts = readOverspeedAlerts()
  const rounded = Math.round(kmh)
  const accuracy = Number.isFinite(Number(fix.accuracy)) ? Math.round(Number(fix.accuracy)) : null
  const stampIST = `${ist.date} ${ist.time}`

  const openIndex = alerts.findIndex(
    (a) => a.trackingId === record.id && a.status === 'open' && Date.now() - Date.parse(a.lastAt || 0) < OVERSPEED_EVENT_WINDOW_MS,
  )
  if (openIndex >= 0) {
    const open = alerts[openIndex]
    const updated = {
      ...open,
      speedKmh: Math.max(Number(open.speedKmh) || 0, rounded),
      lastKmh: rounded,
      lastAt: ist.iso,
      lastAtIST: stampIST,
      lat: fix.lat,
      lng: fix.lng,
      device: device || open.device || '',
      speedSource: speedSource || open.speedSource || '',
      accuracy: accuracy ?? open.accuracy ?? null,
      pingCount: (open.pingCount || 1) + 1,
    }
    writeOverspeedAlerts(alerts.map((a, i) => (i === openIndex ? updated : a)))
    return { event: updated, isNew: false }
  }

  const event = {
    id: `OSD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    trackingId: record.id,
    busNo: record.vehicleLabel || '',
    driverName: record.driverName || '',
    phone: record.phone || '',
    routeLabel: record.routeLabel || '',
    speedKmh: rounded,
    triggerKmh: rounded,
    lastKmh: rounded,
    lat: fix.lat,
    lng: fix.lng,
    startedAt: ist.iso,
    startedAtIST: stampIST,
    lastAt: ist.iso,
    lastAtIST: stampIST,
    device,
    speedSource,
    accuracy,
    pingCount: 1,
    status: 'open',
    email: { sent: false, recipients: 0, sentCount: 0 },
    endedAt: null,
    endedAtIST: null,
    respondedAt: null,
    respondedAtIST: null,
    respondedBy: '',
    responseNote: '',
  }
  writeOverspeedAlerts([event, ...alerts])
  return { event, isNew: true }
}

/** A below-limit trip after a gap marks the open alert as ended (informational). */
function endOverspeedIfStale(record) {
  const alerts = readOverspeedAlerts()
  const idx = alerts.findIndex((a) => a.trackingId === record.id && a.status === 'open' && !a.endedAtIST)
  if (idx < 0) return
  if (Date.now() - Date.parse(alerts[idx].lastAt || 0) < OVERSPEED_END_MS) return
  const ist = istParts()
  writeOverspeedAlerts(alerts.map((a, i) => (i === idx ? { ...a, endedAt: ist.iso, endedAtIST: `${ist.date} ${ist.time}` } : a)))
}

app.get('/api/transport/overspeed', requireRoles('admin', 'super_admin'), (_req, res) => {
  res.json({ alerts: readOverspeedAlerts(), limitKmh: OVERSPEED_LIMIT_KMH })
})

app.post('/api/transport/overspeed/:id/respond', requireRoles('admin', 'super_admin'), (req, res) => {
  const alerts = readOverspeedAlerts()
  const idx = alerts.findIndex((a) => a.id === req.params.id)
  if (idx < 0) return res.status(404).json({ error: 'Overspeed alert not found.' })
  if (alerts[idx].status !== 'open') return res.status(400).json({ error: 'This alert has already been responded to.' })
  const ist = istParts()
  const updated = {
    ...alerts[idx],
    status: 'responded',
    respondedAt: ist.iso,
    respondedAtIST: `${ist.date} ${ist.time}`,
    respondedBy: req.authUser?.email || '',
    responseNote: String(req.body?.note || '').trim().slice(0, 300),
  }
  writeOverspeedAlerts(alerts.map((a, i) => (i === idx ? updated : a)))
  res.json(updated)
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

// School identity printed on report cards, fee receipts and ID cards. Stored
// server-side so a parent's phone shows the same school details as the admin.
const SCHOOL_PROFILE_FILE = join('data', 'school-profile.json')
const SCHOOL_PROFILE_FIELDS = {
  name: 70,
  address: 120,
  phone: 24,
  email: 120,
  website: 80,
  principalName: 70,
  // School crest as a downscaled data URL (Settings upload canvas). Whitespace
  // must survive, so it is handled separately from the squashed text fields.
  logoData: 500000,
}
const EMPTY_SCHOOL_PROFILE = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  principalName: '',
  logoData: '',
}

function normalizeSchoolLogo(value) {
  const raw = String(value ?? '').trim()
  return /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=\r\n]+$/.test(raw) ? raw : ''
}

function readSchoolProfile() {
  const stored = readJsonFile(SCHOOL_PROFILE_FILE, {})
  const profile = {}
  for (const [key, limit] of Object.entries(SCHOOL_PROFILE_FIELDS)) {
    profile[key] = key === 'logoData'
      ? normalizeSchoolLogo(stored?.[key])
      : String(stored?.[key] ?? '').trim().slice(0, limit)
  }
  profile.updatedAt = String(stored?.updatedAt || '')
  return profile
}

app.get('/api/school-profile', requireRoles(), (_req, res) => {
  res.json(readSchoolProfile())
})

app.put('/api/school-profile', requireRoles('admin', 'super_admin'), (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {}
  const profile = {}
  for (const [key, limit] of Object.entries(SCHOOL_PROFILE_FIELDS)) {
    profile[key] = key === 'logoData'
      ? normalizeSchoolLogo(body[key])
      : String(body[key] ?? '').trim().replace(/\s+/g, ' ').slice(0, limit)
  }
  if (!profile.name) return res.status(400).json({ error: 'School name is required.' })
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    return res.status(400).json({ error: 'Enter a valid school email address.' })
  }
  const saved = { ...profile, updatedAt: new Date().toISOString() }
  writeJsonFile(SCHOOL_PROFILE_FILE, saved)
  res.json(saved)
})

app.delete('/api/school-profile', requireRoles('admin', 'super_admin'), (_req, res) => {
  const cleared = { ...EMPTY_SCHOOL_PROFILE, updatedAt: new Date().toISOString() }
  writeJsonFile(SCHOOL_PROFILE_FILE, cleared)
  res.json(cleared)
})

app.get('/api/payment-config', (_req, res) => {
  const school = readSchoolProfile()
  res.json({
    holderName: process.env.PAYMENT_HOLDER_NAME || '',
    upiId: process.env.PAYMENT_UPI_ID || '',
    mobile: process.env.PAYMENT_MOBILE || '',
    bankName: process.env.PAYMENT_BANK_NAME || '',
    bankAccount: process.env.PAYMENT_BANK_ACCOUNT || '',
    bankIfsc: process.env.PAYMENT_BANK_IFSC || '',
    schoolName: school.name,
    schoolAddress: school.address,
    schoolPhone: school.phone,
    schoolEmail: school.email,
    schoolWebsite: school.website,
    principalName: school.principalName,
    schoolLogo: school.logoData,
  })
})

app.get('/api/payments', (req, res) => {
  const payments = readJsonFile(join('data', 'payments.json'), [])
  if (req.authUser.role === 'parent') {
    const user = readJsonFile(USERS_FILE, []).find((item) => item.id === req.authUser.id)
    const linkedId = user?.linkedId
    return res.json(linkedId
      ? payments.filter((payment) => String(payment.studentId) === String(linkedId))
      : [])
  }
  res.json(payments)
})

// Per-student fee ledger: total fee (set by admin) against verified payments.
// Parents see only their linked child; staff can filter with ?studentId or
// receive every student.
app.get('/api/payments/summary', (req, res) => {
  const students = readStudentRecords()
  const payments = readJsonFile(join('data', 'payments.json'), [])
  const resultRows = readResultRows()
  const teacherRows = readJsonFile(join('data', 'teachers.json'), [])
  const teacherPhoneOf = (name) => {
    const needle = String(name || '').trim().toLowerCase()
    if (!needle) return ''
    const match = (Array.isArray(teacherRows) ? teacherRows : []).find((entry) => (
      [entry?.title, entry?.name, entry?.email].some((value) => String(value || '').trim().toLowerCase() === needle)
    ))
    return String(match?.phone || match?.mobile || match?.contact || '').trim()
  }
  const classTeacherOf = (student) => {
    if (!student) return { name: '', phone: '' }
    const latest = resultRows
      .filter((row) => String(row.studentId) === String(student.id) || String(row.studentId) === String(student.applicationId))
      .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))[0]
    const name = String(latest?.teacherName || '').trim()
    return { name, phone: teacherPhoneOf(name) }
  }
  const build = (student, linkedId) => {
    const keys = [student?.id, linkedId].filter((value) => value !== undefined && value !== null).map(String)
    const history = payments
      .filter((payment) => keys.includes(String(payment.studentId)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    const paid = history.filter((payment) => payment.status === 'Verified').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const pending = history.filter((payment) => payment.status === 'Verification pending').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const rawTotal = student?.totalFee
    const totalFee = rawTotal === null || rawTotal === undefined || rawTotal === '' || !Number.isFinite(Number(rawTotal)) ? null : Number(rawTotal)
    const classTeacher = classTeacherOf(student)
    // Installment schedule from the admission-time plan. No-skip rule: missed
    // installments stack up and must be paid together in the next payment.
    const schedule = totalFee === null ? null : buildFeeSchedule({
      plan: student?.installmentPlan,
      totalFee,
      startDate: student?.admissionDate,
    })
    const coverage = schedule ? coverFeeSchedule(schedule, history, new Date().toISOString().slice(0, 10)) : null
    return {
      student: student
        ? { id: student.id, name: student.title || student.name || '', className: student.subtitle || student.className || '', rollNo: student.rollNo || '' }
        : null,
      totalFee,
      paid,
      pending,
      balance: totalFee === null ? null : Math.max(0, totalFee - paid),
      classTeacherName: classTeacher.name,
      classTeacherPhone: classTeacher.phone,
      feePlan: schedule ? schedule.plan : '',
      installments: coverage ? coverage.installments : [],
      dueNow: coverage ? coverage.dueNow : 0,
      history,
    }
  }
  if (req.authUser.role === 'parent') {
    const user = readJsonFile(USERS_FILE, []).find((item) => item.id === req.authUser.id)
    const linkedId = user?.linkedId
    if (!linkedId) return res.json({ students: [] })
    const child = students.find((item) => String(item.id) === String(linkedId) || String(item.applicationId) === String(linkedId)) || null
    return res.json({ students: [build(child, linkedId)] })
  }
  const wanted = String(req.query.studentId || '')
  const list = wanted ? students.filter((item) => String(item.id) === wanted || String(item.applicationId) === wanted) : students
  res.json({ students: list.map((item) => build(item, item.applicationId)) })
})

app.post('/api/payments', (req, res) => {
  const payment = req.body && typeof req.body === 'object' ? { ...req.body, id: req.body.id || `PAY-${Date.now()}` } : null
  const amount = Number(payment?.amount)
  if (
    !payment?.studentId ||
    !String(payment.reference || '').trim() ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({ error: 'Student, amount and payment reference are required.' })
  }
  if (req.authUser.role === 'parent') {
    const user = readJsonFile(USERS_FILE, []).find((item) => item.id === req.authUser.id)
    if (!user?.linkedId || String(payment.studentId) !== String(user.linkedId)) {
      return res.status(403).json({ error: 'You can submit payments only for your linked student.' })
    }
    payment.parentName = user.name
    payment.status = 'Verification pending'
    payment.reviewedAt = null
    // No-skip rule: when installments are due, the payment must cover every
    // missed installment together — a single later installment is not accepted.
    const child = readStudentRecords().find((item) => (
      String(item.id) === String(user.linkedId) || String(item.applicationId) === String(user.linkedId)
    ))
    const schedule = buildFeeSchedule({
      plan: child?.installmentPlan,
      totalFee: child?.totalFee,
      startDate: child?.admissionDate,
    })
    if (schedule) {
      const existing = readJsonFile(join('data', 'payments.json'), [])
      const coverage = coverFeeSchedule(schedule, existing, new Date().toISOString().slice(0, 10))
      if (coverage && coverage.dueNow > 0 && amount < coverage.dueNow) {
        return res.status(400).json({
          error: `Earlier installments are pending. Pay the combined due amount of ${coverage.dueNow} or more in one payment.`,
          dueNow: coverage.dueNow,
        })
      }
    }
  }
  const payments = readJsonFile(join('data', 'payments.json'), [])
  writeJsonFile(join('data', 'payments.json'), [payment, ...payments].slice(0, 500))
  res.status(201).json(payment)
})

app.patch('/api/payments/:id', requireRoles('admin', 'super_admin'), (req, res) => {
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

app.get('/api/records/:key', (req, res) => {
  const key = String(req.params.key || '')
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return res.status(400).json({ error: 'Invalid record store key.' })
  const records = readJsonFile(join('data', 'records', `${key}.json`), [])
  res.json(Array.isArray(records) ? records : [])
})

app.put('/api/records/:key', (req, res) => {
  const key = String(req.params.key || '')
  if (!/^[A-Za-z0-9_-]+$/.test(key)) return res.status(400).json({ error: 'Invalid record store key.' })
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Record store must be an array.' })
  if (JSON.stringify(req.body).length > 2_000_000) return res.status(413).json({ error: 'Record store is too large.' })
  writeJsonFile(join('data', 'records', `${key}.json`), req.body)
  res.json({ saved: true, count: req.body.length })
})

// Exam results (teacher-only builder). A class has one saved subject list that
// every result of that class reuses; totals, percentage, grade and class rank
// are always computed here, never trusted from the browser. Publishing a
// result stores it for the student and emails the linked parent.
const RESULTS_FILE = join('data', 'records', 'sms_results.json')
const RESULT_SUBJECTS_FILE = join('data', 'records', 'sms_result_subjects.json')
const RESULT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_RESULT_CLASS_LENGTH = 80

function readResultRows() {
  const rows = readJsonFile(RESULTS_FILE, [])
  return Array.isArray(rows) ? rows : []
}

function writeResultRows(rows) {
  writeJsonFile(RESULTS_FILE, Array.isArray(rows) ? rows : [])
}

function readResultSubjects() {
  const map = readJsonFile(RESULT_SUBJECTS_FILE, {})
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {}
}

function writeResultSubjects(map) {
  writeJsonFile(RESULT_SUBJECTS_FILE, map && typeof map === 'object' && !Array.isArray(map) ? map : {})
}

function resultClassKey(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function resultClassOfStudent(student) {
  const direct = String(student?.applyingForClass || student?.studentClass || student?.className || '').trim()
  const raw = direct || String(student?.subtitle || '').replace(/^Class\s+/i, '').trim()
  return raw === 'N/A' ? '' : raw.slice(0, MAX_RESULT_CLASS_LENGTH)
}

function resultStudentName(student) {
  return String(student?.title || student?.name || student?.studentName || '').trim().slice(0, 120) || 'Student'
}

function resultStudentsOfClass(students, classKey) {
  return (Array.isArray(students) ? students : []).filter((student) => {
    const className = resultClassOfStudent(student)
    return className && resultClassKey(className) === classKey
  })
}

function resultClassList(students) {
  const classes = new Map()
  for (const student of students) {
    const name = resultClassOfStudent(student)
    if (!name) continue
    const key = resultClassKey(name)
    if (!classes.has(key)) classes.set(key, { key, name, studentCount: 0 })
    classes.get(key).studentCount += 1
  }
  return [...classes.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
}

function resultRecipientsForStudent(student, users) {
  const keys = [student?.id, student?.applicationId]
    .filter((value) => value !== undefined && value !== null && String(value).trim())
    .map(String)
  const emails = []
  for (const user of Array.isArray(users) ? users : []) {
    if (!user || user.role !== 'parent' || !keys.includes(String(user.linkedId || ''))) continue
    const email = String(user.email || '').trim()
    if (RESULT_EMAIL_REGEX.test(email)) emails.push(email)
  }
  for (const field of ['guardianEmail', 'fatherEmail', 'motherEmail', 'owner', 'email']) {
    const email = String(student?.[field] || '').trim()
    if (RESULT_EMAIL_REGEX.test(email)) emails.push(email)
  }
  return [...new Set(emails.map((email) => email.toLowerCase()))]
}

function rerankResultGroup(rows, examKey, classKey) {
  const ranked = rankResults(rows.filter((row) => row.examKey === examKey && row.classKey === classKey))
  const rankedById = new Map(ranked.map((row) => [row.id, row]))
  return rows.map((row) => rankedById.get(row.id) || row)
}

function publicResult(row) {
  // Recompute from the stored totals so a ladder change applies to results
  // published before the change without re-publishing them.
  const totalMax = Number(row.totalMax) || 0
  const totalScored = Number(row.totalScored) || 0
  const percent = totalMax ? Math.round((totalScored / totalMax) * 1000) / 10 : 0
  return {
    id: row.id,
    examTitle: row.examTitle,
    className: row.className,
    studentId: row.studentId,
    studentName: row.studentName,
    rollNo: row.rollNo || '',
    subjects: Array.isArray(row.subjects) ? row.subjects : [],
    totalScored,
    totalMax,
    percent,
    grade: gradeFromPercent(percent),
    rank: row.rank || null,
    teacherName: row.teacherName || '',
    publishedAt: row.publishedAt || '',
  }
}

function resultEmailStatus({ status, recipients = 0, students = 0, sent = 0, failed = 0, errors = [] }) {
  return { status, recipients, students, sent, failed, errors, updatedAt: new Date().toISOString() }
}

async function queueResultEmailJob(publishId, jobs) {
  const secret = authTokenSecret()
  const base = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/+$/, '')
  if (!secret || !base) {
    throw new Error('Email job could not be queued because the deployment URL or auth secret is missing.')
  }
  const body = JSON.stringify({ publishId, jobs, expiresAt: Date.now() + 10 * 60 * 1000 })
  const signature = createHmac('sha256', secret).update(body).digest('base64url')
  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${base}/.netlify/functions/results-email-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-results-signature': signature },
        body,
        signal: AbortSignal.timeout(8000),
      })
      if (response.ok) return
      lastError = new Error(`The background email job was rejected (HTTP ${response.status}).`)
    } catch (error) {
      lastError = error
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 700))
  }
  throw lastError || new Error('The background email job could not be started.')
}

async function deliverResultEmails({ publishId, jobs }) {
  const recipients = jobs.reduce((total, job) => total + job.recipients.length, 0)
  if (String(process.env.RESULT_MAIL_DISABLED || '') === 'true') {
    return resultEmailStatus({
      status: 'disabled',
      recipients,
      students: jobs.length,
      errors: ['Result emails are disabled on this server.'],
    })
  }
  if (!recipients) return resultEmailStatus({ status: 'sent', students: jobs.length })
  if (isNetlifyRuntime) {
    try {
      await queueResultEmailJob(publishId, jobs)
      return resultEmailStatus({ status: 'queued', recipients, students: jobs.length })
    } catch (error) {
      console.error('Result email queue failed:', error?.message || error)
      return resultEmailStatus({
        status: 'failed',
        recipients,
        students: jobs.length,
        errors: [error?.message || 'Email job could not be queued.'],
      })
    }
  }
  let sent = 0
  const errors = []
  for (const job of jobs) {
    for (const to of job.recipients) {
      const result = await sendResultEmail({
        to,
        studentName: job.studentName,
        examTitle: job.examTitle,
        className: job.className,
        subjects: job.subjects,
        totalScored: job.totalScored,
        totalMax: job.totalMax,
        percent: job.percent,
        grade: job.grade,
        teacherName: job.teacherName,
      })
      if (result.sent) {
        sent += 1
      } else if (errors.length < 5) {
        errors.push(result.error || 'The email could not be delivered.')
      }
    }
  }
  const failed = recipients - sent
  return resultEmailStatus({
    status: failed ? (sent ? 'partial' : 'failed') : 'sent',
    recipients,
    students: jobs.length,
    sent,
    failed,
    errors,
  })
}

app.get('/api/results/class', requireRoles('teacher'), (req, res) => {
  const students = readStudentRecords()
  const classes = resultClassList(students)
  const requested = String(req.query.className || '').trim().slice(0, MAX_RESULT_CLASS_LENGTH)
  if (!requested) {
    return res.json({ classes, className: '', classKey: '', students: [], subjects: [], exams: [], examTitle: '', results: [] })
  }
  const classKey = resultClassKey(requested)
  const matched = classes.find((entry) => entry.key === classKey)
  const className = matched?.name || requested
  const classStudents = resultStudentsOfClass(students, classKey)
    .map((student) => ({
      id: String(student.id || ''),
      applicationId: String(student.applicationId || ''),
      name: resultStudentName(student),
      rollNo: String(student.rollNo || ''),
      className,
    }))
    .sort(
      (a, b) =>
        a.rollNo.localeCompare(b.rollNo, 'en', { numeric: true }) || a.name.localeCompare(b.name),
    )

  const classRows = readResultRows().filter((row) => row.classKey === classKey)
  const exams = []
  const seenExams = new Set()
  for (const row of [...classRows].sort((a, b) =>
    String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')),
  )) {
    if (!row.examKey || seenExams.has(row.examKey)) continue
    seenExams.add(row.examKey)
    exams.push({
      examTitle: row.examTitle,
      publishedAt: row.publishedAt || '',
      studentCount: classRows.filter((entry) => entry.examKey === row.examKey).length,
    })
  }

  const stored = readResultSubjects()[classKey]
  let subjects = Array.isArray(stored?.subjects) ? stored.subjects : []
  const examTitle = normalizeExamTitle(req.query.examTitle)
  const results = examTitle
    ? rankResults(classRows.filter((row) => row.examKey === resultClassKey(examTitle)))
    : []
  if (!subjects.length && results.length) subjects = results[results.length - 1].subjects || []
  res.json({
    classes,
    className,
    classKey,
    students: classStudents,
    subjects,
    exams,
    examTitle,
    results: results.map(publicResult),
  })
})

app.post('/api/results/publish', requireRoles('teacher'), async (req, res) => {
  const examTitle = normalizeExamTitle(req.body?.examTitle)
  const requestedClass = String(req.body?.className || '').trim().slice(0, MAX_RESULT_CLASS_LENGTH)
  if (!examTitle) return res.status(400).json({ error: 'Enter the examination name.' })
  if (!requestedClass) return res.status(400).json({ error: 'Choose a class before entering marks.' })

  const subjectsResult = sanitizeSubjects(req.body?.subjects)
  if (!subjectsResult.ok) return res.status(400).json({ error: subjectsResult.error })
  const subjects = subjectsResult.subjects

  const students = readStudentRecords()
  const classKey = resultClassKey(requestedClass)
  const matched = resultClassList(students).find((entry) => entry.key === classKey)
  if (!matched) {
    return res.status(400).json({ error: `No students are enrolled in "${requestedClass}" yet.` })
  }
  const className = matched.name
  const classStudents = new Map(
    resultStudentsOfClass(students, classKey).map((student) => [String(student.id || ''), student]),
  )

  const marks = Array.isArray(req.body?.marks) ? req.body.marks : []
  if (!marks.length) return res.status(400).json({ error: 'Enter marks for at least one student.' })
  if (marks.length > 300) return res.status(400).json({ error: 'Publish up to 300 students at a time.' })

  const seen = new Set()
  const computed = []
  for (const entry of marks) {
    const studentId = String(entry?.studentId || '')
    const student = classStudents.get(studentId)
    if (!student) {
      return res.status(400).json({ error: 'One of the selected students does not belong to this class.' })
    }
    if (seen.has(studentId)) {
      return res.status(400).json({ error: `Marks for ${resultStudentName(student)} were sent twice.` })
    }
    seen.add(studentId)
    const result = computeResult({ subjects, scores: entry?.scores })
    if (!result.ok) return res.status(400).json({ error: `${resultStudentName(student)}: ${result.error}` })
    computed.push({ student, result })
  }

  const examKey = resultClassKey(examTitle)
  const existing = readResultRows()
  const publishId = `RESP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const publishedAt = new Date().toISOString()
  const teacherRecord = readJsonFile(USERS_FILE, []).find((entry) => entry.id === req.authUser.id)
  const teacherName = String(teacherRecord?.name || req.authUser.email || 'Class teacher').slice(0, 120)
  const rows = computed.map(({ student, result }) => {
    const studentId = String(student.id || '')
    const previous = existing.find(
      (row) =>
        row.examKey === examKey && row.classKey === classKey && String(row.studentId) === studentId,
    )
    return {
      id: previous?.id || `RES-${classKey.replace(/[^a-z0-9]+/g, '-')}-${studentId}-${examKey.replace(/[^a-z0-9]+/g, '-').slice(0, 32)}`,
      publishId,
      examTitle,
      examKey,
      className,
      classKey,
      studentId,
      applicationId: String(student.applicationId || ''),
      studentName: resultStudentName(student),
      rollNo: String(student.rollNo || ''),
      subjects: result.subjects,
      totalScored: result.totalScored,
      totalMax: result.totalMax,
      percent: result.percent,
      grade: result.grade,
      teacherId: req.authUser.id,
      teacherName,
      publishedAt,
    }
  })

  const studentIds = new Set(rows.map((row) => String(row.studentId)))
  const merged = [
    ...existing.filter(
      (row) =>
        !(
          row.examKey === examKey &&
          row.classKey === classKey &&
          studentIds.has(String(row.studentId))
        ),
    ),
    ...rows,
  ]
  const ranked = rerankResultGroup(merged, examKey, classKey)
  writeResultRows(ranked)
  writeResultSubjects({
    ...readResultSubjects(),
    [classKey]: { className, subjects, updatedAt: publishedAt },
  })

  const users = readJsonFile(USERS_FILE, [])
  const savedRows = ranked
    .filter((row) => row.publishId === publishId)
    .sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0))
  const jobs = savedRows.map((row) => ({
    studentName: row.studentName,
    examTitle,
    className,
    subjects: row.subjects,
    totalScored: row.totalScored,
    totalMax: row.totalMax,
    percent: row.percent,
    grade: row.grade,
    teacherName: row.teacherName,
    recipients: resultRecipientsForStudent(classStudents.get(String(row.studentId)), users),
  }))
  const email = await deliverResultEmails({ publishId, jobs })
  res.json({
    saved: savedRows.length,
    publishId,
    className,
    examTitle,
    results: savedRows.map(publicResult),
    email,
  })
})

app.get('/api/results/my', requireRoles('parent'), (req, res) => {
  const user = readJsonFile(USERS_FILE, []).find((entry) => entry.id === req.authUser.id)
  const linkedId = user?.linkedId
  if (!linkedId) return res.json({ student: null, results: [] })
  const students = readStudentRecords()
  const student =
    students.find(
      (entry) =>
        String(entry.id) === String(linkedId) || String(entry.applicationId) === String(linkedId),
    ) || null
  const keys = [student?.id, linkedId]
    .filter((value) => value !== undefined && value !== null && String(value).trim())
    .map(String)
  const results = readResultRows()
    .filter(
      (row) =>
        keys.includes(String(row.studentId)) ||
        (row.applicationId && keys.includes(String(row.applicationId))),
    )
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .map(publicResult)
  res.json({
    student: student
      ? {
          id: String(student.id || ''),
          name: resultStudentName(student),
          className: resultClassOfStudent(student),
          rollNo: String(student.rollNo || ''),
        }
      : null,
    results,
  })
})

// School events & programs (PTM, festivals, trips, competitions). Only school
// admins create and publish them; publishing emails the chosen audience
// automatically — parents, teachers or both. Every signed-in role sees the
// published events in the portal, so no one depends on a manual forward.
const EVENTS_FILE = join('data', 'records', 'sms_events.json')
const EVENTS_EMAIL_JOB_DIR = join('data', 'records', 'sms_events_email_jobs')
const EVENT_TYPES = new Set(['holiday', 'ptm', 'festival', 'cultural', 'sports', 'competition', 'trip', 'meeting', 'other'])
const EVENT_TYPE_LABELS = {
  holiday: 'School Holiday',
  ptm: 'Parent-Teacher Meeting',
  festival: 'Festival',
  cultural: 'Cultural Program',
  sports: 'Sports Event',
  competition: 'Competition',
  trip: 'School Trip',
  meeting: 'Meeting',
  other: 'School Event',
}
const EVENT_AUDIENCES = new Set(['everyone', 'parents', 'teachers'])
const MAX_EVENT_TITLE = 120
const MAX_EVENT_VENUE = 120
const MAX_EVENT_DESCRIPTION = 1500

function readEvents() {
  const rows = readJsonFile(EVENTS_FILE, [])
  return Array.isArray(rows) ? rows : []
}

function writeEvents(rows) {
  writeJsonFile(EVENTS_FILE, Array.isArray(rows) ? rows.slice(0, 200) : [])
}

function validEventId(id) {
  return /^[A-Za-z0-9_-]{1,120}$/.test(String(id || ''))
}

function readEventEmailJob(eventId) {
  if (!validEventId(eventId)) return null
  try {
    const full = dataFilePath(join(EVENTS_EMAIL_JOB_DIR, `${eventId}.json`))
    if (!fs.existsSync(full)) return null
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function eventWithEmail(event) {
  const job = readEventEmailJob(event?.id)
  if (!job) return event
  if (job.publishedAt && event.publishedAt && job.publishedAt !== event.publishedAt) return event
  return { ...event, email: job }
}

function eventEmailStatus({ status, recipients = 0, sent = 0, failed = 0, errors = [] }) {
  return { status, recipients, sent, failed, errors, updatedAt: new Date().toISOString() }
}

function publicEvent(row, { includeEmail = false } = {}) {
  const merged = includeEmail ? eventWithEmail(row) : row
  return {
    id: merged.id,
    title: merged.title,
    type: merged.type,
    typeLabel: EVENT_TYPE_LABELS[merged.type] || 'School Event',
    date: merged.date,
    time: merged.time || '',
    venue: merged.venue || '',
    description: merged.description || '',
    audience: merged.audience,
    status: merged.status,
    publishedAt: merged.publishedAt || '',
    publishedByName: merged.publishedByName || '',
    createdAt: merged.createdAt || '',
    ...(includeEmail ? { email: merged.email } : {}),
  }
}

function validEventDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
}

function eventPayloadFromRequest(body) {
  const title = String(body?.title || '').trim().slice(0, MAX_EVENT_TITLE)
  const type = EVENT_TYPES.has(String(body?.type || '')) ? String(body.type) : 'other'
  const date = String(body?.date || '').trim()
  const time = String(body?.time || '').trim()
  const venue = String(body?.venue || '').trim().slice(0, MAX_EVENT_VENUE)
  const description = String(body?.description || '').trim().slice(0, MAX_EVENT_DESCRIPTION)
  const audience = EVENT_AUDIENCES.has(String(body?.audience || '')) ? String(body.audience) : 'everyone'
  return { title, type, date, time, venue, description, audience }
}

/** Audience-based fan-out list: parent accounts + guardian emails and/or teacher accounts. */
function collectEventRecipients({ users = [], students = [], audience = 'everyone' }) {
  const wantParents = audience !== 'teachers'
  const wantTeachers = audience !== 'parents'
  const emails = new Set()
  const add = (email) => {
    const normalized = String(email || '').trim().toLowerCase()
    if (RESULT_EMAIL_REGEX.test(normalized)) emails.add(normalized)
  }
  for (const user of Array.isArray(users) ? users : []) {
    const role = String(user?.role || '').toLowerCase()
    if (role === 'parent' && wantParents) add(user?.email)
    if (role === 'teacher' && wantTeachers) add(user?.email)
    if (role === 'super_admin') add(user?.email)
  }
  if (wantParents) {
    for (const student of Array.isArray(students) ? students : []) {
      add(student?.guardianEmail)
      add(student?.fatherEmail)
      add(student?.motherEmail)
    }
  }
  add(process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL)
  return [...emails]
}

async function queueEventEmailJob(event, recipients) {
  const secret = authTokenSecret()
  const base = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/+$/, '')
  if (!secret || !base) {
    throw new Error('Email job could not be queued because the deployment URL or auth secret is missing.')
  }
  const body = JSON.stringify({
    eventId: event.id,
    eventModel: {
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      venue: event.venue,
      description: event.description,
      audience: event.audience,
      publishedByName: event.publishedByName,
      publishedAt: event.publishedAt,
    },
    recipients,
    expiresAt: Date.now() + 10 * 60 * 1000,
  })
  const signature = createHmac('sha256', secret).update(body).digest('base64url')
  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${base}/.netlify/functions/events-email-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-events-signature': signature },
        body,
        signal: AbortSignal.timeout(8000),
      })
      if (response.ok) return
      lastError = new Error(`The background email job was rejected (HTTP ${response.status}).`)
    } catch (error) {
      lastError = error
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 700))
  }
  throw lastError || new Error('The background email job could not be started.')
}

async function deliverEventEmails(event) {
  const recipients = collectEventRecipients({
    users: readJsonFile(USERS_FILE, []),
    students: readStudentRecords(),
    audience: event.audience,
  })
  if (String(process.env.EVENT_MAIL_DISABLED || '') === 'true') {
    return eventEmailStatus({
      status: 'disabled',
      recipients: recipients.length,
      errors: ['Event emails are disabled on this server.'],
    })
  }
  if (!recipients.length) return eventEmailStatus({ status: 'sent' })
  if (isNetlifyRuntime) {
    try {
      await queueEventEmailJob(event, recipients)
      return eventEmailStatus({ status: 'queued', recipients: recipients.length })
    } catch (error) {
      console.error('Event email queue failed:', error?.message || error)
      return eventEmailStatus({
        status: 'failed',
        recipients: recipients.length,
        errors: [error?.message || 'Email job could not be queued.'],
      })
    }
  }
  let sent = 0
  const errors = []
  for (const to of recipients) {
    const result = await sendEventEmail({
      to,
      title: event.title,
      type: event.type,
      date: event.date,
      time: event.time,
      venue: event.venue,
      description: event.description,
      publishedByName: event.publishedByName,
    })
    if (result.sent) sent += 1
    else if (errors.length < 5) errors.push(result.error || 'The email could not be delivered.')
  }
  const failed = recipients.length - sent
  return eventEmailStatus({
    status: failed ? (sent ? 'partial' : 'failed') : 'sent',
    recipients: recipients.length,
    sent,
    failed,
    errors,
  })
}

app.get('/api/events', requireRoles('admin', 'super_admin', 'teacher', 'parent'), (req, res) => {
  const isAdmin = ['admin', 'super_admin'].includes(String(req.authUser.role).toLowerCase())
  const rows = readEvents().filter((row) => row && row.id)
  const visible = isAdmin ? rows : rows.filter((row) => row.status === 'published')
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = visible
    .filter((row) => String(row.date || '') >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time).localeCompare(String(b.time)))
  const past = visible
    .filter((row) => String(row.date || '') < today)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  res.json([...upcoming, ...past].slice(0, 120).map((row) => publicEvent(row, { includeEmail: isAdmin })))
})

app.post('/api/events', requireRoles('admin', 'super_admin'), (req, res) => {
  const payload = eventPayloadFromRequest(req.body)
  if (!payload.title) return res.status(400).json({ error: 'Enter the event name.' })
  if (!validEventDate(payload.date)) return res.status(400).json({ error: 'Choose a valid event date.' })
  if (payload.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.time)) {
    return res.status(400).json({ error: 'Enter the time as HH:MM (24-hour), for example 10:30.' })
  }

  const adminRecord = readJsonFile(USERS_FILE, []).find((entry) => entry.id === req.authUser.id)
  const adminName = String(adminRecord?.name || req.authUser.email || 'School admin').slice(0, 120)
  const rows = readEvents()

  if (req.body?.id) {
    const id = String(req.body.id)
    if (!validEventId(id)) return res.status(400).json({ error: 'Invalid event id.' })
    const existing = rows.find((row) => row.id === id)
    if (!existing) return res.status(404).json({ error: 'This event was not found.' })
    const updated = {
      ...existing,
      ...payload,
      publishedByName: existing.publishedByName || adminName,
      updatedAt: new Date().toISOString(),
    }
    writeEvents(rows.map((row) => (row.id === id ? updated : row)))
    return res.json({ event: publicEvent(updated, { includeEmail: true }) })
  }

  const event = {
    id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...payload,
    status: 'draft',
    createdBy: req.authUser.id,
    createdByName: adminName,
    publishedByName: adminName,
    createdAt: new Date().toISOString(),
  }
  writeEvents([event, ...rows])
  res.status(201).json({ event: publicEvent(event, { includeEmail: true }) })
})

app.post('/api/events/:id/publish', requireRoles('admin', 'super_admin'), async (req, res) => {
  const id = String(req.params.id || '')
  if (!validEventId(id)) return res.status(400).json({ error: 'Invalid event id.' })
  const rows = readEvents()
  const event = rows.find((row) => row.id === id)
  if (!event) return res.status(404).json({ error: 'This event was not found.' })
  if (event.status === 'published') {
    return res.status(400).json({ error: 'This event is already published. Edit it and publish a new event instead.' })
  }
  event.status = 'published'
  event.publishedAt = new Date().toISOString()
  const email = await deliverEventEmails(event)
  event.email = email
  writeEvents(rows)
  res.json({ event: publicEvent(event, { includeEmail: true }), email })
})

app.delete('/api/events/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const id = String(req.params.id || '')
  if (!validEventId(id)) return res.status(400).json({ error: 'Invalid event id.' })
  const rows = readEvents()
  if (!rows.some((row) => row.id === id)) return res.status(404).json({ error: 'This event was not found.' })
  writeEvents(rows.filter((row) => row.id !== id))
  res.json({ deleted: id })
})

// Teacher leave requests. A teacher files a request from the Teacher Desk and
// it lands immediately in the admin leave queue. The admin approves or rejects
// with a note; the decision and note are saved for the teacher's My Leave page
// and also emailed to the teacher.
const LEAVE_FILE = join('data', 'records', 'sms_leave_requests.json')

function readLeaveRequests() {
  const rows = readJsonFile(LEAVE_FILE, [])
  return Array.isArray(rows) ? rows : []
}

function writeLeaveRequests(rows) {
  writeJsonFile(LEAVE_FILE, Array.isArray(rows) ? rows.slice(0, 1000) : [])
}

function leaveSummary(rows) {
  return {
    total: rows.length,
    pending: rows.filter((row) => row.status === 'Pending').length,
    approved: rows.filter((row) => row.status === 'Approved').length,
    rejected: rows.filter((row) => row.status === 'Rejected').length,
  }
}

app.get('/api/leave/requests', requireRoles('teacher', 'admin', 'super_admin'), (req, res) => {
  const email = normalizeEmail(req.authUser.email)
  const all = readLeaveRequests()
    .filter((row) => row && row.id)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  const role = String(req.authUser.role || '').toLowerCase()
  const rows = role === 'teacher' ? all.filter((row) => normalizeEmail(row.teacherEmail) === email) : all
  const requested = String(req.query.status || '').trim()
  const filtered = ['Pending', 'Approved', 'Rejected'].includes(requested)
    ? rows.filter((row) => row.status === requested)
    : rows
  res.json({ requests: filtered.map(publicLeaveRequest), summary: leaveSummary(rows) })
})

app.post('/api/leave/requests', requireRoles('teacher'), (req, res) => {
  const parsed = normalizeLeavePayload(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const email = normalizeEmail(req.authUser.email)
  const rows = readLeaveRequests()
  const clash = rows.find(
    (row) =>
      normalizeEmail(row.teacherEmail) === email &&
      ['Pending', 'Approved'].includes(row.status) &&
      leaveOverlaps(row, parsed.value),
  )
  if (clash) {
    return res.status(409).json({
      error: `You already have a ${String(clash.status).toLowerCase()} leave request that overlaps these dates (${clash.fromDate} to ${clash.toDate}).`,
    })
  }
  const user = readJsonFile(USERS_FILE, []).find((entry) => normalizeEmail(entry.email) === email)
  const now = new Date().toISOString()
  const entry = {
    id: `LV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    teacherId: req.authUser.id,
    teacherEmail: email,
    teacherName: String(user?.name || user?.username || email.split('@')[0]).slice(0, 120),
    ...parsed.value,
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
    decidedAt: '',
    decidedByEmail: '',
    decidedByName: '',
    decisionNote: '',
  }
  writeLeaveRequests([entry, ...rows])
  res.status(201).json({ request: publicLeaveRequest(entry) })
})

app.patch('/api/leave/requests/:id', requireRoles('admin', 'super_admin'), async (req, res) => {
  const id = String(req.params.id || '')
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid leave request id.' })
  }
  const decision = normalizeLeaveDecision(req.body)
  if (!decision.ok) return res.status(400).json({ error: decision.error })
  const rows = readLeaveRequests()
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) return res.status(404).json({ error: 'This leave request was not found.' })
  if (rows[index].status !== 'Pending') {
    return res.status(409).json({
      error: `This leave request was already ${String(rows[index].status).toLowerCase()}.`,
    })
  }
  const adminRecord = readJsonFile(USERS_FILE, []).find((entry) => entry.id === req.authUser.id)
  const decidedByName = String(adminRecord?.name || req.authUser.email || 'School admin').slice(0, 120)
  const now = new Date().toISOString()
  const updated = {
    ...rows[index],
    status: decision.value.status,
    decisionNote: decision.value.note,
    decidedAt: now,
    decidedByEmail: normalizeEmail(req.authUser.email),
    decidedByName,
    updatedAt: now,
  }
  rows[index] = updated
  writeLeaveRequests(rows)

  const email = await sendLeaveDecisionEmail({
    to: updated.teacherEmail,
    teacherName: updated.teacherName,
    status: updated.status,
    typeLabel: updated.typeLabel,
    fromDate: updated.fromDate,
    toDate: updated.toDate,
    days: updated.days,
    reason: updated.reason,
    note: updated.decisionNote,
    decidedByName,
  })
  res.json({ request: publicLeaveRequest(updated), email })
})

// Class teachers and student leave. The admin marks a teacher as the class
// teacher of one class; parents then file leave for their child and it lands
// directly in that class teacher's queue. If a class has no class teacher the
// request falls back to the school admin queue instead of being blocked.
const CLASS_TEACHERS_FILE = join('data', 'records', 'sms_class_teachers.json')
const STUDENT_LEAVE_FILE = join('data', 'records', 'sms_student_leave_requests.json')

function readClassTeachers() {
  const rows = readJsonFile(CLASS_TEACHERS_FILE, [])
  return (Array.isArray(rows) ? rows : []).filter((row) => row && row.id && row.className)
}

function writeClassTeachers(rows) {
  writeJsonFile(CLASS_TEACHERS_FILE, Array.isArray(rows) ? rows.slice(0, 500) : [])
}

function publicClassTeacher(row) {
  return {
    id: row.id,
    className: row.className || '',
    teacherName: row.teacherName || '',
    teacherEmail: row.teacherEmail || '',
    teacherPhone: row.teacherPhone || '',
    teacherRecordId: row.teacherRecordId || '',
    updatedAt: row.updatedAt || '',
  }
}

function readStudentLeaveRequests() {
  const rows = readJsonFile(STUDENT_LEAVE_FILE, [])
  return Array.isArray(rows) ? rows : []
}

function writeStudentLeaveRequests(rows) {
  writeJsonFile(STUDENT_LEAVE_FILE, Array.isArray(rows) ? rows.slice(0, 1000) : [])
}

function userRecordFor(authUser) {
  return readJsonFile(USERS_FILE, []).find((entry) => String(entry.id) === String(authUser?.id)) || null
}

function teacherContext(authUser) {
  return {
    email: normalizeEmail(authUser?.email),
    linkedId: String(userRecordFor(authUser)?.linkedId || ''),
  }
}

function classTeacherFor(className) {
  const key = classKey(className)
  if (!key) return null
  return readClassTeachers().find((row) => classKey(row.className) === key) || null
}

function adminAccountEmails() {
  const users = readJsonFile(USERS_FILE, [])
  const emails = (Array.isArray(users) ? users : [])
    .filter((user) => ['admin', 'super_admin'].includes(String(user.role || '').toLowerCase()) && user.email)
    .map((user) => normalizeEmail(user.email))
  return [...new Set(emails)].slice(0, 5)
}

app.get('/api/class-teachers', requireRoles('teacher', 'admin', 'super_admin'), (req, res) => {
  const role = String(req.authUser.role || '').toLowerCase()
  const rows = readClassTeachers()
  if (role === 'teacher') {
    const context = teacherContext(req.authUser)
    return res.json({
      assignments: rows.filter((row) => assignmentMatchesTeacher(row, context)).map(publicClassTeacher),
      classes: [],
    })
  }
  res.json({
    assignments: rows.map(publicClassTeacher),
    classes: classLabelsFromStudents(readStudentRecords()),
  })
})

app.post('/api/class-teachers', requireRoles('admin', 'super_admin'), (req, res) => {
  const parsed = normalizeClassTeacherAssignment(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const all = readClassTeachers()
  const now = new Date().toISOString()
  const existing = all.find((row) => classKey(row.className) === parsed.value.classKey)
  // A teacher handles one class: drop an earlier assignment for the same
  // teacher so moving them to another class does not leave a stale owner.
  const rows = all.filter(
    (row) =>
      classKey(row.className) !== parsed.value.classKey &&
      !(parsed.value.teacherRecordId && String(row.teacherRecordId || '') === parsed.value.teacherRecordId) &&
      normalizeEmail(row.teacherEmail) !== parsed.value.teacherEmail,
  )
  if (existing) {
    const updated = {
      ...existing,
      ...parsed.value,
      updatedAt: now,
      updatedBy: normalizeEmail(req.authUser.email),
    }
    writeClassTeachers([updated, ...rows])
    return res.json({ assignment: publicClassTeacher(updated) })
  }
  const entry = {
    id: `CT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...parsed.value,
    createdAt: now,
    updatedAt: now,
    createdBy: normalizeEmail(req.authUser.email),
  }
  writeClassTeachers([entry, ...rows])
  res.status(201).json({ assignment: publicClassTeacher(entry) })
})

app.delete('/api/class-teachers/:id', requireRoles('admin', 'super_admin'), (req, res) => {
  const id = String(req.params.id || '')
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) return res.status(400).json({ error: 'Invalid assignment id.' })
  const rows = readClassTeachers()
  if (!rows.some((row) => row.id === id)) return res.status(404).json({ error: 'This class teacher assignment was not found.' })
  writeClassTeachers(rows.filter((row) => row.id !== id))
  res.json({ deleted: id })
})

app.get('/api/student-leave/requests', requireRoles('parent', 'teacher', 'admin', 'super_admin'), (req, res) => {
  const role = String(req.authUser.role || '').toLowerCase()
  const all = readStudentLeaveRequests()
    .filter((row) => row && row.id)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  let rows = all
  if (role === 'parent') {
    rows = all.filter((row) => String(row.parentUserId) === String(req.authUser.id))
  } else if (role === 'teacher') {
    // A class teacher only sees the class(es) the admin assigned to them right now.
    const ownedKeys = teacherClassKeys(readClassTeachers(), teacherContext(req.authUser))
    rows = all.filter((row) => row.assignedTo === 'teacher' && ownedKeys.has(classKey(row.className)))
  }
  const requested = String(req.query.status || '').trim()
  const filtered = ['Pending', 'Approved', 'Rejected'].includes(requested)
    ? rows.filter((row) => row.status === requested)
    : rows

  const payload = {
    requests: filtered.map(publicStudentLeaveRequest),
    summary: studentLeaveSummary(rows),
  }

  if (role === 'parent') {
    const user = userRecordFor(req.authUser)
    const linkedId = String(user?.linkedId || '')
    const student = linkedId
      ? readStudentRecords().find(
          (item) => String(item.id) === linkedId || String(item.applicationId) === linkedId,
        ) || null
      : null
    const className = studentClassLabel(student)
    const classTeacher = classTeacherFor(className)
    payload.child = student
      ? {
          id: student.id || '',
          name: student.title || student.name || '',
          className,
          rollNo: student.rollNo || '',
        }
      : null
    payload.classTeacher = classTeacher
      ? {
          className: classTeacher.className,
          name: classTeacher.teacherName,
          email: classTeacher.teacherEmail,
        }
      : null
  }
  res.json(payload)
})

app.post('/api/student-leave/requests', requireRoles('parent'), async (req, res) => {
  const parsed = normalizeStudentLeavePayload(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const user = userRecordFor(req.authUser)
  const linkedId = String(user?.linkedId || '')
  if (!linkedId) {
    return res.status(400).json({ error: 'Your account is not linked to a student yet. Contact the school office.' })
  }
  const student = readStudentRecords().find(
    (item) => String(item.id) === linkedId || String(item.applicationId) === linkedId,
  )
  if (!student) {
    return res.status(404).json({ error: 'Your child record was not found. Contact the school office.' })
  }
  const className = studentClassLabel(student)
  if (!className) {
    return res.status(400).json({ error: "Your child's class is not set on the student record yet. Contact the school office." })
  }

  const rows = readStudentLeaveRequests()
  const clash = rows.find(
    (row) =>
      String(row.studentId) === String(student.id || linkedId) &&
      ['Pending', 'Approved'].includes(row.status) &&
      leaveOverlaps(row, parsed.value),
  )
  if (clash) {
    return res.status(409).json({
      error: `A ${String(clash.status).toLowerCase()} leave request already covers these dates (${clash.fromDate} to ${clash.toDate}).`,
    })
  }

  const assignment = classTeacherFor(className)
  const now = new Date().toISOString()
  const entry = {
    id: `SLV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentId: String(student.id || linkedId),
    studentName: student.title || student.name || '',
    className,
    parentUserId: req.authUser.id,
    parentEmail: normalizeEmail(req.authUser.email),
    parentName: String(user?.name || user?.username || req.authUser.email || 'Parent').slice(0, 120),
    assignedTo: assignment ? 'teacher' : 'admin',
    classTeacherId: assignment?.id || '',
    classTeacherName: assignment?.teacherName || '',
    classTeacherEmail: assignment?.teacherEmail || '',
    classTeacherRecordId: assignment?.teacherRecordId || '',
    ...parsed.value,
    status: 'Pending',
    createdAt: now,
    updatedAt: now,
    decidedAt: '',
    decidedByEmail: '',
    decidedByName: '',
    decisionNote: '',
  }
  writeStudentLeaveRequests([entry, ...rows])

  let notified
  if (assignment) {
    notified = await sendStudentLeaveRequestEmail({
      to: assignment.teacherEmail,
      teacherName: assignment.teacherName,
      parentName: entry.parentName,
      studentName: entry.studentName,
      className,
      typeLabel: entry.typeLabel,
      fromDate: entry.fromDate,
      toDate: entry.toDate,
      days: entry.days,
      reason: entry.reason,
    })
  } else {
    const admins = adminAccountEmails()
    const results = await Promise.all(
      admins.map((to) =>
        sendStudentLeaveRequestEmail({
          to,
          teacherName: 'School admin',
          parentName: entry.parentName,
          studentName: entry.studentName,
          className,
          typeLabel: entry.typeLabel,
          fromDate: entry.fromDate,
          toDate: entry.toDate,
          days: entry.days,
          reason: entry.reason,
        }),
      ),
    )
    notified = {
      sent: results.some((item) => item.sent),
      recipients: admins,
      error: results.find((item) => !item.sent)?.error || '',
    }
  }

  res.status(201).json({ request: publicStudentLeaveRequest(entry), notified })
})

app.patch('/api/student-leave/requests/:id', requireRoles('teacher', 'admin', 'super_admin'), async (req, res) => {
  const id = String(req.params.id || '')
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid leave request id.' })
  }
  const decision = normalizeLeaveDecision(req.body)
  if (!decision.ok) return res.status(400).json({ error: decision.error })
  const rows = readStudentLeaveRequests()
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) return res.status(404).json({ error: 'This leave request was not found.' })
  const row = rows[index]
  const role = String(req.authUser.role || '').toLowerCase()
  if (role === 'teacher' && !teacherCanDecide(row, readClassTeachers(), teacherContext(req.authUser))) {
    return res.status(403).json({ error: 'Only the class teacher of this class can decide this request.' })
  }
  if (row.status !== 'Pending') {
    return res.status(409).json({ error: `This leave request was already ${String(row.status).toLowerCase()}.` })
  }
  const actor = userRecordFor(req.authUser)
  const decidedByName = String(actor?.name || req.authUser.email || 'School').slice(0, 120)
  const decidedByTitle = role === 'teacher' ? 'Class teacher' : 'School admin'
  const now = new Date().toISOString()
  const updated = {
    ...row,
    status: decision.value.status,
    decisionNote: decision.value.note,
    decidedAt: now,
    decidedByEmail: normalizeEmail(req.authUser.email),
    decidedByName,
    decidedByRole: role,
    updatedAt: now,
  }
  rows[index] = updated
  writeStudentLeaveRequests(rows)

  const email = updated.parentEmail
    ? await sendStudentLeaveDecisionEmail({
        to: updated.parentEmail,
        parentName: updated.parentName,
        studentName: updated.studentName,
        className: updated.className,
        status: updated.status,
        typeLabel: updated.typeLabel,
        fromDate: updated.fromDate,
        toDate: updated.toDate,
        days: updated.days,
        reason: updated.reason,
        note: updated.decisionNote,
        decidedByName,
        decidedByTitle,
      })
    : { sent: false, error: 'No parent email is saved on this request.' }
  res.json({ request: publicStudentLeaveRequest(updated), email })
})

// Published academic documents (timetable + datesheet). The server builds the
// PDF, stores the document for every role, and emails it to all parents and
// super admins. On Netlify the mail fan-out runs in a background function
// because a sync function would hit the ~10s limit with many recipients.
const ACADEMIC_DOCS_FILE = join('data', 'records', 'sms_academic_documents.json')
const ACADEMIC_EMAIL_JOB_DIR = join('data', 'records', 'sms_academic_email_jobs')
const TIMETABLE_GRADE_LABELS = {
  'pre-primary': 'Pre-Primary',
  primary: 'Primary',
  middle: 'Middle',
  secondary: 'Secondary',
  senior: 'Senior',
}
const TIMETABLE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function readAcademicDocuments() {
  const rows = readJsonFile(ACADEMIC_DOCS_FILE, [])
  return Array.isArray(rows) ? rows : []
}

function writeAcademicDocuments(rows) {
  writeJsonFile(ACADEMIC_DOCS_FILE, Array.isArray(rows) ? rows : [])
}

function validAcademicDocId(id) {
  return /^[A-Za-z0-9_-]{1,120}$/.test(String(id || ''))
}

function readAcademicEmailJob(docId) {
  if (!validAcademicDocId(docId)) return null
  try {
    const full = dataFilePath(join(ACADEMIC_EMAIL_JOB_DIR, `${docId}.json`))
    if (!fs.existsSync(full)) return null
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function academicDocWithEmail(doc) {
  const job = readAcademicEmailJob(doc?.id)
  if (!job) return doc
  if (job.publishedAt && doc.publishedAt && job.publishedAt !== doc.publishedAt) return doc
  return { ...doc, email: job }
}

function academicEmailStatus({ status, recipients = 0, sent = 0, failed = 0, errors = [] }) {
  return { status, recipients, sent, failed, errors, updatedAt: new Date().toISOString() }
}

function academicRecipients() {
  return collectAcademicRecipients({
    users: readJsonFile(USERS_FILE, []),
    students: readStudentRecords(),
  })
}

async function queueAcademicEmailJob(doc, recipients) {
  const secret = authTokenSecret()
  const base = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/+$/, '')
  if (!secret || !base) {
    throw new Error('Email job could not be queued because the deployment URL or auth secret is missing.')
  }
  const body = JSON.stringify({
    docId: doc.id,
    docModel: {
      type: doc.type,
      title: doc.title,
      subtitle: doc.subtitle,
      publishedAt: doc.publishedAt,
      payload: doc.payload,
    },
    recipients,
    attachmentName: academicPdfFilename(doc),
    expiresAt: Date.now() + 10 * 60 * 1000,
  })
  const signature = createHmac('sha256', secret).update(body).digest('base64url')
  const response = await fetch(`${base}/.netlify/functions/academic-email-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-academic-signature': signature },
    body,
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    throw new Error(`The background email job was rejected (HTTP ${response.status}).`)
  }
}

async function deliverAcademicDocument(doc) {
  const recipients = academicRecipients()
  if (String(process.env.ACADEMIC_MAIL_DISABLED || '') === 'true') {
    return {
      ...doc,
      email: academicEmailStatus({
        status: 'disabled',
        recipients: recipients.length,
        errors: ['Email delivery is disabled on this server.'],
      }),
    }
  }
  if (!recipients.length) {
    return { ...doc, email: academicEmailStatus({ status: 'sent' }) }
  }
  if (isNetlifyRuntime) {
    try {
      await queueAcademicEmailJob(doc, recipients)
      return { ...doc, email: academicEmailStatus({ status: 'queued', recipients: recipients.length }) }
    } catch (error) {
      console.error('Academic email queue failed:', error?.message || error)
      return {
        ...doc,
        email: academicEmailStatus({
          status: 'failed',
          recipients: recipients.length,
          errors: [error?.message || 'Email job could not be queued.'],
        }),
      }
    }
  }
  const result = await sendAcademicDocumentEmails({
    docModel: doc,
    recipients,
    pdfBuffer: buildAcademicPdf(doc),
    attachmentName: academicPdfFilename(doc),
  })
  return { ...doc, email: result }
}

function storeAcademicDocument(doc) {
  const docs = readAcademicDocuments().filter((entry) => entry?.id !== doc.id)
  writeAcademicDocuments([doc, ...docs].slice(0, 100))
}

function normalizedTimetableRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((row) => row && TIMETABLE_DAYS.includes(String(row.day || '').toLowerCase()))
    .map((row) => ({
      day: String(row.day).toLowerCase(),
      periods: (Array.isArray(row.periods) ? row.periods : [])
        .map((period) => ({
          time: String(period?.time || '').trim().slice(0, 60),
          subject: String(period?.subject || '').trim().slice(0, 120),
          teacher: String(period?.teacher || '').trim().slice(0, 120),
          room: String(period?.room || '').trim().slice(0, 60),
          duration: Number(period?.duration) || 0,
        }))
        .filter((period) => period.subject || period.time),
    }))
    .filter((row) => row.periods.length)
}

app.get('/api/academic-documents', requireRoles('admin', 'super_admin', 'teacher', 'parent'), (req, res) => {
  const type = String(req.query.type || '').toLowerCase()
  const canSeeEmail = ['admin', 'super_admin'].includes(req.authUser.role)
  const docs = readAcademicDocuments()
    .filter((doc) => doc && doc.id && (type ? doc.type === type : true))
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .slice(0, 60)
    .map((doc) => {
      if (canSeeEmail) return academicDocWithEmail(doc)
      const publicDoc = { ...doc }
      delete publicDoc.email
      return publicDoc
    })
  res.json(docs)
})

app.get('/api/academic-documents/:id/pdf', requireRoles('admin', 'super_admin', 'teacher', 'parent'), (req, res) => {
  const id = String(req.params.id || '')
  if (!validAcademicDocId(id)) return res.status(400).json({ error: 'Invalid document id.' })
  const doc = readAcademicDocuments().find((entry) => entry?.id === id)
  if (!doc) return res.status(404).json({ error: 'This academic document was not found.' })
  try {
    const pdf = buildAcademicPdf(doc)
    const filename = academicPdfFilename(doc).replace(/"/g, '')
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')
    res.send(pdf)
  } catch (error) {
    console.error('Academic PDF build failed:', error?.message || error)
    res.status(500).json({ error: 'The PDF could not be generated right now.' })
  }
})

app.post('/api/academic-documents/timetable/publish', requireRoles('admin', 'super_admin'), async (req, res) => {
  const grade = String(req.body?.grade || '').trim().toLowerCase()
  const section = String(req.body?.section || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!TIMETABLE_GRADE_LABELS[grade]) return res.status(400).json({ error: 'Choose a valid grade level.' })
  if (!section || section.length > 4) return res.status(400).json({ error: 'Enter a valid section (up to 4 letters or numbers).' })

  const storedRows = readJsonFile(join('data', 'records', `sms_timetable_${grade}_${section}.json`), [])
  const rows = normalizedTimetableRows(storedRows)
  const totalPeriods = rows.reduce((sum, row) => sum + row.periods.length, 0)
  if (!totalPeriods) {
    return res.status(400).json({ error: 'Add at least one period to the timetable before publishing.' })
  }

  const id = `TT-${grade}-${section}`
  const docs = readAcademicDocuments()
  const previous = docs.find((entry) => entry?.id === id) || null
  const previousEmail = previous ? readAcademicEmailJob(id) || previous.email : null
  const unchanged =
    previous &&
    JSON.stringify(previous.payload?.rows || []) === JSON.stringify(rows) &&
    ['sent', 'partial'].includes(String(previousEmail?.status || ''))
  if (unchanged) {
    return res.json({ doc: previous, email: previousEmail, unchanged: true })
  }

  const doc = {
    id,
    type: 'timetable',
    title: 'Weekly Timetable',
    subtitle: `${TIMETABLE_GRADE_LABELS[grade]} · Section ${section}`,
    publishedAt: new Date().toISOString(),
    version: Number(previous?.version || 0) + 1,
    payload: { grade, section, rows },
  }
  const delivered = await deliverAcademicDocument(doc)
  storeAcademicDocument(delivered)
  res.json({ doc: delivered, email: delivered.email, unchanged: false })
})

app.post('/api/academic-documents/datesheet', requireRoles('admin', 'super_admin'), async (req, res) => {
  const examName = String(req.body?.examName || '').trim().slice(0, 120)
  const className = String(req.body?.className || '').trim().slice(0, 80)
  const rawRows = Array.isArray(req.body?.rows) ? req.body.rows : []
  if (!examName) return res.status(400).json({ error: 'Enter the examination name.' })
  if (!className) return res.status(400).json({ error: 'Enter the class or grade this datesheet is for.' })
  if (!rawRows.length) return res.status(400).json({ error: 'Add at least one exam paper to the datesheet.' })
  if (rawRows.length > 80) return res.status(400).json({ error: 'A datesheet can contain up to 80 papers.' })

  const rows = []
  for (let index = 0; index < rawRows.length; index += 1) {
    const row = rawRows[index] || {}
    const date = String(row.date || '').trim()
    const subject = String(row.subject || '').trim().slice(0, 120)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      return res.status(400).json({ error: `Paper ${index + 1}: choose a valid exam date.` })
    }
    if (!subject) return res.status(400).json({ error: `Paper ${index + 1}: enter the subject.` })
    rows.push({
      date,
      subject,
      time: String(row.time || '').trim().slice(0, 60),
      room: String(row.room || '').trim().slice(0, 60),
    })
  }
  rows.sort((a, b) => a.date.localeCompare(b.date))

  const doc = {
    id: `DS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'datesheet',
    title: `${examName} Datesheet`,
    subtitle: className,
    publishedAt: new Date().toISOString(),
    version: 1,
    payload: { examName, className, rows },
  }
  const delivered = await deliverAcademicDocument(doc)
  storeAcademicDocument(delivered)
  res.status(201).json({ doc: delivered, email: delivered.email, unchanged: false })
})

// Provider-agnostic AI proxy. The API key stays on the server and is never sent to the browser.
// API Routes - AI Assistant (real-data context + provider proxy + SSE stream)
function aiProviderConfig() {
  const apiUrl = String(process.env.AI_API_URL || '').trim()
  const apiKey = String(process.env.AI_API_KEY || '').trim()
  const model = String(process.env.AI_MODEL || 'gpt-4o-mini').trim()
  return { apiUrl, apiKey, model, configured: Boolean(apiUrl && apiKey) }
}

function aiSnapshotFor(req) {
  const role = String(req.authUser.role || 'admin').toLowerCase()
  const now = istParts()
  const stores = {
    role,
    nowIST: `${now.date} ${now.time} IST`,
    students: readStudentRecords(),
    admissions: readJsonFile(join('data', 'records', 'sms_admissions.json'), []),
    attendanceRows: readJsonFile(join('data', 'records', 'sms_mod__students_attendance.json'), []),
    payments: readJsonFile(join('data', 'payments.json'), []),
    users: readJsonFile(USERS_FILE, []),
    staffAttendanceToday: readStaffAttendance().filter((record) => record.date === now.date),
    faceProfiles: readFaceProfiles(),
    notices: readJsonFile(join('data', 'records', 'sms_mod__notices_school.json'), []),
    exams: readJsonFile(join('data', 'exams.json'), []),
    teachers: readJsonFile(join('data', 'records', 'sms_mod__teachers.json'), []),
    security: summarizeTracks(),
  }
  if (role === 'super_admin') {
    stores.schoolRequests = readJsonFile(join('data', 'school_requests.json'), [])
  }
  if (role === 'parent') {
    const user = (Array.isArray(stores.users) ? stores.users : []).find((row) => row.id === req.authUser.id)
    const linkedId = user?.linkedId
    if (linkedId) {
      const child = stores.students.find(
        (row) => String(row.id) === String(linkedId) || String(row.applicationId) === String(linkedId),
      ) || null
      if (child) {
        const keys = [child.id, child.applicationId, linkedId].filter((v) => v !== undefined && v !== null).map(String)
        stores.child = {
          student: child,
          payments: stores.payments.filter((payment) => keys.includes(String(payment.studentId))),
          attendanceRows: stores.attendanceRows.filter((row) => row.title === child.title),
        }
      }
    }
  }
  return buildSnapshot(stores)
}

function aiHistoryMessages(history) {
  return (Array.isArray(history) ? history : []).slice(-16).map((message) => ({
    role: message?.from === 'user' ? 'user' : 'assistant',
    content: String(message?.text || '').slice(0, 2000),
  }))
}

function aiLanguage(req) {
  const value = String(req.body?.language || '').toLowerCase()
  return ['en', 'hi', 'hinglish'].includes(value) ? value : 'en'
}

function aiCurrency(req) {
  return String(req.body?.currency || '').toUpperCase() === 'USD' ? 'USD' : 'INR'
}

app.get('/api/ai/status', requireRoles('admin', 'super_admin', 'teacher', 'parent'), (_req, res) => {
  const { configured, model } = aiProviderConfig()
  res.json({ configured, model: configured ? model : null, engine: configured ? 'provider' : 'offline-data' })
})

app.post('/api/ai/chat', async (req, res) => {
  const { apiUrl, apiKey, model, configured } = aiProviderConfig()
  const prompt = String(req.body?.prompt || '').trim()
  if (!prompt || prompt.length > 2000) {
    return res.status(400).json({ error: 'Enter a question up to 2,000 characters.' })
  }

  const snapshot = aiSnapshotFor(req)
  const currency = aiCurrency(req)
  if (!configured) {
    return res.json({
      reply: offlineReply({ prompt, role: snapshot.role, snapshot, language: aiLanguage(req), currency }),
      model: 'offline-data-engine',
      offline: true,
    })
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemInstructions({ role: snapshot.role, language: aiLanguage(req), context: snapshotToContext(snapshot, currency) }),
          },
          ...aiHistoryMessages(req.body?.history),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body?.error?.message || 'AI provider request failed.')
    const reply = body?.choices?.[0]?.message?.content
    if (!reply) throw new Error('AI provider returned an empty response.')
    res.json({ reply: String(reply), model, offline: false })
  } catch (err) {
    console.error('AI provider error:', err?.message || err)
    res.json({
      reply: `${offlineReply({ prompt, role: snapshot.role, snapshot, language: aiLanguage(req), currency })}\n\n_AI provider was unreachable — this answer comes straight from your live school data._`,
      model: 'offline-data-engine',
      offline: true,
    })
  }
})

app.post('/api/ai/chat/stream', async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim()
  if (!prompt || prompt.length > 2000) {
    return res.status(400).json({ error: 'Enter a question up to 2,000 characters.' })
  }
  const language = aiLanguage(req)
  const currency = aiCurrency(req)
  const { apiUrl, apiKey, model, configured } = aiProviderConfig()
  const snapshot = aiSnapshotFor(req)

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  let closed = false
  res.on('close', () => {
    if (!res.writableEnded) closed = true
  })
  const send = (payload) => {
    if (!closed) res.write(`data: ${JSON.stringify(payload)}\n\n`)
  }

  const streamOffline = async (note) => {
    send({ type: 'meta', offline: true, model: 'offline-data-engine' })
    const reply = `${offlineReply({ prompt, role: snapshot.role, snapshot, language, currency })}${note ? `\n\n${note}` : ''}`
    for (const part of chunkText(reply)) {
      if (closed) break
      send({ type: 'delta', text: part })
      await new Promise((resolve) => setTimeout(resolve, 18))
    }
    send({ type: 'done', reply, model: 'offline-data-engine', offline: true })
    res.end()
  }

  if (!configured) return streamOffline()

  try {
    send({ type: 'meta', offline: false, model })
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: 'system',
            content: systemInstructions({ role: snapshot.role, language, context: snapshotToContext(snapshot, currency) }),
          },
          ...aiHistoryMessages(req.body?.history),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    })
    if (!upstream.ok || !upstream.body) throw new Error(`AI provider responded with ${upstream.status}.`)

    let buffer = ''
    let full = ''
    for await (const chunk of upstream.body) {
      if (closed) break
      buffer += Buffer.from(chunk).toString('utf8')
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const delta = parsed?.choices?.[0]?.delta?.content || ''
          if (delta) {
            full += delta
            send({ type: 'delta', text: delta })
          }
        } catch {
          /* partial SSE payload — wait for the next chunk */
        }
      }
    }
    if (!full.trim()) throw new Error('AI provider returned an empty response.')
    send({ type: 'done', reply: full, model, offline: false })
    res.end()
  } catch (err) {
    console.error('AI provider stream error:', err?.message || err)
    if (!closed) {
      send({ type: 'error', error: 'AI provider was unreachable — falling back to live school data.' })
      await streamOffline()
    }
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

app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err)
  if (res.headersSent) return next(err)
  const status = Number.isInteger(err.status) ? err.status : 500
  res.status(status).json({ error: status < 500 ? err.message : 'Internal server error' })
})

if (!isServerlessRuntime) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`School Management System server running on http://localhost:${PORT}`)
    console.log(`Phone / LAN: open http://<your-pc-ip>:${PORT} (same Wi-Fi)`)
    console.log(`API: http://localhost:${PORT}/api/`)
    console.log(`Email OTP: ${isSmtpConfigured() ? 'SMTP configured' : 'SMTP not configured'}`)
  })
}

export default app
