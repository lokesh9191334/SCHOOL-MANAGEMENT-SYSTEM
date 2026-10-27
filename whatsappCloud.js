/* Meta WhatsApp Cloud API sender for the daily driver tracking link.
   Credentials stay server-side; callers get actionable missing-env names,
   never the token itself. */

const REQUEST_TIMEOUT_MS = 15000
const DEFAULT_TEMPLATE_LANG = 'en'
const DEFAULT_API_VERSION = 'v20.0'

export const DAILY_TEMPLATE_BODY =
  "Hello {{1}}, today's live tracking link for bus {{2}} ({{3}}) is {{4}}. Open it before starting the trip and tap Start."

function envText(name) {
  return String(process.env[name] || '').trim()
}

export function getWhatsAppConfig() {
  return {
    accessToken: envText('WHATSAPP_ACCESS_TOKEN'),
    phoneNumberId: envText('WHATSAPP_PHONE_NUMBER_ID'),
    templateName: envText('WHATSAPP_TEMPLATE_NAME'),
    templateLang: envText('WHATSAPP_TEMPLATE_LANG') || DEFAULT_TEMPLATE_LANG,
    apiVersion: envText('WHATSAPP_API_VERSION') || DEFAULT_API_VERSION,
  }
}

/** Digits only, international format. 10-digit Indian numbers get +91 automatically. */
export function normalizeWhatsAppPhone(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10) digits = `91${digits}`
  if (!/^[1-9]\d{9,14}$/.test(digits)) return ''
  return digits
}

export function maskWhatsAppPhone(value) {
  const digits = normalizeWhatsAppPhone(value)
  if (!digits) return '—'
  return `+${digits.slice(0, 2)}••••${digits.slice(-4)}`
}

export function whatsAppConfigStatus() {
  const config = getWhatsAppConfig()
  const missing = []
  if (!config.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN')
  if (!config.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID')
  if (!config.templateName) missing.push('WHATSAPP_TEMPLATE_NAME')
  return {
    configured: missing.length === 0,
    missing,
    templateName: config.templateName || '—',
    templateLang: config.templateLang,
    apiVersion: config.apiVersion,
    templateBody: DAILY_TEMPLATE_BODY,
    templateCategory: 'Utility',
    provider: 'Meta WhatsApp Cloud API',
  }
}

function templateText(value, fallback) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 200) || fallback
}

export function buildDailyTemplatePayload({ to, driverName, vehicleLabel, routeLabel, link }) {
  const config = getWhatsAppConfig()
  const missing = []
  if (!config.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN')
  if (!config.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID')
  if (!config.templateName) missing.push('WHATSAPP_TEMPLATE_NAME')
  if (missing.length) {
    const error = new Error(`WhatsApp Cloud API is not configured. Missing: ${missing.join(', ')}.`)
    error.status = 503
    error.missing = missing
    throw error
  }

  const phone = normalizeWhatsAppPhone(to)
  if (!phone) {
    const error = new Error('A valid WhatsApp number with country code is required.')
    error.status = 400
    throw error
  }

  const trackingLink = String(link || '').trim()
  if (!/^https?:\/\//i.test(trackingLink) || trackingLink.length > 1000) {
    const error = new Error('A valid public tracking link is required for the WhatsApp message.')
    error.status = 500
    throw error
  }

  return {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: config.templateName,
      language: { code: config.templateLang },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: templateText(driverName, 'Driver') },
            { type: 'text', text: templateText(vehicleLabel, 'School bus') },
            { type: 'text', text: templateText(routeLabel, 'Route not assigned') },
            { type: 'text', text: trackingLink },
          ],
        },
      ],
    },
  }
}

export async function sendDailyTrackingWhatsApp({
  to,
  driverName,
  vehicleLabel,
  routeLabel,
  link,
  fetchImpl = globalThis.fetch,
}) {
  const config = getWhatsAppConfig()
  const payload = buildDailyTemplatePayload({ to, driverName, vehicleLabel, routeLabel, link })
  if (typeof fetchImpl !== 'function') {
    throw new Error('No fetch implementation is available for the WhatsApp request.')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetchImpl(
      `https://graph.facebook.com/${config.apiVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    )
    const text = await response.text()
    let body = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = null
    }

    if (!response.ok) {
      const message = body?.error?.message || `WhatsApp API returned HTTP ${response.status}.`
      const error = new Error(String(message).replace(/\s+/g, ' ').trim().slice(0, 280))
      error.status = response.status
      error.graphCode = body?.error?.code
      throw error
    }

    const messageId = body?.messages?.[0]?.id
    if (!messageId) throw new Error('WhatsApp API did not return a message id.')
    return { ok: true, messageId: String(messageId), at: new Date().toISOString() }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('WhatsApp API did not respond in time.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
