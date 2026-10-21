import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import RequireAuth from './components/RequireAuth'
import InstallApp from './components/InstallApp'
import PersistenceNotice from './components/PersistenceNotice'
import './App-premium.css'
import './styles/global.css'
import './styles/modules-premium.css'

import DashboardPage from './pages/dashboard'
import LoginPage from './pages/auth/login'
import RegisterPage from './pages/auth/register'
import ForgotPasswordPage from './pages/auth/forgotPassword'

import ModulePage from './pages/ModulePage'
import { getModulePaths } from './data/moduleRegistry'
import { homePathForRole } from './data/roleNav'
import { getAuthUser } from './utils/session'

import StudentsPage from './pages/students/index'
import AdmissionFormPage from './pages/students/AdmissionFormPage'

import TimetablePage from './pages/academics/timetable'
import DatesheetPage from './pages/academics/datesheet'
import AcademicDocumentsPage from './pages/academics/documents'
import SettingsProfilePage from './pages/settings/profile'
import SettingsPage from './pages/settings'
import LogoutPage from './pages/settings/logout'
import NotFoundPage from './pages/notFound'
import LoginTracksPage from './pages/security/LoginTracks'
import StaffFaceAttendancePage from './pages/staff/StaffFaceAttendance'
import LiveTransportPage from './pages/transport/LiveTransport'
import DriverTrackPage from './pages/track/DriverTrack'

import SuperAdminHome from './pages/role/SuperAdminHome'
import TeacherHome from './pages/role/TeacherHome'
import ParentHome from './pages/role/ParentHome'
import ExamMarksStudio from './pages/teacher/ExamMarksStudio'
import PremiumReportCard from './pages/teacher/PremiumReportCard'
import ParentOnlinePaymentPage from './pages/parent/OnlinePaymentPage'
import ParentResultsPage from './pages/parent/ResultsPage'
import EventsBuilder from './pages/admin/EventsBuilder'
import EventsBoard from './pages/shared/EventsBoard'
import AIAssistantPage from './pages/ai-assistant'
import PaymentReviewPage from './pages/fees/PaymentReviewPage'
import SchoolRequestsPage from './pages/super-admin/SchoolRequestsPage'

const SPECIAL_PATHS = new Set([
  '/dashboard',
  '/students',
  '/students/list',
  '/students/add',
  '/academics/timetable',
  '/academics/datesheet',
  '/academics/documents',
  '/parent/academics',
  '/super-admin/academics',
  '/settings',
  '/settings/profile',
  '/settings/logout',
  '/settings/security',
  '/settings/password',
  '/settings/theme',
  '/settings/language',
  '/super-admin',
  '/teacher',
  '/parent',
  '/teacher/exams/marks',
  '/teacher/exams/results',
  '/teacher/results',
  '/teacher/exams/report-cards',
  '/parent/results',
  '/ai-assistant',
  '/parent/fees/online',
  '/parent/fees/pending',
  '/parent/fees/receipts',
  '/parent/fees/installments',
  '/fees/online-payments',
  '/super-admin/school-requests',
  '/notices/events',
  '/teacher/events',
  '/parent/events',
])

const modulePaths = getModulePaths().filter((path) => !SPECIAL_PATHS.has(path))

function RoleHomeRedirect() {
  const user = getAuthUser()
  if (!user) return <Navigate replace to="/auth/login" />
  return <Navigate replace to={homePathForRole(user?.role)} />
}

function App() {
  return (
    <BrowserRouter>
      <InstallApp />
      <PersistenceNotice />
      <Routes>
        <Route path="/auth">
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route path="/track/:key" element={<DriverTrackPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<RoleHomeRedirect />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/super-admin" element={<SuperAdminHome />} />
            <Route path="/teacher" element={<TeacherHome />} />
            <Route path="/parent" element={<ParentHome />} />

            <Route path="/teacher/exams/marks" element={<ExamMarksStudio />} />
            <Route path="/teacher/exams/results" element={<ExamMarksStudio />} />
            <Route path="/teacher/results" element={<ExamMarksStudio />} />
            <Route path="/teacher/exams/report-cards" element={<PremiumReportCard />} />
            <Route path="/parent/results" element={<ParentResultsPage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/parent/fees/online" element={<ParentOnlinePaymentPage />} />
            <Route path="/parent/fees/pending" element={<Navigate replace to="/parent/fees/online" />} />
            <Route path="/parent/fees/receipts" element={<Navigate replace to="/parent/fees/online" />} />
            <Route path="/parent/fees/installments" element={<Navigate replace to="/parent/fees/online" />} />
            <Route path="/fees/online-payments" element={<PaymentReviewPage />} />
            <Route path="/super-admin/school-requests" element={<SchoolRequestsPage />} />

            <Route path="/notices/events" element={<EventsBuilder />} />
            <Route path="/teacher/events" element={<EventsBoard title="Teacher platform" subtitle="School events, meetings and programs for your planning." />} />
            <Route path="/parent/events" element={<EventsBoard title="Parent portal" subtitle="Meetings, functions and celebrations at your child's school." />} />

            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/list" element={<StudentsPage />} />
            <Route path="/students/add" element={<AdmissionFormPage />} />

            <Route path="/academics/timetable" element={<TimetablePage />} />
            <Route path="/academics/datesheet" element={<DatesheetPage />} />
            <Route path="/academics/documents" element={<AcademicDocumentsPage />} />
            <Route path="/parent/academics" element={<AcademicDocumentsPage />} />
            <Route path="/super-admin/academics" element={<AcademicDocumentsPage />} />

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/profile" element={<SettingsProfilePage />} />
            <Route path="/settings/logout" element={<LogoutPage />} />
            <Route path="/settings/security" element={<Navigate replace to="/settings" />} />
            <Route path="/settings/password" element={<Navigate replace to="/settings" />} />
            <Route path="/settings/theme" element={<Navigate replace to="/settings" />} />
            <Route path="/settings/language" element={<Navigate replace to="/settings" />} />

            <Route path="/security/login-tracks" element={<LoginTracksPage />} />
            <Route path="/attendance/staff-face" element={<StaffFaceAttendancePage />} />
            <Route path="/transport/live" element={<LiveTransportPage />} />

            {modulePaths.map((path) => (
              <Route key={path} path={path} element={<ModulePage />} />
            ))}
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
