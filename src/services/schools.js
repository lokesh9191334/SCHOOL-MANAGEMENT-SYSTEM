import { PREVIOUS_SCHOOLS, searchPreviousSchools } from '../data/previousSchools'

/** Instant local search — API is optional enrichment only. */
export function lookupSchools(query) {
  const q = String(query || '').trim()
  if (q.length < 1) return { schools: [], source: 'idle' }

  const local = searchPreviousSchools(q, { limit: 15 })
  return { schools: local, source: 'local' }
}

export async function lookupSchoolsAsync(query) {
  const q = String(query || '').trim()
  if (q.length < 1) return { schools: [], source: 'idle' }

  const local = searchPreviousSchools(q, { limit: 15 })

  try {
    const res = await fetch(`/api/schools?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const data = await res.json()
      const remote = Array.isArray(data?.schools) ? data.schools : []
      if (remote.length) {
        const seen = new Set(remote.map((s) => s.id || s.name))
        const merged = [...remote]
        local.forEach((school) => {
          const key = school.id || school.name
          if (!seen.has(key)) merged.push(school)
        })
        return { schools: merged.slice(0, 15), source: 'api' }
      }
    }
  } catch {
    /* keep local */
  }

  return { schools: local, source: 'local' }
}

export function getAllSchools() {
  return PREVIOUS_SCHOOLS
}
