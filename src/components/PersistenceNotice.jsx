import { useEffect, useState } from 'react'

export default function PersistenceNotice() {
  const [error, setError] = useState('')

  useEffect(() => {
    const handleError = (event) => {
      const detail = event.detail || {}
      setError(`${detail.message || 'Saved data could not be synchronized.'} (${detail.key || 'app data'})`)
    }
    window.addEventListener('sms:persistence-error', handleError)
    return () => window.removeEventListener('sms:persistence-error', handleError)
  }, [])

  if (!error) return null
  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        inset: 'auto 16px 16px',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '12px 16px',
        border: '1px solid #b91c1c',
        borderRadius: 10,
        background: '#fff7f7',
        color: '#7f1d1d',
        boxShadow: '0 8px 24px #0002',
      }}
    >
      <span>{error}</span>
      <button type="button" onClick={() => setError('')} aria-label="Dismiss save error">
        Dismiss
      </button>
    </div>
  )
}
