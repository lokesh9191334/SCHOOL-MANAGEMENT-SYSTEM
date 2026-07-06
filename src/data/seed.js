/** Demo records for first-run UX — stored to localStorage on first view */
export const SEED_STUDENTS = [
  {
    id: 'STU-1001',
    title: 'Aanya Sharma',
    subtitle: 'Class 9-B',
    primary: 'Neha Sharma',
    status: 'Active',
    owner: 'parent@example.com',
    tone: 'success',
  },
  {
    id: 'STU-1002',
    title: 'Kabir Khan',
    subtitle: 'Class 10-A',
    primary: 'Salma Khan',
    status: 'Active',
    owner: 'khan.family@example.com',
    tone: 'success',
  },
  {
    id: 'STU-1003',
    title: 'Diya Patel',
    subtitle: 'Class 7-C',
    primary: 'Ravi Patel',
    status: 'Active',
    owner: 'ravi.patel@example.com',
    tone: 'success',
  },
]

export const SEED_TEACHERS = [
  {
    id: 'TCH-501',
    title: 'Dr. Meera Iyer',
    subtitle: 'Mathematics',
    primary: 'm.iyer@school.edu',
    status: 'Active',
    owner: '+91 90000 10001',
    tone: 'success',
  },
  {
    id: 'TCH-502',
    title: 'James Okonkwo',
    subtitle: 'Physics',
    primary: 'j.okonkwo@school.edu',
    status: 'Active',
    owner: '+91 90000 10002',
    tone: 'success',
  },
  {
    id: 'TCH-503',
    title: 'Sara Lindqvist',
    subtitle: 'English',
    primary: 's.lindqvist@school.edu',
    status: 'On leave',
    owner: '+91 90000 10003',
    tone: 'warning',
  },
]

export const SEED_ATTENDANCE = [
  {
    id: 'ATT-1',
    title: 'Aanya Sharma',
    subtitle: '9-B',
    primary: 'Homeroom',
    status: 'Present',
    owner: '08:42',
    tone: 'success',
  },
  {
    id: 'ATT-2',
    title: 'Kabir Khan',
    subtitle: '10-A',
    primary: 'Homeroom',
    status: 'Present',
    owner: '08:44',
    tone: 'success',
  },
  {
    id: 'ATT-3',
    title: 'Diya Patel',
    subtitle: '7-C',
    primary: 'Homeroom',
    status: 'Late',
    owner: '09:05',
    tone: 'warning',
  },
  {
    id: 'ATT-4',
    title: 'Leo Fernandes',
    subtitle: '8-A',
    primary: 'Homeroom',
    status: 'Absent',
    owner: '—',
    tone: 'warning',
  },
]

export const SEED_FEE_PAYMENTS = [
  { id: 'PAY-1', student: 'Aanya Sharma', term: 'Q1 2026', amount: 18500, status: 'Paid', date: '2026-04-02' },
  { id: 'PAY-2', student: 'Kabir Khan', term: 'Q1 2026', amount: 18500, status: 'Paid', date: '2026-04-05' },
  { id: 'PAY-3', student: 'Diya Patel', term: 'Q1 2026', amount: 18500, status: 'Partial', date: '2026-04-28' },
]
