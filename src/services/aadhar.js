/**
 * UIDAI-style Aadhaar verification helpers.
 * Production note: real e-KYC needs UIDAI/AUA licensed APIs + consent/OTP.
 * This app validates checksum with Verhoeff (UIDAI standard) and simulates KYC autofill.
 */

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

export function cleanAadhaar(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 12)
}

export function validateAadharFormat(aadhar) {
  const clean = cleanAadhaar(aadhar)
  if (!/^\d{12}$/.test(clean)) return false
  return validateAadhaarVerhoeff(clean)
}

/** UIDAI checksum: Verhoeff algorithm */
export function validateAadhaarVerhoeff(aadhaar) {
  const clean = cleanAadhaar(aadhaar)
  if (!/^\d{12}$/.test(clean)) return false

  let c = 0
  const reversed = clean.split('').reverse().map(Number)
  for (let i = 0; i < reversed.length; i += 1) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]]
  }
  return c === 0
}

/** Build a Verhoeff-valid 12-digit demo Aadhaar from an 11-digit base */
export function makeValidAadhaar(base11) {
  const base = String(base11).replace(/\D/g, '').padStart(11, '0').slice(0, 11)
  for (let check = 0; check <= 9; check += 1) {
    const candidate = `${base}${check}`
    if (validateAadhaarVerhoeff(candidate)) return candidate
  }
  return `${base}0`
}

export const DEMO_AADHAAR = {
  studentAadhar: [
    { number: makeValidAadhaar('23456789012'), label: 'Student demo 1', firstName: 'Aarav', lastName: 'Sharma', gender: 'Male', dateOfBirth: '2014-05-12', bloodGroup: 'B+' },
    { number: makeValidAadhaar('34567890123'), label: 'Student demo 2', firstName: 'Ananya', lastName: 'Mehta', gender: 'Female', dateOfBirth: '2015-09-03', bloodGroup: 'O+' },
    { number: makeValidAadhaar('45678901234'), label: 'Student demo 3', firstName: 'Ishaan', lastName: 'Verma', gender: 'Male', dateOfBirth: '2013-01-21', bloodGroup: 'A+' },
  ],
  fatherAadhar: [
    { number: makeValidAadhaar('56789012345'), label: 'Father demo 1', fullName: 'Rohit Sharma', phone: '9876541001', email: 'rohit.sharma@example.com' },
    { number: makeValidAadhaar('67890123456'), label: 'Father demo 2', fullName: 'Sanjay Mehta', phone: '9876541002', email: 'sanjay.mehta@example.com' },
  ],
  motherAadhar: [
    { number: makeValidAadhaar('78901234567'), label: 'Mother demo 1', fullName: 'Neha Sharma', phone: '9876541011', email: 'neha.sharma@example.com' },
    { number: makeValidAadhaar('89012345678'), label: 'Mother demo 2', fullName: 'Pooja Mehta', phone: '9876541012', email: 'pooja.mehta@example.com' },
  ],
  guardianAadhar: [
    { number: makeValidAadhaar('90123456789'), label: 'Guardian demo', fullName: 'Vikram Sharma', phone: '9876541021', email: 'vikram.sharma@example.com', relation: 'Uncle' },
  ],
}

function findDemoProfile(aadhaarNumber, personField) {
  const clean = cleanAadhaar(aadhaarNumber)
  const list = DEMO_AADHAAR[personField] || []
  return list.find((item) => item.number === clean) || null
}

function buildGenericProfile(aadhaarNumber, personField) {
  const clean = cleanAadhaar(aadhaarNumber)
  const tail = clean.slice(-4)
  if (personField === 'studentAadhar') {
    return {
      firstName: 'Student',
      lastName: tail,
      fullName: `Student ${tail}`,
      gender: Number(tail) % 2 === 0 ? 'Female' : 'Male',
      dateOfBirth: '',
      bloodGroup: '',
    }
  }
  if (personField === 'fatherAadhar') {
    return { fullName: `Father ${tail}`, phone: '', email: '' }
  }
  if (personField === 'motherAadhar') {
    return { fullName: `Mother ${tail}`, phone: '', email: '' }
  }
  return { fullName: `Guardian ${tail}`, phone: '', email: '', relation: 'Guardian' }
}

/**
 * Verifies Aadhaar through UIDAI-style checksum + simulated KYC profile.
 */
export async function verifyAadharWithUIDI(aadharNumber, personField = null) {
  try {
    const clean = cleanAadhaar(aadharNumber)

    if (clean.length !== 12) {
      return {
        verified: false,
        status: 'invalid',
        error: 'Enter a complete 12-digit Aadhaar number.',
      }
    }

    if (!validateAadhaarVerhoeff(clean)) {
      return {
        verified: false,
        status: 'invalid',
        error: 'UIDAI checksum failed. This Aadhaar number is invalid.',
        message: 'UIDAI Verhoeff validation failed. Please check the number.',
      }
    }

    // Optional server proxy (falls back to local simulation)
    try {
      const response = await fetch('/api/aadhaar/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar: clean, personField }),
      })
      if (response.ok) {
        const payload = await response.json()
        if (payload && payload.verified === true) {
          const demo = personField ? findDemoProfile(clean, personField) : null
          const profile =
            payload.profile ||
            (demo
              ? {
                  firstName: demo.firstName || '',
                  lastName: demo.lastName || '',
                  fullName: demo.fullName || `${demo.firstName || ''} ${demo.lastName || ''}`.trim(),
                  gender: demo.gender || '',
                  dateOfBirth: demo.dateOfBirth || '',
                  bloodGroup: demo.bloodGroup || '',
                  phone: demo.phone || '',
                  email: demo.email || '',
                  relation: demo.relation || '',
                }
              : buildGenericProfile(clean, personField))

          return {
            ...payload,
            profile,
            message: payload.message || 'Aadhaar verified successfully through UIDAI.',
            maskedAadhar: payload.maskedAadhar || `XXXX XXXX ${clean.slice(-4)}`,
          }
        }
        if (payload && payload.verified === false) {
          return payload
        }
      }
    } catch {
      /* use local simulation */
    }

    await new Promise((resolve) => setTimeout(resolve, 700))

    const demo = personField ? findDemoProfile(clean, personField) : null
    const profile = demo
      ? {
          firstName: demo.firstName || '',
          lastName: demo.lastName || '',
          fullName: demo.fullName || `${demo.firstName || ''} ${demo.lastName || ''}`.trim(),
          gender: demo.gender || '',
          dateOfBirth: demo.dateOfBirth || '',
          bloodGroup: demo.bloodGroup || '',
          phone: demo.phone || '',
          email: demo.email || '',
          relation: demo.relation || '',
        }
      : buildGenericProfile(clean, personField)

    return {
      verified: true,
      status: 'verified',
      aadharNumber: clean,
      maskedAadhar: `XXXX XXXX ${clean.slice(-4)}`,
      message: 'Aadhaar verified successfully via UIDAI checksum + KYC simulation.',
      verifiedAt: new Date().toISOString(),
      uidaiRef: `UIDAI-SIM-${clean.slice(-6)}-${Date.now().toString().slice(-4)}`,
      profile,
    }
  } catch (error) {
    console.error('Aadhaar verification error:', error)
    return {
      verified: false,
      status: 'error',
      error: 'Unable to verify Aadhaar right now. Please try again.',
    }
  }
}

export function formatAadharNumber(value) {
  const cleaned = cleanAadhaar(value)
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function getMaskedAadhar(aadharNumber) {
  const cleaned = cleanAadhaar(aadharNumber)
  if (cleaned.length === 12) return `XXXX XXXX ${cleaned.slice(-4)}`
  return ''
}

/** Keep old export name used across the app */
export const validateAadharLuhn = validateAadhaarVerhoeff
