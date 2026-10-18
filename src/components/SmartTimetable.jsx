import { useEffect, useState } from 'react'
import { getApiAuthHeaders } from '../services/apiAuth'
import { publishResultMessage, publishTimetable } from '../services/academicDocuments'
import { getAuthUser } from '../utils/session'
import './SmartTimetable.css'

// Starter period structures per grade (times + subject suggestions only).
// Teachers and rooms are never invented — the school fills them in and saves.
const GRADE_TEMPLATES = {
  'pre-primary': [
    { time: '9:00-9:30', subject: 'Morning Assembly', duration: 30 },
    { time: '9:30-10:00', subject: 'Rhymes & Songs', duration: 30 },
    { time: '10:00-10:30', subject: 'Story Time', duration: 30 },
    { time: '10:30-11:00', subject: 'Snack Break', duration: 30 },
    { time: '11:00-11:30', subject: 'Art & Craft', duration: 30 },
    { time: '11:30-12:00', subject: 'Play Time', duration: 30 },
    { time: '12:00-12:30', subject: 'Nap Time', duration: 30 },
    { time: '12:30-1:00', subject: 'Lunch', duration: 30 },
  ],
  primary: [
    { time: '8:00-8:40', subject: 'English', duration: 40 },
    { time: '8:40-9:20', subject: 'Mathematics', duration: 40 },
    { time: '9:20-10:00', subject: 'Science', duration: 40 },
    { time: '10:00-10:20', subject: 'Short Break', duration: 20 },
    { time: '10:20-11:00', subject: 'Social Studies', duration: 40 },
    { time: '11:00-11:40', subject: 'Computer', duration: 40 },
    { time: '11:40-12:20', subject: 'Physical Education', duration: 40 },
    { time: '12:20-1:00', subject: 'Lunch', duration: 40 },
    { time: '1:00-1:40', subject: 'Art & Music', duration: 40 },
  ],
  middle: [
    { time: '7:30-8:15', subject: 'English', duration: 45 },
    { time: '8:15-9:00', subject: 'Mathematics', duration: 45 },
    { time: '9:00-9:45', subject: 'Science', duration: 45 },
    { time: '9:45-10:00', subject: 'Short Break', duration: 15 },
    { time: '10:00-10:45', subject: 'Social Studies', duration: 45 },
    { time: '10:45-11:30', subject: 'Computer Science', duration: 45 },
    { time: '11:30-12:15', subject: 'Second Language', duration: 45 },
    { time: '12:15-1:00', subject: 'Lunch', duration: 45 },
    { time: '1:00-1:45', subject: 'Physical Education', duration: 45 },
    { time: '1:45-2:30', subject: 'Art/Music', duration: 45 },
  ],
  secondary: [
    { time: '7:00-7:45', subject: 'English', duration: 45 },
    { time: '7:45-8:30', subject: 'Mathematics', duration: 45 },
    { time: '8:30-9:15', subject: 'Physics', duration: 45 },
    { time: '9:15-10:00', subject: 'Chemistry', duration: 45 },
    { time: '10:00-10:15', subject: 'Short Break', duration: 15 },
    { time: '10:15-11:00', subject: 'Biology', duration: 45 },
    { time: '11:00-11:45', subject: 'Computer Science', duration: 45 },
    { time: '11:45-12:30', subject: 'History', duration: 45 },
    { time: '12:30-1:15', subject: 'Geography', duration: 45 },
    { time: '1:15-2:00', subject: 'Lunch', duration: 45 },
    { time: '2:00-2:45', subject: 'Physical Education', duration: 45 },
    { time: '2:45-3:30', subject: 'Economics/Commerce', duration: 45 },
  ],
  senior: [
    { time: '6:45-7:30', subject: 'English', duration: 45 },
    { time: '7:30-8:15', subject: 'Mathematics', duration: 45 },
    { time: '8:15-9:00', subject: 'Physics', duration: 45 },
    { time: '9:00-9:45', subject: 'Chemistry', duration: 45 },
    { time: '9:45-10:00', subject: 'Short Break', duration: 15 },
    { time: '10:00-10:45', subject: 'Biology/Computer Science', duration: 45 },
    { time: '10:45-11:30', subject: 'History/Political Science', duration: 45 },
    { time: '11:30-12:15', subject: 'Geography/Economics', duration: 45 },
    { time: '12:15-1:00', subject: 'Lunch', duration: 45 },
    { time: '1:00-1:45', subject: 'Physical Education', duration: 45 },
    { time: '1:45-2:30', subject: 'Optional Subject', duration: 45 },
    { time: '2:30-3:15', subject: 'Library/Study Period', duration: 45 },
  ],
}

const SUBJECT_SUGGESTIONS = {
  'pre-primary': ['Morning Assembly', 'Rhymes & Songs', 'Story Time', 'Art & Craft', 'Play Time', 'Nap Time', 'Snack Break', 'Lunch'],
  primary: ['English', 'Mathematics', 'Science', 'Social Studies', 'Computer', 'Physical Education', 'Art & Music', 'Short Break', 'Lunch'],
  middle: ['English', 'Mathematics', 'Science', 'Social Studies', 'Computer Science', 'Second Language', 'Physical Education', 'Art/Music', 'Short Break', 'Lunch'],
  secondary: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'History', 'Geography', 'Physical Education', 'Economics/Commerce', 'Short Break', 'Lunch'],
  senior: ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology/Computer Science', 'History/Political Science', 'Geography/Economics', 'Physical Education', 'Optional Subject', 'Library/Study Period', 'Short Break', 'Lunch'],
}

const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function buildTemplate(grade) {
  const periods = (GRADE_TEMPLATES[grade] || []).map((period) => ({
    ...period,
    teacher: '',
    room: '',
  }))
  const map = {}
  weekDays.forEach((day) => {
    map[day] = periods.map((period) => ({ ...period }))
  })
  return map
}

function timetableKey(grade, section) {
  return `sms_timetable_${grade}_${section}`
}

const SmartTimetable = ({ onPublished }) => {
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [timetableData, setTimetableData] = useState({})
  const [customTimetable, setCustomTimetable] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [activeDay, setActiveDay] = useState('monday')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [teacherOptions, setTeacherOptions] = useState([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/records/sms_mod__teachers', { headers: getApiAuthHeaders() })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return
        setTeacherOptions(rows.map((row) => row?.title || row?.name).filter(Boolean))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedGrade || !selectedSection) return
    let cancelled = false
    fetch(`/api/records/${timetableKey(selectedGrade, selectedSection)}`, { headers: getApiAuthHeaders() })
      .then((response) => (response.ok ? response.json().catch(() => null) : null))
      .then((body) => {
        if (cancelled) return
        const rows = Array.isArray(body) ? body : []
        if (rows.length) {
          const map = {}
          rows.forEach((dayRow) => {
            if (dayRow?.day) map[dayRow.day] = Array.isArray(dayRow.periods) ? dayRow.periods : []
          })
          weekDays.forEach((day) => {
            if (!map[day]) map[day] = []
          })
          setTimetableData(map)
          setCustomTimetable(map[activeDay] || [])
          setStatusMessage('Loaded your saved timetable for this grade and section.')
        } else {
          const template = buildTemplate(selectedGrade)
          setTimetableData(template)
          setCustomTimetable(template[activeDay] || [])
          setStatusMessage('No saved timetable yet — this is a starter template. Set teachers and rooms, then save.')
        }
      })
      .catch(() => {
        if (cancelled) return
        const template = buildTemplate(selectedGrade)
        setTimetableData(template)
        setCustomTimetable(template[activeDay] || [])
        setStatusMessage('Could not reach the server — showing the starter template.')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, selectedSection])

  const handleGradeChange = (grade) => {
    setSelectedGrade(grade)
    setSelectedSection('')
    setTimetableData({})
    setCustomTimetable([])
    setIsEditing(false)
    setStatusMessage('')
  }

  const handleSectionChange = (value) => {
    const next = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4)
    setSelectedSection(next)
    if (!next) setStatusMessage('')
  }

  const handleDayChange = (day) => {
    setActiveDay(day)
    setCustomTimetable(timetableData[day] || [])
  }

  const handlePeriodEdit = (index, field, value) => {
    const updatedTimetable = [...customTimetable]
    updatedTimetable[index] = { ...updatedTimetable[index], [field]: value }
    setCustomTimetable(updatedTimetable)

    const updatedFullTimetable = { ...timetableData }
    updatedFullTimetable[activeDay] = updatedTimetable
    setTimetableData(updatedFullTimetable)
  }

  const saveTimetable = async () => {
    setIsSaving(true)
    try {
      const rows = weekDays
        .filter((day) => (timetableData[day] || []).length)
        .map((day) => ({ day, periods: timetableData[day] }))
      const response = await fetch(`/api/records/${timetableKey(selectedGrade, selectedSection)}`, {
        method: 'PUT',
        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(rows),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setStatusMessage(body?.error || 'Could not save the timetable.')
        return
      }
      const role = String(getAuthUser()?.role || '').toLowerCase()
      if (!['admin', 'super_admin'].includes(role)) {
        setStatusMessage(`Timetable saved to the system for ${selectedGrade} · Section ${selectedSection}.`)
        return
      }
      setIsPublishing(true)
      setStatusMessage('Timetable saved. Publishing it to parents and super admins…')
      try {
        const publishBody = await publishTimetable({ grade: selectedGrade, section: selectedSection })
        setStatusMessage(publishResultMessage(publishBody, 'Timetable'))
        if (typeof onPublished === 'function') onPublished(publishBody)
      } catch (publishError) {
        setStatusMessage(
          `Timetable saved, but it could not be published: ${publishError?.message || 'the server is unreachable.'}`,
        )
      }
    } catch {
      setStatusMessage('Could not save the timetable — the server is unreachable.')
    } finally {
      setIsPublishing(false)
      setIsSaving(false)
    }
  }

  const exportTimetable = () => {
    const dataStr = JSON.stringify(timetableData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const exportFileDefaultName = `timetable_${selectedGrade}_${selectedSection}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="smart-timetable">
      <div className="timetable-header">
        <h2>Timetable Builder</h2>
        <p>Pick a grade for a starter period structure, set your own teachers and rooms, then save it to the system. Nothing is filled in for you.</p>
      </div>

      <div className="timetable-controls">
        <div className="control-group">
          <label>Select Grade Level:</label>
          <select value={selectedGrade} onChange={(e) => handleGradeChange(e.target.value)}>
            <option value="">Choose Grade</option>
            <option value="pre-primary">Pre-Primary (Nursery, KG)</option>
            <option value="primary">Primary (1-5)</option>
            <option value="middle">Middle (6-8)</option>
            <option value="secondary">Secondary (9-10)</option>
            <option value="senior">Senior (11-12)</option>
          </select>
        </div>

        {selectedGrade && (
          <div className="control-group">
            <label>Section (letters/numbers):</label>
            <input
              type="text"
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              placeholder="e.g. A"
              maxLength="4"
            />
          </div>
        )}

        {selectedGrade && selectedSection && (
          <div className="control-group">
            <label>Select Day:</label>
            <div className="day-selector">
              {weekDays.map(day => (
                <button
                  key={day}
                  className={`day-button ${activeDay === day ? 'active' : ''}`}
                  onClick={() => handleDayChange(day)}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedGrade && selectedSection && (
        <div className="timetable-actions">
          <button
            className={`btn-edit ${isEditing ? 'active' : ''}`}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Done Editing' : 'Edit Timetable'}
          </button>
          <button className="btn-export" onClick={exportTimetable}>
            Export Timetable
          </button>
          <button className="btn-save" onClick={saveTimetable} disabled={isSaving || isPublishing}>
            {isPublishing ? 'Publishing…' : isSaving ? 'Saving…' : 'Save to System'}
          </button>
        </div>
      )}

      {selectedGrade && selectedSection && (
        <div className="timetable-container">
          <div className="timetable-info">
            <h3>
              {selectedGrade.charAt(0).toUpperCase() + selectedGrade.slice(1)} -
              Section {selectedSection} -
              {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}
            </h3>
            <p>Total Periods: {customTimetable.length}</p>
            {statusMessage ? <p className="timetable-status">{statusMessage}</p> : null}
          </div>

          {customTimetable.length ? (
          <div className="timetable-grid">
            <div className="timetable-header-row">
              <div className="period-header">Period</div>
              <div className="time-header">Time</div>
              <div className="subject-header">Subject</div>
              <div className="teacher-header">Teacher</div>
              <div className="room-header">Room</div>
              <div className="duration-header">Duration</div>
              {isEditing && <div className="actions-header">Actions</div>}
            </div>

            {customTimetable.map((period, index) => (
              <div key={index} className="timetable-row">
                <div className="period-cell">
                  {isEditing ? (
                    <input
                      type="text"
                      value={`Period ${index + 1}`}
                      disabled
                      className="period-input"
                    />
                  ) : (
                    <span className="period-number">Period {index + 1}</span>
                  )}
                </div>

                <div className="time-cell">
                  {isEditing ? (
                    <input
                      type="text"
                      value={period.time}
                      onChange={(e) => handlePeriodEdit(index, 'time', e.target.value)}
                      className="time-input"
                    />
                  ) : (
                    <span className="time-display">{period.time || '—'}</span>
                  )}
                </div>

                <div className="subject-cell">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        list={`subject-options-${selectedGrade}`}
                        value={period.subject}
                        onChange={(e) => handlePeriodEdit(index, 'subject', e.target.value)}
                        className="subject-select"
                      />
                      <datalist id={`subject-options-${selectedGrade}`}>
                        {(SUBJECT_SUGGESTIONS[selectedGrade] || []).map(subject => (
                          <option key={subject} value={subject} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <span className="subject-display">{period.subject || '—'}</span>
                  )}
                </div>

                <div className="teacher-cell">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        list="timetable-teacher-options"
                        value={period.teacher}
                        onChange={(e) => handlePeriodEdit(index, 'teacher', e.target.value)}
                        className="teacher-input"
                        placeholder="Set teacher"
                      />
                      <datalist id="timetable-teacher-options">
                        {teacherOptions.map(name => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <span className="teacher-display">{period.teacher || '—'}</span>
                  )}
                </div>

                <div className="room-cell">
                  {isEditing ? (
                    <input
                      type="text"
                      value={period.room}
                      onChange={(e) => handlePeriodEdit(index, 'room', e.target.value)}
                      className="room-input"
                      placeholder="Set room"
                    />
                  ) : (
                    <span className="room-display">{period.room || '—'}</span>
                  )}
                </div>

                <div className="duration-cell">
                  {isEditing ? (
                    <input
                      type="number"
                      value={period.duration}
                      onChange={(e) => handlePeriodEdit(index, 'duration', parseInt(e.target.value))}
                      className="duration-input"
                      min="15"
                      max="90"
                      step="5"
                    />
                  ) : (
                    <span className="duration-display">{period.duration ? `${period.duration} min` : '—'}</span>
                  )}
                </div>

                {isEditing && (
                  <div className="actions-cell">
                    <button
                      className="btn-delete-period"
                      onClick={() => {
                        const updatedTimetable = customTimetable.filter((_, i) => i !== index)
                        setCustomTimetable(updatedTimetable)
                        const updatedFullTimetable = { ...timetableData }
                        updatedFullTimetable[activeDay] = updatedTimetable
                        setTimetableData(updatedFullTimetable)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🗓️</div>
              <h3>No periods for {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}</h3>
              <p>Edit the timetable and add periods, or pick another day.</p>
            </div>
          )}

          {isEditing && (
            <div className="add-period-section">
              <button
                className="btn-add-period"
                onClick={() => {
                  const newPeriod = {
                    time: '',
                    subject: '',
                    teacher: '',
                    room: '',
                    duration: 40
                  }
                  const updatedTimetable = [...customTimetable, newPeriod]
                  setCustomTimetable(updatedTimetable)
                  const updatedFullTimetable = { ...timetableData }
                  updatedFullTimetable[activeDay] = updatedTimetable
                  setTimetableData(updatedFullTimetable)
                }}
              >
                + Add Period
              </button>
            </div>
          )}
        </div>
      )}

      {!selectedGrade && (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>Select Grade Level to Begin</h3>
          <p>Choose a grade level to start from its starter period template</p>
        </div>
      )}

      {selectedGrade && !selectedSection && (
        <div className="empty-state">
          <div className="empty-icon">🏫</div>
          <h3>Enter a Section to Continue</h3>
          <p>Type the section name (for example A) to load or build its timetable</p>
        </div>
      )}
    </div>
  )
}

export default SmartTimetable
