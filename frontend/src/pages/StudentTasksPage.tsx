import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../api/client';
import { TaskResponse, TaskSubmissionResponse } from '../types';
import {
  CheckSquare, Download, ExternalLink, FileText, Calendar,
  Clock, AlertCircle, CheckCircle2, Award, Send, RefreshCw,
  Search, UploadCloud, Layers, User, Link as LinkIcon, Eye, Paperclip
} from 'lucide-react';

export const StudentTasksPage: React.FC = () => {
  const { addToast } = useNotifications();

  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmissionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'EVALUATED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Submit Modal state
  const [submittingTask, setSubmittingTask] = useState<TaskResponse | null>(null);
  const [codeLink, setCodeLink] = useState('');
  const [textOutput, setTextOutput] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Details Modal state
  const [viewingTask, setViewingTask] = useState<TaskResponse | null>(null);

  const fetchStudentTasksData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tasksRes, subsRes] = await Promise.all([
        api.get<TaskResponse[]>('/tasks'),
        api.get<TaskSubmissionResponse[]>('/task-submissions'),
      ]);
      setTasks(tasksRes || []);
      setSubmissions(subsRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentTasksData();
  }, []);

  const getTaskSubmission = (taskId: string) => {
    return submissions.find((s) => s.task_id === taskId);
  };

  const handleOpenSubmitModal = (task: TaskResponse) => {
    const existing = getTaskSubmission(task.id);
    setSubmittingTask(task);
    setCodeLink(existing?.code_link || '');
    setTextOutput(existing?.text_output || '');
    setUploadedFileName(existing?.file_name || '');
    setUploadedFileUrl(existing?.file_url || '');
    setSubmissionError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setSubmissionError('File size exceeds the 15 MB limit.');
      return;
    }

    setUploadedFileName(file.name);
    setSubmissionError(null);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setUploadedFileUrl(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;

    if (!codeLink.trim() && !textOutput.trim() && !uploadedFileUrl) {
      setSubmissionError('Please provide a repository/solution link or written response.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionError(null);

      const payload = {
        code_link: codeLink.trim() || undefined,
        text_output: textOutput.trim() || undefined,
        file_url: uploadedFileUrl || undefined,
        file_name: uploadedFileName || undefined,
      };

      await api.post(`/tasks/${submittingTask.id}/submit`, payload);

      addToast({
        title: 'Task Submitted Successfully!',
        message: `Your solution for "${submittingTask.title}" has been sent to your mentor for evaluation.`,
        type: 'success',
      });

      setSubmittingTask(null);
      fetchStudentTasksData();
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to submit task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTaskFile = (task: TaskResponse) => {
    if (!task.file_url) return;

    if (task.file_url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = task.file_url;
      a.download = task.file_name || `${task.title.replace(/\s+/g, '_')}_Material.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(task.file_url, '_blank');
    }
  };

  // Filter tasks based on query and status
  const filteredTasks = tasks.filter((t) => {
    const sub = getTaskSubmission(t.id);
    const isSubmitted = !!sub;
    const isEvaluated = sub && (sub.status === 'EVALUATED' || sub.status === 'GRADED');

    if (statusFilter === 'PENDING' && isSubmitted) return false;
    if (statusFilter === 'SUBMITTED' && (!isSubmitted || isEvaluated)) return false;
    if (statusFilter === 'EVALUATED' && !isEvaluated) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q) || false;
      const matchBatch = t.batch_name?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc && !matchBatch) return false;
    }

    return true;
  });

  const totalTasksCount = tasks.length;
  const submittedCount = tasks.filter((t) => !!getTaskSubmission(t.id)).length;
  const evaluatedCount = tasks.filter((t) => {
    const s = getTaskSubmission(t.id);
    return s && (s.status === 'EVALUATED' || s.status === 'GRADED');
  }).length;
  const pendingCount = totalTasksCount - submittedCount;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <CheckSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Assigned Tasks & Submissions
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Review tasks assigned by your mentor, download task reference materials, and submit your project solutions.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchStudentTasksData}
            className="flex items-center gap-1.5 self-start md:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`cursor-pointer p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all shadow-sm ${
              statusFilter === 'ALL'
                ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 ring-2 ring-slate-400/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 sm:p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl">
                <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <Badge variant="neutral" className="text-[10px] sm:text-xs">All Tasks</Badge>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Total Assigned</h3>
              <div className="mt-1 sm:mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">{totalTasksCount}</span>
                <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">Curriculum</span>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('PENDING')}
            className={`cursor-pointer p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all shadow-sm ${
              statusFilter === 'PENDING'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500 ring-2 ring-amber-500/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 sm:p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg sm:rounded-xl">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <Badge variant="warning" className="text-[10px] sm:text-xs">Pending</Badge>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Unsubmitted</h3>
              <div className="mt-1 sm:mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400">{pendingCount}</span>
                <span className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400 font-bold">Action Needed</span>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`cursor-pointer p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all shadow-sm ${
              statusFilter === 'SUBMITTED'
                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-500 ring-2 ring-blue-500/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 sm:p-2.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl">
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <Badge variant="info" className="text-[10px] sm:text-xs">In Review</Badge>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Submitted</h3>
              <div className="mt-1 sm:mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-extrabold text-blue-600 dark:text-blue-400">{submittedCount - evaluatedCount}</span>
                <span className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-400 font-bold">Reviewing</span>
              </div>
            </div>
          </div>

          <div
            onClick={() => setStatusFilter('EVALUATED')}
            className={`cursor-pointer p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all shadow-sm ${
              statusFilter === 'EVALUATED'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500 ring-2 ring-emerald-500/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 sm:p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg sm:rounded-xl">
                <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <Badge variant="success" className="text-[10px] sm:text-xs">Completed</Badge>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Evaluated</h3>
              <div className="mt-1 sm:mt-2 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{evaluatedCount}</span>
                <span className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-400 font-bold">Graded</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks by title, instructions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Submitted ({submittedCount - evaluatedCount})
            </button>
            <button
              onClick={() => setStatusFilter('EVALUATED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                statusFilter === 'EVALUATED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Evaluated ({evaluatedCount})
            </button>
          </div>
        </div>

        {/* Task Cards List */}
        {isLoading && <Loading message="Loading your assigned tasks..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && !error && filteredTasks.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
            <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No tasks found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {tasks.length === 0
                ? 'Your mentor has not assigned any tasks for your batch yet. Check back soon!'
                : 'No tasks match your active filter criteria.'}
            </p>
          </div>
        )}

        {!isLoading && !error && filteredTasks.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTasks.map((task) => {
              const sub = getTaskSubmission(task.id);
              const isSubmitted = !!sub;
              const isEvaluated = sub && (sub.status === 'EVALUATED' || sub.status === 'GRADED');
              const hasFile = !!task.file_url;

              return (
                <div
                  key={task.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Status & Batch Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                          <CheckSquare className="w-4 h-4" />
                        </span>
                        <div>
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-mono">
                            <Layers className="w-3 h-3" />
                            {task.batch_name || 'Assigned Batch'}
                          </span>
                        </div>
                      </div>

                      {isEvaluated ? (
                        <Badge variant="success">Graded ({sub?.marks}/{sub?.max_marks || task.max_marks})</Badge>
                      ) : isSubmitted ? (
                        <Badge variant="info">Submitted (In Review)</Badge>
                      ) : (
                        <Badge variant="warning">Pending Submission</Badge>
                      )}
                    </div>

                    {/* Task Title & Description */}
                    <div className="mt-3.5">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {task.description || 'No additional instructions provided.'}
                      </p>
                    </div>

                    {/* Details Box */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Due Date</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          {task.due_date ? task.due_date.slice(0, 10) : 'No due date'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Max Score</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5 font-mono">
                          <Award className="w-3 h-3 text-amber-500" />
                          {task.max_marks} Pts
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Mentor</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5 truncate">
                          <User className="w-3 h-3 text-emerald-500" />
                          {task.mentor_name || 'Lead Mentor'}
                        </span>
                      </div>
                    </div>

                    {/* Submitted Work Summary (if already submitted) */}
                    {sub && (
                      <div className="mt-3.5 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Your Submitted Solution
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}
                          </span>
                        </div>

                        {sub.code_link && (
                          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] truncate">
                            <LinkIcon className="w-3 h-3 shrink-0" />
                            <a
                              href={sub.code_link.startsWith('http') ? sub.code_link : `https://${sub.code_link}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline truncate"
                            >
                              {sub.code_link}
                            </a>
                          </div>
                        )}

                        {sub.file_name && (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono text-[11px] truncate">
                            <Paperclip className="w-3 h-3 text-indigo-500 shrink-0" />
                            {sub.file_url ? (
                              <a
                                href={sub.file_url}
                                download={sub.file_name}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                              >
                                {sub.file_name}
                              </a>
                            ) : (
                              <span className="truncate">{sub.file_name}</span>
                            )}
                          </div>
                        )}

                        {sub.feedback && (
                          <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-emerald-900 dark:text-emerald-300 text-[11px]">
                            <strong>Mentor Feedback:</strong> {sub.feedback}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingTask(task)}
                        className="text-xs flex-1 sm:flex-none justify-center min-h-[36px]"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>

                      {hasFile && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadTaskFile(task)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex-1 sm:flex-none justify-center min-h-[36px]"
                          title="Download Mentor Task Document / PDF"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Download PDF
                        </Button>
                      )}
                    </div>

                    <Button
                      variant={isSubmitted ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => handleOpenSubmitModal(task)}
                      className={`text-xs font-bold w-full sm:w-auto justify-center min-h-[38px] ${
                        !isSubmitted ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''
                      }`}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      {isSubmitted ? 'Update Submission' : 'Submit Solution'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal 1: Submit Task Solution */}
        <Modal
          isOpen={!!submittingTask}
          onClose={() => setSubmittingTask(null)}
          title={`Submit Work: ${submittingTask?.title || ''}`}
        >
          <form onSubmit={handleSubmitTask} className="space-y-4 text-xs font-sans">
            {submissionError && <ErrorMessage message={submissionError} />}

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-900 dark:text-indigo-300">
              <span className="font-bold block">Submission Instructions:</span>
              <p className="mt-1 leading-relaxed">
                Provide your code repository link (e.g. GitHub, GitLab, Google Drive, Vercel/Netlify demo) or write a summary of your implementation.
              </p>
            </div>

            {/* Code / Project Link */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Repository / Solution Link <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="https://github.com/username/project-repo"
                  value={codeLink}
                  onChange={(e) => setCodeLink(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                Include GitHub URL, GitLab, Google Drive submission link, or live project URL.
              </span>
            </div>

            {/* Implementation Notes */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Notes & Summary (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe your approach, features implemented, or technical notes..."
                value={textOutput}
                onChange={(e) => setTextOutput(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Optional File Attachment */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                Attach Screenshot / Archive / PDF (Optional)
              </label>
              <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                <input
                  type="file"
                  id="student-task-file-upload"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="student-task-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <UploadCloud className="w-5 h-5 text-indigo-500" />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    {uploadedFileName ? uploadedFileName : 'Click to upload proof / document (Max 15 MB)'}
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setSubmittingTask(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Submit Solution
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal 2: View Task Details */}
        <Modal
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          title={viewingTask?.title || 'Task Details'}
        >
          {viewingTask && (
            <div className="space-y-4 text-xs font-sans">
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Assigned Batch</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {viewingTask.batch_name || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Due Date</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                    {viewingTask.due_date ? viewingTask.due_date.slice(0, 10) : 'Open'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Max Marks</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
                    {viewingTask.max_marks} Pts
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Detailed Instructions</h4>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {viewingTask.description || 'No detailed instructions provided.'}
                </div>
              </div>

              {viewingTask.file_url && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {viewingTask.file_name || 'Task Material Document'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">PDF Document</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleDownloadTaskFile(viewingTask)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download PDF
                  </Button>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="secondary" size="sm" onClick={() => setViewingTask(null)}>
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
