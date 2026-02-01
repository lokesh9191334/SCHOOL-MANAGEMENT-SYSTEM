import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Container, Badge, Breadcrumb } from 'react-bootstrap';
import Layout from '../components/Layout';
import api from '../services/api';

interface TeacherData {
  my_classes: number;
  my_students: number;
  assignments: number;
  attendance_rate: number;
  is_class_incharge: boolean;
  class_teacher_of: string | null;
  user: {
    name: string;
    role: string;
    email: string;
  };
}

const TeacherDashboard: React.FC = () => {
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTeacherData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const response = await api.get('/api/teachers/portal');
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load teacher portal data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  useEffect(() => {
    fetchTeacherData();
    const interval = setInterval(() => fetchTeacherData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Layout title="Teacher Portal"><div>Loading teacher portal...</div></Layout>;
  if (error) return <Layout title="Teacher Portal"><div className="alert alert-danger">{error}</div></Layout>;
  if (!data) return null;

  const stats = [
    { title: 'My Classes', value: data.my_classes, icon: 'fas fa-chalkboard', color: 'primary' },
    { title: 'My Students', value: data.my_students, icon: 'fas fa-user-graduate', color: 'success' },
    { title: 'Assignments', value: data.assignments, icon: 'fas fa-tasks', color: 'info' },
    { title: 'Attendance Rate', value: `${data.attendance_rate}%`, icon: 'fas fa-calendar-check', color: 'warning' },
  ];

  return (
    <Layout title="Teacher Portal">
      {isRefreshing && (
        <div className="auto-refresh-indicator">
          <i className="fas fa-sync-alt"></i>
          <span>Updating...</span>
        </div>
      )}

      <div className="dashboard-content">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-0 d-flex align-items-center">
              Teacher Portal
              {data.is_class_incharge && (
                <Badge bg="warning" text="dark" className="ms-3 px-3 py-2" style={{ fontSize: '0.5em' }}>
                  <i className="fas fa-star me-2"></i> Class Incharge
                </Badge>
              )}
            </h2>
            {data.class_teacher_of && (
              <p className="text-muted mb-0 mt-1">
                <i className="fas fa-book me-2"></i> Class Teacher: {data.class_teacher_of}
              </p>
            )}
          </div>
          <Breadcrumb className="mb-0">
            <Breadcrumb.Item href="#">Home</Breadcrumb.Item>
            <Breadcrumb.Item active>Teacher Portal</Breadcrumb.Item>
          </Breadcrumb>
        </div>

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
            <Card className="shadow mb-4 border-0">
              <Card.Header className="py-3 bg-white border-0">
                <h6 className="m-0 font-weight-bold text-primary">Today's Schedule</h6>
              </Card.Header>
              <Card.Body>
                <div className="text-center py-5">
                  <i className="fas fa-calendar-alt fa-3x text-gray-200 mb-3"></i>
                  <p className="text-muted">No classes scheduled for today</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            <Card className="shadow mb-4 border-0">
              <Card.Header className="py-3 bg-white border-0">
                <h6 className="m-0 font-weight-bold text-primary">Quick Actions</h6>
              </Card.Header>
              <Card.Body>
                <div className="d-grid gap-2">
                  <button className="btn btn-outline-primary text-start p-3">
                    <i className="fas fa-user-check me-2"></i> Mark Attendance
                  </button>
                  <button className="btn btn-outline-success text-start p-3">
                    <i className="fas fa-plus-circle me-2"></i> Create Assignment
                  </button>
                  <button className="btn btn-outline-info text-start p-3">
                    <i className="fas fa-bullhorn me-2"></i> Post Announcement
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

export default TeacherDashboard;
