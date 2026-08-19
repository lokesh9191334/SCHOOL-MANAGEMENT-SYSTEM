import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { buildTeacherRecord } from '../../utils/recordBuilders'
import { SEED_TEACHERS } from '../../data/seed'

const STEPS = [
  { id: 1, name: 'Personal Info', icon: '👤' },
  { id: 2, name: 'Professional', icon: '🎓' },
  { id: 3, name: 'Documents', icon: '📁' },
  { id: 4, name: 'Review', icon: '✓' },
]

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science', 'Hindi', 'Sanskrit', 'Economics', 'Accounts', 'Business Studies', 'Physical Education', 'Art', 'Music']
const QUALIFICATIONS = ['Ph.D', 'M.Phil', 'M.Sc', 'MA', 'M.Tech', 'MBA', 'B.Tech', 'B.Sc', 'BA', 'B.Ed', 'D.El.Ed']
const CLASSES = ['Nursery', 'KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['Male', 'Female', 'Other']
const DEPARTMENTS = ['Science & Math', 'Languages', 'Social Studies', 'Technology', 'Arts', 'Commerce', 'Physical Education']

const AddTeacherPage = () => {
  const navigate = useNavigate()
  const [teachers, setTeachers] = usePersistentState(STORAGE_KEYS.teachers, SEED_TEACHERS)
  const [step, setStep] = useState(1)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    phone: '',
    email: '',
    address: '',
    pan: '',
    aadhar: '',
    photoUrl: '',
    subject: '',
    qualification: '',
    experience: 0,
    specialization: '',
    joiningDate: '',
    salary: '',
    department: '',
    classes: [],
    documents: [
      { type: 'CV / Resume', uploaded: false, fileName: '', required: true },
      { type: 'Degree Certificate', uploaded: false, fileName: '', required: true },
      { type: 'Teaching Certification / B.Ed', uploaded: false, fileName: '', required: true },
      { type: 'ID Proof (Aadhar/PAN)', uploaded: false, fileName: '', required: true },
      { type: 'Address Proof', uploaded: false, fileName: '', required: false },
      { type: 'Experience Letters', uploaded: false, fileName: '', required: false },
      { type: 'Passport Size Photo', uploaded: false, fileName: '', required: true },
    ],
  })

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }))
  const updateNested = (e) => {
    const { name, value, type, checked } = e.target
    update(name, type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) || 0 : value)
  }

  const toggleClass = (c) => {
    update('classes', form.classes.includes(c) ? form.classes.filter((x) => x !== c) : [...form.classes, c])
  }

  const handleDocUpload = (idx) => {
    const docs = [...form.documents]
    docs[idx].uploaded = true
    docs[idx].fileName = `${docs[idx].type.replace(/\s+/g, '_')}_${Date.now()}.pdf`
    update('documents', docs)
  }

  const removeDoc = (idx) => {
    const docs = [...form.documents]
    docs[idx].uploaded = false
    docs[idx].fileName = ''
    update('documents', docs)
  }

  const fieldValid = {
    1: form.firstName && form.lastName && form.dateOfBirth && form.gender && form.phone && form.email,
    2: form.subject && form.qualification && form.joiningDate && form.department,
    3: form.documents.filter((d) => d.required).every((d) => d.uploaded),
    4: true,
  }

  const goNext = () => {
    if (!fieldValid[step]) {
      setToast(`Please fill required fields in ${STEPS[step - 1].name}`)
      setTimeout(() => setToast(''), 2500)
      return
    }
    if (step < 4) setStep(step + 1)
  }

  const goBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = () => {
    const fullRecord = {
      ...buildTeacherRecord({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone,
        subject: form.subject,
        status: 'Active',
      }, teachers.length),
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      address: form.address,
      pan: form.pan,
      aadhar: form.aadhar,
      photoUrl: form.photoUrl,
      qualification: form.qualification,
      experience: form.experience,
      specialization: form.specialization,
      joiningDate: form.joiningDate,
      salary: parseInt(form.salary, 10) || 0,
      department: form.department,
      classes: form.classes,
      tone: 'success',
    }
    setTeachers((prev) => [...prev, fullRecord])
    setToast('Teacher record created successfully!')
    setTimeout(() => navigate('/teachers'), 1500)
  }

  const completion = (step * 100) / 4

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <div className="admin-header">
          <div className="header-left">
            <p className="admin-kicker">HR · Teacher Onboarding</p>
            <h2>Add New Teacher</h2>
            <p>Complete the 4-step wizard to onboard a new faculty member. Each step captures critical information for the HR, academics, and payroll teams.</p>
          </div>
          <div className="header-actions">
            <Link className="link-pill" to="/teachers">← Back to Staff List</Link>
          </div>
        </div>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
          {STEPS.map((s, idx) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: idx < STEPS.length - 1 ? 1 : 'none', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 18,
                    fontWeight: 800,
                    background: step >= s.id ? 'linear-gradient(135deg, #4157ff 0%, #7c8cff 100%)' : '#f3f5ff',
                    color: step >= s.id ? '#fff' : '#7f8ba5',
                    boxShadow: step >= s.id ? '0 8px 18px rgba(65, 87, 255, 0.25)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {step > s.id ? '✓' : s.icon}
                </div>
                <span style={{ fontSize: '0.76rem', fontWeight: step >= s.id ? 700 : 500, color: step >= s.id ? '#111b33' : '#9aa6c2', whiteSpace: 'nowrap' }}>
                  {s.name}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 4, margin: '0 8px', marginBottom: 26, borderRadius: 4, background: '#f3f5ff', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${step > s.id ? '100%' : '0%'}`, background: 'linear-gradient(90deg, #4157ff 0%, #7c8cff 100%)', transition: 'width 0.3s ease' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 4, height: 6, background: '#f3f5ff', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${completion}%`, background: 'linear-gradient(90deg, #4157ff, #7c8cff)', transition: 'width 0.4s ease', borderRadius: 6 }} />
        </div>
      </div>

      {step === 1 && (
        <article className="panel-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Step 1 of 4</p>
              <h3>Personal Information</h3>
            </div>
            <span className="status-pill">Identity & Contact</span>
          </div>
          <div className="module-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <label className="form-field">
              <span>First Name <span style={{ color: '#f35d5d' }}>*</span></span>
              <input name="firstName" required value={form.firstName} onChange={updateNested} placeholder="e.g. Priya" />
            </label>
            <label className="form-field">
              <span>Last Name <span style={{ color: '#f35d5d' }}>*</span></span>
              <input name="lastName" required value={form.lastName} onChange={updateNested} placeholder="e.g. Nair" />
            </label>
            <label className="form-field">
              <span>Date of Birth <span style={{ color: '#f35d5d' }}>*</span></span>
              <input type="date" name="dateOfBirth" required value={form.dateOfBirth} onChange={updateNested} />
            </label>
            <label className="form-field">
              <span>Gender <span style={{ color: '#f35d5d' }}>*</span></span>
              <select name="gender" value={form.gender} onChange={updateNested}>
                <option value="">Select</option>
                {GENDERS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Blood Group</span>
              <select name="bloodGroup" value={form.bloodGroup} onChange={updateNested}>
                <option value="">Select</option>
                {BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Phone Number <span style={{ color: '#f35d5d' }}>*</span></span>
              <input name="phone" required value={form.phone} onChange={updateNested} placeholder="+91 9XXXX XXXXX" />
            </label>
            <label className="form-field">
              <span>Email <span style={{ color: '#f35d5d' }}>*</span></span>
              <input type="email" name="email" required value={form.email} onChange={updateNested} placeholder="name@school.edu" />
            </label>
            <label className="form-field">
              <span>Photo URL</span>
              <input name="photoUrl" value={form.photoUrl} onChange={updateNested} placeholder="https://..." />
            </label>
            <label className="form-field full-width">
              <span>Residential Address</span>
              <textarea name="address" value={form.address} onChange={updateNested} placeholder="Full address with landmark..." rows={3} />
            </label>
            <label className="form-field">
              <span>PAN Number</span>
              <input name="pan" value={form.pan} onChange={updateNested} placeholder="ABCDE1234F" />
            </label>
            <label className="form-field">
              <span>Aadhar Number</span>
              <input name="aadhar" value={form.aadhar} onChange={updateNested} placeholder="1234 5678 9012" />
            </label>
          </div>
          <div className="form-actions">
            <div />
            <button type="button" className="header-action primary" onClick={goNext}>Continue →</button>
          </div>
        </article>
      )}

      {step === 2 && (
        <article className="panel-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Step 2 of 4</p>
              <h3>Professional Details</h3>
            </div>
            <span className="status-pill">Academics & Payroll</span>
          </div>
          <div className="module-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <label className="form-field">
              <span>Department <span style={{ color: '#f35d5d' }}>*</span></span>
              <select name="department" value={form.department} onChange={updateNested}>
                <option value="">Select Department</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Primary Subject <span style={{ color: '#f35d5d' }}>*</span></span>
              <select name="subject" value={form.subject} onChange={updateNested}>
                <option value="">Select Subject</option>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Highest Qualification <span style={{ color: '#f35d5d' }}>*</span></span>
              <select name="qualification" value={form.qualification} onChange={updateNested}>
                <option value="">Select Qualification</option>
                {QUALIFICATIONS.map((q) => <option key={q}>{q}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Specialization / Area of Expertise</span>
              <input name="specialization" value={form.specialization} onChange={updateNested} placeholder="e.g. Calculus, Organic Chem..." />
            </label>
            <label className="form-field">
              <span>Total Teaching Experience (years)</span>
              <input type="number" name="experience" min={0} max={60} value={form.experience} onChange={updateNested} />
            </label>
            <label className="form-field">
              <span>Date of Joining <span style={{ color: '#f35d5d' }}>*</span></span>
              <input type="date" name="joiningDate" required value={form.joiningDate} onChange={updateNested} />
            </label>
            <label className="form-field">
              <span>Monthly Salary (₹)</span>
              <input type="number" name="salary" value={form.salary} onChange={updateNested} placeholder="e.g. 65000" />
            </label>
            <label className="form-field full-width">
              <span>Classes Assigned</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {CLASSES.map((c) => (
                  <label key={c} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: '0.84rem',
                    background: form.classes.includes(c) ? 'rgba(65, 87, 255, 0.15)' : '#f7f8ff',
                    color: form.classes.includes(c) ? '#3246c7' : '#5c6b8c',
                    border: `1px solid ${form.classes.includes(c) ? 'rgba(65, 87, 255, 0.3)' : 'rgba(65, 87, 255, 0.08)'}`,
                  }}>
                    <input type="checkbox" checked={form.classes.includes(c)} onChange={() => toggleClass(c)} style={{ display: 'none' }} />
                    {c}
                  </label>
                ))}
              </div>
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="small-action" onClick={goBack}>← Back</button>
            <button type="button" className="header-action primary" onClick={goNext}>Continue →</button>
          </div>
        </article>
      )}

      {step === 3 && (
        <article className="panel-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Step 3 of 4</p>
              <h3>Document Verification</h3>
            </div>
            <span className="status-pill">{form.documents.filter((d) => d.uploaded).length}/{form.documents.length} uploaded</span>
          </div>
          <div className="side-stack" style={{ gap: 12 }}>
            {form.documents.map((doc, idx) => (
              <div key={doc.type} style={{
                padding: 16, borderRadius: 18,
                background: doc.uploaded ? 'linear-gradient(180deg, rgba(23, 179, 152, 0.08) 0%, #fff 100%)' : '#fbfcff',
                border: `1px solid ${doc.uploaded ? 'rgba(23, 179, 152, 0.25)' : 'rgba(65, 87, 255, 0.1)'}`,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0,
                  background: doc.uploaded ? 'rgba(23, 179, 152, 0.15)' : 'rgba(65, 87, 255, 0.1)',
                  color: doc.uploaded ? '#0d8f7a' : '#4157ff',
                }}>
                  {doc.uploaded ? '✓' : '📄'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#111b33' }}>{doc.type}</strong>
                    {doc.required && <span className="status-pill" style={{ background: 'rgba(243, 93, 93, 0.12)', color: '#d33' }}>Required</span>}
                    {!doc.required && <span className="status-pill">Optional</span>}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: doc.uploaded ? '#0d8f7a' : '#7f8ba5' }}>
                    {doc.uploaded ? `✓ Uploaded: ${doc.fileName}` : 'Not yet uploaded'}
                  </p>
                </div>
                {!doc.uploaded ? (
                  <button className="small-action" onClick={() => handleDocUpload(idx)} style={{ background: 'linear-gradient(135deg, #4157ff 0%, #7c8cff 100%)', color: '#fff', border: 'none' }}>
                    ⇪ Upload
                  </button>
                ) : (
                  <button className="small-action" onClick={() => removeDoc(idx)} style={{ color: '#f35d5d', borderColor: 'rgba(243, 93, 93, 0.2)' }}>
                    ✕ Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" className="small-action" onClick={goBack}>← Back</button>
            <button type="button" className="header-action primary" onClick={goNext}>Continue →</button>
          </div>
        </article>
      )}

      {step === 4 && (
        <article className="panel-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Step 4 of 4 · Final</p>
              <h3>Review & Submit</h3>
            </div>
            <span className="status-pill success">All {fieldValid[1] && fieldValid[2] && fieldValid[3] ? 'Sections Verified ✓' : 'Attention Required'}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 20, background: 'linear-gradient(180deg, #f7f8ff 0%, #fff 100%)', border: '1px solid rgba(65, 87, 255, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(65, 87, 255, 0.12)', color: '#4157ff', fontSize: 18 }}>👤</div>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Personal</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Full Name</span><strong>{form.firstName || '—'} {form.lastName || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>DOB / Gender</span><strong>{form.dateOfBirth || '—'} · {form.gender || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Phone</span><strong>{form.phone || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Email</span><strong style={{ fontSize: '0.84rem' }}>{form.email || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Blood Group</span><strong>{form.bloodGroup || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>PAN</span><strong>{form.pan || '—'}</strong></div>
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 20, background: 'linear-gradient(180deg, rgba(23, 179, 152, 0.05) 0%, #fff 100%)', border: '1px solid rgba(23, 179, 152, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(23, 179, 152, 0.12)', color: '#0d8f7a', fontSize: 18 }}>🎓</div>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Professional</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Department</span><strong>{form.department || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Subject</span><strong>{form.subject || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Qualification</span><strong>{form.qualification || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Experience</span><strong>{form.experience || 0} years</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Joining</span><strong>{form.joiningDate || '—'}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#7f8ba5' }}>Salary</span><strong>₹{form.salary ? Number(form.salary).toLocaleString() : '—'}</strong></div>
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 20, background: 'linear-gradient(180deg, rgba(244, 181, 98, 0.08) 0%, #fff 100%)', border: '1px solid rgba(244, 181, 98, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(244, 181, 98, 0.18)', color: '#b07820', fontSize: 18 }}>📁</div>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Documents</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84rem' }}>
                {form.documents.map((d) => (
                  <div key={d.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: d.uploaded ? '#111b33' : '#7f8ba5' }}>{d.type}</span>
                    <span className={`status-pill ${d.uploaded ? 'success' : ''}`} style={{ fontSize: '0.65rem', padding: '3px 8px' }}>
                      {d.uploaded ? 'Verified' : d.required ? 'Pending' : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 20, background: 'linear-gradient(135deg, rgba(65, 87, 255, 0.1) 0%, rgba(124, 140, 255, 0.08) 100%)', border: '1px solid rgba(65, 87, 255, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(65, 87, 255, 0.18)', color: '#4157ff', fontSize: 18 }}>🏫</div>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Class Load</h4>
              </div>
              {form.classes.length > 0 ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {form.classes.map((c) => (
                    <span key={c} className="status-pill" style={{ fontSize: '0.76rem' }}>{c}</span>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#7f8ba5' }}>No classes assigned yet.</p>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="small-action" onClick={goBack}>← Back to Edit</button>
            <button type="button" className="header-action primary" onClick={handleSubmit} style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
              ✓ Submit & Create Teacher
            </button>
          </div>
        </article>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 30, right: 30, background: '#111b33', color: '#fff', padding: '14px 22px', borderRadius: 14, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 9999, fontWeight: 600, fontSize: '0.9rem' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

export default AddTeacherPage
