import { getApiAuthHeaders } from './apiAuth'

async function requestResults(url, options) {
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: getApiAuthHeaders(options?.headers),
    })
  } catch {
    throw new Error('Cannot reach the API server. Start the website with “npm run dev:all”.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Result request failed (${response.status})`)
  }
  return body
}

export function fetchClassResults({ className = '', examTitle = '' } = {}) {
  const params = new URLSearchParams()
  if (className) params.set('className', className)
  if (examTitle) params.set('examTitle', examTitle)
  const query = params.toString()
  return requestResults(`/api/results/class${query ? `?${query}` : ''}`)
}

export function publishResults({ examTitle, className, subjects, marks }) {
  return requestResults('/api/results/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examTitle, className, subjects, marks }),
  })
}

export function fetchMyResults() {
  return requestResults('/api/results/my')
}
