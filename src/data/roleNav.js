import { ROLES } from '../utils/constants'

// icon values are NavGlyph keys (see src/layouts/NavGlyph.jsx)
const section = (title, icon, items) => ({ title, icon, items })
const item = (to, label, icon, end = false) => ({ to, label, icon, end })

/** Super Admin — platform only (no school ERP modules) */
export const SUPER_ADMIN_NAV = [
  section('Platform', 'gauge', [
    item('/super-admin', 'Command Center', 'diamond', true),
  ]),
  section('Approvals', 'school', [
    item('/super-admin/school-requests', 'School Approval Requests', 'check'),
  ]),
  section('Academics', 'bookOpen', [
    item('/super-admin/academics', 'Timetable & Datesheets', 'calendar'),
    item('/notices/events', 'Events & Programs', 'star'),
  ]),
  section('Security', 'shield', [
    item('/security/login-tracks', 'Login Tracks', 'pin'),
  ]),
  section('Transport', 'bus', [
    item('/transport/live', 'Live Bus Tracking', 'locate'),
  ]),
  section('Finance', 'rupee', [item('/fees/online-payments', 'Payment Verification', 'check')]),
  section('Assistant', 'sparkle', [item('/ai-assistant', 'AI Assistant', 'sparkle')]),
  section('Settings', 'gear', [
    item('/settings', 'Settings', 'gear', true),
    item('/settings/profile', 'Profile', 'user'),
    item('/settings/logout', 'Logout', 'logout'),
  ]),
]

/** School Admin — full campus ERP */
export const ADMIN_NAV = [
  section('Dashboard', 'gauge', [item('/dashboard', 'Executive Dashboard', 'diamond', true)]),
  section('Students', 'graduation', [
    item('/students/add', 'New Admission', 'plus'),
    item('/students/list', 'Student List', 'list'),
    item('/students/parent-details', 'Parents', 'phone'),
    item('/students/data-files', 'Documents', 'upload'),
    item('/students/performance', 'Performance Report', 'chart'),
    item('/students/id-card', 'ID Cards', 'idcard'),
  ]),
  section('Teachers', 'teacher', [
    item('/teachers/add', 'Add Teacher', 'plus'),
    item('/teachers/list', 'Teacher List', 'rows'),
    item('/teachers/profile', 'Teacher Profile', 'user'),
    item('/teachers/qualifications', 'Teacher Qualification', 'award'),
    item('/teachers/subjects', 'Subjects', 'bookOpen'),
    item('/teachers/attendance', 'Teacher Attendance', 'checkSquare'),
    item('/teachers/salary', 'Salary Details', 'rupee'),
    item('/teachers/performance', 'Teacher Performance', 'star'),
    item('/teachers/documents', 'Teacher Documents', 'fileText'),
  ]),
  section('Academics', 'bookOpen', [
    item('/academics/subjects/add', 'Subjects', 'book'),
    item('/academics/subject-assignment', 'Subject Assignment', 'swap'),
    item('/academics/timetable', 'Class Schedule', 'table'),
    item('/academics/datesheet', 'Exam Datesheet', 'calendar'),
    item('/academics/documents', 'Published Documents', 'fileText'),
    item('/examination/create', 'Exams', 'plus'),
    item('/examination/results', 'Results', 'award'),
    item('/examination/report-cards', 'Report Cards', 'idcard'),
    item('/examination/rank-list', 'Rank List', 'star'),
  ]),
  section('Fees', 'rupee', [
    item('/fees/structure', 'Fee Structure', 'layers'),
    item('/fees/installments', 'Installments', 'rows'),
    item('/fees/receipts', 'Receipts', 'receipt'),
    item('/fees/pending', 'Pending Fees', 'clock'),
    item('/fees/online-payments', 'Online Payments', 'bolt'),
    item('/fees/discounts', 'Discounts', 'percent'),
    item('/fees/fines', 'Fines', 'alert'),
  ]),
  section('Transport', 'bus', [
    item('/transport/live', 'Live Bus Tracking', 'locate'),
    item('/transport/vehicles', 'Bus Number', 'bus'),
    item('/transport/drivers', 'Driver Details', 'user'),
    item('/transport/routes', 'Routes', 'route'),
    item('/transport/pickup-points', 'Pickup Points', 'pin'),
    item('/transport/drop-points', 'Drop Points', 'map'),
    item('/transport/student-allocation', 'Student Allocation', 'swap'),
  ]),
  section('Attendance & Library', 'clipboardCheck', [
    item('/attendance/students', 'Student Attendance', 'checkSquare'),
    item('/attendance/staff-face', 'Staff Attendance (Face)', 'faceScan'),
    item('/attendance/leave-management', 'Leave Approvals', 'calendar'),
    item('/attendance/student-leave', 'Student Leave', 'message'),
    item('/attendance/monthly-report', 'Attendance Report', 'calendar'),
    item('/library/books/add', 'Library', 'book'),
  ]),
  section('Notices & Approvals', 'megaphone', [
    item('/notices/events', 'Events & Programs', 'star'),
    item('/notices/school', 'School Notices', 'bell'),
    item('/notices/holidays', 'Holidays', 'sun'),
    item('/notices/exams', 'Exam Notices', 'fileText'),
    item('/approvals', 'Approvals', 'check'),
    item('/reports/campus', 'Reports', 'chart'),
  ]),
  section('Assistant', 'sparkle', [item('/ai-assistant', 'AI Assistant', 'sparkle')]),
  section('Security', 'shield', [
    item('/security/login-tracks', 'Login Tracks', 'pin'),
  ]),
  section('Settings', 'gear', [
    item('/settings', 'Settings', 'gear', true),
    item('/settings/profile', 'Profile', 'user'),
    item('/settings/logout', 'Logout', 'logout'),
  ]),
]

/** Teacher — classroom operations */
export const TEACHER_NAV = [
  section('Home', 'gauge', [
    item('/teacher', 'Teacher Desk', 'diamond', true),
    item('/teacher/events', 'School Events', 'star'),
  ]),
  section('My Desk', 'faceScan', [
    item('/attendance/staff-face', 'Face Attendance', 'faceScan'),
    item('/teacher/leave', 'My Leave', 'calendar'),
    item('/teacher/student-leave', 'Student Leave', 'message'),
  ]),
  section('Classroom', 'graduation', [
    item('/teacher/attendance', 'Student Attendance', 'checkSquare'),
    item('/teacher/homework', 'Homework', 'pencil'),
    item('/teacher/homework/upload', 'Upload Homework', 'upload'),
    item('/teacher/assignments', 'Assignments', 'list'),
    item('/teacher/timetable', 'Class Schedule', 'table'),
    item('/teacher/remarks', 'Student Remarks', 'message'),
    item('/teacher/parent-communication', 'Parent Communication', 'phone'),
  ]),
  section('Student Records', 'folder', [
    item('/teacher/students/personal', 'Personal Details', 'user'),
    item('/teacher/students/family', 'Family Details', 'home'),
    item('/teacher/students/medical', 'Medical History', 'heart'),
    item('/teacher/students/documents', 'Documents', 'fileText'),
  ]),
  section('Fees & Certificates', 'rupee', [
    item('/teacher/fees', 'Fees Management', 'rupee'),
    item('/teacher/results', 'Results', 'chart'),
    item('/teacher/certificates', 'Certificates', 'award'),
  ]),
  section('Examinations', 'chart', [
    item('/teacher/exams/create', 'Create Exams', 'plus'),
    item('/teacher/exams/marks', 'Marks Entry + Auto Calc', 'pencil'),
    item('/teacher/exams/grades', 'Grade Calculation', 'percent'),
    item('/teacher/exams/ranking', 'Ranking', 'star'),
    item('/teacher/exams/results', 'Result Generation', 'fileText'),
    item('/teacher/exams/report-cards', 'Premium Report Cards', 'idcard'),
  ]),
  section('Assistant', 'sparkle', [item('/ai-assistant', 'AI Assistant', 'sparkle')]),
  section('Settings', 'gear', [
    item('/settings', 'Settings', 'gear', true),
    item('/settings/profile', 'Profile', 'user'),
    item('/settings/logout', 'Logout', 'logout'),
  ]),
]

/** Parent — child portal */
export const PARENT_NAV = [
  section('Home', 'gauge', [item('/parent', 'Parent Home', 'diamond', true)]),
  section('My Child', 'graduation', [
    item('/parent/profile', 'Parent Profile', 'user'),
    item('/parent/academics', 'Timetable & Datesheet', 'calendar'),
    item('/parent/attendance', 'Attendance', 'checkSquare'),
    item('/parent/homework', 'Homework', 'pencil'),
    item('/parent/assignments', 'Assignments', 'list'),
    item('/parent/results', 'Results', 'chart'),
    item('/parent/notices', 'Notices', 'bell'),
    item('/parent/events', 'Events', 'calendar'),
    item('/parent/leave-request', 'Leave Request', 'message'),
  ]),
  section('Fees', 'rupee', [
    item('/parent/fees/installments', 'Installments', 'rows'),
    item('/parent/fees/receipts', 'Receipts', 'receipt'),
    item('/parent/fees/pending', 'Pending Fees', 'clock'),
    item('/parent/fees/online', 'Online Payments', 'bolt'),
    item('/parent/fees/discounts', 'Discounts', 'percent'),
    item('/parent/fees/fines', 'Fines', 'alert'),
  ]),
  section('Transport', 'bus', [
    item('/parent/transport/live', 'Live Bus Map', 'locate'),
    item('/parent/transport/bus', 'Bus Number', 'bus'),
    item('/parent/transport/driver', 'Driver Details', 'user'),
    item('/parent/transport/route', 'Route', 'route'),
    item('/parent/transport/pickup', 'Pickup Point', 'pin'),
    item('/parent/transport/drop', 'Drop Point', 'map'),
    item('/parent/transport/allocation', 'Student Allocation', 'swap'),
  ]),
  section('Assistant', 'sparkle', [item('/ai-assistant', 'AI Assistant', 'sparkle')]),
  section('Settings', 'gear', [
    item('/settings', 'Settings', 'gear', true),
    item('/settings/profile', 'Profile', 'user'),
    item('/settings/logout', 'Logout', 'logout'),
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
  if (normalized === ROLES.DRIVER) return '/driver'
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
      { to: '/super-admin/school-requests', label: 'Approval requests' },
      { to: '/security/login-tracks', label: 'Login tracks' },
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
