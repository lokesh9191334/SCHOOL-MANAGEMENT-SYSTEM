import express from 'express'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const users = readJsonFile(join('data', 'users.json'), [])
    if (users.find((u) => u.email === email)) return res.status(409).json({ error: 'User exists' })
    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(password, salt)
    const user = { id: Date.now().toString(), email, name: name || '', passwordHash: hash, twoFactor: { enabled: false } }
    const next = Array.isArray(users) ? [...users, user] : [user]
    writeJsonFile(join('data', 'users.json'), next)
    res.json({ id: user.id, email: user.email, name: user.name })
  } catch (err) {
    console.error('Error in /api/auth/register:', err)
    res.status(500).json({ error: 'Server error during registration' })
  }
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  const users = readJsonFile(join('data', 'users.json'), [])
  const user = users.find((u) => u.email === email)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  if (!bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid credentials' })

  // If user has 2FA enabled, create a temporary login token requiring 2FA verification
  if (user.twoFactor && user.twoFactor.enabled) {
    const loginToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const updated = users.map((u) => (u.email === email ? { ...u, loginToken, loginTokenExpiry: Date.now() + 5 * 60 * 1000 } : u))
    writeJsonFile(join('data', 'users.json'), updated)
    return res.json({ twoFactor: true, loginToken })
  }

  // No 2FA: issue a simple demo token
  const token = `demo-token-${Date.now()}`
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
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
    const updated = users.map((u) => (u.email === email ? { ...u, twoFactor: { enabled: true, secret: tempSecret } } : u))
    writeJsonFile(join('data', 'users.json'), updated)
    return res.json({ success: true })
  }

  // Login verification flow
  if (!loginToken) return res.status(400).json({ error: 'Login token required' })
  if (user.loginToken !== loginToken || (user.loginTokenExpiry || 0) < Date.now()) return res.status(401).json({ error: 'Invalid or expired login token' })
  const secret = user.twoFactor && user.twoFactor.secret
  if (!secret) return res.status(400).json({ error: '2FA not configured' })
  const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(code), window: 1 })
  if (!verified) return res.status(401).json({ error: 'Invalid code' })

  // success: issue final token and clear loginToken
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

app.listen(PORT, () => {
  console.log(`School Management System server running on http://localhost:${PORT}`)
  console.log(`Frontend (after npm run build): http://localhost:${PORT}`)
  console.log(`API: http://localhost:${PORT}/api/`)
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
