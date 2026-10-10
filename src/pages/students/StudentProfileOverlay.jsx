import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './StudentProfilePremium.css'

const maskId = (value) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 4) return ''
  return `XXXX XXXX ${digits.slice(-4)}`
}

const inr = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return `₹${amount.toLocaleString('en-IN')}`
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
