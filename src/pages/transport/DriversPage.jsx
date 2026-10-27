import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import { getAuthUser } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import {
  createTransportDriver,
  deleteTransportDriver,
  fetchTransportDrivers,
  fetchTransportRoutes,
  fetchTransportVehicles,
  resetTransportDriverPin,
  setTransportDriverLogin,
  updateTransportDriver,
} from '../../services/transportRoutes'
import '../../styles/transport-premium.css'

const STATUS_OPTIONS = ['On duty', 'Off duty', 'Leave']
const EMPTY_FORM = {
  name: '',
  phone: '',
  licenseNo: '',
  licenseExpiry: '',
  address: '',
  status: 'On duty',
  routeId: '',
  notes: '',
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  return `${parts[0][0] || ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase()
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
  if (status === 'Leave') return 'tr-chip--amber'
  if (status === 'Off duty') return 'tr-chip'
  return 'tr-chip--green'
}

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function lockLabel(timestamp) {
  const value = Number(timestamp) || 0
  if (!value || value <= Date.now()) return ''
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

function DriversPage() {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'
  const driverLoginUrl = `${window.location.origin}/driver/login`

  const [drivers, setDrivers] = useState([])
  const [routes, setRoutes] = useState([])
  const [vehicles, setVehicles] = useState([])
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
  const [loginTarget, setLoginTarget] = useState(null)
  const [loginPin, setLoginPin] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [copied, setCopied] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [driverRows, routeRows, vehicleRows] = await Promise.all([
          fetchTransportDrivers(),
          fetchTransportRoutes(),
          fetchTransportVehicles(),
        ])
        if (!active) return
        setDrivers(Array.isArray(driverRows) ? driverRows : [])
        setRoutes(Array.isArray(routeRows) ? routeRows : [])
        setVehicles(Array.isArray(vehicleRows) ? vehicleRows : [])
        setError('')
      } catch (err) {
        if (active) setError(err?.message || 'Could not load drivers.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [reloadToken])

  const routeById = useMemo(() => new Map(routes.map((route) => [route.id, route])), [routes])
  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles])

  const visibleDrivers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return drivers.filter((driver) => {
      if (statusFilter !== 'all' && (driver.status || 'On duty') !== statusFilter) return false
      if (!needle) return true
      const route = routeById.get(driver.routeId)
      return [driver.name, driver.phone, driver.licenseNo, route?.name]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [drivers, query, statusFilter, routeById])

  const totals = useMemo(() => {
    const onDuty = drivers.filter((driver) => (driver.status || 'On duty') === 'On duty').length
    const assigned = drivers.filter((driver) => driver.routeId).length
    const expiring = drivers.filter((driver) => {
      const days = daysUntil(driver.licenseExpiry)
      return days !== null && days <= 30
    }).length
    return { total: drivers.length, onDuty, assigned, expiring }
  }, [drivers])

  const openCreate = () => {
    setEditingId('')
    setForm(EMPTY_FORM)
    setFormError('')
    setShowForm(true)
  }

  const openEdit = (driver) => {
    setEditingId(driver.id)
    setForm({
      name: driver.name || '',
      phone: driver.phone || '',
      licenseNo: driver.licenseNo || '',
      licenseExpiry: driver.licenseExpiry || '',
      address: driver.address || '',
      status: driver.status || 'On duty',
      routeId: driver.routeId || '',
      notes: driver.notes || '',
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
    if (!form.name.trim()) {
      setFormError('Driver name is required.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        licenseNo: form.licenseNo.trim(),
        licenseExpiry: form.licenseExpiry,
        address: form.address.trim(),
        status: form.status,
        notes: form.notes.trim(),
        routeId: form.routeId,
      }
      const saved = editingId ? await updateTransportDriver(editingId, payload) : await createTransportDriver(payload)
      setDrivers((prev) =>
        editingId ? prev.map((driver) => (driver.id === saved.id ? saved : driver)) : [saved, ...prev],
      )
      setNotice(editingId ? `Driver “${saved.name}” updated.` : `Driver “${saved.name}” added.`)
      setShowForm(false)
      setEditingId('')
      refresh()
    } catch (err) {
      setFormError(err?.message || 'The driver could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (driver) => {
    if (!window.confirm(`Delete driver “${driver.name}”? Their route assignment will be cleared.`)) return
    setDeletingId(driver.id)
    setError('')
    setNotice('')
    try {
      await deleteTransportDriver(driver.id)
      setDrivers((prev) => prev.filter((item) => item.id !== driver.id))
      setNotice(`Driver “${driver.name}” deleted.`)
      refresh()
    } catch (err) {
      setError(err?.message || 'The driver could not be deleted.')
    } finally {
      setDeletingId('')
    }
  }

  const openLogin = (driver) => {
    setLoginTarget(driver)
    setLoginPin('')
    setLoginError('')
    setCopied('')
  }

  const closeLogin = () => {
    if (loginBusy) return
    setLoginTarget(null)
    setLoginPin('')
    setLoginError('')
    setCopied('')
  }

  const replaceDriverRow = (driver) => {
    setDrivers((prev) => prev.map((item) => (item.id === driver.id ? driver : item)))
    setLoginTarget(driver)
  }

  const handleGeneratePin = async () => {
    if (!loginTarget) return
    if (
      loginTarget.login?.hasPin &&
      !window.confirm('Create a new PIN? The current PIN stops working immediately and the driver is signed out.')
    ) {
      return
    }
    setLoginBusy(true)
    setLoginError('')
    setLoginPin('')
    try {
      const body = await resetTransportDriverPin(loginTarget.id)
      setLoginPin(body.pin)
      replaceDriverRow(body.driver)
      setNotice(`New driver PIN created for “${body.driver.name}”.`)
    } catch (err) {
      setLoginError(err?.message || 'The PIN could not be created.')
    } finally {
      setLoginBusy(false)
    }
  }

  const handleToggleLogin = async (enabled) => {
    if (!loginTarget) return
    setLoginBusy(true)
    setLoginError('')
    try {
      const body = await setTransportDriverLogin(loginTarget.id, enabled)
      replaceDriverRow(body.driver)
      setNotice(enabled ? `Driver login switched on for “${body.driver.name}”.` : `Driver login switched off for “${body.driver.name}”.`)
    } catch (err) {
      setLoginError(err?.message || 'The login setting could not be saved.')
    } finally {
      setLoginBusy(false)
    }
  }

  const copyValue = async (value, kind) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(''), 1600)
    } catch {
      setLoginError('Copy failed — select the text and copy it manually.')
    }
  }

  const loginPhoneReady = loginTarget ? phoneDigits(loginTarget.phone).length >= 10 : false
  const loginLockedUntil = lockLabel(loginTarget?.login?.lockedUntil)

  if (!user) return <Navigate replace to="/auth/login" />
  if (!isAdmin) return <Navigate replace to={homePathForRole(role)} />

  return (
    <div className="tr-page">
      <header className="tr-hero">
        <div className="tr-hero__main">
          <span className="tr-hero__badge" aria-hidden>
            <NavGlyph name="user" size={26} />
          </span>
          <div>
            <p className="tr-eyebrow">Transport · drivers</p>
            <h1 className="tr-title">Driver Details</h1>
            <p className="tr-sub">
              Keep licence, contact and duty status up to date. A driver can lead one route — assigning them elsewhere
              moves the route automatically.
            </p>
          </div>
        </div>
        <div className="tr-hero__side">
          <div className="tr-stats">
            <div className="tr-stat">
              <b>{totals.total}</b>
              <span>Drivers</span>
            </div>
            <div className="tr-stat tr-stat--gold">
              <b>{totals.onDuty}</b>
              <span>On duty</span>
            </div>
            <div className="tr-stat">
              <b>{totals.assigned}</b>
              <span>On routes</span>
            </div>
            <div className="tr-stat">
              <b>{totals.expiring}</b>
              <span>Expiring soon</span>
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
              Add driver
            </button>
          </div>
        </div>
      </header>

      {notice ? <p className="tr-ok">{notice}</p> : null}
      {error ? <p className="tr-error">{error}</p> : null}

      {drivers.length ? (
        <div className="tr-toolbar">
          <label className="tr-search">
            <NavGlyph name="user" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search driver, phone, licence or route"
              aria-label="Search drivers"
            />
          </label>
          <select
            className="tr-select tr-select--inline"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter drivers by status"
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

      {loading && !drivers.length ? (
        <p className="tr-loading">
          <span className="tr-spinner" aria-hidden /> Loading drivers…
        </p>
      ) : null}

      {!loading && !drivers.length ? (
        <section className="tr-empty">
          <h3>No drivers yet</h3>
          <p>Add the first driver with their licence and phone number, then assign them to a route.</p>
          <button type="button" className="tr-btn tr-btn--primary" onClick={openCreate}>
            <NavGlyph name="plus" size={15} />
            Add the first driver
          </button>
        </section>
      ) : null}

      {drivers.length && !visibleDrivers.length ? (
        <p className="tr-muted">No driver matches this search or status filter.</p>
      ) : null}

      {visibleDrivers.length ? (
        <section className="tr-card-grid" aria-label="Drivers">
          {visibleDrivers.map((driver) => {
            const route = routeById.get(driver.routeId)
            const bus = vehicleById.get(route?.vehicleId)
            const days = daysUntil(driver.licenseExpiry)
            return (
              <article key={driver.id} className="tr-card tr-person-card">
                <div className="tr-person-card__top">
                  <span className="tr-avatar" aria-hidden>
                    {initials(driver.name)}
                  </span>
                  <div>
                    <h3 className="tr-person-card__name">{driver.name}</h3>
                    <p className="tr-person-card__meta">
                      {[driver.phone || 'Phone —', driver.status || 'On duty'].join(' · ')}
                    </p>
                  </div>
                  <span className={`tr-chip ${statusTone(driver.status)}`}>{driver.status || 'On duty'}</span>
                </div>

                <div className="tr-info-grid">
                  <div className="tr-info">
                    <span>Licence</span>
                    <b>{driver.licenseNo || '—'}</b>
                  </div>
                  <div className="tr-info">
                    <span>Licence expiry</span>
                    <b className={days !== null && days < 0 ? 'tr-text-danger' : ''}>
                      {formatDate(driver.licenseExpiry)}
                      {days !== null && days < 0 ? ' · expired' : ''}
                      {days !== null && days >= 0 && days <= 30 ? ` · ${days}d left` : ''}
                    </b>
                  </div>
                  <div className="tr-info">
                    <span>Route</span>
                    <b>{route?.name || 'Not assigned'}</b>
                  </div>
                  <div className="tr-info">
                    <span>Bus</span>
                    <b>{bus?.number || route?.vehicleLabel || '—'}</b>
                  </div>
                </div>

                <div className="tr-login-row">
                  <span
                    className={`tr-login-chip ${driver.login?.enabled ? 'is-on' : driver.login?.hasPin ? 'is-off' : 'is-none'}`}
                    title={
                      driver.login?.lastLoginAtIST
                        ? `Last sign-in ${driver.login.lastLoginAtIST}`
                        : 'No driver sign-in yet'
                    }
                  >
                    <span className="tr-login-chip__dot" aria-hidden />
                    {driver.login?.enabled
                      ? 'Driver login active'
                      : driver.login?.hasPin
                        ? 'Driver login paused'
                        : 'Driver login not set'}
                  </span>
                  <button type="button" className="tr-btn tr-btn--small" onClick={() => openLogin(driver)}>
                    <NavGlyph name="shield" size={13} />
                    Login
                  </button>
                </div>

                {driver.address || driver.notes ? (
                  <p className="tr-person-card__meta">{[driver.address, driver.notes].filter(Boolean).join(' · ')}</p>
                ) : null}

                <div className="tr-card-actions">
                  {driver.phone ? (
                    <a className="tr-btn tr-btn--small" href={`tel:${driver.phone.replace(/\s+/g, '')}`}>
                      <NavGlyph name="phone" size={13} />
                      Call
                    </a>
                  ) : null}
                  <button type="button" className="tr-btn tr-btn--small" onClick={() => openEdit(driver)}>
                    <NavGlyph name="pencil" size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tr-btn tr-btn--small tr-btn--danger"
                    onClick={() => handleDelete(driver)}
                    disabled={deletingId === driver.id}
                  >
                    {deletingId === driver.id ? 'Deleting…' : 'Delete'}
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
                aria-label={editingId ? 'Edit driver' : 'Add driver'}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="tr-modal__head">
                  <div>
                    <h2>{editingId ? 'Edit driver' : 'Add driver'}</h2>
                    <p>Phone and licence details are visible to admins only.</p>
                  </div>
                  <button type="button" className="tr-close" onClick={closeForm} aria-label="Close driver form">
                    ✕
                  </button>
                </div>
                <form id="tr-driver-form" className="tr-modal__body" onSubmit={handleSave}>
                  <div className="tr-form-grid">
                    <div className="tr-field">
                      <label htmlFor="driver-name">Full name *</label>
                      <input
                        id="driver-name"
                        className="tr-input"
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                        placeholder="e.g. Ramesh Patil"
                        maxLength={80}
                      />
                    </div>
                    <div className="tr-field">
                      <label htmlFor="driver-phone">Phone</label>
                      <input
                        id="driver-phone"
                        className="tr-input"
                        value={form.phone}
                        onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                        placeholder="+91 98000 00000"
                        maxLength={24}
                      />
                    </div>
                    <div className="tr-field">
                      <label htmlFor="driver-license">Licence number</label>
                      <input
                        id="driver-license"
                        className="tr-input"
                        value={form.licenseNo}
                        onChange={(event) => setForm((prev) => ({ ...prev, licenseNo: event.target.value }))}
                        placeholder="e.g. MH12 20190012345"
                        maxLength={40}
                      />
                    </div>
                    <div className="tr-field">
                      <label htmlFor="driver-expiry">Licence expiry</label>
                      <input
                        id="driver-expiry"
                        type="date"
                        className="tr-input"
                        value={form.licenseExpiry}
                        onChange={(event) => setForm((prev) => ({ ...prev, licenseExpiry: event.target.value }))}
                      />
                    </div>
                    <div className="tr-field">
                      <label htmlFor="driver-status">Duty status</label>
                      <select
                        id="driver-status"
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
                      <label htmlFor="driver-route">Route</label>
                      <select
                        id="driver-route"
                        className="tr-select"
                        value={form.routeId}
                        onChange={(event) => setForm((prev) => ({ ...prev, routeId: event.target.value }))}
                      >
                        <option value="">Not assigned</option>
                        {routes.map((route) => {
                          const other = route.driverId && route.driverId !== editingId
                            ? drivers.find((driver) => driver.id === route.driverId)
                            : null
                          return (
                            <option key={route.id} value={route.id}>
                              {route.name}
                              {other ? ` (currently ${other.name})` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    <div className="tr-field tr-field--full">
                      <label htmlFor="driver-address">Address</label>
                      <input
                        id="driver-address"
                        className="tr-input"
                        value={form.address}
                        onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                        placeholder="Residential address"
                        maxLength={160}
                      />
                    </div>
                    <div className="tr-field tr-field--full">
                      <label htmlFor="driver-notes">Notes</label>
                      <textarea
                        id="driver-notes"
                        className="tr-textarea"
                        value={form.notes}
                        onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder="Shift preference, emergency contact…"
                        maxLength={300}
                      />
                    </div>
                  </div>
                  {formError ? <p className="tr-error">{formError}</p> : null}
                </form>
                <div className="tr-modal__foot">
                  <p className="tr-hint">Assigning this driver to a route moves them from any other route.</p>
                  <div className="tr-actions">
                    <button type="button" className="tr-btn" onClick={closeForm} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" form="tr-driver-form" className="tr-btn tr-btn--primary" disabled={saving}>
                      {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add driver'}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {loginTarget
        ? createPortal(
            <div className="tr-modal-backdrop" role="presentation" onClick={closeLogin}>
              <div
                className="tr-modal tr-modal--narrow"
                role="dialog"
                aria-modal="true"
                aria-label={`Driver login for ${loginTarget.name}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="tr-modal__head">
                  <div>
                    <h2>Driver login</h2>
                    <p>
                      {loginTarget.name}
                      {loginTarget.phone ? ` · ${loginTarget.phone}` : ' · no phone on file'}
                    </p>
                  </div>
                  <button type="button" className="tr-close" onClick={closeLogin} aria-label="Close driver login">
                    ✕
                  </button>
                </div>
                <div className="tr-modal__body tr-login-modal">
                  <div className="tr-login-status">
                    <span
                      className={`tr-login-chip ${loginTarget.login?.enabled ? 'is-on' : loginTarget.login?.hasPin ? 'is-off' : 'is-none'}`}
                    >
                      <span className="tr-login-chip__dot" aria-hidden />
                      {loginTarget.login?.enabled
                        ? 'Active'
                        : loginTarget.login?.hasPin
                          ? 'Paused'
                          : 'Not set up'}
                    </span>
                    <div className="tr-login-status__meta">
                      <span>Last sign-in</span>
                      <b>{loginTarget.login?.lastLoginAtIST || 'Never'}</b>
                    </div>
                    <div className="tr-login-status__meta">
                      <span>PIN created</span>
                      <b>{loginTarget.login?.pinSetAtIST || '—'}</b>
                    </div>
                  </div>

                  {loginLockedUntil ? (
                    <p className="tr-error">
                      Locked after repeated wrong PINs until {loginLockedUntil} IST. Creating a new PIN unlocks it
                      immediately.
                    </p>
                  ) : null}

                  {!loginPhoneReady ? (
                    <p className="tr-error">
                      Add a valid phone number to this driver (edit the driver first) before creating a PIN. The phone
                      number is the login ID.
                    </p>
                  ) : null}

                  <div className="tr-login-url">
                    <span>Driver sign-in page</span>
                    <div className="tr-login-url__box">
                      <code>{driverLoginUrl}</code>
                      <button
                        type="button"
                        className="tr-btn tr-btn--small"
                        onClick={() => copyValue(driverLoginUrl, 'url')}
                      >
                        {copied === 'url' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="tr-hint">
                      Share this address once. The driver signs in with this phone number and the 6-digit PIN.
                    </p>
                  </div>

                  {loginPin ? (
                    <div className="tr-pin-panel" role="status">
                      <span>New PIN — shown only once</span>
                      <div className="tr-pin-panel__value">
                        <b>{loginPin}</b>
                        <button
                          type="button"
                          className="tr-btn tr-btn--small"
                          onClick={() => copyValue(loginPin, 'pin')}
                        >
                          {copied === 'pin' ? 'Copied' : 'Copy PIN'}
                        </button>
                      </div>
                      <p>Hand this PIN to {loginTarget.name} now. It cannot be viewed again — reset it if it is lost.</p>
                    </div>
                  ) : null}

                  {loginError ? <p className="tr-error">{loginError}</p> : null}

                  <div className="tr-login-actions">
                    <button
                      type="button"
                      className="tr-btn tr-btn--primary"
                      onClick={handleGeneratePin}
                      disabled={loginBusy || !loginPhoneReady}
                    >
                      {loginBusy ? 'Working…' : loginTarget.login?.hasPin ? 'Reset PIN' : 'Create PIN'}
                    </button>
                    {loginTarget.login?.hasPin ? (
                      <button
                        type="button"
                        className="tr-btn"
                        onClick={() => handleToggleLogin(!loginTarget.login.enabled)}
                        disabled={loginBusy}
                      >
                        {loginTarget.login.enabled ? 'Switch off login' : 'Switch on login'}
                      </button>
                    ) : null}
                  </div>
                  <p className="tr-hint">
                    Switching off pauses the driver portal immediately and signs out active sessions. The PIN is kept
                    for later.
                  </p>
                </div>
                <div className="tr-modal__foot">
                  <p className="tr-hint">The driver only sees their own trip, route stops and live tracking.</p>
                  <button type="button" className="tr-btn" onClick={closeLogin} disabled={loginBusy}>
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export default DriversPage
