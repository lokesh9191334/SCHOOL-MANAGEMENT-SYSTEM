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

  const present = rows.filter((r) => r.status === 'Present').length
  const absent = rows.filter((r) => r.status === 'Absent').length
  const late = rows.filter((r) => r.status === 'Late').length

  const filteredRecords = rows.filter(
    (r) =>
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAction = (action) => {
    setActiveAction(action)
    if (action === 'Mark Attendance') {
      setRows((prev) =>
        prev.map((r) => (r.status === 'Absent' ? { ...r, status: 'Present', tone: 'success', owner: '09:10' } : r)),
      )
    }
  }

  const selectedRecord = rows.find((r) => r.id === selectedRecordKey) ?? null

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

      <AttendanceModule
        module={{
          title: 'Attendance control',
          subtitle: 'Homeroom session — live status chips.',
          actions: ['Mark Attendance', 'Approve Leave', 'Print Report'],
          stats: [
            { label: 'Present', value: `${present}`, note: 'Checked in' },
            { label: 'Late', value: `${late}`, note: 'Arrived after bell' },
            { label: 'Absent', value: `${absent}`, note: 'Follow-up' },
          ],
          rows,
          columns: ['Student', 'Class', 'Status', 'Time'],
          features: ['One-click marking', 'Leave approvals', 'Report generation'],
          workflow: ['Select class', 'Mark roll', 'Publish summary'],
          trendLabel: 'Attendance trends',
          ring: { total: `${rows.length ? Math.round((present / rows.length) * 100) : 0}%`, subtitle: 'Present rate' },
          checklist: ['Record daily', 'Share notices', 'Follow up absences'],
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
