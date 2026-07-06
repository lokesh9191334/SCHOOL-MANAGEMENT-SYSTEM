import { useEffect, useState } from 'react'

function readStored(key) {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null || raw === '') return undefined
    return JSON.parse(raw)
  } catch {
    return undefined
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
    if (stored !== undefined) {
      if (Array.isArray(stored) && stored.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
        return fallback
      }
      return stored
    }
    return fallback
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
