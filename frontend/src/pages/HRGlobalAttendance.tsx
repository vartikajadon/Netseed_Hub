import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { FaceEnrollmentModal } from '../components/FaceEnrollmentModal';
import { AttendanceRegularizeModal } from '../components/AttendanceRegularizeModal';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { AttendanceDailyRecord, Program, Batch, Student, RegularizationRequest, RegularizationRequestReviewPayload } from '../types';
import { Clock, Calendar, CheckCircle2, XCircle, AlertCircle, RefreshCw, Filter, Search, Camera, ShieldCheck, MapPin, Send, Check, X, ShieldAlert, UserCheck } from 'lucide-react';
import { formatLocalTime, getStandardDateString } from '../lib/dateUtils';

export const HRGlobalAttendance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'REQUESTS'>('ROSTER');
  const [records, setRecords] = useState<AttendanceDailyRecord[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Filter state
  const [targetDate, setTargetDate] = useState<string>(getStandardDateString());
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [reqStatusFilter, setReqStatusFilter] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [enrollingStudent, setEnrollingStudent] = useState<Student | null>(null);
  const [regularizingRecord, setRegularizingRecord] = useState<AttendanceDailyRecord | null>(null);

  // Review Student Request Modal State
  const [reviewingRequest, setReviewingRequest] = useState<RegularizationRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewOverrideHours, setReviewOverrideHours] = useState<string>('8.0');
  const [reviewStatus, setReviewStatus] = useState<string>('REGULARIZED');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchFilters = async () => {
    try {
      const [progs, bts] = await Promise.all([
        api.get<Program[]>('/programs'),
        api.get<Batch[]>('/batches'),
      ]);
      setPrograms(progs);
      setBatches(bts);
    } catch {
      // Ignore filter load error
    }
  };

  const fetchDailyRoster = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (targetDate) queryParams.append('target_date', targetDate);
      if (selectedProgram) queryParams.append('program_id', selectedProgram);
      if (selectedBatch) queryParams.append('batch_id', selectedBatch);
      if (selectedStatus) queryParams.append('status', selectedStatus);

      const [res, reqs] = await Promise.all([
        api.get<AttendanceDailyRecord[]>(`/attendance/daily-records?${queryParams.toString()}`),
        api.get<RegularizationRequest[]>('/attendance/regularization-requests').catch(() => []),
      ]);
      setRecords(res || []);
      setRegularizationRequests(reqs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance roster.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingRequest) return;
    setIsSubmittingReview(true);
    setReviewError(null);
    try {
      const payload: RegularizationRequestReviewPayload = {
        action: reviewAction,
        review_notes: reviewNotes.trim() || undefined,
        status: reviewStatus,
        override_working_hours: parseFloat(reviewOverrideHours) || 8.0,
      };
      await api.post(`/attendance/regularization-requests/${reviewingRequest.id}/review`, payload);
      setReviewingRequest(null);
      await fetchDailyRoster();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to review request.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchDailyRoster();
  }, [targetDate, selectedProgram, selectedBatch, selectedStatus]);

  // Client-side search filter
  const filteredRecords = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = (r.student?.user?.full_name || '').toLowerCase().includes(q);
    const matchRoll = (r.student?.roll_number || '').toLowerCase().includes(q);
    const matchProg = (r.student?.program?.title || '').toLowerCase().includes(q);
    return matchName || matchRoll || matchProg;
  });

  // Analytics Counters
  const presentCount = records.filter((r) => r.status === 'PRESENT' || r.status === 'REGULARIZED').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const incompleteCount = records.filter((r) => r.status === 'INCOMPLETE').length;

  const columns: Column<AttendanceDailyRecord>[] = [
    {
      header: 'Student Roll & Name',
      accessor: (r) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{r.student?.user?.full_name || 'N/A'}</div>
          <div className="text-xs text-indigo-600 dark:text-indigo-300 font-mono font-semibold">{r.student?.roll_number || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Program & Batch',
      accessor: (r) => (
        <div>
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{r.student?.program?.title || 'Unassigned Program'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{r.student?.batch?.name || 'Unassigned Batch'}</div>
        </div>
      ),
    },
    {
      header: 'First Punch IN',
      accessor: (r) => (
        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {r.first_punch_in ? formatLocalTime(r.first_punch_in) : '—'}
        </span>
      ),
    },
    {
      header: 'Last Punch OUT',
      accessor: (r) => (
        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
          {r.last_punch_out ? formatLocalTime(r.last_punch_out) : '—'}
        </span>
      ),
    },
    {
      header: 'Working Hours',
      accessor: (r) => (
        <div>
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">{r.total_working_hours} hrs</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">({r.total_working_minutes} mins)</span>
        </div>
      ),
    },
    {
      header: 'Face Baseline',
      accessor: (r) => {
        const isEnrolled = r.student?.face_enrollment_status === 'ENROLLED';
        return (
          <div>
            <Badge variant={isEnrolled ? 'success' : 'neutral'}>
              {isEnrolled ? 'ENROLLED' : 'NOT ENROLLED'}
            </Badge>
            {!isEnrolled && r.student && (
              <button
                onClick={() => setEnrollingStudent(r.student!)}
                className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline block flex items-center gap-0.5 font-semibold"
              >
                <Camera className="w-3.5 h-3.5" /> Enroll Face
              </button>
            )}
            {isEnrolled && r.student && (
              <button
                onClick={() => setEnrollingStudent(r.student!)}
                className="mt-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                title="Re-enroll biometric facial template"
              >
                <RefreshCw className="w-3 h-3" /> Re-enroll Face
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: 'Attendance Status',
      accessor: (r) => (
        <div>
          <Badge
            variant={
              r.status === 'PRESENT' || r.status === 'REGULARIZED'
                ? 'success'
                : r.status === 'INCOMPLETE'
                ? 'warning'
                : 'error'
            }
          >
            {r.status}
          </Badge>
          {r.is_regularized && (
            <span className="text-xs text-amber-700 dark:text-amber-300 font-bold block mt-0.5">HR Regularized</span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (r) => {
        const todayStr = getStandardDateString();
        if (r.date > todayStr) {
          return <span className="text-xs text-slate-400 italic">Future Date</span>;
        }
        return (
          <Button
            size="sm"
            variant="outline"
            title="Manual HR Regularization Override"
            onClick={() => setRegularizingRecord(r)}
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mr-1" /> Regularize
          </Button>
        );
      },
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Clock className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Global Attendance Monitoring & Regularization
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Real-time daily roster attendance, face liveness verification logs, working hours calculation, and HR regularization queue.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('ROSTER')}
            className={`pb-3 px-2 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'ROSTER'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Daily Attendance Roster
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {records.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`pb-3 px-2 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'REQUESTS'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Send className="w-4 h-4" />
            Student Regularization Requests (Prerna Verma)
            {regularizationRequests.filter((r) => r.status === 'PENDING').length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold animate-pulse">
                {regularizationRequests.filter((r) => r.status === 'PENDING').length} Pending
              </span>
            )}
          </button>
        </div>

        {activeTab === 'ROSTER' && (
          <>
            {/* Analytics Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-semibold">Present Students (&gt;= 5.0 hrs)</span>
                  <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{presentCount}</span>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-semibold">Incomplete Punches (Missing OUT)</span>
                  <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{incompleteCount}</span>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1">
                  <span className="text-xs text-slate-600 dark:text-slate-400 block font-semibold">Absent Students (&lt; 5.0 hrs)</span>
                  <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{absentCount}</span>
                </div>
                <div className="p-3 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl">
                  <XCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Filter Controls Card */}
            <Card title="Attendance Roster Controls" subtitle="Filter daily attendance records by date or program">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <Input
                  label="Target Date"
                  type="date"
                  max={getStandardDateString()}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 text-xs">Program</label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Programs</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Input
                    label="Search Student"
                    placeholder="Search name/roll..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Daily Roster Table */}
            {isLoading && <Loading message="Fetching daily attendance records..." />}
            {error && <ErrorMessage message={error} />}

            {!isLoading && !error && (
              <Card title={`Daily Roster for ${targetDate}`} subtitle={`Showing ${filteredRecords.length} student attendance logs`}>
                <Table
                  columns={columns}
                  data={filteredRecords}
                  keyExtractor={(r) => r.id}
                  emptyMessage="No attendance records found matching your filters for this date."
                />
              </Card>
            )}
          </>
        )}

        {activeTab === 'REQUESTS' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Pending Review</span>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {regularizationRequests.filter((r) => r.status === 'PENDING').length}
                  </div>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">Approved / Regularized</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {regularizationRequests.filter((r) => r.status === 'APPROVED').length}
                  </div>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold">Rejected Requests</span>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {regularizationRequests.filter((r) => r.status === 'REJECTED').length}
                  </div>
                </div>
                <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-rose-600">
                  <XCircle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Filter by status:</span>
                {['', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setReqStatusFilter(st)}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors ${
                      reqStatusFilter === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st === '' ? 'All' : st}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Reviewer: <strong className="text-indigo-600 dark:text-indigo-400">Prerna Verma (HR)</strong>
              </span>
            </div>

            {/* Requests Table */}
            <Card
              title="Student Regularization Inbound Requests"
              subtitle="All requests submitted by students with explanatory notes addressed to Prerna Verma"
            >
              {regularizationRequests.filter((r) => !reqStatusFilter || r.status === reqStatusFilter).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No regularization requests found for this filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 font-semibold uppercase">
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Student Note / Reason</th>
                        <th className="py-3 px-4">Proposed Hours</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Review Notes</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {regularizationRequests
                        .filter((r) => !reqStatusFilter || r.status === reqStatusFilter)
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {req.student_name || 'Student'}
                              </div>
                              <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                {req.roll_number || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {req.date}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-700 dark:text-slate-300 italic border border-slate-200 dark:border-slate-700/60">
                                "{req.reason}"
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {req.proposed_working_hours ? `${req.proposed_working_hours} hrs` : '8.0 hrs'}
                            </td>
                            <td className="py-3.5 px-4">
                              <Badge
                                variant={
                                  req.status === 'APPROVED'
                                    ? 'success'
                                    : req.status === 'PENDING'
                                    ? 'warning'
                                    : 'error'
                                }
                              >
                                {req.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs">
                              {req.review_notes ? (
                                <span className="text-slate-700 dark:text-slate-300">{req.review_notes}</span>
                              ) : (
                                <span className="italic text-slate-400">No review remarks</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {req.status === 'PENDING' ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setReviewingRequest(req);
                                    setReviewAction('APPROVE');
                                    setReviewStatus('REGULARIZED');
                                    setReviewOverrideHours(String(req.proposed_working_hours || 8.0));
                                    setReviewNotes('');
                                    setReviewError(null);
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  <UserCheck className="w-3.5 h-3.5 mr-1" /> Review Request
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Completed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Modals */}
        <FaceEnrollmentModal
          isOpen={!!enrollingStudent}
          onClose={() => setEnrollingStudent(null)}
          onSuccess={fetchDailyRoster}
          student={enrollingStudent}
        />

        <AttendanceRegularizeModal
          isOpen={!!regularizingRecord}
          onClose={() => setRegularizingRecord(null)}
          onSuccess={fetchDailyRoster}
          record={regularizingRecord}
        />

        {/* Review Student Request Modal */}
        <Modal
          isOpen={!!reviewingRequest}
          onClose={() => setReviewingRequest(null)}
          title={`Review Attendance Request — ${reviewingRequest?.student_name || 'Student'}`}
        >
          {reviewingRequest && (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs space-y-1.5 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Roll No:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {reviewingRequest.roll_number || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Date:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{reviewingRequest.date}</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-semibold block mb-1">Student Note to Prerna Verma:</span>
                  <p className="p-2 bg-white dark:bg-slate-900 rounded-lg text-slate-800 dark:text-slate-200 italic border border-slate-200 dark:border-slate-800">
                    "{reviewingRequest.reason}"
                  </p>
                </div>
              </div>

              {reviewError && <ErrorMessage message={reviewError} />}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Decision Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('APPROVE');
                      setReviewStatus('REGULARIZED');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      reviewAction === 'APPROVE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Check className="w-4 h-4" /> Approve & Regularize
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewAction('REJECT');
                      setReviewStatus('REJECTED');
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      reviewAction === 'REJECT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <X className="w-4 h-4" /> Reject Request
                  </button>
                </div>
              </div>

              {reviewAction === 'APPROVE' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Override Hours (hrs)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="16"
                      value={reviewOverrideHours}
                      onChange={(e) => setReviewOverrideHours(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Record Status
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
                    >
                      <option value="REGULARIZED">REGULARIZED</option>
                      <option value="PRESENT">PRESENT</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  HR Reviewer Note / Feedback
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified genuine punch failure. Regularized to 8.0 hours as requested."
                  rows={3}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setReviewingRequest(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingReview}
                  className={reviewAction === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
                >
                  {isSubmittingReview ? 'Submitting...' : reviewAction === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
