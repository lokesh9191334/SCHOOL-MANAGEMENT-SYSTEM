import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate } from 'react-router-dom'
import QRCode from 'qrcode'
import NavGlyph from '../../layouts/NavGlyph'
import TransportMap from '../../components/transport/TransportMap'
import { getAuthUser } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import { computeRouteProgress, formatDistance, formatEta } from '../../utils/routeProgress'
import {
  fetchLiveVehicles,
  fetchOverspeedAlerts,
  fetchWhatsAppStatus,
  createTrackingKey,
  updateTrackingKey,
  setTrackingKeyActive,
  sendTrackingKeyNow,
  removeTrackingKey,
  respondOverspeedAlert,
} from '../../services/transportLive'
import {
  fetchRouteGeometry,
  fetchTransportDrivers,
  fetchTransportVehicles,
} from '../../services/transportRoutes'
import '../../styles/transport-premium.css'
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

function trackLinkFor(key) {
  return `${window.location.origin}/track/${key}`
}

function whatsappLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  const number = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return `+${digits}`
}

function whatsAppState(vehicle, todayIST) {
  const sentToday = Boolean(todayIST) && vehicle.lastAutoSentOn === todayIST
  if (vehicle.active === false) {
    return { tone: 'off', label: 'Link switched off', detail: 'No daily send while the link is off.' }
  }
  if (vehicle.autoSend !== true) {
    return {
      tone: sentToday ? 'ok' : 'off',
      label: 'Daily WhatsApp off',
      detail: sentToday ? 'Sent manually today' : 'Turn on once — then it sends itself.',
    }
  }
  if (!vehicle.phone) {
    return { tone: 'warn', label: 'WhatsApp number missing', detail: 'Add the driver number to start daily sends.' }
  }
  if (sentToday) {
    return {
      tone: 'ok',
      label: 'Sent today',
      detail: vehicle.lastAutoSendAtIST || '',
    }
  }
  if (
    vehicle.lastAutoSendStatus === 'failed' &&
    String(vehicle.lastAutoSendAtIST || '').startsWith(todayIST || '~')
  ) {
    return {
      tone: 'danger',
      label: 'Send failed today',
      detail: vehicle.lastAutoSendError || 'Open setup and retry.',
    }
  }
  return { tone: 'wait', label: 'Scheduled daily', detail: 'Next send 6:00 AM IST' }
}

function speedKmh(speed) {
  if (speed == null || !Number.isFinite(Number(speed))) return null
  return Math.round(Number(speed) * 3.6)
}

function vehicleTone(vehicle) {
  if (vehicle.active === false) return 'off'
  if (vehicle.online) return 'online'
  return vehicle.lastPing ? 'stale' : 'offline'
}

function stopKindLabel(kind) {
  if (kind === 'pickup') return 'Pickup'
  if (kind === 'drop') return 'Drop'
  return 'Pickup & drop'
}

function formatStopTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
  if (!match) return ''
  const hours = Number(match[1])
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${match[2]} ${suffix}`
}

function stopsSignature(stops) {
  return (Array.isArray(stops) ? stops : [])
    .map((stop) => `${Number(stop.lat).toFixed(5)},${Number(stop.lng).toFixed(5)}`)
    .join('|')
}

function initialsOf(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?'
}

function LiveTransport() {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [vehicles, setVehicles] = useState([])
  const [routes, setRoutes] = useState([])
  const [directory, setDirectory] = useState({ drivers: [], vehicles: [] })
  const [staleAfterSec, setStaleAfterSec] = useState(150)
  const [alerts, setAlerts] = useState([])
  const [limitKmh, setLimitKmh] = useState(55)
  const [respondingId, setRespondingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [liveToken, setLiveToken] = useState(0)
  const [directoryToken, setDirectoryToken] = useState(0)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedRouteId, setSelectedRouteId] = useState('')
  const [geometry, setGeometry] = useState({})
  const geometryInFlight = useRef(new Set())

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ routeId: '', driverName: '', vehicleLabel: '', phone: '', autoSend: false })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [created, setCreated] = useState(null)
  const [createdQr, setCreatedQr] = useState('')
  const [qrMap, setQrMap] = useState({})
  const [toasts, setToasts] = useState([])

  const [waStatus, setWaStatus] = useState(null)
  const [waStatusError, setWaStatusError] = useState('')
  const [waToken, setWaToken] = useState(0)
  const [waTarget, setWaTarget] = useState(null)
  const [waForm, setWaForm] = useState({ phone: '', autoSend: false })
  const [waError, setWaError] = useState('')
  const [waSaving, setWaSaving] = useState(false)
  const [waSending, setWaSending] = useState(false)

  const pushToast = useCallback((tone, text) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev.slice(-3), { id, tone, text }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4600)
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    setLiveToken((value) => value + 1)
    setDirectoryToken((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchLiveVehicles()
      .then((data) => {
        if (cancelled) return
        setVehicles(Array.isArray(data.vehicles) ? data.vehicles : [])
        if (Array.isArray(data.routes)) setRoutes(data.routes)
        if (Number.isFinite(Number(data.staleAfterSec))) setStaleAfterSec(Number(data.staleAfterSec))
        setError('')
        setLastRefresh(Date.now())
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || 'Could not load live positions.')
        setLoading(false)
      })
    fetchOverspeedAlerts()
      .then((speed) => {
        if (cancelled) return
        setAlerts(Array.isArray(speed.alerts) ? speed.alerts : [])
        if (Number.isFinite(Number(speed.limitKmh))) setLimitKmh(Number(speed.limitKmh))
      })
      .catch(() => {
        /* alerts panel is secondary — live map still works without it */
      })
    return () => {
      cancelled = true
    }
  }, [liveToken])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchTransportDrivers(), fetchTransportVehicles()])
      .then(([drivers, buses]) => {
        if (cancelled) return
        setDirectory({
          drivers: Array.isArray(drivers) ? drivers : [],
          vehicles: Array.isArray(buses) ? buses : [],
        })
      })
      .catch(() => {
        /* driver/bus labels fall back to tracking-link values */
      })
    return () => {
      cancelled = true
    }
  }, [directoryToken])

  useEffect(() => {
    let cancelled = false
    fetchWhatsAppStatus()
      .then((data) => {
        if (cancelled) return
        setWaStatus(data)
        setWaStatusError('')
      })
      .catch((err) => {
        if (cancelled) return
        setWaStatusError(err?.message || 'Could not load daily WhatsApp status.')
      })
    return () => {
      cancelled = true
    }
  }, [waToken])

  useEffect(() => {
    if (!autoRefresh) return undefined
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setLiveToken((value) => value + 1)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [autoRefresh])

  const activeRouteId = useMemo(
    () => (routes.some((route) => route.id === selectedRouteId) ? selectedRouteId : ''),
    [routes, selectedRouteId],
  )
  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === activeRouteId) || null,
    [routes, activeRouteId],
  )

  const routeVehicle = useMemo(() => {
    if (!selectedRoute) return null
    const preferred = vehicles.find((vehicle) => vehicle.id === selectedVehicleId && vehicle.routeId === selectedRoute.id)
    if (preferred) return preferred
    return (
      vehicles.find((vehicle) => vehicle.routeId === selectedRoute.id && vehicle.online) ||
      vehicles.find((vehicle) => vehicle.routeId === selectedRoute.id && vehicle.lastPing) ||
      vehicles.find((vehicle) => vehicle.routeId === selectedRoute.id) ||
      null
    )
  }, [selectedRoute, selectedVehicleId, vehicles])

  const selectedDriver = useMemo(() => {
    if (!selectedRoute?.driverId) return null
    return directory.drivers.find((driver) => driver.id === selectedRoute.driverId) || null
  }, [selectedRoute, directory.drivers])

  const selectedBus = useMemo(() => {
    if (!selectedRoute?.vehicleId) return null
    return directory.vehicles.find((bus) => bus.id === selectedRoute.vehicleId) || null
  }, [selectedRoute, directory.vehicles])

  const selectedSignature = selectedRoute ? stopsSignature(selectedRoute.stops) : ''
  const selectedGeometryEntry =
    selectedRoute && geometry[selectedRoute.id]?.signature === selectedSignature
      ? geometry[selectedRoute.id]
      : null
  const selectedCoordinates = selectedGeometryEntry?.data?.coordinates || null

  const selectedProgress = useMemo(
    () =>
      selectedRoute && Array.isArray(selectedCoordinates) && selectedCoordinates.length > 1
        ? computeRouteProgress({ geometry: selectedCoordinates, stops: selectedRoute.stops, vehicle: routeVehicle })
        : null,
    [selectedRoute, selectedCoordinates, routeVehicle],
  )

  const mapLayers = useMemo(() => {
    const wanted = new Set()
    for (const vehicle of vehicles) {
      if (
        vehicle.routeId &&
        Number.isFinite(Number(vehicle.lastPing?.lat)) &&
        Number.isFinite(Number(vehicle.lastPing?.lng))
      ) {
        wanted.add(vehicle.routeId)
      }
    }
    if (activeRouteId) wanted.add(activeRouteId)
    const layers = []
    for (const route of routes) {
      if (!wanted.has(route.id)) continue
      const entry = geometry[route.id]
      if (!entry || entry.signature !== stopsSignature(route.stops)) continue
      const coordinates = entry.data?.coordinates
      if (!Array.isArray(coordinates) || coordinates.length < 2) continue
      const vehicle =
        route.id === activeRouteId
          ? routeVehicle
          : vehicles.find(
              (item) =>
                item.routeId === route.id &&
                Number.isFinite(Number(item.lastPing?.lat)) &&
                Number.isFinite(Number(item.lastPing?.lng)),
            ) || null
      layers.push({
        route,
        geometry: coordinates,
        progress: vehicle
          ? computeRouteProgress({ geometry: coordinates, stops: route.stops, vehicle })
          : null,
      })
    }
    layers.sort(
      (a, b) => (a.route.id === activeRouteId ? 1 : 0) - (b.route.id === activeRouteId ? 1 : 0),
    )
    return layers
  }, [vehicles, routes, geometry, activeRouteId, routeVehicle])

  useEffect(() => {
    const wanted = []
    for (const route of routes) {
      if (!Array.isArray(route.stops) || route.stops.length < 2) continue
      const hasLive = vehicles.some(
        (vehicle) =>
          vehicle.routeId === route.id &&
          Number.isFinite(Number(vehicle.lastPing?.lat)) &&
          Number.isFinite(Number(vehicle.lastPing?.lng)),
      )
      if (!hasLive && route.id !== activeRouteId) continue
      const signature = stopsSignature(route.stops)
      const entry = geometry[route.id]
      if (entry && entry.signature === signature) continue
      const flightKey = `${route.id}:${signature}`
      if (geometryInFlight.current.has(flightKey)) continue
      wanted.push({ routeId: route.id, signature, flightKey })
      if (wanted.length >= 12) break
    }
    for (const item of wanted) {
      geometryInFlight.current.add(item.flightKey)
      fetchRouteGeometry(item.routeId)
        .then((data) => {
          setGeometry((prev) => ({
            ...prev,
            [item.routeId]: { signature: item.signature, data },
          }))
        })
        .catch((err) => {
          setGeometry((prev) => ({
            ...prev,
            [item.routeId]: {
              signature: item.signature,
              error: err?.message || 'Could not draw the road path.',
            },
          }))
        })
        .finally(() => {
          geometryInFlight.current.delete(item.flightKey)
        })
    }
  }, [routes, vehicles, activeRouteId, geometry])

  const retryGeometry = useCallback((routeId) => {
    setGeometry((prev) => {
      if (!prev[routeId]) return prev
      const next = { ...prev }
      delete next[routeId]
      return next
    })
  }, [])

  const handleSelectRoute = useCallback(
    (id) => {
      setSelectedRouteId(id)
      setSelectedVehicleId((prev) => {
        if (!prev) return prev
        if (!id) return ''
        const vehicle = vehicles.find((item) => item.id === prev)
        return vehicle && vehicle.routeId === id ? prev : ''
      })
    },
    [vehicles],
  )

  const handleSelectVehicle = useCallback(
    (id) => {
      setSelectedVehicleId(id)
      const vehicle = vehicles.find((item) => item.id === id)
      setSelectedRouteId(vehicle?.routeId || '')
    },
    [vehicles],
  )

  const openAdd = () => {
    setShowAdd(true)
    setCreateError('')
    setCreated(null)
    setCreatedQr('')
    setForm({ routeId: '', driverName: '', vehicleLabel: '', phone: '', autoSend: false })
  }

  const closeAdd = () => {
    setShowAdd(false)
    setCreating(false)
    setCreateError('')
    setCreated(null)
    setCreatedQr('')
  }

  const openWaSetup = (vehicle) => {
    setWaTarget(vehicle)
    setWaForm({
      phone: vehicle.phone ? `+${String(vehicle.phone).replace(/\D/g, '')}` : '',
      autoSend: vehicle.autoSend === true,
    })
    setWaError('')
  }

  const closeWaSetup = () => {
    if (waSaving || waSending) return
    setWaTarget(null)
    setWaError('')
  }

  const saveWaSetup = async (event) => {
    event.preventDefault()
    if (!waTarget) return
    if (waForm.autoSend && !waForm.phone.trim()) {
      setWaError('Enter the driver’s WhatsApp number to turn on daily auto-send.')
      return
    }
    setWaSaving(true)
    setWaError('')
    try {
      const updated = await updateTrackingKey(waTarget.id, {
        phone: waForm.phone,
        autoSend: waForm.autoSend,
      })
      setWaTarget(updated)
      setWaForm((prev) => ({ ...prev, phone: prev.phone.trim() }))
      pushToast(
        'ok',
        updated.autoSend
          ? `Daily WhatsApp on for ${updated.driverName} · 6:00 AM IST.`
          : `Daily WhatsApp off for ${updated.driverName}.`,
      )
      refresh()
      setWaToken((value) => value + 1)
    } catch (err) {
      setWaError(err?.message || 'Could not save daily WhatsApp settings.')
    } finally {
      setWaSaving(false)
    }
  }

  const sendWaNow = async () => {
    if (!waTarget) return
    setWaSending(true)
    setWaError('')
    try {
      const result = await sendTrackingKeyNow(waTarget.id)
      setWaTarget(result.key)
      if (!waForm.phone && result.key?.phone) {
        setWaForm((prev) => ({ ...prev, phone: `+${String(result.key.phone).replace(/\D/g, '')}` }))
      }
      pushToast('ok', `WhatsApp sent to ${formatPhone(result.key?.phone) || 'the driver'}${result.sentAtIST ? ` at ${result.sentAtIST}` : ''}.`)
      refresh()
      setWaToken((value) => value + 1)
    } catch (err) {
      setWaError(
        err?.missing?.length
          ? `${err.message} Missing: ${err.missing.join(', ')}.`
          : err?.message || 'Could not send the WhatsApp message.',
      )
      setWaToken((value) => value + 1)
    } finally {
      setWaSending(false)
    }
  }

  const handleRoutePick = (routeId) => {
    const route = routes.find((item) => item.id === routeId) || null
    const driver = route?.driverId
      ? directory.drivers.find((item) => item.id === route.driverId) || null
      : null
    const bus = route?.vehicleId
      ? directory.vehicles.find((item) => item.id === route.vehicleId) || null
      : null
    setForm((prev) => ({
      ...prev,
      routeId,
      driverName: routeId ? driver?.name || prev.driverName : prev.driverName,
      phone: routeId ? driver?.phone || prev.phone : prev.phone,
      vehicleLabel: routeId ? bus?.number || route?.vehicleLabel || prev.vehicleLabel : prev.vehicleLabel,
    }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.driverName.trim()) {
      setCreateError('Driver name is required.')
      return
    }
    if (form.autoSend && !form.phone.trim()) {
      setCreateError('Enter the driver’s WhatsApp number to turn on daily auto-send.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const record = await createTrackingKey(form)
      setCreated(record)
      const link = trackLinkFor(record.key)
      try {
        const qr = await QRCode.toDataURL(link, {
          width: 240,
          margin: 1,
          color: { dark: '#131313', light: '#ffffff' },
        })
        setCreatedQr(qr)
      } catch {
        setCreatedQr('')
      }
      if (record.routeId) {
        setSelectedRouteId(record.routeId)
        setSelectedVehicleId(record.id)
      }
      refresh()
      setWaToken((value) => value + 1)
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
      const qr = await QRCode.toDataURL(trackLinkFor(vehicle.key), {
        width: 200,
        margin: 1,
        color: { dark: '#131313', light: '#ffffff' },
      })
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
      refresh()
      setWaToken((value) => value + 1)
    } catch (err) {
      pushToast('err', err?.message || 'Could not update the link.')
    }
  }

  const handleDelete = async (vehicle) => {
    if (!window.confirm(`Delete tracking link for ${vehicle.driverName}? This cannot be undone.`)) return
    try {
      await removeTrackingKey(vehicle.id)
      pushToast('ok', 'Tracking link deleted.')
      if (selectedVehicleId === vehicle.id) setSelectedVehicleId('')
      refresh()
      setWaToken((value) => value + 1)
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
      refresh()
    } catch (err) {
      pushToast('err', err?.message || 'Could not record the response.')
    } finally {
      setRespondingId('')
    }
  }

  const counts = useMemo(() => {
    const online = vehicles.filter((v) => v.online).length
    const activeLinks = vehicles.filter((v) => v.active !== false).length
    const liveRoutes = routes.filter((route) =>
      vehicles.some((vehicle) => vehicle.routeId === route.id && vehicle.online),
    ).length
    const openAlerts = alerts.filter((a) => a.status === 'open').length
    return { online, activeLinks, total: vehicles.length, liveRoutes, routes: routes.length, openAlerts }
  }, [vehicles, routes, alerts])

  const openAlerts = useMemo(() => alerts.filter((a) => a.status === 'open'), [alerts])
  const closedAlerts = useMemo(() => alerts.filter((a) => a.status !== 'open').slice(0, 8), [alerts])

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
              Every bus moves along its real road route. Route progress, next stop and ETA come from the
              driver&apos;s live GPS — after {Math.round(staleAfterSec / 60)} minutes without a ping the bus is
              shown offline.
            </p>
          </div>
        </div>
        <div className="tlive-hero__side">
          <div className="tlive-hero__counts">
            <span className="tlive-count tlive-count--ok">{counts.online} live</span>
            <span className="tlive-count">{counts.activeLinks} links on</span>
            <span className="tlive-count">
              {counts.liveRoutes}/{counts.routes} routes live
            </span>
            <span className="tlive-count">{counts.total} total</span>
            {waStatus?.autoSendEnabled ? (
              <span className="tlive-count tlive-count--wa">{waStatus.autoSendEnabled} daily WhatsApp</span>
            ) : null}
            {counts.openAlerts ? <span className="tlive-count tlive-count--alert">{counts.openAlerts} overspeed</span> : null}
          </div>
          <div className="tlive-hero__actions">
            <Link className="tlive-btn tlive-btn--ghost" to="/transport/routes">
              <NavGlyph name="route" size={15} />
              Route builder
            </Link>
            <button type="button" className="tlive-btn tlive-btn--ghost" onClick={() => setAutoRefresh((v) => !v)}>
              <NavGlyph name="refresh" size={15} />
              {autoRefresh ? 'Auto refresh: on' : 'Auto refresh: off'}
            </button>
            <button type="button" className="tlive-btn tlive-btn--ghost" onClick={refresh} disabled={loading}>
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
      {waStatusError ? <p className="tlive-error">{waStatusError}</p> : null}

      {waStatus ? (
        <section className="tlive-wa-bar" aria-label="Daily WhatsApp driver links">
          <div className="tlive-wa-bar__lead">
            <span className="tlive-wa-bar__badge" aria-hidden>
              <NavGlyph name="message" size={20} />
            </span>
            <div>
              <p className="tlive-wa-bar__kicker">No daily admin work</p>
              <h2 className="tlive-wa-bar__title">Driver link on WhatsApp — every day at 6:00 AM IST</h2>
              <p className="tlive-wa-bar__sub">
                {waStatus.autoSendEnabled
                  ? `${waStatus.autoSendEnabled} bus${waStatus.autoSendEnabled === 1 ? '' : 'es'} scheduled · ${waStatus.sentToday} sent today${waStatus.failedToday ? ` · ${waStatus.failedToday} failed` : ''}`
                  : 'Turn on auto-send for a bus below. The permanent tracking link reaches the driver once every morning — you never send it manually.'}
              </p>
            </div>
          </div>
          <div className="tlive-wa-bar__chips">
            <span className={`tlive-wa-chip ${waStatus.configured ? 'is-ok' : 'is-warn'}`}>
              {waStatus.configured ? 'Meta WhatsApp connected' : 'WhatsApp setup needed'}
            </span>
            <span className={`tlive-wa-chip ${waStatus.cronReady ? 'is-ok' : 'is-warn'}`}>
              {waStatus.cronReady ? 'Daily cron ready' : 'CRON_SECRET missing'}
            </span>
            <span className="tlive-wa-chip">{waStatus.sentToday} sent today</span>
            {waStatus.autoSendMissingPhone ? (
              <span className="tlive-wa-chip is-warn">{waStatus.autoSendMissingPhone} number missing</span>
            ) : null}
          </div>
        </section>
      ) : null}

      {waStatus && waStatus.autoSendEnabled > 0 && !waStatus.configured ? (
        <p className="tlive-wa-alert" role="alert">
          <b>WhatsApp API not configured.</b> Daily messages stay off until these Vercel environment
          variables are added: {waStatus.missing.join(', ')}. Tracking links and live GPS keep working.
        </p>
      ) : null}

      {waStatus && waStatus.autoSendEnabled > 0 && waStatus.configured && !waStatus.cronReady ? (
        <p className="tlive-wa-alert tlive-wa-alert--warn" role="alert">
          <b>CRON_SECRET missing.</b> The automatic 6:00 AM IST run is disabled. Add CRON_SECRET on
          Vercel and redeploy. You can still use “Send now” for a real message.
        </p>
      ) : null}

      {openAlerts.length ? (
        <section className="osd-panel" role="alert" aria-label="Bus overspeed warnings">
          <div className="osd-panel__head">
            <div>
              <p className="osd-panel__kicker">Safety warning</p>
              <h2 className="osd-panel__title">Bus overspeed above {limitKmh} km/h</h2>
              <p className="osd-panel__sub">
                Admins were emailed with the bus number, driver details, the real GPS speed at the time and the
                exact time. Respond after you have followed up.
              </p>
            </div>
            <span className="osd-panel__live">
              <i className="osd-panel__live-dot" aria-hidden /> Live
            </span>
          </div>
          {openAlerts.map((a) => (
            <article key={a.id} className="osd-card">
              <div className="osd-card__speed" aria-label={`Latest speed ${a.lastKmh ?? a.speedKmh} km per hour`}>
                {a.lastKmh ?? a.speedKmh}
                <small> km/h</small>
              </div>
              <div className="osd-card__body">
                <p className="osd-card__title">
                  {a.busNo || 'Bus'} <span aria-hidden>·</span> {a.driverName || 'Driver'}
                </p>
                <p className="osd-card__meta">{[a.routeLabel, a.phone].filter(Boolean).join(' · ') || 'Route not set'}</p>
                <p className="osd-card__meta">
                  Alert raised at <b>{a.triggerKmh ?? a.speedKmh} km/h</b> · peak <b>{a.speedKmh} km/h</b>
                  {a.speedSource === 'gps' ? ' · phone GPS' : a.speedSource === 'derived' ? ' · calculated from GPS' : ''}
                  {a.accuracy != null ? ` (±${a.accuracy} m)` : ''}
                </p>
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
              <b>{a.busNo || 'Bus'}</b> · {a.driverName} · {a.triggerKmh ?? a.speedKmh} km/h at alert · peak {a.speedKmh} km/h · started {a.startedAtIST} IST · responded{' '}
              <b>{a.respondedAtIST || '—'}</b> IST{a.respondedBy ? ` by ${a.respondedBy}` : ''}
              {a.responseNote ? ` — “${a.responseNote}”` : ''}
            </p>
          ))}
        </section>
      ) : null}

      <nav className="tlive-route-bar" aria-label="Filter the map by route">
        <button
          type="button"
          className={`tlive-route-chip ${!activeRouteId ? 'is-active' : ''}`.trim()}
          onClick={() => handleSelectRoute('')}
        >
          All buses
        </button>
        {routes.map((route) => {
          const liveCount = vehicles.filter((vehicle) => vehicle.routeId === route.id && vehicle.online).length
          return (
            <button
              key={route.id}
              type="button"
              className={`tlive-route-chip ${activeRouteId === route.id ? 'is-active' : ''}`.trim()}
              onClick={() => handleSelectRoute(route.id)}
            >
              <i aria-hidden />
              {route.name}
              {liveCount ? <b>{liveCount}</b> : null}
            </button>
          )
        })}
        {!routes.length ? (
          <span className="tlive-route-bar__empty">
            No routes yet. <Link to="/transport/routes">Create a route</Link> to draw bus paths.
          </span>
        ) : null}
      </nav>

      <section className="tlive-grid">
        <div className="tlive-map-wrap">
          <TransportMap
            layers={mapLayers}
            vehicles={vehicles}
            selectedRouteId={activeRouteId}
            selectedVehicleId={selectedVehicleId}
            onSelectRoute={handleSelectRoute}
            onSelectVehicle={handleSelectVehicle}
          />
          {selectedRoute && selectedGeometryEntry?.error ? (
            <p className="tlive-map-note tlive-map-note--error">
              {selectedGeometryEntry.error}
              <button type="button" onClick={() => retryGeometry(selectedRoute.id)}>
                Try again
              </button>
            </p>
          ) : null}
          {selectedRoute && !selectedGeometryEntry && selectedRoute.stops.length >= 2 ? (
            <p className="tlive-map-note">
              <span className="tr-spinner" aria-hidden /> Drawing the {selectedRoute.name} road path…
            </p>
          ) : null}
        </div>

        <div className="tlive-list">
          {selectedRoute ? (
            <RouteProgressPanel
              route={selectedRoute}
              geometryEntry={selectedGeometryEntry}
              progress={selectedProgress}
              vehicle={routeVehicle}
              driver={selectedDriver}
              bus={selectedBus}
              onClear={() => handleSelectRoute('')}
              onFocusVehicle={handleSelectVehicle}
            />
          ) : (
            <p className="tlive-focus">
              Showing every bus. Pick a route to follow its road line, next stop and ETA.
              <Link to="/transport/routes">Manage routes</Link>
            </p>
          )}

          <div className="tlive-list__head">
            <span>Buses</span>
            <span>{vehicles.length} tracking link{vehicles.length === 1 ? '' : 's'}</span>
          </div>

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
            const routeForVehicle = routes.find((route) => route.id === vehicle.routeId) || null
            const waShare = whatsappLink(
              vehicle.phone,
              `School bus live tracking link for ${vehicle.driverName}: ${trackLinkFor(vehicle.key)}`,
            )
            const waDaily = whatsAppState(vehicle, waStatus?.todayIST)
            return (
              <article
                key={vehicle.id}
                className={`tlive-vehicle tlive-vehicle--${tone} ${selectedVehicleId === vehicle.id ? 'is-selected' : ''}`.trim()}
              >
                <div className="tlive-vehicle__top">
                  <div className="tlive-vehicle__who">
                    <span className={`tlive-dot tlive-dot--${tone}`} aria-hidden />
                    <div>
                      <p className="tlive-vehicle__name">{vehicle.driverName}</p>
                      <p className="tlive-vehicle__sub">
                        {[vehicle.vehicleLabel, routeForVehicle?.name || vehicle.routeLabel].filter(Boolean).join(' · ') || 'Bus duty'}
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
                {vehicle.lastPing?.atIST ? (
                  <p className="tlive-vehicle__stamp">
                    {vehicle.lastPing.atIST} IST{vehicle.lastPing.device ? ` · ${vehicle.lastPing.device}` : ''}
                  </p>
                ) : null}

                <div className={`tlive-wa-state tlive-wa-state--${waDaily.tone}`}>
                  <NavGlyph name="message" size={14} />
                  <span className="tlive-wa-state__text">
                    <b>{waDaily.label}</b>
                    {waDaily.detail ? <em>{waDaily.detail}</em> : null}
                  </span>
                  <button
                    type="button"
                    className="tlive-wa-state__btn"
                    onClick={() => openWaSetup(vehicle)}
                  >
                    Setup
                  </button>
                </div>

                <div className="tlive-vehicle__actions">
                  <button
                    type="button"
                    className="tlive-btn"
                    onClick={() => handleSelectVehicle(vehicle.id)}
                    disabled={!vehicle.lastPing}
                  >
                    Show on map
                  </button>
                  <button type="button" className="tlive-btn" onClick={() => copyLink(vehicle.key)}>
                    Copy link
                  </button>
                  <button type="button" className="tlive-btn" onClick={() => toggleQr(vehicle)}>
                    QR
                  </button>
                  {waShare ? (
                    <a className="tlive-btn" href={waShare} target="_blank" rel="noreferrer">
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
                    {created.routeLabel ? (
                      <p className="tlive-created__for">
                        Route <b>{created.routeLabel}</b> — the bus will move along this road line.
                      </p>
                    ) : null}
                    <div className="tlive-created__link">{trackLinkFor(created.key)}</div>
                    {createdQr ? <img className="tlive-created__qr" src={createdQr} alt="Tracking link QR code" /> : null}
                    <p className={`tlive-created__wa ${created.autoSend ? 'is-on' : ''}`.trim()}>
                      <NavGlyph name="message" size={14} />
                      {created.autoSend ? (
                        <span>
                          Daily WhatsApp <b>on</b> — sent every day at 6:00 AM IST
                          {created.phone ? ` to ${formatPhone(created.phone)}` : ''}.
                        </span>
                      ) : (
                        <span>Daily WhatsApp <b>off</b> — set it once and you never send this link manually.</span>
                      )}
                    </p>
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
                      <button
                        type="button"
                        className="tlive-btn"
                        onClick={() => {
                          const target = created
                          closeAdd()
                          openWaSetup(target)
                        }}
                      >
                        Daily WhatsApp setup
                      </button>
                      <button type="button" className="tlive-btn" onClick={closeAdd}>
                        Done
                      </button>
                    </div>
                    <p className="tlive-created__note">
                      Open this link on the driver&apos;s phone, tap “Start sending location”, and the bus appears on
                      the map.
                    </p>
                  </div>
                ) : (
                  <form className="tlive-form" onSubmit={handleCreate}>
                    <label>
                      Route
                      <select value={form.routeId} onChange={(e) => handleRoutePick(e.target.value)}>
                        <option value="">No route — live GPS only</option>
                        {routes.map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.name}
                            {route.code ? ` · ${route.code}` : ''}
                            {route.trackingId ? ' · link already set' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    {!routes.length ? (
                      <p className="tlive-form__hint">
                        No routes yet. <Link to="/transport/routes">Create a route</Link> so this bus can move along
                        its road line.
                      </p>
                    ) : null}
                    <label>
                      Driver name *
                      <input
                        list="tlive-driver-options"
                        value={form.driverName}
                        onChange={(e) => {
                          const name = e.target.value
                          const match = directory.drivers.find((d) => String(d.name || '') === name)
                          setForm((prev) => ({
                            ...prev,
                            driverName: name,
                            phone: match && !prev.phone ? String(match.phone || '') : prev.phone,
                          }))
                        }}
                        placeholder="e.g. Ramesh Patil"
                      />
                      <datalist id="tlive-driver-options">
                        {directory.drivers.map((d) => (
                          <option key={d.id || d.name} value={d.name} />
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
                          <option key={v.id || v.number} value={v.number} />
                        ))}
                      </datalist>
                    </label>
                    <label>
                      Driver WhatsApp number
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+91 98000 00000"
                        inputMode="tel"
                      />
                    </label>
                    <label className="tlive-form__check">
                      <input
                        type="checkbox"
                        checked={form.autoSend}
                        onChange={(e) => setForm((prev) => ({ ...prev, autoSend: e.target.checked }))}
                      />
                      <span>
                        <b>Send this link on WhatsApp every day at 6:00 AM IST</b>
                        <small>
                          You will not have to send it manually. The driver number above is required.
                        </small>
                      </span>
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

      {waTarget
        ? createPortal(
            <div className="tlive-modal-backdrop" onClick={closeWaSetup} role="presentation">
              <div
                className="tlive-modal tlive-modal--wa"
                role="dialog"
                aria-modal="true"
                aria-label={`Daily WhatsApp setup for ${waTarget.driverName}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="tlive-modal__head">
                  <div>
                    <p className="tlive-wa-kicker">Daily WhatsApp</p>
                    <h2>{waTarget.driverName}</h2>
                    <p className="tlive-wa-meta">
                      {[waTarget.vehicleLabel, waTarget.routeLabel].filter(Boolean).join(' · ') || 'Bus duty'}
                    </p>
                  </div>
                  <button type="button" className="tlive-modal__close" onClick={closeWaSetup} aria-label="Close">
                    ✕
                  </button>
                </div>

                <form className="tlive-form" onSubmit={saveWaSetup}>
                  <div className={`tlive-wa-provider ${waStatus?.configured ? 'is-ok' : 'is-warn'}`}>
                    <div>
                      <p className="tlive-wa-provider__title">
                        {waStatus?.configured
                          ? 'Meta WhatsApp Cloud API connected'
                          : 'One-time WhatsApp setup needed'}
                      </p>
                      <p className="tlive-wa-provider__sub">
                        {waStatus?.configured
                          ? `Template ${waStatus.templateName} (${waStatus.templateLang}) · ${waStatus.provider}`
                          : waStatus
                            ? `Missing on Vercel: ${waStatus.missing.join(', ') || 'unknown'}. No message can send until this is configured.`
                            : waStatusError || 'Checking WhatsApp configuration…'}
                      </p>
                    </div>
                    <span className={`tlive-wa-chip ${waStatus?.configured ? 'is-ok' : 'is-warn'}`}>
                      {waStatus?.configured ? 'Ready' : 'Not configured'}
                    </span>
                  </div>

                  <label>
                    Driver WhatsApp number *
                    <input
                      value={waForm.phone}
                      onChange={(event) => setWaForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="+91 98000 00000"
                      inputMode="tel"
                    />
                    <small>Used only to send this bus&apos;s tracking link.</small>
                  </label>

                  <label className="tlive-form__check">
                    <input
                      type="checkbox"
                      checked={waForm.autoSend}
                      onChange={(event) => setWaForm((prev) => ({ ...prev, autoSend: event.target.checked }))}
                    />
                    <span>
                      <b>Send every day at 6:00 AM IST</b>
                      <small>
                        One message per day — the same permanent link. Already-sent days are skipped, so there
                        is no duplicate.
                      </small>
                    </span>
                  </label>

                  {waError ? <p className="tlive-error">{waError}</p> : null}

                  <div className="tlive-wa-meta tlive-wa-meta--grid">
                    <span>
                      Last send: <b>{waTarget.lastAutoSendAtIST || '—'}</b>
                    </span>
                    <span>
                      Next automatic run:{' '}
                      <b>
                        {waTarget.lastAutoSentOn && waTarget.lastAutoSentOn === waStatus?.todayIST
                          ? 'tomorrow 6:00 AM IST'
                          : '6:00 AM IST daily'}
                      </b>
                    </span>
                    <span>
                      Number: <b>{formatPhone(waTarget.phone) || 'not saved'}</b>
                    </span>
                    <span>
                      Status:{' '}
                      <b>
                        {waTarget.lastAutoSendStatus === 'failed'
                          ? 'last send failed'
                          : waTarget.lastAutoSendStatus === 'sent'
                            ? 'last send delivered to Meta'
                            : 'no send yet'}
                      </b>
                    </span>
                  </div>

                  {waTarget.lastAutoSendStatus === 'failed' && waTarget.lastAutoSendError ? (
                    <p className="tlive-wa-last-error">Last error: {waTarget.lastAutoSendError}</p>
                  ) : null}

                  <div className="tlive-form__actions">
                    <button type="button" className="tlive-btn" onClick={closeWaSetup} disabled={waSaving || waSending}>
                      Close
                    </button>
                    <button type="submit" className="tlive-btn tlive-btn--primary" disabled={waSaving || waSending}>
                      {waSaving ? 'Saving…' : 'Save settings'}
                    </button>
                    <button
                      type="button"
                      className="tlive-btn tlive-btn--wa"
                      onClick={sendWaNow}
                      disabled={waSaving || waSending || !waTarget.phone || waStatus?.configured === false}
                      title={waStatus?.configured === false ? 'Add the Meta WhatsApp credentials first.' : ''}
                    >
                      <NavGlyph name="message" size={15} />
                      {waSending ? 'Sending…' : 'Send now'}
                    </button>
                  </div>
                  {!waTarget.phone ? (
                    <p className="tlive-form__hint">Save the WhatsApp number first, then “Send now” becomes available.</p>
                  ) : null}
                </form>

                <details className="tlive-wa-template">
                  <summary>WhatsApp template wording</summary>
                  <p>{waStatus?.templateBody || 'Set a Meta Utility template with 4 body placeholders.'}</p>
                  <p className="tlive-wa-meta">
                    Placeholders map in order: driver name, bus, route, tracking link. Meta must approve the
                    template before the first message can be delivered.
                  </p>
                </details>
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

function RouteProgressPanel({ route, geometryEntry, progress, vehicle, driver, bus, onClear, onFocusVehicle }) {
  const tone = vehicle ? vehicleTone(vehicle) : 'off'
  const statusLabel =
    !vehicle
      ? 'No tracking link'
      : tone === 'online'
        ? 'Live now'
        : tone === 'stale'
          ? 'Signal lost'
          : tone === 'off'
            ? 'Tracking off'
            : 'No ping yet'
  const driverName = driver?.name || vehicle?.driverName || 'No driver assigned'
  const driverPhone = driver?.phone || vehicle?.phone || ''
  const busLabel = bus?.number || route.vehicleLabel || vehicle?.vehicleLabel || 'No bus assigned'
  const busMeta = [bus?.model, bus?.capacity ? `${bus.capacity} seats` : ''].filter(Boolean).join(' · ')
  const kmh = speedKmh(vehicle?.lastPing?.speed)
  const sourceLabel =
    geometryEntry?.data?.source === 'osrm'
      ? 'OSM road path'
      : geometryEntry?.data?.source === 'straight'
        ? 'Straight-line fallback'
        : ''
  const percent = progress ? Math.round(progress.percent) : 0
  const hasFix = Boolean(vehicle?.lastPing)

  return (
    <aside className="tlive-route-panel" aria-label={`Route progress for ${route.name}`}>
      <div className="tlive-route-panel__head">
        <div>
          <p className="tlive-route-panel__sub">
            {[route.code, `${route.stops.length} stops`, sourceLabel].filter(Boolean).join(' · ')}
          </p>
          <h2 className="tlive-route-panel__title">{route.name}</h2>
        </div>
        <div className="tlive-route-panel__actions">
          <span className={`tlive-chip tlive-chip--${tone}`}>{statusLabel}</span>
          <button type="button" className="tlive-btn" onClick={onClear}>
            All routes
          </button>
        </div>
      </div>

      <div className="tlive-driver">
        <span className="tlive-driver__avatar" aria-hidden>
          {initialsOf(driverName)}
        </span>
        <div className="tlive-driver__body">
          <p className="tlive-driver__name">{driverName}</p>
          <p className="tlive-driver__meta">
            {[busLabel, busMeta, driverPhone].filter(Boolean).join(' · ') || 'Add a driver and bus to this route'}
          </p>
        </div>
        {driverPhone ? (
          <a className="tlive-btn" href={`tel:${String(driverPhone).replace(/\s+/g, '')}`}>
            Call
          </a>
        ) : null}
      </div>

      <div className="tlive-progress">
        <div className="tlive-progress__meta">
          <span>{progress ? `${percent}% covered` : 'Waiting for GPS fix'}</span>
          <span>
            {progress
              ? `${formatDistance(progress.progressDistance)} of ${formatDistance(progress.totalDistance)}`
              : '—'}
          </span>
        </div>
        <div
          className="tlive-progress__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Bus progress along route"
        >
          <span className="tlive-progress__fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="tlive-bus-facts">
        <div className="tlive-bus-fact">
          <b>{progress?.nextStop?.name || '—'}</b>
          <span>Next stop</span>
        </div>
        <div className="tlive-bus-fact">
          <b>{progress?.etaSeconds != null ? formatEta(progress.etaSeconds) : '—'}</b>
          <span>ETA</span>
        </div>
        <div className="tlive-bus-fact">
          <b>{kmh != null ? `${kmh} km/h` : '—'}</b>
          <span>Bus speed</span>
        </div>
      </div>

      {!hasFix && geometryEntry?.data ? (
        <p className="tlive-muted">
          Route line is ready. Waiting for this bus&apos;s first GPS ping to show its position.
        </p>
      ) : null}

      <div>
        <p className="tr-kicker">Stop sequence</p>
        <ol className="tr-timeline tlive-timeline">
          {route.stops.map((stop, index) => {
            const row = progress?.stops?.[index] || null
            return (
              <li
                key={stop.id}
                className={`tr-timeline__item ${row?.passed ? 'is-passed' : ''} ${row?.isNext ? 'is-next' : ''}`.trim()}
              >
                <span className="tr-timeline__dot" aria-hidden />
                <div className="tr-timeline__head">
                  <p className="tr-timeline__name">
                    {index + 1}. {stop.name}
                  </p>
                  {stop.time ? <span className="tr-timeline__time">{formatStopTime(stop.time)}</span> : null}
                </div>
                <p className="tr-timeline__meta">
                  {[stopKindLabel(stop.kind), stop.landmark].filter(Boolean).join(' · ')}
                </p>
                {row?.isNext ? <span className="tr-timeline__badge">Next stop</span> : null}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="tlive-route-panel__foot">
        {vehicle?.lastPing ? (
          <button type="button" className="tlive-btn" onClick={() => onFocusVehicle(vehicle.id)}>
            Center bus on map
          </button>
        ) : null}
        <Link className="tlive-btn" to="/transport/routes">
          Edit this route
        </Link>
      </div>
    </aside>
  )
}

export default LiveTransport
