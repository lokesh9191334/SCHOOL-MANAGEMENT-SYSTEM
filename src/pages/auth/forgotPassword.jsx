import AuthLayout from '../../layouts/AuthLayout'

const ForgotPasswordPage = () => {
  return (
    <AuthLayout title="Forgot Password" description="Reset your account password using your registered email address.">
      <form className="auth-form">
        <label>
          Registered Email
          <input type="email" placeholder="name@example.com" />
        </label>
        <button type="submit" className="btn-primary">Send Reset Link</button>
      </form>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
