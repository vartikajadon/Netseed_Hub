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
import { Batch, Assessment, AssessmentLevel, AssessmentCreatePayload } from '../types';
import {
  ClipboardList, Plus, FileText, Calendar, Clock, Lock, Unlock,
  UploadCloud, Trash2, Edit3, ExternalLink, Download, AlertCircle,
  Eye, CheckCircle2, ArrowRight, Layers, Award, Sparkles, Filter, Search
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const LEVEL_CONFIG: Record<AssessmentLevel, {
  label: string;
  badgeVariant: 'success' | 'info' | 'neutral';
  description: string;
  timing: string;
  colorClass: string;
}> = {
  ENTRY_LEVEL: {
    label: 'Entry Level',
    badgeVariant: 'success',
    description: 'First week baseline test evaluating prerequisite skills & fundamentals.',
    timing: 'First week of training',
    colorClass: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
  },
  MIDDLE_LEVEL: {
    label: 'Middle Level',
    badgeVariant: 'info',
    description: 'Mid-term milestone assessment measuring core technical progression.',
    timing: 'Half of training period',
    colorClass: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400',
  },
  EXIT_LEVEL: {
    label: 'Exit Level',
    badgeVariant: 'neutral',
    description: 'Final comprehensive exam & capstone test prior to graduation/placement.',
    timing: 'End of training',
    colorClass: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-400',
  },
};


export const MentorAssessments: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('ALL');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<AssessmentLevel>('ENTRY_LEVEL');
  const [batchId, setBatchId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [totalMarks, setTotalMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number>(40);
  const [paperContent, setPaperContent] = useState('');
  const [paperFileName, setPaperFileName] = useState('');
  const [paperFileUrl, setPaperFileUrl] = useState('');
  const [skillUnlocked, setSkillUnlocked] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview paper modal
  const [previewPaper, setPreviewPaper] = useState<Assessment | null>(null);

  // Delete modal
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [batchData, assessData] = await Promise.all([
        api.get<Batch[]>('/batches'),
        api.get<Assessment[]>('/assessments'),
      ]);
      const allBatches = batchData || [];
      setBatches(allBatches);
      setAssessments(assessData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingAssessment(null);
    setTitle('');
    setDescription('');
    setLevel('ENTRY_LEVEL');
    setBatchId(batches[0]?.id || '');
    // Default to tomorrow 10:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setScheduledDate(tomorrow.toISOString().slice(0, 16));
    setDurationMinutes(60);
    setTotalMarks(100);
    setPassingMarks(40);
    setPaperContent('');
    setPaperFileName('');
    setPaperFileUrl('');
    setSkillUnlocked('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (a: Assessment) => {
    setEditingAssessment(a);
    setTitle(a.title);
    setDescription(a.description || '');
    setLevel(a.level);
    setBatchId(a.batch_id);
    const d = new Date(a.scheduled_date);
    // local ISO format YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setScheduledDate(localISOTime);
    setDurationMinutes(a.duration_minutes || 60);
    setTotalMarks(a.total_marks || 100);
    setPassingMarks(a.passing_marks || 40);
    setPaperContent(a.paper_content || '');
    setPaperFileName(a.paper_file_name || '');
    setPaperFileUrl(a.paper_file_url || '');
    setSkillUnlocked(a.skill_unlocked || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setFormError('File size exceeds 10MB limit.');
      return;
    }

    setPaperFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPaperFileUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Please enter an assessment title.');
      return;
    }
    if (!batchId) {
      setFormError('Please select a target batch.');
      return;
    }
    if (!scheduledDate) {
      setFormError('Please select a scheduled date and time.');
      return;
    }
    if (durationMinutes < 1) {
      setFormError('Duration must be at least 1 minute.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: AssessmentCreatePayload = {
        title: title.trim(),
        description: description.trim() || undefined,
        level,
        batch_id: batchId,
        scheduled_date: new Date(scheduledDate).toISOString(),
        duration_minutes: Number(durationMinutes),
        total_marks: Number(totalMarks),
        passing_marks: Number(passingMarks),
        paper_content: paperContent.trim() || undefined,
        paper_file_name: paperFileName || undefined,
        paper_file_url: paperFileUrl || undefined,
        skill_unlocked: skillUnlocked.trim() || undefined,
      };

      if (editingAssessment) {
        await api.put(`/assessments/${editingAssessment.id}`, payload);
        addToast({
          type: 'success',
          title: 'Assessment Updated',
          message: `Successfully updated ${title}.`,
        });
      } else {
        await api.post('/assessments', payload);
        addToast({
          type: 'success',
          title: 'Assessment Created',
          message: `Scheduled ${LEVEL_CONFIG[level].label} for batch successfully.`,
        });
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async (a: Assessment) => {
    const newLockState = !a.is_unlocked;
    try {
      await api.put(`/assessments/${a.id}/toggle-lock`, { is_unlocked: newLockState });
      addToast({
        type: newLockState ? 'success' : 'info',
        title: newLockState ? 'Assessment Unlocked!' : 'Assessment Locked',
        message: newLockState
          ? `Students in ${a.batch_name || 'batch'} can now access the paper and submit their work.`
          : `Assessment paper is now locked for students.`,
      });
      setAssessments((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, is_unlocked: newLockState } : item))
      );
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lock Toggle Failed',
        message: err.message || 'Could not change lock state.',
      });
    }
  };

  const handleDelete = async () => {
    if (!assessmentToDelete) return;
    try {
      await api.delete(`/assessments/${assessmentToDelete.id}`);
      addToast({
        type: 'success',
        title: 'Assessment Deleted',
        message: `Removed ${assessmentToDelete.title}.`,
      });
      setAssessments((prev) => prev.filter((item) => item.id !== assessmentToDelete.id));
      setAssessmentToDelete(null);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete assessment.',
      });
    }
  };

  // Filtered List
  const filteredAssessments = assessments.filter((a) => {
    if (selectedBatchFilter !== 'ALL' && a.batch_id !== selectedBatchFilter) return false;
    if (selectedLevelFilter !== 'ALL' && a.level !== selectedLevelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchBatch = (a.batch_name || '').toLowerCase().includes(q);
      return matchTitle || matchBatch;
    }
    return true;
  });

  const entryCount = assessments.filter((a) => a.level === 'ENTRY_LEVEL').length;
  const middleCount = assessments.filter((a) => a.level === 'MIDDLE_LEVEL').length;
  const exitCount = assessments.filter((a) => a.level === 'EXIT_LEVEL').length;
  const liveCount = assessments.filter((a) => a.is_unlocked).length;

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-900 dark:via-indigo-950/80 dark:to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-indigo-900/40">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold tracking-wide text-xs uppercase">
              <ClipboardList className="w-4 h-4" />
              <span>Mentor Lifecycle Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Assessment Management
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Design, import question papers, set time limits, and govern tests across the 3 training phases:
              <span className="font-semibold text-emerald-400"> Entry Level</span> (Week 1),
              <span className="font-semibold text-blue-400"> Middle Level</span> (Mid-way), and
              <span className="font-semibold text-purple-400"> Exit Level</span> (Graduation).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={openCreateModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule / Import Paper</span>
            </Button>
            <Link to="/mentor/assessment-evaluation">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 flex items-center gap-2"
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>Assessment Evaluation</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Phases Explanatory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['ENTRY_LEVEL', 'MIDDLE_LEVEL', 'EXIT_LEVEL'] as AssessmentLevel[]).map((lvl) => {
            const conf = LEVEL_CONFIG[lvl];
            const count =
              lvl === 'ENTRY_LEVEL' ? entryCount : lvl === 'MIDDLE_LEVEL' ? middleCount : exitCount;
            const isSelected = selectedLevelFilter === lvl;

            return (
              <div
                key={lvl}
                onClick={() => setSelectedLevelFilter(isSelected ? 'ALL' : lvl)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 shadow-md bg-white dark:bg-slate-900 border-indigo-500/50'
                    : 'bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={conf.badgeVariant}>
                    {conf.label}
                  </Badge>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">

                    {count} {count === 1 ? 'Paper' : 'Papers'}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{conf.timing}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                  {conf.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Batch Filter */}
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="py-2 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Level Filter */}
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="py-2 px-3 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Assessment Levels</option>
              <option value="ENTRY_LEVEL">Entry Level (Week 1)</option>
              <option value="MIDDLE_LEVEL">Middle Level (Mid-point)</option>
              <option value="EXIT_LEVEL">Exit Level (Graduation)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-900 dark:text-slate-100">{filteredAssessments.length}</strong> of{' '}
              {assessments.length}
            </span>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">
                <Unlock className="w-3 h-3" /> {liveCount} Live
              </span>
            )}
          </div>
        </div>

        {/* Assessments List / Cards */}
        {isLoading ? (
          <div className="py-16">
            <Loading message="Loading mentor assessments..." />
          </div>
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchData} />
        ) : filteredAssessments.length === 0 ? (

          <Card className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
              No Assessments Found
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              {searchQuery || selectedBatchFilter !== 'ALL' || selectedLevelFilter !== 'ALL'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Get started by creating and scheduling an Entry, Middle, or Exit level assessment paper for your batch.'}
            </p>
            <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Schedule First Assessment
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAssessments.map((a) => {
              const conf = LEVEL_CONFIG[a.level] || LEVEL_CONFIG.ENTRY_LEVEL;
              const sched = new Date(a.scheduled_date);
              const formattedDate = sched.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const formattedTime = sched.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={a.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Top Bar with Level & Status */}
                  <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge variant={conf.badgeVariant}>
                        {conf.label}
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">

                        {a.batch_name || 'All Students'}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-1.5 line-clamp-1">
                      {a.title}
                    </h3>
                    {a.description ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No instructions specified.</p>
                    )}
                  </div>

                  {/* Assessment Metadata */}
                  <div className="p-5 py-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Scheduled Date:</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {formattedDate} at {formattedTime}
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
                        {a.total_marks} Marks (Pass: {a.passing_marks})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span>Question Paper:</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200">
                        {a.paper_file_name ? (
                          <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            {a.paper_file_name.slice(0, 15)}...
                          </span>
                        ) : a.paper_content ? (
                          'Imported Text'
                        ) : (
                          'Not Set'
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Unlocks Skill:</span>
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[170px]" title={a.skill_unlocked || 'None set'}>
                        {a.skill_unlocked ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/60 text-[11px]">
                            {a.skill_unlocked}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-normal text-[11px]">None configured</span>
                        )}
                      </span>
                    </div>

                    {/* Prominent Lock / Unlock Controller */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleToggleLock(a)}
                        className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                          a.is_unlocked
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/70 dark:hover:bg-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {a.is_unlocked ? (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>UNLOCKED (Test Live for Students)</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>LOCKED (Click to Unlock for Students)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewPaper(a)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/50"
                        title="View Paper Content"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(a)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/50"
                        title="Edit Paper & Duration"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssessmentToDelete(a)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/50"
                        title="Delete Assessment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <Link
                      to={`/mentor/assessment-evaluation?assessmentId=${a.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                      <span>Submissions ({a.submission_count})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CREATE / EDIT ASSESSMENT MODAL */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAssessment ? 'Edit Assessment Paper' : 'Schedule Assessment & Import Paper'}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveAssessment} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Assessment Level Selector with informative badges */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Assessment Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['ENTRY_LEVEL', 'MIDDLE_LEVEL', 'EXIT_LEVEL'] as AssessmentLevel[]).map((lvl) => {
                  const conf = LEVEL_CONFIG[lvl];
                  const isSelected = level === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/50'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        <span>{conf.label}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                        {conf.timing}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Batch */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Target Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.batch_type || 'Tech Master'})
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Assessment Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Week 1 Baseline: Full Stack Programming & Cloud Setup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Skill Unlocked Upon Passing */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Skill Credential Unlocked <span className="text-slate-400 font-normal lowercase">(awarded upon passing)</span>
                </label>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Curriculum Aligned</span>
              </div>
              <input
                type="text"
                placeholder="e.g., Python Beginner: Syntax & Fundamentals"
                value={skillUnlocked}
                onChange={(e) => setSkillUnlocked(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {[
                  level === 'ENTRY_LEVEL' ? 'Python Beginner: Syntax & Fundamentals' : level === 'MIDDLE_LEVEL' ? 'Python Intermediate: OOP & Data Structures' : 'Python Advanced: Frameworks & APIs',
                  level === 'ENTRY_LEVEL' ? 'Web Programming Basics (Beginner)' : level === 'MIDDLE_LEVEL' ? 'FastAPI Microservices (Intermediate)' : 'Cloud DevOps & CI/CD (Advanced)',
                  'Database Engineering & SQL'
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setSkillUnlocked(sug)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-medium transition-colors cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Instructions / Description */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Instructions & Scope
              </label>
              <textarea
                rows={2}
                placeholder="Brief instructions, topics covered, rules, or submission expectations..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Scheduled Date & Time Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Notice: Assessment automatically appears to students 1 week prior to this date.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Time Duration (Minutes) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {[30, 60, 90, 120, 180].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`text-xs px-2 py-0.5 rounded-md border font-medium transition-all ${
                        durationMinutes === mins
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Total Marks & Passing Marks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Total Marks
                </label>
                <input
                  type="number"
                  min="1"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Passing Marks
                </label>
                <input
                  type="number"
                  min="1"
                  value={passingMarks}
                  onChange={(e) => setPassingMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Import / Upload Paper Section */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  <span>Import Question Paper</span>
                </span>
                <span className="text-[11px] text-slate-500">PDF, DOC, or Write Questions</span>
              </div>

              {/* Upload File Input */}
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer hover:bg-indigo-50/50">
                  <UploadCloud className="w-4 h-4" />
                  <span>{paperFileName ? paperFileName : 'Upload Question Paper File'}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.zip"
                    onChange={handleFileUpload}
                  />
                </label>
                {paperFileName && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaperFileName('');
                      setPaperFileUrl('');
                    }}
                    className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50"
                    title="Remove File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Direct Text / Question Editor */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Or Paste Question Paper Content / Questions:
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste assessment questions, markdown instructions, coding prompts..."
                  value={paperContent}
                  onChange={(e) => setPaperContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
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
                    <span>Saving...</span>
                  </span>
                ) : editingAssessment ? (

                  'Update Assessment'
                ) : (
                  'Create Assessment'
                )}
              </Button>
            </div>
          </form>
        </Modal>

        {/* PREVIEW PAPER MODAL */}
        <Modal
          isOpen={!!previewPaper}
          onClose={() => setPreviewPaper(null)}
          title={`Question Paper: ${previewPaper?.title || ''}`}
          maxWidth="max-w-2xl"
        >
          {previewPaper && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <Badge variant={LEVEL_CONFIG[previewPaper.level]?.badgeVariant || 'neutral'}>
                  {LEVEL_CONFIG[previewPaper.level]?.label}
                </Badge>
                <span className="text-xs text-slate-500">

                  Duration: {previewPaper.duration_minutes}m | Total Marks: {previewPaper.total_marks}
                </span>
              </div>

              {previewPaper.description && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                  <strong>Instructions:</strong> {previewPaper.description}
                </div>
              )}

              {previewPaper.paper_file_url && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {previewPaper.paper_file_name || 'Uploaded Question Paper'}
                    </span>
                  </div>
                  <a
                    href={previewPaper.paper_file_url}
                    download={previewPaper.paper_file_name || 'question_paper.pdf'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Paper</span>
                  </a>
                </div>
              )}

              {previewPaper.paper_content ? (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <pre className="text-xs font-mono text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                    {previewPaper.paper_content}
                  </pre>
                </div>
              ) : !previewPaper.paper_file_url ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  No question paper content or file uploaded yet. Click Edit to import questions.
                </div>
              ) : null}

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setPreviewPaper(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* DELETE CONFIRMATION MODAL */}
        <Modal
          isOpen={!!assessmentToDelete}
          onClose={() => setAssessmentToDelete(null)}
          title="Delete Assessment"
          maxWidth="max-w-md"
        >
          {assessmentToDelete && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 dark:text-slate-100">{assessmentToDelete.title}</strong>? All
                associated submissions and grading records will also be removed.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAssessmentToDelete(null)}>
                  Cancel
                </Button>
                <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white">
                  Delete Assessment
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
export default MentorAssessments;
