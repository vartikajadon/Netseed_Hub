import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../api/client';
import { Assessment, AssessmentSubmission, AssessmentLevel, ScoreSheetRow } from '../types';
import {
  ClipboardList, Download, ExternalLink, FileText, Calendar,
  Clock, Lock, Unlock, AlertCircle, CheckCircle2, Award, Send,
  UploadCloud, FileSpreadsheet, Eye, Link as LinkIcon, Sparkles, Check
} from 'lucide-react';

const LEVEL_CONFIG: Record<AssessmentLevel, {
  label: string;
  badgeVariant: 'success' | 'info' | 'neutral';
  description: string;
  timing: string;
}> = {
  ENTRY_LEVEL: {
    label: 'Entry Level',
    badgeVariant: 'success',
    description: 'First week baseline test evaluating prerequisite skills & fundamentals.',
    timing: 'First week of training',
  },
  MIDDLE_LEVEL: {
    label: 'Middle Level',
    badgeVariant: 'info',
    description: 'Mid-term milestone assessment measuring core technical progression.',
    timing: 'Half of training period',
  },
  EXIT_LEVEL: {
    label: 'Exit Level',
    badgeVariant: 'neutral',
    description: 'Final comprehensive exam & capstone test prior to graduation/placement.',
    timing: 'End of training',
  },
};


export const StudentAssessments: React.FC = () => {
  const { addToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'ASSESSMENTS' | 'SCORE_SHEET'>('ASSESSMENTS');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [scoreSheet, setScoreSheet] = useState<ScoreSheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submit Modal
  const [submittingAssessment, setSubmittingAssessment] = useState<Assessment | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [answerFileName, setAnswerFileName] = useState('');
  const [answerFileUrl, setAnswerFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Paper View Modal
  const [viewingPaper, setViewingPaper] = useState<Assessment | null>(null);

  const fetchStudentData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [assessRes, sheetRes] = await Promise.all([
        api.get<Assessment[]>('/assessments'),
        api.get<ScoreSheetRow[]>('/assessments/score-sheet/matrix'),
      ]);
      setAssessments(assessRes || []);
      setScoreSheet(sheetRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const openSubmitModal = (a: Assessment) => {
    setSubmittingAssessment(a);
    setSubmissionLink(a.my_submission?.submission_link || '');
    setSubmissionNotes(a.my_submission?.submission_notes || '');
    setAnswerFileName('');
    setAnswerFileUrl('');
    setFormError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFormError('File size exceeds 10MB limit.');
      return;
    }

    setAnswerFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setAnswerFileUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssessment) return;
    setFormError(null);

    if (!submissionLink.trim()) {
      setFormError('Please enter your assessment solution link (e.g., GitHub repo, Google Drive).');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post(`/assessments/${submittingAssessment.id}/submit`, {
        submission_link: submissionLink.trim(),
        submission_notes: submissionNotes.trim() || undefined,
        answer_file_url: answerFileUrl || undefined,
        answer_file_name: answerFileName || undefined,
      });

      addToast({
        type: 'success',
        title: 'Solution Submitted!',
        message: `Your assessment submission link was delivered to your mentor for evaluation.`,
      });

      setSubmittingAssessment(null);
      await fetchStudentData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const myScoreSheetRow = scoreSheet[0] || null;

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-indigo-900/40">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold tracking-wide text-xs uppercase">
              <ClipboardList className="w-4 h-4" />
              <span>Training Lifecycle Milestones</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Trainee Assessments
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Track your 3 core assessment milestones:
              <span className="font-semibold text-emerald-400"> Entry Level</span> (Week 1),
              <span className="font-semibold text-blue-400"> Middle Level</span> (Mid-way), and
              <span className="font-semibold text-purple-400"> Exit Level</span> (Graduation).
              Scheduled assessments appear 1 week before test day. Once unlocked by your mentor,
              download the question paper and submit your solution link.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('ASSESSMENTS')}
            className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'ASSESSMENTS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Assessments ({assessments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SCORE_SHEET')}
            className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'SCORE_SHEET'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>My Result Score Sheet</span>
          </button>
        </div>

        {/* TAB 1: ASSESSMENTS LIST */}
        {activeTab === 'ASSESSMENTS' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="py-16">
                <Loading message="Loading your scheduled assessments..." />
              </div>
            ) : error ? (
              <ErrorMessage message={error} onRetry={fetchStudentData} />
            ) : assessments.length === 0 ? (

              <Card className="text-center py-16 px-4">
                <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  No Active Assessments
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Assessments scheduled for your batch will automatically appear here 1 week prior to the test date.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {assessments.map((a) => {
                  const conf = LEVEL_CONFIG[a.level] || LEVEL_CONFIG.ENTRY_LEVEL;
                  const sched = new Date(a.scheduled_date);
                  const isSubmitted = a.has_submitted;
                  const isEvaluated = a.my_submission?.status === 'EVALUATED';
                  const isUnlocked = a.is_unlocked;

                  return (
                    <div
                      key={a.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                    >
                      {/* Top Bar with Level Badge & Lock Status */}
                      <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge variant={conf.badgeVariant}>
                            {conf.label}
                          </Badge>


                          {/* Lock / Live Indicator */}
                          {isUnlocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <Unlock className="w-3 h-3" /> Unlocked & Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                              <Lock className="w-3 h-3" /> Locked by Mentor
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1">
                          {a.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {a.description || conf.description}
                        </p>
                      </div>

                      {/* Details Box */}
                      <div className="p-5 py-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Date & Time:</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">
                            {sched.toLocaleDateString()} at{' '}
                            {sched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Time Duration:</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">
                            {a.duration_minutes} minutes
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-purple-500" />
                            <span>Marks / Pass:</span>
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">
                            {a.total_marks} Marks (Min Pass: {a.passing_marks})
                          </span>
                        </div>

                        {a.skill_unlocked && (
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Unlocks Skill:</span>
                            </span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded text-[11px] border border-indigo-200/60 dark:border-indigo-800/60 truncate max-w-[170px]" title={a.skill_unlocked}>
                              {a.skill_unlocked}
                            </span>
                          </div>
                        )}

                        {/* Submission status banner if submitted */}
                        {isSubmitted && (
                          <div className="mt-2 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {isEvaluated ? 'Evaluation Result:' : 'Status: Submitted'}
                              </span>
                              {isEvaluated ? (
                                <span
                                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                    (a.my_submission?.marks_obtained || 0) >= a.passing_marks
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                                  }`}
                                >
                                  {a.my_submission?.marks_obtained} / {a.total_marks} Marks
                                </span>
                              ) : (
                                <Badge variant="warning">
                                  Under Review
                                </Badge>
                              )}

                            </div>
                            {isEvaluated && a.my_submission?.feedback && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">
                                &ldquo;{a.my_submission.feedback}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        {/* Download Paper Button */}
                        {isUnlocked ? (
                          <div className="flex items-center gap-2">
                            {a.paper_file_url ? (
                              <a
                                href={a.paper_file_url}
                                download={a.paper_file_name || 'assessment_paper.pdf'}
                                className="flex-1 py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Paper</span>
                              </a>
                            ) : null}

                            {a.paper_content && (
                              <button
                                type="button"
                                onClick={() => setViewingPaper(a)}
                                className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Questions</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="py-1.5 text-center text-[11px] text-slate-400 italic">
                            Paper questions unlock when mentor activates the test.
                          </div>
                        )}

                        {/* Submit Solution Button */}
                        {isUnlocked ? (
                          <Button
                            onClick={() => openSubmitModal(a)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 text-xs shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{isSubmitted ? 'Update Submission Link' : 'Submit Assessment Link'}</span>
                          </Button>
                        ) : (
                          <button
                            disabled
                            className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Locked by Mentor</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY SCORE SHEET */}
        {activeTab === 'SCORE_SHEET' && (
          <div className="space-y-6">
            {!myScoreSheetRow ? (
              <Card className="text-center py-16 px-4">
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Score Sheet Not Available
                </h3>
                <p className="text-xs text-slate-500">
                  You are not currently assigned to a batch, or assessments have not been scheduled yet.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Cumulative Summary Card */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-800/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
                        Official Lifecycle Score Record
                      </div>
                      <h2 className="text-xl font-bold">
                        {myScoreSheetRow.student_name} ({myScoreSheetRow.roll_number})
                      </h2>
                      <p className="text-xs text-slate-300 mt-1">
                        Batch: <span className="font-semibold text-white">{myScoreSheetRow.batch_name}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-indigo-300">Total Marks</div>
                        <div className="text-2xl font-black">
                          {myScoreSheetRow.total_obtained} / {myScoreSheetRow.total_max}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-indigo-300">Aggregate %</div>
                        <div className="text-2xl font-black text-amber-300">
                          {myScoreSheetRow.percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Phases Detailed Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Entry Level */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="success">Entry Level (Week 1)</Badge>
                      <span className="text-[11px] font-bold text-slate-500">Baseline</span>
                    </div>

                    {myScoreSheetRow.entry_level ? (
                      <div className="space-y-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {myScoreSheetRow.entry_level.title}
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                          {myScoreSheetRow.entry_level.marks_obtained !== null && myScoreSheetRow.entry_level.marks_obtained !== undefined ? (
                            <>
                              {myScoreSheetRow.entry_level.marks_obtained}{' '}
                              <span className="text-xs font-normal text-slate-400">
                                / {myScoreSheetRow.entry_level.total_marks}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-amber-500">Under Review</span>
                          )}
                        </div>
                        {myScoreSheetRow.entry_level.feedback && (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 italic">
                            &ldquo;{myScoreSheetRow.entry_level.feedback}&rdquo;
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Pending assignment or scheduling.
                      </div>
                    )}
                  </div>

                  {/* Middle Level */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="info">Middle Level (Mid-term)</Badge>
                      <span className="text-[11px] font-bold text-slate-500">Milestone</span>
                    </div>

                    {myScoreSheetRow.middle_level ? (
                      <div className="space-y-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {myScoreSheetRow.middle_level.title}
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                          {myScoreSheetRow.middle_level.marks_obtained !== null && myScoreSheetRow.middle_level.marks_obtained !== undefined ? (
                            <>
                              {myScoreSheetRow.middle_level.marks_obtained}{' '}
                              <span className="text-xs font-normal text-slate-400">
                                / {myScoreSheetRow.middle_level.total_marks}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-amber-500">Under Review</span>
                          )}
                        </div>
                        {myScoreSheetRow.middle_level.feedback && (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 italic">
                            &ldquo;{myScoreSheetRow.middle_level.feedback}&rdquo;
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Pending assignment or scheduling.
                      </div>
                    )}
                  </div>

                  {/* Exit Level */}
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral">Exit Level (Graduation)</Badge>
                      <span className="text-[11px] font-bold text-slate-500">Capstone</span>
                    </div>


                    {myScoreSheetRow.exit_level ? (
                      <div className="space-y-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {myScoreSheetRow.exit_level.title}
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                          {myScoreSheetRow.exit_level.marks_obtained !== null && myScoreSheetRow.exit_level.marks_obtained !== undefined ? (
                            <>
                              {myScoreSheetRow.exit_level.marks_obtained}{' '}
                              <span className="text-xs font-normal text-slate-400">
                                / {myScoreSheetRow.exit_level.total_marks}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm font-semibold text-amber-500">Under Review</span>
                          )}
                        </div>
                        {myScoreSheetRow.exit_level.feedback && (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 italic">
                            &ldquo;{myScoreSheetRow.exit_level.feedback}&rdquo;
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Pending assignment or scheduling.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUBMIT SOLUTION MODAL */}
        <Modal
          isOpen={!!submittingAssessment}
          onClose={() => setSubmittingAssessment(null)}
          title={`Submit Assessment: ${submittingAssessment?.title || ''}`}
          maxWidth="max-w-lg"
        >
          {submittingAssessment && (
            <form onSubmit={handleSubmitSolution} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  {submittingAssessment.title}
                </div>
                <div className="text-slate-500">
                  Total Marks: {submittingAssessment.total_marks} • Pass: {submittingAssessment.passing_marks} Marks
                </div>
              </div>

              {/* Paste Assessment Link */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Paste Assessment Solution Link <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/... or https://drive.google.com/..."
                    value={submissionLink}
                    onChange={(e) => setSubmissionLink(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ensure public or mentor read access is enabled on the shared link.
                </p>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Mention instructions to run code, architecture details, or comments for your mentor..."
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Optional Answer Sheet File Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Attach Supplementary File (Optional)
                </label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100">
                  <UploadCloud className="w-4 h-4 text-indigo-500" />
                  <span>{answerFileName ? answerFileName : 'Upload PDF / Output / Doc'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmittingAssessment(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </span>
                  ) : (

                    'Submit Assessment'
                  )}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* VIEW QUESTION PAPER MODAL */}
        <Modal
          isOpen={!!viewingPaper}
          onClose={() => setViewingPaper(null)}
          title={`Question Paper: ${viewingPaper?.title || ''}`}
          maxWidth="max-w-2xl"
        >
          {viewingPaper && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <Badge variant={LEVEL_CONFIG[viewingPaper.level]?.badgeVariant || 'neutral'}>
                  {LEVEL_CONFIG[viewingPaper.level]?.label}
                </Badge>
                <span className="text-xs text-slate-500">

                  Duration: {viewingPaper.duration_minutes}m • Total Marks: {viewingPaper.total_marks}
                </span>
              </div>

              {viewingPaper.paper_content ? (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <pre className="text-xs font-mono text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                    {viewingPaper.paper_content}
                  </pre>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400 italic">
                  Paper is available via direct download file above.
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setViewingPaper(null)}>
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
export default StudentAssessments;
