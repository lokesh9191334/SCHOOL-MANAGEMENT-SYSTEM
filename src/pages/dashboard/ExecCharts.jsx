/** Lightweight SVG charts for Executive Dashboard — no external chart lib */

function maxOf(values) {
  return Math.max(...values, 1)
}

export function Sparkline({ values = [], color = '#2f46d8', height = 36 }) {
  const width = 120
  const pad = 2
  const max = maxOf(values)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = pad + (i * (width - pad * 2)) / Math.max(values.length - 1, 1)
      const y = height - pad - ((v - min) / range) * (height - pad * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="exec-spark" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AreaTrendChart({
  seriesA = [],
  seriesB = [],
  labels = [],
  labelA = 'Series A',
  labelB = 'Series B',
  colorA = '#2f46d8',
  colorB = '#17b398',
}) {
  const width = 560
  const height = 220
  const pad = 28
  const all = [...seriesA, ...seriesB]
  const max = maxOf(all)
  const min = Math.min(...all, 0)
  const range = max - min || 1

  const toPoints = (values) =>
    values
      .map((value, index) => {
        const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1)
        const y = height - pad - ((value - min) / range) * (height - pad * 2)
        return `${x},${y}`
      })
      .join(' ')

  const toArea = (values) => {
    const coords = values.map((value, index) => {
      const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1)
      const y = height - pad - ((value - min) / range) * (height - pad * 2)
      return [x, y]
    })
    const firstX = pad
    const lastX = width - pad
    const baseY = height - pad
    return `M ${firstX} ${baseY} ${coords.map(([x, y]) => `L ${x} ${y}`).join(' ')} L ${lastX} ${baseY} Z`
  }

  const gridYs = [0.25, 0.5, 0.75].map((t) => pad + t * (height - pad * 2))

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
          <linearGradient id="execAreaA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorA} stopOpacity="0.28" />
            <stop offset="100%" stopColor={colorA} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="execAreaB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorB} stopOpacity="0.22" />
            <stop offset="100%" stopColor={colorB} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridYs.map((y) => (
          <line key={y} x1={pad} y1={y} x2={width - pad} y2={y} className="exec-chart__grid" />
        ))}
        <path d={toArea(seriesA)} fill="url(#execAreaA)" />
        <path d={toArea(seriesB)} fill="url(#execAreaB)" />
        <polyline points={toPoints(seriesA)} fill="none" stroke={colorA} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={toPoints(seriesB)} fill="none" stroke={colorB} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
  color = '#2f46d8',
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
            <div className="exec-bars__track">
              <div className="exec-bars__fill" style={{ height: `${pct}%`, background: color }} />
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
  size = 148,
}) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
  let offset = 0

  return (
    <div className="exec-donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={radius} className="exec-donut__track" />
        {segments.map((segment) => {
          const length = (segment.value / total) * circumference
          const dash = `${length} ${circumference - length}`
          const el = (
            <circle
              key={segment.label}
              cx="60"
              cy="60"
              r={radius}
              className="exec-donut__seg"
              stroke={segment.color}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          )
          offset += length
          return el
        })}
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
            <div className="exec-hbars__track">
              <div
                className="exec-hbars__fill"
                style={{ width: `${pct}%`, background: item.color || '#2f46d8' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
