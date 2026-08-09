import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_FEE_PAYMENTS } from '../../data/seed'

const FeesPaymentsPage = () => {
  const [payments, setPayments] = usePersistentState(STORAGE_KEYS.fees, SEED_FEE_PAYMENTS)
  const [student, setStudent] = useState('')
  const [amount, setAmount] = useState('')

  const addPayment = (e) => {
    e.preventDefault()
    if (!student.trim() || !amount.trim()) return
    const n = Number(amount)
    if (Number.isNaN(n) || n <= 0) return
    setPayments((prev) => [
      {
        id: `PAY-${Date.now()}`,
        student: student.trim(),
        term: 'Ad-hoc',
        amount: n,
        status: 'Paid',
        date: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ])
    setStudent('')
    setAmount('')
  }

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Cashier</p>
        <h2>Record payment</h2>
        <p>Post a receipt against any guardian account. Updates sync back to the fee dashboard.</p>
        <div className="link-row">
          <Link className="link-pill" to="/fees">
            Overview
          </Link>
          <Link className="link-pill" to="/fees/reports">
            Reports
          </Link>
        </div>
      </div>

      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Quick entry</p>
            <h3>New receipt</h3>
          </div>
        </div>
        <form className="module-form" onSubmit={addPayment}>
          <div className="module-form-grid">
            <label className="form-field">
              <span>Student name</span>
              <input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="As on invoice" />
            </label>
            <label className="form-field">
              <span>Amount (₹)</span>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="18500" />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="header-action primary">
              Post payment
            </button>
          </div>
        </form>
      </article>

      <article className="panel-card data-panel">
        <div className="panel-header">
          <h3>Latest receipts</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Term</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.student}</td>
                  <td>{p.term}</td>
                  <td>₹{p.amount.toLocaleString('en-IN')}</td>
                  <td>
                    <span className={`status-pill ${p.status === 'Paid' ? 'success' : 'warning'}`}>{p.status}</span>
                  </td>
                  <td>{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}

export default FeesPaymentsPage
