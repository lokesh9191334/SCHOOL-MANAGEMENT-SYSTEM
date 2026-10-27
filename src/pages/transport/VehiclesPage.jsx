import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import { getAuthUser } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import {
  createTransportVehicle,
  deleteTransportVehicle,
  fetchTransportDrivers,
  fetchTransportRoutes,
  fetchTransportVehicles,
  updateTransportVehicle,
} from '../../services/transportRoutes'
import '../../styles/transport-premium.css'

const STATUS_OPTIONS = ['Active', 'Maintenance', 'Retired']
const EMPTY_FORM = {
  number: '',
  model: '',
  capacity: '',
  insuranceTill: '',
  status: 'Active',
  routeId: '',
  notes: '',
}

function formatDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return Math.ceil((date.getTime() - Date.now()) / 86400000)
}

function statusTone(status) {
  if (status === 'Maintenance') return 'tr-chip--amber'
  if (status === 'Retired') return 'tr-chip--red'
  return 'tr-chip--green'
}

function VehiclesPage() {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [vehicles, setVehicles] = useState([])
  const [routes, setRoutes] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
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
        const [vehicleRows, routeRows, driverRows] = await Promise.all([
          fetchTransportVehicles(),
          fetchTransportRoutes(),
          fetchTransportDrivers(),
        ])
        if (!active) return
        setVehicles(Array.isArray(vehicleRows) ? vehicleRows : [])
        setRoutes(Array.isArray(routeRows) ? routeRows : [])
        setDrivers(Array.isArray(driverRows) ? driverRows : [])
        setError('')
      } catch (err) {
        if (active) setError(err?.message || 'Could not load buses.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [reloadToken])

  const routeById = useMemo(() => new Map(routes.map((route) => [route.id, route])), [routes])
  const driverById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers])

  const visibleVehicles = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return vehicles.filter((vehicle) => {
      if (statusFilter !== 'all' && (vehicle.status || 'Active') !== statusFilter) return false
      if (!needle) return true
      const route = routeById.get(vehicle.routeId)
      return [vehicle.number, vehicle.model, route?.name].join(' ').toLowerCase().includes(needle)
    })
  }, [vehicles, query, statusFilter, routeById])

  const totals = useMemo(() => {
    const active = vehicles.filter((vehicle) => (vehicle.status || 'Active') === 'Active').length
    const assigned = vehicles.filter((vehicle) => vehicle.routeId).length
    const maintenance = vehicles.filter((vehicle) => vehicle.status === 'Maintenance').length
    return { total: vehicles.length, active, assigned, maintenance }
  }, [vehicles])

  const openCreate = () => {
    setEditingId('')
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (vehicle) => {
    setEditingId(vehicle.id)
    setForm({
      number: vehicle.number || '',
      model: vehicle.model || '',
      capacity: vehicle.capacity === null || vehicle.capacity === undefined ? '' : String(vehicle.capacity),
      insuranceTill: vehicle.insuranceTill || '',
      status: vehicle.status || 'Active',
      routeId: vehicle.routeId || '',
      notes: vehicle.notes || '',
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

  const handleSave = async (event) => {
    event.preventDefault()
    if (!form.number.trim()) {
      setFormError('Bus number is required.')
      return
    }
    if (form.capacity !== '' && (!Number.isFinite(Number(form.capacity)) || Number(form.capacity) < 1 || Number(form.capacity) > 120)) {
      setFormError('Seat capacity must be between 1 and 120.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        number: form.number.trim(),
        model: form.model.trim(),
        capacity: form.capacity === '' ? null : Number(form.capacity),
        insuranceTill: form.insuranceTill,
        status: form.status,
        notes: form.notes.trim(),
        routeId: form.routeId,
      }
      const saved = editingId ? await updateTransportVehicle(editingId, payload) : await createTransportVehicle(payload)
      setVehicles((prev) =>
        editingId ? prev.map((vehicle) => (vehicle.id === saved.id ? saved : vehicle)) : [saved, ...prev],
      )
      setNotice(editingId ? `Bus “${saved.number}” updated.` : `Bus “${saved.number}” added.`)
      setShowForm(false)
      setEditingId('')
      refresh()
    } catch (err) {
      setFormError(err?.message || 'The bus could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Delete bus “${vehicle.number}”? Its route assignment will be cleared.`)) return
    setDeletingId(vehicle.id)
    setError('')
    setNotice('')
    try {
      await deleteTransportVehicle(vehicle.id)
      setVehicles((prev) => prev.filter((item) => item.id !== vehicle.id))
      setNotice(`Bus “${vehicle.number}” deleted.`)
      refresh()
    } catch (err) {
      setError(err?.message || 'The bus could not be deleted.')
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
            <NavGlyph name="bus" size={26} />
          </span>
          <div>
            <p className="tr-eyebrow">Transport · fleet</p>
            <h1 className="tr-title">Bus Number</h1>
            <p className="tr-sub">
              Register every school bus with its number, capacity and insurance date, then link it to a route. One bus
              serves one route at a time.
            </p>
          </div>
        </div>
        <div className="tr-hero__side">
          <div className="tr-stats">
            <div className="tr-stat">
              <b>{totals.total}</b>
              <span>Buses</span>
            </div>
            <div className="tr-stat tr-stat--gold">
              <b>{totals.active}</b>
              <span>Active</span>
            </div>
            <div className="tr-stat">
              <b>{totals.assigned}</b>
              <span>On routes</span>
            </div>
            <div className="tr-stat">
              <b>{totals.maintenance}</b>
              <span>Maintenance</span>
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
            <button type="button" className="tr-btn tr-btn--primary" onClick={openCreate}>
              <NavGlyph name="plus" size={15} />
              Add bus
            </button>
          </div>
        </div>
      </header>

      {notice ? <p className="tr-ok">{notice}</p> : null}
      {error ? <p className="tr-error">{error}</p> : null}

      {vehicles.length ? (
        <div className="tr-toolbar">
          <label className="tr-search">
            <NavGlyph name="bus" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bus number, model or route"
              aria-label="Search buses"
            />
          </label>
          <select
            className="tr-select tr-select--inline"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter buses by status"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {loading && !vehicles.length ? (
        <p className="tr-loading">
          <span className="tr-spinner" aria-hidden /> Loading buses…
        </p>
      ) : null}

      {!loading && !vehicles.length ? (
        <section className="tr-empty">
          <h3>No buses yet</h3>
          <p>Add the first bus with its plate number and seat capacity. Routes can then be linked to it.</p>
          <button type="button" className="tr-btn tr-btn--primary" onClick={openCreate}>
            <NavGlyph name="plus" size={15} />
            Add the first bus
          </button>
        </section>
      ) : null}

      {vehicles.length && !visibleVehicles.length ? (
        <p className="tr-muted">No bus matches this search or status filter.</p>
      ) : null}

      {visibleVehicles.length ? (
        <section className="tr-card-grid" aria-label="Buses">
          {visibleVehicles.map((vehicle) => {
            const route = routeById.get(vehicle.routeId)
            const driver = route?.driverId ? driverById.get(route.driverId) : null
            const days = daysUntil(vehicle.insuranceTill)
            return (
              <article key={vehicle.id} className="tr-card tr-person-card">
                <div className="tr-person-card__top">
                  <span className="tr-avatar" aria-hidden>
                    <NavGlyph name="bus" size={22} />
                  </span>
                  <div>
                    <h3 className="tr-person-card__name">{vehicle.number}</h3>
                    <p className="tr-person-card__meta">
                      {[vehicle.model || 'Model —', vehicle.capacity ? `${vehicle.capacity} seats` : 'Capacity —'].join(' · ')}
                    </p>
                  </div>
                  <span className={`tr-chip ${statusTone(vehicle.status)}`}>{vehicle.status || 'Active'}</span>
                </div>

                <div className="tr-info-grid">
                  <div className="tr-info">
                    <span>Route</span>
                    <b>{route?.name || 'Not assigned'}</b>
                  </div>
                  <div className="tr-info">
                    <span>Driver</span>
                    <b>{driver?.name || 'Not assigned'}</b>
                  </div>
                  <div className="tr-info">
                    <span>Capacity</span>
                    <b>{vehicle.capacity ? `${vehicle.capacity} seats` : '—'}</b>
                  </div>
                  <div className="tr-info">
                    <span>Insurance till</span>
                    <b className={days !== null && days < 0 ? 'tr-text-danger' : ''}>
                      {formatDate(vehicle.insuranceTill)}
                      {days !== null && days < 0 ? ' · expired' : ''}
                      {days !== null && days >= 0 && days <= 30 ? ` · ${days}d left` : ''}
                    </b>
                  </div>
                </div>

                {vehicle.notes ? <p className="tr-person-card__meta">{vehicle.notes}</p> : null}

                <div className="tr-card-actions">
                  <button type="button" className="tr-btn tr-btn--small" onClick={() => openEdit(vehicle)}>
                    <NavGlyph name="pencil" size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tr-btn tr-btn--small tr-btn--danger"
                    onClick={() => handleDelete(vehicle)}
                    disabled={deletingId === vehicle.id}
                  >
                    {deletingId === vehicle.id ? 'Deleting…' : 'Delete'}
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
                aria-label={editingId ? 'Edit bus' : 'Add bus'}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="tr-modal__head">
                  <div>
                    <h2>{editingId ? 'Edit bus' : 'Add bus'}</h2>
                    <p>Plate number and capacity appear in route and parent views.</p>
                  </div>
                  <button type="button" className="tr-close" onClick={closeForm} aria-label="Close bus form">
                    ✕
                  </button>
                </div>
                <form id="tr-vehicle-form" className="tr-modal__body" onSubmit={handleSave}>
                  <div className="tr-form-grid">
                    <div className="tr-field">
                      <label htmlFor="vehicle-number">Bus number *</label>
                      <input
                        id="vehicle-number"
                        className="tr-input"
                        value={form.number}
                        onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))}
                        placeholder="e.g. MH-12-AB-4421"
                        maxLength={40}
                      />
                    </div>
                    <div className="tr-field">
                      <label htmlFor="vehicle-model">Model</label>
                      <input
                        id="vehicle-model"
                        className="tr-input"
                        value={form.model}
                        onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
                        placeholder="e.g. Tata Starbus"
                        maxLength={60}
                      />
                    </div>
                    <div className="tr-field">
                      <label htmlFor="vehicle-capacity">Seat capacity</label>
                      <input
                        id="vehicle-capacity"
                        className="tr-input"
                        inputMode="numeric"
                        value={form.capacity}
                        onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
                        placeholder="1 – 120"
                      />
                    </div>
                    <div className="tr-field">
                      <label htmlFor="vehicle-insurance">Insurance till</label>
                      <input
                        id="vehicle-insurance"
                        type="date"
                        className="tr-input"
                        value={form.insuranceTill}
                        onChange={(event) => setForm((prev) => ({ ...prev, insuranceTill: event.target.value }))}
                      />
                    </div>
                    <div className="tr-field">
                      <label htmlFor="vehicle-status">Status</label>
                      <select
                        id="vehicle-status"
                        className="tr-select"
                        value={form.status}
                        onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="tr-field">
                      <label htmlFor="vehicle-route">Route</label>
                      <select
                        id="vehicle-route"
                        className="tr-select"
                        value={form.routeId}
                        onChange={(event) => setForm((prev) => ({ ...prev, routeId: event.target.value }))}
                      >
                        <option value="">Not assigned</option>
                        {routes.map((route) => {
                          const occupied = route.vehicleId && route.vehicleId !== editingId
                          return (
                            <option key={route.id} value={route.id}>
                              {route.name}
                              {occupied ? ` (bus already ${route.vehicleLabel || 'linked'})` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    <div className="tr-field tr-field--full">
                      <label htmlFor="vehicle-notes">Notes</label>
                      <textarea
                        id="vehicle-notes"
                        className="tr-textarea"
                        value={form.notes}
                        onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Service dates, GPS device, seating layout…"
                        maxLength={300}
                      />
                    </div>
                  </div>
                  {formError ? <p className="tr-error">{formError}</p> : null}
                </form>
                <div className="tr-modal__foot">
                  <p className="tr-hint">Assigning this bus to a route moves it from any other route.</p>
                  <div className="tr-actions">
                    <button type="button" className="tr-btn" onClick={closeForm} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" form="tr-vehicle-form" className="tr-btn tr-btn--primary" disabled={saving}>
                      {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add bus'}
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

export default VehiclesPage
