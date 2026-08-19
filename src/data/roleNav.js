import { ROLES } from '../utils/constants'

export function homePathForRole(role) {
  const normalized = String(role || 'admin').toLowerCase()
  if (normalized === ROLES.SUPER_ADMIN || normalized === 'superadmin') return '/dashboard'
  if (normalized === ROLES.TEACHER) return '/dashboard'
  if (normalized === ROLES.PARENT) return '/dashboard'
  return '/dashboard'
}
