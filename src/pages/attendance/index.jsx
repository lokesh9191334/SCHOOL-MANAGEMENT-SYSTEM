import { useState } from 'react'
import { Link } from 'react-router-dom'
import AttendanceModule from '../../modules/AttendanceModule'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_ATTENDANCE } from '../../data/seed'

const AttendancePage = () => {
  const [rows, setRows] = usePersistentState(STORAGE_KEYS.attendance, SEED_ATTENDANCE)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecordKey, setSelectedRecordKey] = useState(null)
  const [activeAction, setActiveAction] = useState(null)
  const [toast, setToast] = useState('')

  const [classFilter, setClassFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('All')

  const present = rows.filter((r) => r.status === 'Present').length
  const absent = rows.filter((r) => r.status === 'Absent').length
  const late = rows.filter((r) => r.status === 'Late').length

  const classes = Array.from(new Set(rows.map((r) => r.subtitle))).filter(Boolean)

  const filteredRecords = rows.filter((r) => {
    if (classFilter !== 'All' && r.subtitle !== classFilter) return false
    if (genderFilter !== 'All') {
      const g = (r.gender || r.sex || '').toString().toLowerCase()
      if (genderFilter === 'Male' && g !== 'male' && g !== 'm') return false
      if (genderFilter === 'Female' && g !== 'female' && g !== 'f') return false
    }
    if (dateFilter) {
      // simple date match if record has date property
      const d = r.date || r.issued || ''
      if (!d || !d.includes(dateFilter)) return false
    }
    if (!searchQuery) return true
    return (
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const handleAction = (action) => {
    setActiveAction(action)
    if (action === 'Mark Attendance') {
      setRows((prev) =>
        prev.map((r) => (r.status === 'Absent' ? { ...r, status: 'Present', tone: 'success', owner: '09:10' } : r)),
      )
    } else if (action === 'Mark All Present') {
      setRows((prev) => prev.map((r) => ({ ...r, status: 'Present', tone: 'success' })))
    } else if (action === 'Export CSV') {
      const header = ['id', 'name', 'class', 'status', 'owner', 'phone', 'address']
      const data = rows.map((r) => [r.id, r.title, r.subtitle, r.status, r.owner || '', r.phone || '', r.currentAddress || r.permanentAddress || ''])
      const csv = [header.join(','), ...data.map((row) => row.map((c) => `"${(c || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_export_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } else if (action === 'Print Report') {
      printAttendanceReport(filteredRecords)
    }
    setToast(`Action: ${action}`)
  }

  const selectedRecord = rows.find((r) => r.id === selectedRecordKey) ?? null

  const maleCount = rows.filter((r) => { const g = (r.gender||r.sex||'').toString().toLowerCase(); return g==='male' || g==='m' }).length
  const femaleCount = rows.filter((r) => { const g = (r.gender||r.sex||'').toString().toLowerCase(); return g==='female' || g==='f' }).length

  // build present/absent trend series
  const parsedDates = rows
    .map((r) => ({ ...r, _date: r.date ? new Date(r.date) : r.issued ? new Date(r.issued) : null }))
    .filter((r) => r._date && !isNaN(r._date.getTime()))

  let trendLabels = []
  let trendSeries = []
  let trendSeriesAbsent = []

  if (parsedDates.length > 0) {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(d)
    }
    trendLabels = months.map((m) => m.toLocaleString(undefined, { month: 'short' }))
    const presentSeries = months.map((m) => {
      const year = m.getFullYear()
      const month = m.getMonth()
      return parsedDates.filter((r) => r._date.getFullYear() === year && r._date.getMonth() === month && r.status === 'Present').length
    })
    const absentSeries = months.map((m) => {
      const year = m.getFullYear()
      const month = m.getMonth()
      return parsedDates.filter((r) => r._date.getFullYear() === year && r._date.getMonth() === month && r.status === 'Absent').length
    })
    trendSeries = presentSeries
    trendSeriesAbsent = absentSeries
  } else {
    trendLabels = ['Today']
    trendSeries = [present]
    trendSeriesAbsent = [absent]
  }

  const printAttendanceReport = (records) => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Attendance Report</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd;text-align:left}h1{margin-bottom:8px}</style></head><body><h1>Attendance Report</h1><p>Date: ${dateFilter || new Date().toLocaleDateString()}</p><table><thead><tr><th>#</th><th>Student</th><th>Class</th><th>Status</th><th>Time</th></tr></thead><tbody>${records
      .map(
        (r, idx) =>
          `<tr><td>${idx + 1}</td><td>${r.title}</td><td>${r.subtitle}</td><td>${r.status}</td><td>${r.owner || ''}</td></tr>`,
      )
      .join('')}</tbody></table></body></html>`

    const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0')
    if (!w) return alert('Popup blocked. Allow popups and try again.')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Daily operations</p>
        <h2>Attendance control</h2>
        <p>Roll-call workspace with quick actions. Demo data updates in-browser when you mark attendance.</p>
        <div className="link-row">
          <Link className="link-pill" to="/attendance/report">
            Reports
          </Link>
          <Link className="link-pill" to="/students">
            Student list
          </Link>
        </div>
      </div>

      {/* Diagnostics / quick test panel to verify interactions */}
      <div style={{ margin: '12px 0' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ padding: 10, borderRadius: 8, background: '#fff', border: '1px solid #e6ebff' }}>
            <strong>Records:</strong> {rows.length} &nbsp; <strong>Present:</strong> {present} &nbsp; <strong>Absent:</strong> {absent}
          </div>
          <button className="link-pill" onClick={() => handleAction('Mark All Present')}>Mark All Present</button>
          <button className="link-pill" onClick={() => handleAction('Export CSV')}>Export CSV</button>
          <button className="link-pill" onClick={() => handleAction('Print Report')}>Print Report</button>
        </div>
        {toast && (
          <div style={{ marginTop: 8, padding: 8, background: '#fff7e6', borderRadius: 8, border: '1px solid #ffecb8' }}>{toast}</div>
        )}
      </div>

      <div style={{ margin: '12px 0 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          Date
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ marginTop: 6 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          Class
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ marginTop: 6 }}>
            <option value="All">All</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" className="link-pill" onClick={() => handleAction('Mark All Present')}>
            Mark All Present
          </button>
          <button type="button" className="link-pill" onClick={() => handleAction('Export CSV')}>
            Export CSV
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <label style={{ fontSize: 12 }}>Gender</label>
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
              <option value="All">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
      </div>

      <AttendanceModule
        onBulkAction={(status, ids) => {
          if (!ids || !ids.length) return
          setRows((prev) => prev.map((r) => (ids.includes(r.id ?? r.subtitle) ? { ...r, status, tone: status === 'Present' ? 'success' : 'danger' } : r)))
        }}
        onGenderFilter={(g) => setGenderFilter(g)}
        module={{
          title: 'Attendance control',
          subtitle: 'Homeroom session — live status chips.',
          actions: ['Mark Attendance', 'Approve Leave', 'Print Report', 'Mark All Present', 'Export CSV'],
          stats: [
            { label: 'Present', value: `${present}`, note: 'Checked in' },
            { label: 'Late', value: `${late}`, note: 'Arrived after bell' },
            { label: 'Absent', value: `${absent}`, note: 'Follow-up' },
          ],
          rows,
          trendSeries: trendSeries,
          trendSeriesAbsent: trendSeriesAbsent,
          trendLabels: trendLabels,
          columns: ['Student', 'Class', 'Status', 'Time'],
          features: ['One-click marking', 'Leave approvals', 'Report generation'],
          workflow: ['Select class', 'Mark roll', 'Publish summary'],
          trendLabel: 'Attendance trends',
          ring: { total: `${rows.length ? Math.round((present / rows.length) * 100) : 0}%`, subtitle: 'Present rate' },
          checklist: ['Record daily', 'Share notices', 'Follow up absences'],
          gender: { male: maleCount, female: femaleCount },
        }}
        onActionClick={handleAction}
        searchTerm={searchQuery}
        setSearchTerm={setSearchQuery}
        filteredRecords={filteredRecords}
        selectedRecordKey={selectedRecordKey}
        setSelectedRecordKey={setSelectedRecordKey}
        activeAction={activeAction}
        actionConfig={{}}
        formValues={{}}
        onFieldChange={() => {}}
        onFormSubmit={() => {}}
        onFormReset={() => {}}
        onActionSelect={() => {}}
        systemMessage="Attendance data is current"
        notificationsEnabled
        selectedRecord={selectedRecord}
      />
    </div>
  )
}

export default AttendancePage
