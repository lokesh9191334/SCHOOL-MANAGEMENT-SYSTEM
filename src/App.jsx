import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import './App-premium.css'
import './styles/global.css'
import './styles/modules-premium.css'

import DashboardPage from './pages/dashboard'
import LoginPage from './pages/auth/login'
import RegisterPage from './pages/auth/register'
import ForgotPasswordPage from './pages/auth/forgotPassword'

import FeatureWorkspacePage from './pages/FeatureWorkspacePage'
import { FEATURE_WORKSPACES } from './utils/constants'

import StudentsPage from './pages/students/index'
import AdmissionFormPage from './pages/students/AdmissionFormPage'
import StudentDataFilesPage from './pages/students/dataFiles'
import IDCardPage from './pages/students/idCard'

import TeachersPage from './pages/teachers/index'
import AddTeacherPage from './pages/teachers/add'
import TeacherProfilePage from './pages/teachers/profile'

import AttendancePage from './pages/attendance/index'
import AttendanceReportPage from './pages/attendance/report'

import TransportPage from './pages/transport/index'
import TransportRoutesPage from './pages/transport/routes'
import TransportDriversPage from './pages/transport/drivers'

import ExaminationPage from './pages/examination/index'
import ExaminationSchedulePage from './pages/examination/schedule'
import ExaminationResultsPage from './pages/examination/results'
import ExaminationGradingPage from './pages/examination/grading'

import FeesPage from './pages/fees/index'
import FeesPaymentsPage from './pages/fees/payments'
import FeesReportsPage from './pages/fees/reports'

import TimetablePage from './pages/academics/timetable'
import LibraryPage from './pages/library/index'

import SettingsProfilePage from './pages/settings/profile'
import LogoutPage from './pages/settings/logout'
import NotFoundPage from './pages/notFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth">
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate replace to="/dashboard" />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/students/add" element={<AdmissionFormPage />} />
          <Route path="/students/admission-form" element={<AdmissionFormPage />} />

          {FEATURE_WORKSPACES.filter((ws) => !['/students/admission-form', '/students/id-card', '/students/attendance', '/attendance/students'].includes(ws.to)).map((ws) => (
            <Route
              key={ws.to}
              path={ws.to}
              element={
                <FeatureWorkspacePage
                  kicker={ws.section}
                  title={ws.label}
                  description={ws.description}
                  actions={ws.actions ?? []}
                  metrics={ws.metrics ?? []}
                  highlights={ws.highlights ?? []}
                  checklist={ws.checklist ?? []}
                />
              }
            />
          ))}

          <Route path="/students">
            <Route index element={<StudentsPage />} />
            <Route path="list" element={<StudentsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="id-card" element={<IDCardPage />} />
            <Route path="data-files" element={<StudentDataFilesPage />} />
          </Route>

          <Route path="/teachers">
            <Route index element={<TeachersPage />} />
            <Route path="list" element={<TeachersPage />} />
            <Route path="add" element={<AddTeacherPage />} />
            <Route path="profile" element={<TeacherProfilePage />} />
          </Route>

          <Route path="/attendance">
            <Route index element={<AttendancePage />} />
            <Route path="students" element={<AttendancePage />} />
            <Route path="report" element={<AttendanceReportPage />} />
          </Route>

          <Route path="/transport">
            <Route index element={<TransportPage />} />
            <Route path="routes" element={<TransportRoutesPage />} />
            <Route path="drivers" element={<TransportDriversPage />} />
          </Route>

          <Route path="/examination">
            <Route index element={<ExaminationPage />} />
            <Route path="schedule" element={<ExaminationSchedulePage />} />
            <Route path="results" element={<ExaminationResultsPage />} />
            <Route path="grading" element={<ExaminationGradingPage />} />
          </Route>

          <Route path="/fees">
            <Route index element={<FeesPage />} />
            <Route path="payments" element={<FeesPaymentsPage />} />
            <Route path="reports" element={<FeesReportsPage />} />
          </Route>

          <Route path="/academics/timetable" element={<TimetablePage />} />
          <Route path="/library" element={<LibraryPage />} />

          <Route path="/settings">
            <Route path="profile" element={<SettingsProfilePage />} />
            <Route path="security" element={<SettingsProfilePage />} />
            <Route path="logout" element={<LogoutPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
