/**
 * Lookup Indian PIN code details via postalpincode.in
 * @param {string} pincode
 */
export async function lookupIndianPincode(pincode) {
  const cleaned = String(pincode).replace(/\D/g, '')
  if (cleaned.length !== 6) {
    return { error: 'Enter a valid 6-digit PIN code' }
  }

  try {
    const response = await fetch(`/api/pincode/${cleaned}`)
    if (!response.ok) {
      return { error: 'Could not fetch PIN code details' }
    }

    const payload = await response.json()
    const result = Array.isArray(payload) ? payload[0] : payload

    if (result?.Status !== 'Success' || !result?.PostOffice?.length) {
      return { error: result?.Message || 'PIN code not found' }
    }

    const office = result.PostOffice[0]
    return {
      state: office.State || '',
      district: office.District || '',
      areaName: office.Name || '',
    }
  } catch {
    return { error: 'Network error while looking up PIN code' }
  }
}
