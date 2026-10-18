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

export async function listAcademicDocuments(type) {
  const filter = type && type !== 'all' ? `?type=${encodeURIComponent(type)}` : ''
  const response = await fetch(`/api/academic-documents${filter}`, {
    headers: getApiAuthHeaders(),
  })
  const body = await parseResponse(response)
  return Array.isArray(body) ? body : []
}

export async function publishTimetable({ grade, section }) {
  const response = await fetch('/api/academic-documents/timetable/publish', {
    method: 'POST',
    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ grade, section }),
  })
  return parseResponse(response)
}

export async function publishDatesheet({ examName, className, rows }) {
  const response = await fetch('/api/academic-documents/datesheet', {
    method: 'POST',
    headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ examName, className, rows }),
  })
  return parseResponse(response)
}

export function academicPdfName(doc) {
  const label = [doc?.title, doc?.subtitle]
    .filter(Boolean)
    .join(' ')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'Academic_Document'
  const stamp = String(doc?.publishedAt || '').slice(0, 10)
  return `${label}${stamp ? `_${stamp}` : ''}.pdf`
}

export function publishResultMessage(body, label = 'Document') {
  if (!body) return `${label} published.`
  if (body.unchanged) {
    return `${label} saved. Nothing changed since the last published version, so no new email was sent.`
  }
  const email = body.email || {}
  const recipients = Number(email.recipients) || 0
  const sent = Number(email.sent) || 0
  switch (email.status) {
    case 'queued':
      return `${label} published to the portal. The PDF is being emailed to ${recipients} parent and super admin address${recipients === 1 ? '' : 'es'}.`
    case 'sent':
      return recipients
        ? `${label} published and emailed to ${sent} of ${recipients} recipient${recipients === 1 ? '' : 's'}.`
        : `${label} published. No parent email addresses are on record yet, so no email was sent.`
    case 'partial':
      return `${label} published. Email reached ${sent} of ${recipients} recipients — check the server log for the failed addresses.`
    case 'unavailable':
      return `${label} published to the portal. Email is not configured on the server, so no emails were sent.`
    case 'disabled':
      return `${label} published to the portal. Email delivery is disabled on the server.`
    case 'failed':
      return `${label} published to the portal, but email delivery failed.`
    default:
      return `${label} published.`
  }
}


async function fetchAcademicPdf(doc) {
  const response = await fetch(`/api/academic-documents/${encodeURIComponent(doc.id)}/pdf`, {
    headers: getApiAuthHeaders(),
  })
  if (!response.ok) {
    let message = `Could not open the PDF (${response.status}).`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      /* response was not JSON */
    }
    throw new Error(message)
  }
  return response.blob()
}

function triggerBlobLink(url, { download, filename }) {
  const link = document.createElement('a')
  link.href = url
  if (download) {
    link.download = filename
  } else {
    link.target = '_blank'
    link.rel = 'noopener'
  }
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function academicPdfObjectUrl(doc) {
  const blob = await fetchAcademicPdf(doc)
  return URL.createObjectURL(blob)
}

export async function downloadAcademicPdf(doc) {
  const blob = await fetchAcademicPdf(doc)
  const url = URL.createObjectURL(blob)
  triggerBlobLink(url, { download: true, filename: academicPdfName(doc) })
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
