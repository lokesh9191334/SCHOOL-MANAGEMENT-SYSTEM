import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AllStudentsModule from '../../modules/AllStudentsModule'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_TEACHERS } from '../../data/seed'

const TeachersPage = () => {
  const navigate = useNavigate()
  const [teachers, setTeachers] = usePersistentState(STORAGE_KEYS.teachers, SEED_TEACHERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecordKey, setSelectedRecordKey] = useState(null)
  const [activeAction, setActiveAction] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  const filteredRecords = teachers.filter(
    (r) =>
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedRecord = teachers.find((s) => s.id === selectedRecordKey) ?? null

  const handleActionClick = (action) => {
    setActiveAction(action)
    if (action === 'Add Teacher') {
      navigate('/teachers/add')
      setActiveAction(null)
    }
    if (action === 'View Profile') {
      navigate('/teachers/profile')
    }
    if (action === 'Assign Class') {
      setToast('Assignment saved (demo).')
    }
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">People</p>
        <h2>Teaching staff</h2>
        <p>Subject specialists, homeroom leads and relief faculty with availability signals.</p>
        <div className="link-row">
          <Link className="link-pill" to="/teachers/add">
            Add teacher
          </Link>
          <Link className="link-pill" to="/academics/timetable">
            Timetable
          </Link>
        </div>
      </div>

      <AllStudentsModule
        module={{
          title: 'Faculty registry',
          subtitle: 'Directory of teachers with subjects and contact channels.',
          actions: ['Add Teacher', 'View Profile', 'Assign Class'],
          stats: [
            { label: 'Faculty', value: teachers.length, note: 'Profiles on file' },
            { label: 'On leave', value: teachers.filter((t) => t.status === 'On leave').length, note: 'Today' },
          ],
          rows: teachers,
          columns: ['Teacher', 'Subject', 'Status', 'Contact'],
          features: ['Workload planning', 'Substitute matching', 'PD tracking'],
          workflow: ['Verify credentials', 'Assign sections', 'Sync timetable'],
          trendLabel: 'Retention',
          ring: { total: '91%', subtitle: 'Satisfaction' },
          checklist: ['Verify licences', 'Update HR', 'Publish directory'],
        }}
        onActionClick={handleActionClick}
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
        systemMessage={toast || 'Faculty directory synced'}
        notificationsEnabled
        selectedRecord={selectedRecord}
      />
    </div>
  )
}

export default TeachersPage
