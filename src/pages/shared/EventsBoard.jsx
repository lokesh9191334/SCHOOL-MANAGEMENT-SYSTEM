import { useEffect, useState } from 'react'
import { listEvents } from '../../services/events'
import './EventsBoard.css'

function todayKey() {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function EventCard({ event, past }) {
  return (
    <article className={`evb-card${past ? ' is-past' : ''}`}>
      <div className="evb-card-head">
        <span className="evb-type">{event.typeLabel || 'Event'}</span>
        <span className="evb-date">{formatDate(event.date)}</span>
      </div>
      <h3>{event.title}</h3>
      <div className="evb-meta">
        {event.time ? <span>{event.time}</span> : null}
        {event.venue ? <span>{event.venue}</span> : null}
        {event.time || event.venue ? null : <span>—</span>}
      </div>
      {event.description ? <p className="evb-desc">{event.description}</p> : null}
      <div className="evb-foot">
        Published by {event.publishedByName || 'School admin'} · {event.audience === 'teachers' ? 'For teachers' : event.audience === 'parents' ? 'For parents' : 'For everyone'}
      </div>
    </article>
  )
}

export default function EventsBoard({ title = 'School Events', subtitle = 'Programs, meetings and celebrations announced by the school.' }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkedAt, setCheckedAt] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const rows = await listEvents()
        if (cancelled) return
        setEvents(Array.isArray(rows) ? rows : [])
        setError('')
        setCheckedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'Could not load events.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const onFocus = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const key = todayKey()
  const upcoming = events.filter((row) => (row.date || '') >= key)
  const past = events.filter((row) => (row.date || '') < key)

  return (
    <div className="evb-page">
      <header className="evb-hero">
        <div>
          <p className="evb-kicker">{title}</p>
          <h2>Events &amp; Programs</h2>
          <p className="evb-sub">{subtitle}</p>
          {checkedAt ? <p className="evb-live"><span className="evb-live-dot" /> Auto-updates on open · last checked {checkedAt}</p> : null}
        </div>
      </header>

      {error ? <div className="evb-alert">{error}</div> : null}
      {loading ? <div className="evb-empty">Loading events…</div> : null}

      {!loading && !error && events.length === 0 ? (
        <div className="evb-empty">No events published yet. School programs will appear here automatically once announced.</div>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="evb-section">
          <h3 className="evb-section-title">Upcoming</h3>
          <div className="evb-grid">
            {upcoming.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="evb-section">
          <h3 className="evb-section-title">Past</h3>
          <div className="evb-grid">
            {past.map((event) => <EventCard key={event.id} event={event} past />)}
          </div>
        </section>
      ) : null}
    </div>
  )
}
