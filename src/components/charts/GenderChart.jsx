function GenderChart({ male = 0, female = 0 }) {
  const total = male + female || 1
  const mPct = Math.round((male / total) * 100)
  const fPct = Math.round((female / total) * 100)

  return (
    <div className="gender-chart-wrap">
      <div className="gender-legend">
        <div className="gender-item">
          <div className="gender-color male"></div>
          <div>
            <strong>{male}</strong>
            <div className="gender-label">Boys</div>
          </div>
        </div>
        <div className="gender-item">
          <div className="gender-color female"></div>
          <div>
            <strong>{female}</strong>
            <div className="gender-label">Girls</div>
          </div>
        </div>
      </div>

      <div className="gender-bars">
        <div className="bar-row">
          <div className="bar-label">Boys</div>
          <div className="bar-track"><div className="bar-fill male" style={{ width: `${mPct}%` }}></div></div>
          <div className="bar-value">{mPct}%</div>
        </div>
        <div className="bar-row">
          <div className="bar-label">Girls</div>
          <div className="bar-track"><div className="bar-fill female" style={{ width: `${fPct}%` }}></div></div>
          <div className="bar-value">{fPct}%</div>
        </div>
      </div>
    </div>
  )
}

export default GenderChart
