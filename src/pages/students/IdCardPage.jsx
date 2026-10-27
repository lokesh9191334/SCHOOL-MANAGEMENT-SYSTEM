import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchStudents } from '../../services/students'
import { STORAGE_KEYS } from '../../utils/constants'
import {
  clearSchoolIdentity,
  readSchoolIdentity,
  schoolForCard,
  writeSchoolIdentity,
} from '../../utils/schoolIdentity'
import {
  academicSession,
  cardValidTill,
  isStudentCardReady,
  studentCardNumber,
  studentClassLabel,
  studentDisplayName,
} from '../../utils/studentCard'
import { IdCardPrintSheet, StudentIdCard } from '../../components/StudentIdCard'
import { useCardPrint } from '../../hooks/useCardPrint'
import './IdCardPage.css'

function readCachedStudents() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.students) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function studentMeta(student) {
  return [studentClassLabel(student), student.rollNo && `Roll ${student.rollNo}`]
    .filter((part) => part && part !== 'Roll undefined')
    .join(' · ')
}

function initialsOf(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function completenessGaps(student) {
  const gaps = []
  if (!String(student?.studentPhotoUrl || '').trim()) gaps.push('photo')
  if (!String(student?.bloodGroup || '').trim()) gaps.push('blood group')
  if (!String(student?.dateOfBirth || '').trim()) gaps.push('date of birth')
  if (!String(student?.currentAddress || student?.permanentAddress || '').trim()) gaps.push('address')
  if (!String(student?.fatherName || student?.guardianName || '').trim()) gaps.push('guardian name')
  return gaps
}

const EMPTY_IDENTITY = { name: '', address: '', phone: '', website: '' }

export default function IdCardPage() {
  const [searchParams] = useSearchParams()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [selectedId, setSelectedId] = useState(() => searchParams.get('student') || '')
  const [side, setSide] = useState('front')
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkIds, setBulkIds] = useState(() => new Set())
  const [printList, setPrintList] = useState([])
  const [identity, setIdentity] = useState(() => readSchoolIdentity())
  const [identityDraft, setIdentityDraft] = useState(() => readSchoolIdentity())
  const [identityOpen, setIdentityOpen] = useState(false)
  const [pageNotice, setPageNotice] = useState('')

  const requestPrint = useCardPrint()
  const school = useMemo(() => schoolForCard(identity), [identity])
  const session = useMemo(() => academicSession(), [])
  const validTill = useMemo(() => cardValidTill(), [])

  useEffect(() => {
    let active = true
    fetchStudents()
      .then((list) => {
        if (!active) return
        setStudents(Array.isArray(list) ? list : [])
        setNotice('')
      })
      .catch((err) => {
        if (!active) return
        const cached = readCachedStudents()
        setStudents(cached)
        setNotice(
          cached.length
            ? 'Live student server is not reachable — showing the last saved copy on this device.'
            : err?.message || 'Student records could not be loaded.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadToken])

  const classOptions = useMemo(() => {
    const values = new Set()
    students.forEach((student) => {
      const label = studentClassLabel(student)
      if (label && label !== '—') values.add(label)
    })
    return [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [students])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students
      .filter((student) => (classFilter ? studentClassLabel(student) === classFilter : true))
      .filter((student) => {
        if (!q) return true
        const haystack = [
          studentDisplayName(student),
          studentCardNumber(student),
          studentClassLabel(student),
          student.rollNo,
          student.fatherName,
          student.guardianName,
          student.phone,
          student.fatherPhone,
          student.applicationId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => {
        const classOrder = studentClassLabel(a).localeCompare(studentClassLabel(b), undefined, { numeric: true })
        if (classOrder !== 0) return classOrder
        return studentDisplayName(a).localeCompare(studentDisplayName(b))
      })
  }, [students, classFilter, query])

  const selected =
    students.find((student) => String(student.id) === selectedId) || filtered[0] || students[0] || null

  const selectedKeys = useMemo(() => {
    const map = new Map()
    students.forEach((student) => map.set(String(student.id), student))
    return map
  }, [students])

  const bulkStudents = useMemo(
    () => [...bulkIds].map((id) => selectedKeys.get(id)).filter(Boolean),
    [bulkIds, selectedKeys],
  )

  const stats = useMemo(() => {
    const ready = students.filter(isStudentCardReady).length
    const missingPhoto = students.filter((student) => !String(student?.studentPhotoUrl || '').trim()).length
    return [
      { label: 'Students', value: students.length, hint: 'Real registry records' },
      { label: 'Print ready', value: ready, hint: 'Photo + class on file' },
      { label: 'Missing photo', value: missingPhoto, hint: 'Card prints without a photo' },
      { label: 'Classes', value: classOptions.length, hint: 'Distinct classes' },
    ]
  }, [students, classOptions])

  const gaps = selected ? completenessGaps(selected) : []

  const handlePrint = (list) => {
    if (!list.length) return
    setPageNotice('')
    setPrintList(list)
    window.setTimeout(() => requestPrint(list), 220)
  }

  const toggleBulk = (id) => {
    setBulkIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setBulkIds((prev) => {
      const allSelected = filtered.length > 0 && filtered.every((student) => prev.has(String(student.id)))
      if (allSelected) return new Set()
      const next = new Set(prev)
      filtered.forEach((student) => next.add(String(student.id)))
      return next
    })
  }

  const saveIdentity = (event) => {
    event.preventDefault()
    const saved = writeSchoolIdentity(identityDraft)
    setIdentity(saved)
    setIdentityOpen(false)
    setPageNotice('School identity saved — it will appear on every card and print sheet.')
  }

  const resetIdentity = () => {
    clearSchoolIdentity()
    setIdentity({ ...EMPTY_IDENTITY })
    setIdentityDraft({ ...EMPTY_IDENTITY })
    setPageNotice('School identity reset.')
  }

  const openIdentityEditor = () => {
    setIdentityDraft({ ...identity })
    setIdentityOpen((open) => !open)
  }

  return (
    <div className="idc-page">
      <section className="idc-hero">
        <div className="idc-hero__main">
          <img className="idc-hero__crest" src="/brand/sms-mark.svg" alt="" />
          <div>
            <p className="idc-hero__kicker">Student management · Identity</p>
            <h2>Student ID Card Studio</h2>
            <p>
              Generate print-ready identity cards from live student records. Choose a student, check the photo and
              details, then print the front and reverse on A4.
            </p>
            <div className="idc-hero__chips">
              <span>Session {session}</span>
              <span>Valid till {new Date(`${validTill}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
              <span>{students.length} records</span>
            </div>
          </div>
        </div>
        <div className="idc-hero__actions">
          <button type="button" className="idc-btn idc-btn--gold" onClick={openIdentityEditor}>
            {identityOpen ? 'Close identity editor' : 'School identity'}
          </button>
          <Link className="idc-btn idc-btn--ghost" to="/students/list">
            Open registry
          </Link>
        </div>
      </section>

      {identityOpen ? (
        <form className="idc-identity" onSubmit={saveIdentity}>
          <div className="idc-identity__head">
            <div>
              <h3>School identity on the card</h3>
              <p>Saved on this device and used on every card. Leave a field blank to hide it.</p>
            </div>
            <img src="/brand/sms-mark.svg" alt="" />
          </div>
          <div className="idc-identity__grid">
            <label>
              <span>School name</span>
              <input
                type="text"
                value={identityDraft.name}
                onChange={(event) => setIdentityDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Enter the school name printed on cards"
                maxLength={70}
              />
            </label>
            <label>
              <span>Address line</span>
              <input
                type="text"
                value={identityDraft.address}
                onChange={(event) => setIdentityDraft((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Campus address or city"
                maxLength={90}
              />
            </label>
            <label>
              <span>Office phone</span>
              <input
                type="tel"
                value={identityDraft.phone}
                onChange={(event) => setIdentityDraft((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="School office number"
                maxLength={20}
              />
            </label>
            <label>
              <span>Website</span>
              <input
                type="text"
                value={identityDraft.website}
                onChange={(event) => setIdentityDraft((prev) => ({ ...prev, website: event.target.value }))}
                placeholder="school.example"
                maxLength={60}
              />
            </label>
          </div>
          <div className="idc-identity__actions">
            <button type="button" className="idc-btn idc-btn--ghost" onClick={resetIdentity}>
              Reset
            </button>
            <button type="submit" className="idc-btn idc-btn--primary">
              Save identity
            </button>
          </div>
        </form>
      ) : null}

      {notice ? (
        <div className="idc-notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setReloadToken((token) => token + 1)
            }}
          >
            Retry
          </button>
        </div>
      ) : null}
      {pageNotice ? (
        <div className="idc-notice idc-notice--ok" role="status">
          <span>{pageNotice}</span>
          <button type="button" onClick={() => setPageNotice('')}>
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="idc-stats" aria-label="ID card summary">
        {stats.map((stat) => (
          <article className="idc-stat" key={stat.label}>
            <p>{stat.label}</p>
            <strong>{loading ? '—' : stat.value}</strong>
            <span>{stat.hint}</span>
          </article>
        ))}
      </section>

      <div className="idc-workspace">
        <section className="idc-panel" aria-label="Student records">
          <header className="idc-panel__head">
            <div>
              <p className="idc-panel__kicker">Records</p>
              <h3>Choose a student</h3>
            </div>
            <button
              type="button"
              className={`idc-mini ${bulkMode ? 'is-on' : ''}`}
              onClick={() => {
                setBulkMode((on) => !on)
                setBulkIds(new Set())
              }}
            >
              {bulkMode ? 'Bulk on' : 'Bulk print'}
            </button>
          </header>

          <div className="idc-toolbar">
            <label className="idc-search">
              <span className="idc-search__icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.4-3.4" />
                </svg>
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, card no, roll or phone"
                aria-label="Search students"
              />
            </label>
            <select
              className="idc-select"
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              aria-label="Filter by class"
            >
              <option value="">All classes</option>
              {classOptions.map((option) => (
                <option key={option} value={option}>
                  Class {option}
                </option>
              ))}
            </select>
          </div>

          {bulkMode ? (
            <div className="idc-bulkbar">
              <button type="button" className="idc-mini" onClick={toggleSelectAll}>
                {filtered.length > 0 && filtered.every((student) => bulkIds.has(String(student.id)))
                  ? 'Clear shown'
                  : 'Select all shown'}
              </button>
              <span>{bulkStudents.length} selected</span>
              <button
                type="button"
                className="idc-btn idc-btn--primary idc-btn--sm"
                onClick={() => handlePrint(bulkStudents)}
                disabled={!bulkStudents.length}
              >
                Print selected
              </button>
            </div>
          ) : null}

          <div className="idc-list">
            {loading ? (
              <p className="idc-empty">Loading student records…</p>
            ) : filtered.length ? (
              filtered.map((student) => {
                const id = String(student.id)
                const active = selected && String(selected.id) === id
                const ready = isStudentCardReady(student)
                return (
                  <div key={id} className={`idc-row ${active ? 'is-active' : ''} ${bulkMode ? 'is-bulk' : ''}`}>
                    {bulkMode ? (
                      <input
                        type="checkbox"
                        className="idc-row__check"
                        checked={bulkIds.has(id)}
                        onChange={() => toggleBulk(id)}
                        aria-label={`Select ${studentDisplayName(student)} for printing`}
                      />
                    ) : null}
                    <button type="button" className="idc-row__main" onClick={() => setSelectedId(id)}>
                      <span className="idc-row__photo">
                        {student.studentPhotoUrl ? (
                          <img src={student.studentPhotoUrl} alt="" />
                        ) : (
                          <span>{initialsOf(studentDisplayName(student)) || '—'}</span>
                        )}
                      </span>
                      <span className="idc-row__body">
                        <strong>{studentDisplayName(student)}</strong>
                        <span>{studentMeta(student) || '—'}</span>
                        <span className="idc-row__card">Card {studentCardNumber(student)}</span>
                      </span>
                      <span className={`idc-flag ${ready ? 'idc-flag--ok' : 'idc-flag--warn'}`}>
                        {ready ? 'Ready' : 'Photo missing'}
                      </span>
                    </button>
                  </div>
                )
              })
            ) : students.length ? (
              <p className="idc-empty">No student matches this search or class filter.</p>
            ) : (
              <div className="idc-empty">
                <strong>No students in the registry yet</strong>
                <p>Register a student through the admission form, then the ID card will appear here.</p>
                <Link className="idc-btn idc-btn--primary idc-btn--sm" to="/students/add">
                  New admission
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="idc-preview" aria-label="ID card preview">
          {selected ? (
            <>
              <header className="idc-preview__head">
                <div>
                  <p className="idc-panel__kicker">Preview</p>
                  <h3>{studentDisplayName(selected)}</h3>
                  <p>
                    {studentClassLabel(selected)} · Card {studentCardNumber(selected)}
                  </p>
                </div>
                <div className="idc-side-toggle" role="group" aria-label="Card side">
                  <button
                    type="button"
                    className={side === 'front' ? 'is-on' : ''}
                    onClick={() => setSide('front')}
                  >
                    Front
                  </button>
                  <button
                    type="button"
                    className={side === 'back' ? 'is-on' : ''}
                    onClick={() => setSide('back')}
                  >
                    Back
                  </button>
                </div>
              </header>

              <div className="idc-card-wrap">
                <StudentIdCard student={selected} school={school} side={side} />
              </div>

              <div className="idc-preview__meta">
                <span className={`idc-flag ${isStudentCardReady(selected) ? 'idc-flag--ok' : 'idc-flag--warn'}`}>
                  {isStudentCardReady(selected) ? 'Print ready' : 'Photo or class missing'}
                </span>
                <span className="idc-preview__valid">Valid till {validTill}</span>
              </div>

              {gaps.length ? (
                <p className="idc-gaps">
                  Missing on the card: {gaps.join(', ')}. Update the record in the student registry to complete the
                  card.
                </p>
              ) : (
                <p className="idc-gaps idc-gaps--ok">All card fields are complete for this student.</p>
              )}

              <div className="idc-preview__actions">
                <button type="button" className="idc-btn idc-btn--primary" onClick={() => handlePrint([selected])}>
                  Print front &amp; back
                </button>
                <button
                  type="button"
                  className="idc-btn idc-btn--ghost"
                  onClick={() => handlePrint(bulkStudents.length ? bulkStudents : [selected])}
                >
                  {bulkStudents.length ? `Print selected (${bulkStudents.length})` : 'Print with selection'}
                </button>
              </div>

              <p className="idc-print-hint">
                Print sheet includes both sides for every selected student. Use A4 paper and enable double-sided
                printing for a real card, or print on card stock and cut along the border.
              </p>
            </>
          ) : (
            <div className="idc-preview__empty">
              <img src="/brand/sms-mark.svg" alt="" />
              <h3>No card to preview</h3>
              <p>Add a student to the registry to generate the first identity card.</p>
              <Link className="idc-btn idc-btn--primary" to="/students/add">
                New admission
              </Link>
            </div>
          )}
        </section>
      </div>

      <IdCardPrintSheet students={printList} school={school} />
    </div>
  )
}
