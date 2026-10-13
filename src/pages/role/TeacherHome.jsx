import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import './RoleHome.css'

const cards = [
  { to: '/teacher/attendance', label: 'Student attendance', note: 'Mark Present / Absent / Leave' },
  { to: '/teacher/homework/upload', label: 'Upload homework', note: 'Share worksheets with class' },
  { to: '/teacher/exams/marks', label: 'Marks + auto calc', note: 'Totals, % , grades, ranks' },
  { to: '/teacher/exams/report-cards', label: 'Premium report cards', note: 'Print-ready student cards' },
  { to: '/teacher/parent-communication', label: 'Parent messaging', note: 'SMS / email updates' },
  { to: '/teacher/leave-inbox', label: 'Leave requests', note: 'Approve parent leave (via Approvals)' },
]

export default function TeacherHome() {
  const [teachers] = usePersistentState(STORAGE_KEYS.teachers, [])
  const [attendance] = usePersistentState(STORAGE_KEYS.attendance, [])
  const teacher = teachers[0]
  const teacherSubject = teacher?.subject || teacher?.subtitle || '—'
  const exceptions = attendance.filter((row) => ['Absent', 'Late'].includes(row.status)).length

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
      <section className="role-home__grid">
        {cards.map((card) => (
          <Link key={card.to} to={card.to === '/teacher/leave-inbox' ? '/approvals' : card.to} className="role-home__card tone-a">
            <h3>{card.label}</h3>
            <p>{card.note}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}
