import { STORAGE_KEYS } from '../utils/constants'
import { getApiAuthHeaders } from './apiAuth'

const API = `/api/records/${encodeURIComponent(STORAGE_KEYS.students)}`

async function requestStudents(url, options) {
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: getApiAuthHeaders(options?.headers),
    })
  } catch {
    throw new Error('Cannot reach the API server. Start the website with “npm run dev:all”.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Student request failed (${response.status})`)
  }
  return body
}

function writeLocalStudents(students) {
  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students))
}

export const fetchStudents = async () => {
  const saved = await requestStudents(API)
  if (!Array.isArray(saved)) throw new Error('The API returned an invalid student list.')
  writeLocalStudents(saved)
  return saved
}

export const saveStudent = async (student) => {
  const record = { ...student, id: String(student.id || Date.now()) }
  const students = await fetchStudents()
  const nextStudents = [
    ...students.filter((saved) => String(saved.id) !== String(record.id)),
    record,
  ]
  await replaceStudents(nextStudents)
  return record
}

export const replaceStudents = async (students) => {
  const result = await requestStudents(API, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(students),
  })
  if (!result || result.saved !== true) throw new Error('The API did not confirm saving student records.')
  writeLocalStudents(students)
  return students
}
