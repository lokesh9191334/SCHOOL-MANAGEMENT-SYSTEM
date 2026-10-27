import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  academicSession,
  cardValidTill,
  dash,
  formatCardDate,
  initialsOf,
  studentCardNumber,
  studentClassLabel,
  studentDisplayName,
} from '../utils/studentCard'
import './StudentIdCard.css'

const CARD_SUBJECT = 'student-id'

function useQrCode(student, schoolName) {
  const [dataUrl, setDataUrl] = useState('')

  const payload = useMemo(
    () =>
      JSON.stringify({
        t: CARD_SUBJECT,
        id: String(student?.id || ''),
        card: studentCardNumber(student),
        name: studentDisplayName(student),
        cls: studentClassLabel(student),
        school: schoolName || '',
      }),
    [student, schoolName],
  )

  useEffect(() => {
    let active = true
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(payload, {
          margin: 1,
          width: 220,
          errorCorrectionLevel: 'M',
          color: { dark: '#0d1836', light: '#ffffff' },
        }),
      )
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl('')
      })
    return () => {
      active = false
    }
  }, [payload])

  return dataUrl
}

export function StudentIdCard({ student, school, side = 'front', className = '' }) {
  const schoolName = school?.name || 'School Management System'
  const qr = useQrCode(student, schoolName)
  const name = studentDisplayName(student)
  const classLabel = studentClassLabel(student)
  const photo = String(student?.studentPhotoUrl || '').trim()
  const session = academicSession(student?.admissionDate ? new Date(student.admissionDate) : new Date())
  const validTill = formatCardDate(student?.validTill || cardValidTill())
  const issuedOn = formatCardDate(student?.admissionDate)
  const cardNo = studentCardNumber(student)
  const fatherName = student?.fatherName || student?.guardianName || ''
  const motherName = student?.motherName || ''
  const phone = student?.fatherPhone || student?.guardianPhone || student?.phone || ''
  const email = student?.guardianEmail || student?.email || ''
  const address =
    student?.currentAddress || student?.permanentAddress || student?.address || ''
  const emergency = [student?.emergencyContact, student?.emergencyRelation]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className={`sidc sidc--${side} ${className}`.trim()} aria-label={`${name} identity card ${side}`}>
      <div className="sidc__frame">
        <span className="sidc__halo" aria-hidden />
        <span className="sidc__crest-ghost" aria-hidden />

        <header className="sidc__head">
          <img className="sidc__crest" src="/brand/sms-mark.svg" alt="" />
          <div className="sidc__school">
            <strong>{schoolName}</strong>
            <span>{side === 'front' ? school?.address || `Academic session ${session}` : 'Emergency & contact details'}</span>
          </div>
          <span className="sidc__chip">{side === 'front' ? `Session ${session}` : 'Reverse side'}</span>
        </header>

        {side === 'front' ? (
          <>
            <div className="sidc__main">
              <div className="sidc__photo">
                {photo ? (
                  <img src={photo} alt={`${name} photograph`} />
                ) : (
                  <span className="sidc__photo-fallback">
                    <strong>{initialsOf(name) || '—'}</strong>
                    <small>No photo</small>
                  </span>
                )}
              </div>

              <div className="sidc__identity">
                <span className="sidc__role">Student identity card</span>
                <h3 className="sidc__name">{name}</h3>
                <p className="sidc__class">Class {classLabel}</p>
                <div className="sidc__facts">
                  <div>
                    <span>Roll no</span>
                    <strong>{dash(student?.rollNo)}</strong>
                  </div>
                  <div>
                    <span>Blood group</span>
                    <strong>{dash(student?.bloodGroup)}</strong>
                  </div>
                  <div>
                    <span>Date of birth</span>
                    <strong>{formatCardDate(student?.dateOfBirth)}</strong>
                  </div>
                  <div>
                    <span>Gender</span>
                    <strong>{dash(student?.gender)}</strong>
                  </div>
                </div>
              </div>

              <div className="sidc__qr">
                {qr ? <img src={qr} alt={`Profile QR for ${name}`} /> : <span className="sidc__qr-empty" aria-hidden />}
                <small>Profile scan</small>
              </div>
            </div>

            <footer className="sidc__foot">
              <div>
                <span>Card no</span>
                <strong>{cardNo}</strong>
              </div>
              <div>
                <span>Valid till</span>
                <strong>{validTill}</strong>
              </div>
              <div className="sidc__sign">
                <span>Principal</span>
              </div>
            </footer>
          </>
        ) : (
          <>
            <div className="sidc__back">
              <div className="sidc__back-block sidc__back-block--wide">
                <span>Residential address</span>
                <strong>{dash(address)}</strong>
              </div>
              <div className="sidc__back-grid">
                <div>
                  <span>Father</span>
                  <strong>{dash(fatherName)}</strong>
                </div>
                <div>
                  <span>Mother</span>
                  <strong>{dash(motherName)}</strong>
                </div>
                <div>
                  <span>Contact</span>
                  <strong>{dash(phone)}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong className="sidc__ellipsis">{dash(email)}</strong>
                </div>
                <div>
                  <span>Emergency</span>
                  <strong>{dash(emergency)}</strong>
                </div>
                <div>
                  <span>Issued on</span>
                  <strong>{issuedOn}</strong>
                </div>
              </div>
              <p className="sidc__terms">
                This card is school property. Report loss to the school office. If found, please return to the
                address above.
              </p>
            </div>

            <footer className="sidc__foot">
              <div>
                <span>Card no</span>
                <strong>{cardNo}</strong>
              </div>
              <div>
                <span>{school?.phone ? 'School office' : 'School website'}</span>
                <strong>{school?.phone || dash(school?.website)}</strong>
              </div>
              <div className="sidc__sign">
                <span>Authorised signatory</span>
              </div>
            </footer>
          </>
        )}
      </div>
    </article>
  )
}

export function IdCardPrintSheet({ students = [], school }) {
  if (!students.length) return null
  return createPortal(
    <div className="sidc-print-sheet" aria-hidden>
      {students.map((student) => (
        <div className="sidc-print-item" key={String(student.id || student.applicationId || student.title)}>
          <StudentIdCard student={student} school={school} side="front" />
          <StudentIdCard student={student} school={school} side="back" />
        </div>
      ))}
    </div>,
    document.body,
  )
}
