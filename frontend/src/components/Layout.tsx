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
  
  const userRole = localStorage.getItem('user_role') || 'admin';
  const userName = localStorage.getItem('user_name') || 'Lokesh Kumar';

  const handleLogout = () => {
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const renderAdminMenu = () => (
    <>
      {/* Dashboard Section */}
      <li className="menu-section">
        <div className="section-title px-4 py-2 text-xs font-weight-bold text-uppercase text-muted">Dashboard</div>
        <ul className="list-unstyled menu-items">
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
    </>
  );

  const renderTeacherMenu = () => (
    <>
      <li className="menu-section">
        <div className="section-title px-4 py-2 text-xs font-weight-bold text-uppercase text-muted">Teacher Portal</div>
        <ul className="list-unstyled menu-items">
          <li className={isActive('/teachers') ? 'active' : ''}>
            <Link to="/teachers">
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </Link>
          </li>
          <li className={isActive('/attendance') ? 'active' : ''}>
            <Link to="/attendance">
              <i className="fas fa-calendar-check"></i>
              <span>Mark Attendance</span>
            </Link>
          </li>
          <li className={isActive('/assignments') ? 'active' : ''}>
            <Link to="/assignments">
              <i className="fas fa-tasks"></i>
              <span>Assignments</span>
            </Link>
          </li>
          <li className={isActive('/timetable') ? 'active' : ''}>
            <Link to="/timetable">
              <i className="fas fa-clock"></i>
              <span>Timetable</span>
            </Link>
          </li>
        </ul>
      </li>
    </>
  );

  const renderParentMenu = () => (
    <>
      <li className="menu-section">
        <div className="section-title px-4 py-2 text-xs font-weight-bold text-uppercase text-muted">Parent Portal</div>
        <ul className="list-unstyled menu-items">
          <li className={isActive('/parents') ? 'active' : ''}>
            <Link to="/parents">
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </Link>
          </li>
          <li className={isActive('/student-performance') ? 'active' : ''}>
            <Link to="/student-performance">
              <i className="fas fa-chart-line"></i>
              <span>Performance</span>
            </Link>
          </li>
          <li className={isActive('/fees-payment') ? 'active' : ''}>
            <Link to="/fees-payment">
              <i className="fas fa-wallet"></i>
              <span>Fees & Payments</span>
            </Link>
          </li>
          <li className={isActive('/leave-application') ? 'active' : ''}>
            <Link to="/leave-application">
              <i className="fas fa-envelope-open-text"></i>
              <span>Leave Application</span>
            </Link>
          </li>
        </ul>
      </li>
    </>
  );

  return (
    <div className="wrapper">
      {/* Sidebar */}
      <nav id="sidebar" className={sidebarOpen ? '' : 'active'}>
        <div className="user-profile px-4 py-3 bg-white bg-opacity-10 rounded mx-3 my-2">
          <div className="d-flex align-items-center">
            <div className="profile-pic me-3">
              <div className="d-flex align-items-center justify-content-center bg-white text-primary rounded-circle shadow-sm" 
                   style={{ width: '45px', height: '45px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="profile-info">
              <h4 className="mb-0 text-sm font-weight-semibold text-white">{userName}</h4>
              <p className="text-xs text-white text-opacity-75 mb-0 text-capitalize">{userRole}</p>
            </div>
          </div>
        </div>

        <ul className="list-unstyled components py-2">
          {userRole === 'admin' && renderAdminMenu()}
          {userRole === 'teacher' && renderTeacherMenu()}
          {userRole === 'parent' && renderParentMenu()}

          {/* System Section (Shared) */}
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
              <Nav.Link className="text-primary font-weight-bold text-capitalize">
                <i className={`fas fa-${userRole === 'admin' ? 'user-shield' : userRole === 'teacher' ? 'chalkboard-teacher' : 'user-graduate'} me-1`}></i> 
                {userRole} Portal
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
