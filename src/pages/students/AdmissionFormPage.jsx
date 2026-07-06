import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import PremiumAdmissionForm from '../../components/PremiumAdmissionForm'
import { buildAdmissionRecord, buildStudentRecord } from '../../utils/recordBuilders'
import { saveStudent } from '../../services/students'
import { STORAGE_KEYS } from '../../utils/constants'
import { usePersistentState } from '../../hooks/usePersistentState'
import './AdmissionFormPage.css'

const AdmissionFormPage = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isDraftMode = pathname.includes('admission-form')
  const [admissions, setAdmissions] = usePersistentState(STORAGE_KEYS.admissions, [])
  const [toast, setToast] = useState('')
  const [registeredStudent, setRegisteredStudent] = useState(null)

  const handleSubmit = async (values) => {
    if (isDraftMode) {
      setAdmissions((prev) => [...prev, buildAdmissionRecord(values, prev.length)])
      setToast('Admission draft saved successfully.')
      window.setTimeout(() => navigate('/dashboard'), 1200)
      return
    }

    const record = buildStudentRecord(values, Date.now())
    const savedStudent = await saveStudent(record)

    setRegisteredStudent({
      id: savedStudent.id,
      name: `${values.firstName} ${values.lastName}`.trim(),
      className: values.applyingForClass || 'N/A',
      address: values.currentAddress || values.permanentAddress || 'N/A',
      fatherName: values.fatherName || 'N/A',
      mobile: values.fatherPhone || values.phone || 'N/A',
      photoUrl: values.studentPhotoUrl || '',
    })

    setToast('Student registered successfully and ID card generated.')
    return
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
      <div className="admission-form-page__panel">
        <header className="admission-form-page__header">
          <div className="admission-form-page__intro">
            <p className="admin-kicker">Student Management</p>
            <h2>{isDraftMode ? 'Admission Form' : 'New Admission'}</h2>
            <p>
              {isDraftMode
                ? 'Capture applicant details, guardian information and documents in one connected workflow.'
                : 'Register a new student with complete academic, guardian and document details.'}
            </p>
          </div>
          <Link
            to={isDraftMode ? '/dashboard' : '/students'}
            className="admission-form-page__back"
          >
            ← Back to {isDraftMode ? 'dashboard' : 'registry'}
          </Link>
        </header>

        {toast ? <div className="admission-form-page__toast">{toast}</div> : null}

        {registeredStudent ? (
          <div className="student-id-card-panel">
            <div className="student-id-card">
              <div className="student-id-card__topbar">
                <div className="student-id-card__brand">Elite Scholar Academy</div>
                <div className="student-id-card__id-value">ID: {registeredStudent.id}</div>
              </div>
              <div className="student-id-card__header">
                <div>
                  <p className="student-id-card__label">Student ID Card</p>
                  <h3>{registeredStudent.name}</h3>
                  <p className="student-id-card__class">Class {registeredStudent.className}</p>
                </div>
                <div className="student-id-card__badge">Registered</div>
              </div>
              <div className="student-id-card__body">
                <div className="student-id-card__photo">
                  {registeredStudent.photoUrl ? (
                    <img src={registeredStudent.photoUrl} alt={`${registeredStudent.name} photo`} />
                  ) : (
                    <div className="student-id-card__photo-placeholder">Photo not available</div>
                  )}
                </div>
                <div className="student-id-card__details">
                  <div className="student-id-card__grid-row">
                    <div>
                      <span className="student-id-card__detail-label">Address</span>
                      <p>{registeredStudent.address}</p>
                    </div>
                    <div>
                      <span className="student-id-card__detail-label">Father's Name</span>
                      <p>{registeredStudent.fatherName}</p>
                    </div>
                  </div>
                  <div className="student-id-card__grid-row">
                    <div>
                      <span className="student-id-card__detail-label">Mobile</span>
                      <p>{registeredStudent.mobile}</p>
                    </div>
                    <div>
                      <span className="student-id-card__detail-label">Issued</span>
                      <p>{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="student-id-card__actions">
                <button type="button" className="btn-primary" onClick={handleFinish}>
                  Go to Registry
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <PremiumAdmissionForm embedded onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    </div>
  )
}

export default AdmissionFormPage
