import React, { type ReactNode, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container } from 'react-bootstrap';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="wrapper">
      {/* Sidebar */}
      <nav id="sidebar" className={sidebarOpen ? '' : 'active'}>
        <div className="user-profile px-4 py-3 bg-white bg-opacity-10 rounded mx-3 my-2">
          <div className="d-flex align-items-center">
            <div className="profile-pic me-3">
              <div className="d-flex align-items-center justify-content-center bg-primary text-white rounded-circle" 
                   style={{ width: '45px', height: '45px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                L
              </div>
            </div>
            <div className="profile-info">
              <h4 className="mb-0 text-sm font-weight-semibold">Lokesh Kumar</h4>
              <p className="text-xs text-muted mb-0">Admin</p>
            </div>
          </div>
        </div>

        <ul className="list-unstyled components py-2">
          {/* Dashboard Section */}
          <li className="menu-section">
            <div className="section-title px-4 py-2 text-xs font-weight-bold text-uppercase text-muted">Dashboard</div>
            <ul className="list-unstyled menu-items">
              <li className={isActive('/') || isActive('/admin') ? 'active' : ''}>
                <Link to="/admin">
                  <i className="fas fa-home"></i>
                  <span>Home</span>
                </Link>
              </li>
              <li className={isActive('/admin') ? 'active' : ''}>
                <Link to="/admin">
                  <i className="fas fa-tachometer-alt"></i>
                  <span>Dashboard</span>
                </Link>
              </li>
              <li className={isActive('/events') ? 'active' : ''}>
                <Link to="/events">
                  <i className="fas fa-calendar-alt"></i>
                  <span>Events</span>
                </Link>
              </li>
            </ul>
          </li>

          {/* Student Management */}
          <li className="menu-section">
            <div className="section-title px-4 py-2 text-xs font-weight-bold text-uppercase text-muted">Student Management</div>
            <ul className="list-unstyled menu-items">
              <li className={isActive('/students/add') ? 'active' : ''}>
                <Link to="/students/add">
                  <i className="fas fa-user-plus"></i>
                  <span>Student Registration</span>
                </Link>
              </li>
              <li className={isActive('/students') ? 'active' : ''}>
                <Link to="/students">
                  <i className="fas fa-user-graduate"></i>
                  <span>Students</span>
                </Link>
              </li>
            </ul>
          </li>

          {/* Academic Management */}
          <li className="menu-section">
            <div className="section-title px-4 py-2 text-xs font-weight-bold text-uppercase text-muted">Academic Management</div>
            <ul className="list-unstyled menu-items">
              <li className={isActive('/teachers') ? 'active' : ''}>
                <Link to="/teachers">
                  <i className="fas fa-chalkboard-teacher"></i>
                  <span>Teachers</span>
                </Link>
              </li>
              <li className={isActive('/classes') ? 'active' : ''}>
                <Link to="/classes">
                  <i className="fas fa-school"></i>
                  <span>Classes</span>
                </Link>
              </li>
              <li className={isActive('/subjects') ? 'active' : ''}>
                <Link to="/subjects">
                  <i className="fas fa-book"></i>
                  <span>Subjects</span>
                </Link>
              </li>
              <li className={isActive('/attendance') ? 'active' : ''}>
                <Link to="/attendance">
                  <i className="fas fa-calendar-check"></i>
                  <span>Attendance</span>
                </Link>
              </li>
            </ul>
          </li>

          {/* Finance */}
          <li className="menu-section">
            <div className="section-title px-4 py-2 text-xs font-weight-bold text-uppercase text-muted">Finance</div>
            <ul className="list-unstyled menu-items">
              <li className={isActive('/fees') ? 'active' : ''}>
                <Link to="/fees">
                  <i className="fas fa-money-bill-wave"></i>
                  <span>Fees</span>
                </Link>
              </li>
              <li className={isActive('/salaries') ? 'active' : ''}>
                <Link to="/salaries">
                  <i className="fas fa-hand-holding-usd"></i>
                  <span>Salaries</span>
                </Link>
              </li>
            </ul>
          </li>

          {/* System */}
          <li className="menu-section">
            <div className="section-title px-4 py-2 text-xs font-weight-bold text-uppercase text-muted">System</div>
            <ul className="list-unstyled menu-items">
              <li className={isActive('/profile') ? 'active' : ''}>
                <Link to="/profile">
                  <i className="fas fa-user-circle"></i>
                  <span>Profile</span>
                </Link>
              </li>
              <li className={isActive('/settings') ? 'active' : ''}>
                <Link to="/settings">
                  <i className="fas fa-cog"></i>
                  <span>Settings</span>
                </Link>
              </li>
              <li className={isActive('/activity-log') ? 'active' : ''}>
                <Link to="/activity-log">
                  <i className="fas fa-history"></i>
                  <span>Activity Log</span>
                </Link>
              </li>
              <li className={isActive('/help') ? 'active' : ''}>
                <Link to="/help">
                  <i className="fas fa-question-circle"></i>
                  <span>Help</span>
                </Link>
              </li>
            </ul>
          </li>
        </ul>

        <div className="logout-section mt-auto">
          <Nav.Link onClick={handleLogout} className="logout-link">
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </Nav.Link>
        </div>
      </nav>

      {/* Main Content */}
      <div id="content" className={sidebarOpen ? '' : 'active'}>
        <Navbar bg="white" expand="lg" className="shadow-sm mb-4">
          <Container fluid>
            <button 
              type="button" 
              id="sidebarCollapse" 
              className="btn btn-primary"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <i className="fas fa-align-left"></i>
            </button>
            <Navbar.Brand className="ms-3">{title}</Navbar.Brand>
            <Nav className="ms-auto">
              <Nav.Link className="text-primary font-weight-bold">
                <i className="fas fa-user-shield me-1"></i> Admin Portal
              </Nav.Link>
            </Nav>
          </Container>
        </Navbar>

        <div className="container-fluid">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
