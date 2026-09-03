import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthUser, roleLabel } from '../../utils/session'
import './styles.css'

const rolePrompts = {
  super_admin: ['Which schools need attention?', 'Summarize support tickets', 'Show subscription risks'],
  admin: ['What needs my attention today?', 'Draft a parent notice', 'How can I improve attendance?'],
  teacher: ['Help me plan today\'s class', 'Draft a parent message', 'How do I record marks?'],
  parent: ['Explain my child\'s attendance', 'What fees are pending?', 'Draft a leave request'],
}

function getReply(prompt, role) {
  const text = prompt.toLowerCase()
  if (text.includes('notice') || text.includes('message')) {
    return 'I can help draft it. Start with the audience, the key update, and the date or action required. You can then review and send it from the Notices or Parent Communication module.'
  }
  if (text.includes('attendance')) {
    return role === 'parent'
      ? 'Open Attendance from the My Child section to review daily and monthly patterns. For an absence, contact the class teacher from Parent Communication.'
      : 'Open the Attendance workspace to review exceptions first. Focus on repeated absences, late arrivals, and classes below your attendance target.'
  }
  if (text.includes('fee')) {
    return role === 'parent'
      ? 'Open Pending Fees to see outstanding installments, fines, and available online payment options.'
      : 'Open Fees and start with Pending Fees. You can then review receipts, discounts, and payment follow-ups.'
  }
  if (text.includes('class') || text.includes('marks')) {
    return 'Use your classroom workspace to open the timetable, assignments, or marks entry. Keep one clear learning objective and one follow-up action for each class.'
  }
  if (text.includes('school') || text.includes('subscription') || text.includes('ticket')) {
    return 'Use the matching Platform workspace from the sidebar. I recommend checking items marked urgent first, then recording the next owner and due date.'
  }
  return `I am ready to help with ${roleLabel(role).toLowerCase()} work. Ask about attendance, fees, notices, students, classes, reports, or the next step in any module.`
}

const AIAssistantPage = () => {
  const user = getAuthUser()
  const role = String(user?.role || 'admin').toLowerCase()
  const prompts = useMemo(() => rolePrompts[role] || rolePrompts.admin, [role])
  const [messages, setMessages] = useState([
    {
      from: 'assistant',
      text: `Hello ${user?.name || 'there'}. I am your SchoolSMS assistant for ${roleLabel(role).toLowerCase()} tasks. What would you like to work on?`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async (value = input) => {
    const prompt = String(value).trim()
    if (!prompt || loading) return
    const userMessage = { from: 'user', text: prompt }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setLoading(true)
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, role, history: messages }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'AI service unavailable')
      setMessages((current) => [...current, { from: 'assistant', text: body.reply }])
    } catch {
      setMessages((current) => [...current, { from: 'assistant', text: getReply(prompt, role) }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="ai-page">
      <div className="ai-hero">
        <div>
          <p className="ai-kicker">SchoolSMS Intelligence</p>
          <h2>AI Assistant</h2>
          <p className="ai-intro">A focused workspace for planning, finding the right module, and turning school operations into the next clear action.</p>
        </div>
        <div className="ai-status"><span /> Ready for {roleLabel(role)}</div>
      </div>

      <div className="ai-layout">
        <aside className="ai-prompt-panel">
          <p className="ai-panel-label">Suggested for you</p>
          {prompts.map((prompt) => (
            <button type="button" className="ai-prompt" key={prompt} onClick={() => sendMessage(prompt)}>
              <span>+</span>{prompt}
            </button>
          ))}
          <div className="ai-note">
            <strong>Works across your workspace</strong>
            <span>Ask for help with any feature visible in your role sidebar.</span>
          </div>
        </aside>

        <div className="ai-chat">
          <div className="ai-chat-head">
            <div className="ai-orb">✦</div>
            <div><strong>SchoolSMS Assistant</strong><span>Context-aware guidance</span></div>
            <button type="button" className="ai-clear" onClick={() => setMessages([])}>Clear</button>
          </div>
          <div className="ai-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div className={`ai-message ai-message--${message.from}`} key={`${message.from}-${index}`}>
                {message.text}
              </div>
            ))}
            {loading ? <div className="ai-message ai-message--assistant">Thinking...</div> : null}
          </div>
          <form className="ai-composer" onSubmit={(event) => { event.preventDefault(); sendMessage() }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about a school task..." aria-label="Ask the AI assistant" />
            <button type="submit" aria-label="Send message">Send</button>
          </form>
          <p className="ai-disclaimer">Review suggestions before taking action. Student and payment changes still require your confirmation.</p>
        </div>
      </div>

      <Link className="ai-back" to={role === 'super_admin' ? '/super-admin' : role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/dashboard'}>Back to your workspace</Link>
    </section>
  )
}

export default AIAssistantPage
