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
import { Batch, Student, AssignedTask, TaskCreatePayload } from '../types';
import {
  CheckSquare, Plus, FileText, Calendar, Users, Layers,
  UploadCloud, Trash2, ExternalLink, Download, Clock, AlertCircle,
  Eye, CheckCircle2, ArrowRight, UserCheck, Search
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const MentorTaskAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNotifications();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatches, setActiveBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Task Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [lastSubmissionDate, setLastSubmissionDate] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [contentMode, setContentMode] = useState<'WRITE' | 'PDF' | 'BOTH'>('WRITE');
  
  // PDF upload state
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfFileUrl, setPdfFileUrl] = useState('');

  // Assignee selection state
  const [assigneeMode, setAssigneeMode] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task Details Modal
  const [viewingTask, setViewingTask] = useState<AssignedTask | null>(null);

  // Delete confirmation
  const [taskToDelete, setTaskToDelete] = useState<AssignedTask | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [batchData, studentData, taskData] = await Promise.all([
        api.get<Batch[]>('/batches'),
        api.get<any>('/students?limit=200'),
        api.get<AssignedTask[]>('/tasks'),
      ]);

      const allBatches = batchData || [];
      setBatches(allBatches);
      const active = allBatches.filter((b) => b.status === 'ACTIVE');
      setActiveBatches(active);

      const sList = Array.isArray(studentData) ? studentData : studentData?.items || [];
      setStudents(sList);
      setTasks(taskData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load task assignment data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = (preselectedBatchId?: string) => {
    const targetBatchId = preselectedBatchId || activeBatches[0]?.id || batches[0]?.id || '';
    setSelectedBatchId(targetBatchId);
    setTaskTitle('');
    setTaskDescription('');
    
    // Default due date: 7 days from now at 11:59 PM
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(23, 59, 0, 0);
    setLastSubmissionDate(nextWeek.toISOString().slice(0, 16));

    setMaxMarks(100);
    setContentMode('WRITE');
    setPdfFileName('');
    setPdfFileUrl('');
    setAssigneeMode('ALL');
    setSelectedStudentIds([]);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFormError('Please select a valid PDF file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setFormError('PDF file size exceeds 15 MB limit.');
      return;
    }

    setPdfFileName(file.name);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setPdfFileUrl(uploadEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedPdf = () => {
    setPdfFileName('');
    setPdfFileUrl('');
  };

  // Trainees enrolled in the currently selected batch
  const batchStudents = students.filter((s) => s.batch_id === selectedBatchId);

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const selectAllStudentsInBatch = () => {
    setSelectedStudentIds(batchStudents.map((s) => s.id));
  };

  const clearAllSelectedStudents = () => {
    setSelectedStudentIds([]);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedBatchId) {
      setFormError('Please select an active training batch.');
      return;
    }

    if (!taskTitle.trim()) {
      setFormError('Task title is required.');
      return;
    }

    if (!lastSubmissionDate) {
      setFormError('Please specify the last date for task submission.');
      return;
    }

    if (contentMode === 'WRITE' && !taskDescription.trim()) {
      setFormError('Please write the task instructions/requirements.');
      return;
    }

    if (contentMode === 'PDF' && !pdfFileUrl) {
      setFormError('Please import/upload a PDF document for this task.');
      return;
    }

    if (contentMode === 'BOTH' && (!taskDescription.trim() || !pdfFileUrl)) {
      setFormError('Please provide both written instructions and upload a PDF document.');
      return;
    }

    if (assigneeMode === 'SPECIFIC' && selectedStudentIds.length === 0) {
      setFormError('Please select at least one specific student to assign this task.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: TaskCreatePayload = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        file_url: pdfFileUrl || undefined,
        file_name: pdfFileName || undefined,
        batch_id: selectedBatchId,
        due_date: new Date(lastSubmissionDate).toISOString(),
        assign_to_all: assigneeMode === 'ALL',
        assigned_student_ids: assigneeMode === 'SPECIFIC' ? selectedStudentIds : [],
        max_marks: Number(maxMarks) || 100,
      };

      await api.post('/tasks', payload);
      showToast(
        'Task Assigned Successfully',
        `Task "${taskTitle}" assigned to ${assigneeMode === 'ALL' ? 'all batch trainees' : `${selectedStudentIds.length} trainees`}.`,
        'GENERAL'
      );

      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to assign task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await api.delete(`/tasks/${taskToDelete.id}`);
      showToast(
        'Task Deleted',
        `Task "${taskToDelete.title}" has been deleted.`,
        'GENERAL'
      );
      setTaskToDelete(null);
      await fetchData();
    } catch (err: any) {
      showToast(
        'Failed to Delete Task',
        err.message || 'Error deleting task.',
        'GENERAL'
      );
    }
  };

  // Filter tasks for table
  const filteredTasks = tasks.filter((t) => {
    if (selectedBatchFilter !== 'ALL' && t.batch_id !== selectedBatchFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.batch_name && t.batch_name.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <CheckSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Task Assignment Portal
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Assign tasks to active training batches via written guidelines or imported PDF briefs with deadlines.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/mentor/task-evaluation"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition-all"
            >
              <span>Task Evaluation Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Button
              variant="primary"
              onClick={() => openCreateModal()}
              disabled={activeBatches.length === 0}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Assign New Task</span>
            </Button>
          </div>
        </div>

        {isLoading && <Loading message="Loading active batches and assigned tasks..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && (
          <>
            {/* SECTION 1: ALL ACTIVE BATCHES */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Active Training Batches ({activeBatches.length})
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a batch to rapidly assign or filter tasks
                </span>
              </div>

              {activeBatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeBatches.map((batch) => {
                    const enrolledCount = students.filter((s) => s.batch_id === batch.id).length;
                    const batchTasksCount = tasks.filter((t) => t.batch_id === batch.id).length;

                    return (
                      <div
                        key={batch.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                {batch.name}
                              </h3>
                              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                {batch.batch_type || 'Tech Master Program'}
                              </p>
                            </div>
                            <Badge variant="success">ACTIVE</Badge>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Trainees Enrolled</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                                <Users className="w-3 h-3 text-indigo-500" />
                                {enrolledCount} Students
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Assigned Tasks</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                                <CheckSquare className="w-3 h-3 text-emerald-500" />
                                {batchTasksCount} Tasks
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {batch.start_date} ~ {batch.end_date}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelectedBatchFilter(batch.id)}
                            className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            Filter Tasks
                          </button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openCreateModal(batch.id)}
                            className="text-xs px-2.5 py-1 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Assign Task</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl text-center">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    No active batches found. Activate a batch to begin assigning tasks.
                  </p>
                </div>
              )}
            </div>

            {/* SECTION 2: ASSIGNED TASKS ROSTER & FILTER */}
            <Card
              title="Assigned Tasks Roster"
              subtitle="All tasks assigned across training batches"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {/* Batch Filter */}
                  <select
                    value={selectedBatchFilter}
                    onChange={(e) => setSelectedBatchFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Batches</option>
                    {activeBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              }
            >
              {filteredTasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold bg-slate-50/50 dark:bg-slate-800/30">
                        <th className="py-3 px-4">Task Title & Brief</th>
                        <th className="py-3 px-4">Batch</th>
                        <th className="py-3 px-4">Assignee Scope</th>
                        <th className="py-3 px-4">Submission Deadline</th>
                        <th className="py-3 px-4">Submissions</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredTasks.map((t) => {
                        const isExpired = new Date(t.due_date) < new Date();
                        const formattedDue = new Date(t.due_date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {t.title}
                                {t.file_url && (
                                  <span
                                    title={`Attached PDF: ${t.file_name || 'Document'}`}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded text-[9px] font-semibold"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    PDF
                                  </span>
                                )}
                              </div>
                              {t.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-sm">
                                  {t.description}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {t.batch_name || 'Batch'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {t.assign_to_all ? (
                                <Badge variant="info">All Students</Badge>
                              ) : (
                                <Badge variant="warning">
                                  {t.assigned_student_ids?.length || 0} Specific Trainees
                                </Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 font-mono text-[11px]">
                                <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-500' : 'text-indigo-500'}`} />
                                <span className={isExpired ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                                  {formattedDue}
                                </span>
                              </div>
                              {isExpired ? (
                                <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider block mt-0.5">
                                  Deadline Passed
                                </span>
                              ) : (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                                  Active Window
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                                {t.submission_count} Submissions
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingTask(t)}
                                  className="text-[11px] px-2 py-1 flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Details</span>
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => navigate(`/mentor/task-evaluation?taskId=${t.id}`)}
                                  className="text-[11px] px-2.5 py-1 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 border-none"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Evaluate</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setTaskToDelete(t)}
                                  className="text-[11px] px-2 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
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
                  <p className="text-xs font-semibold">No assigned tasks match your filter criteria.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCreateModal()}
                    className="mt-3 text-xs"
                  >
                    Assign a New Task
                  </Button>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ---------------------------------------------------- */}
        {/* ASSIGN TASK MODAL                                    */}
        {/* ---------------------------------------------------- */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => { if (!isSubmitting) setIsCreateModalOpen(false); }}
          title="Assign New Task to Batch"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            {formError && <ErrorMessage message={formError} />}

            {/* Batch Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Active Batch *
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setSelectedStudentIds([]);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                {activeBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.batch_type || 'Active'})
                  </option>
                ))}
              </select>
            </div>

            {/* Task Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Full Stack Authentication Pipeline & JWT Cookies"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Submission Mode: Write or Import PDF */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Task Format / Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setContentMode('WRITE')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    contentMode === 'WRITE'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Write Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentMode('PDF')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    contentMode === 'PDF'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Import PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContentMode('BOTH')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    contentMode === 'BOTH'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Write + PDF</span>
                </button>
              </div>
            </div>

            {/* Write Task Description */}
            {(contentMode === 'WRITE' || contentMode === 'BOTH') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Task Instructions & Deliverables *
                </label>
                <textarea
                  rows={4}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Detail the technical requirements, architecture specs, expected outputs, and submission criteria..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                  required={contentMode === 'WRITE'}
                />
              </div>
            )}

            {/* Import / Upload PDF */}
            {(contentMode === 'PDF' || contentMode === 'BOTH') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Import Task PDF Document *
                </label>
                {pdfFileUrl ? (
                  <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          {pdfFileName}
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                          PDF Brief Ready
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeUploadedPdf}
                      className="p-1 text-slate-500 hover:text-rose-600 transition-colors"
                      title="Remove PDF"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/20">
                    <UploadCloud className="w-7 h-7 text-indigo-500 mb-1" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Click to Browse & Upload Task PDF
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Accepts standard PDF documents up to 15 MB
                    </span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            )}

            {/* Last Date for Task Submission & Max Marks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Last Date for Submission *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={lastSubmissionDate}
                    onChange={(e) => setLastSubmissionDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Maximum Marks / Score
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Assignee Scope: All Students vs Specific Student */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Assignee Target Selection *
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAssigneeMode('ALL')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    assigneeMode === 'ALL'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>All Students in Batch ({batchStudents.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssigneeMode('SPECIFIC')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    assigneeMode === 'SPECIFIC'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Specific Student(s) ({selectedStudentIds.length} Selected)</span>
                </button>
              </div>

              {/* Specific Students Checklist */}
              {assigneeMode === 'SPECIFIC' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Select Trainees from Selected Batch:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllStudentsInBatch}
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllSelectedStudents}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {batchStudents.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {batchStudents.map((std) => {
                        const isSelected = selectedStudentIds.includes(std.id);
                        return (
                          <label
                            key={std.id}
                            className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors text-xs ${
                              isSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudentSelection(std.id)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                              />
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                                  {std.user?.full_name || 'Trainee'}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                  {std.roll_number}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {std.user?.email}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 py-2 text-center">
                      No enrolled trainees found in this batch.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting}
                className="text-xs flex items-center gap-1.5"
              >
                {isSubmitting ? 'Assigning Task...' : 'Publish & Assign Task'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* VIEW TASK DETAILS MODAL                              */}
        {/* ---------------------------------------------------- */}
        {viewingTask && (
          <Modal
            isOpen={true}
            onClose={() => setViewingTask(null)}
            title="Task Specifications"
            maxWidth="max-w-lg"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {viewingTask.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge variant="info">{viewingTask.batch_name || 'Batch'}</Badge>
                  <Badge variant="neutral">Max Marks: {viewingTask.max_marks}</Badge>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Created: {new Date(viewingTask.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {viewingTask.description && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Written Guidelines & Instructions:
                  </h4>
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {viewingTask.description}
                  </p>
                </div>
              )}

              {viewingTask.file_url && (
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        {viewingTask.file_name || 'Task Document.pdf'}
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        Imported PDF Brief
                      </span>
                    </div>
                  </div>
                  <a
                    href={viewingTask.file_url}
                    download={viewingTask.file_name || 'Task_Brief.pdf'}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </a>
                </div>
              )}

              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Submission Deadline:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {new Date(viewingTask.due_date).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                    Target Scope:
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {viewingTask.assign_to_all
                      ? 'All Batch Trainees'
                      : `${viewingTask.assigned_student_ids?.length || 0} Trainees`}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setViewingTask(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    const tId = viewingTask.id;
                    setViewingTask(null);
                    navigate(`/mentor/task-evaluation?taskId=${tId}`);
                  }}
                  className="text-xs flex items-center gap-1"
                >
                  <span>Evaluate Submissions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* ---------------------------------------------------- */}
        {/* DELETE CONFIRMATION MODAL                            */}
        {/* ---------------------------------------------------- */}
        {taskToDelete && (
          <Modal
            isOpen={true}
            onClose={() => setTaskToDelete(null)}
            title="Delete Assigned Task"
            maxWidth="max-w-md"
          >
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to delete task <span className="font-bold text-slate-900 dark:text-slate-100">"{taskToDelete.title}"</span>?
                All associated submissions and evaluations will also be removed.
              </p>
              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setTaskToDelete(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeleteTask}
                  className="text-xs bg-rose-600 hover:bg-rose-500 text-white border-none"
                >
                  Delete Task
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};
