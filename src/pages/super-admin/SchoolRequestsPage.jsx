import { useEffect, useState } from 'react'
import './SchoolRequestsPage.css'

const plans = ['Starter', 'Growth', 'Enterprise']

export default function SchoolRequestsPage() {
  const [requests, setRequests] = useState([])
  const [message, setMessage] = useState('Loading approval requests...')
  const load = () => fetch('/api/school-requests').then((response) => response.json()).then((data) => { setRequests(Array.isArray(data) ? data : []); setMessage('') }).catch(() => setMessage('Could not load approval requests.'))
  useEffect(load, [])

  const review = async (request, status) => {
    const plan = document.getElementById(`plan-${request.id}`)?.value || ''
    const response = await fetch(`/api/school-requests/${request.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, plan }) })
    const body = await response.json()
    if (!response.ok) return setMessage(body.error || 'Could not update request.')
    setRequests((current) => current.map((item) => (item.id === body.id ? body : item)))
    setMessage(`${body.schoolName} ${status.toLowerCase()}.`)
  }

  return <section className="school-requests-page"><header className="school-requests-hero"><div><p className="admin-kicker">Super Admin · Schools</p><h2>Approval requests</h2><p>Review verified school administrator accounts, assign a subscription, and control platform access.</p></div><strong>{requests.filter((request) => request.status === 'Pending').length} pending</strong></header>{message ? <p className="school-requests-message">{message}</p> : null}<div className="school-requests-grid">{requests.map((request) => <article className="school-request-card" key={request.id}><div className="school-request-top"><div><h3>{request.schoolName}</h3><p>{request.adminName || 'School administrator'} · {request.email}</p></div><span className={`request-status request-status--${request.status.toLowerCase()}`}>{request.status}</span></div><p className="school-request-date">Requested {new Date(request.requestedAt).toLocaleString()}</p>{request.status === 'Pending' ? <><label className="request-plan"><span>Subscription plan</span><select id={`plan-${request.id}`} defaultValue=""><option value="" disabled>Choose plan</option>{plans.map((plan) => <option key={plan}>{plan}</option>)}</select></label><div className="request-actions"><button type="button" onClick={() => review(request, 'Rejected')}>Reject</button><button type="button" className="approve" onClick={() => review(request, 'Approved')}>Approve & activate</button></div></> : <p className="school-request-plan">Assigned plan: {request.plan || 'None'}</p>}</article>)}</div>{!requests.length && !message ? <div className="school-requests-empty">No school approval requests yet.</div> : null}</section>
}