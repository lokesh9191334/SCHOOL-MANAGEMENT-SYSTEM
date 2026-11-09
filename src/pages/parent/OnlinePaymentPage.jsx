import { useCallback, useEffect, useMemo, useState } from 'react'
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

const INSTALLMENT_CLASS = {
  paid: 'is-verified',
  due: 'is-rejected',
  upcoming: 'is-pending',
}

const INSTALLMENT_LABEL = {
  paid: 'Paid',
  due: 'Due now',
  upcoming: 'Upcoming',
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

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ParentOnlinePaymentPage() {
  const user = getAuthUser()
  const [settings, setSettings] = useState(defaultSettings)
  const [summary, setSummary] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [amount, setAmount] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)
  const [reference, setReference] = useState('')
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('is-info')
  const [submitting, setSubmitting] = useState(false)
  const [busyReceiptId, setBusyReceiptId] = useState('')

  const entry = summary?.students?.[0] || null
  const child = entry?.student || null
  const history = entry?.history || []
  const linkedStudentId = user?.linkedId || null
  const installments = Array.isArray(entry?.installments) ? entry.installments : []
  const scheduleActive = installments.length > 0
  const dueNow = Number(entry?.dueNow) || 0
  // No-skip rule: when installments are pending, the combined due amount is
  // suggested instead of the whole balance.
  const autoAmount = entry && scheduleActive && dueNow > 0
    ? String(dueNow)
    : entry && entry.balance !== null && entry.balance > 0 ? String(entry.balance) : ''
  const amountValue = amountTouched ? amount : autoAmount

  const blocksDueAmount = (value) => scheduleActive && dueNow > 0 && value < dueNow - 0.005

  const upiLink = useMemo(() => {
    const note = `${child?.name || 'School fee'} ${child?.className || ''}`.trim().slice(0, 40)
    return `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.holderName || 'School')}&am=${encodeURIComponent(amountValue || 0)}&cu=INR&tn=${encodeURIComponent(note)}`
  }, [settings, amountValue, child])

  const amountInvalid = (value) => {
    if (!Number.isFinite(value) || value <= 0) return 'Enter a valid payment amount.'
    if (value > 100000) return `A single payment cannot exceed ${currencySymbol()}1,00,000. Split larger amounts into multiple payments.`
    if (blocksDueAmount(value)) return `Earlier installments are pending — pay ${currencySymbol()}${dueNow.toLocaleString('en-IN')} or more in one payment.`
    return ''
  }

  const payNow = () => {
    if (!entry) return
    const problem = amountInvalid(Number(amountValue))
    if (problem) {
      setMessage(problem)
      setMessageTone('is-error')
      return
    }
    if (!settings.upiId.trim()) {
      setMessage('School payment UPI ID is not configured. Ask the admin to add it first.')
      setMessageTone('is-error')
      return
    }
    window.location.href = upiLink
    setMessage('Google Pay / PhonePe opens with the amount and the school UPI ID already filled. Complete the payment there, then copy the UTR / transaction ID from the payment details and paste it in the next panel.')
    setMessageTone('is-info')
  }

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

  const submitPayment = async (event) => {
    event.preventDefault()
    if (!entry) return
    const value = Number(amountValue)
    const problem = amountInvalid(value)
    if (problem) {
      setMessage(problem)
      setMessageTone('is-error')
      return
    }
    if (!reference.trim()) {
      setMessage('Enter the UPI / bank UTR reference of your payment.')
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
      try {
        await downloadPaymentReceipt(saved, receiptSettings)
        setMessage(`Payment submitted. Receipt ${saved.receiptNo || saved.id} downloaded and the school office has been notified by email. The balance updates after the school verifies the payment.`)
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
        <p>The school's UPI / bank account details are below. Pay any amount from {currencySymbol()}1 to {currencySymbol()}1,00,000 from your own UPI or banking app, then submit the UTR reference of that payment here. The receipt PDF downloads instantly, the school office gets an email with the receipt and your child's details, and the balance updates after the school verifies the payment.</p>
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
      {scheduleActive ? <article className="panel-card parent-fee-history">
        <div className="history-head">
          <div><p className="panel-kicker">Installment plan · {entry.feePlan || '—'}</p><h3>Fee schedule</h3></div>
          {dueNow > 0 ? <span className="history-count">{formatRupees(dueNow)} due now</span> : null}
        </div>
        <p className="payment-note">Missed installments cannot be skipped — the next payment must cover every pending installment together.</p>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead><tr><th>#</th><th>Due date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {installments.map((item) => <tr key={item.index}>
                <td>{item.index}</td>
                <td>{formatDate(item.dueDate)}</td>
                <td>{formatRupees(item.amount)}</td>
                <td><span className={`payment-status ${INSTALLMENT_CLASS[item.state] || ''}`}>{INSTALLMENT_LABEL[item.state] || item.state}</span></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </article> : null}
      <div className="parent-payment-grid">
        <article className="panel-card parent-payment-card">
          <p className="panel-kicker">School account · pay from your own app</p>
          <h3>{child?.name || 'Linked student'}</h3>
          <p className="fee-subline">{child?.className || '—'} · Roll {child?.rollNo || '—'}</p>
          <div className="payment-recipient">
            <strong>{settings.holderName || 'School account'}</strong>
            {settings.upiId ? <span>UPI: {settings.upiId}</span> : null}
            {settings.mobile ? <span>Mobile: {settings.mobile}</span> : null}
            {settings.bankName || settings.bankAccount ? <span>Bank: {[settings.bankName, settings.bankAccount ? `A/C ${settings.bankAccount}` : '', settings.bankIfsc ? `IFSC ${settings.bankIfsc}` : ''].filter(Boolean).join(' · ')}</span> : null}
          </div>
          <p className="payment-note">Open your own UPI / banking app, pay the school account above, note the UTR reference shown after the payment, then submit it in the next panel. On a phone, the button below opens Google Pay / PhonePe directly with the amount filled:</p>
          <label className="form-field"><span>Amount ({currencySymbol()})</span><input type="number" min="1" max="100000" value={amountValue} onChange={(event) => { setAmountTouched(true); setAmount(event.target.value) }} /></label>
          <button type="button" className="header-action primary" onClick={payNow}>{Number(amountValue) > 0 ? `Pay ${currencySymbol()}${Number(amountValue).toLocaleString('en-IN')} via GPay / PhonePe` : 'Pay via GPay / PhonePe'}</button>
        </article>
        <article className="panel-card parent-payment-card">
          <p className="panel-kicker">Confirm transfer</p>
          <h3>Submit payment reference</h3>
          <form onSubmit={submitPayment}>
            <label className="form-field"><span>UPI / bank UTR reference</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Enter the UTR from your payment app" required /></label>
            <button type="submit" className="header-action primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit & download receipt'}</button>
          </form>
          {message ? <p className={`payment-message ${messageTone}`}>{message}</p> : null}
          <p className="payment-note">Submit only after the money has actually been transferred — the UTR is checked against the school account before the payment is marked Verified.</p>
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
