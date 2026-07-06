function RingChart({ totalText, subtitle }) {
  return (
    <div className="ring-chart">
      <svg viewBox="0 0 120 120" className="ring-svg" aria-hidden="true">
        <circle cx="60" cy="60" r="38" className="ring-track" />
        <circle cx="60" cy="60" r="38" className="ring-segment ring-violet" strokeDasharray="126 239" />
        <circle cx="60" cy="60" r="38" className="ring-segment ring-teal" strokeDasharray="62 239" strokeDashoffset="-132" />
        <circle cx="60" cy="60" r="38" className="ring-segment ring-amber" strokeDasharray="34 239" strokeDashoffset="-201" />
      </svg>

      <div className="ring-center">
        <strong>{totalText}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  )
}

export default RingChart
