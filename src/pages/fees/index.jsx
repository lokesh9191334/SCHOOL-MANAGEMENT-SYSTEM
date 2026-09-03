import { Link } from 'react-router-dom'
import { usePersistentState } from '../../hooks/usePersistentState'
import { STORAGE_KEYS } from '../../utils/constants'
import { SEED_FEE_PAYMENTS } from '../../data/seed'

const FeesPage = () => {
  const [payments] = usePersistentState(STORAGE_KEYS.fees, SEED_FEE_PAYMENTS)
  const collected = payments.reduce((sum, p) => sum + (p.status === 'Paid' ? p.amount : p.status === 'Partial' ? p.amount * 0.5 : 0), 0)
  const outstanding = payments
    .filter((p) => p.status !== 'Paid')
    .reduce((sum, p) => sum + (p.status === 'Partial' ? p.amount * 0.5 : p.amount), 0)

  return (
    <div className="sms-page-stack">
      <div className="page-card">
        <p className="admin-kicker">Finance</p>
        <h2>Fee management</h2>
        <p>Track term invoices, collections and family balances. Figures below reflect the in-browser ledger.</p>
        <div className="link-row">
          <Link className="link-pill" to="/fees/payments">
            Record payment
          </Link>
          <Link className="link-pill" to="/fees/reports">
            Reports
          </Link>
        </div>
      </div>

      <div className="content-grid">
        <article className="stat-card">
          <span>Collected</span>
          <strong>₹{collected.toLocaleString('en-IN')}</strong>
          <p className="stat-note">Posted receipts</p>
        </article>
        <article className="stat-card">
          <span>Outstanding</span>
          <strong>₹{Math.round(outstanding).toLocaleString('en-IN')}</strong>
          <p className="stat-note">Needs follow-up</p>
        </article>
        <article className="stat-card">
          <span>Invoices</span>
          <strong>{payments.length}</strong>
          <p className="stat-note">Active term</p>
        </article>
      </div>

      <article className="panel-card data-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Ledger</p>
            <h3>Recent payments</h3>
          </div>
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

export default FeesPage

