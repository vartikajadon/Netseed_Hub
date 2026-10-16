import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { MentorDashboard } from './pages/MentorDashboard';
import { HRDashboard } from './pages/HRDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { HRStudentManagement } from './pages/HRStudentManagement';
import { HRProgramManagement } from './pages/HRProgramManagement';
import { HRBatchManagement } from './pages/HRBatchManagement';
import { HRGlobalAttendance } from './pages/HRGlobalAttendance';
import { HRReports } from './pages/HRReports';
import { HRCareerPath } from './pages/HRCareerPath';
import { HRCurriculum } from './pages/HRCurriculum';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { StudentProfilePage } from './pages/StudentProfilePage';
import { StudentAttendancePage } from './pages/StudentAttendancePage';
import { HRInstitutionTraining } from './pages/HRInstitutionTraining';
import { HRNoDues } from './pages/HRNoDues';
import { HRFees } from './pages/HRFees';
import { HRLetters } from './pages/HRLetters';
import { HRCertificates } from './pages/HRCertificates';
import { CalendarPage } from './pages/CalendarPage';
import { SectionPage } from './pages/SectionPage';
import { MentorTaskAssignment } from './pages/MentorTaskAssignment';
import { MentorTaskEvaluation } from './pages/MentorTaskEvaluation';
import { MentorFeedbackPage } from './pages/MentorFeedbackPage';
import { MentorStudentsPage } from './pages/MentorStudentsPage';
import { MentorCurriculumPage } from './pages/MentorCurriculumPage';
import { StudentTasksPage } from './pages/StudentTasksPage';
import { StudentFeedbackPage } from './pages/StudentFeedbackPage';
import { StudentCurriculumPage } from './pages/StudentCurriculumPage';
import { Loading } from './components/Loading';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen message="Verifying authentication session & backend RBAC claims..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans transition-colors duration-200">
        <div className="p-6 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-500/20 rounded-2xl max-w-md w-full space-y-3 shadow-lg">
          <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400">403 Access Denied</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Your current role <span className="font-semibold text-rose-600 dark:text-rose-300">({user.role})</span> is not authorized to access this route.
          </p>
          <div className="pt-2">
            <a href="/login" className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors">
              Return to Authorized Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, getDashboardRoute } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardRoute(user.role)} replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />

              {/* STUDENT ROUTES */}
              <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/curriculum" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentCurriculumPage /></ProtectedRoute>} />
              <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentProfilePage /></ProtectedRoute>} />
              <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentAttendancePage /></ProtectedRoute>} />
              <Route path="/student/tasks" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentTasksPage /></ProtectedRoute>} />
              <Route path="/student/skills" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><SectionPage title="My Skill Metrics" subtitle="Skill Evaluations" category="STUDENT" description="Historical technical skill evaluations and radar chart metrics." /></ProtectedRoute>} />
              <Route path="/student/career" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><HRCareerPath /></ProtectedRoute>} />
              <Route path="/student/feedback" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentFeedbackPage /></ProtectedRoute>} />

              {/* MENTOR ROUTES */}
              <Route path="/mentor" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorDashboard /></ProtectedRoute>} />
              <Route path="/mentor/curriculum" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorCurriculumPage /></ProtectedRoute>} />
              <Route path="/mentor/students" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorStudentsPage /></ProtectedRoute>} />
              <Route path="/mentor/task-assignment" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorTaskAssignment /></ProtectedRoute>} />
              <Route path="/mentor/task-evaluation" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorTaskEvaluation /></ProtectedRoute>} />
              <Route path="/mentor/tasks" element={<Navigate to="/mentor/task-assignment" replace />} />
              <Route path="/mentor/feedback" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorFeedbackPage /></ProtectedRoute>} />

              {/* HR / PROGRAM MANAGER ROUTES */}
              <Route path="/hr" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRDashboard /></ProtectedRoute>} />
              <Route path="/hr/students" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRStudentManagement /></ProtectedRoute>} />
              <Route path="/hr/students/:student_id" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><StudentDetailPage /></ProtectedRoute>} />
              <Route path="/hr/programs" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRProgramManagement /></ProtectedRoute>} />
              <Route path="/hr/batches" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRBatchManagement /></ProtectedRoute>} />
              <Route path="/hr/institution-training" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRInstitutionTraining /></ProtectedRoute>} />
              <Route path="/hr/attendance" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRGlobalAttendance /></ProtectedRoute>} />
              <Route path="/hr/no-dues" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRNoDues /></ProtectedRoute>} />
              <Route path="/hr/fees" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRFees /></ProtectedRoute>} />
              <Route path="/hr/letters" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRLetters /></ProtectedRoute>} />
              <Route path="/hr/certificates" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRCertificates /></ProtectedRoute>} />
              <Route path="/hr/reports" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRReports /></ProtectedRoute>} />
              <Route path="/hr/curriculum" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRCurriculum /></ProtectedRoute>} />
              <Route path="/hr/career" element={<Navigate to="/hr/curriculum" replace />} />

              {/* GLOBAL CALENDAR ROUTE FOR ALL AUTHENTICATED USERS */}
              <Route path="/calendar" element={<ProtectedRoute allowedRoles={['STUDENT', 'MENTOR', 'HR', 'SUPER_ADMIN']}><CalendarPage /></ProtectedRoute>} />

              {/* SUPER ADMIN ROUTES */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SectionPage title="User Roster" subtitle="Global System Identities" category="SUPER_ADMIN" description="View and manage all registered system identities and account states." /></ProtectedRoute>} />
              <Route path="/admin/roles" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SectionPage title="RBAC Role Management" subtitle="System Permissions" category="SUPER_ADMIN" description="Modify user roles (STUDENT, MENTOR, HR, SUPER_ADMIN)." /></ProtectedRoute>} />
              <Route path="/admin/geofences" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SectionPage title="Campus Geofences" subtitle="Coordinates & Radius" category="SUPER_ADMIN" description="Define office campus center coordinates and radius boundaries." /></ProtectedRoute>} />
              <Route path="/admin/attendance-rules" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SectionPage title="Attendance Rules" subtitle="Policy Configuration" category="SUPER_ADMIN" description="Configure shift hours, grace periods, cutoffs, and minimum daily durations." /></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SectionPage title="Audit Log Trail" subtitle="Immutable Compliance Logs" category="SUPER_ADMIN" description="Inspect immutable audit logs detailing actor ID, action, and timestamp." /></ProtectedRoute>} />
              <Route path="/admin/biometric-controls" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SectionPage title="Biometric Controls" subtitle="Privacy & Vectors" category="SUPER_ADMIN" description="Manage biometric consent privacy templates and vector embedding rules." /></ProtectedRoute>} />
              <Route path="/admin/system" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SectionPage title="System Diagnostics" subtitle="Engine Health" category="SUPER_ADMIN" description="Check database connection pools, token guards, and system metrics." /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
