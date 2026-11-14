import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { currencySymbol } from '../../utils/currency'
import './StudentProfilePremium.css'

const maskId = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 4) return ''
  return `XXXX XXXX ${digits.slice(-4)}`
}

const inr = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return `${currencySymbol()}${amount.toLocaleString('en-IN')}`
}

const normalize = (raw) => {
  if (raw == null || raw === '' || raw === '—') return ''
  if (Array.isArray(raw)) return raw.length ? raw.join(', ') : ''
  if (typeof raw === 'boolean') return raw ? 'Yes' : ''
  return String(raw)
}

const field = (label, raw) => {
  const value = normalize(raw)
  return value ? { label, value } : null
}

const paymentModeLabel = (mode) => {
  if (mode === 'full') return 'Full payment'
  if (mode === 'installment') return 'Installments'
  return mode
}

const toneClass = (status) => {
  if (status === 'Active') return 'sprof-pill--success'
  if (status === 'On Hold') return 'sprof-pill--warning'
  return 'sprof-pill--muted'
}

const DOCUMENTS = [
  { label: 'Birth certificate', ok: (s) => Boolean(s.birthCertificate), file: (s) => s.birthCertificateFile },
  { label: 'Transfer certificate', ok: (s) => Boolean(s.transferCertificate), file: (s) => s.transferCertificateFile },
  { label: 'Student Aadhaar copy', ok: (s) => Boolean(s.studentAadharFile), file: (s) => s.studentAadharFile },
  { label: 'Parent Aadhaar copy', ok: (s) => Boolean(s.parentAadharFile), file: (s) => s.parentAadharFile },
  { label: 'Passport photographs', ok: (s) => Boolean(s.photographs), file: (s) => s.photographFile },
  { label: 'B-form', ok: (s) => Boolean(s.bForm), file: () => '' },
  { label: 'Parent CNIC', ok: (s) => Boolean(s.parentCNIC), file: () => '' },
]

const StudentProfileOverlay = ({ student, onClose }) => {
  const [attendanceRows] = usePersistentState(STORAGE_KEYS.attendance, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  if (!student) return null

  const normClass = (value) => String(value || '').replace(/^class\s+/i, '').trim().toLowerCase()
  const myName = String(student.title || '').trim().toLowerCase()
  const myClass = normClass(student.subtitle || student.className)
  const studentAttendance = (Array.isArray(attendanceRows) ? attendanceRows : [])
    .filter((row) => {
      if (!myName) return false
      if (String(row.title || row.name || '').trim().toLowerCase() !== myName) return false
      const rowClass = normClass(row.className || row.group)
      return !rowClass || !myClass || rowClass === myClass
    })
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  const attendanceTotal = studentAttendance.length
  const countStatus = (status) => studentAttendance.filter((row) => String(row.status || '').toLowerCase() === status).length
  const presentCount = countStatus('present')
  const lateCount = countStatus('late')
  const absentCount = countStatus('absent')
  const leaveCount = countStatus('leave')
  const presentRate = attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : 0

  const ringParts = []
  let ringCursor = 0
  ;[
    [presentCount, '#17b398'],
    [lateCount, '#e08a2c'],
    [absentCount, '#d64545'],
    [leaveCount, '#8b97b3'],
  ].forEach(([count, color]) => {
    if (!count || !attendanceTotal) return
    const next = ringCursor + (count / attendanceTotal) * 100
    ringParts.push(`${color} ${ringCursor.toFixed(2)}% ${next.toFixed(2)}%`)
    ringCursor = next
  })

  const dayMap = new Map()
  studentAttendance.forEach((row) => {
    const day = String(row.date || '').slice(0, 10)
    if (!day) return
    const entry = dayMap.get(day) || { date: day, present: 0, late: 0, absent: 0, leave: 0 }
    const status = String(row.status || '').toLowerCase()
    if (status in entry) entry[status] += 1
    dayMap.set(day, entry)
  })
  const recentDays = [...dayMap.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).reverse()
  const dayLabel = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

  const sections = [
    {
      title: 'Personal information',
      icon: '👤',
      fields: [
        field('Date of birth', student.dateOfBirth),
        field('Age', student.age),
        field('Gender', student.gender),
        field('Blood group', student.bloodGroup),
        field('Nationality', student.nationality),
        field('Religion', student.religion),
        field('Caste / category', student.caste),
        field('Aadhaar', maskId(student.studentAadhar)),
      ],
    },
    {
      title: 'Contact',
      icon: '☎',
      fields: [
        field('Email', student.owner === 'guardian@example.com' ? '' : student.owner || student.email),
        field('Phone', student.phone),
        field('Emergency contact', student.emergencyContact),
        field('Relation', student.emergencyRelation),
      ],
    },
    {
      title: 'Address',
      icon: '📍',
      fields: [
        field('Current address', student.currentAddress),
        field('Permanent address', student.permanentAddress),
        field('Area', student.areaName),
        field('District', student.district),
        field('State', student.state),
        field('Postal code', student.postalCode),
      ],
    },
    {
      title: 'Academic',
      icon: '🎓',
      fields: [
        field('Class', student.subtitle),
        field('Roll no.', student.rollNo),
        field('Admission date', student.admissionDate),
        field('Previous school', student.previousSchool),
        field('Previous school city', student.previousSchoolCity),
        field('Previous class', student.previousClass),
        field('Last exam result', student.lastExamResult),
        field('Transfer certificate', student.transferCertificate),
      ],
    },
    {
      title: 'Father',
      icon: '👨',
      fields: [
        field('Name', student.fatherName),
        field('Occupation', student.fatherOccupation),
        field('Phone', student.fatherPhone),
        field('Email', student.fatherEmail),
        field('Aadhaar', maskId(student.fatherAadhar)),
      ],
    },
    {
      title: 'Mother',
      icon: '👩',
      fields: [
        field('Name', student.motherName),
        field('Occupation', student.motherOccupation),
        field('Phone', student.motherPhone),
        field('Email', student.motherEmail),
        field('Aadhaar', maskId(student.motherAadhar)),
      ],
    },
    {
      title: 'Guardian',
      icon: '🛡',
      fields: [
        field('Name', student.guardianName),
        field('Relation', student.guardianRelation),
        field('Phone', student.guardianPhone),
        field('Email', student.guardianEmail),
        field('Aadhaar', maskId(student.guardianAadhar)),
      ],
    },
    {
      title: 'Medical & additional',
      icon: '🏥',
      fields: [
        field('Medical conditions', student.medicalConditions),
        field('Allergies', student.allergies),
        field('Special needs', student.specialNeeds),
        field('Hobbies', student.hobbies),
        field('Languages', student.languages),
        field('School transport', student.transportRequired),
        field('Hostel', student.hostelRequired),
      ],
    },
    {
      title: 'Fee structure',
      icon: '💳',
      fields: [
        field('Admission fee', inr(student.admissionFee)),
        field('Tuition fee', inr(student.tuitionFee)),
        field('Activity fee', inr(student.activityFee)),
        field('Transport fee', inr(student.transportFee)),
        field('Hostel fee', inr(student.hostelFee)),
        field('Payment mode', paymentModeLabel(student.paymentMode)),
        field('Installment plan', student.installmentPlan),
        field('Due date', student.dueDate),
        field('Notes', student.feeNotes),
      ],
    },
  ]

  const visibleSections = sections
    .map((section) => ({ ...section, fields: section.fields.filter(Boolean) }))
    .filter((section) => section.fields.length > 0)

  const photo = student.studentPhotoUrl || student.photoUrl || ''

  // Portal to document.body so the fixed backdrop is not trapped inside the
  // route panel's transform (a transformed ancestor becomes the containing
  // block for position:fixed, which pushed the sheet off-screen).
  return createPortal(
    <div className="sprof-backdrop" onClick={onClose}>
      <div
        className="sprof-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Profile of ${student.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sprof-hero">
          <button type="button" className="sprof-close" onClick={onClose} aria-label="Close profile">
            ✕
          </button>
          <div className="sprof-photo-wrap">
            {photo ? (
              <img className="sprof-photo" src={photo} alt={`${student.title} photo`} />
            ) : (
              <div className="sprof-photo sprof-photo--initial" aria-hidden>
                {student.title.charAt(0)}
              </div>
            )}
            <span className={`sprof-presence ${toneClass(student.status)}`} title={student.status} />
          </div>
          <div className="sprof-hero-info">
            <p className="sprof-kicker">Student Profile</p>
            <h2>{student.title}</h2>
            <p className="sprof-meta">
              {[student.subtitle, student.rollNo ? `Roll ${student.rollNo}` : '', student.id].filter(Boolean).join(' · ')}
            </p>
            <div className="sprof-hero-tags">
              <span className={`sprof-pill ${toneClass(student.status)}`}>{student.status}</span>
              {student.admissionDate ? <span className="sprof-tag">Admitted {student.admissionDate}</span> : null}
              {student.applicationId ? <span className="sprof-tag">App {student.applicationId}</span> : null}
            </div>
          </div>
        </header>

        <div className="sprof-body">
          {visibleSections.map((section) => (
            <section className="sprof-section" key={section.title}>
              <h3>
                <span aria-hidden>{section.icon}</span> {section.title}
              </h3>
              <div className="sprof-grid">
                {section.fields.map((item) => (
                  <div className="sprof-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="sprof-section">
            <h3>
              <span aria-hidden>📊</span> Attendance
            </h3>
            {attendanceTotal ? (
              <div className="sprof-attendance">
                <div
                  className="sprof-ring"
                  style={{ background: ringParts.length ? `conic-gradient(${ringParts.join(', ')})` : '#e6eaf5' }}
                  role="img"
                  aria-label={`Present ${presentCount} of ${attendanceTotal} marked days`}
                >
                  <div className="sprof-ring__center">
                    <strong>{presentRate}%</strong>
                    <span>Present</span>
                  </div>
                </div>
                <ul className="sprof-attendance__legend">
                  {[
                    ['Present', presentCount, '#17b398'],
                    ['Late', lateCount, '#e08a2c'],
                    ['Absent', absentCount, '#d64545'],
                    ['Leave', leaveCount, '#8b97b3'],
                  ].map(([label, count, color]) => (
                    <li key={label}>
                      <i style={{ background: color }} />
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
                <ul className="sprof-attendance__legend sprof-attendance__legend--total">
                  <li>
                    <span>Marked days</span>
                    <strong>{attendanceTotal}</strong>
                  </li>
                  <li>
                    <span>Present rate</span>
                    <strong>{presentRate}%</strong>
                  </li>
                </ul>
                {recentDays.length ? (
                  <div className="sprof-attendance__recent">
                    <p>Last marked days</p>
                    <div className="sprof-attendance__days">
                      {recentDays.map((day) => (
                        <div className="sprof-attendance__day" key={day.date}>
                          <strong>{dayLabel(day.date)}</strong>
                          <span>
                            {day.present ? `${day.present}P ` : ''}
                            {day.late ? `${day.late}L ` : ''}
                            {day.absent ? `${day.absent}A ` : ''}
                            {day.leave ? `${day.leave}Lv` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="sprof-attendance__empty">
                No attendance has been marked for this student yet.
              </p>
            )}
          </section>

          <section className="sprof-section">
            <h3>
              <span aria-hidden>📄</span> Documents
            </h3>
            <div className="sprof-docs">
              {DOCUMENTS.map((doc) => {
                const done = doc.ok(student)
                const file = doc.file(student)
                return (
                  <div className={`sprof-doc ${done ? 'is-done' : ''}`} key={doc.label}>
                    <span className="sprof-doc-mark" aria-hidden>
                      {done ? '✓' : '—'}
                    </span>
                    <div>
                      <strong>{doc.label}</strong>
                      {file ? <small>{file}</small> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default StudentProfileOverlay
