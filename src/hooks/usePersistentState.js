import { useEffect, useState } from 'react'
import { getApiAuthHeaders } from '../services/apiAuth'

const LOAD_ATTEMPTS = 3
const LOAD_RETRY_DELAY = 1000

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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
    if (typeof window === 'undefined') return
    if (isParentSession()) return undefined
    let cancelled = false

    const load = async () => {
      for (let attempt = 1; attempt <= LOAD_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetch(`/api/records/${encodeURIComponent(key)}`, {
            headers: getApiAuthHeaders(),
          })
          const body = await response.json().catch(() => null)
          if (!response.ok) throw new Error(body?.error || `Could not load saved data (${response.status}).`)
          if (!Array.isArray(body)) throw new Error('The server returned invalid saved data.')
          if (cancelled) return
          if (body.length > 0) {
            setState(body)
          }
          // When the server has nothing, keep locally saved records: wiping
          // them here would destroy rows whose save never reached the server
          // (e.g. after a failed first load). Marking the server ready makes
          // the save effect below push the local rows back up.
          setServerReady(true)
          return
        } catch (error) {
          if (cancelled) return
          if (attempt >= LOAD_ATTEMPTS) {
            console.error(`Could not load saved data for ${key}:`, error)
            window.dispatchEvent(new CustomEvent('sms:persistence-error', {
              detail: { key, message: error.message || 'Could not load saved data.' },
            }))
            // A failed first load must never disable saving for the whole
            // session — otherwise every change is silently kept local only.
            setServerReady(true)
            return
          }
          await wait(LOAD_RETRY_DELAY)
        }
      }
    }

    load()
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
