export const STORAGE_KEYS = {
  users: 'sms_users',
  students: 'sms_students',
  admissions: 'sms_admissions',
  teachers: 'sms_teachers',
  teacherAttendance: 'sms_teacher_attendance',
  classes: 'sms_classes',
  sections: 'sms_sections',
  subjects: 'sms_subjects',
  subjectAssignments: 'sms_subject_assignments',
  classTeachers: 'sms_class_teachers',
  attendance: 'sms_attendance_day',
  exams: 'sms_exams',
  examSchedules: 'sms_exam_schedules',
  examMarks: 'sms_exam_marks',
  feeStructures: 'sms_fee_structures',
  fees: 'sms_fee_payments',
  scholarships: 'sms_scholarships',
  expenses: 'sms_expenses',
  transportRoutes: 'sms_transport_routes',
  drivers: 'sms_drivers',
  vehicles: 'sms_vehicles',
  pickupPoints: 'sms_pickup_points',
  transportFees: 'sms_transport_fees',
  books: 'sms_books',
  bookIssues: 'sms_book_issues',
  bookReturns: 'sms_book_returns',
  libraryFines: 'sms_library_fines',
  bookCategories: 'sms_book_categories',
  notices: 'sms_notices',
  events: 'sms_events',
  holidays: 'sms_holidays',
  parentNotifications: 'sms_parent_notifications',
  chatMessages: 'sms_chat_messages',
  leaveRequests: 'sms_leave_requests',
  studentDocuments: 'sms_student_documents',
  transferCertificates: 'sms_transfer_certificates',
  salaryRecords: 'sms_salary_records',
  teacherTimetables: 'sms_teacher_timetables',
}

export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent',
}

export const ADMISSION_NATIONALITIES = ['Indian', 'Other']

export const ADMISSION_RELIGIONS = [
  'Islam',
  'Christianity',
  'Hindu',
  'Sikhism',
  'Buddhism',
  'Other',
]

export const ADMISSION_CASTES = ['General', 'ST', 'SC', 'OBC', 'EWS']

export const ADMISSION_CLASS_OPTIONS = [
  'Nursery',
  '1st Class',
  '2nd Class',
  '3rd Class',
  '4th Class',
  '5th Class',
  '6th Class',
  '7th Class',
  '8th Class',
  '9th Class',
  '10th Class',
  '11th Class',
  '12th Class',
]

const workspace = (to, label, section, icon, description, actions = []) => ({
  to,
  label,
  section,
  icon,
  description,
  actions,
  metrics: [
    { label: 'Records', value: '128', note: `${label} data ready for operations` },
    { label: 'Tasks', value: '06', note: `Priority actions inside ${label}` },
    { label: 'Status', value: 'Live', note: `${section} workspace synced` },
  ],
  highlights: [
    { title: `${label} dashboard`, detail: `Monitor, review and manage ${label.toLowerCase()} from one premium workspace.` },
    { title: 'Role-ready operations', detail: 'Designed for school admins, coordinators and desk teams.' },
    { title: 'Premium workflow blocks', detail: 'Cards, summaries and actions keep the page usable from day one.' },
  ],
  checklist: [
    `Review ${label.toLowerCase()} records`,
    'Validate pending actions and approvals',
    'Share updates with relevant staff or parents',
  ],
})

export const ERP_NAV_SECTIONS = [
  {
    title: 'Dashboard',
    icon: '◈',
    items: [{ to: '/dashboard', label: 'Executive Dashboard', icon: '◆', end: true }],
  },
  {
    title: 'Student Management',
    icon: '🎓',
    items: [
      { to: '/students/add', label: 'New Admission', icon: '＋' },
      { to: '/students/list', label: 'Student List', icon: '▤' },
      { to: '/students/id-card', label: 'Student ID Card', icon: '▣' },
      { to: '/students/attendance', label: 'Student Attendance', icon: '☑' },
      { to: '/students/performance', label: 'Student Performance', icon: '◔' },
      { to: '/students/parent-details', label: 'Parent Details', icon: '☏' },
      { to: '/students/data-files', label: 'Student Documents Upload', icon: '⤴' },
      { to: '/students/transfer-certificate', label: 'Transfer Certificate', icon: '⇄' },
    ],
  },
  {
    title: 'Teacher Management',
    icon: '👨‍🏫',
    items: [
      { to: '/teachers/add', label: 'Add Teacher', icon: '＋' },
      { to: '/teachers/list', label: 'Teacher List', icon: '▥' },
      { to: '/teachers/profile', label: 'Teacher Profile', icon: '◫' },
      { to: '/teachers/attendance', label: 'Teacher Attendance', icon: '☑' },
      { to: '/teachers/subjects', label: 'Assigned Subjects', icon: '◉' },
      { to: '/teachers/salary', label: 'Salary Details', icon: '₹' },
      { to: '/teachers/timetable', label: 'Teacher Timetable', icon: '▦' },
    ],
  },
  {
    title: 'Class & Subject Management',
    icon: '📚',
    items: [
      { to: '/academics/classes/add', label: 'Add Class', icon: '＋' },
      { to: '/academics/sections/add', label: 'Add Section', icon: '≡' },
      { to: '/academics/subjects/add', label: 'Add Subject', icon: '✦' },
      { to: '/academics/subject-assignment', label: 'Subject Assignment', icon: '↔' },
      { to: '/academics/class-teacher-assignment', label: 'Class Teacher Assignment', icon: '⌘' },
      { to: '/academics/timetable', label: 'Timetable Management', icon: '▦' },
    ],
  },
  {
    title: 'Attendance Management',
    icon: '📝',
    items: [
      { to: '/attendance/students', label: 'Student Attendance', icon: '☑' },
      { to: '/attendance/teachers', label: 'Teacher Attendance', icon: '☑' },
      { to: '/attendance/daily', label: 'Daily Attendance', icon: '◷' },
      { to: '/attendance/monthly-report', label: 'Monthly Attendance Report', icon: '▧' },
      { to: '/attendance/status', label: 'Attendance Status', icon: '◎' },
      { to: '/attendance/leave-management', label: 'Leave Management', icon: '☘' },
    ],
  },
  {
    title: 'Examination Management',
    icon: '📊',
    items: [
      { to: '/examination/create', label: 'Create Exam', icon: '＋' },
      { to: '/examination/schedule', label: 'Exam Schedule', icon: '◫' },
      { to: '/examination/marks-entry', label: 'Marks Entry', icon: '✎' },
      { to: '/examination/results', label: 'Result Generation', icon: '▣' },
      { to: '/examination/report-cards', label: 'Report Cards', icon: '▤' },
      { to: '/examination/grading', label: 'Grade System', icon: '◇' },
      { to: '/examination/rank-list', label: 'Rank List', icon: '★' },
    ],
  },
  {
    title: 'Fees Management',
    icon: '💰',
    items: [
      { to: '/fees/structure', label: 'Fee Structure', icon: '◫' },
      { to: '/fees/payments', label: 'Fee Collection', icon: '₹' },
      { to: '/fees/pending', label: 'Pending Fees', icon: '!' },
      { to: '/fees/online-payments', label: 'Online Payments', icon: '⌁' },
      { to: '/fees/receipts', label: 'Fee Receipts', icon: '▤' },
      { to: '/fees/scholarships', label: 'Scholarship Management', icon: '✦' },
      { to: '/fees/expenses', label: 'Expense Tracking', icon: '◌' },
    ],
  },
  {
    title: 'Transport Management',
    icon: '🚌',
    items: [
      { to: '/transport/routes', label: 'Bus Routes', icon: '⇄' },
      { to: '/transport/drivers', label: 'Driver Details', icon: '◫' },
      { to: '/transport/vehicles', label: 'Vehicle Details', icon: '▣' },
      { to: '/transport/pickup-points', label: 'Pickup Points', icon: '⌖' },
      { to: '/transport/fees', label: 'Transport Fees', icon: '₹' },
    ],
  },
  {
    title: 'Library Management',
    icon: '📖',
    items: [
      { to: '/library/books/add', label: 'Add Books', icon: '＋' },
      { to: '/library/books/issue', label: 'Issue Books', icon: '↗' },
      { to: '/library/books/return', label: 'Return Books', icon: '↙' },
      { to: '/library/fines', label: 'Fine Management', icon: '!' },
      { to: '/library/categories', label: 'Book Categories', icon: '≣' },
    ],
  },
  {
    title: 'Notice & Announcement',
    icon: '📢',
    items: [
      { to: '/notices/school', label: 'School Notices', icon: '◉' },
      { to: '/notices/events', label: 'Event Announcements', icon: '✦' },
      { to: '/notices/holidays', label: 'Holiday Notices', icon: '☼' },
      { to: '/notices/parents', label: 'Parent Notifications', icon: '☏' },
    ],
  },
  {
    title: 'Communication Section',
    icon: '💬',
    items: [
      { to: '/communication/chat', label: 'Chat System', icon: '◌' },
      { to: '/communication/student-teacher', label: 'Student-Teacher Messaging', icon: '↔' },
      { to: '/communication/parent-notifications', label: 'Parent Notifications', icon: '☏' },
    ],
  },
  {
    title: 'Settings Section',
    icon: '⚙️',
    items: [
      { to: '/settings/profile', label: 'Profile Settings', icon: '◫' },
      { to: '/settings/security', label: 'Security Settings', icon: '⌘' },
      { to: '/settings/password', label: 'Change Password', icon: '✱' },
      { to: '/settings/theme', label: 'Dark Mode Toggle', icon: '◐' },
      { to: '/settings/language', label: 'Language Settings', icon: '⌂' },
      { to: '/settings/logout', label: 'Logout', icon: '↦' },
    ],
  },
]

export const MAIN_NAV = ERP_NAV_SECTIONS.flatMap((section) => section.items)

export const FEATURE_WORKSPACES = [
  workspace('/students/id-card', 'Student ID Card', 'Student Management', '▣', 'Generate, preview and manage school ID cards with premium profile presentation.', [
    { label: 'Print preview', to: '/students/id-card' },
    { label: 'Open registry', to: '/students/list' },
  ]),
  workspace('/students/admission-form', 'Admission Form', 'Student Management', '✎', 'Handle detailed admission workflows, guardian intake and verification steps.', [
    { label: 'New admission', to: '/students/add' },
    { label: 'Admissions pipeline', to: '/dashboard' },
  ]),
  workspace('/students/attendance', 'Student Attendance', 'Student Management', '☑', 'Review student attendance with operational summaries and quick admin actions.', [
    { label: 'Daily attendance', to: '/attendance/daily' },
    { label: 'Monthly report', to: '/attendance/monthly-report' },
  ]),
  workspace('/students/performance', 'Student Performance', 'Student Management', '◔', 'Track academic outcomes, progress and classroom performance signals.', [
    { label: 'Results', to: '/examination/results' },
    { label: 'Report cards', to: '/examination/report-cards' },
  ]),
  workspace('/students/parent-details', 'Parent Details', 'Student Management', '☏', 'Manage guardian identities, contact details and parent communication readiness.', [
    { label: 'Open parent details', to: '/students/parent-details' },
    { label: 'Parent notices', to: '/communication/parent-notifications' },
  ]),
  workspace('/students/transfer-certificate', 'Transfer Certificate', 'Student Management', '⇄', 'Prepare and issue transfer certificates with document control.', [
    { label: 'Documents upload', to: '/students/data-files' },
    { label: 'Student list', to: '/students/list' },
  ]),
  workspace('/teachers/attendance', 'Teacher Attendance', 'Teacher Management', '☑', 'Track staff attendance, duty coverage and substitute readiness.', [
    { label: 'Daily attendance', to: '/attendance/teachers' },
    { label: 'Teacher list', to: '/teachers/list' },
  ]),
  workspace('/teachers/subjects', 'Assigned Subjects', 'Teacher Management', '◉', 'Manage subject ownership, teaching loads and faculty alignment.', [
    { label: 'Subject assignment', to: '/academics/subject-assignment' },
    { label: 'Teacher list', to: '/teachers/list' },
  ]),
  workspace('/teachers/salary', 'Salary Details', 'Teacher Management', '₹', 'Review salary summaries, payroll-linked admin notes and compensation records.', [
    { label: 'Teacher profile', to: '/teachers/profile' },
    { label: 'Expense tracking', to: '/fees/expenses' },
  ]),
  workspace('/teachers/timetable', 'Teacher Timetable', 'Teacher Management', '▦', 'Coordinate teacher schedules, periods and academic coverage.', [
    { label: 'Timetable management', to: '/academics/timetable' },
    { label: 'Assigned subjects', to: '/teachers/subjects' },
  ]),
  workspace('/academics/classes/add', 'Add Class', 'Class & Subject Management', '＋', 'Create new classes, course structures and operational cohorts.', [
    { label: 'Add section', to: '/academics/sections/add' },
    { label: 'Timetable', to: '/academics/timetable' },
  ]),
  workspace('/academics/sections/add', 'Add Section', 'Class & Subject Management', '≡', 'Organize sections and student distribution for each class level.', [
    { label: 'Add class', to: '/academics/classes/add' },
    { label: 'Class teacher', to: '/academics/class-teacher-assignment' },
  ]),
  workspace('/academics/subjects/add', 'Add Subject', 'Class & Subject Management', '✦', 'Create academic subjects and maintain curriculum structure.', [
    { label: 'Subject assignment', to: '/academics/subject-assignment' },
    { label: 'Teacher assignment', to: '/teachers/subjects' },
  ]),
  workspace('/academics/subject-assignment', 'Subject Assignment', 'Class & Subject Management', '↔', 'Assign subjects across classes, sections and faculty.', [
    { label: 'Add subject', to: '/academics/subjects/add' },
    { label: 'Teacher timetable', to: '/teachers/timetable' },
  ]),
  workspace('/academics/class-teacher-assignment', 'Class Teacher Assignment', 'Class & Subject Management', '⌘', 'Map homeroom teachers and class owners with clarity.', [
    { label: 'Teacher list', to: '/teachers/list' },
    { label: 'Add section', to: '/academics/sections/add' },
  ]),
  workspace('/attendance/teachers', 'Teacher Attendance', 'Attendance Management', '☑', 'Monitor staff attendance, shift completion and absence flags.', [
    { label: 'Student attendance', to: '/attendance/students' },
    { label: 'Monthly report', to: '/attendance/monthly-report' },
  ]),
  workspace('/attendance/daily', 'Daily Attendance', 'Attendance Management', '◷', 'Open the daily attendance desk for immediate review and action.', [
    { label: 'Attendance dashboard', to: '/attendance' },
    { label: 'Status board', to: '/attendance/status' },
  ]),
  workspace('/attendance/monthly-report', 'Monthly Attendance Report', 'Attendance Management', '▧', 'Analyze attendance performance across time, classes and staff.', [
    { label: 'Daily attendance', to: '/attendance/daily' },
    { label: 'Attendance report', to: '/attendance/report' },
  ]),
  workspace('/attendance/status', 'Attendance Status', 'Attendance Management', '◎', 'Track present, late and absent summaries at a glance.', [
    { label: 'Student attendance', to: '/attendance/students' },
    { label: 'Teacher attendance', to: '/attendance/teachers' },
  ]),
  workspace('/attendance/leave-management', 'Leave Management', 'Attendance Management', '☘', 'Manage leave requests, approvals and absence documentation.', [
    { label: 'Monthly report', to: '/attendance/monthly-report' },
    { label: 'Teacher attendance', to: '/attendance/teachers' },
  ]),
  workspace('/examination/create', 'Create Exam', 'Examination Management', '＋', 'Set up exam cycles, assessment windows and schedule planning.', [
    { label: 'Exam schedule', to: '/examination/schedule' },
    { label: 'Marks entry', to: '/examination/marks-entry' },
  ]),
  workspace('/examination/marks-entry', 'Marks Entry', 'Examination Management', '✎', 'Capture marks, academic scores and assessment outcomes efficiently.', [
    { label: 'Results', to: '/examination/results' },
    { label: 'Grade system', to: '/examination/grading' },
  ]),
  workspace('/examination/report-cards', 'Report Cards', 'Examination Management', '▤', 'Prepare polished report cards with grades and teacher comments.', [
    { label: 'Result generation', to: '/examination/results' },
    { label: 'Rank list', to: '/examination/rank-list' },
  ]),
  workspace('/examination/rank-list', 'Rank List', 'Examination Management', '★', 'Publish ranked academic performance with premium overview cards.', [
    { label: 'Results', to: '/examination/results' },
    { label: 'Report cards', to: '/examination/report-cards' },
  ]),
  workspace('/fees/structure', 'Fee Structure', 'Fees Management', '◫', 'Define academic fees, transport fees and category-based structures.', [
    { label: 'Fee collection', to: '/fees/payments' },
    { label: 'Scholarships', to: '/fees/scholarships' },
  ]),
  workspace('/fees/pending', 'Pending Fees', 'Fees Management', '!', 'Track unpaid invoices, dues and collection follow-up.', [
    { label: 'Fee collection', to: '/fees/payments' },
    { label: 'Fee reports', to: '/fees/reports' },
  ]),
  workspace('/fees/online-payments', 'Online Payments', 'Fees Management', '⌁', 'Monitor digital payments and online settlement activity.', [
    { label: 'Fee collection', to: '/fees/payments' },
    { label: 'Receipts', to: '/fees/receipts' },
  ]),
  workspace('/fees/receipts', 'Fee Receipts', 'Fees Management', '▤', 'Generate receipts and maintain premium transaction records.', [
    { label: 'Online payments', to: '/fees/online-payments' },
    { label: 'Fee reports', to: '/fees/reports' },
  ]),
  workspace('/fees/scholarships', 'Scholarship Management', 'Fees Management', '✦', 'Manage discounts, scholarships and fee support allocation.', [
    { label: 'Fee structure', to: '/fees/structure' },
    { label: 'Pending fees', to: '/fees/pending' },
  ]),
  workspace('/fees/expenses', 'Expense Tracking', 'Fees Management', '◌', 'Track school expenses, administrative outflow and finance control.', [
    { label: 'Fee reports', to: '/fees/reports' },
    { label: 'Salary details', to: '/teachers/salary' },
  ]),
  workspace('/transport/vehicles', 'Vehicle Details', 'Transport Management', '▣', 'Manage vehicles, capacity and maintenance data.', [
    { label: 'Bus routes', to: '/transport/routes' },
    { label: 'Driver details', to: '/transport/drivers' },
  ]),
  workspace('/transport/pickup-points', 'Pickup Points', 'Transport Management', '⌖', 'Configure student pickup points and route stop planning.', [
    { label: 'Bus routes', to: '/transport/routes' },
    { label: 'Transport fees', to: '/transport/fees' },
  ]),
  workspace('/transport/fees', 'Transport Fees', 'Transport Management', '₹', 'Control billing and route-linked transport fee management.', [
    { label: 'Fee collection', to: '/fees/payments' },
    { label: 'Pickup points', to: '/transport/pickup-points' },
  ]),
  workspace('/library/books/add', 'Add Books', 'Library Management', '＋', 'Create and catalog books with premium library indexing.', [
    { label: 'Book categories', to: '/library/categories' },
    { label: 'Issue books', to: '/library/books/issue' },
  ]),
  workspace('/library/books/issue', 'Issue Books', 'Library Management', '↗', 'Handle library issue operations and student lending flows.', [
    { label: 'Return books', to: '/library/books/return' },
    { label: 'Fine management', to: '/library/fines' },
  ]),
  workspace('/library/books/return', 'Return Books', 'Library Management', '↙', 'Track returns, due compliance and pending book recovery.', [
    { label: 'Issue books', to: '/library/books/issue' },
    { label: 'Fine management', to: '/library/fines' },
  ]),
  workspace('/library/fines', 'Fine Management', 'Library Management', '!', 'Manage late return penalties and library fee exceptions.', [
    { label: 'Return books', to: '/library/books/return' },
    { label: 'Receipts', to: '/fees/receipts' },
  ]),
  workspace('/library/categories', 'Book Categories', 'Library Management', '≣', 'Organize titles into academic, fiction and reference categories.', [
    { label: 'Add books', to: '/library/books/add' },
    { label: 'Issue books', to: '/library/books/issue' },
  ]),
  workspace('/notices/school', 'School Notices', 'Notice & Announcement', '◉', 'Publish school-wide administrative and campus notices.', [
    { label: 'Event notices', to: '/notices/events' },
    { label: 'Parent notifications', to: '/notices/parents' },
  ]),
  workspace('/notices/events', 'Event Announcements', 'Notice & Announcement', '✦', 'Share event schedules, ceremonies and campus experiences.', [
    { label: 'Holiday notices', to: '/notices/holidays' },
    { label: 'School notices', to: '/notices/school' },
  ]),
  workspace('/notices/holidays', 'Holiday Notices', 'Notice & Announcement', '☼', 'Communicate academic holidays and calendar changes.', [
    { label: 'School notices', to: '/notices/school' },
    { label: 'Parent notifications', to: '/notices/parents' },
  ]),
  workspace('/notices/parents', 'Parent Notifications', 'Notice & Announcement', '☏', 'Send premium-grade updates directly for parent awareness.', [
    { label: 'Communication', to: '/communication/parent-notifications' },
    { label: 'School notices', to: '/notices/school' },
  ]),
  workspace('/communication/chat', 'Chat System', 'Communication Section', '◌', 'Enable quick communication between school teams in one shared workspace.', [
    { label: 'Student-teacher messaging', to: '/communication/student-teacher' },
    { label: 'Parent notifications', to: '/communication/parent-notifications' },
  ]),
  workspace('/communication/student-teacher', 'Student-Teacher Messaging', 'Communication Section', '↔', 'Manage structured conversation flows between students and faculty.', [
    { label: 'Chat system', to: '/communication/chat' },
    { label: 'Teacher profile', to: '/teachers/profile' },
  ]),
  workspace('/communication/parent-notifications', 'Parent Notifications', 'Communication Section', '☏', 'Reach parents with timely operational, academic and fee updates.', [
    { label: 'School notices', to: '/notices/parents' },
    { label: 'Chat system', to: '/communication/chat' },
  ]),
  workspace('/settings/security', 'Security Settings', 'Settings Section', '⌘', 'Manage account security, permissions and access posture.', [
    { label: 'Profile settings', to: '/settings/profile' },
    { label: 'Change password', to: '/settings/password' },
  ]),
  workspace('/settings/password', 'Change Password', 'Settings Section', '✱', 'Update credentials and protect admin access.', [
    { label: 'Security settings', to: '/settings/security' },
    { label: 'Logout', to: '/settings/logout' },
  ]),
  workspace('/settings/theme', 'Dark Mode Toggle', 'Settings Section', '◐', 'Control appearance modes and premium visual preferences.', [
    { label: 'Language settings', to: '/settings/language' },
    { label: 'Profile settings', to: '/settings/profile' },
  ]),
  workspace('/settings/language', 'Language Settings', 'Settings Section', '⌂', 'Switch interface language and localization preferences.', [
    { label: 'Dark mode', to: '/settings/theme' },
    { label: 'Profile settings', to: '/settings/profile' },
  ]),
]

export function titleForPath(pathname) {
  if (pathname === '/' || pathname === '/dashboard') return 'Executive overview'

  const navItem = ERP_NAV_SECTIONS.flatMap((section) => section.items)
    .filter((item) => item.to !== '/dashboard')
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))

  if (navItem) return navItem.label

  return 'School ERP'
}
