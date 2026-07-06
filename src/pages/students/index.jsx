import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AllStudentsModule from '../../modules/AllStudentsModule'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS } from '../../data/seed'

const StudentsPage = () => {
  const navigate = useNavigate()
  const [students, setStudents] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecordKey, setSelectedRecordKey] = useState(null)
  const [activeAction, setActiveAction] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(t)
  }, [toast])

  const filteredRecords = students.filter(
    (r) =>
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.primary.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedRecord = students.find((s) => s.id === selectedRecordKey) ?? null

  const handleActionClick = (action) => {
    setActiveAction(action)
    if (action === 'Add Student') {
      navigate('/students/add')
      setActiveAction(null)
    }
    if (action === 'View Profile') {
      navigate('/students/profile')
    }
    if (action === 'Export List') {
      setToast('Export queued (demo).')
    }
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Registry</p>
        <h2>Student lifecycle</h2>
        <p>
          Search the roll, open profiles, and jump to structured intake. Data persists in this browser via
          local storage.
        </p>
        <div className="link-row">
          <Link className="link-pill" to="/students/add">
            Add student
          </Link>
          <Link className="link-pill" to="/students/data-files">
            Documents
          </Link>
          <Link className="link-pill" to="/attendance">
            Attendance
          </Link>
          <button
            type="button"
            className="link-pill"
            onClick={() => {
              setStudents(SEED_STUDENTS)
              setToast('Demo student data restored')
            }}
          >
            Reset demo data
          </button>
        </div>
      </div>

      <AllStudentsModule
        module={{
          title: 'Student registry',
          subtitle: 'Complete student list with guardian contacts and class placement.',
          actions: ['Add Student', 'View Profile', 'Export List'],
          stats: [
            { label: 'Registered', value: students.length, note: 'Students on file' },
            { label: 'Selected', value: selectedRecord ? 1 : 0, note: 'Active row' },
          ],
          rows: students,
          columns: ['Student', 'Class', 'Status', 'Parent'],
          features: ['Search & filter', 'Profile management', 'CSV export (demo)'],
          workflow: ['Select student', 'Open profile', 'Update details'],
          trendLabel: 'Student growth',
          ring: { total: `${Math.min(96, 60 + students.length)}%`, subtitle: 'Engagement' },
          checklist: ['Verify documents', 'Assign sections', 'Notify guardians'],
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
        systemMessage={toast || 'Student registry is available'}
        notificationsEnabled
        selectedRecord={selectedRecord}
      />
    </div>
  )
}

export default StudentsPage
