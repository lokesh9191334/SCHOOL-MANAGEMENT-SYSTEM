import { Link } from 'react-router-dom'
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
  return (
    <div className="role-home">
      <header className="role-home__hero role-home__hero--parent">
        <div>
          <p className="admin-kicker">Parent portal</p>
          <h2>Your child’s campus hub</h2>
          <p>Attendance, homework, fees, results, transport and leave — linked by special admission key.</p>
        </div>
        <div className="role-home__metrics">
          <article><strong>Aanya</strong><span>Student</span></article>
          <article><strong>9-B</strong><span>Class</span></article>
          <article><strong>₹15k</strong><span>Fee due</span></article>
        </div>
      </header>
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
