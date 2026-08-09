import { Link } from 'react-router-dom'
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
  return (
    <div className="role-home">
      <header className="role-home__hero role-home__hero--teacher">
        <div>
          <p className="admin-kicker">Teacher desk</p>
          <h2>Classroom operations</h2>
          <p>Attendance, homework, exams, remarks and parent communication in one workspace.</p>
        </div>
        <div className="role-home__metrics">
          <article><strong>9-B</strong><span>Homeroom</span></article>
          <article><strong>36</strong><span>Students</span></article>
          <article><strong>2</strong><span>Homework due</span></article>
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
