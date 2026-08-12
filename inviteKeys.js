import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const INVITES_FILE = join(__dirname, 'data', 'inviteKeys.json')

const ROLE_PREFIX = {
  teacher: 'TCH',
  parent: 'PAR',
  admin: 'ADM',
  super_admin: 'SAD',
}

function ensureFile() {
  const dataDir = join(__dirname, 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(INVITES_FILE)) {
    fs.writeFileSync(INVITES_FILE, '[]', 'utf8')
  }
}

export function readInvites() {
  ensureFile()
  try {
    const raw = fs.readFileSync(INVITES_FILE, 'utf8')
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeInvites(list) {
  ensureFile()
  fs.writeFileSync(INVITES_FILE, JSON.stringify(list, null, 2), 'utf8')
}

function chunk() {
  return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X')
}

export function generateInviteKey(role = 'teacher') {
  const prefix = ROLE_PREFIX[role] || 'INV'
  return `SMS-${prefix}-${chunk()}-${chunk()}`
}

/** 7-char admin login key, e.g. lok@010 — changes every login */
export function generateAdminLoginKey(_role = 'admin') {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  let prefix = ''
  for (let i = 0; i < 3; i += 1) {
    prefix += letters[Math.floor(Math.random() * letters.length)]
  }
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `${prefix}@${digits}`
}

export function normalizeAdminLoginKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

export function normalizeInviteKey(key) {
  return String(key || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function findInvite(key) {
  const normalized = normalizeInviteKey(key)
  if (!normalized) return null
  return readInvites().find((item) => normalizeInviteKey(item.key) === normalized) || null
}

export function createInvite({
  role,
  key,
  name = '',
  email = '',
  phone = '',
  linkedId = '',
  meta = {},
}) {
  if (!['teacher', 'parent'].includes(role)) {
    throw new Error('Invite role must be teacher or parent')
  }

  const invites = readInvites()
  let inviteKey = key ? normalizeInviteKey(key) : generateInviteKey(role)

  if (!/^SMS-(TCH|PAR|INV)-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(inviteKey)) {
    inviteKey = generateInviteKey(role)
  }

  if (invites.some((item) => normalizeInviteKey(item.key) === inviteKey)) {
    inviteKey = generateInviteKey(role)
  }

  const invite = {
    id: `INV-${Date.now()}`,
    key: inviteKey,
    role,
    name: String(name || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    phone: String(phone || '').trim(),
    linkedId: String(linkedId || '').trim(),
    meta: meta && typeof meta === 'object' ? meta : {},
    status: 'unused',
    createdAt: new Date().toISOString(),
    usedAt: null,
    usedByUserId: null,
  }

  writeInvites([invite, ...invites])
  return invite
}

export function updateInvite(key, patch) {
  const normalized = normalizeInviteKey(key)
  const invites = readInvites()
  let updated = null
  const next = invites.map((item) => {
    if (normalizeInviteKey(item.key) !== normalized) return item
    updated = { ...item, ...patch }
    return updated
  })
  if (!updated) return null
  writeInvites(next)
  return updated
}

export function consumeInvite(key, userId) {
  const invite = findInvite(key)
  if (!invite) return { ok: false, error: 'Invalid special key' }
  if (invite.status === 'used') return { ok: false, error: 'This special key has already been used' }
  const updated = updateInvite(key, {
    status: 'used',
    usedAt: new Date().toISOString(),
    usedByUserId: userId || null,
  })
  return { ok: true, invite: updated }
}
