import { useEffect, useState } from 'react'
import { deleteEvent, eventEmailMessage, listEvents, publishEvent, saveEvent } from '../../services/events'
import './EventsBuilder.css'

const TYPE_OPTIONS = [
  { value: 'ptm', label: 'Parent-Teacher Meeting' },
  { value: 'festival', label: 'Festival' },
  { value: 'cultural', label: 'Cultural Program' },
  { value: 'sports', label: 'Sports Event' },
  { value: 'competition', label: 'Competition' },
  { value: 'trip', label: 'School Trip' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'other', label: 'Other' },
]

const AUDIENCE_OPTIONS = [
  { value: 'everyone', label: 'Parents + teachers' },
  { value: 'parents', label: 'Parents only' },
  { value: 'teachers', label: 'Teachers only' },
]

const EMPTY_FORM = {
  id: '',
  title: '',
  type: 'ptm',
  date: '',
  time: '',
  venue: '',
  audience: 'everyone',
  description: '',
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(value) {
  if (!value) return ''
  const [hours, minutes] = String(value).split(':').map(Number)
  if (Number.isNaN(hours)) return value
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const display = hours % 12 || 12
  return `${display}:${String(minutes || 0).padStart(2, '0')} ${suffix}`
}

function emailChip(email) {
  if (!email) return null
  const map = {
    queued: { label: 'Email queued', tone: 'ev-chip--pending' },
    sent: { label: email.recipients ? `Emailed ${email.sent}/${email.recipients}` : 'No recipients', tone: 'ev-chip--ok' },
    partial: { label: `Emailed ${email.sent}/${email.recipients}`, tone: 'ev-chip--warn' },
    failed: { label: 'Email failed', tone: 'ev-chip--bad' },
    disabled: { label: 'Email disabled', tone: 'ev-chip--warn' },
  }
  const chip = map[email.status]
  return chip ? <span className={`ev-chip ${chip.tone}`}>{chip.label}</span> : null
}

export default function EventsBuilder() {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmId, setConfirmId] = useState('')

  const load = () => listEvents()
    .then((rows) => {
      setEvents(Array.isArray(rows) ? rows : [])
      setError('')
    })
    .catch((err) => {
      setError(err?.message || 'Could not load events.')
    })
    .finally(() => setLoading(false))

  useEffect(load, [])

  const update = (field, value) => setForm((row) => ({ ...row, [field]: value }))

  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) return setError('Enter the event name.')
    if (!form.date) return setError('Choose the event date.')
    setBusy('save')
    setError('')
    setNotice('')
    try {
      const body = await saveEvent({
        id: form.id || undefined,
        title: form.title.trim(),
        type: form.type,
        date: form.date,
        time: form.time,
        venue: form.venue.trim(),
        audience: form.audience,
        description: form.description.trim(),
      })
      setEvents((rows) => {
        const next = form.id ? rows.map((row) => (row.id === form.id ? body.event : row)) : [body.event, ...rows]
        return next
      })
      setNotice(
        form.id
          ? 'Event updated. The invitation email was already sent when it was published.'
          : 'Draft saved. Publish it to email the invitation automatically.',
      )
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(err?.message || 'The event could not be saved.')
    } finally {
      setBusy('')
    }
  }

  const publish = async (id) => {
    setBusy(id)
    setError('')
    setNotice('')
    try {
      const body = await publishEvent(id)
      setEvents((rows) => rows.map((row) => (row.id === id ? { ...row, ...body.event, email: body.email } : row)))
      setNotice(eventEmailMessage(body.email))
    } catch (err) {
      setError(err?.message || 'The event could not be published.')
    } finally {
      setBusy('')
    }
  }

  const remove = async (id) => {
    if (confirmId !== id) {
      setConfirmId(id)
      return
    }
    setConfirmId('')
    setBusy(id)
    setError('')
    setNotice('')
    try {
      await deleteEvent(id)
      setEvents((rows) => rows.filter((row) => row.id !== id))
      if (form.id === id) setForm(EMPTY_FORM)
      setNotice('Event deleted.')
    } catch (err) {
      setError(err?.message || 'The event could not be deleted.')
    } finally {
      setBusy('')
    }
  }

  const startEdit = (row) => {
    setForm({
      id: row.id,
      title: row.title,
      type: row.type,
      date: row.date,
      time: row.time || '',
      venue: row.venue || '',
      audience: row.audience,
      description: row.description || '',
    })
    setNotice('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setForm(EMPTY_FORM)
    setNotice('')
  }

  const today = todayKey()
  const upcoming = events.filter((row) => String(row.date) >= today)
  const past = events.filter((row) => String(row.date) < today)

  const renderCard = (row) => (
    <article className={`ev-card ${row.status === 'published' ? 'is-published' : 'is-draft'}`} key={row.id}>
      <div className="ev-card-head">
        <div>
          <p className="ev-type">{row.typeLabel}</p>
          <h3>{row.title}</h3>
          <span className="ev-when">
            {formatDate(row.date)}
            {row.time ? ` · ${formatTime(row.time)}` : ''}
            {row.venue ? ` · ${row.venue}` : ''}
          </span>
        </div>
        <div className="ev-card-chips">
          <span className={`ev-chip ${row.status === 'published' ? 'ev-chip--ok' : 'ev-chip--draft'}`}>
            {row.status === 'published' ? 'Published' : 'Draft'}
          </span>
          {row.status === 'published' ? emailChip(row.email) : null}
        </div>
      </div>
      {row.description ? <p className="ev-desc">{row.description}</p> : null}
      <div className="ev-card-actions">
        <span className="ev-audience">Invite: {AUDIENCE_OPTIONS.find((option) => option.value === row.audience)?.label || 'Everyone'}</span>
        <div className="ev-actions">
          {row.status === 'draft' ? (
            <button type="button" className="ev-btn primary" disabled={busy === row.id} onClick={() => publish(row.id)}>
              {busy === row.id ? 'Publishing…' : 'Publish & email'}
            </button>
          ) : null}
          <button type="button" className="ev-btn ghost" onClick={() => startEdit(row)}>
            Edit
          </button>
          <button
            type="button"
            className={`ev-btn ${confirmId === row.id ? 'danger' : 'ghost'}`}
            disabled={busy === row.id}
            onClick={() => remove(row.id)}
          >
            {confirmId === row.id ? 'Confirm delete' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  )

  return (
    <div className="ev-page">
      <header className="ev-hero">
        <div>
          <p className="admin-kicker">Notices · School admin only</p>
          <h2>Events & programs</h2>
          <p>
            Create parent-teacher meetings, festivals, trips and programs. Publishing an event emails the invitation
            automatically to the audience you choose, and it appears on the teacher and parent dashboards at once.
          </p>
        </div>
      </header>

      {loading ? <p className="ev-note">Loading events…</p> : null}
      {error ? <p className="ev-alert">{error}</p> : null}
      {notice ? <p className="ev-alert is-success" role="status">{notice}</p> : null}

      <form className="ev-form" onSubmit={submit}>
        <h3>{form.id ? 'Edit event' : 'New event'}</h3>
        <div className="ev-grid">
          <label className="ev-field ev-field--wide">
            <span>Event name *</span>
            <input
              value={form.title}
              maxLength={120}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Parent-Teacher Meeting (Term 2)"
            />
          </label>
          <label className="ev-field">
            <span>Type</span>
            <select value={form.type} onChange={(event) => update('type', event.target.value)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ev-field">
            <span>Email invitation to</span>
            <select value={form.audience} onChange={(event) => update('audience', event.target.value)}>
              {AUDIENCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="ev-field">
            <span>Date *</span>
            <input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} />
          </label>
          <label className="ev-field">
            <span>Time</span>
            <input type="time" value={form.time} onChange={(event) => update('time', event.target.value)} />
          </label>
          <label className="ev-field ev-field--wide">
            <span>Venue</span>
            <input
              value={form.venue}
              maxLength={120}
              onChange={(event) => update('venue', event.target.value)}
              placeholder="School auditorium"
            />
          </label>
          <label className="ev-field ev-field--full">
            <span>Details</span>
            <textarea
              value={form.description}
              maxLength={1500}
              rows={4}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Agenda, dress code, items to bring…"
            />
          </label>
        </div>
        <div className="ev-form-actions">
          <button type="submit" className="ev-btn primary" disabled={busy === 'save'}>
            {busy === 'save' ? 'Saving…' : form.id ? 'Save changes' : 'Save draft'}
          </button>
          {form.id ? (
            <button type="button" className="ev-btn ghost" onClick={cancelEdit}>
              Cancel edit
            </button>
          ) : null}
          <span className="ev-hint">Publishing is a separate step — nothing is emailed until you publish.</span>
        </div>
      </form>

      {!loading && !events.length ? (
        <div className="ev-empty">
          <strong>No events yet.</strong>
          <span>Create your first event above — for example a parent-teacher meeting — then publish it to email every parent automatically.</span>
        </div>
      ) : null}

      {upcoming.length ? <h3 className="ev-section">Upcoming</h3> : null}
      {upcoming.map(renderCard)}

      {past.length ? <h3 className="ev-section">Past</h3> : null}
      {past.map(renderCard)}
    </div>
  )
}
