import { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiAuthHeaders } from '../../services/apiAuth'
import './PaymentReviewPage.css'

function formatRupees(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

export default function PaymentReviewPage() {
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [summaryEntries, setSummaryEntries] = useState([])
  const [feeDrafts, setFeeDrafts] = useState({})
  const [savingFeeId, setSavingFeeId] = useState('')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('Loading payment submissions...')
  const [feeMessage, setFeeMessage] = useState('')

  const load = useCallback(() => fetch('/api/payments', { headers: getApiAuthHeaders() })
    .then((response) => response.json().catch(() => null).then((data) => {
      if (!response.ok) throw new Error(data?.error || 'Could not load payment submissions.')
      setPayments(Array.isArray(data) ? data : [])
      setMessage('')
    }))
    .catch((error) => {
      setMessage(error.message || 'Could not load payment submissions.')
    }), [])

  const loadFees = useCallback(() => Promise.all([
    fetch('/api/students', { headers: getApiAuthHeaders() }).then((response) => response.json().catch(() => null).then((body) => ({ response, body }))),
    fetch('/api/payments/summary', { headers: getApiAuthHeaders() }).then((response) => response.json().catch(() => null).then((body) => ({ response, body }))),
  ])
    .then(([studentsResult, summaryResult]) => {
      if (!studentsResult.response.ok) throw new Error(studentsResult.body?.error || 'Could not load students.')
      if (!summaryResult.response.ok) throw new Error(summaryResult.body?.error || 'Could not load fee balances.')
      setStudents(Array.isArray(studentsResult.body) ? studentsResult.body : [])
      setSummaryEntries(Array.isArray(summaryResult.body?.students) ? summaryResult.body.students : [])
      setFeeMessage('')
    })
    .catch((error) => {
      setFeeMessage(error.message || 'Could not load fee setup data.')
    }), [])

  useEffect(() => {
    load()
    loadFees()
  }, [load, loadFees])

  const review = async (payment, status) => {
    const response = await fetch(`/api/payments/${payment.id}`, { method: 'PATCH', headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ status }) })
    const updated = await response.json().catch(() => null)
    if (!response.ok) return setMessage(updated?.error || 'Could not update payment.')
    setPayments((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setMessage(`${updated.receiptNo || updated.id} marked ${status.toLowerCase()}.`)
    loadFees()
  }

  const saveFee = async (student) => {
    const raw = feeDrafts[String(student.id)]
    if (raw === undefined) return
    const trimmed = String(raw).trim()
    const totalFee = trimmed === '' ? null : Number(trimmed)
    if (totalFee !== null && (!Number.isFinite(totalFee) || totalFee < 0)) {
      setFeeMessage('Enter a valid total fee amount.')
      return
    }
    setSavingFeeId(String(student.id))
    try {
      const response = await fetch(`/api/students/${encodeURIComponent(student.id)}/fee`, {
        method: 'PATCH',
        headers: getApiAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ totalFee }),
      })
      const updated = await response.json().catch(() => null)
      if (!response.ok) throw new Error(updated?.error || 'Could not save the total fee.')
      setFeeDrafts((current) => {
        const next = { ...current }
        delete next[String(student.id)]
        return next
      })
      await loadFees()
      setFeeMessage(totalFee === null
        ? `Total fee cleared for ${student.title || student.name || student.id}.`
        : `Total fee set to ${formatRupees(totalFee)} for ${student.title || student.name || student.id}.`)
    } catch (error) {
      setFeeMessage(error.message || 'Could not save the total fee.')
    } finally {
      setSavingFeeId('')
    }
  }

  const summaryFor = (student) => summaryEntries.find((entry) => entry.student && String(entry.student.id) === String(student.id)) || null

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter((student) => [student.title, student.name, student.subtitle, student.className, student.rollNo].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [students, query])

  return <section className="payment-review-page">
    <header className="payment-review-hero"><div><p className="admin-kicker">Finance control</p><h2>Payment verification</h2><p>Set each student's total fee, then review parent UTR submissions to confirm receipts and update fee balances.</p></div><span className="payment-review-count">{payments.filter((payment) => payment.status === 'Verification pending').length} pending</span></header>
    <article className="payment-review-fees">
      <div className="fee-setup-head">
        <div><p className="admin-kicker">Fee setup</p><h3>Student fee accounts</h3><p>Total fee set here drives the parent portal balance (total fee − verified payments).</p></div>
        <input className="fee-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student or class..." />
      </div>
      {feeMessage ? <p className="payment-review-message">{feeMessage}</p> : null}
      <div className="fee-setup-table">
        <table>
          <thead><tr><th>Student</th><th>Class / Roll</th><th>Total fee (₹)</th><th>Paid</th><th>Pending</th><th>Balance</th><th></th></tr></thead>
          <tbody>
            {visibleStudents.map((student) => {
              const entry = summaryFor(student)
              const draft = feeDrafts[String(student.id)]
              const rawTotal = entry ? entry.totalFee : student.totalFee
              const currentFee = rawTotal === null || rawTotal === undefined || rawTotal === '' || !Number.isFinite(Number(rawTotal)) ? null : Number(rawTotal)
              return <tr key={student.id}>
                <td><strong>{student.title || student.name || student.id}</strong></td>
                <td>{student.subtitle || student.className || '—'} · Roll {student.rollNo || '—'}</td>
                <td><input type="number" min="0" className="fee-input" value={draft ?? (currentFee === null ? '' : String(currentFee))} placeholder="Not set" onChange={(event) => setFeeDrafts((current) => ({ ...current, [String(student.id)]: event.target.value }))} /></td>
                <td className="fee-paid">{formatRupees(entry?.paid)}</td>
                <td>{entry && entry.pending > 0 ? formatRupees(entry.pending) : '—'}</td>
                <td className="fee-balance">{formatRupees(entry?.balance)}</td>
                <td><button type="button" className="small-action" disabled={savingFeeId === String(student.id) || draft === undefined} onClick={() => saveFee(student)}>{savingFeeId === String(student.id) ? 'Saving…' : 'Save'}</button></td>
              </tr>
            })}
          </tbody>
        </table>
        {!visibleStudents.length ? <p className="payment-review-empty">{students.length ? 'No student matches your search.' : 'No students found. Add students first.'}</p> : null}
      </div>
    </article>
    <article className="payment-review-table-card">
      <p className="admin-kicker">UTR submissions</p>
      {message ? <p className="payment-review-message">{message}</p> : null}
      <div className="payment-review-table"><table><thead><tr><th>Receipt</th><th>Student</th><th>Parent</th><th>Amount</th><th>UTR / Reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><strong>{payment.receiptNo || payment.id}</strong><small>{new Date(payment.createdAt).toLocaleString()}</small></td><td>{payment.studentName || '—'}<small>{payment.className || '—'} · Roll {payment.rollNo || '—'}</small></td><td>{payment.parentName || '—'}</td><td>₹{Number(payment.amount).toLocaleString('en-IN')}</td><td><code>{payment.reference}</code></td><td><span className={`payment-status payment-status--${String(payment.status).toLowerCase().replaceAll(' ', '-')}`}>{payment.status}</span></td><td><div className="payment-review-actions"><button type="button" onClick={() => review(payment, 'Verified')} disabled={payment.status === 'Verified'}>Verify</button><button type="button" onClick={() => review(payment, 'Rejected')} disabled={payment.status === 'Rejected'}>Reject</button></div></td></tr>)}</tbody></table>{!payments.length && !message ? <p className="payment-review-empty">No payment submissions yet.</p> : null}</div>
    </article>
  </section>
}
