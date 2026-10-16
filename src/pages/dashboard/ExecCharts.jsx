import { useId } from 'react'

/** Lightweight SVG charts for Executive Dashboard — no external chart lib */

function maxOf(values) {
  return Math.max(...values, 1)
}

/** Catmull-Rom → cubic bezier smoothing for premium curves */
function smoothPath(coords) {
  if (!coords.length) return ''
  if (coords.length < 3) {
    return `M ${coords.map(([x, y]) => `${x} ${y}`).join(' L ')}`
  }
  let d = `M ${coords[0][0]} ${coords[0][1]}`
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] || coords[i]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return d
}

const toCoords = (values, width, height, pad, min, range) =>
  values.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1)
    const y = height - pad - ((value - min) / range) * (height - pad * 2)
    return [x, y]
  })

export function Sparkline({ values = [], color = '#4157ff', height = 36 }) {
  const gradId = useId()
  const width = 120
  const pad = 3
  const max = maxOf(values)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const coords = toCoords(values, width, height, pad, min, range)
  const line = smoothPath(coords)
  const area = `${line} L ${width - pad} ${height - pad} L ${pad} ${height - pad} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="exec-spark" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.length ? (
        <circle
          cx={coords[coords.length - 1][0]}
          cy={coords[coords.length - 1][1]}
          r="2.6"
          fill={color}
          stroke="#fff"
          strokeWidth="1.2"
        />
      ) : null}
    </svg>
  )
}

export function AreaTrendChart({
  seriesA = [],
  seriesB = [],
  labels = [],
  labelA = 'Series A',
  labelB = 'Series B',
  colorA = '#4157ff',
  colorB = '#17b398',
}) {
  const gradA = useId()
  const gradB = useId()
  const width = 560
  const height = 230
  const pad = 26
  const all = [...seriesA, ...seriesB]
  const max = maxOf(all)
  const min = Math.min(...all, 0)
  const range = max - min || 1

  const coordsA = toCoords(seriesA, width, height, pad, min, range)
  const coordsB = toCoords(seriesB, width, height, pad, min, range)
  const lineA = smoothPath(coordsA)
  const lineB = smoothPath(coordsB)
  const baseY = height - pad
  const areaA = `${lineA} L ${width - pad} ${baseY} L ${pad} ${baseY} Z`
  const areaB = `${lineB} L ${width - pad} ${baseY} L ${pad} ${baseY} Z`
  const gridYs = [0.25, 0.5, 0.75].map((t) => pad + t * (height - pad * 2))
  const last = coordsA[coordsA.length - 1]

  return (
    <div className="exec-chart">
      <div className="exec-chart__legend">
        <span>
          <i style={{ background: colorA }} />
          {labelA}
        </span>
        <span>
          <i style={{ background: colorB }} />
          {labelB}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="exec-chart__svg" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={gradA} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.3" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={gradB} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorB} stopOpacity="0.24" />
            <stop offset="100%" stopColor={colorB} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridYs.map((y) => (
          <line key={y} x1={pad} y1={y} x2={width - pad} y2={y} className="exec-chart__grid" />
        ))}
        <path d={areaB} fill={`url(#${gradB})`} />
        <path d={areaA} fill={`url(#${gradA})`} />
        <path d={lineB} fill="none" stroke={colorB} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={lineA} fill="none" stroke={colorA} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coordsB.map(([x, y], index) => (
          <circle key={`b${index}`} cx={x} cy={y} r="3" fill="#fff" stroke={colorB} strokeWidth="1.8">
            <title>{`${labels[index] || ''} · ${labelB}: ${seriesB[index]}`}</title>
          </circle>
        ))}
        {coordsA.map(([x, y], index) => (
          <circle key={`a${index}`} cx={x} cy={y} r="3.2" fill="#fff" stroke={colorA} strokeWidth="2">
            <title>{`${labels[index] || ''} · ${labelA}: ${seriesA[index]}`}</title>
          </circle>
        ))}
        {last ? (
          <text x={Math.min(last[0], width - pad)} y={last[1] - 10} textAnchor="end" className="exec-chart__lastval">
            {seriesA[seriesA.length - 1]}
          </text>
        ) : null}
      </svg>
      <div className="exec-chart__axis">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  )
}

export function BarClusterChart({
  labels = [],
  values = [],
  color = '#4157ff',
  formatValue = (v) => String(v),
}) {
  const max = maxOf(values)
  return (
    <div className="exec-bars" role="img" aria-label="Bar chart">
      {labels.map((label, index) => {
        const value = values[index] || 0
        const pct = Math.max(6, Math.round((value / max) * 100))
        return (
          <div key={label} className="exec-bars__col">
            <strong>{formatValue(value)}</strong>
            <div
              className="exec-bars__track"
              title={`${label}: ₹${Math.round(value).toLocaleString('en-IN')}`}
            >
              <div className="exec-bars__fill" style={{ height: `${pct}%`, background: `linear-gradient(180deg, ${color}, ${color}b3)` }} />
            </div>
            <span>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function DonutChart({
  segments = [],
  centerValue = '',
  centerLabel = '',
  size = 152,
}) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  const gap = total > 1 ? 3 : 0
  const arcs = []
  let runningOffset = 0
  for (const segment of segments) {
    const length = Math.max((segment.value / total) * circumference - gap, 0.5)
    arcs.push({ segment, length, offset: runningOffset })
    runningOffset += length + gap
  }

  return (
    <div className="exec-donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={radius} className="exec-donut__track" />
        {arcs.map(({ segment, length, offset }) => (
          <circle
            key={segment.label}
            cx="60"
            cy="60"
            r={radius}
            className="exec-donut__seg"
            stroke={segment.color}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 60 60)"
          >
            <title>{`${segment.label}: ${segment.value}`}</title>
          </circle>
        ))}
      </svg>
      <div className="exec-donut__center">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  )
}

export function HorizontalBars({ items = [] }) {
  const max = maxOf(items.map((i) => i.value))
  return (
    <div className="exec-hbars">
      {items.map((item) => {
        const pct = Math.round((item.value / max) * 100)
        return (
          <div key={item.label} className="exec-hbars__row">
            <div className="exec-hbars__meta">
              <span>{item.label}</span>
              <strong>{item.display || item.value}</strong>
            </div>
            <div className="exec-hbars__track" title={`${item.label}: ${item.display || item.value}`}>
              <div
                className="exec-hbars__fill"
                style={{ width: `${pct}%`, background: item.color || '#4157ff' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
