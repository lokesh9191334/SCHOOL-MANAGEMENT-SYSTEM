import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import { getAuthUser } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import { fetchStudents } from '../../services/students'
import {
  createTransportAllocation,
  deleteTransportAllocation,
  fetchTransportAllocations,
  fetchTransportRoutes,
  fetchTransportVehicles,
  updateTransportAllocation,
} from '../../services/transportRoutes'
import '../../styles/transport-premium.css'

const EMPTY_FORM = { studentId: '', routeId: '', pickupStopId: '', dropStopId: '', notes: '' }

function formatTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
  if (!match) return ''
  const hours = Number(match[1])
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`
}

function studentName(student) {
  return student?.title || student?.name || ''
}

function studentClass(student) {
  return student?.subtitle || student?.className || ''
}

function AllocationsPage() {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [allocations, setAllocations] = useState([])
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [students, setStudents] = useState([])
  const [studentsError, setStudentsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [allocationRows, routeRows, vehicleRows] = await Promise.all([
          fetchTransportAllocations(),
          fetchTransportRoutes(),
          fetchTransportVehicles(),
        ])
        if (active) {
          setAllocations(Array.isArray(allocationRows) ? allocationRows : [])
          setRoutes(Array.isArray(routeRows) ? routeRows : [])
          setVehicles(Array.isArray(vehicleRows) ? vehicleRows : [])
          setError('')
        }
      } catch (err) {
        if (active) setError(err?.message || 'Could not load student allocations.')
      } finally {
        if (active) setLoading(false)
      }
      try {
        const studentRows = await fetchStudents()
        if (active) {
          setStudents(Array.isArray(studentRows) ? studentRows : [])
          setStudentsError('')
        }
      } catch (err) {
        if (active) setStudentsError(err?.message || 'Student records could not be loaded.')
      }
    })()
    return () => {
      active = false
    }
  }, [reloadToken])

  const routeById = useMemo(() => new Map(routes.map((route) => [route.id, route])), [routes])
  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles])

  const studentByKey = useMemo(() => {
    const map = new Map()
    for (const student of students) {
      if (student.id !== undefined) map.set(String(student.id), student)
      if (student.applicationId) map.set(String(student.applicationId), student)
    }
    return map
  }, [students])

  const studentsByClass = useMemo(() => {
    const map = new Map()
    const sorted = [...students].sort((first, second) => {
      const classCompare = studentClass(first).localeCompare(studentClass(second))
      if (classCompare !== 0) return classCompare
      return studentName(first).localeCompare(studentName(second))
    })
    for (const student of sorted) {
      const key = studentClass(student) || 'Class not set'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(student)
    }
    return [...map.entries()]
  }, [students])

  const assignedStudentKeys = useMemo(() => {
    const keys = new Set()
    for (const allocation of allocations) {
      if (allocation.id === editingId) continue
      if (allocation.studentId) keys.add(String(allocation.studentId))
      if (allocation.studentApplicationId) keys.add(String(allocation.studentApplicationId))
    }
    return keys
  }, [allocations, editingId])

  const visibleAllocations = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return allocations
    return allocations.filter((allocation) => {
      const student = studentByKey.get(String(allocation.studentId))
      const route = routeById.get(allocation.routeId)
      return [studentName(student), studentClass(student), allocation.studentApplicationId, route?.name]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [allocations, query, studentByKey, routeById])

  const totals = useMemo(() => {
    const routeKeys = new Set(allocations.map((allocation) => allocation.routeId))
    const pickup = allocations.filter((allocation) => allocation.pickupStopId).length
    const drop = allocations.filter((allocation) => allocation.dropStopId).length
    return { total: allocations.length, routes: routeKeys.size, pickup, drop }
  }, [allocations])

  const openCreate = () => {
    setEditingId('')
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (allocation) => {
    setEditingId(allocation.id)
    setForm({
      studentId: String(allocation.studentId || ''),
      routeId: allocation.routeId || '',
      pickupStopId: allocation.pickupStopId || '',
      dropStopId: allocation.dropStopId || '',
      notes: allocation.notes || '',
    })
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    if (saving) return
    setShowForm(false)
    setFormError('')
    setEditingId('')
  }

  const selectedRoute = routeById.get(form.routeId) || null
  const pickupStops = (selectedRoute?.stops || []).filter((stop) => stop.kind === 'pickup' || stop.kind === 'both')
  const dropStops = (selectedRoute?.stops || []).filter((stop) => stop.kind === 'drop' || stop.kind === 'both')

  const handleRouteChange = (routeId) => {
    setForm((prev) => ({ ...prev, routeId, pickupStopId: '', dropStopId: '' }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!form.studentId) {
      setFormError('Select a student.')
      return
    }
    if (!form.routeId) {
      setFormError('Select a route.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        studentId: form.studentId,
        routeId: form.routeId,
        pickupStopId: form.pickupStopId,
        dropStopId: form.dropStopId,
        notes: form.notes.trim(),
      }
      const saved = editingId ? await updateTransportAllocation(editingId, payload) : await createTransportAllocation(payload)
      setAllocations((prev) =>
        editingId ? prev.map((allocation) => (allocation.id === saved.id ? saved : allocation)) : [saved, ...prev],
      )
      const student = studentByKey.get(String(saved.studentId))
      setNotice(
        editingId
          ? 'Bus allocation updated.'
          : `${studentName(student) || 'Student'} allocated to ${routeById.get(saved.routeId)?.name || 'the route'}.`,
      )
      setShowForm(false)
      setEditingId('')
      refresh()
    } catch (err) {
      setFormError(err?.message || 'The allocation could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (allocation) => {
    const student = studentByKey.get(String(allocation.studentId))
    if (!window.confirm(`Remove the bus allocation for ${studentName(student) || 'this student'}?`)) return
    setDeletingId(allocation.id)
    setError('')
    setNotice('')
    try {
      await deleteTransportAllocation(allocation.id)
      setAllocations((prev) => prev.filter((item) => item.id !== allocation.id))
      setNotice('Bus allocation removed.')
      refresh()
    } catch (err) {
      setError(err?.message || 'The allocation could not be removed.')
    } finally {
      setDeletingId('')
    }
  }

  if (!user) return <Navigate replace to="/auth/login" />
  if (!isAdmin) return <Navigate replace to={homePathForRole(role)} />

  return (
    <div className="tr-page">
      <header className="tr-hero">
        <div className="tr-hero__main">
          <span className="tr-hero__badge" aria-hidden>
            <NavGlyph name="swap" size={26} />
          </span>
          <div>
            <p className="tr-eyebrow">Transport · allocation</p>
            <h1 className="tr-title">Student Allocation</h1>
            <p className="tr-sub">
              Link each student to a bus route and their exact pickup and drop points. Parents see this same allocation
              inside their portal.
            </p>
          </div>
        </div>
        <div className="tr-hero__side">
          <div className="tr-stats">
            <div className="tr-stat">
              <b>{totals.total}</b>
              <span>Students</span>
            </div>
            <div className="tr-stat tr-stat--gold">
              <b>{totals.routes}</b>
              <span>Routes used</span>
            </div>
            <div className="tr-stat">
              <b>{totals.pickup}</b>
              <span>Pickup set</span>
            </div>
            <div className="tr-stat">
              <b>{totals.drop}</b>
              <span>Drop set</span>
            </div>
          </div>
          <div className="tr-actions">
            <Link className="tr-btn tr-btn--ghost" to="/transport/routes">
              <NavGlyph name="route" size={15} />
              Routes
            </Link>
            <button type="button" className="tr-btn tr-btn--ghost" onClick={refresh} disabled={loading}>
              <NavGlyph name="refresh" size={15} />
              Refresh
            </button>
            <button type="button" className="tr-btn tr-btn--primary" onClick={openCreate} disabled={!students.length}>
              <NavGlyph name="plus" size={15} />
              Add allocation
            </button>
          </div>
        </div>
      </header>

      {notice ? <p className="tr-ok">{notice}</p> : null}
      {error ? <p className="tr-error">{error}</p> : null}
      {studentsError ? <p className="tr-error">{studentsError}</p> : null}
      {!students.length && !studentsError && !loading ? (
        <p className="tr-note">
          No student records found. Add students through <Link to="/students/add">New Admission</Link> before allocating
          a bus.
        </p>
      ) : null}

      {allocations.length ? (
        <div className="tr-toolbar">
          <label className="tr-search">
            <NavGlyph name="swap" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search student, class or route"
              aria-label="Search allocations"
            />
          </label>
        </div>
      ) : null}

      {loading && !allocations.length ? (
        <p className="tr-loading">
          <span className="tr-spinner" aria-hidden /> Loading allocations…
        </p>
      ) : null}

      {!loading && !allocations.length ? (
        <section className="tr-empty">
          <h3>No student allocated yet</h3>
          <p>
            {students.length
              ? 'Pick a student, choose their route and set the morning pickup and afternoon drop points.'
              : 'Add student records first, then return here to assign a bus route.'}
          </p>
          {students.length ? (
            <button type="button" className="tr-btn tr-btn--primary" onClick={openCreate}>
              <NavGlyph name="plus" size={15} />
              Allocate the first student
            </button>
          ) : (
            <Link className="tr-btn tr-btn--primary" to="/students/add">
              <NavGlyph name="plus" size={15} />
              New admission
            </Link>
          )}
        </section>
      ) : null}

      {allocations.length && !visibleAllocations.length ? (
        <p className="tr-muted">No allocation matches this search.</p>
      ) : null}

      {visibleAllocations.length ? (
        <section className="tr-alloc-list" aria-label="Student bus allocations">
          {visibleAllocations.map((allocation) => {
            const student = studentByKey.get(String(allocation.studentId))
            const route = routeById.get(allocation.routeId)
            const bus = vehicleById.get(route?.vehicleId)
            const pickup = route?.stops?.find((stop) => stop.id === allocation.pickupStopId)
            const drop = route?.stops?.find((stop) => stop.id === allocation.dropStopId)
            return (
              <article key={allocation.id} className="tr-alloc-row">
                <div>
                  <p className="tr-alloc-row__name">{studentName(student) || 'Student record missing'}</p>
                  <p className="tr-alloc-row__meta">
                    {[studentClass(student), student?.applicationId || allocation.studentApplicationId]
                      .filter(Boolean)
                      .join(' · ') || 'Class not set'}
                  </p>
                  {allocation.notes ? <p className="tr-alloc-row__meta">{allocation.notes}</p> : null}
                </div>
                <div className="tr-alloc-row__cell">
                  <span>Route</span>
                  <b>{route?.name || 'Route deleted'}</b>
                  <p className="tr-alloc-row__meta">{bus?.number || route?.vehicleLabel || 'No bus linked'}</p>
                </div>
                <div className="tr-alloc-row__cell">
                  <span>Pickup</span>
                  <b>{pickup?.name || '—'}</b>
                  <p className="tr-alloc-row__meta">{formatTime(pickup?.time) || 'No time set'}</p>
                </div>
                <div className="tr-alloc-row__cell">
                  <span>Drop</span>
                  <b>{drop?.name || '—'}</b>
                  <p className="tr-alloc-row__meta">{formatTime(drop?.time) || 'No time set'}</p>
                </div>
                <div className="tr-alloc-row__actions">
                  <button type="button" className="tr-btn tr-btn--small" onClick={() => openEdit(allocation)}>
                    <NavGlyph name="pencil" size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tr-btn tr-btn--small tr-btn--danger"
                    onClick={() => handleDelete(allocation)}
                    disabled={deletingId === allocation.id}
                  >
                    {deletingId === allocation.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      ) : null}

      {showForm
        ? createPortal(
            <div className="tr-modal-backdrop" role="presentation" onClick={closeForm}>
              <div
                className="tr-modal tr-modal--narrow"
                role="dialog"
                aria-modal="true"
                aria-label={editingId ? 'Edit bus allocation' : 'Add bus allocation'}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="tr-modal__head">
                  <div>
                    <h2>{editingId ? 'Edit allocation' : 'Allocate a student'}</h2>
                    <p>Pickup and drop lists follow the chosen route's stop types.</p>
                  </div>
                  <button type="button" className="tr-close" onClick={closeForm} aria-label="Close allocation form">
                    ✕
                  </button>
                </div>
                <form id="tr-allocation-form" className="tr-modal__body" onSubmit={handleSave}>
                  <div className="tr-form-grid">
                    <div className="tr-field tr-field--full">
                      <label htmlFor="allocation-student">Student *</label>
                      <select
                        id="allocation-student"
                        className="tr-select"
                        value={form.studentId}
                        onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
                      >
                        <option value="">Select a student</option>
                        {studentsByClass.map(([className, rows]) => (
                          <optgroup key={className} label={className}>
                            {rows.map((student) => {
                              const key = String(student.id)
                              const taken =
                                assignedStudentKeys.has(key) ||
                                (student.applicationId && assignedStudentKeys.has(String(student.applicationId)))
                              return (
                                <option key={key} value={key} disabled={taken}>
                                  {studentName(student) || 'Unnamed student'}
                                  {student.applicationId ? ` · ${student.applicationId}` : ''}
                                  {taken ? ' (already allocated)' : ''}
                                </option>
                              )
                            })}
                          </optgroup>
                        ))}
                        {form.studentId && !studentByKey.get(form.studentId) ? (
                          <option value={form.studentId}>Student record no longer available</option>
                        ) : null}
                      </select>
                    </div>
                    <div className="tr-field tr-field--full">
                      <label htmlFor="allocation-route">Route *</label>
                      <select
                        id="allocation-route"
                        className="tr-select"
                        value={form.routeId}
                        onChange={(event) => handleRouteChange(event.target.value)}
                      >
                        <option value="">Select a route</option>
                        {routes.map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.name}
                            {route.status === 'Paused' ? ' (paused)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="tr-field">
                      <label htmlFor="allocation-pickup">Pickup point</label>
                      <select
                        id="allocation-pickup"
                        className="tr-select"
                        value={form.pickupStopId}
                        onChange={(event) => setForm((prev) => ({ ...prev, pickupStopId: event.target.value }))}
                        disabled={!selectedRoute}
                      >
                        <option value="">{selectedRoute ? 'Not set' : 'Choose a route first'}</option>
                        {pickupStops.map((stop) => (
                          <option key={stop.id} value={stop.id}>
                            {stop.name}
                            {stop.time ? ` · ${formatTime(stop.time)}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="tr-field">
                      <label htmlFor="allocation-drop">Drop point</label>
                      <select
                        id="allocation-drop"
                        className="tr-select"
                        value={form.dropStopId}
                        onChange={(event) => setForm((prev) => ({ ...prev, dropStopId: event.target.value }))}
                        disabled={!selectedRoute}
                      >
                        <option value="">{selectedRoute ? 'Not set' : 'Choose a route first'}</option>
                        {dropStops.map((stop) => (
                          <option key={stop.id} value={stop.id}>
                            {stop.name}
                            {stop.time ? ` · ${formatTime(stop.time)}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="tr-field tr-field--full">
                      <label htmlFor="allocation-notes">Notes</label>
                      <textarea
                        id="allocation-notes"
                        className="tr-textarea"
                        value={form.notes}
                        onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Guardian instructions, alternate stop…"
                        maxLength={200}
                      />
                    </div>
                  </div>
                  {selectedRoute && !pickupStops.length && !dropStops.length ? (
                    <p className="tr-note">This route has no pickup or drop stops yet. Add them in the route builder.</p>
                  ) : null}
                  {formError ? <p className="tr-error">{formError}</p> : null}
                </form>
                <div className="tr-modal__foot">
                  <p className="tr-hint">One bus allocation per student. Parents see the route, driver and points live.</p>
                  <div className="tr-actions">
                    <button type="button" className="tr-btn" onClick={closeForm} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" form="tr-allocation-form" className="tr-btn tr-btn--primary" disabled={saving}>
                      {saving ? 'Saving…' : editingId ? 'Save changes' : 'Allocate student'}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export default AllocationsPage
