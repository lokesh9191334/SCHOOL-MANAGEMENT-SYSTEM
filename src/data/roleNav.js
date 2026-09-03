import { ROLES } from '../utils/constants'

const section = (title, icon, items) => ({ title, icon, items })
const item = (to, label, icon, end = false) => ({ to, label, icon, end })

/** Super Admin — platform only (no school ERP modules) */
export const SUPER_ADMIN_NAV = [
  section('Platform', '◈', [
    item('/super-admin', 'Command Center', '◆', true),
  ]),
  section('Schools', '🏫', [
    item('/super-admin/schools', 'Add / Manage Schools', '＋'),
    item('/super-admin/school-requests', 'Approval Requests', '✓'),
    item('/super-admin/schools/suspend', 'Suspend Schools', '⊘'),
  ]),
  section('Subscriptions', '💳', [
    item('/super-admin/subscriptions', 'View Subscriptions', '▤'),
    item('/super-admin/plans', 'Manage Plans', '◫'),
    item('/super-admin/plans/monitor', 'Monitor Plans', '◔'),
  ]),
  section('Intelligence', '📊', [
    item('/super-admin/analytics', 'View Analytics', '▣'),
  ]),
  section('Support', '🎧', [
    item('/super-admin/tickets', 'Support Tickets', '✉'),
  ]),
  section('Finance', '₹', [item('/fees/online-payments', 'Payment Verification', '✓')]),
  section('Assistant', '✦', [item('/ai-assistant', 'AI Assistant', '✦')]),
  section('Account', '⚙️', [
    item('/settings/profile', 'Profile', '◫'),
    item('/settings/logout', 'Logout', '↦'),
  ]),
]

/** School Admin — full campus ERP */
export const ADMIN_NAV = [
  section('Dashboard', '◈', [item('/dashboard', 'Executive Dashboard', '◆', true)]),
  section('Students', '🎓', [
    item('/students/add', 'New Admission', '＋'),
    item('/students/list', 'Student List', '▤'),
    item('/students/parent-details', 'Parents', '☏'),
    item('/students/data-files', 'Documents', '⤴'),
    item('/students/performance', 'Performance Report', '◔'),
    item('/students/id-card', 'ID Cards', '▣'),
  ]),
  section('Teachers', '👨‍🏫', [
    item('/teachers/add', 'Add Teacher', '＋'),
    item('/teachers/list', 'Teacher List', '▥'),
    item('/teachers/profile', 'Teacher Profile', '◫'),
    item('/teachers/qualifications', 'Teacher Qualification', '✦'),
    item('/teachers/subjects', 'Subjects', '◉'),
    item('/teachers/attendance', 'Teacher Attendance', '☑'),
    item('/teachers/salary', 'Salary Details', '₹'),
    item('/teachers/performance', 'Teacher Performance', '★'),
    item('/teachers/documents', 'Teacher Documents', '▤'),
  ]),
  section('Academics', '📚', [
    item('/academics/subjects/add', 'Subjects', '✦'),
    item('/academics/subject-assignment', 'Subject Assignment', '↔'),
    item('/academics/timetable', 'Timetable', '▦'),
    item('/examination/create', 'Exams', '＋'),
    item('/examination/results', 'Results', '▣'),
    item('/examination/report-cards', 'Report Cards', '▤'),
    item('/examination/rank-list', 'Rank List', '★'),
  ]),
  section('Fees', '💰', [
    item('/fees/structure', 'Fee Structure', '◫'),
    item('/fees/installments', 'Installments', '≡'),
    item('/fees/receipts', 'Receipts', '▤'),
    item('/fees/pending', 'Pending Fees', '!'),
    item('/fees/online-payments', 'Online Payments', '⌁'),
    item('/fees/discounts', 'Discounts', '✦'),
    item('/fees/fines', 'Fines', '⚠'),
  ]),
  section('Transport', '🚌', [
    item('/transport/vehicles', 'Bus Number', '▣'),
    item('/transport/drivers', 'Driver Details', '◫'),
    item('/transport/routes', 'Routes', '⇄'),
    item('/transport/pickup-points', 'Pickup Points', '⌖'),
    item('/transport/drop-points', 'Drop Points', '◎'),
    item('/transport/student-allocation', 'Student Allocation', '↔'),
  ]),
  section('Attendance & Library', '📝', [
    item('/attendance/students', 'Student Attendance', '☑'),
    item('/attendance/monthly-report', 'Attendance Report', '▧'),
    item('/library/books/add', 'Library', '📖'),
  ]),
  section('Notices & Approvals', '📢', [
    item('/notices/school', 'School Notices', '◉'),
    item('/notices/holidays', 'Holidays', '☼'),
    item('/notices/exams', 'Exam Notices', '▦'),
    item('/approvals', 'Approvals', '✓'),
    item('/reports/campus', 'Reports', '▣'),
  ]),
  section('Assistant', '✦', [item('/ai-assistant', 'AI Assistant', '✦')]),
  section('Settings', '⚙️', [
    item('/settings/profile', 'Profile', '◫'),
    item('/settings/logout', 'Logout', '↦'),
  ]),
]

/** Teacher — classroom operations */
export const TEACHER_NAV = [
  section('Home', '◈', [item('/teacher', 'Teacher Desk', '◆', true)]),
  section('Classroom', '🎓', [
    item('/teacher/attendance', 'Student Attendance', '☑'),
    item('/teacher/homework', 'Homework', '✎'),
    item('/teacher/homework/upload', 'Upload Homework', '⤴'),
    item('/teacher/assignments', 'Assignments', '▤'),
    item('/teacher/timetable', 'Timetable', '▦'),
    item('/teacher/remarks', 'Student Remarks', '◇'),
    item('/teacher/parent-communication', 'Parent Communication', '☏'),
  ]),
  section('Student Records', '📁', [
    item('/teacher/students/personal', 'Personal Details', '◫'),
    item('/teacher/students/family', 'Family Details', '⌂'),
    item('/teacher/students/medical', 'Medical History', '+'),
    item('/teacher/students/documents', 'Documents', '▤'),
  ]),
  section('Fees & Certificates', '💰', [
    item('/teacher/fees', 'Fees Management', '₹'),
    item('/teacher/results', 'Results', '▣'),
    item('/teacher/certificates', 'Certificates', '✦'),
  ]),
  section('Examinations', '📊', [
    item('/teacher/exams/create', 'Create Exams', '＋'),
    item('/teacher/exams/marks', 'Marks Entry + Auto Calc', '✎'),
    item('/teacher/exams/grades', 'Grade Calculation', '◇'),
    item('/teacher/exams/ranking', 'Ranking', '★'),
    item('/teacher/exams/results', 'Result Generation', '▣'),
    item('/teacher/exams/report-cards', 'Premium Report Cards', '▤'),
  ]),
  section('Assistant', '✦', [item('/ai-assistant', 'AI Assistant', '✦')]),
  section('Account', '⚙️', [
    item('/settings/profile', 'Profile', '◫'),
    item('/settings/logout', 'Logout', '↦'),
  ]),
]

/** Parent — child portal */
export const PARENT_NAV = [
  section('Home', '◈', [item('/parent', 'Parent Home', '◆', true)]),
  section('My Child', '🎓', [
    item('/parent/profile', 'Parent Profile', '◫'),
    item('/parent/attendance', 'Attendance', '☑'),
    item('/parent/homework', 'Homework', '✎'),
    item('/parent/assignments', 'Assignments', '▤'),
    item('/parent/results', 'Results', '▣'),
    item('/parent/notices', 'Notices', '◉'),
    item('/parent/events', 'Events', '✦'),
    item('/parent/leave-request', 'Leave Request', '☘'),
  ]),
  section('Fees', '💰', [
    item('/parent/fees/installments', 'Installments', '≡'),
    item('/parent/fees/receipts', 'Receipts', '▤'),
    item('/parent/fees/pending', 'Pending Fees', '!'),
    item('/parent/fees/online', 'Online Payments', '⌁'),
    item('/parent/fees/discounts', 'Discounts', '✦'),
    item('/parent/fees/fines', 'Fines', '⚠'),
  ]),
  section('Transport', '🚌', [
    item('/parent/transport/bus', 'Bus Number', '▣'),
    item('/parent/transport/driver', 'Driver Details', '◫'),
    item('/parent/transport/route', 'Route', '⇄'),
    item('/parent/transport/pickup', 'Pickup Point', '⌖'),
    item('/parent/transport/drop', 'Drop Point', '◎'),
    item('/parent/transport/allocation', 'Student Allocation', '↔'),
  ]),
  section('Assistant', '✦', [item('/ai-assistant', 'AI Assistant', '✦')]),
  section('Account', '⚙️', [
    item('/settings/profile', 'Profile', '◫'),
    item('/settings/logout', 'Logout', '↦'),
  ]),
]

export function navForRole(role) {
  const normalized = String(role || 'admin').toLowerCase()
  if (normalized === ROLES.SUPER_ADMIN || normalized === 'superadmin') return SUPER_ADMIN_NAV
  if (normalized === ROLES.TEACHER) return TEACHER_NAV
  if (normalized === ROLES.PARENT) return PARENT_NAV
  return ADMIN_NAV
}

export function homePathForRole(role) {
  const normalized = String(role || 'admin').toLowerCase()
  if (normalized === ROLES.SUPER_ADMIN || normalized === 'superadmin') return '/super-admin'
  if (normalized === ROLES.TEACHER) return '/teacher'
  if (normalized === ROLES.PARENT) return '/parent'
  return '/dashboard'
}

export function allNavItems() {
  return [...SUPER_ADMIN_NAV, ...ADMIN_NAV, ...TEACHER_NAV, ...PARENT_NAV].flatMap((s) => s.items)
}

export function titleFromRoleNav(pathname) {
  const hit = allNavItems()
    .filter((item) => item.to !== '/dashboard' && item.to !== '/super-admin' && item.to !== '/teacher' && item.to !== '/parent')
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
  if (hit) return hit.label
  if (pathname === '/super-admin') return 'Super Admin Command Center'
  if (pathname === '/teacher') return 'Teacher Desk'
  if (pathname === '/parent') return 'Parent Home'
  if (pathname === '/dashboard' || pathname === '/') return 'Executive overview'
  return 'School ERP'
}

export function quickActionsForRole(role) {
  const normalized = String(role || 'admin').toLowerCase()
  if (normalized === ROLES.SUPER_ADMIN) {
    return [
      { to: '/super-admin/schools', label: 'Add school' },
      { to: '/super-admin/tickets', label: 'Tickets' },
    ]
  }
  if (normalized === ROLES.TEACHER) {
    return [
      { to: '/teacher/attendance', label: 'Mark attendance' },
      { to: '/teacher/exams/marks', label: 'Enter marks' },
    ]
  }
  if (normalized === ROLES.PARENT) {
    return [
      { to: '/parent/fees/pending', label: 'Pay fees' },
      { to: '/parent/leave-request', label: 'Leave request' },
    ]
  }
  return [
    { to: '/students/add', label: 'New student' },
    { to: '/fees/pending', label: 'Pending fees' },
  ]
}
