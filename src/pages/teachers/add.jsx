import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { buildTeacherRecord } from '../../utils/recordBuilders'
import { SEED_TEACHERS } from '../../data/seed'
import { createInviteKey } from '../../services/inviteKeys'

const AddTeacherPage = () => {
  const navigate = useNavigate()
  const [, setTeachers] = usePersistentState(STORAGE_KEYS.teachers, SEED_TEACHERS)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    status: 'Active',
  })
  const [issuedKey, setIssuedKey] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const record = buildTeacherRecord(form, Date.now() % 1000)
      const invite = await createInviteKey({
        role: 'teacher',
        name: form.name,
        email: form.email,
        phone: form.phone,
        linkedId: record.id,
        meta: { subject: form.subject, source: 'teachers-add-page' },
      })
      setTeachers((prev) => [...prev, { ...record, inviteKey: invite.key, email: form.email, phone: form.phone, subject: form.subject }])
      setIssuedKey(invite.key)
    } catch (err) {
      setError(err.message || 'Could not save teacher / special key. Is the API server running?')
    } finally {
      setSaving(false)
    }
  }

  if (issuedKey) {
    return (
      <div className="sms-page-stack">
        <div className="page-card">
          <p className="admin-kicker">HR</p>
          <h2>Teacher saved · special key ready</h2>
          <p>Share this key with {form.name}. They will use it on Create Account → Teacher.</p>
          <code style={{ display: 'inline-block', marginTop: 12, padding: '12px 16px', borderRadius: 12, background: '#10182f', color: '#fff', letterSpacing: '0.1em', fontWeight: 800 }}>
            {issuedKey}
          </code>
          <div className="link-row" style={{ marginTop: 18 }}>
            <button type="button" className="header-action primary" onClick={() => navigator.clipboard?.writeText(issuedKey)}>
              Copy key
            </button>
            <Link className="link-pill" to="/teachers">
              Back to staff
            </Link>
            <button type="button" className="link-pill" onClick={() => navigate('/teachers/add')}>
              Add another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">HR</p>
        <h2>Add teacher</h2>
        <p>Saving a teacher auto-generates a special account key for their website signup.</p>
        <div className="link-row">
          <Link className="link-pill" to="/teachers">
            Back to staff
          </Link>
        </div>
      </div>

      <article className="panel-card data-panel">
        <form className="module-form" onSubmit={handleSubmit}>
          <div className="module-form-grid">
            <label className="form-field">
              <span>Full name</span>
              <input required value={form.name} onChange={update('name')} placeholder="e.g. Priya Nair" />
            </label>
            <label className="form-field">
              <span>Email</span>
              <input type="email" required value={form.email} onChange={update('email')} placeholder="name@school.edu" />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input value={form.phone} onChange={update('phone')} placeholder="+91 …" />
            </label>
            <label className="form-field">
              <span>Primary subject</span>
              <input required value={form.subject} onChange={update('subject')} placeholder="e.g. Chemistry" />
            </label>
            <label className="form-field">
              <span>Status</span>
              <select value={form.status} onChange={update('status')}>
                <option>Active</option>
                <option>On leave</option>
              </select>
            </label>
          </div>
          {error ? <p style={{ color: '#c23b3b', fontWeight: 700 }}>{error}</p> : null}
          <div className="form-actions">
            <button type="submit" className="header-action primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save teacher & issue key'}
            </button>
          </div>
        </form>
      </article>
    </div>
  )
}

export default AddTeacherPage
