import { useState, useEffect } from 'react'
import './ParentPortal.css'

const ParentPortal = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Parent-Teacher Meeting', date: '2024-05-15', type: 'meeting', read: false },
    { id: 2, title: 'Fee Payment Reminder', date: '2024-05-10', type: 'payment', read: false },
    { id: 3, title: 'School Annual Function', date: '2024-05-20', type: 'event', read: true },
  ])
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Ms. Johnson', subject: 'Math Progress', message: 'Your child is doing great in mathematics!', date: '2024-05-12', unread: true },
    { id: 2, sender: 'Mr. Smith', subject: 'Science Project', message: 'Please review the science project guidelines.', date: '2024-05-10', unread: false },
  ])
  const [documents, setDocuments] = useState([
    { id: 1, name: 'Annual Report 2023-24', type: 'report', date: '2024-04-15', size: '2.4 MB' },
    { id: 2, name: 'Fee Structure', type: 'document', date: '2024-03-20', size: '1.1 MB' },
    { id: 3, name: 'School Calendar', type: 'calendar', date: '2024-05-01', size: '856 KB' },
  ])

  const performanceData = {
    attendance: { present: 85, absent: 10, leave: 5 },
    grades: { math: 92, science: 88, english: 95, history: 87, geography: 90 },
    activities: ['Sports', 'Music', 'Art Club', 'Science Club'],
    behavior: 'Excellent'
  }

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ))
  }

  const markMessageAsRead = (id) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, unread: false } : msg
    ))
  }

  return (
    <div className="parent-portal">
      <div className="portal-header">
        <div className="portal-brand">
          <div className="school-logo">
            <div className="logo-placeholder">SMS</div>
          </div>
          <div className="school-info">
            <h2>Springfield High School</h2>
            <p>Parent Portal</p>
          </div>
        </div>
        <div className="portal-user">
          <div className="user-info">
            <span className="user-name">John Doe</span>
            <span className="user-role">Parent</span>
          </div>
          <div className="user-avatar">JD</div>
        </div>
      </div>

      <div className="portal-tabs">
        {['dashboard', 'notifications', 'messages', 'documents'].map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="portal-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            <div className="performance-overview">
              <h3>Child Performance Dashboard</h3>
              
              <div className="student-info-card">
                <div className="student-avatar">AS</div>
                <div className="student-details">
                  <h4>Alice Smith</h4>
                  <p>Grade 10 - Section A</p>
                  <p>Roll No: 1024</p>
                </div>
                <div className="student-status">
                  <span className="status-badge active">Active</span>
                </div>
              </div>

              <div className="performance-grid">
                <div className="performance-card">
                  <h4>Attendance</h4>
                  <div className="attendance-chart">
                    <div className="attendance-item">
                      <span>Present</span>
                      <div className="progress-bar">
                        <div className="progress-fill present" style={{ width: `${performanceData.attendance.present}%` }}></div>
                      </div>
                      <span>{performanceData.attendance.present}%</span>
                    </div>
                    <div className="attendance-item">
                      <span>Absent</span>
                      <div className="progress-bar">
                        <div className="progress-fill absent" style={{ width: `${performanceData.attendance.absent}%` }}></div>
                      </div>
                      <span>{performanceData.attendance.absent}%</span>
                    </div>
                    <div className="attendance-item">
                      <span>Leave</span>
                      <div className="progress-bar">
                        <div className="progress-fill leave" style={{ width: `${performanceData.attendance.leave}%` }}></div>
                      </div>
                      <span>{performanceData.attendance.leave}%</span>
                    </div>
                  </div>
                </div>

                <div className="performance-card">
                  <h4>Academic Performance</h4>
                  <div className="grades-grid">
                    {Object.entries(performanceData.grades).map(([subject, grade]) => (
                      <div key={subject} className="grade-item">
                        <span className="subject-name">{subject.charAt(0).toUpperCase() + subject.slice(1)}</span>
                        <div className="grade-circle">
                          <span className="grade-score">{grade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="performance-card">
                  <h4>Extracurricular Activities</h4>
                  <div className="activities-list">
                    {performanceData.activities.map((activity, index) => (
                      <div key={index} className="activity-tag">
                        {activity}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="performance-card">
                  <h4>Behavior Assessment</h4>
                  <div className="behavior-rating">
                    <div className="rating-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={`star ${star <= 4 ? 'filled' : ''}`}>★</span>
                      ))}
                    </div>
                    <span className="behavior-text">{performanceData.behavior}</span>
                  </div>
                </div>
              </div>

              <div className="recent-activities">
                <h4>Recent Activities</h4>
                <div className="activity-timeline">
                  <div className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <p className="activity-title">Submitted Science Project</p>
                      <p className="activity-date">May 12, 2024</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <p className="activity-title">Participated in Sports Meet</p>
                      <p className="activity-date">May 8, 2024</p>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <p className="activity-title">Received Excellence Award</p>
                      <p className="activity-date">May 1, 2024</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="notifications-content">
            <h3>Notifications & Announcements</h3>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-icon">
                    {notification.type === 'meeting' && '📅'}
                    {notification.type === 'payment' && '💳'}
                    {notification.type === 'event' && '🎉'}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p className="notification-date">{notification.date}</p>
                  </div>
                  <div className="notification-status">
                    {!notification.read && <span className="unread-badge">New</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="messages-content">
            <h3>Messaging & Communication</h3>
            <div className="messages-list">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-item ${message.unread ? 'unread' : ''}`}
                  onClick={() => markMessageAsRead(message.id)}
                >
                  <div className="message-avatar">
                    {message.sender.charAt(0)}
                  </div>
                  <div className="message-content">
                    <h4>{message.sender}</h4>
                    <p className="message-subject">{message.subject}</p>
                    <p className="message-preview">{message.message}</p>
                    <p className="message-date">{message.date}</p>
                  </div>
                  <div className="message-status">
                    {message.unread && <span className="unread-indicator">●</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="documents-content">
            <h3>Document Access & Downloads</h3>
            <div className="documents-grid">
              {documents.map((document) => (
                <div key={document.id} className="document-card">
                  <div className="document-icon">
                    {document.type === 'report' && '📊'}
                    {document.type === 'document' && '📄'}
                    {document.type === 'calendar' && '📅'}
                  </div>
                  <div className="document-info">
                    <h4>{document.name}</h4>
                    <p className="document-meta">{document.date} • {document.size}</p>
                  </div>
                  <button className="download-button">Download</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ParentPortal
