import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Table, Column } from '../components/Table';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import { Batch, ProjectStudentItem, ProjectBatchResponse } from '../types';
import {
  FolderGit2,
  Users,
  Search,
  ExternalLink,
  Edit3,
  Send,
  CheckCircle2,
  Clock,
  FileText,
  Award,
  Sparkles,
} from 'lucide-react';

export const MentorProjects: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [batchData, setBatchData] = useState<ProjectBatchResponse | null>(null);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');

  // Modal 1: Broadcast to Batch
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchProjectTitle, setBatchProjectTitle] = useState('');
  const [batchProjectDesc, setBatchProjectDesc] = useState('');
  const [batchOverwrite, setBatchOverwrite] = useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [batchAssignSuccess, setBatchAssignSuccess] = useState<string | null>(null);
  const [batchAssignError, setBatchAssignError] = useState<string | null>(null);

  // Modal 2: Edit Individual Student Project
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<ProjectStudentItem | null>(null);
  const [studentProjectTitle, setStudentProjectTitle] = useState('');
  const [studentProjectDesc, setStudentProjectDesc] = useState('');
  const [studentProjectUrl, setStudentProjectUrl] = useState('');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [studentEditSuccess, setStudentEditSuccess] = useState<string | null>(null);
  const [studentEditError, setStudentEditError] = useState<string | null>(null);

  // Fetch initial batches
  useEffect(() => {
    const fetchBatches = async () => {
      setIsLoadingBatches(true);
      setError(null);
      try {
        const data = await api.get<Batch[]>('/batches');
        setBatches(data);
        if (data.length > 0) {
          setSelectedBatchId(data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load batches.');
      } finally {
        setIsLoadingBatches(false);
      }
    };
    fetchBatches();
  }, []);

  // Fetch students for selected batch
  const fetchBatchStudents = async (batchId: string) => {
    if (!batchId) return;
    setIsLoadingStudents(true);
    setError(null);
    try {
      const data = await api.get<ProjectBatchResponse>(`/projects/batch/${batchId}`);
      setBatchData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load batch projects data.');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchStudents(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!batchData?.students) return [];
    return batchData.students.filter((s) => {
      const name = (s.student_name || '').toLowerCase();
      const roll = (s.roll_number || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || roll.includes(q);

      const hasTitle = Boolean(s.project_title && s.project_title.trim() !== '');
      const hasUrl = Boolean(s.project_url && s.project_url.trim() !== '');

      let matchesStatus = true;
      if (statusFilter === 'SUBMITTED') matchesStatus = hasUrl;
      else if (statusFilter === 'ASSIGNED') matchesStatus = hasTitle && !hasUrl;
      else if (statusFilter === 'UNASSIGNED') matchesStatus = !hasTitle;

      return matchesSearch && matchesStatus;
    });
  }, [batchData, searchQuery, statusFilter]);

  // Open Edit Modal for a single student
  const handleOpenEditStudent = (student: ProjectStudentItem) => {
    setEditingStudent(student);
    setStudentProjectTitle(student.project_title || '');
    setStudentProjectDesc(student.project_description || '');
    setStudentProjectUrl(student.project_url || '');
    setStudentEditError(null);
    setStudentEditSuccess(null);
    setIsStudentModalOpen(true);
  };

  // Submit Batch Project Assignment
  const handleBatchAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchProjectTitle.trim()) {
      setBatchAssignError('Please enter a project title or idea.');
      return;
    }
    setIsSubmittingBatch(true);
    setBatchAssignError(null);
    setBatchAssignSuccess(null);
    try {
      const res = await api.post<{ message: string; assigned_count: number }>(
        `/projects/batch/${selectedBatchId}/assign`,
        {
          project_title: batchProjectTitle.trim(),
          project_description: batchProjectDesc.trim() || undefined,
          overwrite_existing: batchOverwrite,
        }
      );
      setBatchAssignSuccess(res.message || `Successfully assigned to ${res.assigned_count} students!`);
      await fetchBatchStudents(selectedBatchId);
      setTimeout(() => {
        setIsBatchModalOpen(false);
        setBatchProjectTitle('');
        setBatchProjectDesc('');
        setBatchOverwrite(false);
        setBatchAssignSuccess(null);
      }, 1500);
    } catch (err: any) {
      setBatchAssignError(err.message || 'Failed to broadcast batch project.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Submit Individual Student Project Update
  const handleStudentUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSubmittingStudent(true);
    setStudentEditError(null);
    setStudentEditSuccess(null);
    try {
      await api.put(`/projects/student/${editingStudent.student_id}`, {
        project_title: studentProjectTitle.trim() || undefined,
        project_description: studentProjectDesc.trim() || undefined,
        project_url: studentProjectUrl.trim() || undefined,
      });
      setStudentEditSuccess('Student project updated and synced with scoresheet!');
      await fetchBatchStudents(selectedBatchId);
      setTimeout(() => {
        setIsStudentModalOpen(false);
        setEditingStudent(null);
        setStudentEditSuccess(null);
      }, 1200);
    } catch (err: any) {
      setStudentEditError(err.message || 'Failed to update student project.');
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // Metrics
  const totalCount = batchData?.students?.length || 0;
  const assignedCount = batchData?.students?.filter((s) => s.project_title).length || 0;
  const submittedCount = batchData?.students?.filter((s) => s.project_url).length || 0;
  const pendingCount = assignedCount - submittedCount;

  const columns: Column<ProjectStudentItem>[] = [
    {
      header: 'Roll Number',
      accessor: (s) => (
        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {s.roll_number}
        </span>
      ),
    },
    {
      header: 'Student',
      accessor: (s) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
            {s.student_name}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            {s.student_email || s.roll_number}
          </div>
        </div>
      ),
    },
    {
      header: 'Passout Year',
      accessor: (s) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          {s.passout_year || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Project Assignment',
      accessor: (s) => (
        <div className="max-w-xs space-y-0.5">
          {s.project_title ? (
            <>
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate" title={s.project_title}>
                {s.project_title}
              </div>
              {s.project_description && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2" title={s.project_description}>
                  {s.project_description}
                </div>
              )}
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic text-xs">No project assigned yet</span>
          )}
        </div>
      ),
    },
    {
      header: 'Submission Status',
      accessor: (s) => {
        if (s.project_url) {
          return (
            <div className="space-y-1">
              <Badge variant="success">Submitted</Badge>
              {s.project_submitted_at && (
                <div className="text-[10px] text-slate-400 font-mono">
                  {new Date(s.project_submitted_at).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        }
        if (s.project_title) {
          return <Badge variant="warning">In Progress</Badge>;
        }
        return <Badge variant="neutral">Not Assigned</Badge>;
      },
    },
    {
      header: 'Project URL (Syncs to Scoresheet)',
      accessor: (s) => {
        if (!s.project_url) {
          return <span className="text-slate-400 text-xs italic">Awaiting Student URL</span>;
        }
        return (
          <a
            href={s.project_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline max-w-[170px] truncate"
            title={s.project_url}
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{s.project_url}</span>
          </a>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (s) => (
        <div className="flex items-center gap-1.5">
          {s.cv_url && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (s.cv_url) {
                  const win = window.open();
                  if (win) {
                    win.document.write(
                      `<iframe src="${s.cv_url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                    );
                    win.document.title = `${s.student_name}_CV`;
                  } else {
                    window.open(s.cv_url, '_blank');
                  }
                }
              }}
              title="View Trainee Resume"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:border-indigo-500"
            >
              <FileText className="w-3 h-3 mr-1" /> CV
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenEditStudent(s)}
            className="text-xs font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Edit3 className="w-3 h-3 mr-1 text-indigo-600 dark:text-indigo-400" />
            Edit Project
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FolderGit2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Capstone & Batch Projects
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Broadcast project ideas to cohorts, customize individual requirements, and track live student URL submissions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/mentor/scoresheet">
              <Button size="sm" variant="outline" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Award className="w-3.5 h-3.5 mr-1" /> View Scoresheet Matrix
              </Button>
            </Link>

            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setBatchAssignError(null);
                setBatchAssignSuccess(null);
                setIsBatchModalOpen(true);
              }}
              disabled={!selectedBatchId || isLoadingStudents}
              className="text-xs font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Assign Project to Batch
            </Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Filters and Batch Selector Bar */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Cohort / Batch:
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={isLoadingBatches}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Filter by Submission Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Trainees ({totalCount})</option>
                <option value="SUBMITTED">Submitted URLs ({submittedCount})</option>
                <option value="ASSIGNED">In Progress ({pendingCount})</option>
                <option value="UNASSIGNED">Unassigned ({totalCount - assignedCount})</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Search Trainee:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Total Batch Trainees</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCount}</span>
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Projects Assigned</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{assignedCount}</span>
              <FolderGit2 className="w-5 h-5 text-indigo-500" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">URLs Submitted</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{submittedCount}</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Pending Submissions</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{pendingCount}</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Student Project Table */}
        <Card>
          {isLoadingStudents ? (
            <div className="p-8">
              <Loading message="Loading batch students and project submissions..." />
            </div>
          ) : (
            <Table
              data={filteredStudents}
              columns={columns}
              keyExtractor={(s) => s.student_id}
              emptyMessage="No students found in this batch matching the current filter."
            />
          )}
        </Card>
      </div>

      {/* Modal 1: Broadcast Project to Batch */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Broadcast Project Idea to Cohort"
      >
        <form onSubmit={handleBatchAssignSubmit} className="space-y-4 font-sans text-xs">
          {batchAssignError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl font-medium">
              {batchAssignError}
            </div>
          )}
          {batchAssignSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {batchAssignSuccess}
            </div>
          )}

          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Target Batch: <strong>{batchData?.batch_name || 'Selected Cohort'}</strong> ({totalCount} Enrolled Trainees)
            </span>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Project Title / Idea Name *
            </label>
            <input
              type="text"
              required
              value={batchProjectTitle}
              onChange={(e) => setBatchProjectTitle(e.target.value)}
              placeholder="e.g. Full Stack Cloud Inventory & Invoicing Portal"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Project Brief / Specifications / Requirements
            </label>
            <textarea
              rows={4}
              value={batchProjectDesc}
              onChange={(e) => setBatchProjectDesc(e.target.value)}
              placeholder="Outline the scope, tech stack requirements (e.g. FastAPI + React), architectural guidelines, and submission criteria..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="overwriteCheckbox"
              checked={batchOverwrite}
              onChange={(e) => setBatchOverwrite(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="overwriteCheckbox" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
              Overwrite students who already have an assigned project
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsBatchModalOpen(false)} disabled={isSubmittingBatch}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingBatch}>
              <Send className="w-3.5 h-3.5 mr-1" />
              Broadcast to Cohort
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Individual Student Project */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title={`Customize Project for ${editingStudent?.student_name || 'Trainee'}`}
      >
        <form onSubmit={handleStudentUpdateSubmit} className="space-y-4 font-sans text-xs">
          {studentEditError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl font-medium">
              {studentEditError}
            </div>
          )}
          {studentEditSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {studentEditSuccess}
            </div>
          )}

          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100">{editingStudent?.student_name}</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{editingStudent?.roll_number}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Passout Year: <strong>{editingStudent?.passout_year || 'N/A'}</strong></span>
              {editingStudent?.cv_url && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> CV Available
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Custom Project Title
            </label>
            <input
              type="text"
              required
              value={studentProjectTitle}
              onChange={(e) => setStudentProjectTitle(e.target.value)}
              placeholder="e.g. Distributed Payment Gateway Simulator"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Custom Specifications & Notes
            </label>
            <textarea
              rows={4}
              value={studentProjectDesc}
              onChange={(e) => setStudentProjectDesc(e.target.value)}
              placeholder="Custom project requirements tailored specifically for this student..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Project URL (Auto-syncs with Scoresheet)
            </label>
            <input
              type="url"
              value={studentProjectUrl}
              onChange={(e) => setStudentProjectUrl(e.target.value)}
              placeholder="https://github.com/... or https://deployed-app.vercel.app"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Note: When the student submits this link in their dashboard (or when you edit it here), it automatically displays in the student scoresheet.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsStudentModalOpen(false)} disabled={isSubmittingStudent}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingStudent}>
              Save Student Project
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};
