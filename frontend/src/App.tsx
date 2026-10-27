import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { LocationProvider } from './context/LocationContext';
import { Loading } from './components/Loading';

// Code-split all pages to minimize initial bundle size and maximize loading speed
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const MentorDashboard = lazy(() => import('./pages/MentorDashboard').then(m => ({ default: m.MentorDashboard })));
const HRDashboard = lazy(() => import('./pages/HRDashboard').then(m => ({ default: m.HRDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const HRStudentManagement = lazy(() => import('./pages/HRStudentManagement').then(m => ({ default: m.HRStudentManagement })));
const HRProgramManagement = lazy(() => import('./pages/HRProgramManagement').then(m => ({ default: m.HRProgramManagement })));
const HRBatchManagement = lazy(() => import('./pages/HRBatchManagement').then(m => ({ default: m.HRBatchManagement })));
const HRGlobalAttendance = lazy(() => import('./pages/HRGlobalAttendance').then(m => ({ default: m.HRGlobalAttendance })));
const HRReports = lazy(() => import('./pages/HRReports').then(m => ({ default: m.HRReports })));
const HRCareerPath = lazy(() => import('./pages/HRCareerPath').then(m => ({ default: m.HRCareerPath })));
const HRCurriculum = lazy(() => import('./pages/HRCurriculum').then(m => ({ default: m.HRCurriculum })));
const StudentDetailPage = lazy(() => import('./pages/StudentDetailPage').then(m => ({ default: m.StudentDetailPage })));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage').then(m => ({ default: m.StudentProfilePage })));
const StudentAttendancePage = lazy(() => import('./pages/StudentAttendancePage').then(m => ({ default: m.StudentAttendancePage })));
const HRInstitutionTraining = lazy(() => import('./pages/HRInstitutionTraining').then(m => ({ default: m.HRInstitutionTraining })));
const HRNoDues = lazy(() => import('./pages/HRNoDues').then(m => ({ default: m.HRNoDues })));
const HRFees = lazy(() => import('./pages/HRFees').then(m => ({ default: m.HRFees })));
const HRLetters = lazy(() => import('./pages/HRLetters').then(m => ({ default: m.HRLetters })));
const HRCertificates = lazy(() => import('./pages/HRCertificates').then(m => ({ default: m.HRCertificates })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const SectionPage = lazy(() => import('./pages/SectionPage').then(m => ({ default: m.SectionPage })));
const MentorTaskAssignment = lazy(() => import('./pages/MentorTaskAssignment').then(m => ({ default: m.MentorTaskAssignment })));
const MentorTaskEvaluation = lazy(() => import('./pages/MentorTaskEvaluation').then(m => ({ default: m.MentorTaskEvaluation })));
const MentorFeedbackPage = lazy(() => import('./pages/MentorFeedbackPage').then(m => ({ default: m.MentorFeedbackPage })));
const MentorStudentsPage = lazy(() => import('./pages/MentorStudentsPage').then(m => ({ default: m.MentorStudentsPage })));
const MentorCurriculumPage = lazy(() => import('./pages/MentorCurriculumPage').then(m => ({ default: m.MentorCurriculumPage })));
const StudentTasksPage = lazy(() => import('./pages/StudentTasksPage').then(m => ({ default: m.StudentTasksPage })));
const StudentFeedbackPage = lazy(() => import('./pages/StudentFeedbackPage').then(m => ({ default: m.StudentFeedbackPage })));
const StudentCurriculumPage = lazy(() => import('./pages/StudentCurriculumPage').then(m => ({ default: m.StudentCurriculumPage })));
const StudentAssessments = lazy(() => import('./pages/StudentAssessments').then(m => ({ default: m.StudentAssessments })));
const MentorAssessments = lazy(() => import('./pages/MentorAssessments').then(m => ({ default: m.MentorAssessments })));
const MentorAssessmentEvaluation = lazy(() => import('./pages/MentorAssessmentEvaluation').then(m => ({ default: m.MentorAssessmentEvaluation })));
const MentorScoresheet = lazy(() => import('./pages/MentorScoresheet').then(m => ({ default: m.MentorScoresheet })));
const MentorProjects = lazy(() => import('./pages/MentorProjects').then(m => ({ default: m.MentorProjects })));
const StudentTrainerFeedback = lazy(() => import('./pages/StudentTrainerFeedback').then(m => ({ default: m.StudentTrainerFeedback })));
const StudentSkillsPage = lazy(() => import('./pages/StudentSkillsPage').then(m => ({ default: m.StudentSkillsPage })));
const HRTrainerFeedback = lazy(() => import('./pages/HRTrainerFeedback').then(m => ({ default: m.HRTrainerFeedback })));

// Eagerly prewarm critical route chunks in parallel with React hydration
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('access_token');
  if (!token) {
    import('./pages/Login');
  } else {
    try {
      const rawUser = localStorage.getItem('user_data');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed.role === 'STUDENT') import('./pages/StudentDashboard');
        else if (parsed.role === 'MENTOR') import('./pages/MentorDashboard');
        else if (parsed.role === 'HR') import('./pages/HRDashboard');
        else if (parsed.role === 'SUPER_ADMIN') import('./pages/AdminDashboard');
      }
    } catch {}
  }
}

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {

  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading && !user) {
    return <Loading fullScreen message="Verifying authentication session..." />;
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

const RoutePreloader: React.FC = () => {
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) return;

    const prewarm = () => {
      if (user.role === 'STUDENT') {
        import('./pages/StudentDashboard');
        import('./pages/StudentCurriculumPage');
        import('./pages/StudentAttendancePage');
        import('./pages/StudentSkillsPage');
        import('./pages/StudentTasksPage');
        import('./pages/StudentAssessments');
        import('./pages/StudentFeedbackPage');
      } else if (user.role === 'MENTOR') {
        import('./pages/MentorDashboard');
        import('./pages/MentorStudentsPage');
        import('./pages/MentorCurriculumPage');
        import('./pages/MentorAssessments');
        import('./pages/MentorAssessmentEvaluation');
        import('./pages/MentorTaskAssignment');
        import('./pages/MentorFeedbackPage');
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prewarm);
    } else {
      setTimeout(prewarm, 1200);
    }
  }, [user?.role]);

  return null;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LocationProvider>
        <AuthProvider>
          <NotificationProvider>
          <BrowserRouter>
            <RoutePreloader />
            <Suspense fallback={<Loading fullScreen message="Loading page..." />}>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<Login />} />

                {/* STUDENT ROUTES */}
                <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentDashboard /></ProtectedRoute>} />
                <Route path="/student/curriculum" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentCurriculumPage /></ProtectedRoute>} />
                <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentProfilePage /></ProtectedRoute>} />
                <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentAttendancePage /></ProtectedRoute>} />
                <Route path="/student/tasks" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentTasksPage /></ProtectedRoute>} />
                <Route path="/student/assessments" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentAssessments /></ProtectedRoute>} />
                <Route path="/student/skills" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentSkillsPage /></ProtectedRoute>} />
                <Route path="/student/career" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><HRCareerPath /></ProtectedRoute>} />
                <Route path="/student/feedback" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentFeedbackPage /></ProtectedRoute>} />
                <Route path="/student/trainer-feedback" element={<ProtectedRoute allowedRoles={['STUDENT', 'SUPER_ADMIN']}><StudentTrainerFeedback /></ProtectedRoute>} />

                {/* MENTOR ROUTES */}
                <Route path="/mentor" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorDashboard /></ProtectedRoute>} />
                <Route path="/mentor/curriculum" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorCurriculumPage /></ProtectedRoute>} />
                <Route path="/mentor/students" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorStudentsPage /></ProtectedRoute>} />
                <Route path="/mentor/task-assignment" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorTaskAssignment /></ProtectedRoute>} />
                <Route path="/mentor/task-evaluation" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorTaskEvaluation /></ProtectedRoute>} />
                <Route path="/mentor/assessments" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN', 'HR']}><MentorAssessments /></ProtectedRoute>} />
                <Route path="/mentor/assessment-evaluation" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN', 'HR']}><MentorAssessmentEvaluation /></ProtectedRoute>} />
                <Route path="/mentor/projects" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN']}><MentorProjects /></ProtectedRoute>} />
                <Route path="/mentor/scoresheet" element={<ProtectedRoute allowedRoles={['MENTOR', 'SUPER_ADMIN', 'HR']}><MentorScoresheet /></ProtectedRoute>} />
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
                <Route path="/hr/trainer-feedback" element={<ProtectedRoute allowedRoles={['HR', 'SUPER_ADMIN']}><HRTrainerFeedback /></ProtectedRoute>} />
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
            </Suspense>
          </BrowserRouter>
        </NotificationProvider>
        </AuthProvider>
      </LocationProvider>
    </ThemeProvider>
  );
};
