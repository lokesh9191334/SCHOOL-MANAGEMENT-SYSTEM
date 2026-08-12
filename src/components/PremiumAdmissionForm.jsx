import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ADMISSION_CASTES,
  ADMISSION_CLASS_OPTIONS,
  ADMISSION_NATIONALITIES,
  ADMISSION_RELIGIONS,
} from '../utils/constants'
import { lookupIndianPincode } from '../services/pincode'
import { lookupSchools } from '../services/schools'
import {
  verifyAadharWithUIDI,
  formatAadharNumber,
  DEMO_AADHAAR,
  getMaskedAadhar,
} from '../services/aadhar'
import { createInviteKey, generateLocalInviteKey } from '../services/inviteKeys'
import './PremiumAdmissionForm.css'

const FEE_BY_CLASS = {
  Nursery: { admissionFee: 3500, tuitionFee: 12000, activityFee: 2000 },
  '1st Class': { admissionFee: 4000, tuitionFee: 14000, activityFee: 2200 },
  '2nd Class': { admissionFee: 4000, tuitionFee: 14000, activityFee: 2200 },
  '3rd Class': { admissionFee: 4500, tuitionFee: 15000, activityFee: 2400 },
  '4th Class': { admissionFee: 4500, tuitionFee: 15000, activityFee: 2400 },
  '5th Class': { admissionFee: 5000, tuitionFee: 16000, activityFee: 2600 },
  '6th Class': { admissionFee: 5000, tuitionFee: 16500, activityFee: 2800 },
  '7th Class': { admissionFee: 5500, tuitionFee: 17000, activityFee: 2800 },
  '8th Class': { admissionFee: 5500, tuitionFee: 17500, activityFee: 3000 },
  '9th Class': { admissionFee: 6000, tuitionFee: 18500, activityFee: 3200 },
  '10th Class': { admissionFee: 6500, tuitionFee: 19500, activityFee: 3500 },
  '11th Class': { admissionFee: 7000, tuitionFee: 22000, activityFee: 3800 },
  '12th Class': { admissionFee: 7500, tuitionFee: 24000, activityFee: 4000 },
}

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return ''
  const dob = new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1
  return age >= 0 ? String(age) : ''
}

function createApplicationId() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `ADM-${stamp}-${rand}`
}

const PremiumAdmissionForm = ({ onSubmit, onCancel, embedded = false }) => {
  const [formData, setFormData] = useState({
    applicationId: createApplicationId(),
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    bloodGroup: '',
    nationality: 'Indian',
    religion: '',
    caste: '',
    studentAadhar: '',
    
    email: '',
    phone: '',
    emergencyContact: '',
    emergencyRelation: '',
    
    currentAddress: '',
    permanentAddress: '',
    sameAsCurrentAddress: true,
    postalCode: '',
    state: '',
    district: '',
    areaName: '',
    
    applyingForClass: '',
    previousSchool: '',
    previousSchoolId: '',
    previousSchoolPincode: '',
    previousSchoolCity: '',
    previousClass: '',
    lastExamResult: '',
    transferCertificate: false,
    
    fatherName: '',
    fatherOccupation: '',
    fatherAadhar: '',
    fatherPhone: '',
    fatherEmail: '',
    motherName: '',
    motherOccupation: '',
    motherAadhar: '',
    motherPhone: '',
    motherEmail: '',
    guardianName: '',
    guardianRelation: '',
    guardianAadhar: '',
    guardianPhone: '',
    guardianEmail: '',
    
    transportRequired: false,
    hostelRequired: false,
    medicalConditions: '',
    allergies: '',
    specialNeeds: '',
    hobbies: '',
    languages: [],
    
    birthCertificate: false,
    bForm: false,
    parentCNIC: false,
    photographs: false,
    birthCertificateFile: '',
    transferCertificateFile: '',
    studentAadharFile: '',
    parentAadharFile: '',
    photographFile: '',
    studentPhotoFile: '',
    studentPhotoUrl: '',

    admissionFee: 5000,
    tuitionFee: 18000,
    activityFee: 3000,
    transportFee: 0,
    hostelFee: 0,
    paymentMode: 'full',
    installmentPlan: 'One Time',
    dueDate: '',
    feeNotes: '',
    
    termsAccepted: false,
    dataConsent: false,
    parentInviteKey: generateLocalInviteKey('parent'),
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pincodeStatus, setPincodeStatus] = useState('idle')
  const [pincodeMessage, setPincodeMessage] = useState('')
  const [studentPhotoPreview, setStudentPhotoPreview] = useState('')
  const [keyCopied, setKeyCopied] = useState(false)
  const [schoolResults, setSchoolResults] = useState([])
  const [schoolOpen, setSchoolOpen] = useState(false)
  const [schoolStatus, setSchoolStatus] = useState('idle')
  const [schoolHint, setSchoolHint] = useState('')
  const [activeSchoolIndex, setActiveSchoolIndex] = useState(-1)
  const pincodeTimerRef = useRef(null)
  const schoolTimerRef = useRef(null)
  const schoolBoxRef = useRef(null)

  const [aadharVerification, setAadharVerification] = useState({
    studentAadhar: { status: 'idle', message: '' },
    fatherAadhar: { status: 'idle', message: '' },
    motherAadhar: { status: 'idle', message: '' },
    guardianAadhar: { status: 'idle', message: '' },
  })

  const aadharTimerRef = useRef({
    studentAadhar: null,
    fatherAadhar: null,
    motherAadhar: null,
    guardianAadhar: null,
  })

  useEffect(() => {
    return () => {
      if (pincodeTimerRef.current) clearTimeout(pincodeTimerRef.current)
      if (schoolTimerRef.current) clearTimeout(schoolTimerRef.current)
      Object.values(aadharTimerRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer)
      })
    }
  }, [])

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!schoolBoxRef.current?.contains(event.target)) {
        setSchoolOpen(false)
        setActiveSchoolIndex(-1)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [])

  useEffect(() => {
    const age = calcAge(formData.dateOfBirth)
    setFormData((prev) => (prev.age === age ? prev : { ...prev, age }))
  }, [formData.dateOfBirth])

  useEffect(() => {
    if (!formData.applyingForClass) return
    const fees = FEE_BY_CLASS[formData.applyingForClass]
    if (!fees) return
    setFormData((prev) => ({
      ...prev,
      admissionFee: fees.admissionFee,
      tuitionFee: fees.tuitionFee,
      activityFee: fees.activityFee,
    }))
  }, [formData.applyingForClass])

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      transportFee: prev.transportRequired ? 3500 : 0,
      hostelFee: prev.hostelRequired ? 25000 : 0,
    }))
  }, [formData.transportRequired, formData.hostelRequired])

  useEffect(() => {
    if (!formData.sameAsCurrentAddress) return
    setFormData((prev) => ({ ...prev, permanentAddress: prev.currentAddress }))
  }, [formData.currentAddress, formData.sameAsCurrentAddress])

  const completion = useMemo(() => {
    const checks = [
      formData.firstName,
      formData.lastName,
      formData.dateOfBirth,
      formData.gender,
      formData.bloodGroup,
      formData.studentAadhar && aadharVerification.studentAadhar.status === 'verified',
      formData.email,
      formData.phone,
      formData.currentAddress,
      formData.postalCode,
      formData.state,
      formData.applyingForClass,
      formData.fatherName,
      formData.fatherAadhar && aadharVerification.fatherAadhar.status === 'verified',
      formData.termsAccepted,
      formData.dataConsent,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }, [formData, aadharVerification])

  const validateForm = () => {
    const newErrors = {}

    // Personal Information
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required'
    if (!formData.gender) newErrors.gender = 'Gender is required'
    if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood group is required'
    if (!formData.studentAadhar.trim()) newErrors.studentAadhar = 'Student Aadhaar is required'
    else if (aadharVerification.studentAadhar.status !== 'verified') newErrors.studentAadhar = 'Student Aadhaar must be UIDAI verified'

    // Contact Information
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    else if (!/^[6-9]\d{9}$/.test(String(formData.phone).replace(/\D/g, '').slice(-10))) {
      newErrors.phone = 'Enter a valid 10-digit mobile number'
    }

    // Address Information
    if (!formData.currentAddress.trim()) newErrors.currentAddress = 'Current address is required'
    if (!formData.postalCode.trim()) newErrors.postalCode = 'PIN code is required'
    else if (!/^\d{6}$/.test(formData.postalCode)) newErrors.postalCode = 'Enter a valid 6-digit PIN code'
    if (!formData.state.trim()) newErrors.state = 'State is required'
    if (!formData.district.trim()) newErrors.district = 'District is required'
    if (!formData.areaName.trim()) newErrors.areaName = 'Area name is required'

    // Academic Information
    if (!formData.applyingForClass) newErrors.applyingForClass = 'Class selection is required'
    if (!formData.previousSchool.trim()) newErrors.previousSchool = 'Previous school is required'

    // Parent Information
    if (!formData.fatherName.trim()) newErrors.fatherName = 'Father name is required'
    if (!formData.fatherAadhar.trim()) newErrors.fatherAadhar = 'Father Aadhaar is required'
    else if (aadharVerification.fatherAadhar.status !== 'verified') newErrors.fatherAadhar = 'Father Aadhaar must be UIDAI verified'
    if (!formData.fatherPhone.trim()) newErrors.fatherPhone = 'Father phone is required'

    // Terms
    if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions'
    if (!formData.dataConsent) newErrors.dataConsent = 'You must provide data consent'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleFileChange = (field, files) => {
    const fileName = files && files[0] ? files[0].name : ''
    handleInputChange(field, fileName)
  }

  const handlePhotoUpload = (files) => {
    const file = files && files[0] ? files[0] : null

    if (!file) {
      setStudentPhotoPreview('')
      handleInputChange('studentPhotoFile', '')
      handleInputChange('studentPhotoUrl', '')
      return
    }

    handleInputChange('studentPhotoFile', file.name)

    if (!file.type.startsWith('image/')) {
      setStudentPhotoPreview('')
      handleInputChange('studentPhotoUrl', '')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const preview = reader.result
      setStudentPhotoPreview(preview)
      handleInputChange('studentPhotoUrl', preview)
    }
    reader.readAsDataURL(file)
  }

  const handlePostalCodeChange = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    handleInputChange('postalCode', digits)

    if (pincodeTimerRef.current) {
      clearTimeout(pincodeTimerRef.current)
    }

    if (digits.length < 6) {
      setPincodeStatus(digits.length ? 'typing' : 'idle')
      setPincodeMessage('')
      if (digits.length === 0) {
        setFormData((prev) => ({ ...prev, state: '', district: '', areaName: '' }))
      }
      return
    }

    setPincodeStatus('loading')
    setPincodeMessage('Fetching state, district and area from India Post...')

    pincodeTimerRef.current = setTimeout(async () => {
      const result = await lookupIndianPincode(digits)

      if (result.error) {
        setPincodeStatus('error')
        setPincodeMessage(result.error)
        return
      }

      setPincodeStatus('success')
      setPincodeMessage(
        result.offline
          ? 'Address auto-filled from offline PIN directory.'
          : 'State, district and area filled automatically.',
      )
      setFormData((prev) => ({
        ...prev,
        state: result.state,
        district: result.district,
        areaName: result.areaName,
      }))
    }, 350)
  }

  const selectPreviousSchool = (school) => {
    setFormData((prev) => ({
      ...prev,
      previousSchool: school.name,
      previousSchoolId: school.id,
      previousSchoolPincode: school.pincode,
      previousSchoolCity: school.city,
    }))
    setSchoolResults([])
    setSchoolOpen(false)
    setActiveSchoolIndex(-1)
    setSchoolStatus('success')
    setSchoolHint(`${school.city} · PIN ${school.pincode} · ${school.board}`)
    setErrors((prev) => {
      if (!prev.previousSchool) return prev
      const next = { ...prev }
      delete next.previousSchool
      return next
    })
  }

  const handlePreviousSchoolChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      previousSchool: value,
      previousSchoolId: '',
      previousSchoolPincode: '',
      previousSchoolCity: '',
    }))

    if (schoolTimerRef.current) clearTimeout(schoolTimerRef.current)

    const q = value.trim()
    if (q.length < 1) {
      setSchoolResults([])
      setSchoolOpen(false)
      setSchoolStatus('idle')
      setSchoolHint('')
      setActiveSchoolIndex(-1)
      return
    }

    // Instant local results (no API wait)
    const { schools } = lookupSchools(q)
    setSchoolResults(schools)
    setSchoolOpen(true)
    setActiveSchoolIndex(schools.length ? 0 : -1)

    if (!schools.length) {
      setSchoolStatus('empty')
      setSchoolHint('Directory mein match nahi — neeche custom name use kar sakte ho.')
    } else {
      setSchoolStatus('ready')
      setSchoolHint(`${schools.length} school milin — list se select karo.`)
    }

    // Optional API enrichment
    schoolTimerRef.current = setTimeout(async () => {
      const { lookupSchoolsAsync } = await import('../services/schools')
      const remote = await lookupSchoolsAsync(q)
      if (value.trim() !== q) return
      if (remote.schools?.length) {
        setSchoolResults(remote.schools)
        setActiveSchoolIndex(0)
        setSchoolStatus('ready')
        setSchoolHint(`${remote.schools.length} school milin — list se select karo.`)
      }
    }, 280)
  }

  const onPreviousSchoolKeyDown = (event) => {
    if (!schoolOpen || !schoolResults.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSchoolIndex((i) => (i + 1) % schoolResults.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSchoolIndex((i) => (i <= 0 ? schoolResults.length - 1 : i - 1))
    } else if (event.key === 'Enter' && activeSchoolIndex >= 0) {
      event.preventDefault()
      selectPreviousSchool(schoolResults[activeSchoolIndex])
    } else if (event.key === 'Escape') {
      setSchoolOpen(false)
      setActiveSchoolIndex(-1)
    }
  }

  const applyAadhaarProfile = (field, profile) => {
    if (!profile) return
    setFormData((prev) => {
      if (field === 'studentAadhar') {
        return {
          ...prev,
          firstName: profile.firstName || prev.firstName,
          lastName: profile.lastName || prev.lastName,
          gender: profile.gender || prev.gender,
          dateOfBirth: profile.dateOfBirth || prev.dateOfBirth,
          bloodGroup: profile.bloodGroup || prev.bloodGroup,
          nationality: prev.nationality || 'Indian',
        }
      }
      if (field === 'fatherAadhar') {
        return {
          ...prev,
          fatherName: profile.fullName || prev.fatherName,
          fatherPhone: profile.phone || prev.fatherPhone,
          fatherEmail: profile.email || prev.fatherEmail,
          phone: prev.phone || profile.phone || '',
          emergencyContact: prev.emergencyContact || profile.phone || '',
          emergencyRelation: prev.emergencyRelation || 'Father',
        }
      }
      if (field === 'motherAadhar') {
        return {
          ...prev,
          motherName: profile.fullName || prev.motherName,
          motherPhone: profile.phone || prev.motherPhone,
          motherEmail: profile.email || prev.motherEmail,
          email: prev.email || profile.email || '',
        }
      }
      if (field === 'guardianAadhar') {
        return {
          ...prev,
          guardianName: profile.fullName || prev.guardianName,
          guardianPhone: profile.phone || prev.guardianPhone,
          guardianEmail: profile.email || prev.guardianEmail,
          guardianRelation: profile.relation || prev.guardianRelation || 'Guardian',
        }
      }
      return prev
    })
  }

  const handleAadharChange = async (field, value) => {
    const formatted = formatAadharNumber(value)
    handleInputChange(field, formatted)

    if (aadharTimerRef.current[field]) {
      clearTimeout(aadharTimerRef.current[field])
    }

    const cleanValue = formatted.replace(/\s/g, '')

    if (cleanValue.length < 12) {
      setAadharVerification((prev) => ({
        ...prev,
        [field]: { status: 'typing', message: 'Enter complete 12-digit Aadhaar for UIDAI verify' },
      }))
      return
    }

    setAadharVerification((prev) => ({
      ...prev,
      [field]: { status: 'verifying', message: 'Verifying with UIDAI...' },
    }))

    aadharTimerRef.current[field] = setTimeout(async () => {
      try {
        const result = await verifyAadharWithUIDI(cleanValue, field)

        setAadharVerification((prev) => ({
          ...prev,
          [field]: {
            status: result.verified ? 'verified' : 'failed',
            message: result.message || result.error,
            maskedAadhar: result.maskedAadhar,
            uidaiRef: result.uidaiRef,
          },
        }))

        if (result.verified) {
          applyAadhaarProfile(field, result.profile)
        }
      } catch {
        setAadharVerification((prev) => ({
          ...prev,
          [field]: { status: 'error', message: 'Verification failed. Try again.' },
        }))
      }
    }, 450)
  }

  const fillDemoAadhaar = (field, demo) => {
    handleAadharChange(field, demo.number)
  }

  const copyFatherToGuardian = () => {
    setFormData((prev) => ({
      ...prev,
      guardianName: prev.fatherName,
      guardianPhone: prev.fatherPhone,
      guardianEmail: prev.fatherEmail,
      guardianRelation: 'Father',
      guardianAadhar: prev.fatherAadhar,
    }))
    setAadharVerification((prev) => ({
      ...prev,
      guardianAadhar: prev.fatherAadhar,
    }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const studentName = `${formData.firstName} ${formData.lastName}`.trim()
      const parentName = formData.guardianName || formData.fatherName
      const parentEmail = formData.guardianEmail || formData.fatherEmail || formData.motherEmail || ''
      const parentPhone = formData.guardianPhone || formData.fatherPhone || formData.motherPhone || ''

      let parentInviteKey = formData.parentInviteKey || generateLocalInviteKey('parent')
      try {
        const invite = await createInviteKey({
          role: 'parent',
          key: parentInviteKey,
          name: parentName,
          email: parentEmail,
          phone: parentPhone,
          linkedId: formData.applicationId,
          meta: {
            studentName,
            className: formData.applyingForClass || '',
            source: 'admission-form',
          },
        })
        parentInviteKey = invite.key
      } catch (err) {
        console.error('Parent invite key create failed:', err)
      }

      await onSubmit?.({
        ...formData,
        guardianName: parentName,
        parentInviteKey,
        registrationStatus: 'registered',
      })
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const regenerateParentKey = () => {
    setFormData((prev) => ({ ...prev, parentInviteKey: generateLocalInviteKey('parent') }))
    setKeyCopied(false)
  }

  const copyParentKey = async () => {
    try {
      await navigator.clipboard?.writeText(formData.parentInviteKey)
      setKeyCopied(true)
      window.setTimeout(() => setKeyCopied(false), 2000)
    } catch {
      setKeyCopied(false)
    }
  }

  const totalFees =
    Number(formData.admissionFee || 0) +
    Number(formData.tuitionFee || 0) +
    Number(formData.activityFee || 0) +
    Number(formData.transportFee || 0) +
    Number(formData.hostelFee || 0)

  const renderAadhaarExtras = (field) => (
    <>
      {formData[field] ? (
        <span className={`aadhar-hint aadhar-hint--${aadharVerification[field].status}`}>
          {aadharVerification[field].message}
          {aadharVerification[field].status === 'verified'
            ? ` · ${aadharVerification[field].maskedAadhar || getMaskedAadhar(formData[field])}`
            : ''}
          {aadharVerification[field].uidaiRef ? ` · Ref ${aadharVerification[field].uidaiRef}` : ''}
          {aadharVerification[field].status === 'verified' ? ' ✓' : ''}
        </span>
      ) : null}
      <div className="aadhaar-demo-row">
        <span>UIDAI demo:</span>
        {(DEMO_AADHAAR[field] || []).map((demo) => (
          <button
            key={demo.number}
            type="button"
            className="aadhaar-demo-chip"
            onClick={() => fillDemoAadhaar(field, demo)}
          >
            {formatAadharNumber(demo.number)}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <div className={`premium-admission-form${embedded ? ' is-embedded' : ''}`}>
      <div className="admission-command-bar">
        <div>
          <p className="admin-kicker">Premium intake</p>
          <h3>Smart Admission Workspace</h3>
          <p>
            Application <strong>{formData.applicationId}</strong> · UIDAI Aadhaar verify · PIN auto-address · fee
            calculator
          </p>
        </div>
        <div className="admission-progress-wrap">
          <div className="admission-progress-meta">
            <span>Form completion</span>
            <strong>{completion}%</strong>
          </div>
          <div className="admission-progress-track" aria-hidden>
            <div className="admission-progress-fill" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>

      <div className="admission-auto-features">
        <article>
          <strong>UIDAI Aadhaar</strong>
          <p>Verhoeff checksum + KYC autofill for student and parents</p>
        </article>
        <article>
          <strong>PIN Intelligence</strong>
          <p>Auto fills state, district and area from postal data</p>
        </article>
        <article>
          <strong>Smart Fees</strong>
          <p>Class-based fee slabs with transport and hostel add-ons</p>
        </article>
        <article>
          <strong>Age Sync</strong>
          <p>Age is calculated automatically from date of birth</p>
        </article>
      </div>

      <form onSubmit={handleRegister} className="admission-form">
        
        {/* Personal Information Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">👤</div>
            <div>
              <h3>Personal Information</h3>
              <p>Student identity with UIDAI-linked Aadhaar autofill</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className={errors.firstName ? 'error' : ''}
                placeholder="Enter first name"
              />
              {errors.firstName && <span className="error-message">{errors.firstName}</span>}
            </div>
            
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className={errors.lastName ? 'error' : ''}
                placeholder="Enter last name"
              />
              {errors.lastName && <span className="error-message">{errors.lastName}</span>}
            </div>
            
            <div className="form-group">
              <label>Date of Birth *</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                className={errors.dateOfBirth ? 'error' : ''}
              />
              {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
            </div>

            <div className="form-group">
              <label>Age (auto)</label>
              <input type="text" value={formData.age ? `${formData.age} years` : ''} readOnly placeholder="Calculated from DOB" />
            </div>
            
            <div className="form-group">
              <label>Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className={errors.gender ? 'error' : ''}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <span className="error-message">{errors.gender}</span>}
            </div>
            
            <div className="form-group">
              <label>Blood Group *</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                className={errors.bloodGroup ? 'error' : ''}
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
              {errors.bloodGroup && <span className="error-message">{errors.bloodGroup}</span>}
            </div>
            
            <div className="form-group">
              <label>Nationality</label>
              <select
                value={formData.nationality}
                onChange={(e) => handleInputChange('nationality', e.target.value)}
              >
                <option value="">Select Nationality</option>
                {ADMISSION_NATIONALITIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Religion</label>
              <select
                value={formData.religion}
                onChange={(e) => handleInputChange('religion', e.target.value)}
              >
                <option value="">Select Religion</option>
                {ADMISSION_RELIGIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Caste</label>
              <select
                value={formData.caste}
                onChange={(e) => handleInputChange('caste', e.target.value)}
              >
                <option value="">Select Caste</option>
                {ADMISSION_CASTES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Student Photo</label>
              <div className="photo-upload-card">
                <div className={`photo-upload-preview ${studentPhotoPreview ? 'has-preview' : ''}`}>
                  {studentPhotoPreview ? (
                    <img src={studentPhotoPreview} alt="Student preview" />
                  ) : (
                    <div className="photo-upload-placeholder">
                      <span className="photo-upload-placeholder__icon">📷</span>
                      <span>Upload a recent student passport photo</span>
                    </div>
                  )}
                </div>
                <div className="photo-upload-meta">
                  <label className="photo-upload-button">
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e.target.files)} />
                    <span>{formData.studentPhotoFile ? 'Change Photo' : 'Upload Photo'}</span>
                  </label>
                  <div className="photo-upload-hint">
                    <span>PNG or JPG • clear face • professional background</span>
                    {formData.studentPhotoFile && <strong>Selected: {formData.studentPhotoFile}</strong>}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group full-width">
              <label>Student's Aadhaar Number *</label>
              <div className="aadhaar-input-row">
                <input
                  type="text"
                  value={formData.studentAadhar}
                  onChange={(e) => handleAadharChange('studentAadhar', e.target.value)}
                  className={errors.studentAadhar ? 'error' : ''}
                  placeholder="XXXX XXXX XXXX"
                  maxLength="14"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  className="aadhaar-verify-btn"
                  onClick={() => handleAadharChange('studentAadhar', formData.studentAadhar)}
                >
                  UIDAI Verify
                </button>
              </div>
              {errors.studentAadhar && <span className="error-message">{errors.studentAadhar}</span>}
              {renderAadhaarExtras('studentAadhar')}
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">📞</div>
            <div>
              <h3>Contact Information</h3>
              <p>Email, phone and emergency contact details</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'error' : ''}
                placeholder="Enter email address"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>
            
            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={errors.phone ? 'error' : ''}
                placeholder="Enter phone number"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>
            
            <div className="form-group">
              <label>Emergency Contact</label>
              <input
                type="tel"
                value={formData.emergencyContact}
                onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                placeholder="Emergency contact number"
              />
            </div>
            
            <div className="form-group">
              <label>Emergency Relation</label>
              <input
                type="text"
                value={formData.emergencyRelation}
                onChange={(e) => handleInputChange('emergencyRelation', e.target.value)}
                placeholder="Relationship with student"
              />
            </div>
          </div>
        </div>

        {/* Address Information Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">📍</div>
            <div>
              <h3>Address Information</h3>
              <p>Current and permanent address details</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Current Address *</label>
              <textarea
                value={formData.currentAddress}
                onChange={(e) => handleInputChange('currentAddress', e.target.value)}
                className={errors.currentAddress ? 'error' : ''}
                placeholder="Enter current address"
                rows="3"
              />
              {errors.currentAddress && <span className="error-message">{errors.currentAddress}</span>}
            </div>

            <div className="form-group full-width">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.sameAsCurrentAddress}
                  onChange={(e) => handleInputChange('sameAsCurrentAddress', e.target.checked)}
                />
                Permanent address same as current address
              </label>
            </div>
            
            <div className="form-group full-width">
              <label>Permanent Address</label>
              <textarea
                value={formData.permanentAddress}
                onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                placeholder="Enter permanent address (if different)"
                rows="3"
                disabled={formData.sameAsCurrentAddress}
              />
            </div>
            
            <div className="form-group">
              <label>PIN Code *</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={formData.postalCode}
                onChange={(e) => handlePostalCodeChange(e.target.value)}
                className={errors.postalCode ? 'error' : ''}
                placeholder="Enter 6-digit PIN code"
              />
              {errors.postalCode && <span className="error-message">{errors.postalCode}</span>}
              {pincodeMessage ? (
                <span className={`pincode-hint pincode-hint--${pincodeStatus}`}>{pincodeMessage}</span>
              ) : null}
            </div>

            <div className="form-group">
              <label>State *</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                className={errors.state ? 'error' : ''}
                placeholder="Auto-filled from PIN code"
              />
              {errors.state && <span className="error-message">{errors.state}</span>}
            </div>

            <div className="form-group">
              <label>District *</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
                className={errors.district ? 'error' : ''}
                placeholder="Auto-filled from PIN code"
              />
              {errors.district && <span className="error-message">{errors.district}</span>}
            </div>

            <div className="form-group">
              <label>Area/Locality Name *</label>
              <input
                type="text"
                value={formData.areaName}
                onChange={(e) => handleInputChange('areaName', e.target.value)}
                className={errors.areaName ? 'error' : ''}
                placeholder="Area / locality from PIN code"
              />
              {errors.areaName && <span className="error-message">{errors.areaName}</span>}
            </div>
          </div>
        </div>

        {/* Academic Information Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">🎓</div>
            <div>
              <h3>Academic Information</h3>
              <p>School class and academic background</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Applying For Class *</label>
              <select
                value={formData.applyingForClass}
                onChange={(e) => handleInputChange('applyingForClass', e.target.value)}
                className={errors.applyingForClass ? 'error' : ''}
              >
                <option value="">Select Class</option>
                {ADMISSION_CLASS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.applyingForClass && <span className="error-message">{errors.applyingForClass}</span>}
            </div>
            
            <div className="form-group school-lookup" ref={schoolBoxRef}>
              <label>Previous School *</label>
              <input
                type="text"
                value={formData.previousSchool}
                onChange={(e) => handlePreviousSchoolChange(e.target.value)}
                onFocus={() => {
                  if (schoolResults.length) setSchoolOpen(true)
                }}
                onKeyDown={onPreviousSchoolKeyDown}
                className={errors.previousSchool ? 'error' : ''}
                placeholder="Search by school name or PIN (e.g. DPS / 110001)"
                autoComplete="off"
                role="combobox"
                aria-expanded={schoolOpen}
                aria-autocomplete="list"
                aria-controls="previous-school-list"
              />
              {schoolHint ? (
                <span className={`pincode-hint pincode-hint--${schoolStatus === 'success' ? 'success' : schoolStatus === 'empty' ? 'error' : schoolStatus === 'loading' ? 'loading' : 'typing'}`}>
                  {schoolHint}
                </span>
              ) : null}
              {formData.previousSchoolId ? (
                <span className="school-selected-meta">
                  Selected · {formData.previousSchoolCity} · PIN {formData.previousSchoolPincode}
                </span>
              ) : null}
              {schoolOpen && schoolResults.length > 0 ? (
                <ul id="previous-school-list" className="school-suggest-list" role="listbox">
                  {schoolResults.map((school, index) => (
                    <li key={school.id} role="option" aria-selected={index === activeSchoolIndex}>
                      <button
                        type="button"
                        className={`school-suggest-item ${index === activeSchoolIndex ? 'is-active' : ''}`}
                        onMouseEnter={() => setActiveSchoolIndex(index)}
                        onClick={() => selectPreviousSchool(school)}
                      >
                        <strong>{school.name}</strong>
                        <span>
                          {school.city} · PIN {school.pincode} · {school.board} · {school.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {errors.previousSchool && <span className="error-message">{errors.previousSchool}</span>}
            </div>
            
            <div className="form-group">
              <label>Previous Class</label>
              <select
                value={formData.previousClass}
                onChange={(e) => handleInputChange('previousClass', e.target.value)}
              >
                <option value="">Select Previous Class</option>
                {ADMISSION_CLASS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Last Exam Result</label>
              <input
                type="text"
                value={formData.lastExamResult}
                onChange={(e) => handleInputChange('lastExamResult', e.target.value)}
                placeholder="Enter last exam result/percentage"
              />
            </div>
            
            <div className="form-group full-width">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.transferCertificate}
                  onChange={(e) => handleInputChange('transferCertificate', e.target.checked)}
                />
                <span>Transfer Certificate will be provided</span>
              </label>
            </div>
          </div>
        </div>

        {/* Parent/Guardian Information Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">👨‍👩‍👧</div>
            <div>
              <h3>Parent/Guardian Information</h3>
              <p>Father, mother and guardian contact details</p>
            </div>
          </div>
          
          <div className="subsection">
            <h4>🧑 Father Information</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Father Name *</label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  className={errors.fatherName ? 'error' : ''}
                  placeholder="Enter father name"
                />
                {errors.fatherName && <span className="error-message">{errors.fatherName}</span>}
              </div>
              
              <div className="form-group">
                <label>Father Occupation</label>
                <input
                  type="text"
                  value={formData.fatherOccupation}
                  onChange={(e) => handleInputChange('fatherOccupation', e.target.value)}
                  placeholder="Enter father occupation"
                />
              </div>
              
              <div className="form-group full-width">
                <label>Father Aadhaar Number *</label>
                <div className="aadhaar-input-row">
                  <input
                    type="text"
                    value={formData.fatherAadhar}
                    onChange={(e) => handleAadharChange('fatherAadhar', e.target.value)}
                    className={errors.fatherAadhar ? 'error' : ''}
                    placeholder="XXXX XXXX XXXX"
                    maxLength="14"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="aadhaar-verify-btn"
                    onClick={() => handleAadharChange('fatherAadhar', formData.fatherAadhar)}
                  >
                    UIDAI Verify
                  </button>
                </div>
                {errors.fatherAadhar && <span className="error-message">{errors.fatherAadhar}</span>}
                {renderAadhaarExtras('fatherAadhar')}
              </div>
              
              <div className="form-group">
                <label>Father Phone *</label>
                <input
                  type="tel"
                  value={formData.fatherPhone}
                  onChange={(e) => handleInputChange('fatherPhone', e.target.value)}
                  className={errors.fatherPhone ? 'error' : ''}
                  placeholder="Enter father phone"
                />
                {errors.fatherPhone && <span className="error-message">{errors.fatherPhone}</span>}
              </div>
              
              <div className="form-group">
                <label>Father Email</label>
                <input
                  type="email"
                  value={formData.fatherEmail}
                  onChange={(e) => handleInputChange('fatherEmail', e.target.value)}
                  placeholder="Enter father email"
                />
              </div>
            </div>
          </div>
          
          <div className="subsection">
            <h4>👩 Mother Information</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Mother Name</label>
                <input
                  type="text"
                  value={formData.motherName}
                  onChange={(e) => handleInputChange('motherName', e.target.value)}
                  placeholder="Enter mother name"
                />
              </div>
              
              <div className="form-group">
                <label>Mother Occupation</label>
                <input
                  type="text"
                  value={formData.motherOccupation}
                  onChange={(e) => handleInputChange('motherOccupation', e.target.value)}
                  placeholder="Enter mother occupation"
                />
              </div>
              
              <div className="form-group full-width">
                <label>Mother Aadhaar Number</label>
                <div className="aadhaar-input-row">
                  <input
                    type="text"
                    value={formData.motherAadhar}
                    onChange={(e) => handleAadharChange('motherAadhar', e.target.value)}
                    placeholder="XXXX XXXX XXXX"
                    maxLength="14"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="aadhaar-verify-btn"
                    onClick={() => handleAadharChange('motherAadhar', formData.motherAadhar)}
                  >
                    UIDAI Verify
                  </button>
                </div>
                {renderAadhaarExtras('motherAadhar')}
              </div>
              
              <div className="form-group">
                <label>Mother Phone</label>
                <input
                  type="tel"
                  value={formData.motherPhone}
                  onChange={(e) => handleInputChange('motherPhone', e.target.value)}
                  placeholder="Enter mother phone"
                />
              </div>
              
              <div className="form-group">
                <label>Mother Email</label>
                <input
                  type="email"
                  value={formData.motherEmail}
                  onChange={(e) => handleInputChange('motherEmail', e.target.value)}
                  placeholder="Enter mother email"
                />
              </div>
            </div>
          </div>
          
          <div className="subsection">
            <div className="subsection-head">
              <h4>🤝 Guardian Information (if applicable)</h4>
              <button type="button" className="aadhaar-demo-chip" onClick={copyFatherToGuardian}>
                Copy father as guardian
              </button>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Guardian Name</label>
                <input
                  type="text"
                  value={formData.guardianName}
                  onChange={(e) => handleInputChange('guardianName', e.target.value)}
                  placeholder="Enter guardian name"
                />
              </div>
              
              <div className="form-group">
                <label>Guardian Relation</label>
                <input
                  type="text"
                  value={formData.guardianRelation}
                  onChange={(e) => handleInputChange('guardianRelation', e.target.value)}
                  placeholder="Relationship with student"
                />
              </div>
              
              <div className="form-group full-width">
                <label>Guardian Aadhaar Number</label>
                <div className="aadhaar-input-row">
                  <input
                    type="text"
                    value={formData.guardianAadhar}
                    onChange={(e) => handleAadharChange('guardianAadhar', e.target.value)}
                    placeholder="XXXX XXXX XXXX"
                    maxLength="14"
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="aadhaar-verify-btn"
                    onClick={() => handleAadharChange('guardianAadhar', formData.guardianAadhar)}
                  >
                    UIDAI Verify
                  </button>
                </div>
                {renderAadhaarExtras('guardianAadhar')}
              </div>
              
              <div className="form-group">
                <label>Guardian Phone</label>
                <input
                  type="tel"
                  value={formData.guardianPhone}
                  onChange={(e) => handleInputChange('guardianPhone', e.target.value)}
                  placeholder="Enter guardian phone"
                />
              </div>
              
              <div className="form-group">
                <label>Guardian Email</label>
                <input
                  type="email"
                  value={formData.guardianEmail}
                  onChange={(e) => handleInputChange('guardianEmail', e.target.value)}
                  placeholder="Enter guardian email"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">📝</div>
            <div>
              <h3>Additional Information</h3>
              <p>Medical details, interests and services</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Medical Conditions</label>
              <textarea
                value={formData.medicalConditions}
                onChange={(e) => handleInputChange('medicalConditions', e.target.value)}
                placeholder="Enter any medical conditions (if any)"
                rows="2"
              />
            </div>
            
            <div className="form-group full-width">
              <label>Allergies</label>
              <textarea
                value={formData.allergies}
                onChange={(e) => handleInputChange('allergies', e.target.value)}
                placeholder="Enter any allergies (if any)"
                rows="2"
              />
            </div>
            
            <div className="form-group full-width">
              <label>Special Needs</label>
              <textarea
                value={formData.specialNeeds}
                onChange={(e) => handleInputChange('specialNeeds', e.target.value)}
                placeholder="Enter any special needs or requirements"
                rows="2"
              />
            </div>
            
            <div className="form-group">
              <label>Hobbies & Interests</label>
              <input
                type="text"
                value={formData.hobbies}
                onChange={(e) => handleInputChange('hobbies', e.target.value)}
                placeholder="Enter hobbies and interests"
              />
            </div>
            
            <div className="form-group">
              <label>Languages Known</label>
              <input
                type="text"
                value={formData.languages}
                onChange={(e) => handleInputChange('languages', e.target.value)}
                placeholder="Enter languages known"
              />
            </div>

            <div className="form-group full-width">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.transportRequired}
                    onChange={(e) => handleInputChange('transportRequired', e.target.checked)}
                  />
                  <span>Transport Required</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.hostelRequired}
                    onChange={(e) => handleInputChange('hostelRequired', e.target.checked)}
                  />
                  <span>Hostel Required</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Fees & Payment Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">💳</div>
            <div>
              <h3>Fees & Payment</h3>
              <p>Professional fee breakdown and payment plan</p>
            </div>
          </div>
          <div className="fee-section-card">
            <div className="fee-grid">
              <div className="form-group">
                <label>Admission Fee</label>
                <input type="number" value={formData.admissionFee} onChange={(e) => handleInputChange('admissionFee', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Tuition Fee</label>
                <input type="number" value={formData.tuitionFee} onChange={(e) => handleInputChange('tuitionFee', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Activity Fee</label>
                <input type="number" value={formData.activityFee} onChange={(e) => handleInputChange('activityFee', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Transport Fee</label>
                <input type="number" value={formData.transportFee} onChange={(e) => handleInputChange('transportFee', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Hostel Fee</label>
                <input type="number" value={formData.hostelFee} onChange={(e) => handleInputChange('hostelFee', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Payment Mode</label>
                <select value={formData.paymentMode} onChange={(e) => handleInputChange('paymentMode', e.target.value)}>
                  <option value="full">Full Payment</option>
                  <option value="installment">Installment</option>
                  <option value="advance">Advance Payment</option>
                </select>
              </div>
              <div className="form-group">
                <label>Installment Plan</label>
                <select value={formData.installmentPlan} onChange={(e) => handleInputChange('installmentPlan', e.target.value)}>
                  <option value="One Time">One Time</option>
                  <option value="2 Installments">2 Installments</option>
                  <option value="3 Installments">3 Installments</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={formData.dueDate} onChange={(e) => handleInputChange('dueDate', e.target.value)} />
              </div>
            </div>
            <div className="fee-summary-card">
              <div>
                <p className="fee-summary-label">Estimated Total</p>
                <h4>₹{totalFees.toLocaleString()}</h4>
              </div>
              <div className="fee-summary-note">
                <p>Payment mode: {formData.paymentMode}</p>
                <p>Plan: {formData.installmentPlan}</p>
              </div>
            </div>
            <div className="form-group full-width">
              <label>Fee Notes</label>
              <textarea rows="2" value={formData.feeNotes} onChange={(e) => handleInputChange('feeNotes', e.target.value)} placeholder="Add fee notes, concessions, scholarships or payment remarks" />
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">📄</div>
            <div>
              <h3>Documents</h3>
              <p>Required documents checklist with PDF/image upload support</p>
            </div>
          </div>
          <div className="documents-checklist">
            <div className="document-upload-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.birthCertificate}
                  onChange={(e) => handleInputChange('birthCertificate', e.target.checked)}
                />
                <span>Birth Certificate</span>
              </label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('birthCertificateFile', e.target.files)} />
              {formData.birthCertificateFile && <span className="document-file-name">Selected: {formData.birthCertificateFile}</span>}
            </div>
            <div className="document-upload-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.bForm}
                  onChange={(e) => handleInputChange('bForm', e.target.checked)}
                />
                <span>B-Form</span>
              </label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('transferCertificateFile', e.target.files)} />
              {formData.transferCertificateFile && <span className="document-file-name">Selected: {formData.transferCertificateFile}</span>}
            </div>
            <div className="document-upload-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.parentCNIC}
                  onChange={(e) => handleInputChange('parentCNIC', e.target.checked)}
                />
                <span>Parent Aadhar / CNIC Copies</span>
              </label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('parentAadharFile', e.target.files)} />
              {formData.parentAadharFile && <span className="document-file-name">Selected: {formData.parentAadharFile}</span>}
            </div>
            <div className="document-upload-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.photographs}
                  onChange={(e) => handleInputChange('photographs', e.target.checked)}
                />
                <span>Recent Photographs (4)</span>
              </label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('photographFile', e.target.files)} />
              {formData.photographFile && <span className="document-file-name">Selected: {formData.photographFile}</span>}
            </div>
          </div>
        </div>

        {/* Terms and Conditions Section */}
        <div className="form-section">
          <div className="section-header">
            <div className="section-icon">⚖️</div>
            <div>
              <h3>Terms & Consent</h3>
              <p>Agreement confirmation</p>
            </div>
          </div>
          <div className="terms-content">
            <label className="checkbox-label checkbox-label--large">
              <input
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                className={errors.termsAccepted ? 'error' : ''}
              />
              <span>I accept the terms and conditions of the school admission policy</span>
            </label>
            {errors.termsAccepted && <span className="error-message">{errors.termsAccepted}</span>}
            
            <label className="checkbox-label checkbox-label--large">
              <input
                type="checkbox"
                checked={formData.dataConsent}
                onChange={(e) => handleInputChange('dataConsent', e.target.checked)}
                className={errors.dataConsent ? 'error' : ''}
              />
              <span>I consent to the processing of my personal data for admission purposes</span>
            </label>
            {errors.dataConsent && <span className="error-message">{errors.dataConsent}</span>}
          </div>
        </div>

        <div className="form-section invite-key-section">
          <div className="section-header">
            <div>
              <h3>Parent portal special key</h3>
              <p>Auto-generated key for parent account signup on this website</p>
            </div>
          </div>
          <div className="invite-key-panel">
            <p className="invite-key-copy">
              Share this key with the parent. They open Create Account → choose Parent → paste this key → verify email
              OTP, then land on their own linked parent account for this student.
            </p>
            <div className="invite-key-display">
              <code>{formData.parentInviteKey}</code>
              <div className="invite-key-actions">
                <button type="button" className="btn-secondary" onClick={copyParentKey}>
                  {keyCopied ? 'Copied' : 'Copy key'}
                </button>
                <button type="button" className="btn-secondary" onClick={regenerateParentKey}>
                  Regenerate
                </button>
              </div>
            </div>
            <p className="invite-key-note">
              Key format: SMS-PAR-XXXX-XXXX · One-time use · Saved with admission when you register the student
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions form-actions--register">
          <div className="form-actions__info">
            <h4>Ready to register this student?</h4>
            <p>Complete the admission form and confirm registration in one step.</p>
          </div>
          <div className="form-actions__buttons">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary registration-banner__button" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Register Student'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default PremiumAdmissionForm
