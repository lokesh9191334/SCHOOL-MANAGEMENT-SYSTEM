import { useEffect, useState } from 'react'

function readStored(key) {
  if (typeof window === 'undefined') return { found: false, value: undefined }
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null || raw === '') return { found: false, value: undefined }
    return { found: true, value: JSON.parse(raw) }
  } catch {
    return { found: false, value: undefined }
  }
}

/**
 * @template T
 * @param {string} key
 * @param {T} fallback
 */
export function usePersistentState(key, fallback) {
  const [state, setState] = useState(() => {
    const stored = readStored(key)
    return stored.found ? stored.value : fallback
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* ignore quota */
    }
  }, [key, state])

  return [state, setState]
}
