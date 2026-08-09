import { useState, useEffect } from 'react'
import './SmartTimetable.css'

const SmartTimetable = () => {
  const [selectedGrade, setSelectedGrade] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [timetableData, setTimetableData] = useState({})
  const [customTimetable, setCustomTimetable] = useState([])
  const [isEditing, setIsEditing] = useState(false)
  const [activeDay, setActiveDay] = useState('monday')

  const gradePresets = {
    'pre-primary': {
      sections: ['A', 'B', 'C'],
      periods: [
        { time: '9:00-9:30', subject: 'Morning Assembly', duration: 30 },
        { time: '9:30-10:00', subject: 'Rhymes & Songs', duration: 30 },
        { time: '10:00-10:30', subject: 'Story Time', duration: 30 },
        { time: '10:30-11:00', subject: 'Snack Break', duration: 30 },
        { time: '11:00-11:30', subject: 'Art & Craft', duration: 30 },
        { time: '11:30-12:00', subject: 'Play Time', duration: 30 },
        { time: '12:00-12:30', subject: 'Nap Time', duration: 30 },
        { time: '12:30-1:00', subject: 'Lunch', duration: 30 },
      ]
    },
    'primary': {
      sections: ['A', 'B', 'C', 'D'],
      periods: [
        { time: '8:00-8:40', subject: 'English', duration: 40 },
        { time: '8:40-9:20', subject: 'Mathematics', duration: 40 },
        { time: '9:20-10:00', subject: 'Science', duration: 40 },
        { time: '10:00-10:20', subject: 'Short Break', duration: 20 },
        { time: '10:20-11:00', subject: 'Social Studies', duration: 40 },
        { time: '11:00-11:40', subject: 'Computer', duration: 40 },
        { time: '11:40-12:20', subject: 'Physical Education', duration: 40 },
        { time: '12:20-1:00', subject: 'Lunch', duration: 40 },
        { time: '1:00-1:40', subject: 'Art & Music', duration: 40 },
      ]
    },
    'middle': {
      sections: ['A', 'B', 'C', 'D', 'E'],
      periods: [
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
      ]
    },
    'secondary': {
      sections: ['A', 'B', 'C', 'D', 'E', 'F'],
      periods: [
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
      ]
    },
    'senior': {
      sections: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      periods: [
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
      ]
    }
  }

  const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  const subjects = {
    'pre-primary': ['Morning Assembly', 'Rhymes & Songs', 'Story Time', 'Art & Craft', 'Play Time', 'Nap Time', 'Snack Break', 'Lunch'],
    'primary': ['English', 'Mathematics', 'Science', 'Social Studies', 'Computer', 'Physical Education', 'Art & Music', 'Short Break', 'Lunch'],
    'middle': ['English', 'Mathematics', 'Science', 'Social Studies', 'Computer Science', 'Second Language', 'Physical Education', 'Art/Music', 'Short Break', 'Lunch'],
    'secondary': ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'History', 'Geography', 'Physical Education', 'Economics/Commerce', 'Short Break', 'Lunch'],
    'senior': ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology/Computer Science', 'History/Political Science', 'Geography/Economics', 'Physical Education', 'Optional Subject', 'Library/Study Period', 'Short Break', 'Lunch']
  }

  useEffect(() => {
    if (selectedGrade && selectedSection) {
      generateTimetable()
    }
  }, [selectedGrade, selectedSection])

  const generateTimetable = () => {
    const preset = gradePresets[selectedGrade]
    const newTimetable = {}
    
    weekDays.forEach(day => {
      newTimetable[day] = preset.periods.map(period => ({
        ...period,
        teacher: assignTeacher(period.subject, selectedGrade),
        room: assignRoom(period.subject, selectedGrade)
      }))
    })
    
    setTimetableData(newTimetable)
    setCustomTimetable(newTimetable[activeDay] || [])
  }

  const assignTeacher = (subject, grade) => {
    const teachers = {
      'English': ['Ms. Johnson', 'Mr. Smith', 'Ms. Davis'],
      'Mathematics': ['Mr. Brown', 'Ms. Wilson', 'Mr. Taylor'],
      'Science': ['Ms. Anderson', 'Mr. Thomas', 'Ms. Martinez'],
      'Physics': ['Mr. Garcia', 'Ms. Rodriguez', 'Mr. Lee'],
      'Chemistry': ['Ms. White', 'Mr. Harris', 'Ms. Clark'],
      'Biology': ['Mr. Lewis', 'Ms. Walker', 'Mr. Hall'],
      'Social Studies': ['Ms. Young', 'Mr. King', 'Ms. Wright'],
      'History': ['Mr. Scott', 'Ms. Green', 'Mr. Baker'],
      'Geography': ['Ms. Adams', 'Mr. Nelson', 'Ms. Carter'],
      'Computer Science': ['Mr. Mitchell', 'Ms. Perez', 'Mr. Roberts'],
      'Second Language': ['Ms. Turner', 'Mr. Phillips', 'Ms. Campbell'],
      'Physical Education': ['Mr. Evans', 'Ms. Collins', 'Mr. Edwards'],
      'Art & Music': ['Ms. Stewart', 'Mr. Sanchez', 'Ms. Morris'],
      'Art/Music': ['Ms. Rogers', 'Mr. Reed', 'Ms. Cook'],
      'Optional Subject': ['Mr. Morgan', 'Ms. Bailey', 'Mr. Cooper'],
      'Library/Study Period': ['Ms. Bell', 'Mr. Murphy', 'Ms. Rivera'],
      'Morning Assembly': ['All Teachers'],
      'Rhymes & Songs': ['Ms. Fisher', 'Ms. Peterson'],
      'Story Time': ['Ms. Gray', 'Ms. Ramirez'],
      'Art & Craft': ['Ms. James', 'Ms. Reyes'],
      'Play Time': ['Ms. Cruz', 'Ms. Hughes'],
      'Nap Time': ['Ms. Ward', 'Ms. Torres'],
      'Snack Break': ['Class Teacher'],
      'Lunch': ['All Teachers'],
      'Short Break': ['All Teachers']
    }
    
    const subjectTeachers = teachers[subject] || ['TBA']
    return subjectTeachers[Math.floor(Math.random() * subjectTeachers.length)]
  }

  const assignRoom = (subject, grade) => {
    const rooms = {
      'English': ['Room 101', 'Room 102', 'Room 103'],
      'Mathematics': ['Room 201', 'Room 202', 'Room 203'],
      'Science': ['Lab 301', 'Lab 302'],
      'Physics': ['Physics Lab 401', 'Physics Lab 402'],
      'Chemistry': ['Chemistry Lab 501', 'Chemistry Lab 502'],
      'Biology': ['Biology Lab 601', 'Biology Lab 602'],
      'Social Studies': ['Room 104', 'Room 105'],
      'History': ['Room 106', 'Room 107'],
      'Geography': ['Room 108', 'Room 109'],
      'Computer Science': ['Computer Lab 701', 'Computer Lab 702'],
      'Second Language': ['Room 110', 'Room 111'],
      'Physical Education': ['Playground', 'Sports Hall'],
      'Art & Music': ['Art Room 801', 'Music Room 802'],
      'Art/Music': ['Art Room 801', 'Music Room 802'],
      'Optional Subject': ['Room 112', 'Room 113'],
      'Library/Study Period': ['Library', 'Study Hall'],
      'Morning Assembly': ['Assembly Hall'],
      'Rhymes & Songs': ['Activity Room 901'],
      'Story Time': ['Activity Room 902'],
      'Art & Craft': ['Art Room 903'],
      'Play Time': ['Playground'],
      'Nap Time': ['Nap Room 904'],
      'Snack Break': ['Cafeteria'],
      'Lunch': ['Cafeteria'],
      'Short Break': ['Playground']
    }
    
    const subjectRooms = rooms[subject] || ['TBA']
    return subjectRooms[Math.floor(Math.random() * subjectRooms.length)]
  }

  const handleGradeChange = (grade) => {
    setSelectedGrade(grade)
    setSelectedSection('')
    setTimetableData({})
    setCustomTimetable([])
  }

  const handleSectionChange = (section) => {
    setSelectedSection(section)
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

  const saveTimetable = () => {
    // Save to localStorage or API
    localStorage.setItem('timetable', JSON.stringify({
      grade: selectedGrade,
      section: selectedSection,
      data: timetableData
    }))
    setIsEditing(false)
    alert('Timetable saved successfully!')
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
        <h2>Smart Timetable Presets</h2>
        <p>Pre-configured timetable structures for different grade levels (pre-primary to 12th grade)</p>
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
            <label>Select Section:</label>
            <select value={selectedSection} onChange={(e) => handleSectionChange(e.target.value)}>
              <option value="">Choose Section</option>
              {gradePresets[selectedGrade].sections.map(section => (
                <option key={section} value={section}>Section {section}</option>
              ))}
            </select>
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
            {isEditing ? 'Save Changes' : 'Edit Timetable'}
          </button>
          <button className="btn-export" onClick={exportTimetable}>
            Export Timetable
          </button>
          <button className="btn-save" onClick={saveTimetable}>
            Save to System
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
          </div>

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
                    <span className="time-display">{period.time}</span>
                  )}
                </div>

                <div className="subject-cell">
                  {isEditing ? (
                    <select
                      value={period.subject}
                      onChange={(e) => handlePeriodEdit(index, 'subject', e.target.value)}
                      className="subject-select"
                    >
                      {subjects[selectedGrade].map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="subject-display">{period.subject}</span>
                  )}
                </div>

                <div className="teacher-cell">
                  {isEditing ? (
                    <input
                      type="text"
                      value={period.teacher}
                      onChange={(e) => handlePeriodEdit(index, 'teacher', e.target.value)}
                      className="teacher-input"
                    />
                  ) : (
                    <span className="teacher-display">{period.teacher}</span>
                  )}
                </div>

                <div className="room-cell">
                  {isEditing ? (
                    <input
                      type="text"
                      value={period.room}
                      onChange={(e) => handlePeriodEdit(index, 'room', e.target.value)}
                      className="room-input"
                    />
                  ) : (
                    <span className="room-display">{period.room}</span>
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
                    <span className="duration-display">{period.duration} min</span>
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

          {isEditing && (
            <div className="add-period-section">
              <button 
                className="btn-add-period"
                onClick={() => {
                  const newPeriod = {
                    time: 'New Time',
                    subject: subjects[selectedGrade][0],
                    teacher: 'TBA',
                    room: 'TBA',
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
          <p>Choose a grade level to generate a smart timetable preset</p>
        </div>
      )}

      {selectedGrade && !selectedSection && (
        <div className="empty-state">
          <div className="empty-icon">🏫</div>
          <h3>Select Section to Continue</h3>
          <p>Choose a section to generate the timetable</p>
        </div>
      )}
    </div>
  )
}

export default SmartTimetable
