import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { connectLambda, getStore } from '@netlify/blobs'
import { sendResultEmail } from '../../emailOtp.js'

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

async function writeJobStatus(publishId, status) {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(String(publishId || ''))) return
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })
  const key = `records/sms_results_email_jobs/${publishId}.json`
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await store.setJSON(key, status)
      return
    } catch (error) {
      console.error(`[results-email] status write attempt ${attempt} failed:`, error?.message || error)
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
  if (!signatureIsValid(rawBody, headerValue(event, 'x-results-signature'))) {
    return { statusCode: 401, body: 'Invalid signature.' }
  }

  let payload = null
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON body.' }
  }
  if (!payload || Number(payload.expiresAt) <= Date.now()) {
    return { statusCode: 400, body: 'Expired result email job.' }
  }
  const { publishId, jobs } = payload
  if (!publishId || !Array.isArray(jobs) || !jobs.length) {
    return { statusCode: 400, body: 'Incomplete result email job.' }
  }

  let status
  if (String(process.env.RESULT_MAIL_DISABLED || '') === 'true') {
    status = {
      status: 'disabled',
      recipients: 0,
      students: jobs.length,
      sent: 0,
      failed: 0,
      errors: ['Result emails are disabled on this server.'],
      updatedAt: new Date().toISOString(),
    }
  } else {
    let sent = 0
    let failed = 0
    const errors = []
    for (const job of jobs) {
      const recipients = (Array.isArray(job?.recipients) ? job.recipients : []).slice(0, 10)
      for (const to of recipients) {
        const result = await sendResultEmail({
          to,
          studentName: String(job?.studentName || 'Student').slice(0, 120),
          examTitle: String(job?.examTitle || 'Exam').slice(0, 120),
          className: String(job?.className || '').slice(0, 80),
          subjects: Array.isArray(job?.subjects) ? job.subjects : [],
          totalScored: job?.totalScored,
          totalMax: job?.totalMax,
          percent: job?.percent,
          grade: job?.grade,
          teacherName: String(job?.teacherName || '').slice(0, 120),
        })
        if (result.sent) sent += 1
        else {
          failed += 1
          if (errors.length < 5) errors.push(result.error || 'The email could not be delivered.')
        }
      }
    }
    const recipients = jobs.reduce(
      (total, job) => total + (Array.isArray(job?.recipients) ? Math.min(job.recipients.length, 10) : 0),
      0,
    )
    status = {
      status: failed ? (sent ? 'partial' : 'failed') : 'sent',
      recipients,
      students: jobs.length,
      sent,
      failed,
      errors,
      updatedAt: new Date().toISOString(),
    }
  }

  await writeJobStatus(publishId, status)
  return { statusCode: 202, body: 'Result email job processed.' }
}
