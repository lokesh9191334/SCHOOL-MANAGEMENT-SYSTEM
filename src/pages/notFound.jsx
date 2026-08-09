import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <div className="not-found">
      <div>
        <h1>404</h1>
        <p>This path is not mapped in SMS. Check the URL or return to your operations dashboard.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </div>
    </div>
  )
}

export default NotFoundPage
