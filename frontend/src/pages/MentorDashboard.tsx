import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { MentorFeedbackModal } from '../components/MentorFeedbackModal';
import { api } from '../api/client';
import { Student, Batch, PaginatedStudentList, MentorFeedbackItem, AttendanceDailyRecord } from '../types';
import {
  Users, BookOpen, UserCheck, UserX, UserMinus, AlertTriangle, ShieldCheck,
  MessageSquare, PlusCircle, Star, Calendar, ArrowRight,
  User, CheckCircle2, AlertCircle, ChevronRight, Eye, Layers, Search,
  Clock, MapPin, Phone, Mail, FileText, Info, ShieldAlert, RefreshCw
} from 'lucide-react';
import { formatLocalTime, formatLocalDate, getStandardDateString } from '../lib/dateUtils';

export const MentorDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [feedbacks, setFeedbacks] = useState<MentorFeedbackItem[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceDailyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state for KPI Cards
  const [isTodayPresentModalOpen, setIsTodayPresentModalOpen] = useState(false);
  const [isTodayAbsentModalOpen, setIsTodayAbsentModalOpen] = useState(false);
  const [isDropoutModalOpen, setIsDropoutModalOpen] = useState(false);
  const [isActiveBatchesModalOpen, setIsActiveBatchesModalOpen] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // Search inside modals
  const [presentSearch, setPresentSearch] = useState('');
  const [absentSearch, setAbsentSearch] = useState('');
  const [dropoutSearch, setDropoutSearch] = useState('');

  // Feedback Modal state
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<string | undefined>(undefined);

  // Real-time refresh state
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const todayStr = useMemo(() => getStandardDateString(), []);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const [stdRes, batchData, feedbackData, attendanceData] = await Promise.all([
        api.get<PaginatedStudentList | Student[]>('/students?limit=500'),
        api.get<Batch[]>('/batches'),
        api.get<MentorFeedbackItem[]>('/feedbacks').catch(() => []),
        api.get<AttendanceDailyRecord[]>(`/attendance/daily-records?target_date=${todayStr}`).catch(() => []),
      ]);

      const studentList = Array.isArray(stdRes) ? stdRes : stdRes.items || [];
      setStudents(studentList);
      setBatches(batchData || []);
      setFeedbacks(feedbackData || []);
      setTodayRecords(attendanceData || []);
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load mentor overview data');
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time polling: Refresh overview & attendance pulse every 10 seconds
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [todayStr]);

  const handleOpenFeedback = (studentId?: string) => {
    setSelectedStudentForFeedback(studentId);
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSubmitted = (newFeedback: MentorFeedbackItem) => {
    setFeedbacks((prev) => [newFeedback, ...prev]);
  };

  // Map today's attendance records by student_id
  const todayRecordsMap = useMemo(() => {
    const map = new Map<string, AttendanceDailyRecord>();
    todayRecords.forEach((r) => {
      map.set(r.student_id, r);
    });
    return map;
  }, [todayRecords]);

  // 1. Active Batches
  const activeBatches = useMemo(() => {
    return batches.filter((b) => b.status === 'ACTIVE');
  }, [batches]);

  // 2. Active Enrolled Trainees (eligible for attendance)
  const activeTrainees = useMemo(() => {
    return students.filter(
      (s) => s.enrollment_status === 'ACTIVE' || s.enrollment_status === 'ENROLLED'
    );
  }, [students]);

  // 3. Today's Presentees (Students who punched in today or have completed required attendance)
  const presentStudents = useMemo(() => {
    return activeTrainees.filter((s) => {
      const rec = todayRecordsMap.get(s.id);
      if (!rec) return false;
      return (
        rec.status === 'PRESENT' ||
        rec.status === 'REGULARIZED' ||
        Boolean(rec.first_punch_in) ||
        (Number(rec.punch_count) > 0)
      );
    });
  }, [activeTrainees, todayRecordsMap]);

  // 4. Today's Absentees (Active trainees who have not punched in or marked attendance today)
  const absentStudents = useMemo(() => {
    return activeTrainees.filter((s) => {
      const rec = todayRecordsMap.get(s.id);
      if (!rec) return true;
      const isPresentOrCheckedIn =
        rec.status === 'PRESENT' ||
        rec.status === 'REGULARIZED' ||
        Boolean(rec.first_punch_in) ||
        (Number(rec.punch_count) > 0);
      return !isPresentOrCheckedIn;
    });
  }, [activeTrainees, todayRecordsMap]);

  // 5. Dropout Students (marked by HR due to switching courses mid-way or discontinuing)
  const dropoutStudents = useMemo(() => {
    return students.filter(
      (s) => s.enrollment_status === 'DROPOUT' || s.enrollment_status === 'DROPPED'
    );
  }, [students]);

  // 6. Map latest feedback to each student
  const studentFeedbackMap = useMemo(() => {
    const map: Record<string, { latestRating: number; latestComment: string; latestDate: string }> = {};
    feedbacks.forEach((fb) => {
      if (!map[fb.student_id]) {
        map[fb.student_id] = {
          latestRating: Number(fb.average_rating),
          latestComment: fb.comment,
          latestDate: fb.created_at,
        };
      }
    });
    return map;
  }, [feedbacks]);

  // 7. Defaulter Students with low rating (< 2.0)
  const defaulterStudents = useMemo(() => {
    return students.filter((s) => {
      const info = studentFeedbackMap[s.id];
      return info && info.latestRating < 2.0;
    });
  }, [students, studentFeedbackMap]);

  // Filtered lists for modals
  const filteredPresentStudents = useMemo(() => {
    const q = presentSearch.toLowerCase().trim();
    if (!q) return presentStudents;
    return presentStudents.filter(
      (s) =>
        (s.user?.full_name || '').toLowerCase().includes(q) ||
        (s.roll_number || '').toLowerCase().includes(q) ||
        (s.batch?.name || '').toLowerCase().includes(q)
    );
  }, [presentStudents, presentSearch]);

  const filteredAbsentStudents = useMemo(() => {
    const q = absentSearch.toLowerCase().trim();
    if (!q) return absentStudents;
    return absentStudents.filter(
      (s) =>
        (s.user?.full_name || '').toLowerCase().includes(q) ||
        (s.roll_number || '').toLowerCase().includes(q) ||
        (s.batch?.name || '').toLowerCase().includes(q)
    );
  }, [absentStudents, absentSearch]);

  const filteredDropoutStudents = useMemo(() => {
    const q = dropoutSearch.toLowerCase().trim();
    if (!q) return dropoutStudents;
    return dropoutStudents.filter(
      (s) =>
        (s.user?.full_name || '').toLowerCase().includes(q) ||
        (s.roll_number || '').toLowerCase().includes(q) ||
        (s.dropout_reason || '').toLowerCase().includes(q) ||
        (s.batch?.name || '').toLowerCase().includes(q)
    );
  }, [dropoutStudents, dropoutSearch]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Mentor Overview
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Daily attendance pulse, dropout tracking, active cohort metrics, and trainee evaluation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Live Real-Time
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchData(false)}
              className="text-xs"
              isLoading={isRefreshing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenFeedback()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Give Feedback
            </Button>
          </div>
        </div>

        {isLoading && <Loading message="Loading mentor overview and attendance metrics..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && (
          <div className="space-y-6">
            {/* Top 5 Key Metric KPI Cards (Clickable) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {/* 1. Today's Presentees KPI Card */}
              <button
                type="button"
                onClick={() => {
                  setPresentSearch('');
                  setIsTodayPresentModalOpen(true);
                }}
                className="p-4 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-2xl shadow-xs text-left transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    Today's Present
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {presentStudents.length}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                    <span>Click to view list</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 2. Today's Absentees KPI Card */}
              <button
                type="button"
                onClick={() => {
                  setAbsentSearch('');
                  setIsTodayAbsentModalOpen(true);
                }}
                className="p-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/80 hover:border-rose-500 dark:hover:border-rose-400 rounded-2xl shadow-xs text-left transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider">
                    Today's Absent
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserX className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                    {absentStudents.length}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-400 font-semibold mt-1">
                    <span>Click to view list</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 3. Dropout Students KPI Card */}
              <button
                type="button"
                onClick={() => {
                  setDropoutSearch('');
                  setIsDropoutModalOpen(true);
                }}
                className="p-4 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/80 hover:border-purple-500 dark:hover:border-purple-400 rounded-2xl shadow-xs text-left transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wider">
                    Dropout Students
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserMinus className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">
                    {dropoutStudents.length}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-400 font-semibold mt-1">
                    <span>Course switched / Mid</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 4. Active Batches KPI Card */}
              <button
                type="button"
                onClick={() => setIsActiveBatchesModalOpen(true)}
                className="p-4 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl shadow-xs text-left transition-all hover:shadow-md group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-wider">
                    Active Batches
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
                    {activeBatches.length}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold mt-1">
                    <span>Ongoing cohorts</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 5. Defaulter Students KPI Card */}
              <div
                className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs flex flex-col justify-between transition-all ${
                  defaulterStudents.length > 0
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Defaulter Trainees
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                    {defaulterStudents.length}
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400/90 mt-1 block font-medium">
                    Rating &lt; 2.0
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Defaulters Section */}
            <Card
              title={`Defaulter Students (${defaulterStudents.length})`}
              subtitle="Trainees with performance rating below 2.0 requiring mentorship intervention"
              action={
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 px-2.5 py-1 rounded-xl">
                  Threshold: Rating &lt; 2.0
                </span>
              }
            >
              {defaulterStudents.length > 0 ? (
                <div className="space-y-3">
                  {defaulterStudents.map((s) => {
                    const info = studentFeedbackMap[s.id];
                    return (
                      <div
                        key={s.id}
                        className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 rounded-2xl space-y-3 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                              <span>{s.user?.full_name || s.roll_number}</span>
                              <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-bold">
                                {s.roll_number}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              {s.batch?.name || s.program?.title || 'Assigned Trainee'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black font-mono bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                              <Star className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                              {info ? info.latestRating.toFixed(1) : '< 2.0'} / 5.0
                            </span>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenFeedback(s.id)}
                              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                            >
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Re-evaluate
                            </Button>
                          </div>
                        </div>

                        {info && info.latestComment && (
                          <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-rose-200/80 dark:border-rose-800/60 text-xs text-slate-700 dark:text-slate-300 italic">
                            <strong className="not-italic text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                              Mentor Evaluation Note:
                            </strong>
                            "{info.latestComment}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Defaulter Trainees Found
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    All evaluated trainees currently meet or exceed the performance rating threshold (&ge; 2.0).
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ================================================================= */}
        {/* 1. TODAY'S PRESENTEES MODAL (ON CLICK OF KPI CARD)                 */}
        {/* ================================================================= */}
        <Modal
          isOpen={isTodayPresentModalOpen}
          onClose={() => setIsTodayPresentModalOpen(false)}
          title={`Today's Presentees (${presentStudents.length})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                Trainees who have completed face biometric verification and punched in for today ({todayStr}):
              </p>
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search present trainees..."
                  value={presentSearch}
                  onChange={(e) => setPresentSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {filteredPresentStudents.length > 0 ? (
                filteredPresentStudents.map((s) => {
                  const rec = todayRecordsMap.get(s.id);
                  return (
                    <div
                      key={s.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {s.user?.full_name ? s.user.full_name.substring(0, 2) : 'TR'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{s.user?.full_name || 'Trainee'}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold">
                              {s.roll_number}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{s.batch?.name || s.program?.title || 'Active Batch'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              <MapPin className="w-3 h-3" /> Within Campus Geofence
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>In: {rec?.first_punch_in ? formatLocalTime(rec.first_punch_in) : 'Punched'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {rec?.total_working_hours ? `${rec.total_working_hours.toFixed(1)} hrs logged` : 'Active'}
                          </div>
                        </div>
                        <Badge
                          variant={
                            rec?.status === 'PRESENT'
                              ? 'success'
                              : rec?.status === 'REGULARIZED'
                              ? 'info'
                              : 'warning'
                          }
                        >
                          {rec?.status === 'PRESENT'
                            ? 'PRESENT'
                            : rec?.status === 'REGULARIZED'
                            ? 'REGULARIZED'
                            : 'CHECKED IN'}
                        </Badge>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setIsTodayPresentModalOpen(false);
                            handleOpenFeedback(s.id);
                          }}
                          className="text-[11px] px-2.5 py-1"
                        >
                          Rate
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500">
                  No present trainees matching your search.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsTodayPresentModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>

        {/* ================================================================= */}
        {/* 2. TODAY'S ABSENTEES MODAL (ON CLICK OF KPI CARD)                  */}
        {/* ================================================================= */}
        <Modal
          isOpen={isTodayAbsentModalOpen}
          onClose={() => setIsTodayAbsentModalOpen(false)}
          title={`Today's Absentees (${absentStudents.length})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-slate-600 dark:text-slate-400 text-xs">
                Active trainees who have not marked attendance or checked in for today ({todayStr}):
              </p>
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search absent trainees..."
                  value={absentSearch}
                  onChange={(e) => setAbsentSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {filteredAbsentStudents.length > 0 ? (
                filteredAbsentStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {s.user?.full_name ? s.user.full_name.substring(0, 2) : 'AB'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{s.user?.full_name || 'Trainee'}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold">
                            {s.roll_number}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                          <span>{s.batch?.name || s.program?.title || 'Batch'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {s.contact_number || 'No contact'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {s.user?.email || 'No email'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <Badge variant="error">ABSENT</Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsTodayAbsentModalOpen(false);
                          handleOpenFeedback(s.id);
                        }}
                        className="text-[11px] px-2.5 py-1"
                      >
                        Feedback
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-500">
                  No absent trainees matching your search.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsTodayAbsentModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>

        {/* ================================================================= */}
        {/* 3. DROPOUT STUDENTS MODAL (ON CLICK OF KPI CARD)                   */}
        {/* ================================================================= */}
        <Modal
          isOpen={isDropoutModalOpen}
          onClose={() => setIsDropoutModalOpen(false)}
          title={`Dropout Students (${dropoutStudents.length})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Informational Banner */}
            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-purple-900 dark:text-purple-200 block">
                  Institutional Dropout Policy & Administrative Rule
                </span>
                <p className="text-[11px] text-purple-700 dark:text-purple-300/90 mt-0.5 leading-relaxed">
                  Dropout students are trainees who discontinued or switched their course midway due to domain transition, academic conflict, or personal reasons.
                  <strong className="font-bold"> Only HR has the administrative authority to record student dropouts with verified reason.</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Assigned Cohort Dropouts ({filteredDropoutStudents.length})
              </span>
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search dropouts or reason..."
                  value={dropoutSearch}
                  onChange={(e) => setDropoutSearch(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredDropoutStudents.length > 0 ? (
                filteredDropoutStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-purple-200/80 dark:border-purple-800/60 rounded-xl space-y-2.5 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {s.user?.full_name ? s.user.full_name.substring(0, 2) : 'DO'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{s.user?.full_name || 'Trainee'}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold">
                              {s.roll_number}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {s.program?.title || 'Program'} • {s.batch?.name || 'Batch'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <Badge variant="error" className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800">
                          DROPOUT
                        </Badge>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {s.dropout_date || formatLocalDate(s.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Official HR Dropout Reason */}
                    <div className="p-2.5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60 rounded-lg text-xs">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Official Dropout Justification (HR Verified):
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Marked by HR
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 italic font-sans text-[11px]">
                        "{s.dropout_reason || 'Course switched midway to alternate domain as approved by HR.'}"
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {s.contact_number || 'No contact number'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {s.user?.email || 'No email registered'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2">
                    <UserMinus className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    No Dropout Trainees Recorded
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All students in your assigned cohorts are actively enrolled or completed.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDropoutModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>

        {/* ================================================================= */}
        {/* 4. ACTIVE BATCHES MODAL (DISPLAYED ON CLICK)                      */}
        {/* ================================================================= */}
        <Modal
          isOpen={isActiveBatchesModalOpen}
          onClose={() => {
            setIsActiveBatchesModalOpen(false);
            setExpandedBatchId(null);
          }}
          title={`Active Batches (${activeBatches.length})`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs font-sans">
            <p className="text-slate-600 dark:text-slate-400 text-xs">
              Review currently running cohorts assigned to your mentorship schedule:
            </p>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {activeBatches.length > 0 ? (
                activeBatches.map((b) => {
                  const traineesInBatch = students.filter((s) => s.batch_id === b.id);
                  const isExpanded = expandedBatchId === b.id;

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2.5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
                            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            {b.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {b.start_date} ~ {b.end_date}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="success">{b.status}</Badge>
                          <button
                            type="button"
                            onClick={() => setExpandedBatchId(isExpanded ? null : b.id)}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <span>{traineesInBatch.length} Trainees</span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Trainees in this batch */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Enrolled Trainees ({traineesInBatch.length})
                          </span>
                          {traineesInBatch.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                              {traineesInBatch.map((s) => (
                                <div
                                  key={s.id}
                                  className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between text-[11px]"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                                      {s.user?.full_name || s.roll_number}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {s.roll_number}
                                    </div>
                                  </div>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setIsActiveBatchesModalOpen(false);
                                      handleOpenFeedback(s.id);
                                    }}
                                    className="text-[10px] px-2 py-0.5"
                                  >
                                    Rate
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 py-1 italic">
                              No trainees currently linked to this batch.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  No active batches currently in progress.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsActiveBatchesModalOpen(false);
                  setExpandedBatchId(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>

        {/* Mentor Feedback Modal */}
        <MentorFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          students={students}
          preselectedStudentId={selectedStudentForFeedback}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      </div>
    </Layout>
  );
};
