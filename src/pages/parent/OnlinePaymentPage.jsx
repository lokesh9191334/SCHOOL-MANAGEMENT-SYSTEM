import { useCallback, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Link } from 'react-router-dom'
import { getAuthUser } from '../../utils/session'
import { getApiAuthHeaders } from '../../services/apiAuth'
import { downloadPaymentReceipt } from '../../services/receiptPdf'
import { currencySymbol } from '../../utils/currency'
import './OnlinePaymentPage.css'

const defaultSettings = { holderName: '', upiId: '', mobile: '', bankName: '', bankAccount: '', bankIfsc: '' }

const STATUS_CLASS = {
  Verified: 'is-verified',
  Rejected: 'is-rejected',
  'Verification pending': 'is-pending',
}

function formatRupees(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—'
  return `${currencySymbol()}${Number(value).toLocaleString('en-IN')}`
}

function formatDateTime(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function ParentOnlinePaymentPage() {
  const user = getAuthUser()
  const [settings, setSettings] = useState(defaultSettings)
  const [summary, setSummary] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [amount, setAmount] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)
  const [reference, setReference] = useState('')
  const [qr, setQr] = useState('')
  const [expiresAt, setExpiresAt] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('is-info')
  const [submitting, setSubmitting] = useState(false)
  const [busyReceiptId, setBusyReceiptId] = useState('')

  const entry = summary?.students?.[0] || null
  const child = entry?.student || null
  const history = entry?.history || []
  const linkedStudentId = user?.linkedId || null
  const autoAmount = entry && entry.balance !== null && entry.balance > 0 ? String(entry.balance) : ''
  const amountValue = amountTouched ? amount : autoAmount

  const receiptSettings = useMemo(() => ({
    ...settings,
    classTeacherName: entry?.classTeacherName || '',
    classTeacherPhone: entry?.classTeacherPhone || '',
  }), [settings, entry])

  const loadSummary = useCallback(() => fetch('/api/payments/summary', { headers: getApiAuthHeaders() })
    .then((response) => response.json().catch(() => null).then((body) => {
      if (!response.ok) throw new Error(body?.error || `Could not load fee details (${response.status}).`)
      if (!Array.isArray(body?.students)) throw new Error('The server returned an invalid fee summary.')
      setSummary(body)
      setLoadError('')
      return body
    }))
    .catch((error) => {
      setLoadError(error.message || 'Could not load fee details.')
      setSummary({ students: [] })
      return null
    }), [])

  useEffect(() => {
    fetch('/api/payment-config', { headers: getApiAuthHeaders() })
      .then(async (response) => {
        const config = await response.json().catch(() => null)
        if (!response.ok) throw new Error(config?.error || 'Payment receiver details could not be loaded.')
        setSettings({ ...defaultSettings, ...config })
      })
      .catch((error) => {
        setMessage(error.message || 'Payment receiver details could not be loaded.')
        setMessageTone('is-error')
      })
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    if (!expiresAt) return undefined
    const timer = window.setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  const upiLink = useMemo(
    () => `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.holderName || 'School')}&am=${encodeURIComponent(amountValue || 0)}&cu=INR`,
    [settings, amountValue],
  )

  const startQr = async () => {
    if (!entry) return
    const value = Number(amountValue)
    if (!Number.isFinite(value) || value <= 0) {
      setMessage('Enter a valid payment amount.')
      setMessageTone('is-error')
      return
    }
    if (!settings.upiId.trim()) {
      setMessage('School payment UPI ID is not configured. Ask the admin to add it first.')
      setMessageTone('is-error')
      return
    }
    setQr(await QRCode.toDataURL(upiLink, { width: 260, margin: 2 }))
    setExpiresAt(Date.now() + 120000)
    setSecondsLeft(120)
    setMessage('Scan the QR, pay the amount, then submit the UTR reference below.')
    setMessageTone('is-info')
  }

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!entry) return
    const value = Number(amountValue)
    if (!Number.isFinite(value) || value <= 0) {
      setMessage('Enter a valid payment amount.')
      setMessageTone('is-error')
      return
    }
    if (!reference.trim()) {
      setMessage('Enter the UPI / bank UTR reference of your payment.')
      setMessageTone('is-error')
      return
    }
    if (secondsLeft === 0) {
      setMessage('The QR session expired. Generate a fresh QR and pay again before submitting.')
      setMessageTone('is-error')
      return
    }
    const record = {
      id: `PAY-${Date.now()}`,
      receiptNo: `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`,
      studentId: linkedStudentId,
      studentName: child?.name || '',
      className: child?.className || '',
      rollNo: child?.rollNo || '',
      amount: value,
      reference: reference.trim(),
      method: 'UPI',
      status: 'Verification pending',
      createdAt: new Date().toISOString(),
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(record),
      })
      const saved = await response.json().catch(() => null)
      if (!response.ok || !saved) throw new Error(saved?.error || `Could not save your payment (${response.status}).`)
      setAmountTouched(false)
      setAmount('')
      setReference('')
      setQr('')
      setExpiresAt(0)
      setSecondsLeft(0)
      try {
        await downloadPaymentReceipt(saved, receiptSettings)
        setMessage(`Payment submitted. Receipt ${saved.receiptNo || saved.id} downloaded — status: Verification pending. The balance updates after the school verifies the payment.`)
        setMessageTone('is-success')
      } catch {
        setMessage(`Payment submitted, but the receipt PDF could not be generated on this device. Use the "Receipt PDF" button in the history table below.`)
        setMessageTone('is-info')
      }
      await loadSummary()
    } catch (error) {
      setMessage(error.message || 'Your payment could not be saved. Please try again.')
      setMessageTone('is-error')
    } finally {
      setSubmitting(false)
    }
  }

  const downloadReceipt = async (payment) => {
    setBusyReceiptId(payment.id)
    try {
      await downloadPaymentReceipt(payment, receiptSettings)
      setMessage(`Receipt ${payment.receiptNo || payment.id} downloaded.`)
      setMessageTone('is-info')
    } catch (error) {
      setMessage(error.message || 'The receipt PDF could not be generated.')
      setMessageTone('is-error')
    } finally {
      setBusyReceiptId('')
    }
  }

  return <section className="parent-payment-page">
    <header className="parent-payment-hero">
      <div>
        <p className="admin-kicker">Parent portal · Fees</p>
        <h2>Pay school fees online</h2>
        <p>Scan the school UPI QR, transfer the amount and submit the UTR reference. The receipt PDF downloads instantly and your child's balance updates after the school verifies the payment.</p>
      </div>
      <Link className="link-pill" to="/parent">Parent portal home</Link>
    </header>
    {loadError ? <div className="parent-payment-warning">{loadError}</div> : null}
    {summary === null ? <div className="parent-payment-loading">Loading fee details…</div> : !entry ? <div className="parent-payment-warning">Your account is not linked to a student. Ask the school admin to issue a fresh parent special key.</div> : <>
      <div className="parent-fee-summary">
        <article className="panel-card parent-fee-card">
          <p className="panel-kicker">Student</p>
          <h3>{child?.name || 'Linked student'}</h3>
          <p className="fee-subline">{child?.className || '—'} · Roll {child?.rollNo || '—'}</p>
        </article>
        <article className="panel-card parent-fee-card">
          <p className="panel-kicker">Total fee</p>
          <strong>{formatRupees(entry.totalFee)}</strong>
          {entry.totalFee === null ? <small>Not set by the school yet.</small> : null}
        </article>
        <article className="panel-card parent-fee-card">
          <p className="panel-kicker">Paid</p>
          <strong className="fee-value-ok">{formatRupees(entry.paid)}</strong>
          {entry.pending > 0 ? <small>{formatRupees(entry.pending)} awaiting verification</small> : null}
        </article>
        <article className="panel-card parent-fee-card is-balance">
          <p className="panel-kicker">Balance due</p>
          <strong>{formatRupees(entry.balance)}</strong>
          {entry.totalFee === null
            ? <small>Ask the school admin to set the total fee.</small>
            : entry.balance === 0
              ? <small>All dues cleared. Thank you!</small>
              : <small>Pay this amount to clear the balance.</small>}
        </article>
      </div>
      <div className="parent-payment-grid">
        <article className="panel-card parent-payment-card">
          <p className="panel-kicker">Payment details</p>
          <h3>{child?.name || 'Linked student'}</h3>
          <p className="fee-subline">{child?.className || '—'} · Roll {child?.rollNo || '—'}</p>
          <div className="payment-recipient">
            <strong>{settings.holderName || 'School account'}</strong>
            {settings.upiId ? <span>UPI: {settings.upiId}</span> : null}
            {settings.mobile ? <span>Mobile: {settings.mobile}</span> : null}
            {settings.bankName || settings.bankAccount ? <span>Bank: {[settings.bankName, settings.bankAccount ? `A/C ${settings.bankAccount}` : '', settings.bankIfsc ? `IFSC ${settings.bankIfsc}` : ''].filter(Boolean).join(' · ')}</span> : null}
          </div>
          <label className="form-field"><span>Amount ({currencySymbol()})</span><input type="number" min="1" value={amountValue} onChange={(event) => { setAmountTouched(true); setAmount(event.target.value) }} /></label>
          <button type="button" className="header-action primary" onClick={startQr}>Show QR for 2 minutes</button>
          {qr ? <div className="payment-qr"><img src={secondsLeft ? qr : ''} alt="UPI payment QR" />{secondsLeft ? <strong>Expires in {secondsLeft}s</strong> : <strong>QR expired. Generate a new QR.</strong>}</div> : null}
        </article>
        <article className="panel-card parent-payment-card">
          <p className="panel-kicker">Confirm transfer</p>
          <h3>Submit payment reference</h3>
          <form onSubmit={submitPayment}>
            <label className="form-field"><span>UPI / bank UTR reference</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Enter the UTR from your payment app" required /></label>
            <button type="submit" className="header-action primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit & download receipt'}</button>
          </form>
          {message ? <p className={`payment-message ${messageTone}`}>{message}</p> : null}
          <p className="payment-note">A receipt PDF is generated only for payments you actually submit — the amount, transaction ID, UTR, bank and UPI details are picked up from the saved payment record.</p>
        </article>
      </div>
      <article className="panel-card parent-fee-history">
        <div className="history-head">
          <div><p className="panel-kicker">Payment history</p><h3>All fee payments</h3></div>
          <span className="history-count">{history.length} record{history.length === 1 ? '' : 's'}</span>
        </div>
        {history.length === 0 ? <p className="history-empty">No fee payment has been recorded yet.</p> : <div className="history-table-wrap">
          <table className="history-table">
            <thead><tr><th>Receipt no</th><th>Date & time</th><th>Amount</th><th>UTR / reference</th><th>Method</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {history.map((payment) => <tr key={payment.id}>
                <td><strong>{payment.receiptNo || payment.id}</strong></td>
                <td>{formatDateTime(payment.createdAt)}</td>
                <td>{currencySymbol()}{Number(payment.amount || 0).toLocaleString('en-IN')}</td>
                <td>{payment.reference || '—'}</td>
                <td>{payment.method || 'UPI'}</td>
                <td><span className={`payment-status ${STATUS_CLASS[payment.status] || ''}`}>{payment.status || '—'}</span></td>
                <td><button type="button" className="small-action" onClick={() => downloadReceipt(payment)} disabled={busyReceiptId === payment.id}>{busyReceiptId === payment.id ? 'Preparing…' : 'Receipt PDF'}</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </article>
    </>}
  </section>
}
