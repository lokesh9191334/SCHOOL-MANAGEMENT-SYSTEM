import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { getAuthUser } from '../../utils/session'
import { currencySymbol } from '../../utils/currency'
import { getApiAuthHeaders } from '../../services/apiAuth'
import UpcomingEvents from '../shared/UpcomingEvents'
import './RoleHome.css'

const cards = [
  { to: '/parent/attendance', label: 'Attendance', note: 'Daily status for your child' },
  { to: '/parent/homework', label: 'Homework', note: 'Download teacher packs' },
  { to: '/parent/assignments', label: 'Assignments', note: 'Submit & check status' },
  { to: '/parent/fees/pending', label: 'Pending fees', note: 'Pay online' },
  { to: '/parent/results', label: 'Results', note: 'Published grades' },
  { to: '/parent/leave-request', label: 'Leave request', note: 'Send to class teacher' },
  { to: '/parent/transport/bus', label: 'Transport', note: 'Bus, driver, pickup/drop' },
  { to: '/parent/notices', label: 'Notices & events', note: 'School updates' },
]

export default function ParentHome() {
  const [students] = usePersistentState(STORAGE_KEYS.students, [])
  const [attendance] = usePersistentState(STORAGE_KEYS.attendance, [])
  const [feeEntry, setFeeEntry] = useState(undefined)
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
