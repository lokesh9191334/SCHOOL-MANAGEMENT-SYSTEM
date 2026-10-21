import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listEvents } from '../../services/events'
import './UpcomingEvents.css'

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
  return parsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function UpcomingEvents({ moreTo = '/parent/events' }) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    let alive = true
    listEvents()
      .then((rows) => { if (alive) setEvents(Array.isArray(rows) ? rows : []) })
      .catch(() => { if (alive) setEvents([]) })
    return () => { alive = false }
  }, [])

  if (!events) return null
  const key = todayKey()
  const upcoming = events.filter((row) => (row.date || '') >= key).slice(0, 3)
  if (upcoming.length === 0) return null

  return (
    <section className="ue-strip">
      <div className="ue-head">
        <h3>Upcoming events</h3>
        <Link to={moreTo} className="ue-more">View all</Link>
      </div>
      <div className="ue-row">
        {upcoming.map((event) => (
          <Link key={event.id} to={moreTo} className="ue-card">
            <span className="ue-type">{event.typeLabel || 'Event'}</span>
            <strong>{event.title}</strong>
            <span className="ue-when">
              {formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}
            </span>
            {event.venue ? <span className="ue-venue">{event.venue}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  )
}
