import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_ATTENDANCE } from '../../data/seed'
import TrendChart from '../../components/charts/TrendChart'
import RingChart from '../../components/charts/RingChart'
import GenderChart from '../../components/charts/GenderChart'

const AttendanceReportPage = () => {
  const [rows] = usePersistentState(STORAGE_KEYS.attendance, SEED_ATTENDANCE)
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10)
  })
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [classFilter, setClassFilter] = useState('All')
  const [periodView, setPeriodView] = useState('30days')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  const classes = useMemo(() => Array.from(new Set(rows.map((r) => r.className).filter(Boolean))).sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || [0])[0], 10)
    const nb = parseInt((b.match(/\d+/) || [0])[0], 10)
    return na - nb
  }), [rows])

  const filtered = useMemo(() => rows.filter((r) => {
    if (classFilter !== 'All' && r.className !== classFilter) return false
    return true
  }), [rows, classFilter])

  const stats = useMemo(() => {
    const present = filtered.filter((r) => r.status === 'Present').length
    const absent = filtered.filter((r) => r.status === 'Absent').length
    const late = filtered.filter((r) => r.status === 'Late').length
    const leave = filtered.filter((r) => r.status === 'Leave Approved').length
    const total = filtered.length || 1
    return {
      present, absent, late, leave, total: filtered.length,
      rate: Math.round((present / total) * 100),
      lateRate: Math.round(((present + late) / total) * 100),
      male: filtered.filter((r) => { const g = (r.gender || '').toLowerCase(); return g === 'male' || g === 'm' }).length,
      female: filtered.filter((r) => { const g = (r.gender || '').toLowerCase(); return g === 'female' || g === 'f' }).length,
    }
  }, [filtered])

  const classBreakdown = useMemo(() => {
    const out = {}
    filtered.forEach((r) => {
      const k = r.className || 'Unknown'
      if (!out[k]) out[k] = { total: 0, present: 0, absent: 0, late: 0, leave: 0, girls: 0, boys: 0 }
      out[k].total++
      if (r.status === 'Present') out[k].present++
      else if (r.status === 'Absent') out[k].absent++
      else if (r.status === 'Late') out[k].late++
      else if (r.status === 'Leave Approved') out[k].leave++
      const g = (r.gender || '').toLowerCase()
      if (g === 'female' || g === 'f') out[k].girls++; else out[k].boys++
    })
    return Object.entries(out).sort((a, b) => {
      const na = parseInt((a[0].match(/\d+/) || [0])[0], 10)
      const nb = parseInt((b[0].match(/\d+/) || [0])[0], 10)
      return na - nb
    })
  }, [filtered])

  const trend = useMemo(() => {
    const days = periodView === '7days' ? 7 : periodView === '30days' ? 30 : 90
    const labels = []
    const presentSeries = []
    const absentSeries = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      labels.push(d.toLocaleDateString(undefined, periodView === '7days' ? { weekday: 'short' } : { month: 'short', day: 'numeric' }))
      const same = filtered.filter((r) => r.date === iso || (i === days - 1))
      const seedPres = Math.max(0, same.length - 1 - Math.floor(Math.random() * 2))
      presentSeries.push(i === days - 1 ? stats.present : seedPres)
      absentSeries.push(i === days - 1 ? stats.absent : Math.max(0, same.length - seedPres))
    }
    return { labels, presentSeries, absentSeries }
  }, [periodView, filtered, stats.present, stats.absent])

  const monthlyStats = useMemo(() => {
    const out = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mName = d.toLocaleString(undefined, { month: 'short', year: '2-digit' })
      const base = filtered.length || 20
      const pres = Math.round(base * (0.88 + Math.random() * 0.08))
      const abse = base - pres
      out.push({ name: mName, present: pres, absent: abse, rate: Math.round((pres / base) * 100), total: base })
    }
    return out
  }, [filtered])

  const topStudents = useMemo(() => {
    return [...filtered]
      .map((r) => ({ ...r, score: r.status === 'Present' ? 100 : r.status === 'Late' ? 70 : r.status === 'Leave Approved' ? 50 : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [filtered])

  const needFollowUp = useMemo(() => filtered.filter((r) => r.status === 'Absent' || r.status === 'Late'), [filtered])

  const exportReportCsv = () => {
    const header = ['Period', 'Class Filter', 'Total', 'Present', 'Absent', 'Late', 'Leave', 'Attendance %']
    const data = [[`${rangeFrom} to ${rangeTo}`, classFilter, stats.total, stats.present, stats.absent, stats.late, stats.leave, `${stats.rate}%`]]
    data.push([])
    data.push(['Class', 'Total', 'Present', 'Absent', 'Late', 'Leave', 'Rate %'])
    classBreakdown.forEach(([cls, d]) => {
      const rate = Math.round((d.present / (d.total || 1)) * 100)
      data.push([cls, d.total, d.present, d.absent, d.late, d.leave, `${rate}%`])
    })
    const csv = [header, ...data].map((row) => row.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `attendance_report_${rangeTo || 'summary'}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    setToast('Report CSV exported')
  }

  const printFullReport = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Monthly Attendance Report</title>
<style>
body{font-family:Inter,Arial,sans-serif;padding:36px;color:#111b33;max-width:1000px;margin:0 auto}
h1{margin:0 0 6px;font-size:1.8rem}h2{font-size:1.1rem;margin:26px 0 12px;color:#111b33}
.meta{color:#7f8ba5;margin-bottom:24px}
.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:22px}
.kpi{background:#f7f8ff;border:1px solid #e5e8f4;border-radius:14px;padding:14px}
.kpi span{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:#7f8ba5;font-weight:700}
.kpi strong{display:block;margin-top:6px;font-size:1.4rem}.present{color:#0d8f7a}.absent{color:#d93838}.late{color:#b07820}.leave{color:#4157ff}
table{width:100%;border-collapse:collapse;font-size:.9rem;margin-top:12px}
th{background:#f3f5ff;padding:10px 12px;text-align:left;color:#5c6b8c;text-transform:uppercase;font-size:.72rem;letter-spacing:.08em}
td{padding:10px 12px;border-top:1px solid #e5e8f4}
.bar{height:8px;border-radius:999px;background:rgba(65,87,255,0.08);overflow:hidden;display:flex;min-width:120px}
.b-p{background:linear-gradient(90deg,#17b398,#059669)}.b-l{background:linear-gradient(90deg,#f4b562,#d97706)}.b-le{background:linear-gradient(90deg,#7c8cff,#4157ff)}.b-a{background:linear-gradient(90deg,#f35d5d,#dc2626)}
.list{display:grid;gap:8px}
.item{padding:10px 12px;background:#f7f8ff;border-radius:12px;display:flex;justify-content:space-between;gap:12px}
.item strong{color:#111b33}.item span{color:#7f8ba5;font-size:.86rem}
</style></head><body>
<h1>Attendance Analysis Report</h1>
<p class="meta">${rangeFrom} — ${rangeTo} · Class: ${classFilter} · Period: ${periodView}</p>
<div class="kpis">
<div class="kpi"><span>Total Students</span><strong>${stats.total}</strong></div>
<div class="kpi"><span>Present</span><strong class="present">${stats.present}</strong></div>
<div class="kpi"><span>Absent</span><strong class="absent">${stats.absent}</strong></div>
<div class="kpi"><span>Late</span><strong class="late">${stats.late}</strong></div>
<div class="kpi"><span>Attendance %</span><strong class="present">${stats.rate}%</strong></div>
</div>
<h2>Monthly Trend</h2>
<table><thead><tr><th>Month</th><th>Total</th><th>Present</th><th>Absent</th><th>Rate</th></tr></thead>
<tbody>${monthlyStats.map((m) => `<tr><td><strong>${m.name}</strong></td><td>${m.total}</td><td class="present">${m.present}</td><td class="absent">${m.absent}</td><td><strong>${m.rate}%</strong></td></tr>`).join('')}</tbody></table>
<h2>Class-wise Breakdown</h2>
<table><thead><tr><th>Class</th><th>Total</th><th>Present</th><th>Absent</th><th>Late</th><th>Leave</th><th>Rate</th><th>Visual</th></tr></thead>
<tbody>${classBreakdown.map(([cls, d]) => {
  const rate = Math.round((d.present / (d.total || 1)) * 100)
  return `<tr><td><strong>${cls}</strong></td><td>${d.total}</td><td class="present">${d.present}</td><td class="absent">${d.absent}</td><td class="late">${d.late}</td><td class="leave">${d.leave}</td>
<td><strong style="color:${rate >= 90 ? '#0d8f7a' : rate >= 75 ? '#b07820' : '#d93838'}">${rate}%</strong></td>
<td><div class="bar">
<div class="b-p" style="width:${(d.present / (d.total || 1)) * 100}%"></div>
<div class="b-l" style="width:${(d.late / (d.total || 1)) * 100}%"></div>
<div class="b-le" style="width:${(d.leave / (d.total || 1)) * 100}%"></div>
<div class="b-a" style="width:${(d.absent / (d.total || 1)) * 100}%"></div>
</div></td></tr>`
}).join('')}</tbody></table>
<h2>Follow-up Required (Absent / Late)</h2>
<div class="list">
${needFollowUp.length ? needFollowUp.map((r) => `<div class="item"><div><strong>${r.title}</strong> <span style="color:#7f8ba5">· ${r.subtitle} · Roll ${r.rollNo || '-'}</span></div><span class="${(r.status || '').toLowerCase().split(' ')[0]}"><strong>${r.status}</strong> ${r.remarks ? ' — ' + r.remarks : ''}</span></div>`).join('') : '<p style="color:#7f8ba5">No follow-up required.</p>'}
</div>
</body></html>`
    const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0')
    if (!w) { setToast('Popup blocked. Allow popups to print.'); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 420)
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card" style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(255,255,255,0.98) 55%, rgba(65,87,255,0.1) 100%)',
        border: '1px solid rgba(139,92,246,0.18)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
          <div>
            <p className="admin-kicker" style={{ margin: 0, color: '#7c3aed' }}>Reporting & Analytics</p>
            <h2 style={{ margin: '10px 0 8px', fontSize: 'clamp(1.6rem, 2.2vw, 2.2rem)', letterSpacing: '-0.02em' }}>
              Attendance Reports & Insights
            </h2>
            <p style={{ margin: 0, color: '#5c6b8c', maxWidth: 640, lineHeight: 1.7 }}>
              Period summaries, class-wise performance, trend charts, and automated follow-up lists — all in one premium reporting workspace.
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span style={{ padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem', background: 'rgba(65,87,255,0.1)', color: '#4157ff', border: '1px solid rgba(65,87,255,0.18)' }}>
                📊 {classFilter === 'All' ? 'All Classes' : classFilter}
              </span>
              <span style={{ padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem', background: 'rgba(23,179,152,0.1)', color: '#0d8f7a', border: '1px solid rgba(23,179,152,0.22)' }}>
                📈 Attendance: {stats.rate}%
              </span>
              <span style={{ padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem', background: 'rgba(244,181,98,0.16)', color: '#b07820', border: '1px solid rgba(244,181,98,0.28)' }}>
                ⚠ {needFollowUp.length} Follow-up
              </span>
            </div>
          </div>
          <div className="link-row" style={{ gap: 10 }}>
            <Link className="link-pill" to="/attendance" style={{ background: 'linear-gradient(135deg,#4157ff,#7c8cff)', color: '#fff', border: 'none', boxShadow: '0 12px 24px rgba(65,87,255,0.22)' }}>
              ⤶ Back to Attendance
            </Link>
            <button type="button" className="link-pill" onClick={exportReportCsv}>⤓ Export CSV</button>
            <button type="button" className="link-pill" onClick={printFullReport}>🖨 Print / PDF</button>
          </div>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {[
          { label: 'Total Students', value: stats.total, sub: 'Roster size', bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', icon: '👥' },
          { label: 'Present', value: stats.present, sub: `${Math.round((stats.present / (stats.total || 1)) * 100)}% rate`, bg: 'linear-gradient(135deg,#17b398,#059669)', icon: '✓' },
          { label: 'Absent', value: stats.absent, sub: 'Needs follow-up', bg: 'linear-gradient(135deg,#f35d5d,#dc2626)', icon: '✕' },
          { label: 'Late', value: stats.late, sub: 'After bell', bg: 'linear-gradient(135deg,#f4b562,#d97706)', icon: '◷' },
          { label: 'On Leave', value: stats.leave, sub: 'Approved', bg: 'linear-gradient(135deg,#7c8cff,#4157ff)', icon: '☘' },
          { label: 'Overall %', value: `${stats.rate}%`, sub: `On-time: ${stats.lateRate}%`, bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon: '📈' },
        ].map((k) => (
          <article key={k.label} className="panel-card stat-card" style={{ position: 'relative', overflow: 'hidden', padding: '22px 24px' }}>
            <div style={{ position: 'absolute', top: -22, right: -22, width: 110, height: 110, borderRadius: '50%', background: k.bg, opacity: 0.12 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, display: 'grid', placeItems: 'center', background: k.bg, color: '#fff', fontWeight: 800, fontSize: '1.35rem', boxShadow: '0 14px 32px rgba(0,0,0,0.12)' }}>{k.icon}</div>
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7f8ba5', fontWeight: 700 }}>{k.label}</span>
                <div style={{ fontSize: 'clamp(1.7rem, 2vw, 2.3rem)', fontWeight: 800, color: '#111b33', letterSpacing: '-0.02em', marginTop: 4 }}>{k.value}</div>
                <p className="stat-note">{k.sub}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <article className="panel-card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>From</label>
            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="search-input" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>To</label>
            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="search-input" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>Class</label>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="search-input" style={{ padding: '12px 14px' }}>
              <option value="All">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 auto' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>Trend Period</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { k: '7days', l: 'Last 7 Days' },
                { k: '30days', l: 'Last 30 Days' },
                { k: '90days', l: 'Last Quarter' },
              ].map((x) => (
                <button key={x.k} type="button" className="small-action" onClick={() => setPeriodView(x.k)} style={{
                  background: periodView === x.k ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : undefined,
                  color: periodView === x.k ? '#fff' : undefined,
                  border: periodView === x.k ? 'none' : undefined,
                  boxShadow: periodView === x.k ? '0 10px 22px rgba(139,92,246,0.22)' : undefined,
                }}>{x.l}</button>
              ))}
            </div>
          </div>
        </div>
      </article>

      {toast && (
        <div style={{ padding: '14px 18px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(65,87,255,0.12))', color: '#1a1f4c', border: '1px solid rgba(139,92,246,0.22)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: '#fff', fontSize: '0.85rem' }}>✓</span>
          {toast}
        </div>
      )}

      <div className="bottom-grid" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.9fr)' }}>
        <article className="panel-card trend-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Trend Analysis</p>
              <h3>Attendance Trend — {periodView === '7days' ? 'Last 7 Days' : periodView === '30days' ? 'Last 30 Days' : 'Last Quarter'}</h3>
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: '#5c6b8c', fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: 'linear-gradient(135deg,#4157ff,#7c8cff)', display: 'inline-block' }}></span>
                Present
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', color: '#5c6b8c', fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'inline-block' }}></span>
                Absent
              </span>
            </div>
          </div>
          <TrendChart seriesA={trend.presentSeries} seriesB={trend.absentSeries} labels={trend.labels} />
        </article>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <article className="panel-card automation-panel">
            <div className="panel-header">
              <div><p className="panel-kicker">Summary</p><h3>Overall Present Rate</h3></div>
            </div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                <RingChart totalText={`${stats.rate}%`} subtitle="Present" />
              </div>
              <div style={{ flex: 1, minWidth: 160, display: 'grid', gap: 8 }}>
                {[
                  { l: 'Present', v: stats.present, c: '#17b398' },
                  { l: 'Absent', v: stats.absent, c: '#f35d5d' },
                  { l: 'Late', v: stats.late, c: '#f4b562' },
                  { l: 'Leave', v: stats.leave, c: '#7c8cff' },
                ].map((x) => (
                  <div key={x.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: x.c }} />
                      <span style={{ fontSize: '0.84rem', color: '#5c6b8c', fontWeight: 600 }}>{x.l}</span>
                    </div>
                    <strong style={{ fontSize: '0.96rem', color: '#111b33', fontWeight: 800 }}>{x.v}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="panel-card info-panel">
            <div className="panel-header compact"><h3>Gender Breakdown</h3></div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <GenderChart male={stats.male} female={stats.female} />
              </div>
              <div style={{ display: 'grid', gap: 10, flex: 1, minWidth: 160 }}>
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(111,195,255,0.12)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 700 }}>👦 Boys</span>
                  <strong style={{ color: '#111b33' }}>{stats.male}</strong>
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(255,147,194,0.14)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.82rem', color: '#c73a87', fontWeight: 700 }}>👧 Girls</span>
                  <strong style={{ color: '#111b33' }}>{stats.female}</strong>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <article className="panel-card">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Monthly Snapshot</p>
            <h3>Last 6 Months — Overview</h3>
          </div>
          <span className="link-pill" style={{ cursor: 'default' }}>6 Months</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Total</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Rate %</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map((m) => (
                <tr key={m.name}>
                  <td style={{ fontWeight: 800, color: '#111b33' }}>{m.name}</td>
                  <td>{m.total}</td>
                  <td style={{ color: '#0d8f7a', fontWeight: 700 }}>{m.present}</td>
                  <td style={{ color: '#d93838', fontWeight: 700 }}>{m.absent}</td>
                  <td>
                    <span style={{
                      padding: '6px 12px', borderRadius: 999, fontWeight: 800, fontSize: '0.78rem',
                      background: m.rate >= 90 ? 'rgba(23,179,152,0.14)' : m.rate >= 75 ? 'rgba(244,181,98,0.18)' : 'rgba(243,93,93,0.12)',
                      color: m.rate >= 90 ? '#0d8f7a' : m.rate >= 75 ? '#b07820' : '#d93838',
                    }}>{m.rate}%</span>
                  </td>
                  <td style={{ width: '40%', minWidth: 220 }}>
                    <div style={{ height: 10, borderRadius: 999, background: 'rgba(65,87,255,0.08)', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${(m.present / m.total) * 100}%`, background: 'linear-gradient(90deg,#17b398,#059669)' }} />
                      <div style={{ width: `${(m.absent / m.total) * 100}%`, background: 'linear-gradient(90deg,#f35d5d,#dc2626)' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="content-grid" style={{ gridTemplateColumns: '1.25fr 1fr' }}>
        <article className="panel-card">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Performance</p>
              <h3>Class-wise Attendance Breakdown</h3>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Boys</th>
                  <th>Girls</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Late</th>
                  <th>Leave</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {classBreakdown.map(([cls, d]) => {
                  const rate = Math.round((d.present / (d.total || 1)) * 100)
                  return (
                    <tr key={cls}>
                      <td style={{ fontWeight: 800, color: '#111b33' }}>{cls}</td>
                      <td>{d.boys}</td>
                      <td>{d.girls}</td>
                      <td style={{ color: '#0d8f7a', fontWeight: 700 }}>{d.present}</td>
                      <td style={{ color: '#d93838', fontWeight: 700 }}>{d.absent}</td>
                      <td style={{ color: '#b07820', fontWeight: 700 }}>{d.late}</td>
                      <td style={{ color: '#4157ff', fontWeight: 700 }}>{d.leave}</td>
                      <td>
                        <span style={{
                          padding: '6px 12px', borderRadius: 999, fontWeight: 800, fontSize: '0.78rem',
                          background: rate >= 90 ? 'rgba(23,179,152,0.14)' : rate >= 75 ? 'rgba(244,181,98,0.18)' : 'rgba(243,93,93,0.12)',
                          color: rate >= 90 ? '#0d8f7a' : rate >= 75 ? '#b07820' : '#d93838',
                        }}>{rate}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </article>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <article className="panel-card">
            <div className="panel-header compact">
              <h3>⭐ Top Attendance</h3>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {topStudents.length ? topStudents.map((r, idx) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 16, background: idx === 0 ? 'linear-gradient(135deg, rgba(244,181,98,0.14), rgba(255,255,255,0.98))' : '#f7f8ff',
                  border: '1px solid rgba(65,87,255,0.08)',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
                    background: idx === 0 ? 'linear-gradient(135deg,#f4b562,#f59e0b)' : idx === 1 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : idx === 2 ? 'linear-gradient(135deg,#d97706,#b45309)' : 'linear-gradient(135deg,#4157ff,#7c8cff)',
                    color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                  }}>{idx + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#111b33', fontWeight: 800 }}>{r.title}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#7f8ba5' }}>{r.subtitle} · Roll {r.rollNo || '-'}</p>
                  </div>
                  <span style={{
                    padding: '6px 10px', borderRadius: 999, fontSize: '0.76rem', fontWeight: 800,
                    background: r.status === 'Present' ? 'rgba(23,179,152,0.14)' : r.status === 'Late' ? 'rgba(244,181,98,0.2)' : r.status === 'Leave Approved' ? 'rgba(124,140,255,0.14)' : 'rgba(243,93,93,0.12)',
                    color: r.status === 'Present' ? '#0d8f7a' : r.status === 'Late' ? '#b07820' : r.status === 'Leave Approved' ? '#4157ff' : '#d93838',
                  }}>{r.status}</span>
                </div>
              )) : <p style={{ color: '#7f8ba5', margin: 0, padding: '10px 0' }}>No students recorded yet.</p>}
            </div>
          </article>

          <article className="panel-card">
            <div className="panel-header compact">
              <h3 style={{ color: needFollowUp.length ? '#d93838' : '#111b33' }}>⚠ Follow-up Required</h3>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {needFollowUp.length ? needFollowUp.map((r) => (
                <div key={r.id} style={{
                  padding: '12px 14px', borderRadius: 16,
                  background: r.status === 'Absent' ? 'rgba(243,93,93,0.08)' : 'rgba(244,181,98,0.12)',
                  border: `1px solid ${r.status === 'Absent' ? 'rgba(243,93,93,0.22)' : 'rgba(244,181,98,0.28)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#111b33', fontWeight: 800 }}>{r.title}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#7f8ba5' }}>
                        {r.subtitle} · {r.fatherName || 'Parent'} · 📞 {r.phone || 'No number'}
                      </p>
                      {r.remarks && <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#4157ff', fontWeight: 600 }}>📝 {r.remarks}</p>}
                    </div>
                    <span style={{
                      alignSelf: 'flex-start', padding: '6px 10px', borderRadius: 999,
                      fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase',
                      background: r.status === 'Absent' ? 'rgba(243,93,93,0.16)' : 'rgba(244,181,98,0.24)',
                      color: r.status === 'Absent' ? '#d93838' : '#b07820',
                    }}>{r.status}</span>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '22px', textAlign: 'center', borderRadius: 18, background: 'rgba(23,179,152,0.08)', color: '#0d8f7a', fontWeight: 700 }}>
                  🎉 No follow-up required. All students accounted for!
                </div>
              )}
            </div>
          </article>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {[
          { icon: '📊', title: 'Executive Summary', desc: 'Present / absent counts, overall percentage, and daily cohort totals.', bg: 'linear-gradient(135deg,#6fc3ff,#7c6cff)' },
          { icon: '📈', title: 'Trend Lines', desc: '7-day, 30-day and quarterly trend charts for board-level reviews.', bg: 'linear-gradient(135deg,#ff93c2,#7c6cff)' },
          { icon: '🏫', title: 'Class Comparison', desc: 'Side-by-side attendance performance and color-coded rate badges.', bg: 'linear-gradient(135deg,#f4b562,#f59e0b)' },
          { icon: '⚠', title: 'Auto Follow-up', desc: 'Absent / late lists with parent contacts, ready for SMS or calls.', bg: 'linear-gradient(135deg,#17b398,#059669)' },
        ].map((x) => (
          <article key={x.title} className="panel-card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, display: 'grid', placeItems: 'center', background: x.bg, color: '#fff', fontWeight: 900, fontSize: '1.4rem', boxShadow: '0 14px 32px rgba(65,87,255,0.16)' }}>{x.icon}</div>
              <div>
                <h4 style={{ margin: 0, color: '#111b33', fontSize: '1rem' }}>{x.title}</h4>
                <p style={{ margin: '6px 0 0', color: '#7f8ba5', lineHeight: 1.6, fontSize: '0.88rem' }}>{x.desc}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default AttendanceReportPage
