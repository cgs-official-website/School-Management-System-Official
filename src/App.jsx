import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Loading Fallback (Sleek futuristic spinner)
const GlobalLoader = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
    <div className="relative flex justify-center items-center">
      <div className="absolute animate-ping w-16 h-16 rounded-full bg-primary-400 opacity-20"></div>
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent shadow-lg z-10"></div>
    </div>
    <p className="mt-4 text-primary-600 font-bold tracking-widest text-sm uppercase animate-pulse">Loading Zuna...</p>
  </div>
);

// --- Lazy Loaded Pages ---
// Public
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const SchoolRegistration = lazy(() => import('./pages/SchoolRegistration'));

// Super Admin Workflow
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const Overview = lazy(() => import('./pages/SuperAdmin/Overview'));
const TenantManagement = lazy(() => import('./pages/SuperAdmin/TenantManagement'));
const PlanManagement = lazy(() => import('./pages/SuperAdmin/PlanManagement'));
const LicenseUsage = lazy(() => import('./pages/SuperAdmin/LicenseUsage'));
const SupportTickets = lazy(() => import('./pages/SuperAdmin/SupportTickets'));
const AuditLogs = lazy(() => import('./pages/SuperAdmin/AuditLogs'));

// School Admin
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const EnvironmentSetup = lazy(() => import('./pages/Admin/EnvironmentSetup'));
const ClassManagement = lazy(() => import('./pages/Admin/ClassManagement'));
const StudentManagement = lazy(() => import('./pages/Admin/StudentManagement'));
const StaffAssignment = lazy(() => import('./pages/Admin/StaffAssignment'));
const LinkGenerator = lazy(() => import('./pages/Admin/LinkGenerator'));
const FeeManagement = lazy(() => import('./pages/Admin/FeeManagement'));
const TimetableManagement = lazy(() => import('./pages/Admin/TimetableManagement'));
const TransportManagement = lazy(() => import('./pages/Admin/TransportManagement'));
const LibraryManagement = lazy(() => import('./pages/Admin/LibraryManagement'));
const ExamManagement = lazy(() => import('./pages/Admin/ExamManagement'));
const Noticeboard = lazy(() => import('./pages/Admin/Noticeboard'));
const APIIntegrations = lazy(() => import('./pages/Admin/APIIntegrations'));
const BillingDashboard = lazy(() => import('./pages/Admin/BillingDashboard'));
const UpgradePlan = lazy(() => import('./pages/Admin/UpgradePlan'));
const AdminCalendar = lazy(() => import('./pages/Admin/Calendar'));
const AdminOverview = lazy(() => import('./pages/Admin/AdminOverview'));
const AttendanceManagement = lazy(() => import('./pages/Admin/AttendanceManagement'));
const HostelManagement = lazy(() => import('./pages/Admin/HostelManagement'));
const InventoryManagement = lazy(() => import('./pages/Admin/InventoryManagement'));
const HRPayrollManagement = lazy(() => import('./pages/Admin/HRPayrollManagement'));
const ReportsAnalytics = lazy(() => import('./pages/Admin/ReportsAnalytics'));
const HealthRecords = lazy(() => import('./pages/Admin/HealthRecords'));
const ComplaintRedressal = lazy(() => import('./pages/Admin/ComplaintRedressal'));
const AlumniManagement = lazy(() => import('./pages/Admin/AlumniManagement'));
const DocumentManagement = lazy(() => import('./pages/Admin/DocumentManagement'));
const MultiBranchManagement = lazy(() => import('./pages/Admin/MultiBranchManagement'));

// Teacher
const TeacherRegistration = lazy(() => import('./pages/TeacherRegistration'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const ClassRoster = lazy(() => import('./pages/Teacher/ClassRoster'));
const Attendance = lazy(() => import('./pages/Teacher/Attendance'));
const Grades = lazy(() => import('./pages/Teacher/Grades'));
const TeacherChat = lazy(() => import('./pages/Teacher/Chat'));
const TeacherNoticeboard = lazy(() => import('./pages/Teacher/TeacherNoticeboard'));
const HomeworkManagement = lazy(() => import('./pages/Teacher/HomeworkManagement'));
const TeacherCalendar = lazy(() => import('./pages/Teacher/Calendar'));
const TeacherTimetable = lazy(() => import('./pages/Teacher/TeacherTimetable'));
const LessonPlans = lazy(() => import('./pages/Teacher/LessonPlans'));
const TeacherLeave = lazy(() => import('./pages/Teacher/TeacherLeave'));
const PerformanceTracking = lazy(() => import('./pages/Teacher/PerformanceTracking'));
const ResourceSharing = lazy(() => import('./pages/Teacher/ResourceSharing'));
const PTMScheduler = lazy(() => import('./pages/Teacher/PTMScheduler'));

// Parent
const ParentRegistration = lazy(() => import('./pages/ParentRegistration'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const StudentOverview = lazy(() => import('./pages/Parent/StudentOverview'));
const ParentChat = lazy(() => import('./pages/Parent/Chat'));
const ParentNoticeboard = lazy(() => import('./pages/Parent/ParentNoticeboard'));
const HomeworkOverview = lazy(() => import('./pages/Parent/HomeworkOverview'));
const ParentCalendar = lazy(() => import('./pages/Parent/Calendar'));
const ParentCanteen = lazy(() => import('./pages/Parent/Canteen'));

import { Toaster, toast } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: '',
          style: {
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(226, 232, 240, 0.6)',
            color: '#0f172a',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            borderRadius: '16px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '600',
            letterSpacing: '0.02em',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #10b981',
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #ef4444',
            }
          },
          loading: {
            style: {
              borderLeft: '4px solid #8b5cf6',
            }
          }
        }}
      />
      <Router>
        <Suspense fallback={<GlobalLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/register" element={<SchoolRegistration />} />
            
            {/* Super Admin Routes */}
            <Route 
              path="/superadmin" 
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<Overview />} />
              <Route path="tenants" element={<TenantManagement />} />
              <Route path="billing" element={<PlanManagement />} />
              <Route path="license-usage" element={<LicenseUsage />} />
              <Route path="support-tickets" element={<SupportTickets />} />
              <Route path="audit-logs" element={<AuditLogs />} />
            </Route>

            {/* School Admin Routes */}
            <Route path="/admin/pending" element={<PendingApproval />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="setup" element={<EnvironmentSetup />} />
              <Route path="classes" element={<ClassManagement />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="staff" element={<StaffAssignment />} />
              <Route path="links" element={<LinkGenerator />} />
              <Route path="fees" element={<FeeManagement />} />
              <Route path="timetables" element={<TimetableManagement />} />
              <Route path="transport" element={<TransportManagement />} />
              <Route path="library" element={<LibraryManagement />} />
              <Route path="exams" element={<ExamManagement />} />
              <Route path="notices" element={<Noticeboard />} />
              <Route path="api" element={<APIIntegrations />} />
              <Route path="billing" element={<BillingDashboard />} />
              <Route path="upgrade" element={<UpgradePlan />} />
              <Route path="calendar" element={<AdminCalendar />} />
              <Route path="attendance" element={<AttendanceManagement />} />
              <Route path="hostel" element={<HostelManagement />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="hr-payroll" element={<HRPayrollManagement />} />
              <Route path="reports" element={<ReportsAnalytics />} />
              <Route path="health" element={<HealthRecords />} />
              <Route path="complaints" element={<ComplaintRedressal />} />
              <Route path="alumni" element={<AlumniManagement />} />
              <Route path="documents" element={<DocumentManagement />} />
              <Route path="branches" element={<MultiBranchManagement />} />
            </Route>

            {/* Teacher Routes */}
            <Route path="/register/teacher/:schoolId" element={<TeacherRegistration />} />
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              } 
            >
              <Route index element={<ClassRoster />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="chat" element={<TeacherChat />} />
              <Route path="homework" element={<HomeworkManagement />} />
              <Route path="grades" element={<Grades />} />
              <Route path="notices" element={<TeacherNoticeboard />} />
              <Route path="calendar" element={<TeacherCalendar />} />
              <Route path="timetable" element={<TeacherTimetable />} />
              <Route path="lesson-plans" element={<LessonPlans />} />
              <Route path="leave" element={<TeacherLeave />} />
              <Route path="performance" element={<PerformanceTracking />} />
              <Route path="resources" element={<ResourceSharing />} />
              <Route path="ptm" element={<PTMScheduler />} />
            </Route>

            {/* Parent Routes */}
            <Route path="/register/parent/:schoolId" element={<ParentRegistration />} />
            <Route 
              path="/parent" 
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <ParentDashboard />
                </ProtectedRoute>
              } 
            >
              <Route index element={<StudentOverview />} />
              <Route path="attendance" element={<div className="p-8"><h1>Detailed Attendance Coming Soon</h1></div>} />
              <Route path="homework" element={<HomeworkOverview />} />
              <Route path="grades" element={<div className="p-8"><h1>Detailed Report Card Coming Soon</h1></div>} />
              <Route path="chat" element={<ParentChat />} />
              <Route path="notices" element={<ParentNoticeboard />} />
              <Route path="calendar" element={<ParentCalendar />} />
              <Route path="canteen" element={<ParentCanteen />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
