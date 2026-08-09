/**
 * Lookup Indian PIN code details via postalpincode.in (proxied by server)
 * with offline fallback for common demo PIN codes.
 */
const LOCAL_PINCODES = {
  '110001': { state: 'Delhi', district: 'New Delhi', areaName: 'Connaught Place' },
  '400001': { state: 'Maharashtra', district: 'Mumbai', areaName: 'Fort' },
  '560001': { state: 'Karnataka', district: 'Bengaluru', areaName: 'Gandhinagar' },
  '700001': { state: 'West Bengal', district: 'Kolkata', areaName: 'BBD Bagh' },
  '600001': { state: 'Tamil Nadu', district: 'Chennai', areaName: 'Parrys' },
  '500001': { state: 'Telangana', district: 'Hyderabad', areaName: 'Abids' },
  '380001': { state: 'Gujarat', district: 'Ahmedabad', areaName: 'Khadia' },
  '302001': { state: 'Rajasthan', district: 'Jaipur', areaName: 'Pink City' },
  '411001': { state: 'Maharashtra', district: 'Pune', areaName: 'Pune City' },
  '226001': { state: 'Uttar Pradesh', district: 'Lucknow', areaName: 'Hazratganj' },
}

export async function lookupIndianPincode(pincode) {
  const cleaned = String(pincode).replace(/\D/g, '')
  if (cleaned.length !== 6) {
    return { error: 'Enter a valid 6-digit PIN code' }
  }

  try {
    const response = await fetch(`/api/pincode/${cleaned}`)
    if (response.ok) {
      const payload = await response.json()
      const result = Array.isArray(payload) ? payload[0] : payload

      if (result?.Status === 'Success' && result?.PostOffice?.length) {
        const office = result.PostOffice[0]
        return {
          state: office.State || '',
          district: office.District || '',
          areaName: office.Name || '',
        }
      }
    }
  } catch {
    /* fall through to local */
  }

  if (LOCAL_PINCODES[cleaned]) {
    return { ...LOCAL_PINCODES[cleaned], offline: true }
  }

  return { error: 'PIN code not found. Try another code or fill address manually.' }
}
