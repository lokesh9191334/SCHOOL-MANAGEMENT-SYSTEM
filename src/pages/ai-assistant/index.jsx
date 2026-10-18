import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getAuthUser, roleLabel } from '../../utils/session'
import { getApiAuthHeaders } from '../../services/apiAuth'
import './styles.css'

const LANGUAGES = [
  { id: 'en', label: 'English', speech: 'en-IN' },
  { id: 'hi', label: 'हिंदी', speech: 'hi-IN' },
  { id: 'hinglish', label: 'Hinglish', speech: 'en-IN' },
]

const TEMPLATES = {
  admin: [
    { label: 'What needs my attention today?', group: 'Daily' },
    { label: 'Fee collection summary with follow-up list', group: 'Fees' },
    { label: 'Attendance exceptions and late arrivals', group: 'Attendance' },
    { label: 'Which students have the highest fee balance?', group: 'Fees' },
    { label: 'Summarize staff presence and face enrollment', group: 'Staff' },
    { label: 'Draft a parent notice for the coming holiday', group: 'Drafting' },
  ],
  super_admin: [
    { label: 'Platform snapshot — accounts and requests', group: 'Platform' },
    { label: 'Security summary of recent logins', group: 'Security' },
    { label: 'Summarize pending school sign-up requests', group: 'Platform' },
  ],
  teacher: [
    { label: 'What needs my attention today?', group: 'Daily' },
    { label: 'Attendance snapshot for my class', group: 'Attendance' },
    { label: 'Draft a message to a parent about repeated absence', group: 'Drafting' },
    { label: 'How do I record marks step by step?', group: 'Guides' },
    { label: "Plan today's class in five clear steps", group: 'Planning' },
  ],
  parent: [
    { label: 'What fees are pending for my child?', group: 'Fees' },
    { label: "Explain my child's attendance record", group: 'Attendance' },
    { label: 'Any recent school notices?', group: 'School' },
    { label: 'Draft a leave request for my child', group: 'Drafting' },
  ],
}

function quickActionsFor(prompt, role) {
  const text = String(prompt || '').toLowerCase()
  const has = (...words) => words.some((word) => text.includes(word))
  const actions = []
  if (has('fee', 'payment', 'balance', 'due')) {
    actions.push(role === 'parent' ? { label: 'Pending fees', to: '/parent/fees/pending' } : { label: 'Pending fees', to: '/fees/pending' })
  }
  if (has('attendance', 'present', 'absent', 'late')) {
    actions.push(role === 'parent' ? { label: 'Attendance', to: '/parent/attendance' } : { label: 'Attendance', to: '/students/attendance' })
  }
  if (has('student', 'admission', 'class')) {
    actions.push(role === 'parent' ? null : { label: 'Student list', to: '/students/list' })
  }
  if (has('security', 'login', 'otp', 'device')) {
    actions.push(role === 'parent' ? null : { label: 'Login tracks', to: '/security/login-tracks' })
  }
  if (has('notice', 'event', 'holiday')) {
    actions.push(role === 'parent' ? { label: 'Notices', to: '/parent/notices' } : null)
  }
  if (has('request', 'school request', 'sign-up', 'signup')) {
    actions.push(role === 'super_admin' ? { label: 'School requests', to: '/super-admin/school-requests' } : null)
  }
  return actions.filter(Boolean).slice(0, 3)
}

function chatsStorageKey(user) {
  return `sms_ai_chats__${String(user?.id || user?.email || 'guest').replace(/\s+/g, '')}`
}

function loadChats(user) {
  try {
    const raw = localStorage.getItem(chatsStorageKey(user))
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((chat) => chat && Array.isArray(chat.messages)) : []
  } catch {
    return []
  }
}

const AIAssistantPage = () => {
  const user = getAuthUser()
  const role = String(user?.role || 'admin').toLowerCase()
  const templates = useMemo(() => TEMPLATES[role] || TEMPLATES.admin, [role])

  const [chats, setChats] = useState(() => loadChats(user))
  const [activeId, setActiveId] = useState(() => loadChats(user)[0]?.id || null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [status, setStatus] = useState(null)
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('sms_ai_language') || 'en'
    } catch {
      return 'en'
    }
  })
  const [listening, setListening] = useState(false)
  const [speakingId, setSpeakingId] = useState(null)
  const [toast, setToast] = useState('')

  const messagesRef = useRef(null)
  const recognitionRef = useRef(null)
  const micSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeId) || null, [chats, activeId])
  const messages = useMemo(() => activeChat?.messages || [], [activeChat])
  const lastUserPrompt = useMemo(() => [...messages].reverse().find((message) => message.from === 'user')?.text || '', [messages])
  const quickActions = useMemo(() => (streaming ? [] : quickActionsFor(lastUserPrompt, role)), [lastUserPrompt, role, streaming])

  useEffect(() => {
    fetch('/api/ai/status', { headers: getApiAuthHeaders() })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setStatus(body))
      .catch(() => setStatus(null))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(chatsStorageKey(user), JSON.stringify(chats))
    } catch {
      /* storage full or blocked */
    }
  }, [chats, user])

  useEffect(() => {
    try {
      localStorage.setItem('sms_ai_language', language)
    } catch {
      /* ignore */
    }
  }, [language])

  useEffect(() => {
    const element = messagesRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, streaming])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const applyEvent = (chatId, event) => {
    setChats((current) => current.map((chat) => {
      if (chat.id !== chatId) return chat
      const updated = [...chat.messages]
      for (let i = updated.length - 1; i >= 0; i -= 1) {
        if (updated[i].from === 'assistant') {
          const message = { ...updated[i] }
          if (event.type === 'meta') {
            message.offline = Boolean(event.offline)
            message.model = event.model
          } else if (event.type === 'delta') {
            message.text = `${message.text}${event.text}`
          } else if (event.type === 'error') {
            message.text = `${message.text}\n\n_${event.error}_`
          } else if (event.type === 'done') {
            message.text = event.reply || message.text
            if (event.offline !== undefined) message.offline = Boolean(event.offline)
            if (event.model) message.model = event.model
          }
          updated[i] = message
          break
        }
      }
      return { ...chat, updatedAt: new Date().toISOString(), messages: updated }
    }))
  }

  const send = async (value) => {
    const prompt = String(value ?? input).trim()
    if (!prompt || streaming) return
    setInput('')
    const chatId = activeId || `chat-${Date.now()}`
    const now = new Date().toISOString()
    const history = (activeChat?.messages || []).filter((message) => message.text).slice(-16)
    setChats((current) => {
      const exists = current.some((chat) => chat.id === chatId)
      const base = exists ? current : [
        { id: chatId, title: prompt.slice(0, 48), createdAt: now, updatedAt: now, messages: [] },
        ...current,
      ]
      return base.map((chat) => (
        chat.id === chatId
          ? { ...chat, updatedAt: now, messages: [...chat.messages, { from: 'user', text: prompt }, { from: 'assistant', text: '' }] }
          : chat
      ))
    })
    if (!activeId) setActiveId(chatId)
    setStreaming(true)

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ prompt, role, history, language }),
      })
      if (!response.ok || !response.body) throw new Error('stream unavailable')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          try {
            applyEvent(chatId, JSON.parse(trimmed.slice(5).trim()))
          } catch {
            /* partial event line */
          }
        }
      }
    } catch {
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ prompt, role, history, language }),
        })
        const body = await response.json().catch(() => null)
        if (!response.ok || !body?.reply) throw new Error(body?.error || 'AI service unavailable')
        applyEvent(chatId, { type: 'done', reply: body.reply, offline: body.offline, model: body.model })
      } catch (error) {
        applyEvent(chatId, { type: 'done', reply: `Sorry — the assistant could not be reached (${error.message}). Please try again in a moment.` })
      }
    } finally {
      setStreaming(false)
    }
  }

  const newChat = () => {
    setActiveId(null)
    setInput('')
  }

  const deleteChat = (id) => {
    setChats((current) => current.filter((chat) => chat.id !== id))
    if (id === activeId) setActiveId(null)
  }

  const copyMessage = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text)
      setToast('Copied to clipboard')
    } catch {
      setToast('Copy is blocked by the browser')
    }
  }

  const speakMessage = (message, index) => {
    if (!('speechSynthesis' in window)) {
      setToast('Read aloud is not supported in this browser')
      return
    }
    if (speakingId === index) {
      window.speechSynthesis.cancel()
      setSpeakingId(null)
      return
    }
    window.speechSynthesis.cancel()
    const speech = LANGUAGES.find((item) => item.id === language)?.speech || 'en-IN'
    const utterance = new SpeechSynthesisUtterance(message.text.replace(/[#*_`|>[\]()]/g, ' ').replace(/\s+/g, ' '))
    utterance.lang = speech
    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)
    window.speechSynthesis.speak(utterance)
    setSpeakingId(index)
  }

  const toggleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setToast('Voice input is not supported in this browser')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = LANGUAGES.find((item) => item.id === language)?.speech || 'en-IN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join('')
      setInput(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const statusLabel = status === null
    ? 'Checking…'
    : status.configured
      ? `AI online · ${status.model}`
      : 'Live data engine'

  return (
    <section className="ai-page">
      <div className="ai-hero">
        <div>
          <p className="ai-kicker">SchoolSMS Intelligence</p>
          <h2>AI Assistant</h2>
          <p className="ai-intro">Answers built on your live school data — fees, attendance, students, staff and security. Ask anything, or start from a template.</p>
        </div>
        <div className="ai-hero__side">
          <div className={`ai-status ${status && status.configured ? 'ai-status--on' : 'ai-status--off'}`}>
            <span />{statusLabel}
          </div>
          <div className="ai-langs" role="group" aria-label="Reply language">
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={language === item.id ? 'active' : ''}
                onClick={() => setLanguage(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ai-layout">
        <aside className="ai-side">
          <div className="ai-side__head">
            <p className="ai-panel-label">Conversations</p>
            <button type="button" className="ai-new-chat" onClick={newChat}>+ New</button>
          </div>
          <div className="ai-chats">
            {chats.length === 0 ? <p className="ai-chats__empty">Your chats will appear here and stay saved on this device.</p> : null}
            {chats.map((chat) => (
              <div key={chat.id} className={`ai-chat-item ${chat.id === activeId ? 'active' : ''}`}>
                <button type="button" className="ai-chat-item__open" onClick={() => setActiveId(chat.id)}>
                  <strong>{chat.title || 'New chat'}</strong>
                  <span>{new Date(chat.updatedAt || chat.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </button>
                <button type="button" className="ai-chat-item__delete" aria-label="Delete chat" onClick={() => deleteChat(chat.id)}>×</button>
              </div>
            ))}
          </div>

          <p className="ai-panel-label ai-panel-label--gap">Templates</p>
          {templates.map((template) => (
            <button type="button" className="ai-prompt" key={template.label} onClick={() => send(template.label)}>
              <span>{template.group}</span>{template.label}
            </button>
          ))}
          <div className="ai-note">
            <strong>Grounded in real data</strong>
            <span>Every number comes from your live records — nothing is invented.</span>
          </div>
        </aside>

        <div className="ai-chat">
          <div className="ai-chat-head">
            <div className="ai-orb">✦</div>
            <div><strong>SchoolSMS Assistant</strong><span>{status && status.configured ? 'Connected to your school data' : 'Offline mode — answered from live school data'}</span></div>
            {activeChat ? <button type="button" className="ai-clear" onClick={newChat}>New chat</button> : null}
          </div>

          <div className="ai-messages" ref={messagesRef} aria-live="polite">
            {messages.length === 0 ? (
              <div className="ai-welcome">
                <div className="ai-welcome__orb">✦</div>
                <h3>Hello {user?.name || 'there'}</h3>
                <p>I am your SchoolSMS assistant for {roleLabel(role).toLowerCase()} work — fees, attendance, students, staff, notices and security, all from live data.</p>
                <div className="ai-welcome__chips">
                  {templates.slice(0, 3).map((template) => (
                    <button type="button" key={template.label} onClick={() => send(template.label)}>{template.label}</button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((message, index) => (
              <div className={`ai-message ai-message--${message.from}`} key={`${activeId}-${index}`}>
                {message.from === 'assistant' ? (
                  <>
                    <div className="ai-md">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text || '…'}</ReactMarkdown>
                    </div>
                    {streaming && index === messages.length - 1 ? <span className="ai-cursor" aria-hidden /> : null}
                    {message.text && !streaming ? (
                      <div className="ai-msg-actions">
                        <span className="ai-msg-engine">{message.offline ? 'Live data engine' : message.model || ''}</span>
                        <button type="button" onClick={() => copyMessage(message)}>Copy</button>
                        <button type="button" onClick={() => speakMessage(message, index)}>{speakingId === index ? 'Stop' : 'Listen'}</button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  message.text
                )}
              </div>
            ))}
          </div>

          {quickActions.length > 0 ? (
            <div className="ai-quick">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to}>{action.label} →</Link>
              ))}
            </div>
          ) : null}

          <form className="ai-composer" onSubmit={(event) => { event.preventDefault(); send() }}>
            {micSupported ? (
              <button type="button" className={`ai-mic ${listening ? 'listening' : ''}`} onClick={toggleMic} aria-label="Voice input" title="Speak your question">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                  <path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" />
                  <path fill="currentColor" d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
                </svg>
              </button>
            ) : null}
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              placeholder={listening ? 'Listening… speak now' : 'Ask about fees, attendance, students…'}
              aria-label="Ask the AI assistant"
              rows={1}
            />
            <button type="submit" disabled={streaming || !input.trim()} aria-label="Send message">
              {streaming ? '…' : 'Send'}
            </button>
          </form>
          <p className="ai-disclaimer">Review suggestions before taking action. Student and payment changes still require your confirmation.</p>
        </div>
      </div>

      {toast ? <div className="ai-toast">{toast}</div> : null}
      <Link className="ai-back" to={role === 'super_admin' ? '/super-admin' : role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/dashboard'}>Back to your workspace</Link>
    </section>
  )
}

export default AIAssistantPage
