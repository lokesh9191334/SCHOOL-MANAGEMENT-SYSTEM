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
