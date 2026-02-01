import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ParentDashboard from './pages/ParentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Layout from './components/Layout';
import './App.css';

const PlaceholderPage = ({ title }: { title: string }) => (
  <Layout title={title}>
    <div className="text-center py-5">
      <i className="fas fa-tools fa-4x text-muted mb-4"></i>
      <h2>{title}</h2>
      <p className="text-muted">This page is coming soon. We are working hard to bring it to you!</p>
    </div>
  </Layout>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Protected Routes */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/teachers" element={<TeacherDashboard />} />
        <Route path="/parents" element={<ParentDashboard />} />
        
        {/* Placeholder Routes for Sidebar items */}
        <Route path="/events" element={<PlaceholderPage title="Events" />} />
        <Route path="/students/add" element={<PlaceholderPage title="Student Registration" />} />
        <Route path="/students" element={<PlaceholderPage title="Students" />} />
        <Route path="/classes" element={<PlaceholderPage title="Classes" />} />
        <Route path="/subjects" element={<PlaceholderPage title="Subjects" />} />
        <Route path="/attendance" element={<PlaceholderPage title="Attendance" />} />
        <Route path="/fees" element={<PlaceholderPage title="Fees" />} />
        <Route path="/salaries" element={<PlaceholderPage title="Salaries" />} />
        <Route path="/profile" element={<PlaceholderPage title="Profile" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="/activity-log" element={<PlaceholderPage title="Activity Log" />} />
        <Route path="/help" element={<PlaceholderPage title="Help" />} />

        {/* Catch all - Redirect to login or show 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
