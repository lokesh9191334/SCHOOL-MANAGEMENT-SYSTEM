import { useEffect, useState } from 'react'
import * as auth from '../../services/auth'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_STUDENTS, SEED_TEACHERS } from '../../data/seed'

const SettingsProfilePage = () => {
  const [user, setUser] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [base32, setBase32] = useState(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [disableFlow, setDisableFlow] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disableLoading, setDisableLoading] = useState(false)
  const [disableMessage, setDisableMessage] = useState('')
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [demoMessage, setDemoMessage] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('auth_user')
      if (raw) setUser(JSON.parse(raw))
    } catch (e) {
      setUser(null)
    }
  }, [])

  const startSetup = async () => {
    if (!user?.email) return setMessage('Please sign in first')
    setMessage('')
    setLoading(true)
    try {
      const res = await auth.twoFASetup({ email: user.email })
      setQrData(res.qrData)
      setBase32(res.base32)
    } catch (err) {
      setMessage(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const verifySetup = async (e) => {
    e.preventDefault()
    if (!user?.email) return setMessage('Please sign in first')
    setMessage('')
    setLoading(true)
    try {
      await auth.twoFAVerify({ email: user.email, code, setup: true })
      setMessage('Two-factor authentication enabled successfully.')
      // optimistic update in localStorage
      try {
        const raw = JSON.parse(localStorage.getItem('auth_user') || '{}')
        raw.twoFactor = { enabled: true }
        localStorage.setItem('auth_user', JSON.stringify(raw))
        setUser(raw)
      } catch {}
      setQrData(null)
      setBase32(null)
      setCode('')
    } catch (err) {
      setMessage(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <h3>Profile Settings</h3>
      <p>Update your profile information and account preferences.</p>

      <section style={{ marginTop: 20 }} className="panel">
        <div className="panel-header">
          <h4>Two-factor authentication (2FA)</h4>
          <div className="panel-sub">Protect your account with an authenticator app (TOTP).</div>
        </div>

        <div className="panel-body">
          {user ? (
            <div>
              <div style={{ marginBottom: 8 }}>Signed in as <strong>{user.email || user.name}</strong></div>
              {user.twoFactor && user.twoFactor.enabled ? (
                <div>
                  <div style={{ color: 'green', fontWeight: 700, marginBottom: 8 }}>Two-factor authentication is enabled</div>
                  {!disableFlow ? (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="btn-danger" onClick={() => { setShowDisableConfirm(true); setDisableMessage('') }}>
                        Disable 2FA
                      </button>
                      <button className="btn-secondary" onClick={() => { setMessage('If you lose access to your authenticator, contact support@school.sms'); }}>
                        Help
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      setDisableMessage('')
                      setDisableLoading(true)
                      try {
                        await auth.twoFADisable({ email: user.email, code: disableCode })
                        setDisableMessage('Two-factor authentication has been disabled.')
                        // optimistic update
                        try {
                          const raw = JSON.parse(localStorage.getItem('auth_user') || '{}')
                          raw.twoFactor = { enabled: false }
                          localStorage.setItem('auth_user', JSON.stringify(raw))
                          setUser(raw)
                        } catch {}
                        setDisableFlow(false)
                        setDisableCode('')
                      } catch (err) {
                        setDisableMessage(err.message || String(err))
                      } finally {
                        setDisableLoading(false)
                      }
                    }} style={{ marginTop: 8 }}>
                      <label style={{ display: 'block', marginBottom: 8 }}>
                        Enter authenticator code to disable
                        <input
                          value={disableCode}
                          onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          placeholder="123456"
                          required
                          style={{ marginLeft: 8, width: 120 }}
                          inputMode="numeric"
                        />
                      </label>
                      <div style={{ marginTop: 8 }}>
                        <button className="btn-primary" type="submit" disabled={disableLoading}>{disableLoading ? 'Disabling...' : 'Confirm disable'}</button>
                        <button type="button" className="btn-link" style={{ marginLeft: 8 }} onClick={() => { setDisableFlow(false); setDisableCode(''); setDisableMessage('') }}>Cancel</button>
                      </div>
                      {disableMessage && <div style={{ marginTop: 8, color: 'salmon' }}>{disableMessage}</div>}
                    </form>
                  )}

                {/* Confirmation modal before entering disable flow */}
                {showDisableConfirm && (
                  <div className="modal-overlay">
                    <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Confirm disable 2FA">
                      <h3 style={{ marginTop: 0 }}>Confirm disable two-factor authentication</h3>
                      <p style={{ color: '#444' }}>Disabling 2FA will remove the second factor from your account. You will need to reconfigure an authenticator app to re-enable it. Are you sure you want to continue?</p>
                      <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn-link" onClick={() => setShowDisableConfirm(false)}>Cancel</button>
                        <button className="btn-danger" onClick={() => { setShowDisableConfirm(false); setDisableFlow(true); }}>Proceed</button>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              ) : (
                <div>
                  {!qrData ? (
                    <div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn-primary" onClick={startSetup} disabled={loading}>
                          {loading ? 'Preparing...' : 'Enable 2FA'}
                        </button>
                        <button className="btn-secondary" onClick={() => setMessage('2FA uses TOTP apps like Google Authenticator or Authy.')}>Learn more</button>
                      </div>
                      <div style={{ marginTop: 8, color: '#666' }}>Enabling will generate a QR code you can scan with your authenticator app.</div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12 }}>
                      <div>
                        <img alt="2FA QR code" src={qrData} style={{ maxWidth: 220, borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.12)' }} />
                      </div>
                      <div style={{ marginTop: 8 }}>Secret: <code style={{ background: '#0b1220', padding: '4px 6px', borderRadius: 4, color: '#fff' }}>{base32}</code></div>
                      <form onSubmit={verifySetup} style={{ marginTop: 12 }}>
                        <label style={{ display: 'block' }}>
                          Enter code from authenticator
                          <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} placeholder="123456" required style={{ marginLeft: 8, width: 120 }} inputMode="numeric" />
                        </label>
                        <div style={{ marginTop: 8 }}>
                          <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify and enable'}</button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="settings-cta">
              <div>Please sign in to manage 2FA on your account.</div>
              <div style={{ marginTop: 8 }}>
                <a href="/auth/login" className="btn-primary">Sign in</a>
                <a href="/auth/register" className="btn-link" style={{ marginLeft: 8 }}>Create account</a>
              </div>
            </div>
          )}

          {message && <div style={{ marginTop: 12, color: 'salmon' }}>{message}</div>}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h4>Demo Data</h4>
        <p style={{ maxWidth: 620 }}>Restore or clear seeded demo data used for first-run examples. This affects only local browser storage.</p>

        <div style={{ marginTop: 12 }}>
          <button
            className="btn-primary"
            onClick={() => {
              setDemoLoading(true)
              try {
                localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(SEED_STUDENTS))
                localStorage.setItem(STORAGE_KEYS.teachers, JSON.stringify(SEED_TEACHERS))
                setDemoMessage('Demo data restored. Visit Students or Teachers to see entries.')
              } catch (e) {
                setDemoMessage('Unable to restore demo data in this browser.')
              } finally {
                setDemoLoading(false)
              }
            }}
            disabled={demoLoading}
          >
            {demoLoading ? 'Restoring...' : 'Restore demo data'}
          </button>

          <button
            className="btn-danger"
            style={{ marginLeft: 12 }}
            onClick={() => {
              setDemoLoading(true)
              try {
                localStorage.setItem(STORAGE_KEYS.students, JSON.stringify([]))
                localStorage.setItem(STORAGE_KEYS.teachers, JSON.stringify([]))
                setDemoMessage('Demo data cleared.')
              } catch (e) {
                setDemoMessage('Unable to clear demo data in this browser.')
              } finally {
                setDemoLoading(false)
              }
            }}
            disabled={demoLoading}
          >
            Clear demo data
          </button>
        </div>

        {demoMessage && <div style={{ marginTop: 12, color: '#444' }}>{demoMessage}</div>}
      </section>
    </div>
  )
}

export default SettingsProfilePage
