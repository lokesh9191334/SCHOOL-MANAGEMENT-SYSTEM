import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [accountType, setAccountType] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        school_id: schoolId,
        account_type: accountType,
        remember,
      });

      if (response.data.success) {
        // Redirect based on role
        const role = response.data.user.role;
        if (role === 'admin') navigate('/admin');
        else if (role === 'teacher') navigate('/teachers');
        else if (role === 'parent') navigate('/parents');
      } else {
        setError(response.data.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-body">
      <div className="premium-bg"></div>
      
      <div className="floating-particles">
        {[...Array(9)].map((_, i) => (
          <div 
            key={i} 
            className="particle" 
            style={{ 
              left: `${(i + 1) * 10}%`, 
              animationDelay: `${i * 2}s` 
            }}
          ></div>
        ))}
      </div>

      <div className="main-container">
        <div className="login-container">
          <div className="logo-section">
            <div className="premium-logo">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <h1 className="brand-name">SCHOOL MANAGEMENT</h1>
            <p className="brand-tagline">Secure Access Portal</p>
          </div>

          <div className="login-form">
            <h2 className="form-title">Welcome Back</h2>
            <p className="form-subtitle">Sign in to access your dashboard</p>

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} id="loginForm">
              <div className="input-group">
                <div className="input-wrapper">
                  <i className="fas fa-envelope input-icon"></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>

              {accountType !== 'teacher' && (
                <div className="input-group" id="schoolIdGroup">
                  <div className="input-wrapper">
                    <i className="fas fa-school input-icon"></i>
                    <input
                      type="text"
                      value={schoolId}
                      onChange={(e) => setSchoolId(e.target.value)}
                      className="form-input"
                      placeholder="Enter 5-digit school ID"
                      maxLength={5}
                      pattern="[0-9]{5}"
                    />
                  </div>
                </div>
              )}

              <div className="input-group">
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="input-wrapper">
                  <i className="fas fa-user-shield input-icon"></i>
                  <select 
                    value={accountType} 
                    onChange={(e) => setAccountType(e.target.value)} 
                    className="form-select" 
                    required
                  >
                    <option value="" disabled>Choose your role</option>
                    <option value="admin">Administrator</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                  </select>
                </div>
              </div>

              <div className="form-options">
                <div className="remember-me">
                  <input 
                    type="checkbox" 
                    id="remember" 
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label htmlFor="remember">Remember me</label>
                </div>
                <Link to="/forgot-password" title="Forgot Password" className="forgot-password">
                  <i className="fas fa-key" style={{ marginRight: '5px' }}></i>Forgot Password?
                </Link>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                <i className="fas fa-sign-in-alt" style={{ marginRight: '10px' }}></i>
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </form>

            <div className="register-link-container">
              <p>Don't have an account? 
                <Link to="/register">
                  <i className="fas fa-user-plus" style={{ marginRight: '5px' }}></i>Create Account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
