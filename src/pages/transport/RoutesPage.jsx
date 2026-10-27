import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import NavGlyph from '../../layouts/NavGlyph'
import TransportMap from '../../components/transport/TransportMap'
import { getAuthUser } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import { formatDistance, formatEta } from '../../utils/routeProgress'
import {
  createTransportRoute,
  deleteTransportRoute,
  fetchRouteGeometry,
  fetchTransportDrivers,
  fetchTransportRoutes,
  fetchTransportVehicles,
  updateTransportRoute,
} from '../../services/transportRoutes'
import { fetchTrackingKeys } from '../../services/transportLive'
import '../../styles/transport-premium.css'

const STATUS_OPTIONS = ['Active', 'Paused']
const KIND_OPTIONS = [
  { value: 'pickup', label: 'Pickup only' },
  { value: 'drop', label: 'Drop only' },
  { value: 'both', label: 'Pickup & drop' },
]

const EMPTY_FORM = {
  name: '',
  code: '',
  status: 'Active',
  driverId: '',
  vehicleId: '',
  trackingId: '',
  vehicleLabel: '',
  notes: '',
  stops: [],
}

function newStopId() {
  return `stp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function emptyStop() {
  return { id: newStopId(), name: '', kind: 'pickup', time: '', landmark: '', lat: '', lng: '' }
}

function toCoordinate(value, min, max) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) return null
  return Number(number.toFixed(6))
}

function stopsSignature(stops) {
  return (Array.isArray(stops) ? stops : [])
    .map((stop) => `${Number(stop.lat).toFixed(5)},${Number(stop.lng).toFixed(5)}`)
    .join('|')
}

function stopKindLabel(kind) {
  if (kind === 'pickup') return 'Pickup'
  if (kind === 'drop') return 'Drop'
  return 'Pickup & drop'
}

function routeCode(route) {
  const raw = String(route.code || route.name || '').trim()
  return raw ? raw.slice(0, 4).toUpperCase() : '—'
}

function statusTone(status) {
  return status === 'Paused' ? 'tr-chip--amber' : 'tr-chip--green'
}

function StopPickerMap({ stops, activeIndex, roadPath, onPick, onSelectStop, resetToken }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const pickRef = useRef(onPick)
  const selectRef = useRef(onSelectStop)
  const lastFitRef = useRef('')
  const lastFocusRef = useRef('')

  useEffect(() => {
    pickRef.current = onPick
    selectRef.current = onSelectStop
  }, [onPick, onSelectStop])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined
    const map = L.map(containerRef.current, { center: [22.5, 78.5], zoom: 5, worldCopyJump: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    map.on('click', (event) => pickRef.current?.([event.latlng.lat, event.latlng.lng]))
    mapRef.current = map
    const timer = window.setTimeout(() => map.invalidateSize(), 160)
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null
    if (observer) observer.observe(containerRef.current)
    return () => {
      window.clearTimeout(timer)
      if (observer) observer.disconnect()
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

    const placed = []
    stops.forEach((stop, index) => {
      const lat = toCoordinate(stop.lat, -90, 90)
      const lng = toCoordinate(stop.lng, -180, 180)
      if (lat === null || lng === null) return
      placed.push([lat, lng])
      const active = index === activeIndex
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'tmap-stop-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          html: `<span class="tmap-stop-pin${active ? ' is-next' : ''}" style="--pin:#101d3d"><b>${index + 1}</b></span>`,
        }),
        keyboard: false,
        zIndexOffset: active ? 400 : 100,
      })
      marker.bindTooltip(stop.name || `Stop ${index + 1}`, { direction: 'top', className: 'tmap-tooltip', offset: [0, -10] })
      marker.on('click', () => selectRef.current?.(index))
      marker.addTo(layer)
    })

    if (Array.isArray(roadPath) && roadPath.length > 1) {
      L.polyline(roadPath, { color: '#c9a227', weight: 5, opacity: 0.95, lineCap: 'round' }).addTo(layer)
    } else if (placed.length > 1) {
      L.polyline(placed, { color: '#1b2a55', weight: 3, opacity: 0.6, dashArray: '6 8', lineCap: 'round' }).addTo(layer)
    }

    const fitKey = `${resetToken}:${placed.length}`
    if (fitKey !== lastFitRef.current) {
      lastFitRef.current = fitKey
      if (placed.length === 1) map.setView(placed[0], 13)
      else if (placed.length > 1) map.fitBounds(L.latLngBounds(placed).pad(0.2), { animate: false, maxZoom: 16 })
    }

    const focusKey = `${resetToken}:${activeIndex}`
    if (focusKey !== lastFocusRef.current) {
      lastFocusRef.current = focusKey
      const stop = stops[activeIndex]
      const lat = toCoordinate(stop?.lat, -90, 90)
      const lng = toCoordinate(stop?.lng, -180, 180)
      if (lat !== null && lng !== null) map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.5 })
    }
  }, [stops, activeIndex, roadPath, resetToken])

  return <div ref={containerRef} className="tr-pick-map" role="application" aria-label="Route stop picker map" />
}

function RoutesPage() {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [routes, setRoutes] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [geometry, setGeometry] = useState({})

  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderKey, setBuilderKey] = useState(0)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [activeStop, setActiveStop] = useState(-1)
  const [builderError, setBuilderError] = useState('')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const geometryInFlight = useRef(new Set())

  const refresh = useCallback(() => {
    setLoading(true)
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [routeRows, driverRows, vehicleRows] = await Promise.all([
          fetchTransportRoutes(),
          fetchTransportDrivers(),
          fetchTransportVehicles(),
        ])
        if (!active) return
        setRoutes(Array.isArray(routeRows) ? routeRows : [])
        setDrivers(Array.isArray(driverRows) ? driverRows : [])
        setVehicles(Array.isArray(vehicleRows) ? vehicleRows : [])
        setError('')
      } catch (err) {
        if (active) setError(err?.message || 'Could not load transport routes.')
      } finally {
        if (active) setLoading(false)
      }
      try {
        const linkRows = await fetchTrackingKeys()
        if (active) setLinks(Array.isArray(linkRows) ? linkRows : [])
      } catch {
        if (active) setLinks([])
      }
    })()
    return () => {
      active = false
    }
  }, [reloadToken])

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) || null,
    [routes, selectedRouteId],
  )

  const selectedSignature = selectedRoute ? stopsSignature(selectedRoute.stops) : ''
  const selectedEntry = selectedRoute ? geometry[selectedRoute.id] : null

  useEffect(() => {
    if (!selectedRoute || selectedRoute.stops.length < 2) return
    const routeId = selectedRoute.id
    const signature = selectedSignature
    const entry = geometry[routeId]
    if (entry && entry.signature === signature) return
    const flightKey = `${routeId}:${signature}`
    if (geometryInFlight.current.has(flightKey)) return
    geometryInFlight.current.add(flightKey)
    fetchRouteGeometry(routeId)
      .then((data) => {
        setGeometry((prev) => ({ ...prev, [routeId]: { signature, data } }))
      })
      .catch((err) => {
        setGeometry((prev) => ({
          ...prev,
          [routeId]: { signature, error: err?.message || 'Could not draw the road path.' },
        }))
      })
      .finally(() => {
        geometryInFlight.current.delete(flightKey)
      })
  }, [selectedRoute, selectedSignature, geometry])

  const selectedGeometry =
    selectedEntry && selectedEntry.signature === selectedSignature ? selectedEntry.data?.coordinates || [] : []
  const geometryPending =
    Boolean(selectedRoute) &&
    selectedRoute.stops.length >= 2 &&
    (!selectedEntry || selectedEntry.signature !== selectedSignature)

  const driverById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers])
  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])), [vehicles])
  const linkById = useMemo(() => new Map(links.map((link) => [link.id, link])), [links])

  const visibleRoutes = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return routes.filter((route) => {
      if (statusFilter !== 'all' && (route.status || 'Active') !== statusFilter) return false
      if (!needle) return true
      const haystack = [route.name, route.code, ...(route.stops || []).map((stop) => stop.name)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [routes, query, statusFilter])

  const totals = useMemo(() => {
    const active = routes.filter((route) => (route.status || 'Active') === 'Active').length
    const stopCount = routes.reduce((sum, route) => sum + (route.stops?.length || 0), 0)
    const linked = routes.filter((route) => route.trackingId).length
    return { total: routes.length, active, stopCount, linked }
  }, [routes])

  const activeStopData = activeStop >= 0 ? form.stops[activeStop] || null : null
  const builderRoadPath =
    editingId && geometry[editingId]?.signature === stopsSignature(form.stops)
      ? geometry[editingId].data?.coordinates || []
      : []

  const openCreate = () => {
    setEditingId('')
    setForm({ ...EMPTY_FORM, stops: [emptyStop()] })
    setActiveStop(0)
    setBuilderError('')
    setBuilderKey((key) => key + 1)
    setBuilderOpen(true)
  }

  const openEdit = (route) => {
    setEditingId(route.id)
    setForm({
      name: route.name || '',
      code: route.code || '',
      status: route.status || 'Active',
      driverId: route.driverId || '',
      vehicleId: route.vehicleId || '',
      trackingId: route.trackingId || '',
      vehicleLabel: route.vehicleLabel || '',
      notes: route.notes || '',
      stops: (route.stops || []).map((stop) => ({
        id: stop.id,
        name: stop.name || '',
        kind: stop.kind || 'both',
        time: stop.time || '',
        landmark: stop.landmark || '',
        lat: stop.lat === null || stop.lat === undefined ? '' : String(stop.lat),
        lng: stop.lng === null || stop.lng === undefined ? '' : String(stop.lng),
      })),
    })
    setActiveStop(route.stops?.length ? 0 : -1)
    setBuilderError('')
    setBuilderKey((key) => key + 1)
    setBuilderOpen(true)
  }

  const closeBuilder = () => {
    if (saving) return
    setBuilderOpen(false)
    setBuilderError('')
    setEditingId('')
  }

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const updateStop = (index, field, value) =>
    setForm((prev) => ({
      ...prev,
      stops: prev.stops.map((stop, position) => (position === index ? { ...stop, [field]: value } : stop)),
    }))

  const addStop = () => {
    setForm((prev) => ({ ...prev, stops: [...prev.stops, emptyStop()] }))
    setActiveStop(form.stops.length)
  }

  const removeStop = (index) => {
    setForm((prev) => ({ ...prev, stops: prev.stops.filter((_, position) => position !== index) }))
    setActiveStop((prev) => {
      const nextLength = form.stops.length - 1
      if (!nextLength) return -1
      if (prev === index) return Math.min(index, nextLength - 1)
      return prev > index ? prev - 1 : prev
    })
  }

  const moveStop = (index, delta) => {
    const target = index + delta
    if (target < 0 || target >= form.stops.length) return
    setForm((prev) => {
      const next = [...prev.stops]
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...prev, stops: next }
    })
    setActiveStop((prev) => (prev === index ? target : prev === target ? index : prev))
  }

  const handleMapPick = ([lat, lng]) => {
    if (activeStop < 0) {
      setBuilderError('Add a stop first, then click the map to place it.')
      return
    }
    updateStop(activeStop, 'lat', lat.toFixed(6))
    updateStop(activeStop, 'lng', lng.toFixed(6))
    setBuilderError('')
  }

  const useMyLocation = () => {
    if (!activeStopData) return
    if (!navigator.geolocation) {
      setBuilderError('This browser does not support location.')
      return
    }
    setLocating(true)
    setBuilderError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          stops: prev.stops.map((stop, position_) =>
            position_ === activeStop
              ? {
                  ...stop,
                  lat: position.coords.latitude.toFixed(6),
                  lng: position.coords.longitude.toFixed(6),
                }
              : stop,
          ),
        }))
        setLocating(false)
      },
      (geoError) => {
        setBuilderError(
          geoError?.code === 1
            ? 'Location permission was denied. Allow it in the browser settings and try again.'
            : 'Could not read the current location.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  const validate = () => {
    if (!form.name.trim()) return 'Route name is required.'
    if (!form.stops.length) return 'Add at least one stop to this route.'
    for (let index = 0; index < form.stops.length; index += 1) {
      const stop = form.stops[index]
      if (!stop.name.trim()) return `Stop ${index + 1} needs a name.`
      if (toCoordinate(stop.lat, -90, 90) === null || toCoordinate(stop.lng, -180, 180) === null) {
        return `Stop ${index + 1} needs a map location — click the map or use “Use my current location”.`
      }
    }
    return ''
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setBuilderError(validationError)
      return
    }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      status: form.status,
      driverId: form.driverId,
      vehicleId: form.vehicleId,
      trackingId: form.trackingId,
      vehicleLabel: form.vehicleLabel.trim(),
      notes: form.notes.trim(),
      stops: form.stops.map((stop) => ({
        id: stop.id,
        name: stop.name.trim(),
        kind: stop.kind,
        time: stop.time,
        landmark: stop.landmark.trim(),
        lat: toCoordinate(stop.lat, -90, 90),
        lng: toCoordinate(stop.lng, -180, 180),
      })),
    }
    setSaving(true)
    setBuilderError('')
    try {
      const saved = editingId
        ? await updateTransportRoute(editingId, payload)
        : await createTransportRoute(payload)
      setRoutes((prev) =>
        editingId ? prev.map((route) => (route.id === saved.id ? saved : route)) : [saved, ...prev],
      )
      setGeometry((prev) => {
        const next = { ...prev }
        delete next[saved.id]
        return next
      })
      setSelectedRouteId(saved.id)
      setNotice(editingId ? `Route “${saved.name}” updated.` : `Route “${saved.name}” created.`)
      setBuilderOpen(false)
      setEditingId('')
      refresh()
    } catch (err) {
      setBuilderError(err?.message || 'The route could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (route) => {
    if (
      !window.confirm(
        `Delete route “${route.name}”? Stops on this route will be removed. Student allocations must be cleared first.`,
      )
    ) {
      return
    }
    setDeletingId(route.id)
    setError('')
    setNotice('')
    try {
      await deleteTransportRoute(route.id)
      setRoutes((prev) => prev.filter((item) => item.id !== route.id))
      setGeometry((prev) => {
        const next = { ...prev }
        delete next[route.id]
        return next
      })
      if (selectedRouteId === route.id) setSelectedRouteId('')
      setNotice(`Route “${route.name}” deleted.`)
      refresh()
    } catch (err) {
      setError(err?.message || 'The route could not be deleted.')
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
            <NavGlyph name="route" size={26} />
          </span>
          <div>
            <p className="tr-eyebrow">Transport · routes</p>
            <h1 className="tr-title">Bus Routes</h1>
            <p className="tr-sub">
              Draw every route on the map, order its pickup and drop stops, and assign the driver, bus and live
              tracking link. The route line follows real roads.
            </p>
          </div>
        </div>
        <div className="tr-hero__side">
          <div className="tr-stats">
            <div className="tr-stat">
              <b>{totals.total}</b>
              <span>Routes</span>
            </div>
            <div className="tr-stat tr-stat--gold">
              <b>{totals.active}</b>
              <span>Active</span>
            </div>
            <div className="tr-stat">
              <b>{totals.stopCount}</b>
              <span>Stops</span>
            </div>
            <div className="tr-stat">
              <b>{totals.linked}</b>
              <span>Live links</span>
            </div>
          </div>
          <div className="tr-actions">
            <Link className="tr-btn tr-btn--ghost" to="/transport/live">
              <NavGlyph name="locate" size={15} />
              Live tracking
            </Link>
            <button type="button" className="tr-btn tr-btn--ghost" onClick={refresh} disabled={loading}>
              <NavGlyph name="refresh" size={15} />
              Refresh
            </button>
            <button type="button" className="tr-btn tr-btn--primary" onClick={openCreate}>
              <NavGlyph name="plus" size={15} />
              New route
            </button>
          </div>
        </div>
      </header>

      {notice ? <p className="tr-ok">{notice}</p> : null}
      {error ? <p className="tr-error">{error}</p> : null}

      {!loading && !routes.length ? (
        <section className="tr-empty">
          <h3>No bus routes yet</h3>
          <p>
            Create the first route, place its stops on the map, then assign a driver and bus. Live GPS positions will
            follow the same line on the tracking map.
          </p>
          <button type="button" className="tr-btn tr-btn--primary" onClick={openCreate}>
            <NavGlyph name="plus" size={15} />
            Create the first route
          </button>
        </section>
      ) : null}

      {routes.length ? (
        <div className="tr-toolbar">
          <label className="tr-search">
            <NavGlyph name="route" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search route, code or stop"
              aria-label="Search routes"
            />
          </label>
          <select
            className="tr-select tr-select--inline"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
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

      {selectedRoute ? (
        <section className="tr-layout" aria-label={`Route preview: ${selectedRoute.name}`}>
          <div className="tr-stack tr-detail-map">
            <TransportMap
              layers={[{ route: selectedRoute, geometry: selectedGeometry, progress: null }]}
              selectedRouteId={selectedRoute.id}
            />
            {geometryPending ? (
              <p className="tr-loading">
                <span className="tr-spinner" aria-hidden /> Drawing the road path…
              </p>
            ) : null}
            {selectedEntry?.error ? (
              <div className="tr-stack">
                <p className="tr-error">{selectedEntry.error}</p>
                <button
                  type="button"
                  className="tr-btn tr-btn--small"
                  onClick={() =>
                    setGeometry((prev) => {
                      const next = { ...prev }
                      delete next[selectedRoute.id]
                      return next
                    })
                  }
                >
                  Try again
                </button>
              </div>
            ) : null}
          </div>
          <aside className="tr-card tr-card--pad tr-stack">
            <div className="tr-route-card__top">
              <div className="tr-route-card__id">
                <span className="tr-route-code">{routeCode(selectedRoute)}</span>
                <div>
                  <p className="tr-kicker">Route preview</p>
                  <h2 className="tr-route-name">{selectedRoute.name}</h2>
                  <p className="tr-route-meta">{selectedRoute.notes || 'Stops run top to bottom on the map.'}</p>
                </div>
              </div>
              <span className={`tr-chip ${statusTone(selectedRoute.status)}`}>{selectedRoute.status || 'Active'}</span>
            </div>

            <div className="tr-route-facts">
              <div className="tr-fact">
                <b>{selectedRoute.stops?.length || 0}</b>
                <span>Stops</span>
              </div>
              <div className="tr-fact">
                <b>{selectedGeometry.length > 1 ? formatDistance(selectedEntry?.data?.distanceMeters) : '—'}</b>
                <span>Road length</span>
              </div>
              <div className="tr-fact">
                <b>
                  {selectedGeometry.length > 1 && selectedEntry?.data?.durationSeconds
                    ? `≈ ${formatEta(selectedEntry.data.durationSeconds)}`
                    : '—'}
                </b>
                <span>Drive time</span>
              </div>
            </div>

            <div className="tr-info-grid">
              <div className="tr-info">
                <span>Driver</span>
                <b>{driverById.get(selectedRoute.driverId)?.name || '—'}</b>
              </div>
              <div className="tr-info">
                <span>Bus</span>
                <b>{vehicleById.get(selectedRoute.vehicleId)?.number || selectedRoute.vehicleLabel || '—'}</b>
              </div>
              <div className="tr-info">
                <span>Tracking link</span>
                <b>{selectedRoute.trackingId ? (linkById.get(selectedRoute.trackingId) ? 'Linked' : 'Link missing') : '—'}</b>
              </div>
              <div className="tr-info">
                <span>Road line</span>
                <b>{selectedEntry?.data ? (selectedEntry.data.source === 'osrm' ? 'Real road path' : 'Direct line') : '—'}</b>
              </div>
            </div>

            <div>
              <p className="tr-kicker">Stop sequence</p>
              <ol className="tr-timeline">
                {(selectedRoute.stops || []).map((stop, index) => (
                  <li key={stop.id} className="tr-timeline__item">
                    <span className="tr-timeline__dot" aria-hidden />
                    <div className="tr-timeline__head">
                      <p className="tr-timeline__name">
                        {index + 1}. {stop.name}
                      </p>
                      {stop.time ? <span className="tr-timeline__time">{stop.time}</span> : null}
                    </div>
                    <p className="tr-timeline__meta">
                      {stopKindLabel(stop.kind)}
                      {stop.landmark ? ` · ${stop.landmark}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="tr-card-actions">
              <button type="button" className="tr-btn tr-btn--small" onClick={() => openEdit(selectedRoute)}>
                <NavGlyph name="pencil" size={13} />
                Edit route
              </button>
              <button type="button" className="tr-btn tr-btn--small" onClick={() => setSelectedRouteId('')}>
                Close preview
              </button>
            </div>
          </aside>
        </section>
      ) : null}

      {loading && !routes.length ? (
        <p className="tr-loading">
          <span className="tr-spinner" aria-hidden /> Loading routes…
        </p>
      ) : null}

      {routes.length && !visibleRoutes.length ? (
        <p className="tr-muted">No route matches this search or status filter.</p>
      ) : null}

      {visibleRoutes.length ? (
        <section className="tr-route-grid" aria-label="Bus routes">
          {visibleRoutes.map((route) => {
            const driver = driverById.get(route.driverId)
            const vehicle = vehicleById.get(route.vehicleId)
            const busLabel = vehicle?.number || route.vehicleLabel
            return (
              <article
                key={route.id}
                className={`tr-card tr-route-card ${selectedRouteId === route.id ? 'is-selected' : ''}`.trim()}
              >
                <div className="tr-route-card__top">
                  <div className="tr-route-card__id">
                    <span className="tr-route-code">{routeCode(route)}</span>
                    <div>
                      <h3 className="tr-route-name">{route.name}</h3>
                      <p className="tr-route-meta">
                        {[route.stops?.length ? `${route.stops.length} stops` : 'No stops', driver?.name || 'No driver', busLabel || 'No bus']
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="tr-chips">
                    <span className={`tr-chip ${statusTone(route.status)}`}>{route.status || 'Active'}</span>
                    {route.trackingId ? <span className="tr-chip tr-chip--gold">GPS linked</span> : null}
                  </div>
                </div>

                <div className="tr-stop-chips">
                  {(route.stops || []).slice(0, 4).map((stop) => (
                    <span key={stop.id} className={`tr-stop-chip tr-stop-chip--${stop.kind || 'both'}`}>
                      <i aria-hidden />
                      {stop.name}
                    </span>
                  ))}
                  {(route.stops?.length || 0) > 4 ? (
                    <span className="tr-stop-chip">+{route.stops.length - 4} more</span>
                  ) : null}
                  {!route.stops?.length ? <span className="tr-muted">No stops added.</span> : null}
                </div>

                <div className="tr-route-card__actions">
                  <button
                    type="button"
                    className="tr-btn tr-btn--small"
                    onClick={() => setSelectedRouteId(route.id)}
                    disabled={!route.stops?.length}
                  >
                    <NavGlyph name="map" size={13} />
                    View map
                  </button>
                  <button type="button" className="tr-btn tr-btn--small" onClick={() => openEdit(route)}>
                    <NavGlyph name="pencil" size={13} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="tr-btn tr-btn--small tr-btn--danger"
                    onClick={() => handleDelete(route)}
                    disabled={deletingId === route.id}
                  >
                    {deletingId === route.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      ) : null}

      {builderOpen
        ? createPortal(
            <div className="tr-modal-backdrop" role="presentation" onClick={closeBuilder}>
              <div
                className="tr-modal"
                role="dialog"
                aria-modal="true"
                aria-label={editingId ? 'Edit bus route' : 'New bus route'}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="tr-modal__head">
                  <div>
                    <h2>{editingId ? 'Edit route' : 'New route'}</h2>
                    <p>Stops appear on the map in this order — the bus line follows the road between them.</p>
                  </div>
                  <button type="button" className="tr-close" onClick={closeBuilder} aria-label="Close route builder">
                    ✕
                  </button>
                </div>

                <form id="tr-route-form" className="tr-modal__body" onSubmit={handleSave}>
                  <div className="tr-builder">
                    <div className="tr-builder__panel">
                      <div className="tr-form-grid">
                        <div className="tr-field">
                          <label htmlFor="route-name">Route name *</label>
                          <input
                            id="route-name"
                            className="tr-input"
                            value={form.name}
                            onChange={(event) => updateField('name', event.target.value)}
                            placeholder="e.g. Lakeview — City Campus"
                            maxLength={80}
                          />
                        </div>
                        <div className="tr-field">
                          <label htmlFor="route-code">Route code</label>
                          <input
                            id="route-code"
                            className="tr-input"
                            value={form.code}
                            onChange={(event) => updateField('code', event.target.value)}
                            placeholder="e.g. R-12"
                            maxLength={24}
                          />
                        </div>
                        <div className="tr-field">
                          <label htmlFor="route-status">Status</label>
                          <select
                            id="route-status"
                            className="tr-select"
                            value={form.status}
                            onChange={(event) => updateField('status', event.target.value)}
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="tr-field">
                          <label htmlFor="route-driver">Driver</label>
                          <select
                            id="route-driver"
                            className="tr-select"
                            value={form.driverId}
                            onChange={(event) => updateField('driverId', event.target.value)}
                          >
                            <option value="">No driver</option>
                            {drivers.map((driver) => {
                              const onRoute = routes.find((route) => route.driverId === driver.id && route.id !== editingId)
                              return (
                                <option key={driver.id} value={driver.id}>
                                  {driver.name}
                                  {driver.phone ? ` · ${driver.phone}` : ''}
                                  {onRoute ? ` (on ${onRoute.name})` : ''}
                                </option>
                              )
                            })}
                          </select>
                        </div>
                        <div className="tr-field">
                          <label htmlFor="route-vehicle">Bus</label>
                          <select
                            id="route-vehicle"
                            className="tr-select"
                            value={form.vehicleId}
                            onChange={(event) => {
                              const vehicle = vehicleById.get(event.target.value)
                              updateField('vehicleId', event.target.value)
                              if (vehicle && !form.vehicleLabel.trim()) updateField('vehicleLabel', vehicle.number)
                            }}
                          >
                            <option value="">No bus</option>
                            {vehicles.map((vehicle) => {
                              const onRoute = routes.find((route) => route.vehicleId === vehicle.id && route.id !== editingId)
                              return (
                                <option key={vehicle.id} value={vehicle.id}>
                                  {vehicle.number}
                                  {vehicle.capacity ? ` · ${vehicle.capacity} seats` : ''}
                                  {onRoute ? ` (on ${onRoute.name})` : ''}
                                </option>
                              )
                            })}
                          </select>
                        </div>
                        <div className="tr-field">
                          <label htmlFor="route-link">Live tracking link</label>
                          <select
                            id="route-link"
                            className="tr-select"
                            value={form.trackingId}
                            onChange={(event) => updateField('trackingId', event.target.value)}
                          >
                            <option value="">No tracking link</option>
                            {links.map((link) => (
                              <option key={link.id} value={link.id}>
                                {link.driverName || 'Driver link'}
                                {link.vehicleLabel ? ` · ${link.vehicleLabel}` : ''}
                                {link.active === false ? ' (switched off)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="tr-field">
                          <label htmlFor="route-bus-label">Bus label (optional)</label>
                          <input
                            id="route-bus-label"
                            className="tr-input"
                            value={form.vehicleLabel}
                            onChange={(event) => updateField('vehicleLabel', event.target.value)}
                            placeholder="Shown when no bus record is linked"
                            maxLength={40}
                          />
                        </div>
                        <div className="tr-field tr-field--full">
                          <label htmlFor="route-notes">Notes</label>
                          <textarea
                            id="route-notes"
                            className="tr-textarea"
                            value={form.notes}
                            onChange={(event) => updateField('notes', event.target.value)}
                            placeholder="Staff instructions, gate details, timing notes…"
                            maxLength={300}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="tr-section-head">
                          <div>
                            <h3 className="tr-section-title">Stops</h3>
                            <p className="tr-section-sub">The bus follows this order. Pickup and drop times are shown to parents.</p>
                          </div>
                          <button type="button" className="tr-btn tr-btn--small" onClick={addStop}>
                            <NavGlyph name="plus" size={13} />
                            Add stop
                          </button>
                        </div>

                        {!form.stops.length ? (
                          <p className="tr-muted">No stops yet — add the first pickup point.</p>
                        ) : (
                          <div className="tr-stop-list">
                            {form.stops.map((stop, index) => (
                              <div
                                key={stop.id}
                                className={`tr-stop-item tr-stop-item--${stop.kind || 'both'} ${activeStop === index ? 'is-active' : ''}`.trim()}
                                role="button"
                                tabIndex={0}
                                onClick={() => setActiveStop(index)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    setActiveStop(index)
                                  }
                                }}
                              >
                                <span className="tr-stop-num">{index + 1}</span>
                                <div className="tr-stop-item__body">
                                  <p className="tr-stop-item__name">{stop.name || 'Unnamed stop'}</p>
                                  <p className="tr-stop-item__meta">
                                    {[
                                      stopKindLabel(stop.kind),
                                      stop.time,
                                      stop.lat && stop.lng
                                        ? `${Number(stop.lat).toFixed(4)}, ${Number(stop.lng).toFixed(4)}`
                                        : 'No map pin yet',
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                </div>
                                <div className="tr-stop-item__tools">
                                  <button
                                    type="button"
                                    className="tr-mini-btn"
                                    title="Move up"
                                    aria-label={`Move ${stop.name || `stop ${index + 1}`} up`}
                                    disabled={index === 0}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      moveStop(index, -1)
                                    }}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="tr-mini-btn"
                                    title="Move down"
                                    aria-label={`Move ${stop.name || `stop ${index + 1}`} down`}
                                    disabled={index === form.stops.length - 1}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      moveStop(index, 1)
                                    }}
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="tr-mini-btn tr-mini-btn--danger"
                                    title="Remove stop"
                                    aria-label={`Remove ${stop.name || `stop ${index + 1}`}`}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      removeStop(index)
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {activeStopData ? (
                          <div className="tr-stop-editor">
                            <div className="tr-stop-editor__head">
                              <p>Stop #{activeStop + 1} details</p>
                              <span className="tr-chip">{stopKindLabel(activeStopData.kind)}</span>
                            </div>
                            <div className="tr-form-grid">
                              <div className="tr-field tr-field--full">
                                <label htmlFor="stop-name">Stop name *</label>
                                <input
                                  id="stop-name"
                                  className="tr-input"
                                  value={activeStopData.name}
                                  onChange={(event) => updateStop(activeStop, 'name', event.target.value)}
                                  placeholder="e.g. Lakeview Gate"
                                  maxLength={80}
                                />
                              </div>
                              <div className="tr-field">
                                <label htmlFor="stop-kind">Stop type</label>
                                <select
                                  id="stop-kind"
                                  className="tr-select"
                                  value={activeStopData.kind}
                                  onChange={(event) => updateStop(activeStop, 'kind', event.target.value)}
                                >
                                  {KIND_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="tr-field">
                                <label htmlFor="stop-time">Time</label>
                                <input
                                  id="stop-time"
                                  type="time"
                                  className="tr-input"
                                  value={activeStopData.time}
                                  onChange={(event) => updateStop(activeStop, 'time', event.target.value)}
                                />
                              </div>
                              <div className="tr-field tr-field--full">
                                <label htmlFor="stop-landmark">Landmark</label>
                                <input
                                  id="stop-landmark"
                                  className="tr-input"
                                  value={activeStopData.landmark}
                                  onChange={(event) => updateStop(activeStop, 'landmark', event.target.value)}
                                  placeholder="Near the society main gate"
                                  maxLength={120}
                                />
                              </div>
                              <div className="tr-field">
                                <label htmlFor="stop-lat">Latitude *</label>
                                <input
                                  id="stop-lat"
                                  className="tr-input"
                                  inputMode="decimal"
                                  value={activeStopData.lat}
                                  onChange={(event) => updateStop(activeStop, 'lat', event.target.value)}
                                  placeholder="e.g. 19.076"
                                />
                              </div>
                              <div className="tr-field">
                                <label htmlFor="stop-lng">Longitude *</label>
                                <input
                                  id="stop-lng"
                                  className="tr-input"
                                  inputMode="decimal"
                                  value={activeStopData.lng}
                                  onChange={(event) => updateStop(activeStop, 'lng', event.target.value)}
                                  placeholder="e.g. 72.8777"
                                />
                              </div>
                            </div>
                            <button type="button" className="tr-btn tr-btn--small" onClick={useMyLocation} disabled={locating}>
                              <NavGlyph name="locate" size={13} />
                              {locating ? 'Locating…' : 'Use my current location'}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="tr-builder__mapwrap">
                      <StopPickerMap
                        stops={form.stops}
                        activeIndex={activeStop}
                        roadPath={builderRoadPath}
                        onPick={handleMapPick}
                        onSelectStop={setActiveStop}
                        resetToken={builderKey}
                      />
                      <p className="tr-map-hint">
                        {activeStopData ? (
                          <>
                            <b>Stop #{activeStop + 1}:</b> click anywhere on the map to set its exact location. Gold line =
                            saved road path; dashed line = preview of the stop order.
                          </>
                        ) : (
                          'Add a stop, then click the map to place it.'
                        )}
                      </p>
                    </div>
                  </div>

                  {builderError ? <p className="tr-error">{builderError}</p> : null}
                </form>

                <div className="tr-modal__foot">
                  <p className="tr-hint">
                    Assigning a driver, bus or tracking link moves it from any other route. Need a new link? Create it in{' '}
                    <Link to="/transport/live" onClick={closeBuilder}>
                      Live Bus Tracking
                    </Link>
                    .
                  </p>
                  <div className="tr-actions">
                    <button type="button" className="tr-btn" onClick={closeBuilder} disabled={saving}>
                      Cancel
                    </button>
                    <button type="submit" form="tr-route-form" className="tr-btn tr-btn--primary" disabled={saving}>
                      {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create route'}
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

export default RoutesPage
