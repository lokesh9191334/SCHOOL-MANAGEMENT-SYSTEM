import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const BASE_TILES = {
  map: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
  },
}
const SATELLITE_LABELS = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Labels &copy; Esri',
}
const VIEW_KEY = 'sms_map_view'

function storedView() {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'satellite' ? 'satellite' : 'map'
  } catch {
    return 'map'
  }
}

const KIND_COLOR = { pickup: '#0f766e', drop: '#b45309', both: '#1b2a55' }

function toneOf(vehicle) {
  if (!vehicle) return 'offline'
  if (vehicle.active === false) return 'off'
  if (vehicle.online) return 'online'
  return vehicle.lastPing ? 'stale' : 'offline'
}

function busIcon(vehicle, selected) {
  const tone = toneOf(vehicle)
  return L.divIcon({
    className: 'tmap-bus-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<span class="tmap-bus-pin tmap-bus-pin--${tone}${selected ? ' is-selected' : ''}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17.5V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M5 10h14M8 14h.01M16 14h.01M7 17.5v1.5M17 17.5V19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      <i class="tmap-bus-pin__pulse" aria-hidden="true"></i>
    </span>`,
  })
}

function stopIcon(stop, order, { passed, next, highlighted, compact }) {
  const color = highlighted ? '#c026d3' : KIND_COLOR[stop.kind] || KIND_COLOR.both
  if (compact) {
    return L.divIcon({
      className: 'tmap-stop-icon',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      html: `<span class="tmap-stop-dot" style="--pin:${color}"></span>`,
    })
  }
  return L.divIcon({
    className: 'tmap-stop-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span class="tmap-stop-pin${passed ? ' is-passed' : ''}${next ? ' is-next' : ''}${highlighted ? ' is-child' : ''}" style="--pin:${color}"><b>${order}</b></span>`,
  })
}

function buildPopup(title, rows, actionLabel, onAction) {
  const el = document.createElement('div')
  el.className = 'tmap-popup'
  const heading = document.createElement('strong')
  heading.className = 'tmap-popup__title'
  heading.textContent = title || '—'
  el.appendChild(heading)
  for (const row of rows) {
    if (!row) continue
    const line = document.createElement('p')
    line.className = 'tmap-popup__row'
    line.textContent = row
    el.appendChild(line)
  }
  if (actionLabel && onAction) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'tmap-popup__btn'
    button.textContent = actionLabel
    button.addEventListener('click', onAction)
    el.appendChild(button)
  }
  return el
}

function stopKindLabel(kind) {
  if (kind === 'pickup') return 'Pickup'
  if (kind === 'drop') return 'Drop'
  return 'Pickup & drop'
}

function pingSpeedKmh(ping) {
  const kmh = Number(ping?.speedKmh)
  if (ping?.speedKmh != null && Number.isFinite(kmh)) return Math.round(kmh)
  const mps = Number(ping?.speed)
  return ping?.speed != null && Number.isFinite(mps) ? Math.round(mps * 3.6) : null
}

function TransportMap({
  layers = [],
  vehicles = [],
  selectedRouteId = '',
  selectedVehicleId = '',
  onSelectRoute,
  onSelectVehicle,
  highlightStopIds = [],
  className = '',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const fitKeyRef = useRef('')
  const focusKeyRef = useRef('')
  const [view, setView] = useState(storedView)

  const highlightKey = useMemo(() => (Array.isArray(highlightStopIds) ? highlightStopIds.join('|') : ''), [highlightStopIds])
  const highlightSet = useMemo(() => new Set(highlightKey ? highlightKey.split('|') : []), [highlightKey])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined
    const map = L.map(containerRef.current, {
      center: [22.5, 78.5],
      zoom: 4,
      worldCopyJump: true,
      zoomControl: true,
    })
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    const timer = window.setTimeout(() => map.invalidateSize(), 180)
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
    if (!map) return undefined
    const settings = BASE_TILES[view] || BASE_TILES.map
    const base = L.tileLayer(settings.url, { attribution: settings.attribution, maxZoom: 19 })
    base.addTo(map)
    const labels =
      view === 'satellite'
        ? L.tileLayer(SATELLITE_LABELS.url, { attribution: SATELLITE_LABELS.attribution, maxZoom: 19 }).addTo(map)
        : null
    return () => {
      if (map.hasLayer(base)) map.removeLayer(base)
      if (labels && map.hasLayer(labels)) map.removeLayer(labels)
    }
  }, [view])

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* storage blocked — the choice just won't persist */
    }
  }, [view])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    const highlighted = highlightSet
    const hasSelection = Boolean(selectedRouteId)
    const bounds = []
    const routeSignature = []

    for (const item of layers) {
      const { route, geometry, progress } = item
      if (!route) continue
      const path = Array.isArray(geometry) && geometry.length > 1 ? geometry : []
      const selected = route.id === selectedRouteId
      const covered = selected && progress?.completedPath?.length > 1
      if (path.length > 1) {
        routeSignature.push(`${route.id}:${path.length}:${path[0]?.join(',')}:${path[path.length - 1]?.join(',')}`)
        const base = L.polyline(path, {
          color: selected ? (covered ? '#9aa6bd' : '#c9a227') : '#4b5b76',
          weight: selected ? (covered ? 5 : 4) : 4,
          opacity: selected ? (covered ? 0.75 : 0.9) : 0.62,
          dashArray: selected && covered ? '2 9' : null,
          lineCap: 'round',
        }).addTo(layer)
        base.on('click', () => onSelectRoute?.(route.id))

        if (covered) {
          L.polyline(progress.completedPath, {
            color: '#c9a227',
            weight: 6,
            opacity: 1,
            lineCap: 'round',
          }).addTo(layer)
        }
        for (const point of path) bounds.push(point)
      }

      const showStops = !hasSelection || selected
      const compact = !selected
      route.stops?.forEach((stop, index) => {
        if (!showStops) return
        if (!Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lng))) return
        const row = progress?.stops?.[index] || null
        const marker = L.marker([Number(stop.lat), Number(stop.lng)], {
          icon: stopIcon(stop, index + 1, {
            passed: Boolean(row?.passed) && selected,
            next: Boolean(row?.isNext) && selected,
            highlighted: highlighted.has(stop.id),
            compact,
          }),
          keyboard: false,
          zIndexOffset: selected ? 300 : 100,
        })
        marker.bindTooltip(stop.name, { direction: 'top', className: 'tmap-tooltip', offset: [0, -10] })
        marker.bindPopup(
          buildPopup(stop.name, [
            `${stopKindLabel(stop.kind)}${stop.time ? ` · ${stop.time}` : ''}`,
            stop.landmark || '',
            `${Number(stop.lat).toFixed(5)}, ${Number(stop.lng).toFixed(5)}`,
          ]),
          { maxWidth: 260, className: 'tmap-leaflet-popup' },
        )
        marker.on('click', () => {
          if (onSelectRoute && route.id !== selectedRouteId) onSelectRoute(route.id)
        })
        marker.addTo(layer)
        if (selected) bounds.push([Number(stop.lat), Number(stop.lng)])
      })
    }

    const vehiclePoints = []
    for (const vehicle of vehicles) {
      const ping = vehicle.lastPing
      if (!ping || !Number.isFinite(Number(ping.lat)) || !Number.isFinite(Number(ping.lng))) continue
      const point = [Number(ping.lat), Number(ping.lng)]
      const selected = vehicle.id === selectedVehicleId
      const marker = L.marker(point, {
        icon: busIcon(vehicle, selected),
        zIndexOffset: selected ? 900 : 700,
        keyboard: false,
      })
      const kmh = pingSpeedKmh(ping)
      const tone = toneOf(vehicle)
      marker.bindTooltip(
        `${vehicle.driverName || 'Bus'}${kmh !== null ? ` · ${kmh} km/h` : ''}${
          tone === 'online' ? '' : tone === 'off' ? ' · off' : ' · signal lost'
        }`,
        { permanent: true, direction: 'top', className: 'tmap-bus-label', offset: [0, -20] },
      )
      marker.bindPopup(
        buildPopup(
          vehicle.driverName || 'Bus',
          [
            [vehicle.vehicleLabel, vehicle.routeLabel].filter(Boolean).join(' · ') || 'Route not assigned',
            `${ping.atIST || ''}${ping.atIST ? ' IST' : ''}${kmh !== null ? ` · ${kmh} km/h` : ''}`,
            vehicle.online ? 'Live now' : vehicle.lastPing ? 'Signal lost' : 'Waiting for first ping',
          ],
          'Focus on map',
          () => onSelectVehicle?.(vehicle.id),
        ),
        { maxWidth: 280, className: 'tmap-leaflet-popup' },
      )
      marker.on('click', () => onSelectVehicle?.(vehicle.id))
      marker.addTo(layer)
      bounds.push(point)
      vehiclePoints.push(point)
    }

    if (bounds.length) {
      const fixSignature = vehicles.map((vehicle) => `${vehicle.id}:${vehicle.lastPing ? '1' : '0'}`).join(',')
      const fitKey = `${selectedRouteId}|${routeSignature.join('|')}|${fixSignature}`
      if (fitKeyRef.current !== fitKey) {
        fitKeyRef.current = fitKey
        if (selectedRouteId) {
          const selectedLayer = layers.find((item) => item.route?.id === selectedRouteId)
          const selectedPath = selectedLayer?.geometry
          // Keep the bus in view even when it has left the drawn route line.
          const focus = [...(Array.isArray(selectedPath) ? selectedPath : []), ...vehiclePoints]
          map.fitBounds(L.latLngBounds(focus.length ? focus : bounds).pad(0.18), { animate: false, maxZoom: 16 })
        } else {
          map.fitBounds(L.latLngBounds(bounds).pad(0.2), { animate: false, maxZoom: 15 })
        }
      }
    }

    if (selectedVehicleId) {
      const vehicle = vehicles.find((item) => item.id === selectedVehicleId)
      const ping = vehicle?.lastPing
      if (ping && Number.isFinite(Number(ping.lat))) {
        const key = `veh:${selectedVehicleId}`
        if (focusKeyRef.current !== key) {
          focusKeyRef.current = key
          map.flyTo([Number(ping.lat), Number(ping.lng)], Math.max(map.getZoom(), 15), { duration: 0.7 })
        }
      }
    } else {
      focusKeyRef.current = ''
    }
  }, [layers, vehicles, selectedRouteId, selectedVehicleId, onSelectRoute, onSelectVehicle, highlightSet])

  return (
    <div className={`tmap-shell ${className}`.trim()}>
      <div ref={containerRef} className="tmap-canvas" role="application" aria-label="Bus route map" />
      <div className="tmap-view-switch" role="group" aria-label="Map type">
        <button
          type="button"
          className={view === 'map' ? 'is-active' : ''}
          aria-pressed={view === 'map'}
          onClick={() => setView('map')}
        >
          Map
        </button>
        <button
          type="button"
          className={view === 'satellite' ? 'is-active' : ''}
          aria-pressed={view === 'satellite'}
          onClick={() => setView('satellite')}
        >
          Satellite
        </button>
      </div>
      <div className="tmap-legend" aria-hidden>
        <span><i className="tmap-legend__dot tmap-legend__dot--live" /> Live bus</span>
        <span><i className="tmap-legend__dot tmap-legend__dot--pickup" /> Pickup</span>
        <span><i className="tmap-legend__dot tmap-legend__dot--drop" /> Drop</span>
        <span><i className="tmap-legend__line" /> Covered route</span>
      </div>
    </div>
  )
}

export default TransportMap
