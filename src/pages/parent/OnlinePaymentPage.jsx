import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_FEE_PAYMENTS, SEED_STUDENTS } from '../../data/seed'
import { getAuthUser } from '../../utils/session'
import './OnlinePaymentPage.css'

const PAYMENT_SETTINGS_KEY = 'sms_payment_settings'
const PAYMENT_RECORDS_KEY = 'sms_parent_payment_records'
const defaultSettings = { holderName: '', upiId: '', mobile: '' }

function receiptNumber() {
  return `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-8)}`
}

export default function ParentOnlinePaymentPage() {
  const user = getAuthUser()
  const [students] = usePersistentState(STORAGE_KEYS.students, SEED_STUDENTS)
  const [fees] = usePersistentState(STORAGE_KEYS.fees, SEED_FEE_PAYMENTS)
  const [payments, setPayments] = usePersistentState(PAYMENT_RECORDS_KEY, [])
  const child = user?.linkedId ? students.find((student) => student.id === user.linkedId || student.applicationId === user.linkedId) : null
  const childFees = child ? fees.filter((fee) => fee.studentId === child.id || fee.student === child.title) : []
  const due = childFees.filter((fee) => fee.status !== 'Paid').reduce((sum, fee) => sum + Number(fee.amount || 0), 0)
  const [settings, setSettings] = useState(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem(PAYMENT_SETTINGS_KEY) || '{}') }
    } catch {
      return defaultSettings
    }
  })
  const [amount, setAmount] = useState(String(due || ''))
  const [reference, setReference] = useState('')
  const [qr, setQr] = useState('')
  const [expiresAt, setExpiresAt] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/payment-config')
      .then((response) => response.json())
      .then((config) => setSettings((current) => ({ ...current, ...config })))
      .catch(() => setMessage('Payment receiver details could not be loaded.'))
  }, [])

  const upiLink = useMemo(() => `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.holderName)}&am=${encodeURIComponent(amount || 0)}&cu=INR`, [settings, amount])

  useEffect(() => {
    if (!expiresAt) return undefined
    const timer = window.setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])

  const startQr = async () => {
    if (!child) return setMessage('This parent account is not linked to a student yet.')
    if (!Number(amount) || Number(amount) <= 0) return setMessage('Enter a valid payment amount.')
    if (!settings.upiId.trim()) return setMessage('School payment UPI ID is not configured. Ask the admin to add it first.')
    setQr(await QRCode.toDataURL(upiLink, { width: 260, margin: 2 }))
    setExpiresAt(Date.now() + 120000)
    setMessage('Scan the QR and submit the UTR/reference after payment.')
  }

  const submitPayment = (event) => {
    event.preventDefault()
    if (!child || !reference.trim() || secondsLeft === 0) return setMessage('Enter the payment reference while the QR session is active.')
    const record = { id: `PAY-${Date.now()}`, receiptNo: receiptNumber(), studentId: child.id, studentName: child.title, className: child.subtitle, rollNo: child.rollNo || '—', parentName: user.name, amount: Number(amount), reference: reference.trim(), method: 'UPI', status: 'Verification pending', createdAt: new Date().toISOString() }
    setPayments((current) => [record, ...current])
    setReference('')
    setQr('')
    setExpiresAt(0)
    setMessage(`Payment submitted. Receipt ${record.receiptNo} is ready after admin verification.`)
  }

  const latest = payments.find((payment) => payment.studentId === child?.id)
  const printReceipt = () => {
    if (!latest) return
    const popup = window.open('', '_blank')
    if (!popup) return
    popup.document.write(`<html><body style="font-family:Arial;padding:32px"><h1>Fee Payment Receipt</h1><p><b>Receipt:</b> ${latest.receiptNo}</p><p><b>Payment holder:</b> ${latest.parentName}</p><p><b>Student:</b> ${latest.studentName}</p><p><b>Class / Roll no:</b> ${latest.className} / ${latest.rollNo}</p><p><b>Amount:</b> ₹${latest.amount.toLocaleString('en-IN')}</p><p><b>Method:</b> ${latest.method}</p><p><b>Reference:</b> ${latest.reference}</p><p><b>Status:</b> ${latest.status}</p><p><b>Date:</b> ${new Date(latest.createdAt).toLocaleString()}</p></body></html>`)
    popup.document.close()
    popup.print()
  }

  return <section className="parent-payment-page">
    <header className="parent-payment-hero"><div><p className="admin-kicker">Parent portal · Fees</p><h2>Secure online payment</h2><p>Pay the school UPI, mobile number or QR shown below. The QR session expires in two minutes.</p></div><Link className="link-pill" to="/parent/fees/pending">View pending fees</Link></header>
    {!child ? <div className="parent-payment-warning">Your account is not linked to a student. Ask the school admin to issue a fresh parent special key.</div> : <div className="parent-payment-grid">
      <article className="panel-card parent-payment-card"><p className="panel-kicker">Payment details</p><h3>{child.title}</h3><p>{child.subtitle} · Roll {child.rollNo || '—'}</p><div className="payment-amount">₹{Number(due).toLocaleString('en-IN')} <small>outstanding</small></div><div className="payment-recipient"><strong>{settings.holderName}</strong><span>UPI: {settings.upiId}</span><span>Mobile: {settings.mobile}</span></div><label className="form-field"><span>Amount (₹)</span><input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><button type="button" className="header-action primary" onClick={startQr}>Show QR for 2 minutes</button>{qr ? <div className="payment-qr"><img src={secondsLeft ? qr : ''} alt="UPI payment QR" />{secondsLeft ? <strong>Expires in {secondsLeft}s</strong> : <strong>QR expired. Generate a new QR.</strong>}</div> : null}</article>
      <article className="panel-card parent-payment-card"><p className="panel-kicker">Confirm transfer</p><h3>Submit payment reference</h3><form onSubmit={submitPayment}><label className="form-field"><span>UPI / bank UTR reference</span><input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Enter 12-digit UTR" required /></label><button type="submit" className="header-action primary">Submit for verification</button></form>{message ? <p className="payment-message">{message}</p> : null}{latest ? <div className="receipt-preview"><strong>{latest.receiptNo}</strong><span>₹{latest.amount.toLocaleString('en-IN')} · {latest.status}</span><button type="button" className="small-action" onClick={printReceipt}>Print receipt</button></div> : null}</article>
    </div>}
  </section>
}