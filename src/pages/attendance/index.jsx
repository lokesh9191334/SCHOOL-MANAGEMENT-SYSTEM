import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_ATTENDANCE } from '../../data/seed'
import TrendChart from '../../components/charts/TrendChart'
import RingChart from '../../components/charts/RingChart'
import GenderChart from '../../components/charts/GenderChart'

const STATUS_OPTIONS = [
  { key: 'Present', label: 'Present', tone: 'success', color: '#17b398', bg: 'rgba(23, 179, 152, 0.12)', icon: '✓' },
  { key: 'Absent', label: 'Absent', tone: 'danger', color: '#f35d5d', bg: 'rgba(243, 93, 93, 0.12)', icon: '✕' },
  { key: 'Late', label: 'Late', tone: 'warning', color: '#f4b562', bg: 'rgba(244, 181, 98, 0.18)', icon: '◷' },
  { key: 'Leave Approved', label: 'Leave', tone: 'warning', color: '#7c8cff', bg: 'rgba(124, 140, 255, 0.14)', icon: '☘' },
]

const toneForStatus = (s) => STATUS_OPTIONS.find((o) => o.key === s)?.tone || 'warning'

const nowTime = () => {
  const d = new Date()
  return d.toTimeString().slice(0, 5)
}

const formatDateNice = (iso) => {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

const AttendancePage = () => {
  const [rows, setRows] = usePersistentState(STORAGE_KEYS.attendance, SEED_ATTENDANCE)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState('')
  const [classFilter, setClassFilter] = useState('All')
  const [sectionFilter, setSectionFilter] = useState('All')
  const [genderFilter, setGenderFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10))
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [viewMode, setViewMode] = useState('cards')

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  const classNames = useMemo(() => Array.from(new Set(rows.map((r) => r.className).filter(Boolean))).sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || [0])[0], 10)
    const nb = parseInt((b.match(/\d+/) || [0])[0], 10)
    return na - nb
  }), [rows])

  const sections = useMemo(() => {
    const base = classFilter === 'All' ? rows : rows.filter((r) => r.className === classFilter)
    return Array.from(new Set(base.map((r) => r.section).filter(Boolean))).sort()
  }, [rows, classFilter])

  const stats = useMemo(() => {
    const present = rows.filter((r) => r.status === 'Present').length
    const absent = rows.filter((r) => r.status === 'Absent').length
    const late = rows.filter((r) => r.status === 'Late').length
    const leave = rows.filter((r) => r.status === 'Leave Approved').length
    const total = rows.length || 1
    const rate = Math.round((present / total) * 100)
    const male = rows.filter((r) => { const g = (r.gender || '').toString().toLowerCase(); return g === 'male' || g === 'm' }).length
    const female = rows.filter((r) => { const g = (r.gender || '').toString().toLowerCase(); return g === 'female' || g === 'f' }).length
    return { present, absent, late, leave, total: rows.length, rate, male, female }
  }, [rows])

  const weeklyTrend = useMemo(() => {
    const labels = []
    const presentSeries = []
    const absentSeries = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }))
      const iso = d.toISOString().slice(0, 10)
      const sameDay = rows.filter((r) => r.date === iso || (i === 0))
      const seedPres = Math.max(0, sameDay.length - 2 - Math.floor(Math.random() * 2))
      presentSeries.push(i === 0 ? stats.present : seedPres)
      absentSeries.push(i === 0 ? stats.absent : Math.max(0, sameDay.length - seedPres))
    }
    return { labels, presentSeries, absentSeries }
  }, [rows, stats.present, stats.absent])

  const classBreakdown = useMemo(() => {
    const out = {}
    rows.forEach((r) => {
      const k = r.className || 'Unknown'
      if (!out[k]) out[k] = { total: 0, present: 0, absent: 0, late: 0, leave: 0 }
      out[k].total++
      if (r.status === 'Present') out[k].present++
      else if (r.status === 'Absent') out[k].absent++
      else if (r.status === 'Late') out[k].late++
      else if (r.status === 'Leave Approved') out[k].leave++
    })
    return Object.entries(out).sort((a, b) => {
      const na = parseInt((a[0].match(/\d+/) || [0])[0], 10)
      const nb = parseInt((b[0].match(/\d+/) || [0])[0], 10)
      return na - nb
    })
  }, [rows])

  const filteredRecords = useMemo(() => rows.filter((r) => {
    if (classFilter !== 'All' && r.className !== classFilter) return false
    if (sectionFilter !== 'All' && r.section !== sectionFilter) return false
    if (genderFilter !== 'All') {
      const g = (r.gender || '').toString().toLowerCase()
      if (genderFilter === 'Male' && g !== 'male' && g !== 'm') return false
      if (genderFilter === 'Female' && g !== 'female' && g !== 'f') return false
    }
    if (statusFilter !== 'All' && r.status !== statusFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      (r.subtitle || '').toLowerCase().includes(q) ||
      (r.rollNo || '').includes(q) ||
      (r.fatherName || '').toLowerCase().includes(q) ||
      (r.id || '').toLowerCase().includes(q)
    )
  }), [rows, classFilter, sectionFilter, genderFilter, statusFilter, searchQuery])

  const groupedByClass = useMemo(() => {
    const g = {}
    filteredRecords.forEach((r) => {
      const k = r.className || 'Unassigned'
      if (!g[k]) g[k] = []
      g[k].push(r)
    })
    Object.keys(g).forEach((k) => g[k].sort((a, b) => (parseInt(a.rollNo, 10) || 0) - (parseInt(b.rollNo, 10) || 0)))
    return g
  }, [filteredRecords])

  const sortedClasses = Object.keys(groupedByClass).sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || [0])[0], 10)
    const nb = parseInt((b.match(/\d+/) || [0])[0], 10)
    return na - nb
  })

  const markStatus = (id, status) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r
      return {
        ...r,
        status,
        tone: toneForStatus(status),
        owner: status === 'Absent' || status === 'Leave Approved' ? '—' : nowTime(),
        markedBy: 'Admin',
        date: dateFilter || r.date || new Date().toISOString().slice(0, 10),
      }
    }))
    setToast(`Marked ${STATUS_OPTIONS.find((o) => o.key === status)?.label || status}`)
  }

  const markBulk = (status, ids) => {
    if (!ids || ids.length === 0) return
    setRows((prev) => prev.map((r) => {
      if (!ids.includes(r.id)) return r
      return {
        ...r,
        status,
        tone: toneForStatus(status),
        owner: status === 'Absent' || status === 'Leave Approved' ? '—' : nowTime(),
        markedBy: 'Admin',
        date: dateFilter || r.date || new Date().toISOString().slice(0, 10),
      }
    }))
    setSelectedIds(new Set())
    setToast(`${ids.length} student${ids.length > 1 ? 's' : ''} marked ${status.toLowerCase()}`)
  }

  const markAll = (status) => {
    const target = filteredRecords.length ? filteredRecords : rows
    const ids = target.map((r) => r.id)
    markBulk(status, ids)
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const selectVisible = () => setSelectedIds(new Set(filteredRecords.map((r) => r.id)))
  const clearSelection = () => setSelectedIds(new Set())

  const addRemarks = (id) => {
    const row = rows.find((r) => r.id === id)
    const v = window.prompt('Add / update remarks for ' + row?.title, row?.remarks || '')
    if (v === null) return
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, remarks: v } : r)))
    setToast('Remarks saved')
  }

  const sendSmsParent = (row) => {
    const tpl = statusMap(row.status)
    const msg = window.prompt(`SMS to ${row.fatherName || 'parent'} (${row.phone || 'N/A'})`,
      `Dear parent, attendance update for ${row.title}: ${tpl}. ${row.remarks ? 'Note: ' + row.remarks : ''}`)
    if (msg) setToast(`SMS queued to ${row.fatherName || row.title}`)
  }

  const statusMap = (s) => s === 'Present' ? 'Present in school' : s === 'Late' ? 'Late arrival' : s === 'Absent' ? 'Absent today' : 'On approved leave'

  const exportCsv = () => {
    const header = ['ID', 'Student Name', 'Class', 'Section', 'Roll No', 'Gender', 'Status', 'Time', 'Marked By', 'Remarks', 'Father Name', 'Phone', 'Date']
    const data = filteredRecords.map((r) => [
      r.id, r.title, r.className, r.section, r.rollNo, r.gender, r.status, r.owner, r.markedBy || '', r.remarks || '', r.fatherName || '', r.phone || '', r.date || ''
    ])
    const csv = [header.join(','), ...data.map((row) => row.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${dateFilter || new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    setToast('CSV exported')
  }

  const printReport = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Attendance Report - ${dateFilter}</title>
<style>
body{font-family:Inter,Arial,sans-serif;padding:28px;color:#111b33}
h1{margin:0 0 8px;font-size:1.6rem;color:#111b33}
h2{font-size:1rem;color:#5c6b8c;margin:20px 0 10px}
.meta{color:#7f8ba5;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:0.9rem}
th{background:#f3f5ff;padding:10px 12px;text-align:left;color:#5c6b8c;text-transform:uppercase;font-size:0.72rem;letter-spacing:.08em}
td{padding:10px 12px;border-top:1px solid #e5e8f4}
.present{color:#0d8f7a;font-weight:700}.absent{color:#d93838;font-weight:700}.late{color:#b07820;font-weight:700}.leave{color:#4157ff;font-weight:700}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}
.card{background:#f7f8ff;border:1px solid #e5e8f4;border-radius:14px;padding:14px}
.card span{font-size:0.72rem;letter-spacing:.08em;text-transform:uppercase;color:#7f8ba5;font-weight:700}
.card strong{display:block;margin-top:6px;font-size:1.5rem;color:#111b33}
</style></head><body>
<h1>Attendance Report</h1>
<p class="meta">${formatDateNice(dateFilter)} · Total Students: ${filteredRecords.length}</p>
<div class="summary">
<div class="card"><span>Present</span><strong style="color:#0d8f7a">${stats.present}</strong></div>
<div class="card"><span>Absent</span><strong style="color:#d93838">${stats.absent}</strong></div>
<div class="card"><span>Late</span><strong style="color:#b07820">${stats.late}</strong></div>
<div class="card"><span>Leave</span><strong style="color:#4157ff">${stats.leave}</strong></div>
</div>
<table><thead><tr><th>#</th><th>Roll</th><th>Student</th><th>Class</th><th>Status</th><th>Time</th><th>Remarks</th></tr></thead>
<tbody>${filteredRecords.map((r, i) => `<tr>
<td>${i + 1}</td><td>${r.rollNo || '-'}</td><td><strong>${r.title}</strong><br><span style="color:#7f8ba5;font-size:.8rem">${r.fatherName || ''}</span></td>
<td>${r.subtitle || '-'}</td>
<td class="${(r.status || '').toLowerCase().split(' ')[0]}">${r.status}</td>
<td>${r.owner || '-'}</td><td>${r.remarks || '-'}</td></tr>`).join('')}
</tbody></table></body></html>`
    const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0')
    if (!w) { setToast('Popup blocked. Allow popups to print.'); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => w.print(), 420)
  }

  const resetData = () => {
    if (!window.confirm('Reset today\'s attendance to demo seed data?')) return
    setRows(SEED_ATTENDANCE)
    setToast('Attendance reset')
  }

  const avatarGradient = (row) => {
    const g = (row.gender || '').toString().toLowerCase()
    if (g === 'female' || g === 'f') return 'linear-gradient(135deg,#ff93c2 0%,#7c6cff 100%)'
    return 'linear-gradient(135deg,#6fc3ff 0%,#7c6cff 100%)'
  }

  const statusChip = (status) => {
    const opt = STATUS_OPTIONS.find((o) => o.key === status) || STATUS_OPTIONS[0]
    return (
      <span
        className="status-pill"
        style={{
          background: opt.bg,
          color: opt.color,
          border: `1px solid ${opt.color}33`,
          fontWeight: 800,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '6px 12px',
          borderRadius: 999,
        }}
      >
        {opt.icon} {opt.label}
      </span>
    )
  }

  const kpiIconStyles = {
    present: { bg: 'linear-gradient(135deg,#17b398,#059669)', icon: '✓' },
    absent: { bg: 'linear-gradient(135deg,#f35d5d,#dc2626)', icon: '✕' },
    late: { bg: 'linear-gradient(135deg,#f4b562,#d97706)', icon: '◷' },
    leave: { bg: 'linear-gradient(135deg,#7c8cff,#4157ff)', icon: '☘' },
    total: { bg: 'linear-gradient(135deg,#06b6d4,#0891b2)', icon: '👥' },
    rate: { bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon: '％' },
  }

  return (
    <div className="sms-page-stack">
      {/* Hero / Page Header */}
      <div className="page-card" style={{
        background: 'linear-gradient(135deg, rgba(65,87,255,0.14) 0%, rgba(255,255,255,0.98) 55%, rgba(124,140,255,0.1) 100%)',
        border: '1px solid rgba(65,87,255,0.18)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
          <div>
            <p className="admin-kicker" style={{ margin: 0, color: '#4157ff' }}>Attendance Management</p>
            <h2 style={{ margin: '10px 0 8px', fontSize: 'clamp(1.6rem, 2.2vw, 2.2rem)', letterSpacing: '-0.02em' }}>
              Daily Attendance Control
            </h2>
            <p style={{ margin: 0, color: '#5c6b8c', maxWidth: 620, lineHeight: 1.7 }}>
              Mark, review and publish attendance with class-wise grouping, instant stats, and premium export tools.
            </p>
            <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span style={{
                padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem',
                background: 'rgba(23,179,152,0.12)', color: '#0d8f7a', border: '1px solid rgba(23,179,152,0.2)',
              }}>
                📅 {formatDateNice(dateFilter || new Date().toISOString().slice(0, 10))}
              </span>
              <span style={{
                padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem',
                background: 'rgba(124,140,255,0.12)', color: '#4157ff', border: '1px solid rgba(124,140,255,0.2)',
              }}>
                📚 {classFilter === 'All' ? `${classNames.length} Classes` : classFilter}
              </span>
              {selectedIds.size > 0 && (
                <span style={{
                  padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem',
                  background: 'rgba(244,181,98,0.18)', color: '#b07820', border: '1px solid rgba(244,181,98,0.3)',
                }}>
                  ◽ {selectedIds.size} selected
                </span>
              )}
            </div>
          </div>
          <div className="link-row" style={{ gap: 10 }}>
            <Link className="link-pill" to="/attendance/report" style={{ background: 'linear-gradient(135deg,#4157ff,#7c8cff)', color: '#fff', border: 'none', boxShadow: '0 12px 24px rgba(65,87,255,0.22)' }}>
              📊 Reports
            </Link>
            <Link className="link-pill" to="/students">👥 Students</Link>
            <button type="button" className="link-pill" onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}>
              {viewMode === 'cards' ? '▥ Table View' : '▤ Card View'}
            </button>
            <button type="button" className="link-pill" onClick={resetData} style={{ color: '#d93838', background: 'rgba(243,93,93,0.08)', borderColor: 'rgba(243,93,93,0.2)' }}>
              ⟲ Reset
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {[
          { key: 'present', label: 'Present', value: stats.present, sub: `${Math.round((stats.present / (stats.total || 1)) * 100)}% check-in` },
          { key: 'absent', label: 'Absent', value: stats.absent, sub: 'Follow-up required' },
          { key: 'late', label: 'Late Arrivals', value: stats.late, sub: 'After first bell' },
          { key: 'leave', label: 'On Leave', value: stats.leave, sub: 'Approved absence' },
          { key: 'total', label: 'Total Students', value: stats.total, sub: `${filteredRecords.length} visible` },
          { key: 'rate', label: 'Attendance Rate', value: `${stats.rate}%`, sub: 'Daily present ratio' },
        ].map((k, i) => {
          const st = kpiIconStyles[k.key]
          return (
            <article key={k.key} className="panel-card stat-card" style={{
              position: 'relative', overflow: 'hidden', padding: '20px 22px',
              background: i === 5 ? 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(255,255,255,0.98))' : undefined,
            }}>
              <div style={{ position: 'absolute', top: -18, right: -18, width: 90, height: 90, borderRadius: '50%', background: st.bg, opacity: 0.12 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center',
                  background: st.bg, color: '#fff', fontWeight: 800, fontSize: '1.25rem',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.1)',
                }}>{st.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7f8ba5', fontWeight: 700 }}>{k.label}</span>
                  <div style={{ fontSize: 'clamp(1.6rem, 2vw, 2.1rem)', fontWeight: 800, color: '#111b33', letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 4 }}>{k.value}</div>
                  <p className="stat-note" style={{ margin: '6px 0 0' }}>{k.sub}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Filter Bar + Bulk Actions */}
      <article className="panel-card" style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>Date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="search-input" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 160px' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>Class</label>
            <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setSectionFilter('All') }} className="search-input" style={{ padding: '12px 14px' }}>
              <option value="All">All Classes</option>
              {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 140px' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>Section</label>
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="search-input" style={{ padding: '12px 14px' }}>
              <option value="All">All Sections</option>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 140px' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>Gender</label>
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="search-input" style={{ padding: '12px 14px' }}>
              <option value="All">All Genders</option>
              <option value="Male">Boys</option>
              <option value="Female">Girls</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '2 1 260px' }}>
            <label style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5c6b8c', fontWeight: 700 }}>Search</label>
            <input type="text" placeholder="Search by name, roll no, father name, ID…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="small-action" onClick={() => setStatusFilter('All')} style={{ background: statusFilter === 'All' ? 'rgba(65,87,255,0.14)' : undefined, color: statusFilter === 'All' ? '#3246c7' : undefined, border: statusFilter === 'All' ? '1px solid rgba(65,87,255,0.24)' : undefined }}>
              All ({filteredRecords.length})
            </button>
            {STATUS_OPTIONS.map((o) => {
              const cnt = rows.filter((r) => r.status === o.key).length
              return (
                <button key={o.key} type="button" className="small-action" onClick={() => setStatusFilter(o.key)} style={{
                  background: statusFilter === o.key ? o.bg : undefined,
                  color: statusFilter === o.key ? o.color : undefined,
                  border: statusFilter === o.key ? `1px solid ${o.color}33` : undefined,
                }}>
                  {o.icon} {o.label} ({cnt})
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="small-action" onClick={selectVisible}>☐ Select Visible</button>
            <button type="button" className="small-action" onClick={clearSelection}>✕ Clear</button>
            <div style={{ width: 1, height: 28, background: 'rgba(65,87,255,0.12)', alignSelf: 'stretch', margin: '0 4px' }} />
            <button type="button" className="small-action" onClick={() => markBulk('Present', Array.from(selectedIds))} style={{ background: 'rgba(23,179,152,0.12)', color: '#0d8f7a', border: '1px solid rgba(23,179,152,0.24)' }} disabled={!selectedIds.size}>
              ⤶ Mark Selected Present
            </button>
            <button type="button" className="small-action" onClick={() => markBulk('Absent', Array.from(selectedIds))} style={{ background: 'rgba(243,93,93,0.1)', color: '#d93838', border: '1px solid rgba(243,93,93,0.22)' }} disabled={!selectedIds.size}>
              ✕ Mark Selected Absent
            </button>
            <div style={{ width: 1, height: 28, background: 'rgba(65,87,255,0.12)', alignSelf: 'stretch', margin: '0 4px' }} />
            <button type="button" className="small-action" onClick={() => markAll('Present')} style={{ background: 'linear-gradient(135deg,#17b398,#059669)', color: '#fff', border: 'none', boxShadow: '0 10px 22px rgba(23,179,152,0.22)' }}>
              ⤶ Mark All Present
            </button>
            <button type="button" className="small-action" onClick={exportCsv}>⤓ Export CSV</button>
            <button type="button" className="small-action" onClick={printReport}>🖨 Print Report</button>
          </div>
        </div>
      </article>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: '14px 18px', borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(65,87,255,0.12), rgba(124,140,255,0.12))',
          color: '#1a1f4c', border: '1px solid rgba(65,87,255,0.2)',
          fontWeight: 600, boxShadow: '0 14px 32px rgba(65,87,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#4157ff,#7c8cff)', color: '#fff', fontSize: '0.85rem' }}>✓</span>
          {toast}
        </div>
      )}

      {/* Empty state */}
      {filteredRecords.length === 0 && (
        <article className="panel-card">
          <div className="empty-state" style={{ padding: '48px 24px' }}>
            <div style={{ fontSize: '2.6rem', marginBottom: 14 }}>📋</div>
            <h3 style={{ margin: '0 0 8px', color: '#111b33' }}>No records match your filters</h3>
            <p style={{ margin: 0, color: '#7f8ba5' }}>Clear filters to view the full attendance roster.</p>
          </div>
        </article>
      )}

      {/* Class-wise grouping (Cards or Table) */}
      {filteredRecords.length > 0 && viewMode === 'cards' && sortedClasses.map((cls) => {
        const list = groupedByClass[cls]
        const clsPresent = list.filter((r) => r.status === 'Present').length
        const clsRate = Math.round((clsPresent / (list.length || 1)) * 100)
        return (
          <article key={cls} className="panel-card">
            <div className="panel-header" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 18, display: 'grid', placeItems: 'center',
                  background: 'linear-gradient(135deg,#4157ff 0%,#7c8cff 100%)', color: '#fff', fontWeight: 800,
                  fontSize: '1.1rem', boxShadow: '0 14px 30px rgba(65,87,255,0.22)',
                }}>
                  {cls.replace('Class ', '')}
                </div>
                <div>
                  <p className="panel-kicker" style={{ margin: 0 }}>Class Roster</p>
                  <h3 style={{ margin: '4px 0 0' }}>{cls} · {list.length} Student{list.length > 1 ? 's' : ''}</h3>
                </div>
                <span style={{
                  marginLeft: 8, padding: '8px 14px', borderRadius: 999, fontWeight: 800, fontSize: '0.82rem',
                  background: clsRate >= 90 ? 'rgba(23,179,152,0.14)' : clsRate >= 75 ? 'rgba(244,181,98,0.18)' : 'rgba(243,93,93,0.12)',
                  color: clsRate >= 90 ? '#0d8f7a' : clsRate >= 75 ? '#b07820' : '#d93838',
                  border: clsRate >= 90 ? '1px solid rgba(23,179,152,0.26)' : clsRate >= 75 ? '1px solid rgba(244,181,98,0.32)' : '1px solid rgba(243,93,93,0.24)',
                }}>
                  📊 {clsRate}% Present
                </span>
                <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
                  {STATUS_OPTIONS.map((o) => (
                    <span key={o.key} style={{
                      fontSize: '0.78rem', fontWeight: 700, padding: '6px 10px', borderRadius: 999,
                      background: o.bg, color: o.color,
                    }}>
                      {o.icon} {list.filter((r) => r.status === o.key).length}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="small-action" onClick={() => markBulk('Present', list.map((r) => r.id))} style={{ background: 'rgba(23,179,152,0.12)', color: '#0d8f7a', border: '1px solid rgba(23,179,152,0.22)' }}>
                  Class Present
                </button>
                <button type="button" className="small-action" onClick={() => markBulk('Absent', list.map((r) => r.id))} style={{ background: 'rgba(243,93,93,0.1)', color: '#d93838', border: '1px solid rgba(243,93,93,0.22)' }}>
                  Class Absent
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
              {list.map((r) => {
                const checked = selectedIds.has(r.id)
                return (
                  <div key={r.id} style={{
                    border: checked ? '2px solid rgba(65,87,255,0.38)' : '1px solid rgba(65,87,255,0.1)',
                    borderRadius: 20, padding: '16px 16px 14px', background: checked ? 'rgba(65,87,255,0.06)' : '#fff',
                    display: 'flex', gap: 14, alignItems: 'flex-start', transition: 'all 0.2s ease',
                    boxShadow: checked ? '0 12px 30px rgba(65,87,255,0.12)' : '0 2px 8px rgba(13,25,62,0.04)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSelect(r.id)} style={{ width: 18, height: 18, accentColor: '#4157ff', cursor: 'pointer' }} />
                      <div style={{
                        width: 54, height: 54, borderRadius: 18, display: 'grid', placeItems: 'center',
                        background: avatarGradient(r), color: '#fff', fontWeight: 800, fontSize: '1.2rem',
                        boxShadow: '0 10px 24px rgba(65,87,255,0.18)', flexShrink: 0,
                      }}>
                        {r.title.charAt(0)}
                      </div>
                      <div style={{
                        fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em',
                        padding: '3px 8px', borderRadius: 8,
                        background: (r.gender || '').toString().toLowerCase() === 'female' ? 'rgba(255,147,194,0.16)' : 'rgba(111,195,255,0.16)',
                        color: (r.gender || '').toString().toLowerCase() === 'female' ? '#c73a87' : '#1d4ed8',
                      }}>
                        Roll {r.rollNo || '-'}
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                          <h4 style={{ margin: 0, color: '#111b33', fontSize: '1rem', fontWeight: 800 }}>{r.title}</h4>
                          <p style={{ margin: '4px 0 0', color: '#7f8ba5', fontSize: '0.84rem', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: 999, fontWeight: 700, fontSize: '0.74rem',
                              background: 'rgba(65,87,255,0.1)', color: '#4157ff',
                            }}>{r.subtitle}</span>
                            <span style={{ color: '#6b7388' }}>👨 {r.fatherName || '—'}</span>
                          </p>
                          <p style={{ margin: '6px 0 0', color: '#5c6b8c', fontSize: '0.8rem' }}>
                            📞 {r.phone || 'No contact'} · <span style={{ opacity: 0.7 }}>{r.id}</span>
                          </p>
                          {r.remarks && (
                            <p style={{ margin: '8px 0 0', color: '#4157ff', fontSize: '0.82rem', fontWeight: 600, padding: '6px 10px', borderRadius: 10, background: 'rgba(65,87,255,0.08)' }}>
                              📝 {r.remarks}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          {statusChip(r.status)}
                          <span style={{ fontSize: '0.8rem', color: '#7f8ba5', fontWeight: 600 }}>
                            {r.owner !== '—' ? `🕓 ${r.owner}` : '⏸ Not checked in'}
                          </span>
                        </div>
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {STATUS_OPTIONS.map((o) => (
                          <button
                            key={o.key}
                            type="button"
                            onClick={() => markStatus(r.id, o.key)}
                            style={{
                              padding: '8px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                              border: r.status === o.key ? `1px solid ${o.color}55` : '1px solid rgba(65,87,255,0.1)',
                              background: r.status === o.key ? o.bg : '#fff',
                              color: r.status === o.key ? o.color : '#5c6b8c',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { if (r.status !== o.key) { e.currentTarget.style.background = o.bg; e.currentTarget.style.color = o.color; e.currentTarget.style.border = `1px solid ${o.color}44` } }}
                            onMouseLeave={(e) => { if (r.status !== o.key) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#5c6b8c'; e.currentTarget.style.border = '1px solid rgba(65,87,255,0.1)' } }}
                          >
                            {o.icon} {o.label}
                          </button>
                        ))}
                        <button type="button" className="small-action" onClick={() => addRemarks(r.id)} style={{ padding: '8px 10px', fontSize: '0.78rem' }}>📝 Remarks</button>
                        <button type="button" className="small-action" onClick={() => sendSmsParent(r)} style={{ padding: '8px 10px', fontSize: '0.78rem' }}>💬 SMS</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </article>
        )
      })}

      {/* Table view */}
      {filteredRecords.length > 0 && viewMode === 'table' && (
        <article className="panel-card data-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Roster</p>
              <h3>Attendance Register · {filteredRecords.length} record{filteredRecords.length > 1 ? 's' : ''}</h3>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox"
                      checked={filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.has(r.id))}
                      onChange={(e) => (e.target.checked ? selectVisible() : clearSelection())}
                    />
                  </th>
                  <th>Student</th>
                  <th>Class / Roll</th>
                  <th>Father / Contact</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Remarks</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id} onClick={() => toggleSelect(r.id)} style={{ cursor: 'pointer' }}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
                          background: avatarGradient(r), color: '#fff', fontWeight: 800,
                        }}>{r.title.charAt(0)}</div>
                        <div>
                          <div className="record-title">{r.title}</div>
                          <div className="record-subtitle">{r.gender} · {r.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="record-title">{r.subtitle}</div>
                      <div className="record-subtitle">Roll {r.rollNo || '-'}</div>
                    </td>
                    <td>
                      <div className="record-title">{r.fatherName || '—'}</div>
                      <div className="record-subtitle">{r.phone || '—'}</div>
                    </td>
                    <td>{statusChip(r.status)}</td>
                    <td style={{ fontWeight: 600, color: '#5c6b8c' }}>{r.owner !== '—' ? r.owner : '—'}</td>
                    <td style={{ color: r.remarks ? '#4157ff' : '#aab3c8', fontSize: '0.86rem', fontWeight: r.remarks ? 600 : 400 }}>{r.remarks || '—'}</td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        {STATUS_OPTIONS.map((o) => (
                          <button key={o.key} type="button" onClick={() => markStatus(r.id, o.key)} title={o.label} style={{
                            width: 34, height: 34, borderRadius: 10, border: r.status === o.key ? `1px solid ${o.color}55` : '1px solid rgba(65,87,255,0.1)',
                            background: r.status === o.key ? o.bg : '#fff', color: o.color,
                            cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                          }}>{o.icon}</button>
                        ))}
                        <button type="button" title="Remarks" onClick={() => addRemarks(r.id)} style={{
                          width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(65,87,255,0.1)',
                          background: '#fff', color: '#4157ff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                        }}>✎</button>
                        <button type="button" title="SMS" onClick={() => sendSmsParent(r)} style={{
                          width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(65,87,255,0.1)',
                          background: '#fff', color: '#4157ff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                        }}>💬</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* Bottom Analytics Grid */}
      <div className="bottom-grid" style={{ gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.85fr)' }}>
        <article className="panel-card trend-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Analytics</p>
              <h3>Weekly Attendance Trend</h3>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 360px', minWidth: 280 }}>
              <TrendChart
                seriesA={weeklyTrend.presentSeries}
                seriesB={weeklyTrend.absentSeries}
                labels={weeklyTrend.labels}
              />
            </div>
            <div style={{ display: 'grid', gap: 10, minWidth: 220 }}>
              {[
                { label: '7-Day Avg Present', value: `${Math.round(weeklyTrend.presentSeries.reduce((a, b) => a + b, 0) / weeklyTrend.presentSeries.length)}`, tone: 'success' },
                { label: 'Peak Attendance', value: `${Math.max(...weeklyTrend.presentSeries)}`, tone: 'accent' },
                { label: 'Students Below 75%', value: `${classBreakdown.reduce((n, [, d]) => n + (Math.round((d.present / (d.total || 1)) * 100) < 75 ? d.absent : 0), 0)}`, tone: 'warning' },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: '14px 16px', borderRadius: 16, border: '1px solid rgba(65,87,255,0.1)',
                  background: s.tone === 'success' ? 'rgba(23,179,152,0.08)' : s.tone === 'warning' ? 'rgba(244,181,98,0.1)' : 'rgba(65,87,255,0.08)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.82rem', color: '#5c6b8c', fontWeight: 600 }}>{s.label}</span>
                  <strong style={{
                    fontSize: '1.4rem', color: s.tone === 'success' ? '#0d8f7a' : s.tone === 'warning' ? '#b07820' : '#4157ff',
                    fontWeight: 800, letterSpacing: '-0.02em',
                  }}>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <article className="panel-card automation-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Today</p>
                <h3>Overall Present Rate</h3>
              </div>
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
            <div className="panel-header compact">
              <h3>Gender Split</h3>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <GenderChart male={stats.male} female={stats.female} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="small-action" onClick={() => setGenderFilter('All')}>All</button>
                <button type="button" className="small-action" onClick={() => setGenderFilter('Male')}>Boys</button>
                <button type="button" className="small-action" onClick={() => setGenderFilter('Female')}>Girls</button>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Class-wise breakdown table */}
      <article className="panel-card">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Performance</p>
            <h3>Class-wise Attendance Breakdown</h3>
          </div>
          <span className="link-pill" style={{ cursor: 'default' }}>{classBreakdown.length} Classes</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Total</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Late</th>
                <th>Leave</th>
                <th>Rate</th>
                <th>Bar</th>
              </tr>
            </thead>
            <tbody>
              {classBreakdown.map(([cls, d]) => {
                const rate = Math.round((d.present / (d.total || 1)) * 100)
                return (
                  <tr key={cls}>
                    <td style={{ fontWeight: 800, color: '#111b33' }}>{cls}</td>
                    <td>{d.total}</td>
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
                    <td style={{ width: '30%', minWidth: 180 }}>
                      <div style={{ height: 10, borderRadius: 999, background: 'rgba(65,87,255,0.08)', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${(d.present / (d.total || 1)) * 100}%`, background: 'linear-gradient(90deg,#17b398,#059669)' }} />
                        <div style={{ width: `${(d.late / (d.total || 1)) * 100}%`, background: 'linear-gradient(90deg,#f4b562,#d97706)' }} />
                        <div style={{ width: `${(d.leave / (d.total || 1)) * 100}%`, background: 'linear-gradient(90deg,#7c8cff,#4157ff)' }} />
                        <div style={{ width: `${(d.absent / (d.total || 1)) * 100}%`, background: 'linear-gradient(90deg,#f35d5d,#dc2626)' }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </article>

      {/* Quick workflow / help */}
      <div className="content-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {[
          { icon: '1', title: 'Select Class', desc: 'Filter the roster to the class and section you are marking for.', bg: 'linear-gradient(135deg,#6fc3ff,#7c6cff)' },
          { icon: '2', title: 'Quick Mark', desc: 'Tap Present, Absent, Late, or Leave on each card; or mark all in one click.', bg: 'linear-gradient(135deg,#ff93c2,#7c6cff)' },
          { icon: '3', title: 'Add Remarks', desc: 'Capture late reasons, leave notes, or parent SMS follow-ups per student.', bg: 'linear-gradient(135deg,#f4b562,#f59e0b)' },
          { icon: '4', title: 'Publish', desc: 'Export CSV, print a formatted register, and share the day-end summary.', bg: 'linear-gradient(135deg,#17b398,#059669)' },
        ].map((x) => (
          <article key={x.title} className="panel-card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 18, display: 'grid', placeItems: 'center',
                background: x.bg, color: '#fff', fontWeight: 900, fontSize: '1.2rem',
                boxShadow: '0 14px 32px rgba(65,87,255,0.16)',
              }}>{x.icon}</div>
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

export default AttendancePage
