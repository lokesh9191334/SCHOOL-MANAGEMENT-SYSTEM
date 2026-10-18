/* AI assistant helpers: turn live school records into a compact role-aware
   snapshot, format it as model context, and answer from the same snapshot
   when no AI provider is configured. Pure functions — file I/O stays in
   server.js so Netlify Blob persistence keeps working. */

const STAFF_ROLES = new Set(['admin', 'super_admin', 'teacher'])
const PRESENCE_STATUSES = new Set(['Present', 'Late', 'Absent'])

export function rupees(value, currency = 'INR') {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${currency === 'USD' ? '$' : '₹'}${Math.round(n).toLocaleString('en-IN')}`
}

function asArray(list) {
  return Array.isArray(list) ? list : []
}

function dayOf(row) {
  return String(row?.date || '').slice(0, 10)
}

export function summarizeAttendance(rows) {
  const list = asArray(rows).filter((row) => dayOf(row))
  const days = [...new Set(list.map(dayOf))].sort()
  const latestDay = days[days.length - 1] || null
  const latest = latestDay ? list.filter((row) => dayOf(row) === latestDay) : []
  const present = latest.filter((row) => row.status === 'Present').length
  const late = latest.filter((row) => row.status === 'Late').length
  const absent = latest.filter((row) => row.status === 'Absent').length
  return {
    latestDay,
    marked: latest.length,
    present,
    late,
    absent,
    rate: latest.length ? Math.round((present / latest.length) * 100) : null,
    totalDays: days.length,
  }
}

function studentKeys(student) {
  return [student?.id, student?.applicationId].filter((v) => v !== undefined && v !== null).map(String)
}

function feeTotalsFor(student, payments) {
  const keys = studentKeys(student)
  const history = asArray(payments).filter((payment) => keys.includes(String(payment.studentId)))
  const paid = history
    .filter((payment) => payment.status === 'Verified')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const pending = history
    .filter((payment) => payment.status === 'Verification pending')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const rawTotal = student?.totalFee
  const totalFee = rawTotal === null || rawTotal === undefined || rawTotal === '' || !Number.isFinite(Number(rawTotal))
    ? null
    : Number(rawTotal)
  const lastPayment = history
    .filter((payment) => payment.status === 'Verified' && payment.createdAt)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null
  return {
    totalFee,
    paid,
    pending,
    balance: totalFee === null ? null : Math.max(0, totalFee - paid),
    historyCount: history.length,
    lastPayment: lastPayment
      ? { amount: Number(lastPayment.amount || 0), createdAt: String(lastPayment.createdAt).slice(0, 10) }
      : null,
  }
}

export function buildSnapshot(stores) {
  const role = String(stores.role || 'admin').toLowerCase()
  const students = asArray(stores.students)
  const payments = asArray(stores.payments)

  const byClass = {}
  for (const student of students) {
    const name = String(student?.subtitle || 'Unassigned').replace(/^Class\s+/i, '') || 'Unassigned'
    byClass[name] = (byClass[name] || 0) + 1
  }
  const feeSummaries = students
    .map((student) => ({ student, fees: feeTotalsFor(student, payments) }))
    .filter((entry) => entry.fees.totalFee !== null)
  const collected = feeSummaries.reduce((sum, entry) => sum + entry.fees.paid, 0)
  const billed = feeSummaries.reduce((sum, entry) => sum + entry.fees.totalFee, 0)
  const outstanding = feeSummaries.reduce((sum, entry) => sum + (entry.fees.balance || 0), 0)
  const topBalances = feeSummaries
    .filter((entry) => (entry.fees.balance || 0) > 0)
    .sort((a, b) => (b.fees.balance || 0) - (a.fees.balance || 0))
    .slice(0, 5)
    .map((entry) => ({
      name: entry.student?.title || entry.student?.name || 'Student',
      className: String(entry.student?.subtitle || '').replace(/^Class\s+/i, '') || '—',
      balance: entry.fees.balance,
    }))
  const pendingVerification = payments.filter((payment) => payment.status === 'Verification pending')

  const users = asArray(stores.users)
  const staffUsers = users.filter((user) => STAFF_ROLES.has(String(user.role || '').toLowerCase()))
  const staffToday = asArray(stores.staffAttendanceToday)
  const checkedInToday = new Set(
    staffToday.filter((record) => record.type === 'in').map((record) => String(record.email || '').toLowerCase()),
  ).size

  const notices = asArray(stores.notices)
  const recentNotices = [...notices]
    .sort((a, b) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))
    .slice(0, 3)
    .map((notice) => String(notice.title || notice.headline || 'Notice').slice(0, 80))

  const snapshot = {
    role,
    nowIST: stores.nowIST || '',
    school: {
      students: { total: students.length, byClass },
      admissions: asArray(stores.admissions).length,
      attendance: summarizeAttendance(stores.attendanceRows),
      fees: {
        studentsWithFeePlan: feeSummaries.length,
        billed,
        collected,
        outstanding,
        pendingVerificationCount: pendingVerification.length,
        pendingVerificationAmount: pendingVerification.reduce((sum, p) => sum + Number(p.amount || 0), 0),
        topBalances,
      },
      staff: {
        staffAccounts: staffUsers.length,
        faceEnrolled: asArray(stores.faceProfiles).length,
        checkedInToday,
      },
      teachers: asArray(stores.teachers).length,
      notices: { total: notices.length, recent: recentNotices },
      exams: asArray(stores.exams).length,
      security: stores.security || null,
    },
    child: null,
  }

  if (role === 'super_admin') {
    const requests = asArray(stores.schoolRequests)
    const roleCounts = {}
    for (const user of users) {
      const r = String(user.role || 'unknown').toLowerCase()
      roleCounts[r] = (roleCounts[r] || 0) + 1
    }
    snapshot.platform = {
      accounts: users.length,
      roleCounts,
      schoolRequests: {
        pending: requests.filter((request) => String(request.status || '').toLowerCase() === 'pending').length,
        approved: requests.filter((request) => String(request.status || '').toLowerCase() === 'approved').length,
        total: requests.length,
      },
    }
  }

  if (role === 'parent' && stores.child) {
    snapshot.child = {
      name: stores.child.student?.title || stores.child.student?.name || '',
      className: String(stores.child.student?.subtitle || '').replace(/^Class\s+/i, '') || '',
      fees: feeTotalsFor(stores.child.student, stores.child.payments),
      attendance: summarizeAttendance(stores.child.attendanceRows),
      attendanceTotal: asArray(stores.child.attendanceRows).filter((row) => PRESENCE_STATUSES.has(row.status)).length,
      recentAttendance: [...asArray(stores.child.attendanceRows)]
        .filter((row) => dayOf(row))
        .sort((a, b) => dayOf(b).localeCompare(dayOf(a)))
        .slice(0, 5)
        .map((row) => ({ date: dayOf(row), status: String(row.status || '—') })),
    }
  }

  return snapshot
}

function attendanceLines(summary) {
  if (!summary.latestDay) {
    return ['- No attendance has been recorded yet.']
  }
  return [
    `- Latest recorded day: ${summary.latestDay} — ${summary.marked} marked · ${summary.present} present · ${summary.late} late · ${summary.absent} absent (${summary.rate === null ? '—' : `${summary.rate}%`})`,
    `- Recorded attendance days so far: ${summary.totalDays}`,
  ]
}

function feesLines(fees, currency = 'INR') {
  if (fees.studentsWithFeePlan === 0) {
    return ['- No fee plans have been set for students yet.']
  }
  const lines = [
    `- Fee plans set: ${fees.studentsWithFeePlan} students · Billed ${rupees(fees.billed, currency)} · Collected ${rupees(fees.collected, currency)} · Outstanding ${rupees(fees.outstanding, currency)}`,
  ]
  if (fees.pendingVerificationCount > 0) {
    lines.push(`- Payments awaiting verification: ${fees.pendingVerificationCount} (${rupees(fees.pendingVerificationAmount, currency)})`)
  }
  if (fees.topBalances.length) {
    lines.push(`- Highest balances: ${fees.topBalances.map((row) => `${row.name} (${row.className}) ${rupees(row.balance, currency)}`).join('; ')}`)
  }
  return lines
}

function securityLines(security) {
  if (!security) return ['- Security tracking data is unavailable.']
  return [
    `- Logins today: ${security.today} (${security.successToday} successful, ${security.failedToday} failed) · Unreviewed suspicious events: ${security.suspiciousUnreviewed}`,
  ]
}

function noticesLines(notices) {
  if (notices.total === 0) return ['- No school notices published yet.']
  const recent = notices.recent.length ? ` Recent: ${notices.recent.join('; ')}` : ''
  return [`- Notices published: ${notices.total}.${recent}`]
}

export function snapshotToContext(snapshot, currency = 'INR') {
  const school = snapshot.school
  const parts = [`LIVE SCHOOL DATA — as of ${snapshot.nowIST}. This is the ONLY source of truth for numbers. Never invent or estimate values; if a line says nothing is recorded yet, state that plainly.`]

  if (snapshot.role === 'parent') {
    if (!snapshot.child) {
      parts.push('PARENT LINK: No student is linked to this parent account yet.')
    } else {
      const child = snapshot.child
      parts.push(`PARENT LINK: The linked child is ${child.name || 'unnamed'}${child.className ? ` (Class ${child.className})` : ''}.`)
      parts.push('## Child fees')
      if (child.fees.totalFee === null) {
        parts.push('- No fee plan has been set for this child yet.')
      } else {
        parts.push(`- Total fee ${rupees(child.fees.totalFee, currency)} · Paid ${rupees(child.fees.paid, currency)} · Balance ${rupees(child.fees.balance, currency)} · Awaiting verification ${rupees(child.fees.pending, currency)}`)
        if (child.fees.lastPayment) {
          parts.push(`- Last verified payment: ${rupees(child.fees.lastPayment.amount, currency)} on ${child.fees.lastPayment.createdAt}`)
        }
      }
      parts.push('## Child attendance')
      parts.push(...attendanceLines(child.attendance))
      if (child.recentAttendance.length) {
        parts.push(`- Recent entries: ${child.recentAttendance.map((row) => `${row.date} ${row.status}`).join('; ')}`)
      }
    }
  } else if (snapshot.role === 'super_admin') {
    const platform = snapshot.platform
    parts.push('## Platform accounts')
    parts.push(`- Total accounts: ${platform.accounts} (${Object.entries(platform.roleCounts).map(([r, n]) => `${r}: ${n}`).join(', ')})`)
    parts.push('## School sign-up requests')
    parts.push(`- Pending: ${platform.schoolRequests.pending} · Approved: ${platform.schoolRequests.approved} · Total: ${platform.schoolRequests.total}`)
  } else {
    parts.push('## Students')
    parts.push(`- Total students: ${school.students.total}`)
    if (school.students.total > 0) {
      const classes = Object.entries(school.students.byClass).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}: ${count}`).join(', ')
      parts.push(`- By class: ${classes}`)
    }
    parts.push(`- Admission intake items: ${school.admissions}`)
    parts.push('## Student attendance')
    parts.push(...attendanceLines(school.attendance))
    parts.push('## Fees')
    parts.push(...feesLines(school.fees, currency))
    parts.push('## Staff')
    parts.push(`- Staff accounts: ${school.staff.staffAccounts} · Face enrolled: ${school.staff.faceEnrolled} · Checked in today: ${school.staff.checkedInToday}`)
    parts.push(`- Teacher records: ${school.teachers}`)
  }

  parts.push('## Notices & exams')
  parts.push(...noticesLines(school.notices))
  parts.push(`- Exams recorded: ${school.exams}`)
  parts.push('## Security')
  parts.push(...securityLines(school.security))
  return parts.join('\n')
}

const LANGUAGE_LABELS = {
  en: 'English',
  hi: 'Hindi in Devanagari script (हिंदी)',
  hinglish: 'Hinglish — Hindi written in Roman script mixed with English words, like Indian users speak',
}

export function systemInstructions({ role, language, context }) {
  const langLabel = LANGUAGE_LABELS[language] || LANGUAGE_LABELS.en
  return [
    `You are SchoolSMS Assistant helping a ${role} user of a school management system.`,
    'Answer using the LIVE SCHOOL DATA provided below. Every number you mention must come from that data — never invent, estimate, or round differently. When the data says something is not recorded yet, say so plainly instead of guessing.',
    'Be concise and practical. Format answers in markdown: short bold headings, bullet lists, and key numbers in bold. End with one or two concrete next steps that name real modules of this system (Students, Admissions, Attendance, Fees, Exams, Notices, Transport, Timetable, Login Tracks, My Face).',
    'Never claim to have created, changed, or deleted any record — you only advise. Financial and destructive actions always need the user\'s own confirmation in the module.',
    `Reply in ${langLabel}.`,
    '',
    context,
  ].join('\n')
}

function nextStepsFor(role, kind) {
  const steps = {
    admin: {
      fees: 'Next: open **Fees → Pending** to follow up, or **Fees → Online payments** to verify submitted payments.',
      attendance: 'Next: open **Attendance** to review exceptions or mark today\'s register.',
      students: 'Next: open **Students → List** for profiles, or **Admissions** to process intake.',
      staff: 'Next: open **My Face / Staff attendance** to review check-ins.',
      notices: 'Next: open **Notices** to publish or edit announcements.',
      exams: 'Next: open **Exams** to manage schedules and marks.',
      security: 'Next: open **Login Tracks** to review flagged events and devices.',
      default: 'Next: ask me about fees, attendance, students, staff, notices or exams.',
    },
    teacher: {
      fees: 'Next: fee follow-ups go through the admin office.',
      attendance: 'Next: open **Attendance** to mark or review today\'s register.',
      students: 'Next: open **Students → List** for student profiles.',
      exams: 'Next: open **Exams → Marks** to record marks.',
      default: 'Next: ask me about attendance, students, exams or notices.',
    },
    parent: {
      fees: 'Next: open **Pending fees** to pay online — the receipt is generated automatically after verification.',
      attendance: 'Next: open **Attendance** in the parent portal for the day-wise view.',
      notices: 'Next: open **Notices & events** for all school updates.',
      default: 'Next: ask me about fees, attendance, or school notices.',
    },
    super_admin: {
      default: 'Next: open **School requests** to approve pending sign-ups, or **Login Tracks** for security.',
    },
  }
  const table = steps[role] || steps.admin
  return table[kind] || table.default
}

function offlineSection(snapshot, kind, currency = 'INR') {
  const school = snapshot.school
  switch (kind) {
    case 'fees':
      return ['### Fees', ...feesLines(school.fees, currency)]
    case 'attendance':
      return ['### Attendance', ...attendanceLines(school.attendance)]
    case 'students':
      return [
        '### Students',
        `- Total students: ${school.students.total}`,
        ...(school.students.total > 0
          ? [`- By class: ${Object.entries(school.students.byClass).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name}: ${count}`).join(', ')}`]
          : []),
        `- Admission intake items: ${school.admissions}`,
      ]
    case 'staff':
      return [
        '### Staff',
        `- Staff accounts: ${school.staff.staffAccounts} · Face enrolled: ${school.staff.faceEnrolled} · Checked in today: ${school.staff.checkedInToday}`,
      ]
    case 'notices':
      return ['### Notices', ...noticesLines(school.notices)]
    case 'exams':
      return ['### Exams', `- Exams recorded: ${school.exams}`]
    case 'security':
      return ['### Security', ...securityLines(school.security)]
    default:
      return []
  }
}

function detectIntent(prompt) {
  const text = String(prompt || '').toLowerCase()
  const has = (...words) => words.some((word) => text.includes(word))
  if (has('fee', 'payment', 'bhugtan', 'fees', 'balance', 'due')) return 'fees'
  if (has('attendance', 'haziri', 'present', 'absent', 'late')) return 'attendance'
  if (has('student', 'admission', 'enroll', 'class list', 'student')) return 'students'
  if (has('staff', 'teacher', 'employee', 'check-in', 'checkin')) return 'staff'
  if (has('notice', 'event', 'holiday', 'announcement')) return 'notices'
  if (has('exam', 'marks', 'result', 'test')) return 'exams'
  if (has('security', 'login', 'otp', 'device', 'password', 'track')) return 'security'
  return 'summary'
}

const OFFLINE_TRANSLATIONS = {
  hi: [
    ['No student is linked to this parent account yet, so I cannot pull your child\'s live records.', 'इस पैरेंट अकाउंट से अभी तक कोई छात्र लिंक नहीं है, इसलिए मैं आपके बच्चे के लाइव रिकॉर्ड नहीं दिखा सकता।'],
    ['Ask the school admin to link your account with your child\'s admission ID. After that I can show fees, attendance and notices for your child.', 'स्कूल एडमिन से अपने अकाउंट को बच्चे की एडमिशन ID से लिंक करने के लिए कहें। उसके बाद मैं फीस, उपस्थिति और सूचनाएँ दिखा सकूँगा।'],
    ['- No fee plan has been set for this child yet — the school admin sets it under Students → Fee setup.', '- अभी तक इस बच्चे का फीस प्लान सेट नहीं हुआ — स्कूल एडमिन इसे Students → Fee setup में सेट करता है।'],
    ['- No attendance has been recorded yet.', '- अभी तक कोई उपस्थिति दर्ज नहीं हुई है।'],
    ['- No fee plans have been set for students yet.', '- अभी तक किसी छात्र का फीस प्लान सेट नहीं हुआ है।'],
    ['- Security tracking data is unavailable.', '- सुरक्षा ट्रैकिंग डेटा उपलब्ध नहीं है।'],
    ['- No school notices published yet.', '- अभी तक कोई स्कूल सूचना प्रकाशित नहीं हुई है।'],
    ['- No fee plan set yet.', '- अभी तक फीस प्लान सेट नहीं हुआ।'],
    ['### Today\'s snapshot', '### आज का स्नैपशॉट'],
    ['### Platform snapshot', '### प्लेटफ़ॉर्म स्नैपशॉट'],
    ['### School notices', '### स्कूल सूचनाएँ'],
    ['### Attendance for ', '### उपस्थिति — '],
    ['### Attendance', '### उपस्थिति'],
    ['### Students', '### छात्र'],
    ['### Exams', '### परीक्षाएँ'],
    ['### Security', '### सुरक्षा'],
    ['### Notices', '### सूचनाएँ'],
    ['### Snapshot for ', '### स्नैपशॉट — '],
    ['### Fees for ', '### फीस — '],
    ['### Fees', '### फीस'],
    ['### Staff', '### स्टाफ'],
    ['**School notices**', '**स्कूल सूचनाएँ**'],
    ['**Attendance**', '**उपस्थिति**'],
    ['**Security**', '**सुरक्षा**'],
    ['**Staff**', '**स्टाफ**'],
    ['**Fees**', '**फीस**'],
    [' (Class ', ' (कक्षा '],
    ['- Latest recorded day: ', '- नवीनतम दर्ज दिन: '],
    ['- Recorded attendance days so far: ', '- अब तक दर्ज उपस्थिति दिन: '],
    [' marked · ', ' दर्ज · '],
    [' present · ', ' उपस्थित · '],
    [' late · ', ' देर से · '],
    [' absent (', ' अनुपस्थित ('],
    ['- Recent entries: ', '- हाल की प्रविष्टियाँ: '],
    ['- Total fee ', '- कुल फीस '],
    ['- Total **', '- कुल **'],
    [' · Paid ', ' · जमा '],
    [' · Balance ', ' · बाकी '],
    ['- Awaiting verification: ', '- सत्यापन बाकी: '],
    ['- Last verified payment: ', '- अंतिम सत्यापित भुगतान: '],
    ['- Fee plans set: ', '- फीस प्लान सेट: '],
    [' students · Billed ', ' छात्र · कुल बिल '],
    [' · Collected ', ' · जमा '],
    [' · Outstanding ', ' · बाकी '],
    ['- Payments awaiting verification: ', '- सत्यापन बाकी भुगतान: '],
    ['- Highest balances: ', '- सबसे ज़्यादा बाकी: '],
    ['- Logins today: ', '- आज के लॉगिन: '],
    [' successful, ', ' सफल, '],
    [' failed) · Unreviewed suspicious events: ', ' विफल) · बिना समीक्षा संदिग्ध घटनाएँ: '],
    ['- Notices published: ', '- प्रकाशित सूचनाएँ: '],
    [' Recent: ', ' हाल की: '],
    ['- Total students: ', '- कुल छात्र: '],
    ['- By class: ', '- कक्षा अनुसार: '],
    ['- Admission intake items: ', '- एडमिशन इनटेक आइटम: '],
    ['- Staff accounts: ', '- स्टाफ अकाउंट: '],
    [' · Face enrolled: ', ' · फेस एनरोल्ड: '],
    [' · Checked in today: ', ' · आज चेक-इन: '],
    ['- Exams recorded: ', '- दर्ज परीक्षाएँ: '],
    ['- Total: ', '- कुल: '],
    [' · Admission intake: ', ' · एडमिशन इनटेक: '],
    ['- Accounts: ', '- अकाउंट: '],
    ['- School sign-up requests: ', '- स्कूल साइन-अप अनुरोध: '],
    [' pending** · ', ' लंबित** · '],
    [' approved', ' स्वीकृत'],
    ['Next: open **Fees → Pending** to follow up, or **Fees → Online payments** to verify submitted payments.', 'अगला कदम: फॉलो-अप के लिए **Fees → Pending** खोलें, या जमा हुए भुगतान सत्यापित करने के लिए **Fees → Online payments** खोलें।'],
    ['Next: open **Attendance** to review exceptions or mark today\'s register.', 'अगला कदम: अपवाद देखने या आज की रजिस्टर लगाने के लिए **Attendance** खोलें।'],
    ['Next: open **Students → List** for profiles, or **Admissions** to process intake.', 'अगला कदम: प्रोफ़ाइल के लिए **Students → List** खोलें, या एडमिशन प्रोसेस करने के लिए **Admissions** खोलें।'],
    ['Next: open **My Face / Staff attendance** to review check-ins.', 'अगला कदम: चेक-इन देखने के लिए **My Face / Staff attendance** खोलें।'],
    ['Next: open **Notices** to publish or edit announcements.', 'अगला कदम: घोषणाएँ प्रकाशित या संपादित करने के लिए **Notices** खोलें।'],
    ['Next: open **Exams** to manage schedules and marks.', 'अगला कदम: शेड्यूल और मार्क्स प्रबंधित करने के लिए **Exams** खोलें।'],
    ['Next: open **Login Tracks** to review flagged events and devices.', 'अगला कदम: फ़्लैग किए गए इवेंट और डिवाइस देखने के लिए **Login Tracks** खोलें।'],
    ['Next: ask me about fees, attendance, students, staff, notices or exams.', 'अगला कदम: मुझसे फीस, उपस्थिति, छात्रों, स्टाफ, सूचनाओं या परीक्षाओं के बारे में पूछें।'],
    ['Next: fee follow-ups go through the admin office.', 'अगला कदम: फीस फॉलो-अप एडमिन ऑफिस के माध्यम से होते हैं।'],
    ['Next: open **Attendance** to mark or review today\'s register.', 'अगला कदम: आज की रजिस्टर लगाने या देखने के लिए **Attendance** खोलें।'],
    ['Next: open **Students → List** for student profiles.', 'अगला कदम: छात्र प्रोफ़ाइल के लिए **Students → List** खोलें।'],
    ['Next: open **Exams → Marks** to record marks.', 'अगला कदम: मार्क्स दर्ज करने के लिए **Exams → Marks** खोलें।'],
    ['Next: ask me about attendance, students, exams or notices.', 'अगला कदम: मुझसे उपस्थिति, छात्रों, परीक्षाओं या सूचनाओं के बारे में पूछें।'],
    ['Next: open **Pending fees** to pay online — the receipt is generated automatically after verification.', 'अगला कदम: ऑनलाइन भुगतान के लिए **Pending fees** खोलें — सत्यापन के बाद रसीद अपने आप बन जाती है।'],
    ['Next: open **Attendance** in the parent portal for the day-wise view.', 'अगला कदम: दिन-वार जानकारी के लिए पैरेंट पोर्टल में **Attendance** खोलें।'],
    ['Next: open **Notices & events** for all school updates.', 'अगला कदम: सभी स्कूल अपडेट के लिए **Notices & events** खोलें।'],
    ['Next: ask me about fees, attendance, or school notices.', 'अगला कदम: मुझसे फीस, उपस्थिति या स्कूल सूचनाओं के बारे में पूछें।'],
    ['Next: open **School requests** to approve pending sign-ups, or **Login Tracks** for security.', 'अगला कदम: पेंडिंग साइन-अप स्वीकृत करने के लिए **School requests** खोलें, या सुरक्षा के लिए **Login Tracks** खोलें।'],
  ],
  hinglish: [
    ['No student is linked to this parent account yet, so I cannot pull your child\'s live records.', 'Is parent account se abhi tak koi student link nahi hai, isliye main aapke child ke live records nahi dikha sakta.'],
    ['Ask the school admin to link your account with your child\'s admission ID. After that I can show fees, attendance and notices for your child.', 'School admin se apna account child ke admission ID se link karne ko bolo. Uske baad main fees, attendance aur notices dikha sakunga.'],
    ['- No fee plan has been set for this child yet — the school admin sets it under Students → Fee setup.', '- Abhi tak is child ka fee plan set nahi hua — school admin ise Students → Fee setup me set karta hai.'],
    ['- No attendance has been recorded yet.', '- Abhi tak koi attendance record nahi hui hai.'],
    ['- No fee plans have been set for students yet.', '- Abhi tak kisi student ka fee plan set nahi hua hai.'],
    ['- Security tracking data is unavailable.', '- Security tracking data available nahi hai.'],
    ['- No school notices published yet.', '- Abhi tak koi school notice publish nahi hui hai.'],
    ['- No fee plan set yet.', '- Abhi tak fee plan set nahi hua.'],
    ['### Today\'s snapshot', '### Aaj ka snapshot'],
    ['### Fees for ', '### Fees — '],
    ['### Attendance for ', '### Attendance — '],
    ['### Snapshot for ', '### Snapshot — '],
    ['- Latest recorded day: ', '- Latest darj din: '],
    ['- Recorded attendance days so far: ', '- Ab tak darj attendance days: '],
    ['- Awaiting verification: ', '- Verification pending: '],
    ['- Payments awaiting verification: ', '- Verification pending payments: '],
    ['- Highest balances: ', '- Sabse zyada balance: '],
    ['- Logins today: ', '- Aaj ke logins: '],
    [' failed) · Unreviewed suspicious events: ', ' failed) · Bina review suspicious events: '],
    ['- By class: ', '- Class ke hisaab se: '],
    [' · Checked in today: ', ' · Aaj checked in: '],
    ['- Total fee ', '- Total fee '],
    ['Next: open **Fees → Pending** to follow up, or **Fees → Online payments** to verify submitted payments.', 'Next: follow-up ke liye **Fees → Pending** kholo, ya submitted payments verify karne ke liye **Fees → Online payments** kholo.'],
    ['Next: open **Attendance** to review exceptions or mark today\'s register.', 'Next: exceptions dekhne ya aaj ka register mark karne ke liye **Attendance** kholo.'],
    ['Next: open **Students → List** for profiles, or **Admissions** to process intake.', 'Next: profiles ke liye **Students → List** kholo, ya admission process karne ke liye **Admissions** kholo.'],
    ['Next: open **My Face / Staff attendance** to review check-ins.', 'Next: check-ins dekhne ke liye **My Face / Staff attendance** kholo.'],
    ['Next: open **Notices** to publish or edit announcements.', 'Next: announcements publish ya edit karne ke liye **Notices** kholo.'],
    ['Next: open **Exams** to manage schedules and marks.', 'Next: schedules aur marks manage karne ke liye **Exams** kholo.'],
    ['Next: open **Login Tracks** to review flagged events and devices.', 'Next: flagged events aur devices dekhne ke liye **Login Tracks** kholo.'],
    ['Next: ask me about fees, attendance, students, staff, notices or exams.', 'Next: mujhse fees, attendance, students, staff, notices ya exams ke baare me pucho.'],
    ['Next: fee follow-ups go through the admin office.', 'Next: fee follow-ups admin office ke through hote hain.'],
    ['Next: open **Attendance** to mark or review today\'s register.', 'Next: aaj ka register mark ya review karne ke liye **Attendance** kholo.'],
    ['Next: open **Students → List** for student profiles.', 'Next: student profiles ke liye **Students → List** kholo.'],
    ['Next: open **Exams → Marks** to record marks.', 'Next: marks record karne ke liye **Exams → Marks** kholo.'],
    ['Next: ask me about attendance, students, exams or notices.', 'Next: mujhse attendance, students, exams ya notices ke baare me pucho.'],
    ['Next: open **Pending fees** to pay online — the receipt is generated automatically after verification.', 'Next: online payment ke liye **Pending fees** kholo — verification ke baad receipt apne aap ban jaati hai.'],
    ['Next: open **Attendance** in the parent portal for the day-wise view.', 'Next: day-wise view ke liye parent portal me **Attendance** kholo.'],
    ['Next: open **Notices & events** for all school updates.', 'Next: saare school updates ke liye **Notices & events** kholo.'],
    ['Next: ask me about fees, attendance, or school notices.', 'Next: mujhse fees, attendance ya school notices ke baare me pucho.'],
    ['Next: open **School requests** to approve pending sign-ups, or **Login Tracks** for security.', 'Next: pending sign-ups approve karne ke liye **School requests** kholo, ya security ke liye **Login Tracks** kholo.'],
  ],
}

for (const pairs of Object.values(OFFLINE_TRANSLATIONS)) {
  pairs.sort((a, b) => b[0].length - a[0].length)
}

function localizeReply(markdown, language) {
  const pairs = OFFLINE_TRANSLATIONS[language]
  if (!pairs) return markdown
  const map = new Map(pairs)
  const pattern = new RegExp(pairs.map(([from]) => from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
  return markdown.replace(pattern, (match) => map.get(match) ?? match)
}

/** Offline answers come ONLY from the live snapshot — the same data the
    connected model would see — so every number stays real. */
export function offlineReply({ prompt, role, snapshot, language = 'en', currency = 'INR' }) {
  return localizeReply(offlineReplyEnglish({ prompt, role, snapshot, currency }), language)
}

function offlineReplyEnglish({ prompt, role, snapshot, currency = 'INR' }) {
  const intent = detectIntent(prompt)

  if (role === 'parent') {
    if (!snapshot.child) {
      return [
        'No student is linked to this parent account yet, so I cannot pull your child\'s live records.',
        '',
        'Ask the school admin to link your account with your child\'s admission ID. After that I can show fees, attendance and notices for your child.',
      ].join('\n')
    }
    const child = snapshot.child
    if (intent === 'fees') {
      return [
        `### Fees for ${child.name}`,
        child.fees.totalFee === null
          ? '- No fee plan has been set for this child yet — the school admin sets it under Students → Fee setup.'
          : `- Total fee **${rupees(child.fees.totalFee, currency)}** · Paid **${rupees(child.fees.paid, currency)}** · Balance **${rupees(child.fees.balance, currency)}**`,
        ...(child.fees.pending > 0 ? [`- Awaiting verification: **${rupees(child.fees.pending, currency)}**`] : []),
        ...(child.fees.lastPayment ? [`- Last verified payment: **${rupees(child.fees.lastPayment.amount, currency)}** on ${child.fees.lastPayment.createdAt}`] : []),
        '',
        nextStepsFor('parent', 'fees'),
      ].join('\n')
    }
    if (intent === 'attendance') {
      return [
        `### Attendance for ${child.name}`,
        ...attendanceLines(child.attendance),
        ...(child.recentAttendance.length ? [`- Recent entries: ${child.recentAttendance.map((row) => `**${row.date}** ${row.status}`).join('; ')}`] : []),
        '',
        nextStepsFor('parent', 'attendance'),
      ].join('\n')
    }
    if (intent === 'notices') {
      return ['### School notices', ...noticesLines(snapshot.school.notices), '', nextStepsFor('parent', 'notices')].join('\n')
    }
    return [
      `### Snapshot for ${child.name}${child.className ? ` (Class ${child.className})` : ''}`,
      '**Fees**',
      child.fees.totalFee === null
        ? '- No fee plan set yet.'
        : `- Total **${rupees(child.fees.totalFee, currency)}** · Paid **${rupees(child.fees.paid, currency)}** · Balance **${rupees(child.fees.balance, currency)}**`,
      '**Attendance**',
      ...attendanceLines(child.attendance),
      '**School notices**',
      ...noticesLines(snapshot.school.notices),
      '',
      nextStepsFor('parent', 'default'),
    ].join('\n')
  }

  if (role === 'super_admin') {
    const platform = snapshot.platform
    return [
      '### Platform snapshot',
      `- Accounts: **${platform.accounts}** (${Object.entries(platform.roleCounts).map(([r, n]) => `${r}: ${n}`).join(', ')})`,
      `- School sign-up requests: **${platform.schoolRequests.pending} pending** · ${platform.schoolRequests.approved} approved`,
      '**Security**',
      ...securityLines(snapshot.school.security),
      '',
      nextStepsFor('super_admin', 'default'),
    ].join('\n')
  }

  if (intent !== 'summary') {
    return [...offlineSection(snapshot, intent, currency), '', nextStepsFor(role, intent)].join('\n')
  }

  const school = snapshot.school
  return [
    '### Today\'s snapshot',
    '**Students**',
    `- Total: **${school.students.total}** · Admission intake: **${school.admissions}**`,
    '**Attendance**',
    ...attendanceLines(school.attendance),
    '**Fees**',
    ...feesLines(school.fees, currency),
    '**Staff**',
    `- Staff accounts: **${school.staff.staffAccounts}** · Face enrolled: **${school.staff.faceEnrolled}** · Checked in today: **${school.staff.checkedInToday}**`,
    '**Security**',
    ...securityLines(school.security),
    '',
    nextStepsFor(role, 'default'),
  ].join('\n')
}

/** Split text into small word-groups so the offline engine can stream too. */
export function chunkText(text, wordsPerChunk = 4) {
  const tokens = String(text || '').split(/(\s+)/)
  const chunks = []
  for (let i = 0; i < tokens.length; i += wordsPerChunk * 2) {
    chunks.push(tokens.slice(i, i + wordsPerChunk * 2).join(''))
  }
  return chunks.filter((chunk) => chunk.length > 0)
}
