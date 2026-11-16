import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { Modal } from '../components/Modal';
import { AttendancePunchModal } from '../components/AttendancePunchModal';
import { FaceEnrollmentModal } from '../components/FaceEnrollmentModal';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../api/client';
import {
  Student,
  Consent,
  StudentAttendanceSummary,
  NoDuesRequest,
  NoDuesChecklistItem,
  StudentFeeSummary,
  IssuedLetter,
  IssuedCertificate,
  MentorFeedbackItem,
  ProgramCurriculum
} from '../types';
import {
  User, ShieldCheck, CheckCircle2, Clock, Camera, MapPin, AlertCircle,
  Globe, FileCheck, IndianRupee, Mail, Award, CheckSquare, Download,
  ExternalLink, Send, AlertTriangle, Star, MessageSquare, ArrowRight,
  BookOpen, TrendingUp, FolderGit2
} from 'lucide-react';
import { formatLocalTime } from '../lib/dateUtils';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [student, setStudent] = useState<Student | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<StudentAttendanceSummary | null>(null);
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isReEnrollHelpOpen, setIsReEnrollHelpOpen] = useState(false);
  const [isNotEnrolledNoticeOpen, setIsNotEnrolledNoticeOpen] = useState(false);

  // No Dues Form Popup State
  const [activeNoDues, setActiveNoDues] = useState<NoDuesRequest | null>(null);
  const [isNoDuesModalOpen, setIsNoDuesModalOpen] = useState(false);
  const [studentChecklist, setStudentChecklist] = useState<NoDuesChecklistItem[]>([]);
  const [studentNotes, setStudentNotes] = useState('');
  const [isSubmittingNoDues, setIsSubmittingNoDues] = useState(false);

  // Fees, Letters & Certificates State
  const [feeSummary, setFeeSummary] = useState<StudentFeeSummary | null>(null);
  const [myLetters, setMyLetters] = useState<IssuedLetter[]>([]);
  const [myCertificates, setMyCertificates] = useState<IssuedCertificate[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<IssuedLetter | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<IssuedCertificate | null>(null);
  const [myFeedbacks, setMyFeedbacks] = useState<MentorFeedbackItem[]>([]);
  const [myCurriculum, setMyCurriculum] = useState<ProgramCurriculum | null>(null);

  // Capstone Project Submission State
  const [myProjectUrlInput, setMyProjectUrlInput] = useState('');
  const [isSubmittingProjectUrl, setIsSubmittingProjectUrl] = useState(false);
  const [projectSubmitSuccess, setProjectSubmitSuccess] = useState<string | null>(null);
  const [projectSubmitError, setProjectSubmitError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      if (user) {
        // Stage 1: Fast Critical Path (Hero profile, attendance summary, and curriculum)
        const [myStudent, summaryRes, curriculumRes] = await Promise.all([
          api.get<Student>('/students/me').catch(() => null),
          api.get<StudentAttendanceSummary>('/attendance/my-summary').catch(() => null),
          api.get<ProgramCurriculum>('/curriculum/my-curriculum').catch(() => null),
        ]);

        setStudent(myStudent);
        setAttendanceSummary(summaryRes);
        setMyCurriculum(curriculumRes);
        setIsLoading(false); // Render dashboard immediately without waiting for secondary requests

        // Stage 2: Secondary Data (Consents, letters, certs, feedbacks, no dues, fees)
        Promise.all([
          api.get<Consent[]>(`/consents?user_id=${user.id}`).catch(() => []),
          api.get<NoDuesRequest | null>('/no-dues/requests/my-pending').catch(() => null),
          api.get<StudentFeeSummary[]>('/fees/students').then(r => (Array.isArray(r) && r.length > 0 ? r[0] : null)).catch(() => null),
          api.get<IssuedLetter[]>('/letters/my-letters').catch(() => []),
          api.get<IssuedCertificate[]>('/certificates/my-certificates').catch(() => []),
          api.get<MentorFeedbackItem[]>('/feedbacks').catch(() => []),
        ]).then(([myConsents, pendingNoDues, feeRes, lettersRes, certsRes, feedbackRes]) => {
          setConsents(myConsents);
          setFeeSummary(feeRes);
          setMyLetters(lettersRes || []);
          setMyCertificates(certsRes || []);
          setMyFeedbacks(feedbackRes || []);

          if (pendingNoDues) {
            const filteredItems = (pendingNoDues.checklist_items || []).filter((item) => {
              const n = (item.item_name || '').toLowerCase();
              const d = (item.department || '').toLowerCase();
              return !['library', 'it asset', 'laptop', 'hostel', 'hardware'].some((t) => n.includes(t) || d.includes(t));
            });
            setActiveNoDues({ ...pendingNoDues, checklist_items: filteredItems });
            setStudentChecklist(filteredItems);
            setStudentNotes(pendingNoDues.student_notes || '');
            if (pendingNoDues.status === 'PENDING_STUDENT') {
              setIsNoDuesModalOpen(true);
            }
          } else {
            setActiveNoDues(null);
          }
        }).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student dashboard data');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  useEffect(() => {
    if (student?.project_url) {
      setMyProjectUrlInput(student.project_url);
    }
  }, [student?.project_url]);

  const handleSubmitProjectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myProjectUrlInput.trim()) {
      setProjectSubmitError('Please enter a valid project URL.');
      return;
    }
    setIsSubmittingProjectUrl(true);
    setProjectSubmitError(null);
    setProjectSubmitSuccess(null);
    try {
      const res = await api.put<{ message: string; project_url: string; project_status: string; project_submitted_at: string }>(
        '/projects/my-project/submit',
        { project_url: myProjectUrlInput.trim() }
      );
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              project_url: res.project_url,
              project_status: res.project_status,
              project_submitted_at: res.project_submitted_at,
            }
          : null
      );
      setProjectSubmitSuccess('Project URL submitted successfully! It has been synchronized with your mentor score sheet.');
      setTimeout(() => setProjectSubmitSuccess(null), 4000);
    } catch (err: any) {
      setProjectSubmitError(err.message || 'Failed to submit project URL.');
    } finally {
      setIsSubmittingProjectUrl(false);
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setStudentChecklist(prev =>
      prev.map(item => item.id === id ? { ...item, is_cleared: !item.is_cleared } : item)
    );
  };

  const handleSubmitNoDues = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNoDues) return;

    try {
      setIsSubmittingNoDues(true);
      const res = await api.post<NoDuesRequest>(`/no-dues/requests/${activeNoDues.id}/submit-by-student`, {
        checklist_items: studentChecklist,
        remarks: studentNotes
      });
      setActiveNoDues(res);
      setIsNoDuesModalOpen(false);
      addToast({
        title: 'No Dues Clearance Submitted',
        message: 'Your clearance checklist has been submitted to HR for final sign-off.',
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        title: 'Submission Failed',
        message: err.message || 'Could not submit clearance checklist',
        type: 'error'
      });
    } finally {
      setIsSubmittingNoDues(false);
    }
  };

  const handleAcknowledgeLetter = async (letterId: string) => {
    try {
      const updated = await api.post<IssuedLetter>(`/letters/${letterId}/acknowledge`, {});
      setMyLetters(prev => prev.map(l => l.id === letterId ? updated : l));
      if (selectedLetter && selectedLetter.id === letterId) {
        setSelectedLetter(updated);
      }
      addToast({
        title: 'Letter Acknowledged',
        message: 'Your acknowledgement has been recorded and notified to HR.',
        type: 'success'
      });
    } catch (err: any) {
      addToast({
        title: 'Acknowledgment Failed',
        message: err.message || 'Could not acknowledge letter',
        type: 'error'
      });
    }
  };

  const hasPunchedIn = !!attendanceSummary?.first_punch_in;
  const hasPunchedOut = !!attendanceSummary?.last_punch_out;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 sm:gap-2.5">
              <User className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Student Dashboard
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Mark daily attendance with facial liveness recognition, track fee clearance, view official letters, and manage credentials.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5 w-full sm:w-auto">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                if (student && student.face_enrollment_status !== 'ENROLLED') {
                  setIsNotEnrolledNoticeOpen(true);
                } else {
                  setIsPunchModalOpen(true);
                }
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-500/20 border border-emerald-400/30 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all w-full sm:w-auto"
            >
              <Camera className="w-5 h-5 stroke-[2.5]" />
              {student && student.face_enrollment_status !== 'ENROLLED'
                ? 'Face Enrollment Pending (HR)'
                : 'Mark Attendance (Face Scanner)'}
            </Button>
            {student && student.face_enrollment_status === 'ENROLLED' && (
              <div className="flex items-center gap-2 px-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> Face Baseline Enrolled
                </span>
                <button
                  type="button"
                  onClick={() => setIsReEnrollHelpOpen(true)}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline font-medium"
                >
                  Need re-enrollment?
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE NO DUES CLEARANCE POPUP NOTIFICATION BANNER */}
        {activeNoDues && (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
            activeNoDues.status === 'PENDING_STUDENT'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-200'
              : activeNoDues.status === 'SUBMITTED'
              ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700/50 text-sky-900 dark:text-sky-200'
              : activeNoDues.status === 'APPROVED'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700/50 text-rose-900 dark:text-rose-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${
                activeNoDues.status === 'PENDING_STUDENT'
                  ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                  : activeNoDues.status === 'APPROVED'
                  ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-sky-200/80 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300'
              }`}>
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">
                    {activeNoDues.title}
                  </h4>
                  <Badge variant={
                    activeNoDues.status === 'APPROVED' ? 'success' :
                    activeNoDues.status === 'PENDING_STUDENT' ? 'warning' : 'info'
                  }>
                    {activeNoDues.status}
                  </Badge>
                </div>
                <p className="text-xs mt-1 font-medium opacity-90">
                  {activeNoDues.status === 'PENDING_STUDENT'
                    ? 'HR has issued a No Dues clearance form for you. Please check off your clearance items and submit for verification.'
                    : activeNoDues.status === 'SUBMITTED'
                    ? 'Clearance form submitted by you. Awaiting HR verification and final sign-off.'
                    : activeNoDues.status === 'APPROVED'
                    ? 'Congratulations! Your No Dues clearance has been fully approved by HR.'
                    : 'Clearance form status updated by HR.'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsNoDuesModalOpen(true)}
              className={
                activeNoDues.status === 'PENDING_STUDENT'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shrink-0 font-bold'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 font-bold'
              }
            >
              {activeNoDues.status === 'PENDING_STUDENT' ? 'Open Clearance Form' : 'View Clearance Details'}
            </Button>
          </div>
        )}

        {/* Not Enrolled Warning Banner */}
        {student && student.face_enrollment_status !== 'ENROLLED' && (
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Face Baseline Registration Pending</h4>
                <p className="text-xs text-amber-800 dark:text-slate-300 font-medium">
                  Facial biometric registration is authorized and recorded exclusively by HR Administration. Once enrolled by HR, your biometric profile remains secure and active throughout your training.
                </p>
              </div>
            </div>
            <a
              href={`mailto:hr@netlink.org?subject=Biometric%20Face%20Enrollment%20Request%20-%20${encodeURIComponent(student?.user?.full_name || student?.roll_number || 'Trainee')}%20(${student?.roll_number})&body=Hello%20HR%20Team,%0D%0A%0D%0APlease%20schedule%20my%20initial%20biometric%20face%20baseline%20enrollment%20so%20I%20can%20mark%20daily%20attendance.%0D%0A%0D%0AName:%20${encodeURIComponent(student?.user?.full_name || '')}%0D%0ARoll%20Number:%20${student?.roll_number}`}
              className="inline-flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shrink-0 transition-colors shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" /> Request HR Enrollment
            </a>
          </div>
        )}

        {isLoading && <Loading message="Loading student dashboard..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && (
          <>
            {/* Daily Attendance Overview Banner */}
            {attendanceSummary && (
              <div className="p-5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Today's Attendance Status</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Target Date: {attendanceSummary.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Standardized Google UTC Time
                    </div>
                    <Badge
                      variant={
                        attendanceSummary.status === 'PRESENT' || attendanceSummary.status === 'REGULARIZED'
                          ? 'success'
                          : attendanceSummary.status === 'INCOMPLETE'
                          ? 'warning'
                          : 'error'
                      }
                    >
                      {attendanceSummary.status}
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-950/40">
                        <th className="py-2.5 px-3">Attendance KPI</th>
                        <th className="py-2.5 px-3">Recorded Time / Metric</th>
                        <th className="py-2.5 px-3">Details & Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" /> Total Working Hours
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                          {attendanceSummary.total_working_hours} hrs
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          Target: 5:00 hrs for Present status ({attendanceSummary.total_working_minutes || 0} mins logged)
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Check-In (Punch IN)
                        </td>
                        <td className={`py-2.5 px-3 font-mono font-bold text-xs ${hasPunchedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {attendanceSummary.first_punch_in ? formatLocalTime(attendanceSummary.first_punch_in) : 'Not Checked In'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {hasPunchedIn ? 'Verified via facial recognition' : 'Pending morning punch-in'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> Check-Out (Punch OUT)
                        </td>
                        <td className={`py-2.5 px-3 font-mono font-bold text-xs ${hasPunchedOut ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                          {attendanceSummary.last_punch_out ? formatLocalTime(attendanceSummary.last_punch_out) : 'Not Checked Out'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {hasPunchedOut ? 'Recorded at shift completion' : 'Required upon leaving campus'}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" /> Geofence Verification
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-200">
                          Netlink Bhopal Campus
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                          {attendanceSummary.geofence_distance_meters != null
                            ? `Location verified (${Math.round(attendanceSummary.geofence_distance_meters)}m from office center)`
                            : 'Within 100m designated campus perimeter'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Grid: Profile, Attendance & Biometrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Profile Info */}
              <Card title="Student Profile" subtitle="Registration & Roll Details">
                {student ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Roll Number</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-right">{student.roll_number}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">College</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 text-right">{student.college_name || 'N/A'}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Qualification</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 text-right">{student.qualification || 'N/A'}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Program / Batch</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 text-right">{student.program?.title || 'Assigned Program'}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Enrollment Status</td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant={student.enrollment_status === 'ACTIVE' || student.enrollment_status === 'ENROLLED' ? 'success' : 'info'}>
                              {student.enrollment_status}
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No student profile record found for user {user?.email}</p>
                )}
              </Card>

              {/* Mark Attendance Section & Single Daily Punch Control */}
              <Card title="Mark Attendance" subtitle="Daily Punch Controls & Rules">
                <div className="space-y-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-indigo-500" /> Clock Authority
                          </td>
                          <td className="py-2.5 px-2.5 font-semibold text-slate-900 dark:text-slate-100 text-right">
                            Google UTC Server Time
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Daily Allowance
                          </td>
                          <td className="py-2.5 px-2.5 text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                              1 IN & 1 OUT Max
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Biometric Check
                          </td>
                          <td className="py-2.5 px-2.5 font-medium text-slate-700 dark:text-slate-300 text-right">
                            Facial Liveness Verified
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => setIsPunchModalOpen(true)}
                    disabled={hasPunchedIn && hasPunchedOut}
                    className={`w-full font-bold flex items-center justify-center gap-2 ${
                      hasPunchedIn && hasPunchedOut
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 border-none cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    {hasPunchedIn && hasPunchedOut
                      ? 'Attendance Completed for Today'
                      : hasPunchedIn
                      ? 'Mark Punch OUT Now'
                      : 'Mark Punch IN Now'}
                  </Button>
                </div>
              </Card>

              {/* Biometric Consent */}
              <Card title="Biometric Consent Status" subtitle="Privacy & Audit Compliance">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Biometric Consent
                        </td>
                        <td className="py-2.5 px-2.5 font-medium text-slate-900 dark:text-slate-200">v1.0 Form</td>
                        <td className="py-2.5 px-2.5 text-right">
                          <Badge variant={consents.some((c) => c.is_granted) ? 'success' : 'neutral'}>
                            {consents.some((c) => c.is_granted) ? 'GRANTED' : 'NOT RECORDED'}
                          </Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> Face Baseline
                        </td>
                        <td className="py-2.5 px-2.5 font-medium text-slate-900 dark:text-slate-200">HR Registered</td>
                        <td className="py-2.5 px-2.5 text-right">
                          <Badge variant={student?.face_enrollment_status === 'ENROLLED' ? 'success' : 'warning'}>
                            {student?.face_enrollment_status || 'NOT ENROLLED'}
                          </Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-2.5 text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400" /> Image Policy
                        </td>
                        <td className="py-2.5 px-2.5 text-slate-700 dark:text-slate-300" colSpan={2}>
                          Zero raw photos stored; encrypted templates only
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Second Grid: Fees, Official Letters & Certificates */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Fee Ledger Summary Card */}
              <Card
                title="Student Fee Ledger"
                subtitle="Payment Records & Balance"
              >
                {feeSummary ? (
                  <div className="space-y-4 text-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-950/40">
                            <th className="py-2.5 px-3">Fee Metric</th>
                            <th className="py-2.5 px-3 text-right">Amount / Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Payment Status</td>
                            <td className="py-2.5 px-3 text-right">
                              <Badge variant={
                                feeSummary.payment_status === 'PAID' ? 'success' :
                                feeSummary.payment_status === 'PARTIAL' ? 'warning' : 'error'
                              }>
                                {feeSummary.payment_status}
                              </Badge>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Total Program Fee</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 text-right">
                              ₹{feeSummary.total_fees.toLocaleString('en-IN')}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Total Paid</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right">
                              ₹{feeSummary.total_paid.toLocaleString('en-IN')}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Remaining Due</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400 text-right">
                              ₹{feeSummary.remaining_fees.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {feeSummary.payments && feeSummary.payments.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-1">
                          Recent Receipts ({feeSummary.payments.length})
                        </span>
                        <div className="overflow-x-auto max-h-36 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-950/40">
                                <th className="py-2 px-2.5">Date</th>
                                <th className="py-2 px-2.5">Mode</th>
                                <th className="py-2 px-2.5 text-right">Amount Paid</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                              {feeSummary.payments.slice(0, 5).map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                  <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{p.payment_date}</td>
                                  <td className="py-2 px-2.5 text-[11px] text-slate-700 dark:text-slate-300 font-medium">{p.payment_mode}</td>
                                  <td className="py-2 px-2.5 font-mono font-bold text-slate-900 dark:text-slate-100 text-right text-xs">
                                    ₹{p.amount_paid.toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <IndianRupee className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                    No fee ledger created yet
                  </div>
                )}
              </Card>

              {/* Official Letters Card */}
              <Card
                title="Official Letters"
                subtitle="Issued Documents & Notices"
              >
                {myLetters.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-950/40">
                          <th className="py-2.5 px-3">Letter Title</th>
                          <th className="py-2.5 px-3">Type & Date</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                        {myLetters.map(letter => (
                          <tr key={letter.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{letter.title}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                              {letter.letter_type} • {letter.issue_date}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant={letter.status === 'ACKNOWLEDGED' ? 'success' : 'warning'}>
                                {letter.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedLetter(letter)}
                                className="px-2 py-1 text-[11px]"
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                    No official letters issued yet
                  </div>
                )}
              </Card>

              {/* Certificates & Credentials Card */}
              <Card
                title="Certificates & Credentials"
                subtitle="Verified Digital Credentials"
              >
                {myCertificates.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-950/40">
                          <th className="py-2.5 px-3">Credential Title</th>
                          <th className="py-2.5 px-3">ID & Date</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                        {myCertificates.map(cert => (
                          <tr key={cert.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{cert.title}</span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                              <span className="font-mono text-indigo-600 dark:text-indigo-400">{cert.credential_id}</span> • {cert.issue_date}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant="success">
                                {cert.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedCertificate(cert)}
                                className="px-2 py-1 text-[11px]"
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <Award className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                    No certificates issued yet
                  </div>
                )}
              </Card>
            </div>

            {/* My Assigned Capstone Project Card */}
            <Card
              title="Assigned Capstone Project"
              subtitle="Mentor Project Specification & Student URL Submission"
              action={
                student?.project_url ? (
                  <Badge variant="success">Submitted</Badge>
                ) : student?.project_title ? (
                  <Badge variant="warning">In Progress</Badge>
                ) : (
                  <Badge variant="neutral">Pending Assignment</Badge>
                )
              }
            >
              {student?.project_title ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-950/40">
                          <th className="py-2.5 px-3">Project Specification</th>
                          <th className="py-2.5 px-3 text-right">Details & Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Project Title</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 text-right">
                            <span className="inline-flex items-center gap-1.5">
                              <FolderGit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              {student.project_title}
                            </span>
                          </td>
                        </tr>
                        {student.project_description && (
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium align-top">Scope & Description</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-right leading-relaxed max-w-md">
                              {student.project_description}
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Review Status</td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant={student.project_url ? 'success' : 'warning'}>
                              {student.project_url ? 'Submission Received' : 'Pending Submission'}
                            </Badge>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-medium">Submitted Repository / URL</td>
                          <td className="py-2.5 px-3 text-right">
                            {student.project_url ? (
                              <a
                                href={student.project_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 font-mono font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                {student.project_url}
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">No URL submitted yet</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={handleSubmitProjectUrl} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Submit or Update Your Project Repository / Live URL (GitHub, GitLab, or Hosted URL) *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          required
                          value={myProjectUrlInput}
                          onChange={(e) => setMyProjectUrlInput(e.target.value)}
                          placeholder="https://github.com/username/capstone-project"
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          isLoading={isSubmittingProjectUrl}
                          className="font-bold shrink-0 text-xs"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          {student.project_url ? 'Update URL' : 'Submit Project'}
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Submitting here automatically synchronizes your link into your mentor's evaluation scoresheet.
                      </p>
                    </div>

                    {projectSubmitSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{projectSubmitSuccess}</span>
                      </div>
                    )}

                    {projectSubmitError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{projectSubmitError}</span>
                      </div>
                    )}
                  </form>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    No Capstone Project Assigned Yet
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Your assigned mentor will allocate a batch or individual capstone project topic here. Check back soon!
                  </p>
                </div>
              )}
            </Card>

            {/* Course Curriculum Progression Card */}
            <Card
              title="Course Curriculum Progression"
              subtitle={myCurriculum ? `${myCurriculum.program_title} • ${myCurriculum.completion_percentage}% Completed` : 'Academic syllabus coverage'}
              action={
                <Link
                  to="/student/curriculum"
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  View Full Syllabus <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {myCurriculum ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-950/40">
                          <th className="py-2.5 px-3">Curriculum Metric</th>
                          <th className="py-2.5 px-3">Progress / Value</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Program Track
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                            {myCurriculum.program_title}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {myCurriculum.program_code}
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Completed Topics
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {myCurriculum.completed_topics} / {myCurriculum.total_topics} Topics
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {myCurriculum.total_topics - myCurriculum.completed_topics} Remaining
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Syllabus Coverage
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2 max-w-xs">
                              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-700"
                                  style={{ width: `${Math.min(100, myCurriculum.completion_percentage)}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                                {myCurriculum.completion_percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant={myCurriculum.completion_percentage === 100 ? 'success' : 'info'}>
                              {myCurriculum.completion_percentage === 100 ? 'COMPLETED' : 'IN PROGRESS'}
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {myCurriculum.topics && myCurriculum.topics.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block px-1">
                        Syllabus Topic Progression
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-slate-50/60 dark:bg-slate-950/40">
                              <th className="py-2 px-2.5">Topic Title</th>
                              <th className="py-2 px-2.5">Status</th>
                              <th className="py-2 px-2.5 text-right">Associated Assessment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                            {myCurriculum.topics.slice(0, 5).map((t) => (
                              <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="py-2 px-2.5 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  {t.is_completed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span className="truncate">{t.title}</span>
                                </td>
                                <td className="py-2 px-2.5">
                                  <Badge variant={t.is_completed ? 'success' : 'neutral'}>
                                    {t.is_completed ? 'COMPLETED' : 'PENDING'}
                                  </Badge>
                                </td>
                                <td className="py-2 px-2.5 text-right text-slate-500 dark:text-slate-400">
                                  {t.assessment_name ? (
                                    <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                                      {t.assessment_name}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Core Module</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  No curriculum records available for your profile.
                </div>
              )}
            </Card>

            {/* My Feedback Section */}
            <Card
              title="My Mentor Feedback"
              subtitle="Performance ratings & evaluations from your lead mentor"
              action={
                <Link
                  to="/student/feedback"
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  View Full History <ArrowRight className="w-3 h-3" />
                </Link>
              }
            >
              {myFeedbacks.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    No mentor feedback received yet
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Your assigned mentor will periodically evaluate your performance across Technical Skills, Task Performance, Communication, Professionalism, and Learning Attitude.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myFeedbacks.slice(0, 2).map((fb) => (
                    <div
                      key={fb.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            Feedback by {fb.mentor_name || 'Lead Mentor'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            • {new Date(fb.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-lg w-fit">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span className="font-bold text-amber-700 dark:text-amber-400 text-xs font-mono">
                            {Number(fb.average_rating).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">/ 5.0</span>
                        </div>
                      </div>

                      {/* Evaluation Dimension Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold bg-white/60 dark:bg-slate-900/60">
                              <th className="py-2 px-2.5">Evaluation Dimension</th>
                              <th className="py-2 px-2.5 text-center">Score (out of 5)</th>
                              <th className="py-2 px-2.5 text-right">Assessment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                            <tr className="hover:bg-white/40 dark:hover:bg-slate-800/30">
                              <td className="py-1.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">Technical Skills</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-center text-amber-600 dark:text-amber-400">
                                ★ {fb.technical_skills}/5
                              </td>
                              <td className="py-1.5 px-2.5 text-right">
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                  {fb.technical_skills >= 4 ? 'Proficient' : fb.technical_skills >= 3 ? 'Competent' : 'Needs Practice'}
                                </span>
                              </td>
                            </tr>
                            <tr className="hover:bg-white/40 dark:hover:bg-slate-800/30">
                              <td className="py-1.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">Task Performance</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-center text-amber-600 dark:text-amber-400">
                                ★ {fb.task_performance}/5
                              </td>
                              <td className="py-1.5 px-2.5 text-right">
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                  {fb.task_performance >= 4 ? 'Reliable' : fb.task_performance >= 3 ? 'Satisfactory' : 'Needs Review'}
                                </span>
                              </td>
                            </tr>
                            <tr className="hover:bg-white/40 dark:hover:bg-slate-800/30">
                              <td className="py-1.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">Communication</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-center text-amber-600 dark:text-amber-400">
                                ★ {fb.communication}/5
                              </td>
                              <td className="py-1.5 px-2.5 text-right">
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                  {fb.communication >= 4 ? 'Effective' : fb.communication >= 3 ? 'Clear' : 'Developing'}
                                </span>
                              </td>
                            </tr>
                            <tr className="hover:bg-white/40 dark:hover:bg-slate-800/30">
                              <td className="py-1.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">Punctuality & Professionalism</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-center text-amber-600 dark:text-amber-400">
                                ★ {fb.punctuality_professionalism}/5
                              </td>
                              <td className="py-1.5 px-2.5 text-right">
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                  {fb.punctuality_professionalism >= 4 ? 'Exemplary' : fb.punctuality_professionalism >= 3 ? 'Standard' : 'Improvement Needed'}
                                </span>
                              </td>
                            </tr>
                            <tr className="hover:bg-white/40 dark:hover:bg-slate-800/30">
                              <td className="py-1.5 px-2.5 font-medium text-slate-700 dark:text-slate-300">Learning Attitude</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-center text-amber-600 dark:text-amber-400">
                                ★ {fb.learning_attitude}/5
                              </td>
                              <td className="py-1.5 px-2.5 text-right">
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                  {fb.learning_attitude >= 4 ? 'Proactive' : fb.learning_attitude >= 3 ? 'Receptive' : 'Passive'}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Mentor Remarks List */}
                      {fb.comment && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2 text-xs">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Mentor Remarks:</span>
                          <span className="text-slate-700 dark:text-slate-300 italic">"{fb.comment}"</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ---------------------------------------------------- */}
        {/* INTERACTIVE NO DUES CLEARANCE POPUP MODAL            */}
        {/* ---------------------------------------------------- */}
        <Modal
          isOpen={isNoDuesModalOpen && !!activeNoDues}
          onClose={() => setIsNoDuesModalOpen(false)}
          title={`No Dues Clearance: ${activeNoDues?.title || 'Form'}`}
        >
          {activeNoDues && (
            <form onSubmit={handleSubmitNoDues} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 text-xs">
                    Clearance Request Details
                  </span>
                  <Badge variant={
                    activeNoDues.status === 'APPROVED' ? 'success' :
                    activeNoDues.status === 'PENDING_STUDENT' ? 'warning' : 'info'
                  }>
                    {activeNoDues.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                  {activeNoDues.remarks || 'Please review and confirm clearance across each department listed below.'}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] text-slate-600 dark:text-slate-300">
                  <div><strong>Issued On:</strong> {activeNoDues.issued_at}</div>
                  {activeNoDues.issued_by_name && <div><strong>Officer:</strong> {activeNoDues.issued_by_name}</div>}
                  {activeNoDues.submitted_at && <div><strong>Submitted:</strong> {activeNoDues.submitted_at}</div>}
                  {activeNoDues.approved_at && <div><strong>Approved:</strong> {activeNoDues.approved_at}</div>}
                </div>
              </div>

              {/* Dynamic Clearance Checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Clearance Checklist Items ({studentChecklist.filter(i => i.is_cleared).length}/{studentChecklist.length} Cleared)
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {studentChecklist.map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (activeNoDues.status === 'PENDING_STUDENT') {
                          handleToggleChecklistItem(item.id);
                        }
                      }}
                      className={`p-2.5 rounded-xl border flex items-start gap-3 transition-colors ${
                        activeNoDues.status === 'PENDING_STUDENT' ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''
                      } ${
                        item.is_cleared
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.is_cleared}
                        onChange={() => {}}
                        disabled={activeNoDues.status !== 'PENDING_STUDENT'}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold ${item.is_cleared ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.item_name}
                          </span>
                          <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                            {item.department}
                          </span>
                        </div>
                        {item.student_remarks && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{item.student_remarks}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Student Notes / Declaration
                </label>
                <textarea
                  rows={2}
                  disabled={activeNoDues.status !== 'PENDING_STUDENT'}
                  value={studentNotes}
                  onChange={e => setStudentNotes(e.target.value)}
                  placeholder="E.g., All department items verified. Submitting for final HR clearance."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsNoDuesModalOpen(false)}
                >
                  Close
                </Button>

                {activeNoDues.status === 'PENDING_STUDENT' && (
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmittingNoDues}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    {isSubmittingNoDues ? 'Submitting...' : 'Submit Clearance to HR'}
                  </Button>
                )}
              </div>
            </form>
          )}
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* VIEW OFFICIAL LETTER MODAL                           */}
        {/* ---------------------------------------------------- */}
        <Modal
          isOpen={!!selectedLetter}
          onClose={() => setSelectedLetter(null)}
          title={selectedLetter?.title || 'Official Letter'}
        >
          {selectedLetter && (
            <div className="space-y-4 text-xs font-sans">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Letter Type</span>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{selectedLetter.title}</h4>
                  </div>
                  <Badge variant={selectedLetter.status === 'ACKNOWLEDGED' ? 'success' : 'warning'}>
                    {selectedLetter.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div><strong>Recipient:</strong> {selectedLetter.recipient_name}</div>
                  <div><strong>Date:</strong> {selectedLetter.issue_date}</div>
                  <div><strong>Issued By:</strong> {selectedLetter.issued_by_name || 'HR Office'}</div>
                  {selectedLetter.acknowledged_at && (
                    <div className="text-emerald-600 font-semibold">
                      <strong>Acknowledged:</strong> {formatLocalTime(selectedLetter.acknowledged_at)}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 whitespace-pre-line text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs">
                    {selectedLetter.content || 'Standard corporate document issued by Netlink Talent Management.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedLetter(null)}
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Print
                  </Button>

                  {selectedLetter.status === 'SENT' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcknowledgeLetter(selectedLetter.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acknowledge Receipt
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* VIEW CERTIFICATE MODAL                               */}
        {/* ---------------------------------------------------- */}
        <Modal
          isOpen={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          title="Digital Credential Certificate"
        >
          {selectedCertificate && (
            <div className="space-y-4 text-xs">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-900/10 border-2 border-amber-400/40 text-center space-y-3">
                <Award className="w-12 h-12 text-amber-500 mx-auto" />
                <span className="text-[10px] tracking-widest uppercase font-bold text-amber-700 dark:text-amber-400">
                  netSEED Trainee Credential
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  {selectedCertificate.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  This certifies that <strong className="text-indigo-600 dark:text-indigo-400">{selectedCertificate.recipient_name}</strong> {selectedCertificate.recipient_roll_no ? `(${selectedCertificate.recipient_roll_no})` : ''} has successfully fulfilled the required milestones for {selectedCertificate.certificate_type}.
                </p>

                <div className="pt-3 border-t border-amber-300/40 dark:border-amber-700/40 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold">Credential ID</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{selectedCertificate.credential_id}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider font-semibold">Issue Date</span>
                    <span className="font-semibold">{selectedCertificate.issue_date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCertificate(null)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Print Certificate
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <AttendancePunchModal
          isOpen={isPunchModalOpen}
          onClose={() => setIsPunchModalOpen(false)}
          onSuccess={fetchDashboardData}
          attendanceSummary={attendanceSummary}
        />

        {/* Face Re-Enrollment Information Modal */}
        <Modal
          isOpen={isReEnrollHelpOpen}
          onClose={() => setIsReEnrollHelpOpen(false)}
          title="Biometric Face Re-Enrollment Information"
        >
          <div className="space-y-4 text-xs font-sans text-slate-700 dark:text-slate-300">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">Biometric Baseline is Secure & Active</div>
                <div className="text-[11px] text-emerald-800 dark:text-slate-300">Your face template was enrolled and verified by HR administration and does not expire.</div>
              </div>
            </div>

            <p>
              To maintain system integrity and zero-trust security standards, biometric re-enrollment is strictly managed by HR Administration. Biometric templates cannot be re-enrolled arbitrarily.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-slate-100">When is re-enrollment necessary?</div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>Significant permanent physical appearance changes</li>
                <li>Persistent camera recognition mismatches under optimal lighting</li>
                <li>Authorized administrative or identity updates</li>
              </ul>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsReEnrollHelpOpen(false)}>
                Close
              </Button>
              <a
                href={`mailto:hr@netlink.org?subject=Biometric%20Face%20Re-Enrollment%20Request%20-%20${encodeURIComponent(student?.user?.full_name || student?.roll_number || '')}%20(${student?.roll_number})&body=Hello%20HR%20Team,%0D%0A%0D%0AI%20am%20requesting%20a%20biometric%20face%20re-enrollment%20for%20the%20following%20reason:%0D%0A[Please%20specify%20reason]%0D%0A%0D%0AName:%20${encodeURIComponent(student?.user?.full_name || '')}%0D%0ARoll%20Number:%20${student?.roll_number}`}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> Email HR for Re-Enrollment
              </a>
            </div>
          </div>
        </Modal>

        {/* Not Enrolled Notice Modal */}
        <Modal
          isOpen={isNotEnrolledNoticeOpen}
          onClose={() => setIsNotEnrolledNoticeOpen(false)}
          title="Biometric Face Enrollment Required"
        >
          <div className="space-y-4 text-xs font-sans text-slate-700 dark:text-slate-300">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="font-bold text-amber-900 dark:text-amber-200 text-xs">HR Facial Registration Required</div>
                <div className="text-[11px] text-amber-800 dark:text-slate-300">Only students with an enrolled face baseline verified by HR can mark attendance.</div>
              </div>
            </div>

            <p>
              Under Netlink security policy, initial facial biometric enrollment must be conducted by HR Administration to guarantee identity authenticity. Once registered by HR, your facial baseline remains valid and secure throughout your training.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsNotEnrolledNoticeOpen(false)}>
                Understood
              </Button>
              <a
                href={`mailto:hr@netlink.org?subject=Biometric%20Face%20Enrollment%20Request%20-%20${encodeURIComponent(student?.user?.full_name || student?.roll_number || 'Trainee')}%20(${student?.roll_number})&body=Hello%20HR%20Team,%0D%0A%0D%0APlease%20schedule%20my%20initial%20biometric%20face%20baseline%20enrollment%20so%20I%20can%20mark%20daily%20attendance.%0D%0A%0D%0AName:%20${encodeURIComponent(student?.user?.full_name || '')}%0D%0ARoll%20Number:%20${student?.roll_number}`}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> Contact HR Administration
              </a>
            </div>
          </div>
        </Modal>

        {/* HR Face Enrollment Modal (Used by HR / Admin users) */}
        <FaceEnrollmentModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          onSuccess={() => {
            setIsEnrollModalOpen(false);
            fetchDashboardData();
          }}
          student={student}
        />
      </div>
    </Layout>
  );
};

