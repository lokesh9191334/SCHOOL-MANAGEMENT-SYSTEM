import { istParts } from './faceAttendance.js'

const WEEKEND_LABELS = { 0: 'Sunday', 6: 'Saturday' }

/** School holiday state for one IST calendar day. Weekends are off by default. */
export function holidayForDate(date = new Date(), events = []) {
  const stamp = istParts(date)
  // Noon UTC on the IST date avoids DST/offset drift when deriving the weekday.
  const weekday = new Date(`${stamp.date}T12:00:00Z`).getUTCDay()
  if (weekday === 0 || weekday === 6) {
    return {
      active: true,
      source: 'weekend',
      title: WEEKEND_LABELS[weekday],
      date: stamp.date,
      eventId: '',
    }
  }

  const holiday = (Array.isArray(events) ? events : []).find(
    (event) =>
      event?.type === 'holiday' &&
      event?.status === 'published' &&
      String(event?.date || '') === stamp.date,
  )
  if (!holiday) {
    return { active: false, source: '', title: '', date: stamp.date, eventId: '' }
  }
  return {
    active: true,
    source: 'event',
    title: String(holiday.title || 'School holiday').slice(0, 120),
    date: stamp.date,
    eventId: holiday.id || '',
  }
}
