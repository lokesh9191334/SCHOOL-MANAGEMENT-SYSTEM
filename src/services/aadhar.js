// UIDAI Aadhar Verification Service
// Note: In production, this would connect to actual UIDAI API with proper credentials

/**
 * Validates Aadhar number format and checksum using Luhn algorithm
 */
export const validateAadharFormat = (aadhar) => {
  const cleanAadhar = aadhar.replace(/\s/g, '')
  
  // Check if 12 digits
  if (!/^\d{12}$/.test(cleanAadhar)) {
    return false
  }
  
  // Validate using Luhn algorithm (used by UIDAI)
  return validateAadharLuhn(cleanAadhar)
}

/**
 * Luhn algorithm validation for Aadhar
 * UIDAI uses a modified Luhn algorithm for Aadhar checksum validation
 */
const validateAadharLuhn = (aadhar) => {
  const digits = aadhar.split('').map(Number)
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  
  let sum = 0
  for (let i = 0; i < 11; i++) {
    let product = digits[i] * weights[i]
    // If product >= 10, add digits of product
    if (product >= 10) {
      product = Math.floor(product / 10) + (product % 10)
    }
    sum += product
  }
  
  // Calculate check digit
  const checkDigit = (12 - (sum % 12)) % 12
  
  // Verify against the last digit (checksum)
  return checkDigit === digits[11]
}

/**
 * Verifies Aadhar through UIDAI
 * Returns verification status and details
 */
export const verifyAadharWithUIDI = async (aadharNumber, personField = null) => {
  try {
    // Validate format first
    if (!validateAadharFormat(aadharNumber)) {
      return {
        verified: false,
        error: 'Invalid Aadhar format. Enter 12 digits.',
        status: 'invalid'
      }
    }

    // Simulate UIDAI verification API call
    // In production, replace with actual UIDAI API integration
    const response = await simulateUIDIVerification(aadharNumber, personField)

    return response
  } catch (error) {
    console.error('Aadhar verification error:', error)
    return {
      verified: false,
      error: 'Unable to verify Aadhar. Please try again.',
      status: 'error'
    }
  }
}

const getMockAadharProfile = (aadharNumber, personField) => {
  const cleanAadhar = aadharNumber.replace(/\s/g, '')
  const profileMap = {
    studentAadhar: {
      '111122223333': { fullName: 'Aarav Sharma', firstName: 'Aarav', lastName: 'Sharma' },
      '111122223334': { fullName: 'Ananya Sharma', firstName: 'Ananya', lastName: 'Sharma' },
      '111122223335': { fullName: 'Ishaan Verma', firstName: 'Ishaan', lastName: 'Verma' },
      '111122223336': { fullName: 'Diya Patel', firstName: 'Diya', lastName: 'Patel' },
    },
    fatherAadhar: {
      '222233334444': { fullName: 'Rohit Sharma', firstName: 'Rohit', lastName: 'Sharma' },
      '222233334445': { fullName: 'Sanjay Gupta', firstName: 'Sanjay', lastName: 'Gupta' },
      '222233334446': { fullName: 'Amit Verma', firstName: 'Amit', lastName: 'Verma' },
      '222233334447': { fullName: 'Rahul Patel', firstName: 'Rahul', lastName: 'Patel' },
    },
    motherAadhar: {
      '333344445555': { fullName: 'Neha Sharma', firstName: 'Neha', lastName: 'Sharma' },
      '333344445556': { fullName: 'Pooja Gupta', firstName: 'Pooja', lastName: 'Gupta' },
      '333344445557': { fullName: 'Kavya Verma', firstName: 'Kavya', lastName: 'Verma' },
      '333344445558': { fullName: 'Meera Patel', firstName: 'Meera', lastName: 'Patel' },
    },
    guardianAadhar: {
      '444455556666': { fullName: 'Vikram Sharma', firstName: 'Vikram', lastName: 'Sharma' },
      '444455556667': { fullName: 'Nitin Gupta', firstName: 'Nitin', lastName: 'Gupta' },
      '444455556668': { fullName: 'Harsh Verma', firstName: 'Harsh', lastName: 'Verma' },
      '444455556669': { fullName: 'Manoj Patel', firstName: 'Manoj', lastName: 'Patel' },
    },
  }

  return profileMap[personField]?.[cleanAadhar] || null
}

/**
 * Simulates UIDAI API verification
 * In production, integrate with actual UIDAI e-KYC API
 */
const simulateUIDIVerification = async (aadharNumber, personField = null) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Validate Aadhar using Luhn algorithm
      const cleanAadhar = aadharNumber.replace(/\s/g, '')
      const isValid = validateAadharLuhn(cleanAadhar)
      
      if (isValid) {
        const profile = personField ? getMockAadharProfile(cleanAadhar, personField) : null

        resolve({
          verified: true,
          status: 'verified',
          aadharNumber: cleanAadhar,
          maskedAadhar: `XXXX XXXX ${cleanAadhar.slice(-4)}`,
          message: 'Aadhar verified successfully through UIDAI',
          verifiedAt: new Date().toISOString(),
          profile,
        })
      } else {
        resolve({
          verified: false,
          status: 'failed',
          error: 'Aadhar verification failed. Invalid Aadhar number.',
          message: 'This Aadhar number is invalid. Please check and re-enter.'
        })
      }
    }, 800) // Simulate network delay
  })
}

/**
 * Format Aadhar number with spaces (XXXX XXXX XXXX)
 */
export const formatAadharNumber = (value) => {
  const cleaned = value.replace(/\D/g, '').slice(0, 12)
  let formatted = ''
  
  for (let i = 0; i < cleaned.length; i++) {
    if (i > 0 && i % 4 === 0) {
      formatted += ' '
    }
    formatted += cleaned[i]
  }
  
  return formatted
}

/**
 * Get masked Aadhar (shows only last 4 digits)
 */
export const getMaskedAadhar = (aadharNumber) => {
  const cleaned = aadharNumber.replace(/\D/g, '')
  if (cleaned.length === 12) {
    return `XXXX XXXX ${cleaned.slice(-4)}`
  }
  return ''
}
