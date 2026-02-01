import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Container, Breadcrumb } from 'react-bootstrap';
import Layout from '../components/Layout';
import api from '../services/api';

interface DashboardData {
  total_students: number;
  total_teachers: number;
  total_female_students: number;
  total_male_students: number;
  total_subjects: number;
  total_payments: number;
  pending_fees: number;
  today_payments: number;
  recent_parent_messages: any[];
  user: {
    name: string;
    role: string;
    email: string;
  };
}

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const response = await api.get('/api/dashboard/');
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(false), 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Layout title="Admin Dashboard"><div>Loading dashboard...</div></Layout>;
  if (error) return <Layout title="Admin Dashboard"><div className="alert alert-danger">{error}</div></Layout>;
  if (!data) return null;

  const stats = [
    { title: 'Total Students', value: data.total_students, icon: 'fas fa-user-graduate', color: 'primary' },
    { title: 'Total Teachers', value: data.total_teachers, icon: 'fas fa-chalkboard-teacher', color: 'success' },
    { title: 'Total Classes', value: 30, icon: 'fas fa-school', color: 'info' },
    { title: 'Total Subjects', value: data.total_subjects, icon: 'fas fa-book', color: 'warning' },
  ];

  const financialStats = [
    { title: 'Total Revenue', value: `₹${data.total_payments.toLocaleString()}`, icon: 'fas fa-chart-line', color: 'success' },
    { title: 'Today Payments', value: `₹${data.today_payments.toLocaleString()}`, icon: 'fas fa-credit-card', color: 'primary' },
    { title: 'Pending Fees', value: data.pending_fees, icon: 'fas fa-exclamation-circle', color: 'danger' },
  ];

  return (
    <Layout title="Admin Dashboard">
      {isRefreshing && (
        <div className="auto-refresh-indicator">
          <i className="fas fa-sync-alt"></i>
          <span>Updating...</span>
        </div>
      )}

      <div className="dashboard-content">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-0">Admin Dashboard</h2>
            <p className="text-muted mb-0">Manage your school efficiently with real-time insights.</p>
          </div>
          <Breadcrumb className="mb-0">
            <Breadcrumb.Item href="#">Home</Breadcrumb.Item>
            <Breadcrumb.Item active>Dashboard</Breadcrumb.Item>
          </Breadcrumb>
        </div>

        {/* Welcome Card */}
        <Card className="mb-4 shadow-sm border-0 welcome-card text-white" style={{ background: 'var(--primary-gradient)', borderRadius: '15px' }}>
          <Card.Body className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center p-4">
            <div>
              <h2 className="mb-2">
                <i className="fas fa-user-shield me-2"></i>
                Welcome back, {data.user.name}!
              </h2>
              <p className="mb-0 opacity-75">
                You have full control over the system. Monitor students, teachers, and finances from this premium administrative portal.
              </p>
            </div>
            <div className="mt-3 mt-md-0 d-flex gap-2">
              <button className="btn btn-light btn-sm text-primary fw-bold">
                <i className="fas fa-plus-circle me-1"></i>Add Student
              </button>
              <button className="btn btn-outline-light btn-sm">
                <i className="fas fa-cog me-1"></i>Settings
              </button>
            </div>
          </Card.Body>
        </Card>

        {/* Main Stats */}
        <Row className="mb-4">
          {stats.map((stat, idx) => (
            <Col key={idx} xl={3} md={6} className="mb-4">
              <Card className={`border-left-${stat.color} shadow h-100 py-2`}>
                <Card.Body>
                  <Row className="align-items-center no-gutters">
                    <Col className="mr-2">
                      <div className={`text-xs font-weight-bold text-${stat.color} text-uppercase mb-1`}>
                        {stat.title}
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{stat.value}</div>
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

        {/* Financial Overview */}
        <h5 className="mb-3 font-weight-bold text-gray-800">Financial Overview</h5>
        <Row className="mb-4">
          {financialStats.map((stat, idx) => (
            <Col key={idx} xl={4} md={6} className="mb-4">
              <Card className={`border-left-${stat.color} shadow h-100 py-2`}>
                <Card.Body>
                  <Row className="align-items-center no-gutters">
                    <Col className="mr-2">
                      <div className={`text-xs font-weight-bold text-${stat.color} text-uppercase mb-1`}>
                        {stat.title}
                      </div>
                      <div className="h5 mb-0 font-weight-bold text-gray-800">{stat.value}</div>
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

        {/* Recent Activity / Messages */}
        <Row>
          <Col lg={6} className="mb-4">
            <Card className="shadow mb-4">
              <Card.Header className="py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 className="m-0 font-weight-bold text-primary">Recent Parent Messages</h6>
              </Card.Header>
              <Card.Body>
                {data.recent_parent_messages.length > 0 ? (
                  data.recent_parent_messages.map((msg, idx) => (
                    <div key={idx} className="mb-3 pb-3 border-bottom">
                      <div className="small text-gray-500">{msg.time_ago} days ago</div>
                      <span className="font-weight-bold">{msg.subject}</span>
                      <div className="text-truncate small">{msg.content}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted">No recent messages</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={6} className="mb-4">
            <Card className="shadow mb-4">
              <Card.Header className="py-3">
                <h6 className="m-0 font-weight-bold text-primary">Gender Distribution</h6>
              </Card.Header>
              <Card.Body>
                <div className="text-center mb-4">
                  <div className="d-flex justify-content-around">
                    <div>
                      <i className="fas fa-male fa-3x text-primary mb-2"></i>
                      <h4>{data.total_male_students}</h4>
                      <span className="text-muted">Male</span>
                    </div>
                    <div>
                      <i className="fas fa-female fa-3x text-danger mb-2"></i>
                      <h4>{data.total_female_students}</h4>
                      <span className="text-muted">Female</span>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
