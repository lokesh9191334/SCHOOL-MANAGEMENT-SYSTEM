import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { getAuthUser } from '../../utils/session'
import { currencySymbol } from '../../utils/currency'
import { getApiAuthHeaders } from '../../services/apiAuth'
import { fetchLiveSessions } from '../../services/liveSessions'
import UpcomingEvents from '../shared/UpcomingEvents'
import './RoleHome.css'

const cards = [
  { to: '/parent/attendance', label: 'Attendance', note: 'Daily status for your child' },
  { to: '/parent/homework', label: 'Homework', note: 'Download teacher packs' },
  { to: '/parent/assignments', label: 'Assignments', note: 'Submit & check status' },
  { to: '/parent/fees/pending', label: 'Pending fees', note: 'Pay online' },
  { to: '/parent/results', label: 'Results', note: 'Published grades' },
  { to: '/parent/leave-request', label: 'Leave request', note: 'Send to class teacher' },
  { to: '/parent/live-session', label: 'Live session', note: 'Meet the teacher on video' },
  { to: '/parent/transport/live', label: 'Live bus', note: 'Track bus, driver & route' },
  { to: '/parent/notices', label: 'Notices & events', note: 'School updates' },
]

export default function ParentHome() {
  const [students] = usePersistentState(STORAGE_KEYS.students, [])
  const [attendance] = usePersistentState(STORAGE_KEYS.attendance, [])
  const [feeEntry, setFeeEntry] = useState(undefined)
  const [liveData, setLiveData] = useState(null)
  const linkedId = getAuthUser()?.linkedId
  const localChild = linkedId ? students.find((student) => student.applicationId === linkedId || student.id === linkedId) || null : null
  const serverChild = feeEntry?.student || null
  const child = serverChild || localChild
  const childAttendance = useMemo(() => attendance.filter((row) => row.title === child?.title), [attendance, child?.title])

  useEffect(() => {
    fetch('/api/payments/summary', { headers: getApiAuthHeaders() })
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok) throw new Error(body?.error || 'Could not load fee details.')
        if (!Array.isArray(body?.students)) throw new Error('The server returned an invalid fee summary.')
        setFeeEntry(body.students[0] || null)
      })
      .catch((error) => {
        console.error('Could not load fee summary:', error)
        setFeeEntry(null)
      })
  }, [])

  useEffect(() => {
    let active = true
    fetchLiveSessions()
      .then((body) => {
        if (active) setLiveData(body)
      })
      .catch(() => {
        if (active) setLiveData(null)
      })
    return () => {
      active = false
    }
  }, [])

  const liveUpcoming = (liveData?.sessions || [])
    .filter((row) => ['Pending', 'Accepted'].includes(row.status))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  const liveNotice = liveData?.notice || null
  const latestLive = liveUpcoming[0] || null
  const showLiveNotice = Boolean(
    liveNotice && (!latestLive || String(liveNotice.decidedAt || '') >= String(latestLive.createdAt || '')),
  )
  const liveAccepted = liveUpcoming.find((row) => row.status === 'Accepted') || null
  const livePending = liveUpcoming.find((row) => row.status === 'Pending') || null

  const feeDueText = feeEntry === undefined
    ? '…'
    : feeEntry && feeEntry.balance !== null
      ? `${currencySymbol()}${Math.round(feeEntry.balance).toLocaleString('en-IN')}`
      : '—'

  return (
    <div className="role-home">
      <header className="role-home__hero role-home__hero--parent">
        <div>
          <p className="admin-kicker">Parent portal</p>
          <h2>Your child’s campus hub</h2>
          <p>Attendance, homework, fees, results, transport and leave — linked by special admission key.</p>
        </div>
        <div className="role-home__metrics">
          <article><strong>{child?.title || child?.name || 'Not linked'}</strong><span>Student</span></article>
          <article><strong>{child?.subtitle || child?.className || 'Unassigned'}</strong><span>Class</span></article>
          <article><strong>{childAttendance.length}</strong><span>Attendance updates</span></article>
          <article><strong>{feeDueText}</strong><span>Fee due</span></article>
        </div>
      </header>
      {showLiveNotice ? (
        <Link to="/parent/live-session" className="role-home__card tone-b">
          <h3>Live session cancelled by teacher</h3>
          <p>
            {liveNotice.teacherName} · {liveNotice.dateLabel} · {liveNotice.timeLabel}
            {liveNotice.decisionNote ? ` — ${liveNotice.decisionNote}` : ''}
          </p>
        </Link>
      ) : liveAccepted ? (
        <Link to="/parent/live-session" className="role-home__card tone-a">
          <h3>Live session confirmed · {liveAccepted.dateLabel}</h3>
          <p>
            {liveAccepted.teacherName} at {liveAccepted.timeLabel}. Open Live Session to join the video
            meeting.
          </p>
        </Link>
      ) : livePending ? (
        <Link to="/parent/live-session" className="role-home__card tone-c">
          <h3>Live session request pending</h3>
          <p>
            {livePending.teacherName} · {livePending.dateLabel} · {livePending.timeLabel}. You will get an
            email once the teacher accepts or cancels it.
          </p>
        </Link>
      ) : null}
      <UpcomingEvents moreTo="/parent/events" />
      <section className="role-home__grid">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="role-home__card tone-c">
            <h3>{card.label}</h3>
            <p>{card.note}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
