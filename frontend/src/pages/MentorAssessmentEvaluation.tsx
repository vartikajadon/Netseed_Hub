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
import {
  Batch, Assessment, AssessmentSubmission, ScoreSheetRow, AssessmentLevel
} from '../types';
import {
  Award, FileSpreadsheet, ExternalLink, Download, CheckCircle2, Clock,
  Search, Filter, Copy, Check, AlertCircle, ArrowLeft, Building2,
  UserCheck, Layers, FileText, ChevronRight, Sparkles, Printer, Edit3
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const LEVEL_CONFIG: Record<AssessmentLevel, {
  label: string;
  badgeVariant: 'success' | 'info' | 'neutral';
}> = {
  ENTRY_LEVEL: { label: 'Entry Level', badgeVariant: 'success' },
  MIDDLE_LEVEL: { label: 'Middle Level', badgeVariant: 'info' },
  EXIT_LEVEL: { label: 'Exit Level', badgeVariant: 'neutral' },
};


export const MentorAssessmentEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useNotifications();

  // Navigation tab: 'SUBMISSIONS' or 'SCORE_SHEET'
  const [activeTab, setActiveTab] = useState<'SUBMISSIONS' | 'SCORE_SHEET'>('SUBMISSIONS');

  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [scoreSheet, setScoreSheet] = useState<ScoreSheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [assessmentFilter, setAssessmentFilter] = useState<string>(searchParams.get('assessmentId') || 'ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Evaluation Modal
  const [evaluatingSub, setEvaluatingSub] = useState<AssessmentSubmission | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number>(40);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Copied link state
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Score sheet batch selector
  const [scoreSheetBatchId, setScoreSheetBatchId] = useState<string>('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [subsData, batchesData, assessData] = await Promise.all([
        api.get<AssessmentSubmission[]>('/assessment-submissions'),
        api.get<Batch[]>('/batches'),
        api.get<Assessment[]>('/assessments'),
      ]);

      const allBatches = batchesData || [];
      setSubmissions(subsData || []);
      setBatches(allBatches);
      setAssessments(assessData || []);

      if (allBatches.length > 0 && !scoreSheetBatchId) {
        setScoreSheetBatchId(allBatches[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment evaluation data.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScoreSheet = async (bId: string) => {
    if (!bId) return;
    try {
      const data = await api.get<ScoreSheetRow[]>(`/assessments/score-sheet/matrix?batch_id=${bId}`);
      setScoreSheet(data || []);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Score Sheet Error',
        message: err.message || 'Could not load score sheet.',
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (scoreSheetBatchId) {
      fetchScoreSheet(scoreSheetBatchId);
    }
  }, [scoreSheetBatchId]);

  const openEvaluationModal = (sub: AssessmentSubmission) => {
    setEvaluatingSub(sub);
    setMarks(sub.marks_obtained !== null && sub.marks_obtained !== undefined ? Number(sub.marks_obtained) : 80);
    setMaxMarks(sub.total_marks || 100);
    setPassingMarks(sub.passing_marks || 40);
    setFeedback(sub.feedback || '');
    setEvalError(null);
  };

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSub) return;
    setEvalError(null);

    if (marks < 0) {
      setEvalError('Marks cannot be negative.');
      return;
    }
    if (marks > maxMarks) {
      setEvalError(`Marks obtained cannot exceed maximum marks (${maxMarks}).`);
      return;
    }

    try {
      setIsSubmittingEval(true);
      const res = await api.put<AssessmentSubmission>(
        `/assessment-submissions/${evaluatingSub.id}/evaluate`,
        {
          marks_obtained: Number(marks),
          feedback: feedback.trim() || undefined,
        }
      );

      addToast({
        type: 'success',
        title: 'Evaluation Saved!',
        message: `Grade of ${marks}/${maxMarks} saved for ${evaluatingSub.student_name}. Automatically recorded in score sheet.`,
      });

      // Update local submissions list
      setSubmissions((prev) =>
        prev.map((item) => (item.id === evaluatingSub.id ? res : item))
      );

      // Refresh score sheet if active
      if (scoreSheetBatchId) {
        fetchScoreSheet(scoreSheetBatchId);
      }

      setEvaluatingSub(null);
    } catch (err: any) {
      setEvalError(err.message || 'Failed to submit evaluation.');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((s) => {
    if (batchFilter !== 'ALL' && s.batch_id !== batchFilter) return false;
    if (assessmentFilter !== 'ALL' && s.assessment_id !== assessmentFilter) return false;
    if (levelFilter !== 'ALL' && s.assessment_level !== levelFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.student_name.toLowerCase().includes(q);
      const matchRoll = s.student_roll_no.toLowerCase().includes(q);
      const matchTitle = s.assessment_title.toLowerCase().includes(q);
      return matchName || matchRoll || matchTitle;
    }
    return true;
  });

  const totalSubs = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === 'SUBMITTED').length;
  const evaluatedCount = submissions.filter((s) => s.status === 'EVALUATED').length;
  const avgScore =
    evaluatedCount > 0
      ? (
          submissions
            .filter((s) => s.status === 'EVALUATED' && s.marks_obtained !== null && s.marks_obtained !== undefined)
            .reduce((acc, curr) => acc + (Number(curr.marks_obtained) || 0), 0) / evaluatedCount
        ).toFixed(1)
      : 'N/A';

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-indigo-900/40">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-semibold tracking-wide text-xs uppercase">
              <Award className="w-4 h-4" />
              <span>Mentor Evaluation & Result Score Sheets</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Assessment Evaluation
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Review submitted test answers, download question/answer sheets, grade student submissions,
              and maintain the real-time cumulative <span className="text-amber-300 font-semibold">Result Score Sheet</span> across Entry, Middle, and Exit levels.
            </p>
          </div>
        </div>

        {/* Top Metric Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <div className="text-xs font-medium text-slate-500 mb-1">Total Submissions</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalSubs}</div>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Pending Grading</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Evaluated / Graded</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{evaluatedCount}</div>
          </div>
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs">
            <div className="text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-1">Average Score</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{avgScore}</div>
          </div>
        </div>

        {/* Tab Navigation: Submissions vs Score Sheet */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('SUBMISSIONS')}
            className={`py-3 px-5 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'SUBMISSIONS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Submissions & Grading ({submissions.length})</span>
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
            <span>Batch Result Score Sheet</span>
          </button>
        </div>

        {/* TAB 1: SUBMISSIONS & GRADING */}
        {activeTab === 'SUBMISSIONS' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student or roll no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Batch Filter */}
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="py-2 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Assessment Filter */}
              <select
                value={assessmentFilter}
                onChange={(e) => setAssessmentFilter(e.target.value)}
                className="py-2 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Assessments</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({LEVEL_CONFIG[a.level]?.label || a.level})
                  </option>
                ))}
              </select>

              {/* Level Filter */}
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="py-2 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Levels</option>
                <option value="ENTRY_LEVEL">Entry Level</option>
                <option value="MIDDLE_LEVEL">Middle Level</option>
                <option value="EXIT_LEVEL">Exit Level</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Pending Evaluation</option>
                <option value="EVALUATED">Evaluated</option>
              </select>
            </div>

            {/* Submissions Table */}
            {isLoading ? (
              <div className="py-16">
                <Loading message="Loading test submissions..." />
              </div>
            ) : filteredSubmissions.length === 0 ? (

              <Card className="text-center py-16 px-4">
                <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  No Submissions Found
                </h3>
                <p className="text-xs text-slate-500">
                  {submissions.length === 0
                    ? 'Students have not submitted test links for unlocked assessments yet.'
                    : 'No submissions match your active filter criteria.'}
                </p>
              </Card>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Assessment & Level</th>
                        <th className="py-3 px-4">Submission Link</th>
                        <th className="py-3 px-4">Submitted At</th>
                        <th className="py-3 px-4">Status & Score</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSubmissions.map((sub) => {
                        const isEvaluated = sub.status === 'EVALUATED';
                        const levelConf = LEVEL_CONFIG[sub.assessment_level] || LEVEL_CONFIG.ENTRY_LEVEL;

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            {/* Student Info */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {sub.student_name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {sub.student_roll_no} • {sub.batch_name || 'Batch'}
                              </div>
                            </td>

                            {/* Assessment Title & Level */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-900 dark:text-slate-100 max-w-[220px] truncate">
                                {sub.assessment_title}
                              </div>
                              <div className="mt-1">
                                <Badge variant={levelConf.badgeVariant}>
                                  {levelConf.label}
                                </Badge>
                              </div>

                            </td>

                            {/* Submission Link */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={sub.submission_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline max-w-[200px] truncate"
                                  title={sub.submission_link}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{sub.submission_link}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(sub.submission_link)}
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                  title="Copy Link"
                                >
                                  {copiedLink === sub.submission_link ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>

                              {sub.answer_file_url && (
                                <a
                                  href={sub.answer_file_url}
                                  download={sub.answer_file_name || 'answer_sheet.pdf'}
                                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download Sheet</span>
                                </a>
                              )}
                            </td>

                            {/* Submitted At */}
                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                              {new Date(sub.submitted_at).toLocaleDateString()} at{' '}
                              {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>

                            {/* Status & Score */}
                            <td className="py-3.5 px-4">
                              {isEvaluated ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                      {sub.marks_obtained} / {sub.total_marks}
                                    </span>
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                        sub.is_passed
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                          : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                                      }`}
                                    >
                                      {sub.is_passed ? 'PASSED' : 'RETRY'}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Graded by {sub.evaluated_by_name || 'Mentor'}
                                  </div>
                                </div>
                              ) : (
                                <Badge variant="warning">
                                  Pending Review
                                </Badge>
                              )}

                            </td>

                            {/* Action Button */}
                            <td className="py-3.5 px-4 text-right">
                              {isEvaluated ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openEvaluationModal(sub)}
                                  className="gap-1.5 font-semibold text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                  <span>Edit Grade</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => openEvaluationModal(sub)}
                                  className="gap-1.5 font-semibold shadow-xs"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Grade Test</span>
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RESULT SCORE SHEET MATRIX */}
        {activeTab === 'SCORE_SHEET' && (
          <div className="space-y-4">
            {/* Batch Selector & Print Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase text-slate-500">Batch Score Sheet:</span>
                <select
                  value={scoreSheetBatchId}
                  onChange={(e) => setScoreSheetBatchId(e.target.value)}
                  className="py-2 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.batch_type || 'Tech Master'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Score Sheet</span>
                </Button>
              </div>
            </div>

            {/* Score Sheet Matrix Table */}
            {scoreSheet.length === 0 ? (
              <Card className="text-center py-16 px-4">
                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  No Student Score Sheet Records
                </h3>
                <p className="text-xs text-slate-500">
                  Select an active batch with enrolled trainees to view the Entry, Middle, and Exit level matrix.
                </p>
              </Card>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4 text-center">Entry Level (Week 1)</th>
                        <th className="py-3 px-4 text-center">Middle Level (Mid-term)</th>
                        <th className="py-3 px-4 text-center">Exit Level (Graduation)</th>
                        <th className="py-3 px-4 text-center">Cumulative Score</th>
                        <th className="py-3 px-4 text-center">Percentage</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {scoreSheet.map((row) => {
                        return (
                          <tr key={row.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            {/* Student */}
                            <td className="py-3.5 px-4 font-sans">
                              <div className="font-bold text-slate-900 dark:text-slate-100">
                                {row.student_name}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">{row.roll_number}</div>
                            </td>

                            {/* Entry Level */}
                            <td className="py-3.5 px-4 text-center">
                              {row.entry_level ? (
                                row.entry_level.marks_obtained !== null && row.entry_level.marks_obtained !== undefined ? (
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      {row.entry_level.marks_obtained}
                                    </span>
                                    <span className="text-slate-400 text-[11px]"> / {row.entry_level.total_marks}</span>
                                    <div className="text-[10px] text-emerald-600 font-semibold">
                                      {row.entry_level.is_passed ? 'Pass' : 'Fail'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-amber-500 text-[11px]">Submitted</span>
                                )
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>

                            {/* Middle Level */}
                            <td className="py-3.5 px-4 text-center">
                              {row.middle_level ? (
                                row.middle_level.marks_obtained !== null && row.middle_level.marks_obtained !== undefined ? (
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      {row.middle_level.marks_obtained}
                                    </span>
                                    <span className="text-slate-400 text-[11px]"> / {row.middle_level.total_marks}</span>
                                    <div className="text-[10px] text-emerald-600 font-semibold">
                                      {row.middle_level.is_passed ? 'Pass' : 'Fail'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-amber-500 text-[11px]">Submitted</span>
                                )
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>

                            {/* Exit Level */}
                            <td className="py-3.5 px-4 text-center">
                              {row.exit_level ? (
                                row.exit_level.marks_obtained !== null && row.exit_level.marks_obtained !== undefined ? (
                                  <div>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                      {row.exit_level.marks_obtained}
                                    </span>
                                    <span className="text-slate-400 text-[11px]"> / {row.exit_level.total_marks}</span>
                                    <div className="text-[10px] text-emerald-600 font-semibold">
                                      {row.exit_level.is_passed ? 'Pass' : 'Fail'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-amber-500 text-[11px]">Submitted</span>
                                )
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>

                            {/* Cumulative Score */}
                            <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100">
                              {row.total_obtained} <span className="text-slate-400 font-normal">/ {row.total_max}</span>
                            </td>

                            {/* Percentage */}
                            <td className="py-3.5 px-4 text-center font-bold">
                              <span
                                className={
                                  row.percentage >= 75
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : row.percentage >= 40
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-red-500'
                                }
                              >
                                {row.percentage}%
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center font-sans">
                              {row.final_status === 'PASSED' ? (
                                <Badge variant="success">
                                  PASSED
                                </Badge>
                              ) : row.final_status === 'FAILED' ? (
                                <Badge variant="error">
                                  FAILED
                                </Badge>
                              ) : row.final_status === 'IN_PROGRESS' ? (
                                <Badge variant="info">
                                  IN PROGRESS
                                </Badge>
                              ) : (
                                <Badge variant="neutral">
                                  NOT STARTED
                                </Badge>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GRADING & EVALUATION MODAL */}
        <Modal
          isOpen={!!evaluatingSub}
          onClose={() => setEvaluatingSub(null)}
          title={`Grade Assessment: ${evaluatingSub?.student_name || ''}`}
          maxWidth="max-w-xl"
        >
          {evaluatingSub && (
            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              {evalError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{evalError}</span>
                </div>
              )}

              {/* Assessment Context Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Assessment:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{evaluatingSub.assessment_title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Level:</span>
                  <Badge variant={LEVEL_CONFIG[evaluatingSub.assessment_level]?.badgeVariant || 'info'}>
                    {LEVEL_CONFIG[evaluatingSub.assessment_level]?.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Candidate:</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {evaluatingSub.student_name} ({evaluatingSub.student_roll_no})
                  </span>
                </div>
              </div>

              {/* Student Submitted Link & Notes */}
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900 space-y-2">
                <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Student Solution Link:
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={evaluatingSub.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline truncate bg-white dark:bg-slate-900 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800"
                  >
                    {evaluatingSub.submission_link}
                  </a>
                  <a
                    href={evaluatingSub.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Link</span>
                  </a>
                </div>

                {evaluatingSub.submission_notes && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                    <strong>Student Notes:</strong> {evaluatingSub.submission_notes}
                  </div>
                )}
              </div>

              {/* Marks Input & Pass/Fail Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Marks Obtained (Max: {maxMarks}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={maxMarks}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Evaluation Result
                  </label>
                  <div
                    className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      marks >= passingMarks
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/50 dark:text-red-400'
                    }`}
                  >
                    {marks >= passingMarks ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>PASSED (Min: {passingMarks})</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span>NEEDS IMPROVEMENT</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Feedback Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Mentor Feedback & Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide constructive feedback, strengths, and areas for improvement..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEvaluatingSub(null)}
                  disabled={isSubmittingEval}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                  disabled={isSubmittingEval}
                >
                  {isSubmittingEval ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Grade...</span>
                    </span>
                  ) : (

                    'Save Grade & Update Score Sheet'
                  )}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
export default MentorAssessmentEvaluation;
