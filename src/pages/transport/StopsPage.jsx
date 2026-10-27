import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import { getAuthUser } from '../../utils/session'
import { homePathForRole } from '../../data/roleNav'
import { fetchTransportRoutes } from '../../services/transportRoutes'
import '../../styles/transport-premium.css'

function formatTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
  if (!match) return ''
  const hours = Number(match[1])
  const minutes = match[2]
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${minutes} ${suffix}`
}

function stopKindLabel(kind) {
  if (kind === 'pickup') return 'Pickup only'
  if (kind === 'drop') return 'Drop only'
  return 'Pickup & drop'
}

function StopsPage({ mode = 'pickup' }) {
  const user = getAuthUser()
  const role = String(user?.role || '').toLowerCase()
  const isAdmin = role === 'admin' || role === 'super_admin'
  const isPickup = mode === 'pickup'

  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const rows = await fetchTransportRoutes()
        if (active) {
          setRoutes(Array.isArray(rows) ? rows : [])
          setError('')
        }
      } catch (err) {
        if (active) setError(err?.message || 'Could not load route stops.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [reloadToken])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return routes
      .map((route) => {
        const stops = (route.stops || []).filter((stop) => {
          if (stop.kind !== mode && stop.kind !== 'both') return false
          if (!needle) return true
          return [stop.name, stop.landmark, route.name, route.code].join(' ').toLowerCase().includes(needle)
        })
        return { route, stops }
      })
      .filter((group) => group.stops.length)
  }, [routes, mode, query])

  const totals = useMemo(() => {
    let points = 0
    let timed = 0
    let routesCovered = 0
    for (const route of routes) {
      const stops = (route.stops || []).filter((stop) => stop.kind === mode || stop.kind === 'both')
      if (!stops.length) continue
      routesCovered += 1
      points += stops.length
      timed += stops.filter((stop) => stop.time).length
    }
    return { points, timed, routesCovered, untimed: points - timed }
  }, [routes, mode])

  if (!user) return <Navigate replace to="/auth/login" />
  if (!isAdmin) return <Navigate replace to={homePathForRole(role)} />

  return (
    <div className="tr-page">
      <header className="tr-hero">
        <div className="tr-hero__main">
          <span className="tr-hero__badge" aria-hidden>
            <NavGlyph name={isPickup ? 'pin' : 'map'} size={26} />
          </span>
          <div>
            <p className="tr-eyebrow">Transport · {isPickup ? 'morning' : 'afternoon'}</p>
            <h1 className="tr-title">{isPickup ? 'Pickup Points' : 'Drop Points'}</h1>
            <p className="tr-sub">
              {isPickup
                ? 'Every morning pickup point comes from the route stop list — the same pin parents see on the live map.'
                : 'Every afternoon drop point comes from the route stop list — the same pin parents see on the live map.'}{' '}
              Open the route builder to change a stop.
            </p>
          </div>
        </div>
        <div className="tr-hero__side">
          <div className="tr-stats">
            <div className="tr-stat">
              <b>{totals.points}</b>
              <span>Points</span>
            </div>
            <div className="tr-stat tr-stat--gold">
              <b>{totals.routesCovered}</b>
              <span>Routes</span>
            </div>
            <div className="tr-stat">
              <b>{totals.timed}</b>
              <span>With time</span>
            </div>
            <div className="tr-stat">
              <b>{totals.untimed}</b>
              <span>No time</span>
            </div>
          </div>
          <div className="tr-actions">
            <Link className="tr-btn tr-btn--ghost" to={isPickup ? '/transport/drop-points' : '/transport/pickup-points'}>
              <NavGlyph name={isPickup ? 'map' : 'pin'} size={15} />
              {isPickup ? 'Drop points' : 'Pickup points'}
            </Link>
            <Link className="tr-btn tr-btn--primary" to="/transport/routes">
              <NavGlyph name="route" size={15} />
              Manage routes
            </Link>
          </div>
        </div>
      </header>

      {error ? <p className="tr-error">{error}</p> : null}

      {loading && !routes.length ? (
        <p className="tr-loading">
          <span className="tr-spinner" aria-hidden /> Loading points…
        </p>
      ) : null}

      {!loading && !routes.length ? (
        <section className="tr-empty">
          <h3>No routes yet</h3>
          <p>Pickup and drop points live inside routes. Create a route and place its stops on the map first.</p>
          <Link className="tr-btn tr-btn--primary" to="/transport/routes">
            <NavGlyph name="route" size={15} />
            Open route builder
          </Link>
        </section>
      ) : null}

      {routes.length ? (
        <div className="tr-toolbar">
          <label className="tr-search">
            <NavGlyph name={isPickup ? 'pin' : 'map'} size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${isPickup ? 'pickup' : 'drop'} point, landmark or route`}
              aria-label={`Search ${isPickup ? 'pickup' : 'drop'} points`}
            />
          </label>
          <button type="button" className="tr-btn tr-btn--small" onClick={() => setReloadToken((token) => token + 1)} disabled={loading}>
            <NavGlyph name="refresh" size={14} />
            Refresh
          </button>
        </div>
      ) : null}

      {routes.length && !groups.length ? (
        <section className="tr-empty">
          <h3>No {isPickup ? 'pickup' : 'drop'} points yet</h3>
          <p>
            Add stops of type “{isPickup ? 'Pickup only' : 'Drop only'}” or “Pickup &amp; drop” inside a route and they
            will appear here.
          </p>
          <Link className="tr-btn tr-btn--primary" to="/transport/routes">
            <NavGlyph name="route" size={15} />
            Open route builder
          </Link>
        </section>
      ) : null}

      {groups.length ? (
        <section className="tr-stop-directory" aria-label={`${isPickup ? 'Pickup' : 'Drop'} points by route`}>
          {groups.map(({ route, stops }) => (
            <article key={route.id} className="tr-card tr-route-group">
              <div className="tr-route-group__head">
                <div className="tr-route-card__id">
                  <span className="tr-route-code">{String(route.code || route.name || '—').slice(0, 4).toUpperCase()}</span>
                  <div>
                    <h2 className="tr-route-name">{route.name}</h2>
                    <p className="tr-route-meta">
                      {stops.length} {isPickup ? 'pickup' : 'drop'} point{stops.length === 1 ? '' : 's'} ·{' '}
                      {route.status || 'Active'}
                    </p>
                  </div>
                </div>
                <Link className="tr-btn tr-btn--small" to="/transport/routes">
                  <NavGlyph name="pencil" size={13} />
                  Edit stops
                </Link>
              </div>

              <div className="tr-stop-rows">
                {stops.map((stop) => {
                  const time = formatTime(stop.time)
                  const hasCoords = Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng))
                  return (
                    <div key={stop.id} className="tr-stop-row">
                      <span className="tr-stop-row__time">{time || '—'}</span>
                      <div className="tr-stop-row__body">
                        <p className="tr-stop-row__name">{stop.name}</p>
                        <p className="tr-stop-row__meta">
                          {[stopKindLabel(stop.kind), stop.landmark].filter(Boolean).join(' · ') || 'No landmark'}
                        </p>
                      </div>
                      {hasCoords ? (
                        <a
                          className="tr-stop-row__link"
                          href={`https://www.google.com/maps?q=${Number(stop.lat)},${Number(stop.lng)}`}
                          target="_blank"
                          rel="noreferrer"
                          title={`Open ${stop.name} in Google Maps`}
                        >
                          Map
                        </a>
                      ) : (
                        <span className="tr-stop-row__link is-static">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  )
}

export default StopsPage
