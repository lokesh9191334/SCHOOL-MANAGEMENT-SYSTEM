/* Presentation helpers shared by the parent and teacher live session pages.
   Everything here derives from real dates/times returned by the server. */

export function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function addDaysIso(date, days) {
  const when = new Date(`${date}T12:00:00Z`)
  when.setUTCDate(when.getUTCDate() + days)
  return when.toISOString().slice(0, 10)
}

/** First bookable weekday: today, or the coming Monday when today is a weekend. */
export function nextWeekdayIso(from = todayIso()) {
  let cursor = from
  for (let step = 0; step < 3; step += 1) {
    if (!isoDateParts(cursor).weekend) return cursor
    cursor = addDaysIso(cursor, 1)
  }
  return cursor
}

export function isoDateParts(date) {  const when = new Date(`${date}T12:00:00`)
  if (Number.isNaN(when.getTime())) return { weekday: '—', day: '—', month: '—', weekend: false }
  return {
    weekday: when.toLocaleDateString('en-IN', { weekday: 'short' }),
    day: String(when.getDate()).padStart(2, '0'),
    month: when.toLocaleDateString('en-IN', { month: 'short' }),
    weekend: when.getDay() === 0 || when.getDay() === 6,
  }
}

export function initialsOf(name) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return '—'
  const first = words[0][0] || ''
  const last = words.length > 1 ? words[words.length - 1][0] || '' : ''
  return `${first}${last}`.toUpperCase()
}

export function relativeWhen(value) {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (!Number.isFinite(then)) return '—'
  const diff = Date.now() - then
  if (diff < 60 * 1000) return 'just now'
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 60000))} min ago`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.round(diff / 3600000)} h ago`
  return `${Math.round(diff / 86400000)} d ago`
}

export function formatWhen(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** "Today", "Tomorrow", "In 3 days" — from the real meeting date. */
export function countdownLabel(date) {
  const today = todayIso()
  if (!date) return '—'
  if (date === today) return 'Today'
  if (date === addDaysIso(today, 1)) return 'Tomorrow'
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000)
  if (!Number.isFinite(days)) return '—'
  if (days < 0) return 'Past'
  return `In ${days} day${days === 1 ? '' : 's'}`
}

export function slotGroupLabel(startTime) {
  const hour = Number(String(startTime || '').slice(0, 2))
  if (!Number.isFinite(hour)) return 'Slots'
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

/** Groups free slots into morning / afternoon / evening, keeping server order. */
export function groupSlots(slots = []) {
  const order = ['Morning', 'Afternoon', 'Evening']
  const map = new Map(order.map((label) => [label, []]))
  for (const slot of slots) {
    map.get(slotGroupLabel(slot.startTime)).push(slot)
  }
  return order
    .filter((label) => map.get(label).length)
    .map((label) => ({ label, slots: map.get(label) }))
}
