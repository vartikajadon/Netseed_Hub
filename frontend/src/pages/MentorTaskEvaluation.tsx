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
import { Batch, AssignedTask, TaskSubmissionItem, TaskEvaluationPayload } from '../types';
import {
  Award, ExternalLink, FileText, CheckCircle2, Clock, Send,
  User, CheckSquare, Search, Filter, MessageSquare, Copy, Check,
  AlertCircle, ArrowLeft, Building2, UserCheck, Paperclip, Download
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export const MentorTaskEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useNotifications();

  const [submissions, setSubmissions] = useState<TaskSubmissionItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [taskFilter, setTaskFilter] = useState<string>(searchParams.get('taskId') || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Evaluation Modal
  const [evaluatingSub, setEvaluatingSub] = useState<TaskSubmissionItem | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [feedback, setFeedback] = useState<string>('');
  const [sendAckStudent, setSendAckStudent] = useState<boolean>(true);
  const [sendAckHr, setSendAckHr] = useState<boolean>(true);
  const [ackMessage, setAckMessage] = useState<string>('');
  const [isSubmittingEval, setIsSubmittingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Text Output Viewer Modal
  const [viewingTextOutput, setViewingTextOutput] = useState<{ title: string; text: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [subsData, batchesData, tasksData] = await Promise.all([
        api.get<TaskSubmissionItem[]>('/task-submissions'),
        api.get<Batch[]>('/batches'),
        api.get<AssignedTask[]>('/tasks'),
      ]);

      setSubmissions(subsData || []);
      setBatches(batchesData || []);
      setTasks(tasksData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load task submissions for evaluation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEvaluationModal = (sub: TaskSubmissionItem) => {
    setEvaluatingSub(sub);
    setMarks(sub.marks !== null && sub.marks !== undefined ? Number(sub.marks) : 80);
    setMaxMarks(sub.max_marks || 100);
    setFeedback(sub.feedback || '');
    // Default both to true or current values, giving mentor full choice
    setSendAckStudent(sub.ack_sent_to_student !== undefined ? sub.ack_sent_to_student : true);
    setSendAckHr(sub.ack_sent_to_hr !== undefined ? sub.ack_sent_to_hr : true);
    setAckMessage(sub.ack_message || '');
    setEvalError(null);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadSubmissionFile = (sub: TaskSubmissionItem) => {
    if (!sub.file_url) return;
    if (sub.file_url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = sub.file_url;
      a.download = sub.file_name || `${sub.student_name.replace(/\s+/g, '_')}_Solution.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(sub.file_url, '_blank');
    }
  };

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSub) return;
    setEvalError(null);

    if (marks < 0 || marks > maxMarks) {
      setEvalError(`Marks must be between 0 and ${maxMarks}.`);
      return;
    }

    try {
      setIsSubmittingEval(true);
      const payload: TaskEvaluationPayload = {
        marks: Number(marks),
        max_marks: Number(maxMarks),
        feedback: feedback.trim() || undefined,
        send_ack_student: sendAckStudent,
        send_ack_hr: sendAckHr,
        ack_message: ackMessage.trim() || undefined,
      };

      await api.put(`/task-submissions/${evaluatingSub.id}/evaluate`, payload);

      const ackSummary = [];
      if (sendAckStudent) ackSummary.push('Student');
      if (sendAckHr) ackSummary.push('HR');
      const ackText = ackSummary.length > 0 ? ` Acknowledgement dispatched to: ${ackSummary.join(' & ')}.` : '';

      showToast(
        'Evaluation & Score Recorded',
        `Awarded ${marks}/${maxMarks} marks to ${evaluatingSub.student_name}.${ackText}`,
        'ACKNOWLEDGEMENT'
      );

      setEvaluatingSub(null);
      await fetchData();
    } catch (err: any) {
      setEvalError(err.message || 'Failed to save evaluation.');
    } finally {
      setIsSubmittingEval(false);
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    if (batchFilter !== 'ALL' && sub.batch_id !== batchFilter) {
      return false;
    }
    if (taskFilter !== 'ALL' && sub.task_id !== taskFilter) {
      return false;
    }
    if (statusFilter !== 'ALL' && sub.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sub.student_name.toLowerCase().includes(q) ||
        sub.student_roll_no.toLowerCase().includes(q) ||
        sub.task_title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = submissions.filter((s) => s.status === 'PENDING_EVALUATION').length;
  const evaluatedCount = submissions.filter((s) => s.status === 'EVALUATED').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Award className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Task Evaluation & Scoring Portal
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Review code repository links, attached files & written notes, grade submissions, and dispatch acknowledgements to HR and students.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/mentor/task-assignment"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Task Assignment</span>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
              Total Submissions
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
              {submissions.length}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/40 p-4 rounded-2xl shadow-xs bg-amber-50/20 dark:bg-amber-950/10">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">
              Pending Evaluation
            </span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {pendingCount}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 p-4 rounded-2xl shadow-xs bg-emerald-50/20 dark:bg-emerald-950/10">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
              Evaluated & Graded
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {evaluatedCount}
            </span>
          </div>
        </div>

        {isLoading && <Loading message="Loading student submissions and evaluation records..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && (
          <Card
            title="Trainee Submissions Roster"
            subtitle="Inspect code repositories, console text outputs, and grade marks"
            action={
              <div className="flex flex-wrap items-center gap-2">
                {/* Batch Filter */}
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {/* Task Filter */}
                <select
                  value={taskFilter}
                  onChange={(e) => setTaskFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[160px] truncate"
                >
                  <option value="ALL">All Tasks</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING_EVALUATION">Pending Evaluation</option>
                  <option value="EVALUATED">Evaluated</option>
                </select>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search trainee..."
                    className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            }
          >
            {filteredSubmissions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold bg-slate-50/50 dark:bg-slate-800/30">
                      <th className="py-3 px-4">Trainee</th>
                      <th className="py-3 px-4">Task & Batch</th>
                      <th className="py-3 px-4">Submission Output</th>
                      <th className="py-3 px-4">Status & Marks</th>
                      <th className="py-3 px-4">Acknowledgement Dispatch</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubmissions.map((sub) => {
                      const isPending = sub.status === 'PENDING_EVALUATION';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Trainee */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-indigo-500" />
                              {sub.student_name}
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                              {sub.student_roll_no}
                            </span>
                          </td>

                          {/* Task & Batch */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {sub.task_title}
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block mt-0.5">
                              {sub.batch_name || 'Batch'}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Submission Output: Code Link, Attached File, or Text Output */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              {/* Code Link */}
                              {sub.code_link ? (
                                <a
                                  href={sub.code_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded-lg text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                                  title={sub.code_link}
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[130px]">Open Code Repo</span>
                                </a>
                              ) : null}

                              {/* Attached File */}
                              {sub.file_url ? (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSubmissionFile(sub)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-lg text-[11px] font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors"
                                  title={sub.file_name || 'Download Attached File'}
                                >
                                  <Paperclip className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                                  <span className="truncate max-w-[120px]">{sub.file_name || 'Attached File'}</span>
                                  <Download className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                </button>
                              ) : null}

                              {/* Text Output */}
                              {sub.text_output ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setViewingTextOutput({
                                      title: `${sub.student_name} — Text Output`,
                                      text: sub.text_output || '',
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <FileText className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span>View Written Notes</span>
                                </button>
                              ) : null}

                              {!sub.code_link && !sub.file_url && !sub.text_output && (
                                <span className="text-[11px] text-slate-400 italic">No output submitted</span>
                              )}
                            </div>
                          </td>

                          {/* Status & Marks */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <Badge variant={isPending ? 'warning' : 'success'}>
                                {isPending ? 'Pending Evaluation' : 'Evaluated'}
                              </Badge>
                              {sub.marks !== null && sub.marks !== undefined ? (
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                                  {sub.marks} / {sub.max_marks} Marks
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 block font-mono">Not scored</span>
                              )}
                            </div>
                          </td>

                          {/* Acknowledgements Status */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1 text-[11px]">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">Student:</span>
                                {sub.ack_sent_to_student ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Sent
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Not Sent</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">HR:</span>
                                {sub.ack_sent_to_hr ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Sent
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Not Sent</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openEvaluationModal(sub)}
                              className={`text-[11px] px-2.5 py-1 flex items-center gap-1 ml-auto ${
                                isPending
                                  ? 'bg-indigo-600 hover:bg-indigo-500'
                                  : 'bg-slate-700 hover:bg-slate-600 dark:bg-slate-800'
                              }`}
                            >
                              <Award className="w-3 h-3" />
                              <span>{isPending ? 'Evaluate & Score' : 'Edit Evaluation'}</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-500" />
                <p className="text-xs font-semibold">No submissions found matching the criteria.</p>
              </div>
            )}
          </Card>
        )}

        {/* ---------------------------------------------------- */}
        {/* EVALUATION & ACKNOWLEDGEMENT MODAL                   */}
        {/* ---------------------------------------------------- */}
        {evaluatingSub && (
          <Modal
            isOpen={true}
            onClose={() => { if (!isSubmittingEval) setEvaluatingSub(null); }}
            title="Evaluate Trainee Submission & Dispatch Acknowledgement"
            maxWidth="max-w-2xl"
          >
            <form onSubmit={handleSubmitEvaluation} className="space-y-4">
              {evalError && <ErrorMessage message={evalError} />}

              {/* Trainee & Task Brief Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase">
                    Trainee
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                    {evaluatingSub.student_name}
                  </span>
                  <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                    Roll: {evaluatingSub.student_roll_no}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase">
                    Task & Batch
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">
                    {evaluatingSub.task_title}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Batch: {evaluatingSub.batch_name || 'Active Batch'}
                  </span>
                </div>
              </div>

              {/* Submitted Outputs Review Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Submitted Work Review
                </h4>

                {/* 1. Code Repository Link */}
                {evaluatingSub.code_link && (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                          Repository Link Submitted:
                        </span>
                        <a
                          href={evaluatingSub.code_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
                        >
                          {evaluatingSub.code_link}
                        </a>
                      </div>
                    </div>
                    <a
                      href={evaluatingSub.code_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1 transition-colors"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* 2. Attached File / Document */}
                {evaluatingSub.file_url && (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                          Attached Solution Document / File:
                        </span>
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate block">
                          {evaluatingSub.file_name || 'Trainee_Solution_Attachment'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadSubmissionFile(evaluatingSub)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </button>
                  </div>
                )}

                {/* 3. Text Output Snippet */}
                {evaluatingSub.text_output && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5 text-[11px]">
                      <span className="font-semibold">Solution Text / Implementation Notes:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(evaluatingSub.text_output || '')}
                        className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-[11px] font-medium"
                      >
                        {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedText ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap max-h-36 overflow-y-auto text-[11px] leading-relaxed font-mono text-slate-700 dark:text-slate-300">
                      {evaluatingSub.text_output}
                    </pre>
                  </div>
                )}
              </div>

              {/* Grading: Marks & Feedback */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Marks Awarded * (Max: {maxMarks})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={maxMarks}
                    step={0.5}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Maximum Marks
                  </label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Qualitative Feedback */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mentor Review Feedback / Remarks
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide qualitative feedback, code architecture strengths, areas of improvement, or suggestions..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* ---------------------------------------------------- */}
              {/* ACKNOWLEDGEMENT DISPATCH (MENTOR'S CHOICE)            */}
              {/* ---------------------------------------------------- */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 to-sky-50/80 dark:from-indigo-950/30 dark:to-sky-950/20 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Send Acknowledgement with Marks (Mentor's Choice)
                    </h5>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                      Choose recipients to receive formal score acknowledgement notifications:
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Option 1: Send to Student */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={sendAckStudent}
                      onChange={(e) => setSendAckStudent(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        Send to Student
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Notifies {evaluatingSub.student_name} immediately with their score & feedback.
                      </span>
                    </div>
                  </label>

                  {/* Option 2: Send to HR */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-indigo-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={sendAckHr}
                      onChange={(e) => setSendAckHr(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        Send to HR
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Transmits evaluation completion & marks to HR Management records.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Optional Acknowledgement Custom Message */}
                {(sendAckStudent || sendAckHr) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Optional Acknowledgement Message / Note:
                    </label>
                    <input
                      type="text"
                      value={ackMessage}
                      onChange={(e) => setAckMessage(e.target.value)}
                      placeholder="e.g. Great code quality and complete test coverage demonstrated."
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setEvaluatingSub(null)}
                  disabled={isSubmittingEval}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={isSubmittingEval}
                  className="text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border-none"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {isSubmittingEval ? 'Saving Evaluation...' : 'Submit Evaluation & Send Acknowledgement'}
                  </span>
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* ---------------------------------------------------- */}
        {/* TEXT OUTPUT FULL VIEWER MODAL                        */}
        {/* ---------------------------------------------------- */}
        {viewingTextOutput && (
          <Modal
            isOpen={true}
            onClose={() => setViewingTextOutput(null)}
            title={viewingTextOutput.title}
            maxWidth="max-w-2xl"
          >
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl font-mono text-xs overflow-x-auto max-h-96 leading-relaxed border border-slate-200 dark:border-slate-800">
                <pre className="whitespace-pre-wrap">{viewingTextOutput.text}</pre>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(viewingTextOutput.text)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? 'Copied to Clipboard' : 'Copy Output Text'}</span>
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingTextOutput(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};
