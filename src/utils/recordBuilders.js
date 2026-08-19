export function buildStudentRecord(formValues, index) {
  const cls =
    formValues.applyingForClass ||
    formValues.studentClass ||
    formValues.applyClass ||
    'N/A'
  const first = formValues.firstName || 'New'
  const last = formValues.lastName || 'Student'
  return {
    id: `STU-${1001 + index}`,
    title: `${first} ${last}`.trim(),
    subtitle: `Class ${cls}`,
    primary: formValues.guardianName || formValues.guardian || formValues.fatherName || 'Parent',
    status: 'Active',
    owner: formValues.guardianEmail || formValues.email || 'guardian@example.com',
    tone: 'success',
    firstName: first,
    lastName: last,
    dateOfBirth: formValues.dateOfBirth,
    gender: formValues.gender,
    bloodGroup: formValues.bloodGroup,
    nationality: formValues.nationality,
    religion: formValues.religion,
    caste: formValues.caste,
    email: formValues.email,
    phone: formValues.phone,
    emergencyContact: formValues.emergencyContact,
    emergencyRelation: formValues.emergencyRelation,
    currentAddress: formValues.currentAddress,
    currentPostalCode: formValues.currentPostalCode,
    currentState: formValues.currentState,
    currentDistrict: formValues.currentDistrict,
    currentAreaName: formValues.currentAreaName,
    permanentAddress: formValues.permanentAddress,
    permanentPostalCode: formValues.permanentPostalCode,
    permanentState: formValues.permanentState,
    permanentDistrict: formValues.permanentDistrict,
    permanentAreaName: formValues.permanentAreaName,
    postalCode: formValues.currentPostalCode || formValues.postalCode,
    state: formValues.currentState || formValues.state,
    district: formValues.currentDistrict || formValues.district,
    areaName: formValues.currentAreaName || formValues.areaName,
    previousSchool: formValues.previousSchool,
    previousClass: formValues.previousClass,
    lastExamResult: formValues.lastExamResult,
    fatherName: formValues.fatherName,
    fatherOccupation: formValues.fatherOccupation,
    fatherPhone: formValues.fatherPhone,
    fatherEmail: formValues.fatherEmail,
    motherName: formValues.motherName,
    motherOccupation: formValues.motherOccupation,
    motherPhone: formValues.motherPhone,
    motherEmail: formValues.motherEmail,
    transportRequired: formValues.transportRequired,
    transportRoute: formValues.transportRoute,
    hostelRequired: formValues.hostelRequired,
    hostelRoomType: formValues.hostelRoomType,
    medicalInfoRequired: formValues.medicalInfoRequired,
    medicalConditions: formValues.medicalConditions,
    allergies: formValues.allergies,
    specialNeeds: formValues.specialNeeds,
    languages: formValues.languages,
    studentPhotoUrl: formValues.studentPhotoUrl,
    admissionFee: formValues.admissionFee,
    tuitionFee: formValues.tuitionFee,
    activityFee: formValues.activityFee,
    transportFee: formValues.transportFee,
    hostelFee: formValues.hostelFee,
    paymentMode: formValues.paymentMode,
    installmentPlan: formValues.installmentPlan,
    dueDate: formValues.dueDate,
    feeNotes: formValues.feeNotes,
  }
}

export function buildAdmissionRecord(formValues, index) {
  const cls = formValues.applyingForClass || formValues.applyClass || 'N/A'
  const first = formValues.firstName || 'Applicant'
  const last = formValues.lastName || ''
  return {
    id: `ADM-${301 + index}`,
    title: `${first} ${last}`.trim(),
    subtitle: `Applied for ${cls}`,
    primary: formValues.guardianName || formValues.guardian || formValues.fatherName || 'Parent',
    status: 'Draft Created',
    owner: formValues.guardianEmail || formValues.email || 'guardian@example.com',
    tone: 'warning',
  }
}

export function buildTeacherRecord(formValues, index) {
  return {
    id: `TCH-${501 + index}`,
    title: `${formValues.name || 'Staff'}`.trim(),
    subtitle: formValues.subject || 'General',
    primary: formValues.email || '—',
    status: formValues.status || 'Active',
    owner: formValues.phone || '—',
    tone: formValues.status === 'On leave' ? 'warning' : 'success',
  }
}
