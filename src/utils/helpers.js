export const readStoredData = (key) => {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export const saveStoredData = (key, value) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}
