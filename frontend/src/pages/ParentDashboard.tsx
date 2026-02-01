import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Breadcrumb } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
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
  children: Array<{
    name: string;
    class: string;
    roll_no: string;
  }>;
}

const ParentDashboard: React.FC = () => {
  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

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

  const stats = [
    { title: 'My Students', value: data.students_count, icon: 'fas fa-user-graduate', color: 'primary' },
    { title: 'Today Attendance', value: 'Present', icon: 'fas fa-calendar-check', color: 'success' },
    { title: 'Next Payment', value: '₹5,000', icon: 'fas fa-money-bill-wave', color: 'warning' },
    { title: 'Notifications', value: '3 New', icon: 'fas fa-bell', color: 'info' },
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
        <Card className="mb-4 shadow-sm border-0 welcome-card text-white" style={{ background: 'var(--primary-gradient)', borderRadius: '15px' }}>
          <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center p-4">
            <div>
              <h2 className="mb-2">
                <i className="fas fa-house-user me-2"></i>
                Welcome, {data.user.name}!
              </h2>
              <p className="mb-0 opacity-75">
                Track your child's attendance, fees, performance and stay connected with teachers.
              </p>
            </div>
            <div className="mt-3 mt-md-0 d-flex gap-2">
              <button className="btn btn-light btn-sm text-primary fw-bold" onClick={() => navigate('/leave-application')}>
                <i className="fas fa-calendar-minus me-1"></i>Send Leave
              </button>
              <button className="btn btn-outline-light btn-sm" onClick={() => navigate('/complaints')}>
                <i className="fas fa-exclamation-triangle me-1"></i>File Complaint
              </button>
            </div>
          </Card.Body>
        </Card>

        {/* Stats Grid */}
        <Row className="mb-4">
          {stats.map((stat, idx) => (
            <Col key={idx} xl={3} md={6} className="mb-4">
              <Card className={`border-left-${stat.color} shadow h-100 py-2 border-0`}>
                <Card.Body>
                  <Row className="align-items-center no-gutters">
                    <Col className="mr-2">
                      <div className={`text-xs font-weight-bold text-${stat.color} text-uppercase mb-1`}>
                        {stat.title}
                      </div>
                      <div className="h4 mb-0 font-weight-bold text-gray-800">{stat.value}</div>
                    </Col>
                    <Col xs="auto" className="text-gray-300">
                      <i className={`${stat.icon} fa-2x`}></i>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <Row>
          <Col lg={8}>
            <Card className="shadow-sm mb-4 border-0">
              <Card.Header className="py-3 bg-white border-0">
                <h6 className="m-0 font-weight-bold text-primary">My Children</h6>
              </Card.Header>
              <Card.Body>
                {data.children && data.children.length > 0 ? (
                  data.children.map((child, idx) => (
                    <Card key={idx} className="mb-3 border-0 bg-light">
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                            <i className="fas fa-user-graduate fa-lg"></i>
                          </div>
                          <div>
                            <h6 className="mb-1">{child.name}</h6>
                            <p className="text-muted small mb-0">Class: {child.class} | Roll No: {child.roll_no}</p>
                          </div>
                          <div className="ms-auto">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => navigate(`/student-performance`)}>
                              View Report
                            </button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-user-slash fa-3x text-light mb-3"></i>
                    <p className="text-muted">No students linked to your account.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="shadow-sm mb-4 border-0">
              <Card.Header className="py-3 bg-white border-0">
                <h6 className="m-0 font-weight-bold text-primary">Quick Actions</h6>
              </Card.Header>
              <Card.Body>
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-primary text-start p-3" onClick={() => navigate('/student-performance')}>
                    <i className="fas fa-chart-line me-2"></i> View Performance
                  </button>
                  <button className="btn btn-outline-success text-start p-3" onClick={() => navigate('/fees-payment')}>
                    <i className="fas fa-wallet me-2"></i> Pay Fees
                  </button>
                  <button className="btn btn-outline-info text-start p-3" onClick={() => navigate('/leave-application')}>
                    <i className="fas fa-envelope-open-text me-2"></i> Apply for Leave
                  </button>
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
