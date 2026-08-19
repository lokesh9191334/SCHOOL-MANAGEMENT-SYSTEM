import { STORAGE_KEYS } from '../utils/constants'

function loadInviteKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.inviteKeys)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function saveInviteKeys(keys) {
  localStorage.setItem(STORAGE_KEYS.inviteKeys, JSON.stringify(keys))
}

export function generateLocalInviteKey(role = 'teacher') {
  const prefix = role === 'parent' ? 'PAR' : 'TCH'
  const chunk = () => Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X')
  return `SMS-${prefix}-${chunk()}-${chunk()}`
}

export const lookupInviteKey = async (key) => {
  const normalized = String(key || '').trim()
  if (!normalized) throw new Error('Special key is required')
  const list = loadInviteKeys()
  const invite = list.find((k) => k.key === normalized)
  if (!invite) throw new Error('Invalid special key')
  if (invite.used) throw new Error('This special key has already been used')
  return invite
}
