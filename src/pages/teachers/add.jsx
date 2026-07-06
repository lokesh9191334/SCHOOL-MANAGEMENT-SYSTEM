import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { buildTeacherRecord } from '../../utils/recordBuilders'
import { SEED_TEACHERS } from '../../data/seed'

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

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setTeachers((prev) => [...prev, buildTeacherRecord(form, prev.length)])
    navigate('/teachers')
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">HR</p>
        <h2>Add teacher</h2>
        <p>Lightweight capture for the demo registry. Extend fields to match your HR policy.</p>
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
          <div className="form-actions">
            <button type="submit" className="header-action primary">
              Save teacher
            </button>
          </div>
        </form>
      </article>
    </div>
  )
}

export default AddTeacherPage
