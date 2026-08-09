import { useEffect, useMemo, useState } from 'react'
import { getAuthUser, roleLabel, saveProfileExtras } from '../../utils/session'
import './ProfilePremium.css'

const emptyForm = {
  name: '',
  username: '',
  email: '',
  phone: '',
  photoUrl: '',
  designation: '',
  department: '',
  employeeId: '',
  dateOfJoining: '',
  gender: '',
  bloodGroup: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  emergencyName: '',
  emergencyPhone: '',
  bio: '',
}

export default function SettingsProfilePage() {
  const [user, setUser] = useState(() => getAuthUser())
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const current = getAuthUser()
    setUser(current)
    if (!current) return
    setForm({
      name: current.name || '',
      username: current.username || String(current.email || '').split('@')[0] || '',
      email: current.email || '',
      phone: current.phone || '',
      photoUrl: current.photoUrl || '',
      designation: current.designation || (current.role === 'admin' ? 'School Administrator' : roleLabel(current.role)),
      department: current.department || 'Administration',
      employeeId: current.employeeId || `EMP-${String(current.id || '1001').slice(-4)}`,
      dateOfJoining: current.dateOfJoining || '',
      gender: current.gender || '',
      bloodGroup: current.bloodGroup || '',
      address: current.address || '',
      city: current.city || '',
      state: current.state || '',
      pincode: current.pincode || '',
      emergencyName: current.emergencyName || '',
      emergencyPhone: current.emergencyPhone || '',
      bio: current.bio || '',
    })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const t = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(t)
  }, [toast])

  const initials = useMemo(() => {
    const source = form.name || form.username || form.email || 'U'
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('')
  }, [form.name, form.username, form.email])

  const completeness = useMemo(() => {
    const keys = ['name', 'username', 'phone', 'photoUrl', 'designation', 'department', 'address', 'city', 'bio']
    const filled = keys.filter((k) => String(form[k] || '').trim()).length
    return Math.round((filled / keys.length) * 100)
  }, [form])

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const onPhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2.5 * 1024 * 1024) {
      setToast('Photo must be under 2.5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((prev) => ({ ...prev, photoUrl: String(reader.result || '') }))
      setToast('Photo ready — click Save profile')
    }
    reader.readAsDataURL(file)
  }

  const save = (e) => {
    e.preventDefault()
    if (!user) return
    if (!form.name.trim() || !form.username.trim()) {
      setToast('Name and username are required')
      return
    }
    const saved = saveProfileExtras(user.id || user.email, {
      ...form,
      name: form.name.trim(),
      username: form.username.trim().replace(/\s+/g, '').toLowerCase(),
    })
    setUser(getAuthUser())
    setForm((prev) => ({ ...prev, ...saved }))
    setEditing(false)
    setToast('Profile saved successfully')
  }

  if (!user) {
    return (
      <div className="profile-premium">
        <div className="profile-empty">
          <h2>Sign in required</h2>
          <p>Please log in to view and edit your profile.</p>
          <a className="profile-btn primary" href="/auth/login">
            Go to login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-premium">
      <header className="profile-hero">
        <div className="profile-hero__identity">
          <div className="profile-avatar-wrap">
            {form.photoUrl ? (
              <img src={form.photoUrl} alt={form.name || 'Profile'} className="profile-avatar" />
            ) : (
              <div className="profile-avatar profile-avatar--fallback" aria-hidden>
                {initials}
              </div>
            )}
            {editing ? (
              <label className="profile-photo-btn">
                Change photo
                <input type="file" accept="image/*" onChange={onPhoto} hidden />
              </label>
            ) : null}
          </div>
          <div>
            <p className="admin-kicker">{roleLabel(user.role)}</p>
            <h2>{form.name || 'Complete your profile'}</h2>
            <p className="profile-username">@{form.username || 'username'}</p>
            <p className="profile-email">{form.email}</p>
            <div className="profile-chips">
              <span>{form.designation || 'Designation'}</span>
              <span>{form.department || 'Department'}</span>
              <span>{form.employeeId || 'Employee ID'}</span>
            </div>
          </div>
        </div>

        <div className="profile-hero__side">
          <div className="profile-completeness">
            <strong>{completeness}%</strong>
            <span>Profile complete</span>
            <div className="profile-bar">
              <i style={{ width: `${completeness}%` }} />
            </div>
          </div>
          <div className="profile-hero-actions">
            {!editing ? (
              <button type="button" className="profile-btn primary" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            ) : (
              <>
                <button type="button" className="profile-btn ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button type="submit" form="profile-form" className="profile-btn primary">
                  Save profile
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <nav className="profile-tabs" aria-label="Profile sections">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'personal', label: 'Personal info' },
          { id: 'contact', label: 'Contact & address' },
          { id: 'security', label: 'Security' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <form id="profile-form" className="profile-panel" onSubmit={save}>
        {tab === 'overview' ? (
          <div className="profile-overview-grid">
            <article>
              <h3>Identity</h3>
              <dl>
                <div>
                  <dt>Full name</dt>
                  <dd>{form.name || '—'}</dd>
                </div>
                <div>
                  <dt>Username</dt>
                  <dd>@{form.username || '—'}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{roleLabel(user.role)}</dd>
                </div>
                <div>
                  <dt>Employee ID</dt>
                  <dd>{form.employeeId || '—'}</dd>
                </div>
              </dl>
            </article>
            <article>
              <h3>Work</h3>
              <dl>
                <div>
                  <dt>Designation</dt>
                  <dd>{form.designation || '—'}</dd>
                </div>
                <div>
                  <dt>Department</dt>
                  <dd>{form.department || '—'}</dd>
                </div>
                <div>
                  <dt>Date of joining</dt>
                  <dd>{form.dateOfJoining || '—'}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{form.phone || '—'}</dd>
                </div>
              </dl>
            </article>
            <article className="profile-bio-card">
              <h3>About</h3>
              <p>{form.bio || 'Add a short professional bio about your role at the school.'}</p>
            </article>
          </div>
        ) : null}

        {tab === 'personal' ? (
          <div className="profile-form-grid">
            <label>
              <span>Full name</span>
              <input value={form.name} onChange={update('name')} disabled={!editing} required />
            </label>
            <label>
              <span>Username</span>
              <input value={form.username} onChange={update('username')} disabled={!editing} required />
            </label>
            <label>
              <span>Email</span>
              <input value={form.email} disabled />
            </label>
            <label>
              <span>Phone</span>
              <input value={form.phone} onChange={update('phone')} disabled={!editing} placeholder="+91 …" />
            </label>
            <label>
              <span>Designation</span>
              <input value={form.designation} onChange={update('designation')} disabled={!editing} />
            </label>
            <label>
              <span>Department</span>
              <input value={form.department} onChange={update('department')} disabled={!editing} />
            </label>
            <label>
              <span>Employee ID</span>
              <input value={form.employeeId} onChange={update('employeeId')} disabled={!editing} />
            </label>
            <label>
              <span>Date of joining</span>
              <input type="date" value={form.dateOfJoining} onChange={update('dateOfJoining')} disabled={!editing} />
            </label>
            <label>
              <span>Gender</span>
              <select value={form.gender} onChange={update('gender')} disabled={!editing}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              <span>Blood group</span>
              <select value={form.bloodGroup} onChange={update('bloodGroup')} disabled={!editing}>
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="profile-span-2">
              <span>Professional bio</span>
              <textarea value={form.bio} onChange={update('bio')} disabled={!editing} rows={4} placeholder="Short professional summary" />
            </label>
          </div>
        ) : null}

        {tab === 'contact' ? (
          <div className="profile-form-grid">
            <label className="profile-span-2">
              <span>Address</span>
              <textarea value={form.address} onChange={update('address')} disabled={!editing} rows={3} />
            </label>
            <label>
              <span>City</span>
              <input value={form.city} onChange={update('city')} disabled={!editing} />
            </label>
            <label>
              <span>State</span>
              <input value={form.state} onChange={update('state')} disabled={!editing} />
            </label>
            <label>
              <span>PIN code</span>
              <input value={form.pincode} onChange={update('pincode')} disabled={!editing} />
            </label>
            <label>
              <span>Emergency contact name</span>
              <input value={form.emergencyName} onChange={update('emergencyName')} disabled={!editing} />
            </label>
            <label>
              <span>Emergency phone</span>
              <input value={form.emergencyPhone} onChange={update('emergencyPhone')} disabled={!editing} />
            </label>
          </div>
        ) : null}

        {tab === 'security' ? (
          <div className="profile-security">
            <article>
              <h3>Email OTP 2FA</h3>
              <p>Every login is protected with a 6-digit email OTP. This is already active for your account.</p>
              <span className="profile-status ok">Enabled</span>
            </article>
            <article>
              <h3>Session</h3>
              <p>Signed in as {form.email}. Use Logout from the sidebar to return to the login panel securely.</p>
              <a className="profile-btn ghost" href="/settings/logout">
                Logout now
              </a>
            </article>
            <article>
              <h3>Account role</h3>
              <p>
                Your role is <strong>{roleLabel(user.role)}</strong>. Access menus and modules follow this role
                automatically.
              </p>
            </article>
          </div>
        ) : null}
      </form>

      {toast ? <div className="profile-toast">{toast}</div> : null}
    </div>
  )
}
