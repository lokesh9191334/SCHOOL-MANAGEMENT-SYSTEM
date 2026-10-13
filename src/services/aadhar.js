/**
 * Aadhaar checksum helpers (Verhoeff — the same algorithm UIDAI numbers follow).
 * This app does NOT verify Aadhaar with UIDAI: there is no KYC, no profile
 * lookup and no UIDAI reference. It only catches typos via the checksum.
 */

import { getApiAuthHeaders } from './apiAuth'

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

function localChecksumResult(clean) {
  if (!validateAadhaarVerhoeff(clean)) {
    return {
      valid: false,
      status: 'invalid',
      error: 'Aadhaar checksum failed. Check the number for typos.',
    }
  }
  return {
    valid: true,
    status: 'checksum-valid',
    aadhaarNumber: clean,
    maskedAadhar: `XXXX XXXX ${clean.slice(-4)}`,
    message:
      'Aadhaar format and checksum are valid. This is a typo check only — the app does not verify Aadhaar with UIDAI.',
    checkedAt: new Date().toISOString(),
  }
}

/**
 * Check an Aadhaar number's Verhoeff checksum. Asks the server first so the
 * same rule applies everywhere; falls back to the identical local check when
 * the server is unreachable.
 */
export async function checkAadhaar(aadharNumber) {
  try {
    const clean = cleanAadhaar(aadharNumber)

    if (clean.length !== 12) {
      return {
        valid: false,
        status: 'invalid',
        error: 'Enter the complete 12-digit Aadhaar number.',
      }
    }

    try {
      const response = await fetch('/api/aadhaar/verify', {
        method: 'POST',
        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ aadhaar: clean }),
      })
      const payload = await response.json().catch(() => null)
      if (payload && typeof payload.valid === 'boolean') {
        return payload.valid ? payload : { ...payload, status: payload.status || 'invalid' }
      }
    } catch {
      /* fall back to the local checksum */
    }

    return localChecksumResult(clean)
  } catch (error) {
    console.error('Aadhaar checksum check error:', error)
    return {
      valid: false,
      status: 'error',
      error: 'Could not check the Aadhaar number right now. Please try again.',
    }
  }
}
