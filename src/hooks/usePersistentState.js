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
    fetch(`/api/records/${encodeURIComponent(key)}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((remote) => {
        if (cancelled) return
        if (Array.isArray(remote) && remote.length) setState(remote)
        setServerReady(true)
      })
      .catch(() => setServerReady(true))
    return () => {
      cancelled = true
    }
  }, [key])

  useEffect(() => {
    if (!serverReady) return
    fetch(`/api/records/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => undefined)
  }, [key, state, serverReady])

  return [state, setState]
}
