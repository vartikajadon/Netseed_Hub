import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  AdminDashboardSummary,
  StudentOverviewData,
  StudentOverviewItem,
  ProgramBatchOverviewData,
  ProgramBatchItem,
  AttendanceOverviewData,
  TaskSkillOverviewData,
  CareerReadinessData,
  CareerReadinessStudentItem,
  OutcomesData,
  SecurityAlertsData,
  SecurityAlertItem,
  RecentActivityData,
  ActivityItem,
  formatBatchType,
} from '../types';
import {
  ShieldAlert, Users, BookOpen, Layers, Clock, Award, ShieldCheck,
  CheckCircle2, AlertTriangle, XCircle, ArrowUpRight, RefreshCw,
  Search, Filter, ChevronRight, Eye, Calendar, Sparkles, BarChart3,
  TrendingUp, Fingerprint, MapPin, Sliders, FileText, Settings,
  GraduationCap, UserPlus, FileCheck, CheckSquare, Activity, Lock
} from 'lucide-react';

type DashboardTab =
  | 'overview'
  | 'students'
  | 'programs'
  | 'attendance'
  | 'tasks_skills'
  | 'career'
  | 'outcomes'
  | 'security'
  | 'activity';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Global Filters
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateRangeDays, setDateRangeDays] = useState<number>(14);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dashboard Data Models
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [studentsData, setStudentsData] = useState<StudentOverviewData | null>(null);
  const [programBatchData, setProgramBatchData] = useState<ProgramBatchOverviewData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceOverviewData | null>(null);
  const [taskSkillData, setTaskSkillData] = useState<TaskSkillOverviewData | null>(null);
  const [careerData, setCareerData] = useState<CareerReadinessData | null>(null);
  const [outcomesData, setOutcomesData] = useState<OutcomesData | null>(null);
  const [securityData, setSecurityData] = useState<SecurityAlertsData | null>(null);
  const [activityData, setActivityData] = useState<RecentActivityData | null>(null);

  // Modals
  const [selectedStudent, setSelectedStudent] = useState<StudentOverviewItem | CareerReadinessStudentItem | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlertItem | null>(null);
  const [selectedLog, setSelectedLog] = useState<ActivityItem | null>(null);

  // Fetch all dashboard data concurrently
  const loadDashboardData = async () => {
    try {
      setError(null);
      const queryParams = new URLSearchParams();
      if (selectedProgramId) queryParams.append('program_id', selectedProgramId);
      if (selectedBatchId) queryParams.append('batch_id', selectedBatchId);
      if (selectedStatus) queryParams.append('status', selectedStatus);

      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

      // Attendance date range
      const endD = new Date().toISOString().split('T')[0];
      const startD = new Date(Date.now() - dateRangeDays * 86400000).toISOString().split('T')[0];
      const attQs = `?start_date=${startD}&end_date=${endD}${selectedProgramId ? `&program_id=${selectedProgramId}` : ''}${selectedBatchId ? `&batch_id=${selectedBatchId}` : ''}`;

      const [
        summaryRes,
        studentsRes,
        progBatchRes,
        attRes,
        tasksRes,
        careerRes,
        outcomesRes,
        secRes,
        actRes,
      ] = await Promise.all([
        api.get<AdminDashboardSummary>('/admin/dashboard/summary'),
        api.get<StudentOverviewData>(`/admin/dashboard/students${qs}`),
        api.get<ProgramBatchOverviewData>(`/admin/dashboard/programs${selectedProgramId ? `?program_id=${selectedProgramId}` : ''}`),
        api.get<AttendanceOverviewData>(`/admin/dashboard/attendance${attQs}`),
        api.get<TaskSkillOverviewData>(`/admin/dashboard/tasks${qs}`),
        api.get<CareerReadinessData>(`/admin/dashboard/career-readiness${qs}`),
        api.get<OutcomesData>(`/admin/dashboard/outcomes${qs}`),
        api.get<SecurityAlertsData>('/admin/dashboard/security-alerts?limit=50'),
        api.get<RecentActivityData>('/admin/dashboard/recent-activity?limit=50'),
      ]);

      setSummary(summaryRes);
      setStudentsData(studentsRes);
      setProgramBatchData(progBatchRes);
      setAttendanceData(attRes);
      setTaskSkillData(tasksRes);
      setCareerData(careerRes);
      setOutcomesData(outcomesRes);
      setSecurityData(secRes);
      setActivityData(actRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load Super Admin dashboard data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadDashboardData();
  }, [selectedProgramId, selectedBatchId, selectedStatus, dateRangeDays]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const handleResetFilters = () => {
    setSelectedProgramId('');
    setSelectedBatchId('');
    setSelectedStatus('');
    setDateRangeDays(14);
    setSearchQuery('');
  };

  // Filtered Students in Student Roster View
  const filteredStudents = useMemo(() => {
    if (!studentsData?.items) return [];
    if (!searchQuery.trim()) return studentsData.items;

    const q = searchQuery.toLowerCase().trim();
    return studentsData.items.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.program_title && s.program_title.toLowerCase().includes(q)) ||
        (s.batch_name && s.batch_name.toLowerCase().includes(q))
    );
  }, [studentsData, searchQuery]);

  // Current Date display
  const currentDateString = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  return (
    <Layout>
      <div className="space-y-6 pb-12 font-sans">
        {/* --- TOP ADMIN HEADER BAR --- */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    Admin Dashboard
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Centralized Operational Command & Enterprise Decision Support Matrix
                  </p>
                </div>
              </div>
            </div>

            {/* Right Header: Date, Security Indicator, Refresh */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{currentDateString}</span>
              </div>

              {securityData && (
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    securityData.critical_count > 0
                      ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/70 dark:border-rose-800 dark:text-rose-300 animate-pulse'
                      : securityData.high_count > 0
                      ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/70 dark:border-amber-800 dark:text-amber-300'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/70 dark:border-emerald-800 dark:text-emerald-300'
                  }`}
                  title="View Security & Fraud Alerts"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{securityData.total_alerts} Security Event{securityData.total_alerts === 1 ? '' : 's'}</span>
                </button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Syncing...' : 'Refresh'}
              </Button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold scrollbar-none">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'students', label: 'Students', icon: Users, badge: summary?.students.total },
              { id: 'programs', label: 'Programs & Batches', icon: BookOpen, badge: summary?.programs.total },
              { id: 'attendance', label: 'Attendance', icon: Clock, badge: `${summary?.today_attendance.present_percentage ?? 0}%` },
              { id: 'tasks_skills', label: 'Tasks & Skills', icon: CheckSquare },
              { id: 'career', label: 'Career Readiness', icon: Sparkles, badge: `${summary?.career_readiness.average_score ?? 0}` },
              { id: 'outcomes', label: 'Outcomes', icon: Award },
              { id: 'security', label: 'Security & Alerts', icon: ShieldAlert, badge: securityData?.total_alerts },
              { id: 'activity', label: 'Audit Trail', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-bold shadow-xs shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Loading / Error State */}
        {isLoading && <Loading message="Loading Super Admin operational intelligence..." />}
        {error && <ErrorMessage message={error} onRetry={loadDashboardData} />}

        {!isLoading && summary && (
          <>
            {/* --- GLOBAL FILTERS BAR --- */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
                  <Filter className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Filters:</span>
                </div>

                {/* Program Filter */}
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">All Programs</option>
                  {programBatchData?.programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.code})
                    </option>
                  ))}
                </select>

                {/* Batch Filter */}
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">All Batches</option>
                  {programBatchData?.programs
                    .flatMap((p) => p.batches)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.status})
                      </option>
                    ))}
                </select>

                {/* Student Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ENROLLED">ENROLLED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="TERMINATED">TERMINATED</option>
                  <option value="DROPPED">DROPPED</option>
                </select>

                {/* Date Range Selector */}
                <select
                  value={dateRangeDays}
                  onChange={(e) => setDateRangeDays(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value={7}>Last 7 Days</option>
                  <option value={14}>Last 14 Days</option>
                  <option value={30}>Last 30 Days</option>
                </select>

                {(selectedProgramId || selectedBatchId || selectedStatus || dateRangeDays !== 14) && (
                  <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-500 hover:text-rose-600">
                    Reset Filters
                  </Button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student, program, batch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* --- 8 SUMMARY CARDS (Clickable for Drill-down) --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Students */}
              <div
                onClick={() => setActiveTab('students')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-xs transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Students</span>
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                  {summary.students.total}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <Badge variant="success">{summary.students.active} Active</Badge>
                  <Badge variant="info">{summary.students.enrolled} Enrolled</Badge>
                  <Badge variant="warning">{summary.students.on_hold} On Hold</Badge>
                  <Badge variant="neutral">{summary.students.completed} Done</Badge>
                </div>
              </div>

              {/* Card 2: Programs */}
              <div
                onClick={() => setActiveTab('programs')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-xs transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Programs</span>
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                  {summary.programs.total}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                  <Badge variant="success">{summary.programs.active} Active</Badge>
                  <Badge variant="neutral">{summary.programs.inactive} Inactive</Badge>
                </div>
              </div>

              {/* Card 3: Batches */}
              <div
                onClick={() => setActiveTab('programs')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-xs transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Batches</span>
                  <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400 group-hover:scale-105 transition-transform">
                    <Layers className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                  {summary.batches.total}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                  <Badge variant="success">{summary.batches.active} Active</Badge>
                  <Badge variant="info">{summary.batches.completed} Completed</Badge>
                  <Badge variant="neutral">{summary.batches.upcoming} Upcoming</Badge>
                </div>
              </div>

              {/* Card 4: Mentors */}
              <div
                onClick={() => setActiveTab('students')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-xs transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Mentors</span>
                  <span className="p-2 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/70 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                  {summary.mentors.total}
                </div>
                <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>{summary.mentors.active} Active Mentors</span>
                  <span className="text-indigo-600 font-bold">{summary.mentors.assigned_students_count} assigned</span>
                </div>
              </div>

              {/* Card 5: Today's Attendance */}
              <div
                onClick={() => setActiveTab('attendance')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-xs transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Today's Attendance</span>
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400 group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                  {summary.today_attendance.present_percentage}%
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                  <Badge variant="success">{summary.today_attendance.present} Present</Badge>
                  <Badge variant="error">{summary.today_attendance.absent} Absent</Badge>
                  <Badge variant="warning">{summary.today_attendance.incomplete} Incomplete</Badge>
                  <Badge variant="neutral">{summary.today_attendance.not_marked} Unmarked</Badge>
                </div>
              </div>

              {/* Card 6: Face Enrollment */}
              <div
                onClick={() => navigate('/admin/biometric-controls')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-xs transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Face Enrollment</span>
                  <span className="p-2 rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400 group-hover:scale-105 transition-transform">
                    <Fingerprint className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                  {summary.face_enrollment.enrolled_percentage}%
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="text-emerald-600 font-semibold">{summary.face_enrollment.enrolled} Enrolled</span>
                  <span className="text-amber-600">{summary.face_enrollment.pending} Pending</span>
                </div>
              </div>

              {/* Card 7: Career Readiness */}
              <div
                onClick={() => setActiveTab('career')}
                className="cursor-pointer bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 shadow-xs transition-all hover:shadow-md group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Career Readiness</span>
                  <span className="p-2 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/70 dark:text-teal-400 group-hover:scale-105 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {summary.career_readiness.average_score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                  <Badge variant="success">{summary.career_readiness.ready_count} Ready (≥80)</Badge>
                  <Badge variant="warning">{summary.career_readiness.needs_development_count} Dev (60-79)</Badge>
                  <Badge variant="error">{summary.career_readiness.not_ready_count} Low (&lt;60)</Badge>
                </div>
              </div>

              {/* Card 8: Security Alerts */}
              <div
                onClick={() => setActiveTab('security')}
                className={`cursor-pointer border rounded-2xl p-4 shadow-xs transition-all hover:shadow-md group ${
                  summary.security_alerts.critical_count > 0
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-rose-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Security & Fraud Alerts</span>
                  <span className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 group-hover:scale-105 transition-transform">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
                  {summary.security_alerts.total_alerts}
                </div>
                <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                  <Badge variant="error">{summary.security_alerts.critical_count} Critical</Badge>
                  <Badge variant="warning">{summary.security_alerts.device_violations} Devices</Badge>
                  <Badge variant="info">{summary.security_alerts.gps_violations} GPS/Mock</Badge>
                </div>
              </div>
            </div>

            {/* --- QUICK ACTIONS TOOLBAR --- */}
            <div className="bg-slate-900 dark:bg-slate-900/90 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-white/10 text-amber-300">
                  <Activity className="w-4 h-4" />
                </span>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Super Admin Quick Actions</span>
                  <p className="text-[11px] text-slate-400">Authorized administrative routing shortcuts</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Button variant="secondary" size="sm" onClick={() => navigate('/admin/users')}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Add / Manage Users
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/hr/students')}>
                  <GraduationCap className="w-3.5 h-3.5 mr-1" /> Manage Students
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/hr/programs')}>
                  <BookOpen className="w-3.5 h-3.5 mr-1" /> Manage Programs
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/hr/batches')}>
                  <Layers className="w-3.5 h-3.5 mr-1" /> Manage Batches
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/hr/attendance')}>
                  <Clock className="w-3.5 h-3.5 mr-1" /> Attendance Roster
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/admin/attendance-rules')}>
                  <Sliders className="w-3.5 h-3.5 mr-1" /> Attendance Rules
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/admin/biometric-controls')}>
                  <Fingerprint className="w-3.5 h-3.5 mr-1" /> Biometric Controls
                </Button>
                <Button variant="secondary" size="sm" onClick={() => navigate('/admin/audit-logs')}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> Audit Trail
                </Button>
              </div>
            </div>

            {/* --- TAB CONTENT SECTIONS --- */}

            {/* TAB 1: EXECUTIVE OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Attendance Real-Time Performance Gauge */}
                  <Card title="Today's Attendance Overview" subtitle="Real-time verified biometric punch compliance">
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <div>
                          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            {summary.today_attendance.present_percentage}%
                          </div>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Present Rate (5h+ verified duration)
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {summary.today_attendance.avg_working_hours} hrs
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Average Active Duration</span>
                        </div>
                      </div>

                      {/* Horizontal Attendance Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          <span>Verified ({summary.today_attendance.present + summary.today_attendance.regularized})</span>
                          <span>Absent ({summary.today_attendance.absent})</span>
                          <span>Incomplete ({summary.today_attendance.incomplete})</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden">
                          <div
                            style={{
                              width: `${summary.today_attendance.total_marked > 0 ? ((summary.today_attendance.present + summary.today_attendance.regularized) / summary.today_attendance.total_marked) * 100 : 0}%`,
                            }}
                            className="bg-emerald-500"
                            title="Present"
                          />
                          <div
                            style={{
                              width: `${summary.today_attendance.total_marked > 0 ? (summary.today_attendance.incomplete / summary.today_attendance.total_marked) * 100 : 0}%`,
                            }}
                            className="bg-amber-400"
                            title="Incomplete (Open IN without OUT)"
                          />
                          <div
                            style={{
                              width: `${summary.today_attendance.total_marked > 0 ? (summary.today_attendance.absent / summary.today_attendance.total_marked) * 100 : 0}%`,
                            }}
                            className="bg-rose-500"
                            title="Absent (<5h verified)"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center text-slate-500">
                        <span>Attendance Threshold Rule:</span>
                        <span className="font-bold text-indigo-600">≥ 5.0 Hours = Present</span>
                      </div>
                    </div>
                  </Card>

                  {/* Middle Column: Career Readiness Distribution */}
                  <Card title="Career Readiness Evaluation" subtitle="Decision-support matrix based on PRD formula">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80">
                        <div>
                          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {summary.career_readiness.average_score} <span className="text-xs text-slate-500 font-normal">/ 100</span>
                          </div>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Cohort Mean Index</span>
                        </div>
                        <Badge variant="success">Decision Support</Badge>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Offer (≥80)
                          </span>
                          <span className="font-bold">{summary.career_readiness.ready_count} students</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            style={{
                              width: `${summary.students.total > 0 ? (summary.career_readiness.ready_count / summary.students.total) * 100 : 0}%`,
                            }}
                            className="h-full bg-emerald-500"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5" /> Needs Development (60–79)
                          </span>
                          <span className="font-bold">{summary.career_readiness.needs_development_count} students</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            style={{
                              width: `${summary.students.total > 0 ? (summary.career_readiness.needs_development_count / summary.students.total) * 100 : 0}%`,
                            }}
                            className="h-full bg-amber-400"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
                            <XCircle className="w-3.5 h-3.5" /> Not Ready (&lt;60)
                          </span>
                          <span className="font-bold">{summary.career_readiness.not_ready_count} students</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            style={{
                              width: `${summary.students.total > 0 ? (summary.career_readiness.not_ready_count / summary.students.total) * 100 : 0}%`,
                            }}
                            className="h-full bg-rose-500"
                          />
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                        Decision Support Only: Final employment decisions remain with authorized management.
                      </div>
                    </div>
                  </Card>

                  {/* Right Column: Security & System Health */}
                  <Card title="Security & Compliance Health" subtitle="Hardware and biometric audit indicators">
                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">Server-Side RBAC Guard</span>
                        </div>
                        <Badge variant="success">ACTIVE</Badge>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-indigo-500" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">Biometric Isolation</span>
                        </div>
                        <Badge variant="success">Zero Raw Img DB</Badge>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-purple-500" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">Haversine Geofence Engine</span>
                        </div>
                        <Badge variant="success">100m Enforced</Badge>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">Active Security Alerts</span>
                        </div>
                        <Badge variant={summary.security_alerts.total_alerts > 0 ? 'error' : 'success'}>
                          {summary.security_alerts.total_alerts} Logged
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('security')}
                        className="w-full text-indigo-600 dark:text-indigo-400 mt-2 font-bold"
                      >
                        Inspect Security Events <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Recent Administrative Activity Feed */}
                <Card
                  title="Recent Administrative Activity Stream"
                  subtitle="Latest operations recorded in the immutable compliance audit trail"
                  action={
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('activity')}>
                      View Full Audit Trail <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  }
                >
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {activityData?.items.slice(0, 5).map((log) => (
                      <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800">
                            <FileText className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 mr-2">{log.action}</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              by <strong className="text-slate-700 dark:text-slate-300">{log.actor_name}</strong> ({log.actor_role})
                            </span>
                            <div className="text-[11px] text-slate-500 font-mono truncate max-w-[400px]">
                              {log.details || `Entity: ${log.entity} (${log.entity_id})`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-slate-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {(!activityData?.items || activityData.items.length === 0) && (
                      <div className="py-6 text-center text-slate-400 text-xs">No audit logs recorded yet.</div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 2: STUDENTS ROSTER OVERVIEW */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                <Card
                  title="Student & Trainee Management Roster"
                  subtitle={`Total Registered: ${studentsData?.total ?? 0} | Active: ${studentsData?.active_count ?? 0}`}
                  action={
                    <Button variant="primary" size="sm" onClick={() => navigate('/hr/students')}>
                      Open HR Student Console
                    </Button>
                  }
                >
                  <Table
                    columns={[
                      { header: 'Roll Number', accessor: 'roll_number', className: 'font-mono text-xs font-bold text-indigo-600' },
                      {
                        header: 'Trainee Name',
                        accessor: (s: StudentOverviewItem) => (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{s.full_name}</div>
                            <div className="text-xs text-slate-400 font-mono">{s.email}</div>
                          </div>
                        ),
                      },
                      {
                        header: 'Program & Batch',
                        accessor: (s: StudentOverviewItem) => (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{s.program_title || 'Unassigned'}</div>
                            <div className="text-xs text-slate-500">{s.batch_name || 'No Batch'}</div>
                          </div>
                        ),
                      },
                      { header: 'Mentor', accessor: (s: StudentOverviewItem) => s.mentor_name || 'Unassigned' },
                      {
                        header: 'Status',
                        accessor: (s: StudentOverviewItem) => (
                          <Badge
                            variant={
                              s.enrollment_status === 'ACTIVE'
                                ? 'success'
                                : s.enrollment_status === 'ENROLLED'
                                ? 'info'
                                : s.enrollment_status === 'ON_LEAVE'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {s.enrollment_status}
                          </Badge>
                        ),
                      },
                      {
                        header: 'Attendance',
                        accessor: (s: StudentOverviewItem) => (
                          <span
                            className={`font-bold ${
                              s.attendance_rate >= 75 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {s.attendance_rate}%
                          </span>
                        ),
                      },
                      {
                        header: 'Career Readiness',
                        accessor: (s: StudentOverviewItem) => (
                          <Badge
                            variant={
                              s.career_readiness_score >= 80
                                ? 'success'
                                : s.career_readiness_score >= 60
                                ? 'warning'
                                : 'error'
                            }
                          >
                            {s.career_readiness_score} ({s.readiness_band})
                          </Badge>
                        ),
                      },
                      {
                        header: 'Actions',
                        accessor: (s: StudentOverviewItem) => (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedStudent(s)}
                            className="text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Quick View
                          </Button>
                        ),
                      },
                    ]}
                    data={filteredStudents}
                    keyExtractor={(s) => s.id}
                    emptyMessage="No students match the current filter or search criteria."
                  />
                </Card>
              </div>
            )}

            {/* TAB 3: PROGRAMS & BATCHES MATRIX */}
            {activeTab === 'programs' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Programs & Batches Matrix</h2>
                    <p className="text-xs text-slate-500">Hierarchical structure, cohort progress, and attendance metrics</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate('/hr/programs')}>
                      Manage Programs
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/hr/batches')}>
                      Manage Batches
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {programBatchData?.programs.map((prog) => (
                    <Card
                      key={prog.id}
                      title={`${prog.title} (${prog.code})`}
                      subtitle={`${prog.duration_weeks} Weeks Duration | Active Status: ${prog.is_active ? 'ACTIVE' : 'INACTIVE'}`}
                      action={
                        <Badge variant={prog.is_active ? 'success' : 'neutral'}>
                          {prog.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      }
                    >
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Trainees</span>
                            <div className="text-base font-extrabold text-slate-900 dark:text-slate-100">{prog.total_students}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Active Trainees</span>
                            <div className="text-base font-extrabold text-emerald-600">{prog.active_students}</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Avg Attendance</span>
                            <div className="text-base font-extrabold text-indigo-600">{prog.avg_attendance}%</div>
                          </div>
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Avg Readiness</span>
                            <div className="text-base font-extrabold text-purple-600">{prog.avg_readiness} / 100</div>
                          </div>
                        </div>

                        {/* Batches Table within Program */}
                        <div>
                          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                            Assigned Program Batches ({prog.batches.length})
                          </h4>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                            {prog.batches.map((batch) => (
                              <div
                                key={batch.id}
                                className="p-3 bg-white dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <span>{batch.name}</span>
                                    <Badge variant={batch.status === 'ACTIVE' ? 'success' : 'info'}>{batch.status}</Badge>
                                    <span className="text-[10px] text-slate-500 font-normal">({formatBatchType(batch.batch_type)})</span>
                                  </div>
                                  <div className="text-slate-500 mt-0.5">
                                    Duration: {batch.start_date} → {batch.end_date} | Mentor: <strong className="text-slate-700 dark:text-slate-300">{batch.mentor_name || 'Unassigned'}</strong>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-right">
                                  <div>
                                    <div className="font-extrabold text-slate-900 dark:text-slate-100">{batch.student_count} Trainees</div>
                                    <div className="text-slate-500 text-[11px]">Attendance: <strong className="text-emerald-600">{batch.avg_attendance_pct}%</strong></div>
                                  </div>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBatchId(batch.id);
                                      setActiveTab('students');
                                    }}
                                  >
                                    View Trainees
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {prog.batches.length === 0 && (
                              <div className="p-4 text-center text-slate-400 text-xs">No batches created for this program yet.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: ATTENDANCE DEEP DIVE */}
            {activeTab === 'attendance' && attendanceData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500">Today's Present Rate</span>
                    <div className="mt-1 text-2xl font-black text-emerald-600">{attendanceData.today.present_percentage}%</div>
                    <span className="text-[11px] text-slate-400">{attendanceData.today.present} Verified Present</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500">Today's Absent</span>
                    <div className="mt-1 text-2xl font-black text-rose-600">{attendanceData.today.absent}</div>
                    <span className="text-[11px] text-slate-400">&lt; 5h verified duration</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500">Incomplete Attendance</span>
                    <div className="mt-1 text-2xl font-black text-amber-500">{attendanceData.today.incomplete}</div>
                    <span className="text-[11px] text-slate-400">Punch IN without Punch OUT</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500">Pending Regularization</span>
                    <div className="mt-1 text-2xl font-black text-indigo-600">{attendanceData.pending_regularizations_count}</div>
                    <span className="text-[11px] text-slate-400">Awaiting HR/Mentor review</span>
                  </div>
                </div>

                {/* Attendance Trend Chart */}
                <Card
                  title={`Daily Attendance Trend (Last ${dateRangeDays} Days)`}
                  subtitle="Cumulative student daily attendance counts derived from verified biometric logs"
                >
                  <div className="space-y-4">
                    <div className="h-44 flex items-end gap-2 pt-6 px-2 overflow-x-auto">
                      {attendanceData.daily_trends.map((item, idx) => {
                        const tot = item.present + item.absent + item.incomplete + item.regularized;
                        const presentPct = tot > 0 ? ((item.present + item.regularized) / tot) * 100 : 0;
                        return (
                          <div key={idx} className="flex-1 min-w-[36px] flex flex-col items-center gap-1.5 group">
                            <div className="text-[10px] text-slate-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              {Math.round(presentPct)}%
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg h-32 flex flex-col justify-end overflow-hidden">
                              <div
                                style={{ height: `${presentPct}%` }}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 transition-all rounded-t-sm"
                                title={`Date: ${item.date} | Present: ${item.present} | Absent: ${item.absent} | Avg Hours: ${item.avg_hours}h`}
                              />
                            </div>
                            <span className="text-[9px] text-slate-500 truncate w-full text-center">
                              {item.date.split('-').slice(1).join('/')}
                            </span>
                          </div>
                        );
                      })}
                      {attendanceData.daily_trends.length === 0 && (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          No historical attendance records for the selected date range.
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-medium pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-indigo-600" />
                        <span>Present / Regularized (≥5h active)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-slate-300 dark:bg-slate-700" />
                        <span>Absent / Incomplete / Not Logged</span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Below Threshold Warning Table */}
                <Card
                  title="Students Below 75% Attendance Threshold"
                  subtitle="Flagged active trainees requiring attendance review or intervention"
                >
                  <Table
                    columns={[
                      { header: 'Roll Number', accessor: 'roll_number', className: 'font-mono text-xs font-bold text-rose-600' },
                      { header: 'Student Name', accessor: 'full_name' },
                      { header: 'Program', accessor: (s) => s.program_title || 'Unassigned' },
                      { header: 'Batch', accessor: (s) => s.batch_name || 'Unassigned' },
                      {
                        header: 'Present Days',
                        accessor: (s) => `${s.present_days} / ${s.total_recorded_days} days`,
                      },
                      {
                        header: 'Attendance Rate',
                        accessor: (s) => (
                          <Badge variant="error">{s.attendance_rate}% (Threshold: {s.threshold_rate}%)</Badge>
                        ),
                      },
                    ]}
                    data={attendanceData.students_below_threshold}
                    keyExtractor={(s) => s.student_id}
                    emptyMessage="No students currently below the 75% threshold."
                  />
                </Card>
              </div>
            )}

            {/* TAB 5: TASKS & SKILL PROGRESS */}
            {activeTab === 'tasks_skills' && taskSkillData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500">Tasks Assigned</span>
                    <div className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{taskSkillData.tasks_assigned}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500">Tasks Completed</span>
                    <div className="mt-1 text-2xl font-black text-emerald-600">{taskSkillData.tasks_completed}</div>
                    <span className="text-[11px] text-slate-400">{taskSkillData.avg_task_completion_pct}% Completion Rate</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500">Tasks Pending</span>
                    <div className="mt-1 text-2xl font-black text-amber-500">{taskSkillData.tasks_pending}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                    <span className="text-xs font-bold text-slate-500">Cohort Skill Average</span>
                    <div className="mt-1 text-2xl font-black text-indigo-600">{taskSkillData.avg_skill_score} / 100</div>
                  </div>
                </div>

                {/* 4-Tier Skill Level Distribution */}
                <Card title="Skill-Level Tier Distribution" subtitle="Curriculum proficiency distribution across all active trainees">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500">Beginner (0–40)</span>
                      <div className="text-2xl font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                        {taskSkillData.skill_distribution.beginner}
                      </div>
                      <span className="text-[11px] text-slate-400">Foundational concepts</span>
                    </div>

                    <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Intermediate (41–70)</span>
                      <div className="text-2xl font-extrabold text-amber-800 dark:text-amber-200 mt-1">
                        {taskSkillData.skill_distribution.intermediate}
                      </div>
                      <span className="text-[11px] text-amber-600">Core practical capability</span>
                    </div>

                    <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">Proficient (71–90)</span>
                      <div className="text-2xl font-extrabold text-indigo-800 dark:text-indigo-200 mt-1">
                        {taskSkillData.skill_distribution.proficient}
                      </div>
                      <span className="text-[11px] text-indigo-600">Production ready</span>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Expert (91–100)</span>
                      <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-200 mt-1">
                        {taskSkillData.skill_distribution.expert}
                      </div>
                      <span className="text-[11px] text-emerald-600">Advanced mastery</span>
                    </div>
                  </div>
                </Card>

                {/* Skills Benchmark Matrix */}
                <Card title="Curriculum Technology Benchmarks" subtitle="Skill tags scored across trainee evaluation milestones">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {taskSkillData.top_skills.map((skill, index) => (
                      <div key={index} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{skill.skill_name}</div>
                          <span className="text-slate-400 text-[11px]">{skill.category}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-36 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              style={{ width: `${skill.average_score}%` }}
                              className="h-full bg-indigo-600 rounded-full"
                            />
                          </div>
                          <span className="font-extrabold text-indigo-600 w-12 text-right">{skill.average_score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 6: CAREER READINESS */}
            {activeTab === 'career' && careerData && (
              <div className="space-y-6">
                {/* Decision-Support Banner */}
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3 text-xs text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-100">
                      Career Readiness Decision-Support Metric
                    </h4>
                    <p className="mt-1 leading-relaxed text-indigo-800 dark:text-indigo-300">
                      {careerData.disclaimer}
                    </p>
                  </div>
                </div>

                {/* PRD Formula Weighting Breakdown */}
                <Card title="PRD Weighted Formula Breakdown" subtitle="Algorithmic weighting model applied to trainee lifecycle events">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-slate-500 font-medium">Attendance</span>
                      <div className="text-lg font-black text-indigo-600 mt-1">20%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-slate-500 font-medium">Task Performance</span>
                      <div className="text-lg font-black text-indigo-600 mt-1">25%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-slate-500 font-medium">Skill Progress</span>
                      <div className="text-lg font-black text-indigo-600 mt-1">25%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-slate-500 font-medium">Projects & Pres.</span>
                      <div className="text-lg font-black text-indigo-600 mt-1">15%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-slate-500 font-medium">Assessments</span>
                      <div className="text-lg font-black text-indigo-600 mt-1">10%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-slate-500 font-medium">Mentor Feedback</span>
                      <div className="text-lg font-black text-indigo-600 mt-1">5%</div>
                    </div>
                  </div>
                </Card>

                {/* Trainee Readiness Table with Drilldown */}
                <Card title="Trainee Readiness Evaluation List" subtitle="Comprehensive composite score rankings">
                  <Table
                    columns={[
                      { header: 'Roll Number', accessor: 'roll_number', className: 'font-mono text-xs font-bold text-indigo-600' },
                      { header: 'Trainee Name', accessor: 'full_name' },
                      { header: 'Program', accessor: (s) => s.program_title || 'Unassigned' },
                      { header: 'Batch', accessor: (s) => s.batch_name || 'Unassigned' },
                      {
                        header: 'Readiness Score',
                        accessor: (s) => (
                          <div className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                            {s.readiness_score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                          </div>
                        ),
                      },
                      {
                        header: 'Status Category',
                        accessor: (s) => (
                          <Badge
                            variant={
                              s.category === 'READY'
                                ? 'success'
                                : s.category === 'DEVELOPMENT'
                                ? 'warning'
                                : 'error'
                            }
                          >
                            {s.category_label}
                          </Badge>
                        ),
                      },
                      {
                        header: 'Details',
                        accessor: (s) => (
                          <Button variant="secondary" size="sm" onClick={() => setSelectedStudent(s)} className="text-xs">
                            <Eye className="w-3.5 h-3.5 mr-1" /> Score Breakdown
                          </Button>
                        ),
                      },
                    ]}
                    data={careerData.students}
                    keyExtractor={(s) => s.student_id}
                    emptyMessage="No students evaluated in this cohort."
                  />
                </Card>
              </div>
            )}

            {/* TAB 7: TRAINEESHIP OUTCOMES */}
            {activeTab === 'outcomes' && outcomesData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                    <span className="text-xs font-bold text-slate-500">PPO / Full-Time Offers</span>
                    <div className="text-3xl font-black text-emerald-600 mt-1">{outcomesData.ppo_offer_count}</div>
                    <span className="text-xs text-slate-400">Direct hiring conversions</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                    <span className="text-xs font-bold text-slate-500">Extended Internships</span>
                    <div className="text-3xl font-black text-amber-600 mt-1">{outcomesData.extended_internship_count}</div>
                    <span className="text-xs text-slate-400">Additional training phase</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                    <span className="text-xs font-bold text-slate-500">Completed (Certificate Only)</span>
                    <div className="text-3xl font-black text-indigo-600 mt-1">{outcomesData.completed_certificate_count}</div>
                    <span className="text-xs text-slate-400">Formal program graduation</span>
                  </div>
                </div>

                <Card title="Traineeship Lifecycle Outcomes Breakdown" subtitle="Aggregated outcome distribution across the organization">
                  <div className="space-y-3 pt-2">
                    {Object.entries(outcomesData.distribution).map(([statusName, count], idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{statusName}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-indigo-600">{count} trainees</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 8: SECURITY & FRAUD ALERTS */}
            {activeTab === 'security' && securityData && (
              <div className="space-y-6">
                <Card
                  title="Security & Fraud Anomaly Monitoring"
                  subtitle="Real-time detection of unregistered devices, geofence violations, and biometric mismatches"
                  action={
                    <Badge variant={securityData.critical_count > 0 ? 'error' : 'success'}>
                      {securityData.total_alerts} Total Alerts
                    </Badge>
                  }
                >
                  <Table
                    columns={[
                      {
                        header: 'Severity',
                        accessor: (a: SecurityAlertItem) => (
                          <Badge
                            variant={
                              a.severity === 'CRITICAL'
                                ? 'error'
                                : a.severity === 'HIGH'
                                ? 'warning'
                                : 'info'
                            }
                          >
                            {a.severity}
                          </Badge>
                        ),
                      },
                      { header: 'Event Type', accessor: (a: SecurityAlertItem) => <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{a.alert_type}</span> },
                      {
                        header: 'Subject / User',
                        accessor: (a: SecurityAlertItem) => a.student_name || a.user_email || 'System Subject',
                      },
                      {
                        header: 'Description',
                        accessor: (a: SecurityAlertItem) => (
                          <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[320px] truncate block" title={a.description}>
                            {a.description}
                          </span>
                        ),
                      },
                      { header: 'Status', accessor: (a: SecurityAlertItem) => <Badge variant="neutral">{a.status}</Badge> },
                      {
                        header: 'Timestamp',
                        accessor: (a: SecurityAlertItem) => new Date(a.timestamp).toLocaleString(),
                      },
                      {
                        header: 'Action',
                        accessor: (a: SecurityAlertItem) => (
                          <Button variant="secondary" size="sm" onClick={() => setSelectedAlert(a)} className="text-xs">
                            Inspect
                          </Button>
                        ),
                      },
                    ]}
                    data={securityData.items}
                    keyExtractor={(a) => a.id}
                    emptyMessage="No security alerts or fraud events detected. All platform metrics within normal bounds."
                  />
                </Card>
              </div>
            )}

            {/* TAB 9: AUDIT TRAIL */}
            {activeTab === 'activity' && activityData && (
              <div className="space-y-6">
                <Card
                  title="Immutable Compliance Audit Trail"
                  subtitle="Tamper-evident system event stream logging actor ID, action, entity, and timestamp"
                  action={
                    <Button variant="secondary" size="sm" onClick={() => navigate('/admin/audit-logs')}>
                      Open Full Audit Log Roster
                    </Button>
                  }
                >
                  <Table
                    columns={[
                      {
                        header: 'Timestamp',
                        accessor: (l: ActivityItem) => new Date(l.timestamp).toLocaleString(),
                      },
                      {
                        header: 'Action',
                        accessor: (l: ActivityItem) => (
                          <span className="font-bold text-amber-700 dark:text-amber-300 font-mono text-xs">
                            {l.action}
                          </span>
                        ),
                      },
                      {
                        header: 'Actor',
                        accessor: (l: ActivityItem) => (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{l.actor_name}</span>
                            <span className="ml-1 text-[10px] text-slate-500 font-mono">({l.actor_role})</span>
                          </div>
                        ),
                      },
                      {
                        header: 'Target Entity',
                        accessor: (l: ActivityItem) => `${l.entity} (${l.entity_id || 'Global'})`,
                      },
                      {
                        header: 'Details',
                        accessor: (l: ActivityItem) => (
                          <span className="text-xs text-slate-600 dark:text-slate-400 max-w-[280px] truncate block" title={l.details || ''}>
                            {l.details || 'N/A'}
                          </span>
                        ),
                      },
                      {
                        header: 'IP Address',
                        accessor: (l: ActivityItem) => l.ip_address || '127.0.0.1',
                      },
                      {
                        header: 'Action',
                        accessor: (l: ActivityItem) => (
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(l)} className="text-xs">
                            Details
                          </Button>
                        ),
                      },
                    ]}
                    data={activityData.items}
                    keyExtractor={(l) => l.id}
                    emptyMessage="No audit logs recorded yet."
                  />
                </Card>
              </div>
            )}
          </>
        )}

        {/* --- STUDENT QUICK-VIEW DRILLDOWN MODAL --- */}
        <Modal
          isOpen={selectedStudent !== null}
          onClose={() => setSelectedStudent(null)}
          title={`Trainee Profile Overview — ${selectedStudent?.full_name ?? ''}`}
        >
          {selectedStudent && (
            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 font-medium">Roll Number</span>
                  <div className="font-mono font-bold text-indigo-600 mt-0.5">{selectedStudent.roll_number}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Program</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedStudent.program_title || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Batch</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedStudent.batch_name || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Readiness Index</span>
                  <div className="text-base font-extrabold text-indigo-600 mt-0.5">
                    {'career_readiness_score' in selectedStudent ? selectedStudent.career_readiness_score : selectedStudent.readiness_score} / 100
                  </div>
                </div>
              </div>

              {'attendance_score' in selectedStudent && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                    Detailed Score Breakdown (PRD Weights)
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Attendance (20%):</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.attendance_score}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Task Performance (25%):</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.task_score}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Skill Progress (25%):</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.skill_score}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Projects & Presentations (15%):</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.project_score}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Assessments (10%):</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.assessment_score}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Mentor Feedback (5%):</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedStudent.mentor_score}%</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="secondary" size="sm" onClick={() => setSelectedStudent(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const sid = 'student_id' in selectedStudent ? selectedStudent.student_id : selectedStudent.id;
                    navigate(`/hr/students/${sid}`);
                  }}
                >
                  Open Full Student Record <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* --- SECURITY ALERT INSPECTION MODAL --- */}
        <Modal
          isOpen={selectedAlert !== null}
          onClose={() => setSelectedAlert(null)}
          title={`Security Alert Inspection — ${selectedAlert?.alert_type ?? ''}`}
        >
          {selectedAlert && (
            <div className="space-y-4 text-xs font-sans">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Severity</span>
                  <Badge variant={selectedAlert.severity === 'CRITICAL' ? 'error' : 'warning'}>{selectedAlert.severity}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Status</span>
                  <Badge variant="neutral">{selectedAlert.status}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Timestamp</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                </div>
                {selectedAlert.student_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Associated Trainee</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAlert.student_name} ({selectedAlert.roll_number})</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Event Description</span>
                <p className="mt-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-mono text-[11px] leading-relaxed">
                  {selectedAlert.description}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                Zero-Trust Guarantee: Raw biometric facial templates and vectors are strictly isolated and never exposed.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedAlert(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* --- AUDIT LOG INSPECTION MODAL --- */}
        <Modal
          isOpen={selectedLog !== null}
          onClose={() => setSelectedLog(null)}
          title={`Audit Record Details — ${selectedLog?.action ?? ''}`}
        >
          {selectedLog && (
            <div className="space-y-4 text-xs font-sans">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Actor</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.actor_name} ({selectedLog.actor_role})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Entity</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.entity} ({selectedLog.entity_id})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">IP Address</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedLog.ip_address || '127.0.0.1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Timestamp</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Recorded Changes / State</span>
                <pre className="mt-1 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.details || 'No extended delta content recorded.'}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
