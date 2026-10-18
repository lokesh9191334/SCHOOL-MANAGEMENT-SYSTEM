import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { connectLambda, getStore } from '@netlify/blobs'
import { buildAcademicPdf } from '../../academicDocs.js'
import { sendAcademicDocumentEmails } from '../../academicMailer.js'

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

async function writeJobStatus(docId, status) {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(String(docId || ''))) return
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })
  const key = `records/sms_academic_email_jobs/${docId}.json`
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await store.setJSON(key, status)
      return
    } catch (error) {
      console.error(`[academic-email] status write attempt ${attempt} failed:`, error?.message || error)
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
  if (!signatureIsValid(rawBody, headerValue(event, 'x-academic-signature'))) {
    return { statusCode: 401, body: 'Invalid signature.' }
  }

  let payload = null
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON body.' }
  }
  if (!payload || Number(payload.expiresAt) <= Date.now()) {
    return { statusCode: 400, body: 'Expired email job.' }
  }
  const { docId, docModel, recipients, attachmentName } = payload
  if (!docId || !docModel || !Array.isArray(recipients) || !recipients.length) {
    return { statusCode: 400, body: 'Incomplete email job.' }
  }

  let status
  if (String(process.env.ACADEMIC_MAIL_DISABLED || '') === 'true') {
    status = {
      status: 'disabled',
      recipients: recipients.length,
      sent: 0,
      failed: 0,
      errors: ['Email delivery is disabled on this server.'],
      publishedAt: docModel.publishedAt,
      updatedAt: new Date().toISOString(),
    }
  } else {
    try {
      const pdfBuffer = buildAcademicPdf(docModel)
      status = await sendAcademicDocumentEmails({
        docModel,
        recipients,
        pdfBuffer,
        attachmentName: String(attachmentName || 'Academic_Document.pdf'),
      })
      status.publishedAt = docModel.publishedAt
    } catch (error) {
      console.error('[academic-email] job failed:', error?.message || error)
      status = {
        status: 'failed',
        recipients: recipients.length,
        sent: 0,
        failed: recipients.length,
        errors: [error?.message || 'The email job failed.'],
        publishedAt: docModel.publishedAt,
        updatedAt: new Date().toISOString(),
      }
    }
  }

  await writeJobStatus(docId, status)
  return { statusCode: 202, body: 'Email job processed.' }
}
