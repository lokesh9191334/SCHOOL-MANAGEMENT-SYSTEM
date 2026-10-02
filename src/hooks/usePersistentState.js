import { useEffect, useState } from 'react'
import { getApiAuthHeaders } from '../services/apiAuth'

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

function isParentSession() {
  try {
    const user = JSON.parse(window.localStorage.getItem('auth_user') || 'null')
    return String(user?.role || '').toLowerCase() === 'parent'
  } catch {
    return false
  }
}

/**
 * @template T
 * @param {string} key
 * @param {T} fallback
 */
export function usePersistentState(key, fallback) {
  const [serverReady, setServerReady] = useState(false)
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

  useEffect(() => {
    let cancelled = false
    if (isParentSession()) return undefined
    fetch(`/api/records/${encodeURIComponent(key)}`, {
      headers: getApiAuthHeaders(),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error(body?.error || `Could not load saved data (${response.status}).`)
        if (!Array.isArray(body)) throw new Error('The server returned invalid saved data.')
        if (cancelled) return
        setState(body)
        setServerReady(true)
      })
      .catch((error) => {
        if (cancelled) return
        console.error(`Could not load saved data for ${key}:`, error)
        window.dispatchEvent(new CustomEvent('sms:persistence-error', {
          detail: { key, message: error.message || 'Could not load saved data.' },
        }))
      })
    return () => {
      cancelled = true
    }
  }, [key])

  useEffect(() => {
    if (!serverReady || isParentSession()) return
    fetch(`/api/records/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(state),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok || body?.saved !== true) {
          throw new Error(body?.error || `Could not save data (${response.status}).`)
        }
      })
      .catch((error) => {
        console.error(`Could not save data for ${key}:`, error)
        window.dispatchEvent(new CustomEvent('sms:persistence-error', {
          detail: { key, message: error.message || 'Could not save data.' },
        }))
      })
  }, [key, state, serverReady])

  return [state, setState]
}
