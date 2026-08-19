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

  const handlePrintCard = () => {
    window.print()
  }

  const handleCancel = () => {
    navigate(isDraftMode ? '/dashboard' : '/students')
  }

  const handleDownloadPdf = () => {
    if (!registeredStudent) return
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Admit Card - ${registeredStudent.id}</title><style>
      @page { size: A4 portrait; margin: 0 }
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial;margin:0;padding:0;display:flex;align-items:center;justify-content:center;height:297mm;background:white}
      .card{width:170mm;height:100mm;box-sizing:border-box;padding:12mm;border:2px solid #1f3c88;border-radius:8px;background:#fff}
      .card-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:1px solid #eee}
      .school{font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:#111b33;font-size:14px}
      .status{background:#1f3c88;color:#fff;padding:6px 12px;border-radius:999px;font-size:12px}
      .id{margin:10px 0;font-size:16px;font-weight:800}
      .body{display:flex;gap:18px;margin-top:10px}
      .details{flex:1}
      .photo{width:120px;height:140px;border-radius:6px;overflow:hidden;border:1px solid #ddd}
      .label{font-size:9px;color:#6d7996;font-weight:700;text-transform:uppercase}
      .value{font-size:13px;font-weight:800;color:#111b33;margin-bottom:8px}
      .footer{display:flex;justify-content:space-between;margin-top:12px;border-top:1px solid #eee;padding-top:8px;font-size:12px}
      img{display:block}
    </style></head><body>
      <div class="card">
        <div class="card-header"><div><div class="school">SMS</div><div style="margin-top:4px" class="label">Admit Card</div></div><div class="status">Admit Card</div></div>
        <div class="id"><div class="label">Student ID</div><div class="value">${registeredStudent.id}</div></div>
        <div class="body">
          <div class="details">
            <div style="margin-bottom:8px"><div class="label">Student Name</div><div class="value">${registeredStudent.name}</div></div>
            <div style="margin-bottom:8px"><div class="label">Father's Name</div><div class="value">${registeredStudent.fatherName}</div></div>
            <div style="margin-bottom:8px"><div class="label">Mobile No</div><div class="value">${registeredStudent.mobile}</div></div>
            <div style="margin-bottom:8px"><div class="label">Address</div><div class="value">${registeredStudent.address}</div></div>
          </div>
          <div class="photo">
            ${registeredStudent.photoUrl ? `<img src="${registeredStudent.photoUrl}" style="width:100%;height:100%;object-fit:cover"/>` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#6b7a9d">Photo not available</div>`}
          </div>
        </div>
        <div class="footer"><div>Issued: ${new Date().toLocaleDateString()}</div><div>Signature: Principal</div></div>
      </div>
    </body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
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
              <div className="student-id-card__card-header">
                <p className="student-id-card__school">SMS</p>
                <span className="student-id-card__status">Admit Card</span>
              </div>
              <div className="student-id-card__id-block">
                <span className="student-id-card__heading">Student ID</span>
                <strong>{registeredStudent.id}</strong>
              </div>
              <div className="student-id-card__body">
                <div className="student-id-card__details">
                  <div className="student-id-card__detail-row">
                    <span className="student-id-card__detail-label">Student Name</span>
                    <p>{registeredStudent.name}</p>
                  </div>
                  <div className="student-id-card__detail-row">
                    <span className="student-id-card__detail-label">Father's Name</span>
                    <p>{registeredStudent.fatherName}</p>
                  </div>
                  <div className="student-id-card__detail-row">
                    <span className="student-id-card__detail-label">Mobile No</span>
                    <p>{registeredStudent.mobile}</p>
                  </div>
                  <div className="student-id-card__detail-row">
                    <span className="student-id-card__detail-label">Address</span>
                    <p>{registeredStudent.address}</p>
                  </div>
                </div>
                <div className="student-id-card__photo">
                  {registeredStudent.photoUrl ? (
                    <img src={registeredStudent.photoUrl} alt={`${registeredStudent.name} photo`} />
                  ) : (
                    <div className="student-id-card__photo-placeholder">Photo not available</div>
                  )}
                </div>
              </div>
              <div className="student-id-card__actions">
                <button type="button" className="btn-secondary" onClick={handleDownloadPdf}>
                  Download / Print Admit Card
                </button>
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
