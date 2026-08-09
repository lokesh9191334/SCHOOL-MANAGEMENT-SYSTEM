import { useState } from 'react'
import { Link } from 'react-router-dom'
import ResultsModule from '../../modules/ResultsModule'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'

const defaultMarks = [
  {
    id: 'EX-1',
    title: 'Aanya Sharma',
    subtitle: 'Mathematics',
    primary: 'Term 1',
    status: 'A',
    owner: '92%',
    tone: 'success',
  },
  {
    id: 'EX-2',
    title: 'Kabir Khan',
    subtitle: 'Science',
    primary: 'Term 1',
    status: 'B+',
    owner: '86%',
    tone: 'success',
  },
  {
    id: 'EX-3',
    title: 'Diya Patel',
    subtitle: 'English',
    primary: 'Term 1',
    status: 'A-',
    owner: '88%',
    tone: 'success',
  },
]

const ExaminationPage = () => {
  const [rows] = usePersistentState(STORAGE_KEYS.examMarks, defaultMarks)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecordKey, setSelectedRecordKey] = useState(null)
  const [activeAction, setActiveAction] = useState(null)

  const filteredRecords = rows.filter(
    (r) =>
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedRecord = rows.find((r) => r.id === selectedRecordKey) ?? null

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Academics</p>
        <h2>Examination hub</h2>
        <p>Central place for schedules, mark entry, grading workflows and published report cards.</p>
        <div className="link-row">
          <Link className="link-pill" to="/examination/schedule">
            Schedule
          </Link>
          <Link className="link-pill" to="/examination/results">
            Results
          </Link>
          <Link className="link-pill" to="/examination/grading">
            Grading
          </Link>
        </div>
      </div>

      <ResultsModule
        module={{
          title: 'Results dashboard',
          subtitle: 'Latest internal assessment snapshot.',
          actions: ['Enter Marks', 'Publish Result', 'Generate Cards'],
          stats: [
            { label: 'Published', value: '12', note: 'Exam sessions' },
            { label: 'Pending', value: '3', note: 'Report cards' },
          ],
          rows,
          columns: ['Student', 'Subject', 'Score', 'Grade'],
          features: ['Mark entry', 'Report export', 'Grade analysis'],
          workflow: ['Collect marks', 'Review grades', 'Publish results'],
          trendLabel: 'Results trends',
          ring: { total: '84%', subtitle: 'Pass rate' },
          checklist: ['Validate marks', 'Approve reports', 'Notify students'],
        }}
        onActionClick={(a) => setActiveAction(a)}
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
        systemMessage="Exam module is healthy"
        notificationsEnabled
        selectedRecord={selectedRecord}
      />
    </div>
  )
}

export default ExaminationPage
