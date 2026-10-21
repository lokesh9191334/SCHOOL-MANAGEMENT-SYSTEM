import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { connectLambda, getStore } from '@netlify/blobs'
import { sendEventEmail } from '../../emailOtp.js'

const STORE_NAME = 'school-management-system-data'

function headerValue(event, name) {
  const headers = event?.headers || {}
  const wanted = name.toLowerCase()
  const key = Object.keys(headers).find((entry) => entry.toLowerCase() === wanted)
  return key ? String(headers[key] || '') : ''
}

function signatureIsValid(rawBody, provided) {
  const secret = String(process.env.AUTH_TOKEN_SECRET || '')
  if (!secret || !provided) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('base64url')
  const expectedBuffer = Buffer.from(expected)
  const providedBuffer = Buffer.from(provided)
  if (expectedBuffer.length !== providedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, providedBuffer)
}

async function writeJobStatus(eventId, status) {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(String(eventId || ''))) return
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })
  const key = `records/sms_events_email_jobs/${eventId}.json`
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await store.setJSON(key, status)
      return
    } catch (error) {
      console.error(`[events-email] status write attempt ${attempt} failed:`, error?.message || error)
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750))
    }
  }
}

export async function handler(event) {
  if (event?.blobs) {
    try {
      connectLambda(event)
    } catch {
      /* automatic Blobs context is used when connectLambda is not needed */
    }
  }

  const rawBody = event?.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : String(event?.body || '')
  if (!signatureIsValid(rawBody, headerValue(event, 'x-events-signature'))) {
    return { statusCode: 401, body: 'Invalid signature.' }
  }

  let payload = null
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON body.' }
  }
  if (!payload || Number(payload.expiresAt) <= Date.now()) {
    return { statusCode: 400, body: 'Expired event email job.' }
  }
  const { eventId, eventModel, recipients } = payload
  if (!eventId || !eventModel || !Array.isArray(recipients) || !recipients.length) {
    return { statusCode: 400, body: 'Incomplete event email job.' }
  }

  let status
  if (String(process.env.EVENT_MAIL_DISABLED || '') === 'true') {
    status = {
      status: 'disabled',
      recipients: recipients.length,
      sent: 0,
      failed: 0,
      errors: ['Event emails are disabled on this server.'],
      publishedAt: eventModel.publishedAt,
      updatedAt: new Date().toISOString(),
    }
  } else {
    let sent = 0
    let failed = 0
    const errors = []
    for (const to of recipients.slice(0, 500)) {
      let result = await sendEventEmail({
        to,
        title: String(eventModel.title || 'School event').slice(0, 120),
        type: String(eventModel.type || 'other'),
        date: String(eventModel.date || ''),
        time: String(eventModel.time || ''),
        venue: String(eventModel.venue || ''),
        description: String(eventModel.description || ''),
        publishedByName: String(eventModel.publishedByName || ''),
      })
      if (!result.sent) {
        console.error('[events-email] first attempt failed, retrying:', to, result.error || '')
        await new Promise((resolve) => setTimeout(resolve, 1200))
        result = await sendEventEmail({
          to,
          title: String(eventModel.title || 'School event').slice(0, 120),
          type: String(eventModel.type || 'other'),
          date: String(eventModel.date || ''),
          time: String(eventModel.time || ''),
          venue: String(eventModel.venue || ''),
          description: String(eventModel.description || ''),
          publishedByName: String(eventModel.publishedByName || ''),
        })
      }
      if (result.sent) sent += 1
      else {
        failed += 1
        console.error('[events-email] delivery failed after retry:', to, result.error || '')
        if (errors.length < 5) errors.push(result.error || 'The email could not be delivered.')
      }
    }
    status = {
      status: failed ? (sent ? 'partial' : 'failed') : 'sent',
      recipients: recipients.length,
      sent,
      failed,
      errors,
      publishedAt: eventModel.publishedAt,
      updatedAt: new Date().toISOString(),
    }
  }

  await writeJobStatus(eventId, status)
  return { statusCode: 202, body: 'Event email job processed.' }
}
