import { STORAGE_KEYS } from '../utils/constants'

export const fetchStudents = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.students)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.error('fetchStudents error', e)
    return []
  }
}

export const saveStudent = async (student) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.students) || '[]'
    const list = JSON.parse(raw)
    const record = { ...student, id: Date.now().toString() }
    list.push(record)
    localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(list))
    return record
  } catch (e) {
    console.error('saveStudent error', e)
    return { ...student, id: Date.now().toString() }
  }
}
