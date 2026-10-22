import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import QRCode from 'qrcode'
import NavGlyph from '../../layouts/NavGlyph'
import { getAuthUser } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import {
  fetchLiveVehicles,
  fetchOverspeedAlerts,
  fetchTransportDirectory,
  createTrackingKey,
  setTrackingKeyActive,
  removeTrackingKey,
  respondOverspeedAlert,
} from '../../services/transportLive'
import '../../styles/live-transport-premium.css'

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return 'just now'
  if (diff < 60000) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

function trackLinkFor(key) {
  return `${window.location.origin}/track/${key}`
}

function whatsappLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const number = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

function speedKmh(speed) {
  if (speed == null || !Number.isFinite(Number(speed))) return null
  return Math.round(Number(speed) * 3.6)
}

const ONLINE_COLOR = { online: '#10b981', stale: '#f59e0b', offline: '#94a3b8' }

function vehicleTone(vehicle) {
  if (vehicle.active === false) return 'off'
  if (vehicle.online) return 'online'
  return vehicle.lastPing ? 'stale' : 'offline'
}

function buildPopup(vehicle, onSelect) {
  const el = document.createElement('div')
  const kmh = speedKmh(vehicle.lastPing?.speed)
  el.innerHTML = `
    <p class="tlive-popup-kicker">${escapeHtml(vehicleTone(vehicle) === 'online' ? 'Live now' : vehicleTone(vehicle) === 'stale' ? 'Signal lost' : vehicle.active === false ? 'Tracking off' : 'Waiting for first ping')}</p>
    <p class="tlive-popup-name">${escapeHtml(vehicle.driverName)}</p>
    <p class="tlive-popup-sub">${escapeHtml([vehicle.vehicleLabel, vehicle.routeLabel].filter(Boolean).join(' · ') || 'Bus duty')}</p>
    ${vehicle.lastPing ? `<p class="tlive-popup-sub"><b>${escapeHtml(vehicle.lastPing.atIST || '')}</b> IST · ${escapeHtml(timeAgo(vehicle.lastPing.at))}${kmh != null ? ` · ${kmh} km/h` : ''}</p>` : ''}
  `
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'tlive-popup-btn'
  btn.textContent = 'Focus on map'
  btn.addEventListener('click', () => onSelect(vehicle.id))
  el.appendChild(btn)
  return el
}

function LiveTransport() {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [vehicles, setVehicles] = useState([])
  const [staleAfterSec, setStaleAfterSec] = useState(150)
  const [alerts, setAlerts] = useState([])
  const [limitKmh, setLimitKmh] = useState(60)
  const [respondingId, setRespondingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedId, setSelectedId] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [directory, setDirectory] = useState({ drivers: [], vehicles: [] })
  const [form, setForm] = useState({ driverName: '', vehicleLabel: '', routeLabel: '', phone: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [created, setCreated] = useState(null)
  const [createdQr, setCreatedQr] = useState('')
  const [qrMap, setQrMap] = useState({})
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((tone, text) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-3), { id, tone, text }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4600)
  }, [])

  const load = useCallback(async () => {
    try {
      const data = await fetchLiveVehicles()
      setVehicles(Array.isArray(data.vehicles) ? data.vehicles : [])
      if (Number.isFinite(Number(data.staleAfterSec))) setStaleAfterSec(Number(data.staleAfterSec))
      setError('')
      setLastRefresh(Date.now())
    } catch (err) {
      setError(err?.message || 'Could not load live positions.')
    } finally {
      setLoading(false)
    }
    try {
      const speed = await fetchOverspeedAlerts()
      setAlerts(Array.isArray(speed.alerts) ? speed.alerts : [])
      if (Number.isFinite(Number(speed.limitKmh))) setLimitKmh(Number(speed.limitKmh))
    } catch {
      /* alerts panel is secondary — live map still works without it */
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 15000)
    return () => window.clearInterval(timer)
  }, [autoRefresh, load])

  useEffect(() => {
    if (!selectedId) return
    if (!vehicles.some((v) => v.id === selectedId)) setSelectedId('')
  }, [vehicles, selectedId])

  const openAdd = () => {
    setShowAdd(true)
    setCreateError('')
    setCreated(null)
    setCreatedQr('')
    fetchTransportDirectory().then(setDirectory)
  }

  const closeAdd = () => {
    setShowAdd(false)
    setCreating(false)
    setCreateError('')
    setCreated(null)
    setCreatedQr('')
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.driverName.trim()) {
      setCreateError('Driver name is required.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const record = await createTrackingKey(form)
      setCreated(record)
      const link = trackLinkFor(record.key)
      try {
        const qr = await QRCode.toDataURL(link, { width: 240, margin: 1, color: { dark: '#131313', light: '#ffffff' } })
        setCreatedQr(qr)
      } catch {
        setCreatedQr('')
      }
      load()
    } catch (err) {
      setCreateError(err?.message || 'Could not create the tracking link.')
    } finally {
      setCreating(false)
    }
  }

  const copyLink = async (key) => {
    const link = trackLinkFor(key)
    try {
      await navigator.clipboard.writeText(link)
      pushToast('ok', 'Tracking link copied.')
    } catch {
      window.prompt('Copy this tracking link for the driver:', link)
    }
  }

  const toggleQr = async (vehicle) => {
    if (qrMap[vehicle.id]) {
      setQrMap((prev) => {
        const next = { ...prev }
        delete next[vehicle.id]
        return next
      })
      return
    }
    try {
      const qr = await QRCode.toDataURL(trackLinkFor(vehicle.key), { width: 200, margin: 1, color: { dark: '#131313', light: '#ffffff' } })
      setQrMap((prev) => ({ ...prev, [vehicle.id]: qr }))
    } catch {
      pushToast('err', 'QR could not be generated.')
    }
  }

  const toggleActive = async (vehicle) => {
    try {
      const next = !(vehicle.active !== false)
      await setTrackingKeyActive(vehicle.id, next)
      pushToast('ok', next ? `${vehicle.driverName} link switched on.` : `${vehicle.driverName} link switched off.`)
      load()
    } catch (err) {
      pushToast('err', err?.message || 'Could not update the link.')
    }
  }

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Delete tracking link for ${vehicle.driverName}? This cannot be undone.`)) return
    try {
      await removeTrackingKey(vehicle.id)
      pushToast('ok', 'Tracking link deleted.')
      if (selectedId === vehicle.id) setSelectedId('')
      load()
    } catch (err) {
      pushToast('err', err?.message || 'Could not delete the link.')
    }
  }

  const handleRespond = async (alert) => {
    const note = String(window.prompt(`Action taken for ${alert.busNo || alert.driverName} (optional note):`, '') ?? '').slice(0, 300)
    setRespondingId(alert.id)
    try {
      const updated = await respondOverspeedAlert(alert.id, String(note).slice(0, 300))
      pushToast('ok', `Response recorded at ${updated.respondedAtIST} IST.`)
      load()
    } catch (err) {
      pushToast('err', err?.message || 'Could not record the response.')
    } finally {
      setRespondingId('')
    }
  }

  const counts = useMemo(() => {
    const online = vehicles.filter((v) => v.online).length
    const activeLinks = vehicles.filter((v) => v.active !== false).length
    const openAlerts = alerts.filter((a) => a.status === 'open').length
    return { online, activeLinks, total: vehicles.length, openAlerts }
  }, [vehicles, alerts])

  const openAlerts = useMemo(() => alerts.filter((a) => a.status === 'open'), [alerts])
  const closedAlerts = useMemo(() => alerts.filter((a) => a.status !== 'open').slice(0, 8), [alerts])
  const selected = vehicles.find((v) => v.id === selectedId) || null

  if (!user) return <Navigate replace to="/auth/login" />
  if (!isAdmin) return <Navigate replace to={homePathForRole(role)} />

  return (
    <div className="tlive-page">
      <header className="tlive-hero">
        <div className="tlive-hero__lead">
          <span className="tlive-hero__badge" aria-hidden>
            <NavGlyph name="locate" size={26} />
          </span>
          <div>
            <p className="tlive-hero__eyebrow">Transport · live GPS</p>
            <h1 className="tlive-hero__title">Live Bus Tracking</h1>
            <p className="tlive-hero__meta">
              Every driver link shows here in real time. A bus counts as offline after {Math.round(staleAfterSec / 60)} minutes without a position.
            </p>
          </div>
        </div>
        <div className="tlive-hero__side">
          <div className="tlive-hero__counts">
            <span className="tlive-count tlive-count--ok">{counts.online} live</span>
            <span className="tlive-count">{counts.activeLinks} links on</span>
            <span className="tlive-count">{counts.total} total</span>
            {counts.openAlerts ? <span className="tlive-count tlive-count--alert">{counts.openAlerts} overspeed</span> : null}
          </div>
          <div className="tlive-hero__actions">
            <button type="button" className="tlive-btn tlive-btn--ghost" onClick={() => setAutoRefresh((v) => !v)}>
              <NavGlyph name="refresh" size={15} />
              {autoRefresh ? 'Auto refresh: on' : 'Auto refresh: off'}
            </button>
            <button type="button" className="tlive-btn tlive-btn--ghost" onClick={load} disabled={loading}>
              Refresh now
            </button>
            <button type="button" className="tlive-btn tlive-btn--primary" onClick={openAdd}>
              <NavGlyph name="plus" size={15} />
              Add tracking link
            </button>
          </div>
          <p className="tlive-hero__stamp">
            {lastRefresh ? `Updated ${timeAgo(new Date(lastRefresh).toISOString())}` : 'Loading…'}
          </p>
        </div>
      </header>

      {error ? <p className="tlive-error">{error}</p> : null}

      {openAlerts.length ? (
        <section className="osd-panel" role="alert" aria-label="Bus overspeed warnings">
          <div className="osd-panel__head">
            <div>
              <p className="osd-panel__kicker">Safety warning</p>
              <h2 className="osd-panel__title">Bus overspeed above {limitKmh} km/h</h2>
              <p className="osd-panel__sub">Admins were emailed with the bus number, driver details and exact time. Respond after you have followed up.</p>
            </div>
            <span className="osd-panel__live">
              <i className="osd-panel__live-dot" aria-hidden /> Live
            </span>
          </div>
          {openAlerts.map((a) => (
            <article key={a.id} className="osd-card">
              <div className="osd-card__speed" aria-label={`Top speed ${a.speedKmh} km per hour`}>
                {a.speedKmh}
                <small> km/h</small>
              </div>
              <div className="osd-card__body">
                <p className="osd-card__title">
                  {a.busNo || 'Bus'} <span aria-hidden>·</span> {a.driverName || 'Driver'}
                </p>
                <p className="osd-card__meta">{[a.routeLabel, a.phone].filter(Boolean).join(' · ') || 'Route not set'}</p>
                <p className="osd-card__meta">
                  Started <b>{a.startedAtIST || '—'}</b> IST · last seen <b>{a.lastAtIST || '—'}</b> IST · {a.pingCount || 1} speeding pings{a.endedAtIST ? ' · speeding ended' : ''}
                </p>
                <p className="osd-card__meta">
                  {a.lat != null && a.lng != null ? (
                    <>
                      {Number(a.lat).toFixed(5)}, {Number(a.lng).toFixed(5)} ·{' '}
                      <a href={`https://www.google.com/maps?q=${Number(a.lat)},${Number(a.lng)}`} target="_blank" rel="noreferrer">
                        Open map
                      </a>
                    </>
                  ) : (
                    'Location —'
                  )}
                  {a.email?.recipients ? <> · emailed {a.email.sentCount || 0}/{a.email.recipients} admins</> : ''}
                </p>
                {a.device ? <p className="osd-card__meta osd-card__meta--dim">{a.device}</p> : null}
              </div>
              <div className="osd-card__actions">
                <button type="button" className="tlive-btn tlive-btn--primary" onClick={() => handleRespond(a)} disabled={respondingId === a.id}>
                  {respondingId === a.id ? 'Saving…' : 'Respond'}
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {!openAlerts.length && closedAlerts.length ? (
        <section className="osd-history" aria-label="Recent overspeed responses">
          <h2 className="osd-history__title">Recent overspeed responses</h2>
          {closedAlerts.map((a) => (
            <p key={a.id} className="osd-history__row">
              <b>{a.busNo || 'Bus'}</b> · {a.driverName} · {a.speedKmh} km/h · started {a.startedAtIST} IST · responded{' '}
              <b>{a.respondedAtIST || '—'}</b> IST{a.respondedBy ? ` by ${a.respondedBy}` : ''}
              {a.responseNote ? ` — “${a.responseNote}”` : ''}
            </p>
          ))}
        </section>
      ) : null}

      <section className="tlive-grid">
        <VehicleMap vehicles={vehicles} selectedId={selectedId} onSelect={setSelectedId} />

        <div className="tlive-list">
          {selected ? (
            <p className="tlive-focus">
              Focused on <b>{selected.driverName}</b>
              <button type="button" onClick={() => setSelectedId('')}>
                Clear
              </button>
            </p>
          ) : null}

          {loading && !vehicles.length ? <p className="tlive-muted">Loading vehicles…</p> : null}
          {!loading && !vehicles.length ? (
            <article className="tlive-empty">
              <h2>No tracking links yet</h2>
              <p>Create a link for a driver, share it on WhatsApp, and the bus appears here live.</p>
              <button type="button" className="tlive-btn tlive-btn--primary" onClick={openAdd}>
                Create the first link
              </button>
            </article>
          ) : null}

          {vehicles.map((vehicle) => {
            const tone = vehicleTone(vehicle)
            const kmh = speedKmh(vehicle.lastPing?.speed)
            const wa = whatsappLink(vehicle.phone, `School bus live tracking link for ${vehicle.driverName}: ${trackLinkFor(vehicle.key)}`)
            return (
              <article key={vehicle.id} className={`tlive-vehicle tlive-vehicle--${tone} ${selectedId === vehicle.id ? 'is-selected' : ''}`}>
                <div className="tlive-vehicle__top">
                  <div className="tlive-vehicle__who">
                    <span className={`tlive-dot tlive-dot--${tone}`} aria-hidden />
                    <div>
                      <p className="tlive-vehicle__name">{vehicle.driverName}</p>
                      <p className="tlive-vehicle__sub">
                        {[vehicle.vehicleLabel, vehicle.routeLabel].filter(Boolean).join(' · ') || 'Bus duty'}
                      </p>
                    </div>
                  </div>
                  <span className={`tlive-chip tlive-chip--${tone}`}>
                    {tone === 'online' ? 'Live' : tone === 'stale' ? 'Signal lost' : vehicle.active === false ? 'Off' : 'No ping yet'}
                  </span>
                  {kmh != null && kmh > limitKmh ? <span className="tlive-chip tlive-chip--speed">Overspeed</span> : null}
                </div>

                <div className="tlive-vehicle__stats">
                  <span>
                    <b>{vehicle.lastPing ? timeAgo(vehicle.lastPing.at) : '—'}</b> last update
                  </span>
                  <span>
                    <b>{kmh != null ? `${kmh} km/h` : '—'}</b> speed
                  </span>
                  <span>
                    <b>{vehicle.lastPing?.accuracy != null ? `±${vehicle.lastPing.accuracy} m` : '—'}</b> accuracy
                  </span>
                  <span>
                    <b>{vehicle.lastPing?.battery != null ? `${vehicle.lastPing.battery}%` : '—'}</b> phone
                  </span>
                </div>
                {vehicle.lastPing?.atIST ? <p className="tlive-vehicle__stamp">{vehicle.lastPing.atIST} IST{vehicle.lastPing.device ? ` · ${vehicle.lastPing.device}` : ''}</p> : null}

                <div className="tlive-vehicle__actions">
                  <button type="button" className="tlive-btn" onClick={() => setSelectedId(vehicle.id)} disabled={!vehicle.lastPing}>
                    Show on map
                  </button>
                  <button type="button" className="tlive-btn" onClick={() => copyLink(vehicle.key)}>
                    Copy link
                  </button>
                  <button type="button" className="tlive-btn" onClick={() => toggleQr(vehicle)}>
                    QR
                  </button>
                  {wa ? (
                    <a className="tlive-btn" href={wa} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : null}
                  <button type="button" className="tlive-btn" onClick={() => toggleActive(vehicle)}>
                    {vehicle.active === false ? 'Switch on' : 'Switch off'}
                  </button>
                  <button type="button" className="tlive-btn tlive-btn--danger" onClick={() => handleDelete(vehicle)}>
                    Delete
                  </button>
                </div>

                {qrMap[vehicle.id] ? (
                  <div className="tlive-qr">
                    <img src={qrMap[vehicle.id]} alt={`QR code for ${vehicle.driverName} tracking link`} />
                    <p>Driver scans this once — keep it saved in the bus.</p>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      {showAdd
        ? createPortal(
            <div className="tlive-modal-backdrop" onClick={closeAdd} role="presentation">
              <div className="tlive-modal" role="dialog" aria-modal="true" aria-label="Add tracking link" onClick={(e) => e.stopPropagation()}>
                <div className="tlive-modal__head">
                  <h2>{created ? 'Tracking link ready' : 'Add tracking link'}</h2>
                  <button type="button" className="tlive-modal__close" onClick={closeAdd} aria-label="Close">
                    ✕
                  </button>
                </div>

                {created ? (
                  <div className="tlive-created">
                    <p className="tlive-created__for">
                      For <b>{created.driverName}</b>
                      {created.vehicleLabel ? ` · ${created.vehicleLabel}` : ''}
                    </p>
                    <div className="tlive-created__link">{trackLinkFor(created.key)}</div>
                    {createdQr ? <img className="tlive-created__qr" src={createdQr} alt="Tracking link QR code" /> : null}
                    <div className="tlive-created__actions">
                      <button type="button" className="tlive-btn tlive-btn--primary" onClick={() => copyLink(created.key)}>
                        Copy link
                      </button>
                      {whatsappLink(created.phone, `School bus live tracking link for ${created.driverName}: ${trackLinkFor(created.key)}`) ? (
                        <a
                          className="tlive-btn"
                          href={whatsappLink(created.phone, `School bus live tracking link for ${created.driverName}: ${trackLinkFor(created.key)}`)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Send on WhatsApp
                        </a>
                      ) : null}
                      <button type="button" className="tlive-btn" onClick={closeAdd}>
                        Done
                      </button>
                    </div>
                    <p className="tlive-created__note">Open this link on the driver's phone, tap “Start sending location”, and the bus appears on the map.</p>
                  </div>
                ) : (
                  <form className="tlive-form" onSubmit={handleCreate}>
                    <label>
                      Driver name *
                      <input
                        list="tlive-driver-options"
                        value={form.driverName}
                        onChange={(e) => {
                          const name = e.target.value
                          const match = directory.drivers.find((d) => String(d.title || '') === name)
                          setForm((prev) => ({
                            ...prev,
                            driverName: name,
                            phone: match && !prev.phone ? String(match.phone || '') : prev.phone,
                            routeLabel: match ? String(match.route || prev.routeLabel || '') : prev.routeLabel,
                          }))
                        }}
                        placeholder="e.g. Ramesh Patil"
                      />
                      <datalist id="tlive-driver-options">
                        {directory.drivers.map((d) => (
                          <option key={d.id || d.title} value={d.title} />
                        ))}
                      </datalist>
                    </label>
                    <label>
                      Bus / vehicle
                      <input
                        list="tlive-vehicle-options"
                        value={form.vehicleLabel}
                        onChange={(e) => setForm((prev) => ({ ...prev, vehicleLabel: e.target.value }))}
                        placeholder="e.g. MH-12 AB 1234"
                      />
                      <datalist id="tlive-vehicle-options">
                        {directory.vehicles.map((v) => (
                          <option key={v.id || v.title} value={v.title} />
                        ))}
                      </datalist>
                    </label>
                    <label>
                      Route
                      <input
                        value={form.routeLabel}
                        onChange={(e) => setForm((prev) => ({ ...prev, routeLabel: e.target.value }))}
                        placeholder="e.g. North Corridor"
                      />
                    </label>
                    <label>
                      Driver phone (for WhatsApp share)
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+91 98000 00000"
                      />
                    </label>
                    {createError ? <p className="tlive-error">{createError}</p> : null}
                    <div className="tlive-form__actions">
                      <button type="button" className="tlive-btn" onClick={closeAdd}>
                        Cancel
                      </button>
                      <button type="submit" className="tlive-btn tlive-btn--primary" disabled={creating}>
                        {creating ? 'Creating…' : 'Create link'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {toasts.length
        ? createPortal(
            <div className="tlive-toasts" role="status">
              {toasts.map((toast) => (
                <div key={toast.id} className={`tlive-toast tlive-toast--${toast.tone}`}>
                  <span className="tlive-toast__dot" aria-hidden />
                  <p>{toast.text}</p>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function VehicleMap({ vehicles, selectedId, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const lastFitRef = useRef('')

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined
    const map = L.map(containerRef.current, { center: [22, 78], zoom: 4, worldCopyJump: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const t = setTimeout(() => map.invalidateSize(), 150)
    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    const withFix = vehicles.filter((v) => Number.isFinite(Number(v.lastPing?.lat)) && Number.isFinite(Number(v.lastPing?.lng)))
    const allBounds = []

    for (const vehicle of withFix) {
      const lat = Number(vehicle.lastPing.lat)
      const lng = Number(vehicle.lastPing.lng)
      const tone = vehicleTone(vehicle)
      const color = ONLINE_COLOR[tone === 'online' ? 'online' : tone === 'stale' ? 'stale' : 'offline']
      const isSelected = vehicle.id === selectedId
      L.circleMarker([lat, lng], {
        radius: isSelected ? 11 : 8,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: isSelected ? 1 : 0.85,
      })
        .bindPopup(buildPopup(vehicle, onSelect), { maxWidth: 280, className: 'tlive-leaflet-popup' })
        .on('click', () => onSelect(vehicle.id))
        .addTo(layer)
      allBounds.push([lat, lng])

      if (isSelected) {
        const trail = (vehicle.trail || []).filter((p) => Number.isFinite(Number(p?.lat)) && Number.isFinite(Number(p?.lng)))
        if (trail.length > 1) {
          L.polyline(trail.map((p) => [Number(p.lat), Number(p.lng)]), {
            color: '#4157ff',
            weight: 3,
            opacity: 0.7,
            dashArray: '1 6',
          }).addTo(layer)
        }
      }
    }

    if (selectedId) {
      const sel = withFix.find((v) => v.id === selectedId)
      if (sel) {
        const key = `sel:${selectedId}`
        if (lastFitRef.current !== key) {
          lastFitRef.current = key
          map.flyTo([Number(sel.lastPing.lat), Number(sel.lastPing.lng)], 15, { duration: 0.6 })
        }
        return
      }
    } else if (allBounds.length && lastFitRef.current !== 'all') {
      lastFitRef.current = 'all'
      map.fitBounds(L.latLngBounds(allBounds).pad(0.3), { animate: false })
    }
  }, [vehicles, selectedId, onSelect])

  return (
    <div className="tlive-map-card">
      <div ref={containerRef} className="tlive-map" role="application" aria-label="Live bus map" />
      <div className="tlive-map-legend">
        <span>
          <i className="tlive-legend-dot tlive-legend-dot--online" /> Live
        </span>
        <span>
          <i className="tlive-legend-dot tlive-legend-dot--stale" /> Signal lost
        </span>
        <span>
          <i className="tlive-legend-dot tlive-legend-dot--offline" /> Offline
        </span>
      </div>
    </div>
  )
}

export default LiveTransport
