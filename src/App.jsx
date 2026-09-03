import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import RequireAuth from './components/RequireAuth'
import InstallApp from './components/InstallApp'
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
import SettingsProfilePage from './pages/settings/profile'
import LogoutPage from './pages/settings/logout'
import NotFoundPage from './pages/notFound'

import SuperAdminHome from './pages/role/SuperAdminHome'
import TeacherHome from './pages/role/TeacherHome'
import ParentHome from './pages/role/ParentHome'
import ExamMarksStudio from './pages/teacher/ExamMarksStudio'
import PremiumReportCard from './pages/teacher/PremiumReportCard'
import ParentOnlinePaymentPage from './pages/parent/OnlinePaymentPage'
import AIAssistantPage from './pages/ai-assistant'
import PaymentReviewPage from './pages/fees/PaymentReviewPage'
import SchoolRequestsPage from './pages/super-admin/SchoolRequestsPage'

const SPECIAL_PATHS = new Set([
  '/dashboard',
  '/students',
  '/students/list',
  '/students/add',
  '/academics/timetable',
  '/settings/profile',
  '/settings/logout',
  '/super-admin',
  '/teacher',
  '/parent',
  '/teacher/exams/marks',
  '/teacher/exams/report-cards',
  '/ai-assistant',
  '/parent/fees/online',
  '/fees/online-payments',
  '/super-admin/school-requests',
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
      <Routes>
        <Route path="/auth">
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<RoleHomeRedirect />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            <Route path="/super-admin" element={<SuperAdminHome />} />
            <Route path="/teacher" element={<TeacherHome />} />
            <Route path="/parent" element={<ParentHome />} />

            <Route path="/teacher/exams/marks" element={<ExamMarksStudio />} />
            <Route path="/teacher/exams/report-cards" element={<PremiumReportCard />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/parent/fees/online" element={<ParentOnlinePaymentPage />} />
            <Route path="/fees/online-payments" element={<PaymentReviewPage />} />
            <Route path="/super-admin/school-requests" element={<SchoolRequestsPage />} />

            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/list" element={<StudentsPage />} />
            <Route path="/students/add" element={<AdmissionFormPage />} />

            <Route path="/academics/timetable" element={<TimetablePage />} />

            <Route path="/settings/profile" element={<SettingsProfilePage />} />
            <Route path="/settings/logout" element={<LogoutPage />} />

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
