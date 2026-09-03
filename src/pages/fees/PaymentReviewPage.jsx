import { useEffect, useState } from 'react'
import './PaymentReviewPage.css'

export default function PaymentReviewPage() {
  const [payments, setPayments] = useState([])
  const [message, setMessage] = useState('Loading payment submissions...')

  const load = () => fetch('/api/payments').then((response) => response.json()).then((data) => { setPayments(Array.isArray(data) ? data : []); setMessage('') }).catch(() => setMessage('Could not load payment submissions.'))
  useEffect(load, [])

  const review = async (payment, status) => {
    const response = await fetch(`/api/payments/${payment.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const updated = await response.json()
    if (!response.ok) return setMessage(updated.error || 'Could not update payment.')
    setPayments((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setMessage(`${updated.receiptNo} marked ${status.toLowerCase()}.`)
  }

  return <section className="payment-review-page"><header className="payment-review-hero"><div><p className="admin-kicker">Finance control</p><h2>Payment verification</h2><p>Review parent UTR submissions before confirming receipts and ledger status.</p></div><span className="payment-review-count">{payments.filter((payment) => payment.status === 'Verification pending').length} pending</span></header>{message ? <p className="payment-review-message">{message}</p> : null}<div className="payment-review-table"><table><thead><tr><th>Receipt</th><th>Student</th><th>Parent</th><th>Amount</th><th>UTR / Reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.receiptNo}</strong><small>{new Date(payment.createdAt).toLocaleString()}</small></td><td>{payment.studentName}<small>{payment.className} · Roll {payment.rollNo}</small></td><td>{payment.parentName}</td><td>₹{Number(payment.amount).toLocaleString('en-IN')}</td><td><code>{payment.reference}</code></td><td><span className={`payment-status payment-status--${payment.status.toLowerCase().replaceAll(' ', '-')}`}>{payment.status}</span></td><td><div className="payment-review-actions"><button type="button" onClick={() => review(payment, 'Verified')} disabled={payment.status === 'Verified'}>Verify</button><button type="button" onClick={() => review(payment, 'Rejected')} disabled={payment.status === 'Rejected'}>Reject</button></div></td></tr>)}</tbody></table>{!payments.length && !message ? <p className="payment-review-empty">No payment submissions yet.</p> : null}</div></section>
}