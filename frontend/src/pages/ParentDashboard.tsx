import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Container, Badge, ListGroup, Breadcrumb } from 'react-bootstrap';
import Layout from '../components/Layout';
import api from '../services/api';

interface ParentData {
  students_count: number;
  attendance_rate: number;
  user: {
    name: string;
    role: string;
    email: string;
  };
}

const ParentDashboard: React.FC = () => {
  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchParentData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const response = await api.get('/api/parents/');
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load parent data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  useEffect(() => {
    fetchParentData();
    const interval = setInterval(() => fetchParentData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Layout title="Parent Dashboard"><div>Loading dashboard...</div></Layout>;
  if (error) return <Layout title="Parent Dashboard"><div className="alert alert-danger">{error}</div></Layout>;
  if (!data) return null;

  const navItems = [
    { label: 'Dashboard', icon: 'fas fa-tachometer-alt', active: true, path: '/parent' },
    { label: 'Student Details', icon: 'fas fa-user-graduate', path: '/parent/students' },
    { label: 'Send Leave', icon: 'fas fa-calendar-plus', path: '/parent/leave' },
    { label: 'File Complaint', icon: 'fas fa-exclamation-triangle', path: '/parent/complaint' },
    { label: 'Leave History', icon: 'fas fa-history', path: '/parent/leave-history' },
    { label: 'Messages', icon: 'fas fa-envelope', path: '/parent/messages' },
    { label: 'Announcements', icon: 'fas fa-bullhorn', path: '/parent/announcements' },
    { label: 'Documents', icon: 'fas fa-file-alt', path: '/parent/documents' },
    { label: 'Fee Status', icon: 'fas fa-credit-card', path: '/parent/fees' },
  ];

  return (
    <Layout title="Parent Portal">
      {isRefreshing && (
        <div className="auto-refresh-indicator">
          <i className="fas fa-sync-alt"></i>
          <span>Updating...</span>
        </div>
      )}

      <div className="dashboard-content">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Parent Portal</h2>
          <Breadcrumb className="mb-0">
            <Breadcrumb.Item href="#">Home</Breadcrumb.Item>
            <Breadcrumb.Item active>Parent Portal</Breadcrumb.Item>
          </Breadcrumb>
        </div>

        {/* Welcome Card */}
        <Card className="mb-4 shadow-sm border-0">
          <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center p-4">
            <div>
              <h2 className="mb-2">
                <i className="fas fa-house-user me-2 text-primary"></i>
                Welcome, {data.user.name}!
              </h2>
              <p className="text-muted mb-0">
                Track your child's attendance, fees, performance and stay connected with teachers – all in one premium parent portal.
              </p>
            </div>
            <div className="mt-3 mt-md-0 d-flex gap-2">
              <button className="btn btn-primary btn-sm">
                <i className="fas fa-calendar-minus me-1"></i>Send Leave
              </button>
              <button className="btn btn-warning btn-sm">
                <i className="fas fa-exclamation-triangle me-1"></i>File Complaint
              </button>
            </div>
          </Card.Body>
        </Card>

        <Row className="mb-4">
          <Col md={6} xl={3} className="mb-4">
            <Card className="border-left-primary shadow h-100 py-2 border-0">
              <Card.Body>
                <Row className="align-items-center no-gutters">
                  <Col className="mr-2">
                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Students</div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">{data.students_count}</div>
                  </Col>
                  <Col xs="auto">
                    <i className="fas fa-user-graduate fa-2x text-gray-300"></i>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} xl={3} className="mb-4">
            <Card className="border-left-success shadow h-100 py-2 border-0">
              <Card.Body>
                <Row className="align-items-center no-gutters">
                  <Col className="mr-2">
                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">Attendance</div>
                    <div className="h5 mb-0 font-weight-bold text-gray-800">{data.attendance_rate}%</div>
                  </Col>
                  <Col xs="auto">
                    <i className="fas fa-calendar-check fa-2x text-gray-300"></i>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
                      key={idx} 
                      action 
                      className={`d-flex align-items-center border-0 rounded-2 mb-1 py-2 ${item.active ? 'bg-primary text-white shadow-sm' : 'text-muted'}`}
                    >
                      <span className="me-3" style={{ width: '20px' }}><i className={item.icon}></i></span>
                      <span>{item.label}</span>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>

          {/* Right: Overview & Stats */}
          <Col lg={8} xl={9}>
            {/* Welcome Card */}
            <Card className="mb-4 shadow-sm border-0">
              <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center p-4">
                <div>
                  <h2 className="mb-2">
                    <i className="fas fa-house-user me-2 text-primary"></i>
                    Welcome, {data.user.name}!
                  </h2>
                  <p className="text-muted mb-0">
                    Track your child's attendance, fees, performance and stay connected with teachers – all in one premium parent portal.
                  </p>
                </div>
                <div className="mt-3 mt-md-0 d-flex gap-2">
                  <button className="btn btn-primary btn-sm">
                    <i className="fas fa-calendar-minus me-1"></i>Send Leave
                  </button>
                  <button className="btn btn-warning btn-sm">
                    <i className="fas fa-exclamation-triangle me-1"></i>File Complaint
                  </button>
                </div>
              </Card.Body>
            </Card>

            {/* Stats Row */}
            <Row className="g-3 mb-4">
              <Col xs={6} md={3}>
                <Card className="text-center h-100 border-0 shadow-sm p-3">
                  <h3 className="text-primary">{data.students_count}</h3>
                  <p className="mb-1 fw-bold small">Children</p>
                  <small className="text-muted" style={{ fontSize: '0.7em' }}>Linked to this account</small>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card className="text-center h-100 border-0 shadow-sm p-3">
                  <h3 className="text-success">{data.attendance_rate}%</h3>
                  <p className="mb-1 fw-bold small">Attendance</p>
                  <small className="text-muted" style={{ fontSize: '0.7em' }}>Average this month</small>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card className="text-center h-100 border-0 shadow-sm p-3">
                  <h3 className="text-info">0</h3>
                  <p className="mb-1 fw-bold small">Messages</p>
                  <small className="text-muted" style={{ fontSize: '0.7em' }}>Awaiting your reply</small>
                </Card>
              </Col>
              <Col xs={6} md={3}>
                <Card className="text-center h-100 border-0 shadow-sm p-3">
                  <h3 className="text-warning">Paid</h3>
                  <p className="mb-1 fw-bold small">Fee Status</p>
                  <small className="text-muted" style={{ fontSize: '0.7em' }}>Current academic year</small>
                </Card>
              </Col>
            </Row>

            <Row className="g-3">
              <Col md={7}>
                <Card className="shadow-sm h-100 border-0">
                  <Card.Header className="bg-white border-0 py-3 d-flex align-items-center">
                    <i className="fas fa-history me-2 text-primary"></i>
                    <h5 className="mb-0">Recent Activity</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="text-center py-5">
                      <i className="fas fa-clock fa-3x text-gray-200 mb-3"></i>
                      <p className="text-muted">No recent activity found</p>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={5}>
                <Card className="shadow-sm h-100 border-0">
                  <Card.Header className="bg-white border-0 py-3 d-flex align-items-center">
                    <i className="fas fa-bolt me-2 text-primary"></i>
                    <h5 className="mb-0">Quick Links</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="row g-2">
                      <div className="col-6">
                        <button className="btn w-100 btn-outline-primary btn-sm mb-2 text-start">
                          <i className="fas fa-user-graduate me-1"></i> Child Profile
                        </button>
                        <button className="btn w-100 btn-outline-primary btn-sm mb-2 text-start">
                          <i className="fas fa-receipt me-1"></i> Fee Summary
                        </button>
                      </div>
                      <div className="col-6">
                        <button className="btn w-100 btn-outline-primary btn-sm mb-2 text-start">
                          <i className="fas fa-calendar-day me-1"></i> Apply Leave
                        </button>
                        <button className="btn w-100 btn-outline-primary btn-sm mb-2 text-start">
                          <i className="fas fa-clock-rotate-left me-1"></i> History
                        </button>
                      </div>
                    </div>
                    <p className="text-muted small mb-0 mt-2" style={{ fontSize: '0.75em' }}>
                      Tip: Use this panel to access the most used features in just one click.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    </Layout>
  );
};

export default ParentDashboard;
