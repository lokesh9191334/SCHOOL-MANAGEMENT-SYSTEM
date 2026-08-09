const lineToPoints = (values, width, height, padding = 18) => {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / (values.length - 1)
      const y = height - padding - ((value - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')
}

const lineToArea = (values, width, height, padding = 18) => {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const coordinates = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / (values.length - 1)
    const y = height - padding - ((value - min) / range) * (height - padding * 2)
    return [x, y]
  })
  const firstX = padding
  const lastX = width - padding
  const baseY = height - padding

  return `M ${firstX} ${baseY} ${coordinates.map(([x, y]) => `L ${x} ${y}`).join(' ')} L ${lastX} ${baseY} Z`
}

function TrendChart({ seriesA, seriesB, labels }) {
  const primarySeries = seriesA || [22, 28, 25, 31, 34, 39, 36, 42, 40, 44, 46, 48]
  const secondarySeries = seriesB || [18, 20, 24, 22, 28, 30, 27, 31, 35, 33, 38, 37]
  const months = labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div className="trend-chart-wrap">
      <svg viewBox="0 0 560 220" className="trend-chart" role="img" aria-label="Module performance trend">
        <defs>
          <linearGradient id="trendPrimary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c6cff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7c6cff" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="trendSecondary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5ed6ca" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#5ed6ca" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[42, 84, 126, 168].map((y) => (
          <line key={y} x1="18" y1={y} x2="542" y2={y} className="chart-grid-line" />
        ))}

        <path d={lineToArea(primarySeries, 560, 200)} fill="url(#trendPrimary)" transform="translate(0 4)" />
        <path d={lineToArea(secondarySeries, 560, 200)} fill="url(#trendSecondary)" transform="translate(0 4)" />
        <polyline points={lineToPoints(primarySeries, 560, 200)} className="chart-line violet" transform="translate(0 4)" />
        <polyline points={lineToPoints(secondarySeries, 560, 200)} className="chart-line teal" transform="translate(0 4)" />
      </svg>

      <div className="chart-months">
        {months.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </div>
  )
}

export default TrendChart
