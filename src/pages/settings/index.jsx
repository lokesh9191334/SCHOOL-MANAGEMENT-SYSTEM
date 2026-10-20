import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import NavGlyph from '../../layouts/NavGlyph'
import { completePasswordReset, requestPasswordReset } from '../../services/auth'
import { enrollMyFace, fetchMyFace, removeMyFace } from '../../services/faceAttendance'
import FaceCapturePanel from '../../components/face/FaceCapturePanel'
import { getAuthUser, roleLabel } from '../../utils/session'
import { CURRENCIES, getCurrency, setCurrency as saveCurrency } from '../../utils/currency'
import { LANGUAGES, useI18n } from '../../i18n/I18nContext'
import '../../styles/auth-face.css'
import './Settings.css'

const THEME_STORAGE_KEY = 'sms_theme'
const NOTIFY_STORAGE_KEY = 'sms_notify_enabled'
const STAFF_ROLES = new Set(['admin', 'super_admin', 'teacher'])
const FACE_MANAGE_PATH = '/attendance/staff-face?tab=myface'

function currentTheme() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('sms-dark') ? 'dark' : 'light'
}

function storedNotifications() {
  try {
    return localStorage.getItem(NOTIFY_STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

function initialsOf(name) {
  return String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function formatWhen(iso, locale) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(locale || 'en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function SettingsPage() {
  const { language, locale, setLanguage, t } = useI18n()
  const [user] = useState(() => getAuthUser())
  const [theme, setTheme] = useState(currentTheme)
  const [notifyOn, setNotifyOn] = useState(storedNotifications)
  const [currency, setCurrencyState] = useState(getCurrency)
  const [face, setFace] = useState({ state: 'loading', data: null, error: '' })
  const [faceEnrollOpen, setFaceEnrollOpen] = useState(false)
  const [faceEnrollError, setFaceEnrollError] = useState('')
  const [toast, setToast] = useState('')

  const [pwOpen, setPwOpen] = useState(false)
  const [pwStage, setPwStage] = useState('request')
  const [pwCode, setPwCode] = useState('')
  const [pwPassword, setPwPassword] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwDemoOtp, setPwDemoOtp] = useState('')
  const [pwNotice, setPwNotice] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const role = String(user?.role || '').toLowerCase()
  const isStaff = STAFF_ROLES.has(role)
  const canSeeSecurity = role === 'admin' || role === 'super_admin'
  const displayName = user?.name || user?.username || user?.email || 'Your account'
  const initials = useMemo(() => initialsOf(displayName), [displayName])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const loadFace = useCallback(() => {
    setFace({ state: 'loading', data: null, error: '' })
    fetchMyFace()
      .then((data) => setFace({ state: 'ready', data, error: '' }))
      .catch((error) => setFace({ state: 'error', data: null, error: error?.message || 'Could not load your face profile.' }))
  }, [])

  useEffect(() => {
    let active = true
    setFace({ state: 'loading', data: null, error: '' })
    fetchMyFace()
      .then((data) => {
        if (active) setFace({ state: 'ready', data, error: '' })
      })
      .catch((error) => {
        if (active) setFace({ state: 'error', data: null, error: error?.message || 'Could not load your face profile.' })
      })
    return () => {
      active = false
    }
  }, [])

  const applyTheme = (next) => {
    setTheme(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* storage blocked */
    }
    document.documentElement.classList.toggle('sms-dark', next === 'dark')
    setToast(t(next === 'dark' ? 'Dark theme applied on this device' : 'Light theme applied on this device'))
  }

  const applyNotifications = (next) => {
    setNotifyOn(next)
    try {
      localStorage.setItem(NOTIFY_STORAGE_KEY, next ? 'on' : 'off')
    } catch {
      /* storage blocked */
    }
    window.dispatchEvent(new Event('sms:notify-preference'))
    setToast(t(next ? 'Notifications turned on' : 'Notifications turned off'))
  }

  const applyLanguage = (next) => {
    setLanguage(next)
    setToast(next === 'hi' ? 'भाषा बदल गई' : 'Language updated')
  }

  const applyCurrency = (next) => {
    setCurrencyState(saveCurrency(next))
    setToast(t('Currency symbol updated'))
  }

  const openPassword = () => {
    setPwOpen(true)
    setPwStage('request')
    setPwCode('')
    setPwPassword('')
    setPwConfirm('')
    setPwDemoOtp('')
    setPwNotice('')
    setPwError('')
  }

  const closePassword = () => {
    setPwOpen(false)
    setPwStage('request')
    setPwCode('')
    setPwPassword('')
    setPwConfirm('')
    setPwDemoOtp('')
    setPwNotice('')
    setPwError('')
  }

  const sendPasswordCode = async () => {
    if (!user?.email) return
    setPwBusy(true)
    setPwError('')
    setPwNotice('')
    try {
      const result = await requestPasswordReset({ email: user.email })
      setPwDemoOtp(result?.demoOtp || '')
      setPwStage('verify')
      setPwNotice(result?.message || t('A six-digit security code was sent to your registered email.'))
    } catch (error) {
      setPwError(error?.message || t('Could not send the security code. Try again.'))
    } finally {
      setPwBusy(false)
    }
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    if (!user?.email) return
    const code = pwCode.replace(/\D/g, '')
    if (code.length !== 6) {
      setPwError(t('Enter the six-digit code from your email.'))
      return
    }
    if (pwPassword.length < 8) {
      setPwError(t('Your new password must contain at least 8 characters.'))
      return
    }
    if (pwPassword !== pwConfirm) {
      setPwError(t('The passwords do not match.'))
      return
    }
    setPwBusy(true)
    setPwError('')
    try {
      const result = await completePasswordReset({ email: user.email, code, password: pwPassword })
      setPwStage('done')
      setPwNotice(result?.message || t('Password updated. Use the new password the next time you sign in.'))
      setPwCode('')
      setPwPassword('')
      setPwConfirm('')
      setPwDemoOtp('')
    } catch (error) {
      setPwError(error?.message || t('Could not update the password. Try again.'))
    } finally {
      setPwBusy(false)
    }
  }

  if (!user) {
    return (
      <div className="settings-page">
        <div className="st-empty">
          <h2>{t('Sign in required')}</h2>
          <p>{t('Please log in to manage your account settings.')}</p>
          <Link className="st-btn primary" to="/auth/login">
            {t('Go to login')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <header className="st-hero">
        <div className="st-hero__identity">
          <div className="st-avatar">
            {user.photoUrl ? <img src={user.photoUrl} alt="" /> : <span>{initials}</span>}
          </div>
          <div>
            <p className="admin-kicker">{t('Account settings')}</p>
            <h2>{displayName}</h2>
            <p className="st-hero__email">{user.email}</p>
            <div className="st-hero__chips">
              <span>{t(roleLabel(role))}</span>
              {user.designation ? <span>{user.designation}</span> : null}
              {user.department ? <span>{user.department}</span> : null}
              {user.employeeId ? <span>{user.employeeId}</span> : null}
            </div>
          </div>
        </div>
        <div className="st-hero__actions">
          <Link className="st-btn primary" to="/settings/profile">
            {t('Edit profile')}
          </Link>
          <Link className="st-btn ghost" to="/settings/logout">
            {t('Sign out')}
          </Link>
        </div>
      </header>

      <div className="st-grid">
        <article className="st-card">
          <header className="st-card__head">
            <span className="st-card__icon" aria-hidden>
              <NavGlyph name="user" size={16} />
            </span>
            <h3>{t('Profile')}</h3>
          </header>
          <dl className="st-meta">
            <div>
              <dt>{t('Full name')}</dt>
              <dd>{user.name || '—'}</dd>
            </div>
            <div>
              <dt>{t('Username')}</dt>
              <dd>{user.username ? `@${user.username}` : '—'}</dd>
            </div>
            <div>
              <dt>{t('Email')}</dt>
              <dd>{user.email || '—'}</dd>
            </div>
            <div>
              <dt>{t('Phone')}</dt>
              <dd>{user.phone || '—'}</dd>
            </div>
            <div>
              <dt>{t('Designation')}</dt>
              <dd>{user.designation || '—'}</dd>
            </div>
            <div>
              <dt>{t('Employee ID')}</dt>
              <dd>{user.employeeId || '—'}</dd>
            </div>
          </dl>
          <Link className="st-link" to="/settings/profile">
            {t('Open full profile')} →
          </Link>
        </article>

        <article className="st-card">
          <header className="st-card__head">
            <span className="st-card__icon" aria-hidden>
              <NavGlyph name="sun" size={16} />
            </span>
            <h3>{t('Appearance')}</h3>
          </header>
          <p className="st-copy">
            {t('Choose how the website looks on this device. The change applies instantly and is remembered on your next visit.')}
          </p>
          <div className="st-theme" role="group" aria-label={t('Website theme')}>
            <button
              type="button"
              className={`st-theme__option ${theme === 'light' ? 'is-active' : ''}`}
              aria-pressed={theme === 'light'}
              onClick={() => applyTheme('light')}
            >
              <span className="st-theme__swatch st-theme__swatch--light" aria-hidden />
              {t('Light')}
            </button>
            <button
              type="button"
              className={`st-theme__option ${theme === 'dark' ? 'is-active' : ''}`}
              aria-pressed={theme === 'dark'}
              onClick={() => applyTheme('dark')}
            >
              <span className="st-theme__swatch st-theme__swatch--dark" aria-hidden />
              {t('Dark')}
            </button>
          </div>
        </article>

        <article className="st-card">
          <header className="st-card__head">
            <span className="st-card__icon" aria-hidden>
              <NavGlyph name="bell" size={16} />
            </span>
            <h3>{t('Notifications')}</h3>
          </header>
          <p className="st-copy">
            {t('Turn the in-app alert badges on or off for this device. Login-alert badges appear for admin roles.')}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={notifyOn}
            className={`st-switch ${notifyOn ? 'is-on' : ''}`}
            onClick={() => applyNotifications(!notifyOn)}
          >
            <span className="st-switch__thumb" aria-hidden />
            <span className="st-switch__label">{notifyOn ? t('On') : t('Off')}</span>
          </button>
        </article>

        <article className="st-card">
          <header className="st-card__head">
            <span className="st-card__icon" aria-hidden>
              <NavGlyph name="grid" size={16} />
            </span>
            <h3>{t('Language & currency')}</h3>
          </header>
          <p className="st-subhead">{t('App language')}</p>
          <div className="st-theme" role="group" aria-label={t('Website language')}>
            {LANGUAGES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`st-theme__option ${language === option.value ? 'is-active' : ''}`}
                aria-pressed={language === option.value}
                onClick={() => applyLanguage(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="st-subhead">{t('Currency symbol')}</p>
          <div className="st-theme" role="group" aria-label={t('Currency symbol')}>
            {CURRENCIES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`st-theme__option ${currency === option.value ? 'is-active' : ''}`}
                aria-pressed={currency === option.value}
                onClick={() => applyCurrency(option.value)}
              >
                <span className="st-currency-mark" aria-hidden>{option.symbol}</span>
                {t(option.label)}
              </button>
            ))}
          </div>
          <p className="st-hint">{t('Pick the symbol shown with amounts. Amounts are not converted or recalculated.')}</p>
        </article>

        <article className="st-card st-card--wide">
          <header className="st-card__head">
            <span className="st-card__icon" aria-hidden>
              <NavGlyph name="shield" size={16} />
            </span>
            <h3>{t('Security & password')}</h3>
          </header>

          <div className="st-row">
            <div>
              <strong>{t('Email OTP sign-in')}</strong>
              <p>{t('Every sign-in is confirmed with a six-digit code sent to your registered email.')}</p>
            </div>
            <span className="st-badge ok">{t('Enabled')}</span>
          </div>

          <div className="st-row">
            <div>
              <strong>{t('Password')}</strong>
              <p>{t('Change your password with a one-time code sent to {email}.', { email: user.email })}</p>
            </div>
            {!pwOpen ? (
              <button type="button" className="st-btn secondary" onClick={openPassword}>
                {t('Change password')}
              </button>
            ) : null}
          </div>

          {pwOpen ? (
            <form className="st-pw" onSubmit={submitPassword}>
              {pwStage === 'request' ? (
                <>
                  <p className="st-copy">
                    {t('We will email a security code to your registered address, then you can choose a new password.')}
                  </p>
                  <div className="st-pw__actions">
                    <button type="button" className="st-btn secondary" onClick={sendPasswordCode} disabled={pwBusy}>
                      {pwBusy ? t('Sending code…') : t('Send security code')}
                    </button>
                    <button type="button" className="st-btn ghost" onClick={closePassword} disabled={pwBusy}>
                      {t('Cancel')}
                    </button>
                  </div>
                </>
              ) : null}

              {pwStage === 'verify' ? (
                <>
                  {pwNotice ? <div className="st-alert ok">{pwNotice}</div> : null}
                  {pwDemoOtp ? (
                    <div className="st-alert info">
                      {t('Local demo mailbox:')} <strong>{pwDemoOtp}</strong>
                    </div>
                  ) : null}
                  <label className="st-field">
                    <span>{t('Email verification code')}</span>
                    <input
                      value={pwCode}
                      onChange={(event) => setPwCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder={t('6-digit code')}
                      disabled={pwBusy}
                    />
                  </label>
                  <div className="st-pw__grid">
                    <label className="st-field">
                      <span>{t('New password')}</span>
                      <input
                        type="password"
                        value={pwPassword}
                        onChange={(event) => setPwPassword(event.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        placeholder={t('At least 8 characters')}
                        disabled={pwBusy}
                      />
                    </label>
                    <label className="st-field">
                      <span>{t('Confirm new password')}</span>
                      <input
                        type="password"
                        value={pwConfirm}
                        onChange={(event) => setPwConfirm(event.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        placeholder={t('Enter it again')}
                        disabled={pwBusy}
                      />
                    </label>
                  </div>
                  {pwError ? <div className="st-alert error">{pwError}</div> : null}
                  <div className="st-pw__actions">
                    <button type="submit" className="st-btn secondary" disabled={pwBusy}>
                      {pwBusy ? t('Updating password…') : t('Update password')}
                    </button>
                    <button type="button" className="st-btn ghost" onClick={closePassword} disabled={pwBusy}>
                      {t('Cancel')}
                    </button>
                  </div>
                  <p className="st-hint">{t('The code expires in 10 minutes. Check spam and promotions folders if it does not arrive.')}</p>
                </>
              ) : null}

              {pwStage === 'done' ? (
                <>
                  <div className="st-alert ok">{pwNotice || t('Password updated successfully.')}</div>
                  <div className="st-pw__actions">
                    <button type="button" className="st-btn secondary" onClick={closePassword}>
                      {t('Done')}
                    </button>
                  </div>
                </>
              ) : null}

              {pwStage === 'request' && pwError ? <div className="st-alert error">{pwError}</div> : null}
            </form>
          ) : null}

          {canSeeSecurity ? (
            <div className="st-row">
              <div>
                <strong>{t('Login activity')}</strong>
                <p>{t('Review every login attempt, known device and risk alert across the school.')}</p>
              </div>
              <Link className="st-btn secondary" to="/security/login-tracks">
                {t('Open Login Tracks')}
              </Link>
            </div>
          ) : null}
        </article>

        <article className="st-card">
          <header className="st-card__head">
            <span className="st-card__icon" aria-hidden>
              <NavGlyph name="faceScan" size={16} />
            </span>
            <h3>{t('Face profile')}</h3>
          </header>
          {face.state === 'loading' ? <p className="st-copy">{t('Checking your face profile…')}</p> : null}
          {face.state === 'error' ? (
            <>
              <div className="st-alert error">{face.error}</div>
              <button type="button" className="st-btn ghost" onClick={loadFace}>
                {t('Try again')}
              </button>
            </>
          ) : null}
          {face.state === 'ready' ? (
            face.data?.enrolled ? (
              <div className="st-face">
                {face.data.photoThumb ? <img className="st-face__thumb" src={face.data.photoThumb} alt="" /> : null}
                <div>
                  <span className="st-badge ok">{t('Face enrolled')}</span>
                  <dl className="st-meta st-meta--compact">
                    <div>
                      <dt>{t('Samples')}</dt>
                      <dd>{face.data.descriptorCount || 0}</dd>
                    </div>
                    <div>
                      <dt>{t('Updated')}</dt>
                      <dd>{formatWhen(face.data.updatedAt, locale)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : (
              <>
                <span className="st-badge warn">{t('Not enrolled')}</span>
                <p className="st-copy">
                  {isStaff
                    ? t('Enrol your face from the My Face tab to use face sign-in and staff attendance.')
                    : t('Enrol your face to sign in with your face — no password needed.')}
                </p>
              </>
            )
          ) : null}

          {isStaff ? (
            <Link className="st-link" to={FACE_MANAGE_PATH}>
              {t('Manage my face')} →
            </Link>
          ) : (
            <div className="st-row">
              <button
                type="button"
                className="st-btn secondary"
                onClick={() => {
                  setFaceEnrollOpen((v) => !v)
                  setFaceEnrollError('')
                }}
              >
                {face.data?.enrolled ? (faceEnrollOpen ? t('Close camera') : t('Re-take face')) : t('Enrol face')}
              </button>
              {face.data?.enrolled ? (
                <button
                  type="button"
                  className="st-btn ghost"
                  onClick={async () => {
                    try {
                      await removeMyFace()
                      setToast(t('Face profile removed'))
                      loadFace()
                    } catch (error) {
                      setToast(error?.message || 'Could not remove the face profile.')
                    }
                  }}
                >
                  {t('Remove face')}
                </button>
              ) : null}
            </div>
          )}

          {!isStaff && faceEnrollOpen ? (
            <div className="af-setup">
              <FaceCapturePanel
                mode="enroll"
                error={faceEnrollError}
                onSubmit={async ({ descriptors, photoThumb }) => {
                  setFaceEnrollError('')
                  try {
                    await enrollMyFace({ descriptors, photoThumb })
                    setFaceEnrollOpen(false)
                    setToast(t('Face profile saved'))
                    loadFace()
                  } catch (err) {
                    setFaceEnrollError(err.message || String(err))
                    throw err
                  }
                }}
              />
            </div>
          ) : null}
        </article>

        <article className="st-card">
          <header className="st-card__head">
            <span className="st-card__icon" aria-hidden>
              <NavGlyph name="logout" size={16} />
            </span>
            <h3>{t('Session')}</h3>
          </header>
          <dl className="st-meta st-meta--compact">
            <div>
              <dt>{t('Signed in as')}</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>{t('Role')}</dt>
              <dd>{t(roleLabel(role))}</dd>
            </div>
          </dl>
          <p className="st-copy">{t('Sign out of this device and return to the secure login panel.')}</p>
          <Link className="st-btn ghost st-btn--danger" to="/settings/logout">
            {t('Sign out')}
          </Link>
        </article>
      </div>

      {toast ? createPortal(<div className="st-toast">{toast}</div>, document.body) : null}
    </div>
  )
}
