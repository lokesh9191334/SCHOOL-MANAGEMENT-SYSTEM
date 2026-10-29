import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import PremiumAdmissionForm from '../../components/PremiumAdmissionForm'
import { buildAdmissionRecord, buildStudentRecord } from '../../utils/recordBuilders'
import { saveStudent } from '../../services/students'
import { STORAGE_KEYS } from '../../utils/constants'
import { usePersistentState } from '../../hooks/usePersistentState'
import { IdCardPrintSheet, StudentIdCard } from '../../components/StudentIdCard'
import { useCardPrint } from '../../hooks/useCardPrint'
import { academicSession, cardValidTill } from '../../utils/studentCard'
import { readSchoolIdentity, schoolForCard } from '../../utils/schoolIdentity'
import './AdmissionFormPage.css'

const AdmissionFormPage = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isDraftMode = pathname.includes('admission-form')
  const [, setAdmissions] = usePersistentState(STORAGE_KEYS.admissions, [])
  const [toast, setToast] = useState('')
  const [registeredStudent, setRegisteredStudent] = useState(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [printList, setPrintList] = useState([])
  const requestPrint = useCardPrint()

  const school = useMemo(() => schoolForCard(readSchoolIdentity()), [])
  const session = academicSession()
  const validTill = cardValidTill()

  const handleSubmit = async (values) => {
    if (isDraftMode) {
      setAdmissions((prev) => [...prev, buildAdmissionRecord(values, prev.length)])
      setToast('Admission draft saved successfully.')
      window.setTimeout(() => navigate('/dashboard'), 1200)
      return
    }

    const record = buildStudentRecord(values, Date.now())
    const savedStudent = await saveStudent(record)

    setRegisteredStudent(savedStudent)
    setToast('')
  }

  const copyParentKey = async () => {
    try {
      await navigator.clipboard?.writeText(registeredStudent.parentInviteKey || '')
      setCopiedKey(true)
      window.setTimeout(() => setCopiedKey(false), 2000)
    } catch {
      setCopiedKey(false)
    }
  }

  const handlePrint = () => {
    if (!registeredStudent) return
    setPrintList([registeredStudent])
    window.setTimeout(() => requestPrint([registeredStudent]), 220)
  }

  const handleFinish = () => {
    setRegisteredStudent(null)
    navigate('/students')
  }

  const handleCancel = () => {
    navigate(isDraftMode ? '/dashboard' : '/students')
  }

  return (
    <div className="admission-form-page">
      <header className="admission-hero">
        <div className="admission-hero__brand">
          <img src="/brand/sms-mark.svg" alt="" />
          <div>
            <p>Student Management</p>
            <strong>{school.name}</strong>
          </div>
        </div>
        <div className="admission-hero__copy">
          <h2>{registeredStudent ? 'Admission registered' : isDraftMode ? 'New admission draft' : 'New admission'}</h2>
          <p>
            {registeredStudent
              ? 'The student record is saved. Print the identity card, share the parent key and finish the handover.'
              : 'Six focused steps with Aadhaar checksum, PIN auto-address, fee slabs, document checklist and autosaved drafts.'}
          </p>
        </div>
        <div className="admission-hero__aside">
          <span className="admission-hero__chip">Session {session}</span>
          <span className="admission-hero__chip admission-hero__chip--ghost">Valid till {validTill}</span>
          <Link to={isDraftMode ? '/dashboard' : '/students'} className="admission-hero__back">
            ← Back to {isDraftMode ? 'dashboard' : 'registry'}
          </Link>
        </div>
      </header>

      {toast ? <div className="admission-form-page__toast">{toast}</div> : null}

      {registeredStudent ? (
        <section className="admission-success">
          <div className="admission-success__head">
            <span className="admission-success__badge" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p>Registered successfully</p>
              <h3>{registeredStudent.title || `${registeredStudent.firstName} ${registeredStudent.lastName}`.trim()}</h3>
              <span>
                ID {registeredStudent.id} · Class {registeredStudent.applyingForClass || registeredStudent.studentClass || '—'} ·
                Session {session}
              </span>
            </div>
            <div className="admission-success__actions">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={handlePrint}>
                Print ID card
              </button>
              <Link to="/students/id-card" className="adm-btn adm-btn--primary">
                Open ID card studio
              </Link>
            </div>
          </div>

          <div className="admission-success__body">
            <div className="admission-success__cards">
              <div className="admission-success__card">
                <StudentIdCard student={registeredStudent} school={school} />
              </div>
            </div>

            <aside className="admission-success__side">
              {registeredStudent.parentInviteKey ? (
                <div className="admission-success__key">
                  <p>Parent account special key</p>
                  <code>{registeredStudent.parentInviteKey}</code>
                  <span>
                    Parent opens Create Account → Parent → pastes this key → verifies email OTP and lands on the linked
                    parent account.
                  </span>
                  <button type="button" onClick={copyParentKey}>
                    {copiedKey ? 'Copied' : 'Copy key'}
                  </button>
                </div>
              ) : null}

              <ol className="admission-success__steps">
                <li>
                  <strong>Print and hand over the card</strong>
                  <span>A4 sheet prints the card at exact 85.6 × 54 mm size.</span>
                </li>
                <li>
                  <strong>Share the parent portal</strong>
                  <span>Use the special key above so the parent account links to this student.</span>
                </li>
                <li>
                  <strong>Review the full record</strong>
                  <span>Photo, documents and fee plan are available in the student registry.</span>
                </li>
              </ol>

              <div className="admission-success__links">
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setRegisteredStudent(null)}>
                  Add another student
                </button>
                <button type="button" className="adm-btn adm-btn--primary" onClick={handleFinish}>
                  Go to registry
                </button>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        <PremiumAdmissionForm embedded onSubmit={handleSubmit} onCancel={handleCancel} />
      )}

      {printList.length ? <IdCardPrintSheet students={printList} school={school} /> : null}
    </div>
  )
}

export default AdmissionFormPage
