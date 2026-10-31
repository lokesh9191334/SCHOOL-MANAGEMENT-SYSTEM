import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { fetchMySchedule } from '../../services/schedule'
import UpcomingEvents from '../shared/UpcomingEvents'
import './RoleHome.css'

const cards = [
  { to: '/teacher/attendance', label: 'Student attendance', note: 'Mark Present / Absent / Leave' },
  { to: '/teacher/homework/upload', label: 'Upload homework', note: 'Share worksheets with class' },
  { to: '/teacher/exams/marks', label: 'Marks + auto calc', note: 'Totals, % , grades, ranks' },
  { to: '/teacher/exams/report-cards', label: 'Premium report cards', note: 'Print-ready student cards' },
  { to: '/teacher/parent-communication', label: 'Parent messaging', note: 'SMS / email updates' },
  { to: '/teacher/timetable', label: 'Class schedule', note: 'My periods + substitute duty' },
  { to: '/teacher/leave', label: 'My leave', note: 'Apply and track admin approval' },
  { to: '/teacher/student-leave', label: 'Student leave', note: 'Approve leave requests from parents' },
]

function dutyLine(row) {
  return `${row.className} · ${row.periodLabel}${row.time ? ` · ${row.time}` : ''}`
}

export default function TeacherHome() {
  const [teachers] = usePersistentState(STORAGE_KEYS.teachers, [])
  const [attendance] = usePersistentState(STORAGE_KEYS.attendance, [])
  const [schedule, setSchedule] = useState({ duties: [], today: [], date: '' })
  const teacher = teachers[0]
  const teacherSubject = teacher?.subject || teacher?.subtitle || '—'
  const exceptions = attendance.filter((row) => ['Absent', 'Late'].includes(row.status)).length
  const duties = schedule.duties || []
  const todayDuties = duties.filter((row) => row.date === schedule.date)

  useEffect(() => {
    let active = true
    fetchMySchedule()
      .then((body) => {
        if (!active) return
        setSchedule({
          duties: Array.isArray(body.duties) ? body.duties : [],
          today: Array.isArray(body.today) ? body.today : [],
          date: body.date || '',
        })
      })
      .catch(() => {
        /* the Class Schedule page shows the real error when opened */
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="role-home">
      <header className="role-home__hero role-home__hero--teacher">
        <div>
          <p className="admin-kicker">Teacher desk</p>
          <h2>Classroom operations</h2>
          <p>Attendance, homework, exams, remarks and parent communication in one workspace.</p>
        </div>
        <div className="role-home__metrics">
          <article><strong>{teacherSubject}</strong><span>Subject</span></article>
          <article><strong>{attendance.length}</strong><span>Attendance rows</span></article>
          <article><strong>{exceptions}</strong><span>Exceptions</span></article>
        </div>
      </header>
      {todayDuties.length || duties.length ? (
        <Link to="/teacher/timetable" className="role-home__card tone-a">
          <h3>
            Substitute duty{todayDuties.length ? ` · ${todayDuties.length} period${todayDuties.length === 1 ? '' : 's'} today` : ''}
          </h3>
          <p>
            You are covering for a colleague on approved leave: {dutyLine(todayDuties[0] || duties[0])}
            {duties.length > (todayDuties.length || 1) ? ` · ${duties.length} duty(s) overall` : ''}. Open Class
            Schedule for the full list.
          </p>
        </Link>
      ) : null}
      <UpcomingEvents moreTo="/teacher/events" />
      <section className="role-home__grid">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="role-home__card tone-a">
            <h3>{card.label}</h3>
            <p>{card.note}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
