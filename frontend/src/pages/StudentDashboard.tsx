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
      setIsLoading(true);
      if (user) {
        const [myStudent, myConsents, summaryRes, pendingNoDues, feeRes, lettersRes, certsRes, feedbackRes, curriculumRes] = await Promise.all([
          api.get<Student>('/students/me').catch(() => null),
          api.get<Consent[]>(`/consents?user_id=${user.id}`).catch(() => []),
          api.get<StudentAttendanceSummary>('/attendance/my-summary').catch(() => null),
          api.get<NoDuesRequest | null>('/no-dues/requests/my-pending').catch(() => null),
          api.get<StudentFeeSummary[]>('/fees/students').then(r => (Array.isArray(r) && r.length > 0 ? r[0] : null)).catch(() => null),
          api.get<IssuedLetter[]>('/letters/my-letters').catch(() => []),
          api.get<IssuedCertificate[]>('/certificates/my-certificates').catch(() => []),
          api.get<MentorFeedbackItem[]>('/feedbacks').catch(() => []),
          api.get<ProgramCurriculum>('/curriculum/my-curriculum').catch(() => null),
        ]);

        setStudent(myStudent);
        setConsents(myConsents);
        setAttendanceSummary(summaryRes);
        setFeeSummary(feeRes);
        setMyLetters(lettersRes || []);
        setMyCertificates(certsRes || []);
        setMyFeedbacks(feedbackRes || []);
        setMyCurriculum(curriculumRes);

        if (pendingNoDues) {
          const filteredItems = (pendingNoDues.checklist_items || []).filter((item) => {
            const n = (item.item_name || '').toLowerCase();
            const d = (item.department || '').toLowerCase();
            return !['library', 'it asset', 'laptop', 'hostel', 'hardware'].some((t) => n.includes(t) || d.includes(t));
          });
          setActiveNoDues({ ...pendingNoDues, checklist_items: filteredItems });
          setStudentChecklist(filteredItems);
          setStudentNotes(pendingNoDues.student_notes || '');
          // Automatically trigger popup modal if form is waiting for student action!
          if (pendingNoDues.status === 'PENDING_STUDENT') {
            setIsNoDuesModalOpen(true);
          }
        } else {
          setActiveNoDues(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student dashboard data');
    } finally {
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

          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              if (student && student.face_enrollment_status !== 'ENROLLED') {
                setIsEnrollModalOpen(true);
              } else {
                setIsPunchModalOpen(true);
              }
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-500/20 border border-emerald-400/30 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all w-full sm:w-auto"
          >
            <Camera className="w-5 h-5 stroke-[2.5]" />
            {student && student.face_enrollment_status !== 'ENROLLED'
              ? 'Enroll Face Baseline First'
              : 'Mark Attendance (Face Scanner)'}
          </Button>
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
              <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Face Baseline Registration Required</h4>
                <p className="text-xs text-amber-800 dark:text-slate-300 font-medium">
                  Only registered students with an enrolled face template can mark attendance. Please register your unique facial baseline.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsEnrollModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0"
            >
              Enroll My Face Now
            </Button>
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Total Working Hours</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-300 font-bold text-sm">
                      {attendanceSummary.total_working_hours} hrs
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Punch IN Status</span>
                    <span className={`font-mono font-bold text-xs ${hasPunchedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {attendanceSummary.first_punch_in
                        ? formatLocalTime(attendanceSummary.first_punch_in)
                        : 'Not Checked In'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Punch OUT Status</span>
                    <span className={`font-mono font-bold text-xs ${hasPunchedOut ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                      {attendanceSummary.last_punch_out
                        ? formatLocalTime(attendanceSummary.last_punch_out)
                        : 'Not Checked Out'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> Geofence Rule
                    </span>
                    <span className="text-slate-900 dark:text-slate-200 font-semibold text-xs">
                      Netlink Bhopal Campus
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Top Grid: Profile, Attendance & Biometrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Profile Info */}
              <Card title="Student Profile" subtitle="Registration & Roll Details">
                {student ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Roll Number</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-300">{student.roll_number}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">College</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">{student.college_name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">Qualification</span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium">{student.qualification || 'N/A'}</span>
                    </div>
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status</span>
                      <Badge variant={student.enrollment_status === 'ACTIVE' ? 'success' : 'info'}>
                        {student.enrollment_status}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No student profile record found for user {user?.email}</p>
                )}
              </Card>

              {/* Mark Attendance Section & Single Daily Punch Control */}
              <Card title="Mark Attendance" subtitle="Daily Punch Controls & Rules">
                <div className="space-y-3.5 text-xs">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 rounded-xl space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                      <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Google Server Time Enforced
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Machine local time manipulation is disabled. Timestamps are retrieved directly from Google UTC server clocks.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Daily Punch Rule</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                        1 IN & 1 OUT Max
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                      Only one Punch IN and one Punch OUT can be recorded per student per day.
                    </p>

                    <div className="pt-2 flex flex-col gap-2">
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
                  </div>
                </div>
              </Card>

              {/* Biometric Consent */}
              <Card title="Biometric Consent Status" subtitle="Privacy & Audit Compliance">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Facial Biometric</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Consent v1.0</div>
                      </div>
                    </div>
                    <Badge variant={consents.some((c) => c.is_granted) ? 'success' : 'neutral'}>
                      {consents.some((c) => c.is_granted) ? 'GRANTED' : 'NOT RECORDED'}
                    </Badge>
                  </div>

                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Biometric Protection
                    </div>
                    <p className="text-xs text-indigo-900 dark:text-indigo-200/80 leading-relaxed font-medium">
                      Raw face images are never stored. Only encrypted mathematical embedding templates are referenceable.
                    </p>
                  </div>
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
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Payment Status</span>
                        <div className="mt-0.5">
                          <Badge variant={
                            feeSummary.payment_status === 'PAID' ? 'success' :
                            feeSummary.payment_status === 'PARTIAL' ? 'warning' : 'error'
                          }>
                            {feeSummary.payment_status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Remaining Due</span>
                        <div className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                          ₹{feeSummary.remaining_fees.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400 block">Total Tuition Fee</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                          ₹{feeSummary.total_fees.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <span className="text-emerald-700 dark:text-emerald-300 block">Total Amount Paid</span>
                        <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200 text-xs">
                          ₹{feeSummary.total_paid.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {feeSummary.payments && feeSummary.payments.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Recent Receipts ({feeSummary.payments.length})
                        </span>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                          {feeSummary.payments.slice(0, 3).map(p => (
                            <div key={p.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-slate-100">₹{p.amount_paid.toLocaleString('en-IN')}</span>
                                <span className="text-[10px] text-slate-500 ml-1.5">{p.payment_mode}</span>
                              </div>
                              <span className="font-mono text-[10px] text-slate-500">{p.payment_date}</span>
                            </div>
                          ))}
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
                  <div className="space-y-2">
                    {myLetters.map(letter => (
                      <div
                        key={letter.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{letter.title}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{letter.letter_type}</span>
                            <span>•</span>
                            <span>{letter.issue_date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={letter.status === 'ACKNOWLEDGED' ? 'success' : 'warning'}>
                            {letter.status}
                          </Badge>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedLetter(letter)}
                            className="px-2 py-1 text-[11px]"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
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
                  <div className="space-y-2">
                    {myCertificates.map(cert => (
                      <div
                        key={cert.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-colors flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{cert.title}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">{cert.credential_id}</span>
                            <span>•</span>
                            <span>{cert.issue_date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="success">
                            {cert.status}
                          </Badge>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedCertificate(cert)}
                            className="px-2 py-1 text-[11px]"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
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
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {student.project_title}
                      </h4>
                    </div>
                    {student.project_description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                        {student.project_description}
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleSubmitProjectUrl} className="space-y-3">
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

                    {student.project_url && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Current Submitted Link:</span>
                        <a
                          href={student.project_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 font-mono font-bold hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {student.project_url}
                        </a>
                      </div>
                    )}

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
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed Syllabus</span>
                      <h4 className="text-xl font-black text-slate-900 dark:text-slate-100">
                        {myCurriculum.completed_topics} <span className="text-xs font-semibold text-slate-400">/ {myCurriculum.total_topics} Topics</span>
                      </h4>
                    </div>
                    <Badge variant={myCurriculum.completion_percentage === 100 ? 'success' : 'info'} className="text-xs font-bold px-3 py-1">
                      {myCurriculum.completion_percentage}% Complete
                    </Badge>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, myCurriculum.completion_percentage)}%` }}
                    />
                  </div>

                  {myCurriculum.topics && myCurriculum.topics.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {myCurriculum.topics.slice(0, 4).map((t) => (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {t.is_completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {t.title}
                            </span>
                          </div>
                          {t.assessment_name && (
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded shrink-0">
                              {t.assessment_name}
                            </span>
                          )}
                        </div>
                      ))}
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

                      {/* 5 Categories Mini Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            Technical
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5 block">
                            ★ {fb.technical_skills}/5
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            Tasks
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5 block">
                            ★ {fb.task_performance}/5
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            Communication
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5 block">
                            ★ {fb.communication}/5
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            Professionalism
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5 block">
                            ★ {fb.punctuality_professionalism}/5
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                            Attitude
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5 block">
                            ★ {fb.learning_attitude}/5
                          </span>
                        </div>
                      </div>

                      {/* Mentor Comment */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 italic">
                        "{fb.comment}"
                      </div>
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

