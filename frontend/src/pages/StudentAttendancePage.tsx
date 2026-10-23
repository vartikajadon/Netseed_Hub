import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Table, Column } from '../components/Table';
import { AttendancePunchModal } from '../components/AttendancePunchModal';
import { api } from '../api/client';
import { StudentAttendanceSummary, AttendanceDailyRecord, Student, RegularizationRequest, RegularizationRequestCreatePayload } from '../types';
import { Clock, Calendar, Globe, MapPin, Camera, Send, FileText, CheckCircle2, AlertCircle, ShieldAlert, UserCheck, Palmtree } from 'lucide-react';
import { formatLocalTime, getStandardDateString, getStandardNow } from '../lib/dateUtils';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { StudentAttendanceCalendar } from '../components/StudentAttendanceCalendar';

export const StudentAttendancePage: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
  const [history, setHistory] = useState<AttendanceDailyRecord[]>([]);
  const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);

  // Student Regularization Request Modal States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestDate, setRequestDate] = useState<string>(getStandardDateString());
  const [requestRecordId, setRequestRecordId] = useState<string | undefined>(undefined);
  const [requestNote, setRequestNote] = useState<string>('');
  const [proposedHours, setProposedHours] = useState<string>('8.0');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [reqModalError, setReqModalError] = useState<string | null>(null);
  const [reqSuccessMsg, setReqSuccessMsg] = useState<string | null>(null);

  const fetchData = async (bypassCache = false) => {
    try {
      if (!summary && history.length === 0) setIsLoading(true);
      const [studentRes, summaryRes, historyRes, reqsRes] = await Promise.all([
        api.get<Student>('/students/me', { bypassCache }),
        api.get<StudentAttendanceSummary>('/attendance/my-summary', { bypassCache }),
        api.get<AttendanceDailyRecord[]>('/attendance/my-records', { bypassCache }),
        api.get<RegularizationRequest[]>('/attendance/my-regularization-requests', { bypassCache }),
      ]);

      setStudent(studentRes);
      setSummary(summaryRes);
      setHistory(historyRes);
      setRegularizationRequests(reqsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [viewMode, setViewMode] = useState<'CALENDAR' | 'TABLE'>('CALENDAR');
  const todayNow = getStandardNow();
  const isWeekendToday = todayNow.getDay() === 0 || todayNow.getDay() === 6;

  const hasPunchedIn = !!summary?.first_punch_in;
  const hasPunchedOut = !!summary?.last_punch_out;

  const openRegularizeModal = (targetDate?: string, recordId?: string) => {
    const todayStr = getStandardDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getStandardDateString(yesterdayDate);
    const chosenDate = targetDate || yesterday;
    if (chosenDate > todayStr) {
      return;
    }
    const d = new Date(chosenDate);
    if (d.getDay() === 0 || d.getDay() === 6) {
      setRequestDate(chosenDate);
      setReqModalError('Saturdays and Sundays are institutional off days for everyone. Attendance regularization is unavailable for weekend days.');
      setIsRequestModalOpen(true);
      return;
    }
    setRequestDate(chosenDate);
    setRequestRecordId(recordId);
    setRequestNote('');
    setProposedHours('8.0');
    setReqModalError(null);
    setReqSuccessMsg(null);
    setIsRequestModalOpen(true);
  };

  const handleRegularizeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestNote.trim() || requestNote.trim().length < 5) {
      setReqModalError('A detailed justification note (minimum 5 characters) is required for Prerna Verma (HR).');
      return;
    }

    const todayStr = getStandardDateString();
    if (requestDate > todayStr) {
      setReqModalError('Attendance regularization is only permitted for past dates, not future dates.');
      return;
    }

    const d = new Date(requestDate);
    if (d.getDay() === 0 || d.getDay() === 6) {
      setReqModalError('Saturdays and Sundays are institutional off days for everyone. Attendance regularization is unavailable for weekend days.');
      return;
    }

    setIsSubmittingReq(true);
    setReqModalError(null);
    try {
      await api.post('/attendance/regularization-requests', {
        date: requestDate,
        reason: requestNote.trim(),
        attendance_record_id: requestRecordId,
        proposed_working_hours: parseFloat(proposedHours) || 8.0,
      });
      setReqSuccessMsg('Regularization request sent to Prerna Verma (HR - hr@netlink.org) successfully!');
      await fetchData();
      setTimeout(() => {
        setIsRequestModalOpen(false);
        setReqSuccessMsg(null);
        setRequestNote('');
      }, 1300);
    } catch (err: any) {
      setReqModalError(err.message || 'Failed to submit regularization request.');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const columns: Column<AttendanceDailyRecord>[] = [
    {
      header: 'Date',
      accessor: (r: AttendanceDailyRecord) => (
        <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold">{r.date}</span>
      ),
    },
    {
      header: 'Punch IN (First)',
      accessor: (r: AttendanceDailyRecord) => (
        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
          {r.first_punch_in ? formatLocalTime(r.first_punch_in) : '—'}
        </span>
      ),
    },
    {
      header: 'Punch OUT (Last)',
      accessor: (r: AttendanceDailyRecord) => (
        <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
          {r.last_punch_out ? formatLocalTime(r.last_punch_out) : '—'}
        </span>
      ),
    },
    {
      header: 'Working Hours',
      accessor: (r: AttendanceDailyRecord) => (
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300">
          {r.total_working_hours} hrs
        </span>
      ),
    },
    {
      header: 'Daily Status',
      accessor: (r: AttendanceDailyRecord) => (
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
      ),
    },
    {
      header: 'Action',
      accessor: (r: AttendanceDailyRecord) => {
        const todayStr = getStandardDateString();
        const isPast = r.date < todayStr;
        const isToday = r.date === todayStr;

        if (isToday) {
          return (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 w-fit">
              <Clock className="w-3 h-3 shrink-0" />
              Today (Mark via Punch)
            </span>
          );
        }

        if (isPast) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openRegularizeModal(r.date, r.id)}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/40 p-1.5"
              title="Send attendance regularization request to Prerna Verma (HR)"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Regularize
            </Button>
          );
        }

        return <span className="text-[11px] text-slate-400 italic">Future Date</span>;
      },
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 sm:gap-2.5">
              <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
              My Attendance & Punch Logs
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Attendance can be marked only for the current day. For past dates, use the regularization request system below.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => openRegularizeModal()}
              className="flex items-center justify-center gap-2 font-bold px-4 py-2.5 sm:py-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 shadow-xs hover:bg-indigo-50 transition-all w-full sm:w-auto min-h-[44px]"
            >
              <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Request Regularization
            </Button>

            {isWeekendToday ? (
              <Button
                variant="secondary"
                size="lg"
                disabled={true}
                className="flex items-center justify-center gap-2 font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 cursor-not-allowed opacity-90 w-full sm:w-auto min-h-[44px]"
                title="All Saturdays and Sundays are institutional off days for everyone. Attendance marking is unavailable."
              >
                <Palmtree className="w-5 h-5 text-rose-500 shrink-0" />
                Weekend Off (Closed)
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsPunchModalOpen(true)}
                disabled={hasPunchedIn && hasPunchedOut}
                className={`flex items-center justify-center gap-2 font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all shadow-md w-full sm:w-auto min-h-[44px] ${
                  hasPunchedIn && hasPunchedOut
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border-none'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 border border-emerald-400/30'
                }`}
              >
                <Camera className="w-5 h-5 stroke-[2.5] shrink-0" />
                {hasPunchedIn && hasPunchedOut
                  ? 'Attendance Completed Today'
                  : hasPunchedIn
                  ? 'Mark Punch OUT Now'
                  : 'Mark Punch IN Now'}
              </Button>
            )}
          </div>
        </div>

        {isLoading && !summary && history.length === 0 && <Loading message="Loading attendance records..." />}
        {error && <ErrorMessage message={error} />}

        {(!isLoading || summary || history.length > 0) && (
          <>
            {/* Today's Status Banner */}
            {summary && (
              <div className="p-5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Today's Punch Summary</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Date: {summary.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Google Server Time
                    </div>
                    <Badge
                      variant={
                        summary.status === 'PRESENT' || summary.status === 'REGULARIZED'
                          ? 'success'
                          : summary.status === 'INCOMPLETE'
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {summary.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Total Hours</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-300 font-bold text-sm">
                      {summary.total_working_hours} hrs
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Punch IN</span>
                    <span className={`font-mono font-bold text-xs ${hasPunchedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {summary.first_punch_in ? formatLocalTime(summary.first_punch_in) : 'Not Checked In'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Punch OUT</span>
                    <span className={`font-mono font-bold text-xs ${hasPunchedOut ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                      {summary.last_punch_out ? formatLocalTime(summary.last_punch_out) : 'Not Checked Out'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> Geofence Status
                    </span>
                    <span className="text-slate-900 dark:text-slate-200 font-semibold text-xs">
                      Inside Netlink Campus
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode Switcher: Calendar View vs Records Ledger Table */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-fit overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('CALENDAR')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none ${
                    viewMode === 'CALENDAR'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Monthly Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none ${
                    viewMode === 'TABLE'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">Punch Ledger</span>
                </button>
              </div>
            </div>

            {viewMode === 'CALENDAR' ? (
              <StudentAttendanceCalendar
                student={student}
                onRegularize={(date) => openRegularizeModal(date)}
              />
            ) : (
              <Card title="Attendance Record History" subtitle="Daily Punch IN & OUT Ledger">
                <Table<AttendanceDailyRecord>
                  data={history}
                  columns={columns}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No historical attendance records found."
                />
              </Card>
            )}

            {/* My Regularization Requests Sent to Prerna Verma */}
            <Card
              title="My Attendance Regularization Requests"
              subtitle="Direct Attendance Override Requests Sent to Prerna Verma (HR)"
            >
              {regularizationRequests.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    You have not submitted any attendance regularization requests yet.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => openRegularizeModal()}>
                    <Send className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    Submit Request to Prerna Verma
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-[620px] w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Target Date</th>
                        <th className="p-3">Note Sent to Prerna Verma</th>
                        <th className="p-3">Proposed Hours</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">HR Review Feedback</th>
                        <th className="p-3">Requested On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {regularizationRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {req.date}
                          </td>
                          <td className="p-3 max-w-xs text-slate-700 dark:text-slate-300 font-medium">
                            <div className="line-clamp-2">{req.reason}</div>
                          </td>
                          <td className="p-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            {req.proposed_working_hours} hrs
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                req.status === 'APPROVED'
                                  ? 'success'
                                  : req.status === 'PENDING'
                                  ? 'warning'
                                  : 'error'
                              }
                            >
                              {req.status === 'PENDING' ? 'Pending (Prerna Verma)' : req.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {req.review_notes ? (
                              <div className="text-[11px] bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {req.reviewed_by_name || 'Prerna Verma'}:
                                </span>{' '}
                                {req.review_notes}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Awaiting review</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Attendance Regularization Request Modal */}
        <Modal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          title={requestDate ? `Request Attendance Regularization (${requestDate})` : 'Request Attendance Regularization'}
        >
          <form onSubmit={handleRegularizeSubmit} className="space-y-4 text-xs font-sans">
            {reqModalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                {reqModalError}
              </div>
            )}

            {reqSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                {reqSuccessMsg}
              </div>
            )}

            {/* Recipient HR Banner */}
            <div className="p-4 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm text-sm">
                PV
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Assigned HR Recipient
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Prerna Verma (HR Manager)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  hr@netlink.org • Netlink Software Group America Inc.
                </div>
              </div>
              {requestDate && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Date</div>
                  <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">{requestDate}</div>
                </div>
              )}
            </div>

            <div>
              <Input
                label="Proposed Daily Working Hours *"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={proposedHours}
                onChange={(e) => setProposedHours(e.target.value)}
                placeholder="e.g. 8.0"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Reason & Justification Note (Sent directly to Prerna Verma) *
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Please state clear details for HR Prerna Verma (e.g. biometric camera connection failure, approved external mentor duty, GPS drift outside geofence boundary)..."
                rows={4}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Your note will be sent directly to HR Prerna Verma for verification and regularization audit.
              </p>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsRequestModalOpen(false)} className="w-full sm:w-auto min-h-[38px]">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmittingReq} className="w-full sm:w-auto min-h-[40px] text-center justify-center">
                <Send className="w-3.5 h-3.5 mr-1 shrink-0" />
                Submit Request to Prerna Verma
              </Button>
            </div>
          </form>
        </Modal>

        <AttendancePunchModal
          isOpen={isPunchModalOpen}
          onClose={() => setIsPunchModalOpen(false)}
          onSuccess={fetchData}
          attendanceSummary={summary}
        />
      </div>
    </Layout>
  );
};
