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
      const response = await api.get('/parents/');
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

        <Row className="g-4">
          {/* Left: Parent Profile / Navigation */}
          <Col lg={4} xl={3}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body className="text-center">
                <div className="mb-3">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${data.user.name}&background=4e73df&color=fff`}
                    className="rounded-circle border border-3 border-primary-subtle shadow-sm"
                    width="80" height="80" alt="Parent Avatar"
                  />
                </div>
                <h5 className="mb-1">{data.user.name}</h5>
                <p className="text-muted small mb-3">{data.user.email}</p>
                <Badge pill bg="primary" className="mb-3 px-3 py-2">
                  <i className="fas fa-user-shield me-1"></i> Parent Portal
                </Badge>

                <ListGroup variant="flush" className="text-start mt-2 border-top pt-2">
                  {navItems.map((item, idx) => (
                    <ListGroup.Item 
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
            <Row className="g-4 mb-4">
              <Col md={6}>
                <Card className="border-left-primary shadow h-100 py-2 border-0">
                  <Card.Body>
                    <Row className="align-items-center no-gutters">
                      <Col className="mr-2">
                        <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                          Enrolled Children
                        </div>
                        <div className="h4 mb-0 font-weight-bold text-gray-800">{data.students_count}</div>
                      </Col>
                      <Col xs="auto" className="text-gray-300">
                        <i className="fas fa-users fa-2x"></i>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-left-success shadow h-100 py-2 border-0">
                  <Card.Body>
                    <Row className="align-items-center no-gutters">
                      <Col className="mr-2">
                        <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                          Average Attendance
                        </div>
                        <div className="h4 mb-0 font-weight-bold text-gray-800">{data.attendance_rate}%</div>
                      </Col>
                      <Col xs="auto" className="text-gray-300">
                        <i className="fas fa-calendar-check fa-2x"></i>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Card className="shadow mb-4 border-0">
              <Card.Header className="py-3 bg-white border-0">
                <h6 className="m-0 font-weight-bold text-primary">Recent Notifications</h6>
              </Card.Header>
              <Card.Body>
                <div className="text-center py-5">
                  <i className="fas fa-bell fa-3x text-gray-200 mb-3"></i>
                  <p className="text-muted">No new notifications</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Layout>
  );
};

export default ParentDashboard;
