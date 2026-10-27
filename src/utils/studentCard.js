export function academicSession(date = new Date()) {
  const year = date.getFullYear()
  const startYear = date.getMonth() >= 3 ? year : year - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

export function cardValidTill(date = new Date()) {
  const year = date.getFullYear()
  const endYear = date.getMonth() >= 3 ? year + 1 : year
  return `${endYear}-03-31`
}

export function studentDisplayName(student) {
  const composed = [student?.firstName, student?.lastName].filter(Boolean).join(' ').trim()
  return String(student?.title || composed || '').trim() || '—'
}

export function studentClassLabel(student) {
  const raw =
    student?.applyingForClass ||
    student?.studentClass ||
    student?.className ||
    student?.subtitle ||
    ''
  return String(raw).replace(/^class\s+/i, '').trim() || '—'
}

export function studentCardNumber(student) {
  return String(
    student?.applicationId ||
      student?.admissionNo ||
      student?.cardNo ||
      student?.id ||
      '',
  ).trim() || '—'
}

export function isStudentCardReady(student) {
  return Boolean(
    student &&
      studentDisplayName(student) !== '—' &&
      studentClassLabel(student) !== '—' &&
      String(student?.studentPhotoUrl || '').trim(),
  )
}

export function dash(value) {
  const text = String(value ?? '').trim()
  return text || '—'
}

export function formatCardDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function initialsOf(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}
