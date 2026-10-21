import { getApiAuthHeaders } from './apiAuth'

async function parseResponse(response) {
  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }
  if (!response.ok) {
    throw new Error(body?.error || `Request failed (${response.status}).`)
  }
  return body
}

export async function listEvents() {
  const response = await fetch('/api/events', { headers: getApiAuthHeaders() })
  const body = await parseResponse(response)
  return Array.isArray(body) ? body : []
}

export async function saveEvent(payload) {
  const response = await fetch('/api/events', {
    method: 'POST',
    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  return parseResponse(response)
}

export async function publishEvent(id) {
  const response = await fetch(`/api/events/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    headers: getApiAuthHeaders(),
  })
  return parseResponse(response)
}

export async function deleteEvent(id) {
  const response = await fetch(`/api/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getApiAuthHeaders(),
  })
  return parseResponse(response)
}

export function eventEmailMessage(email) {
  if (!email) return ''
  const recipients = `${email.recipients} recipient${email.recipients === 1 ? '' : 's'}`
  switch (email.status) {
    case 'queued':
      return `Event published. Invitations are being emailed to ${recipients} automatically.`
    case 'sent':
      return email.recipients
        ? `Event published and emailed to ${recipients}.`
        : 'Event published. No parent or teacher email addresses are on record yet.'
    case 'partial':
      return `Event published. Email reached ${email.sent} of ${email.recipients} recipients.`
    case 'failed':
      return `Event published to the portal, but the email could not be delivered. ${email.errors?.[0] || ''}`.trim()
    case 'disabled':
      return 'Event published to the portal. Email delivery is disabled on this server.'
    default:
      return 'Event published.'
  }
}
