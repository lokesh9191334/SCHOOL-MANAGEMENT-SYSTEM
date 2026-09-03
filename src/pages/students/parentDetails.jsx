import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS } from '../../data/seed'

const COMMUNICATION_HISTORY = [
  { id: 1, date: '2026-08-02 10:15', type: 'SMS', by: 'Admin', subject: 'Attendance Alert', message: 'Your child was marked late today. Traffic reported on route 3.', tone: 'warning' },
  { id: 2, date: '2026-07-28 15:40', type: 'Email', by: 'Dr. Meera Iyer', subject: 'PTM Invitation', message: 'Parent-Teacher Meeting scheduled for 5th August at 10:00 AM.', tone: 'success' },
  { id: 3, date: '2026-07-20 09:20', type: 'Call', by: 'Front Desk', subject: 'Fee Reminder', message: 'Quarterly fee payment due by 25th July.', tone: 'info' },
  { id: 4, date: '2026-07-12 14:00', type: 'SMS', by: 'Transport Dept', subject: 'Bus Delay', message: 'Bus running 15 mins late due to road construction.', tone: 'warning' },
  { id: 5, date: '2026-07-05 11:30', type: 'Meeting', by: 'Class Teacher', subject: 'Academic Review', message: 'Discussed mid-term performance and improvement plan.', tone: 'success' },
]

const RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Grandparent']

const getParentAvatarGradient = (idx, gender) => {
  if (gender === 'Male' || idx % 2 === 0) return 'linear-gradient(135deg, #6fc3ff, #4157ff)'
  return 'linear-gradient(135deg, #ff93c2, #7c6cff)'
}

const ParentDetailsPage = () => {
  const [students] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [toast, setToast] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [selectedParent, setSelectedParent] = useState(null)
  const [filterRelation, setFilterRelation] = useState('All')

  const parents = useMemo(() => {
    const list = []
    students.forEach((s) => {
      if (s.fatherName) {
        list.push({
          id: `F-${s.id}`,
          studentId: s.id,
          studentName: s.title,
          studentClass: s.subtitle,
          name: s.fatherName,
          relationship: 'Father',
          occupation: s.fatherOccupation || 'Professional',
          phone: s.fatherPhone || s.phone || '+91 90000 00001',
          email: s.fatherEmail || s.owner || 'parent@email.com',
          address: s.currentAddress || '123 School Lane, City',
          emergencyContact: s.motherPhone || s.fatherPhone || '+91 90000 00002',
        })
      }
      if (s.motherName) {
        list.push({
          id: `M-${s.id}`,
          studentId: s.id,
          studentName: s.title,
          studentClass: s.subtitle,
          name: s.motherName,
          relationship: 'Mother',
          occupation: s.motherOccupation || 'Homemaker',
          phone: s.motherPhone || s.phone || '+91 90000 00003',
          email: s.motherEmail || s.owner || 'parent@email.com',
          address: s.currentAddress || '123 School Lane, City',
          emergencyContact: s.fatherPhone || s.motherPhone || '+91 90000 00004',
        })
      }
    })
    return list
  }, [students])

  const filteredParents = useMemo(() => {
    return parents.filter((p) => {
      if (filterRelation !== 'All' && p.relationship !== filterRelation) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          p.studentName.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [parents, searchQuery, filterRelation])

  const activeParent = selectedParent || filteredParents[0]

  const handleCall = (p) => {
    setToast(`📞 Calling ${p.name} at ${p.phone}...`)
  }
  const handleSMS = (p) => {
    const m = window.prompt(`Send SMS to ${p.name} (${p.phone})`, '')
    if (m) setToast(`SMS sent to ${p.name}`)
  }
  const handleEmail = (p) => {
    const subj = window.prompt(`Email subject to ${p.name}`, 'Greetings from School')
    if (subj) setToast(`Email draft opened for ${p.name}`)
  }
  const handleExportCSV = () => {
    const headers = ['Parent Name', 'Relationship', 'Student', 'Class', 'Phone', 'Email', 'Address']
    const rows = filteredParents.map((p) => [p.name, p.relationship, p.studentName, p.studentClass, p.phone, p.email, p.address])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `parent-directory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setToast('Directory exported as CSV')
  }
  const handleExportPDF = () => {
    setToast('Preparing PDF directory...')
    setTimeout(() => setToast('Parent directory PDF downloaded'), 1200)
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
          <div>
            <p className="admin-kicker">Guardians</p>
            <h2>Parent &amp; Guardian Management</h2>
            <p>Complete parent directory with search filters, communication history, emergency contacts, and export options.</p>
          </div>
          <div className="link-row" style={{ gap: '10px' }}>
            <Link className="link-pill" to="/students">← Registry</Link>
            <button type="button" className="link-pill" onClick={handleExportCSV}>📥 Export CSV</button>
            <button type="button" className="link-pill" onClick={handleExportPDF}>📄 Export PDF</button>
          </div>
        </div>
      </div>

      <div className="content-grid">
        {[
          { label: 'Total Parents', value: parents.length, note: 'Active guardians', grad: 'linear-gradient(135deg, #4157ff, #7c8cff)', icon: '👥' },
          { label: 'Fathers', value: parents.filter((p) => p.relationship === 'Father').length, note: 'On record', grad: 'linear-gradient(135deg, #6fc3ff, #4157ff)', icon: '👨' },
          { label: 'Mothers', value: parents.filter((p) => p.relationship === 'Mother').length, note: 'On record', grad: 'linear-gradient(135deg, #ff93c2, #7c6cff)', icon: '👩' },
          { label: 'Students Linked', value: new Set(parents.map((p) => p.studentId)).size, note: 'Unique students', grad: 'linear-gradient(135deg, #17b398, #5fe0c6)', icon: '🎓' },
        ].map((k, idx) => (
          <div key={idx} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: k.grad,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '10px',
              fontSize: '22px',
              boxShadow: '0 8px 18px rgba(65, 87, 255, 0.2)',
            }}>{k.icon}</div>
            <span>{k.label}</span>
            <strong className="stat-value">{k.value}</strong>
            <p className="stat-note">{k.note}</p>
          </div>
        ))}
      </div>

      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Filters</p>
            <h3>Search &amp; Filter</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className={`small-action ${viewMode === 'grid' ? 'primary' : ''}`} onClick={() => setViewMode('grid')}
              style={viewMode === 'grid' ? { background: 'linear-gradient(135deg, #4157ff, #7c8cff)', color: 'white', border: 'none' } : {}}>▦ Grid</button>
            <button type="button" className={`small-action ${viewMode === 'list' ? 'primary' : ''}`} onClick={() => setViewMode('list')}
              style={viewMode === 'list' ? { background: 'linear-gradient(135deg, #4157ff, #7c8cff)', color: 'white', border: 'none' } : {}}>☰ List</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <input
            type="text"
            placeholder="🔍 Search by parent name, student, phone, or email..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <select
            className="search-input"
            value={filterRelation}
            onChange={(e) => setFilterRelation(e.target.value)}
            style={{ marginBottom: 0 }}
          >
            <option value="All">All Relationships</option>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}s</option>)}
          </select>
        </div>
      </article>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 1.2fr', gap: '18px' }}>
        <article className="panel-card data-panel" style={{ alignSelf: 'flex-start' }}>
          <div className="panel-header compact">
            <div>
              <p className="panel-kicker">Directory</p>
              <h3>Parents ({filteredParents.length})</h3>
            </div>
          </div>
          {filteredParents.length === 0 ? (
            <div className="empty-state"><p>No parents match the search.</p></div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredParents.map((p, idx) => {
                const sel = activeParent?.id === p.id
                return (
                  <button key={p.id} type="button" onClick={() => setSelectedParent(p)} style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '16px',
                    border: sel ? '2px solid rgba(65, 87, 255, 0.35)' : '1px solid rgba(65, 87, 255, 0.08)',
                    background: sel ? 'linear-gradient(135deg, rgba(65, 87, 255, 0.12), rgba(255,255,255,1))' : 'white',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    boxShadow: sel ? '0 10px 26px rgba(65, 87, 255, 0.14)' : '0 4px 12px rgba(13, 25, 62, 0.04)',
                    transition: 'all 0.15s ease',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      background: getParentAvatarGradient(idx, p.relationship === 'Father' ? 'Male' : 'Female'),
                      fontWeight: '800',
                      fontSize: '16px',
                      flexShrink: 0,
                      boxShadow: '0 6px 14px rgba(65, 87, 255, 0.18)',
                    }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '13px', color: '#111b33', fontWeight: '800' }}>{p.name}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#7f8ba5', fontWeight: '600' }}>
                        {p.relationship} · {p.studentName}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#4157ff', fontWeight: '700' }}>{p.phone}</p>
                    </div>
                    <span className="status-pill" style={{
                      background: p.relationship === 'Father' ? 'rgba(111, 195, 255, 0.18)' : 'rgba(255, 147, 194, 0.18)',
                      color: p.relationship === 'Father' ? '#2563eb' : '#be185d',
                      padding: '3px 8px',
                      fontSize: '0.65rem',
                      alignSelf: 'start',
                    }}>{p.relationship}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Parent</th><th>Student</th><th>Relation</th><th>Phone</th></tr></thead>
                <tbody>
                  {filteredParents.map((p) => (
                    <tr key={p.id} onClick={() => setSelectedParent(p)} style={{ cursor: 'pointer' }} className={activeParent?.id === p.id ? 'selected' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #4157ff, #7c8cff)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '800', fontSize: '12px',
                          }}>{p.name.charAt(0)}</div>
                          <span className="record-title">{p.name}</span>
                        </div>
                      </td>
                      <td>{p.studentName}</td>
                      <td><span className="status-pill">{p.relationship}</span></td>
                      <td style={{ fontWeight: '700', color: '#4157ff' }}>{p.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {!activeParent ? (
            <article className="panel-card data-panel">
              <div className="empty-state"><p>Select a parent from the directory.</p></div>
            </article>
          ) : (
            <>
              <article className="panel-card data-panel" style={{
                background: 'linear-gradient(145deg, rgba(65, 87, 255, 0.08) 0%, rgba(255,255,255,1) 65%)',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'center' }}>
                  <div style={{
                    width: '108px',
                    height: '108px',
                    borderRadius: '28px',
                    overflow: 'hidden',
                    background: getParentAvatarGradient(0, activeParent.relationship === 'Father' ? 'Male' : 'Female'),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '44px',
                    fontWeight: '800',
                    border: '4px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 16px 32px rgba(65, 87, 255, 0.22)',
                    flexShrink: 0,
                  }}>
                    {activeParent.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#111b33' }}>{activeParent.name}</h2>
                      <span className="status-pill" style={{
                        background: activeParent.relationship === 'Father' ? 'rgba(111, 195, 255, 0.18)' : 'rgba(255, 147, 194, 0.18)',
                        color: activeParent.relationship === 'Father' ? '#2563eb' : '#be185d',
                        padding: '6px 14px',
                        fontSize: '0.74rem',
                      }}>{activeParent.relationship}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', color: '#5c6b8c', fontSize: '14px', fontWeight: '600' }}>
                      {activeParent.occupation || 'Professional'}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      <span className="status-pill" style={{ background: 'rgba(23, 179, 152, 0.14)', color: '#0d8f7a' }}>🎓 Child: {activeParent.studentName}</span>
                      <span className="status-pill">{activeParent.studentClass}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button type="button" className="small-action" onClick={() => handleCall(activeParent)} style={{
                      background: 'linear-gradient(135deg, #17b398, #5fe0c6)', color: 'white', border: 'none',
                      padding: '10px 18px', fontWeight: '700',
                    }}>📞 Call</button>
                    <button type="button" className="small-action" onClick={() => handleSMS(activeParent)}>✉ SMS</button>
                    <button type="button" className="small-action" onClick={() => handleEmail(activeParent)}>📧 Email</button>
                    <Link to={`/students/profile`} state={{ studentId: activeParent.studentId }} className="small-action" style={{ textDecoration: 'none', textAlign: 'center' }}>
                      👁 View Student
                    </Link>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '18px' }}>
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'white',
                    border: '1px solid rgba(65, 87, 255, 0.08)',
                  }}>
                    <p className="panel-kicker" style={{ marginBottom: '6px' }}>Contact</p>
                    <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#111b33', fontWeight: '800' }}>Details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Phone</span>
                        <span style={{ color: '#4157ff', fontWeight: '800' }}>{activeParent.phone}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Email</span>
                        <span style={{ color: '#111b33', fontWeight: '700', fontSize: '0.8rem', textAlign: 'right' }}>{activeParent.email}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Occupation</span>
                        <span style={{ color: '#111b33', fontWeight: '700' }}>{activeParent.occupation}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#7f8ba5', fontWeight: '600' }}>Address</span>
                        <span style={{ color: '#111b33', fontWeight: '700', fontSize: '0.8rem', textAlign: 'right', maxWidth: '60%' }}>{activeParent.address}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(243, 93, 93, 0.08), rgba(255,255,255,1))',
                    border: '1px solid rgba(243, 93, 93, 0.16)',
                  }}>
                    <p className="panel-kicker" style={{ marginBottom: '6px', color: '#f35d5d' }}>Emergency</p>
                    <h4 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#111b33', fontWeight: '800' }}>🚨 Emergency Contact</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #f35d5d, #ff9b9b)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', fontWeight: '800',
                      }}>⚠</div>
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#7f8ba5', fontWeight: '600' }}>24/7 Emergency</p>
                        <p style={{ margin: 0, fontSize: '18px', color: '#f35d5d', fontWeight: '800' }}>{activeParent.emergencyContact}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCall({ ...activeParent, phone: activeParent.emergencyContact })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #f35d5d, #ff9b9b)',
                        color: 'white',
                        border: 'none',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 10px 22px rgba(243, 93, 93, 0.22)',
                      }}
                    >📞 Call Emergency Contact</button>
                  </div>
                </div>
              </article>

              <article className="panel-card data-panel">
                <div className="panel-header compact">
                  <div>
                    <p className="panel-kicker">Timeline</p>
                    <h3>💬 Communication History</h3>
                  </div>
                  <button type="button" className="small-action" onClick={() => {
                    const m = window.prompt(`New message to ${activeParent.name}`, '')
                    if (m) setToast('Message logged in history')
                  }}>+ New</button>
                </div>
                <div className="timeline-list" style={{ gap: '10px' }}>
                  {COMMUNICATION_HISTORY.map((c) => (
                    <div key={c.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '48px 1fr',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: c.tone === 'warning' ? 'rgba(244, 181, 98, 0.08)' : c.tone === 'success' ? 'rgba(23, 179, 152, 0.07)' : 'rgba(65, 87, 255, 0.05)',
                      border: `1px solid ${c.tone === 'warning' ? 'rgba(244, 181, 98, 0.18)' : c.tone === 'success' ? 'rgba(23, 179, 152, 0.16)' : 'rgba(65, 87, 255, 0.1)'}`,
                    }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: {
                          warning: 'linear-gradient(135deg, #f4b562, #ffd9a8)',
                          success: 'linear-gradient(135deg, #17b398, #5fe0c6)',
                          info: 'linear-gradient(135deg, #4157ff, #7c8cff)',
                        }[c.tone],
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px',
                        boxShadow: '0 6px 14px rgba(65, 87, 255, 0.18)',
                      }}>
                        {c.type === 'SMS' ? '💬' : c.type === 'Email' ? '📧' : c.type === 'Call' ? '📞' : '🤝'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '4px', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '13px', color: '#111b33', fontWeight: '800' }}>{c.subject}</h4>
                            <span className="status-pill" style={{
                              background: {
                                warning: 'rgba(244, 181, 98, 0.2)',
                                success: 'rgba(23, 179, 152, 0.14)',
                                info: 'rgba(65, 87, 255, 0.12)',
                              }[c.tone],
                              color: { warning: '#b07820', success: '#0d8f7a', info: '#4157ff' }[c.tone],
                              padding: '3px 10px',
                              fontSize: '0.68rem',
                            }}>{c.type}</span>
                          </div>
                          <span style={{ fontSize: '0.74rem', color: '#7f8ba5', fontWeight: '600' }}>{c.date}</span>
                        </div>
                        <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: '#5c6b8c', lineHeight: 1.55 }}>{c.message}</p>
                        <p style={{ margin: 0, fontSize: '0.74rem', color: '#7f8ba5', fontWeight: '600' }}>By: {c.by}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </>
          )}
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #111b33 0%, #3246c7 100%)',
            color: 'white',
            borderRadius: '14px',
            fontWeight: '700',
            boxShadow: '0 18px 40px rgba(17, 27, 51, 0.3)',
            zIndex: 9999,
            animation: 'directSurfaceSlide 300ms ease',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

export default ParentDetailsPage
