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
import { Program, Batch, ProgramCurriculum, CurriculumTopicItem, TopicProgressUpdatePayload } from '../types';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Sparkles,
  Calendar,
  UserCheck,
  FileText,
  ChevronRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { formatLocalTime } from '../lib/dateUtils';

export const MentorCurriculumPage: React.FC = () => {
  const { addToast } = useNotifications();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const [curriculum, setCurriculum] = useState<ProgramCurriculum | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Assessment & Completion Modal State
  const [selectedTopic, setSelectedTopic] = useState<CurriculumTopicItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isCompletedStatus, setIsCompletedStatus] = useState<boolean>(true);
  const [assessmentName, setAssessmentName] = useState<string>('');
  const [assessmentNotes, setAssessmentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initial data loading
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [programsRes, batchesRes] = await Promise.all([
          api.get<Program[]>('/programs'),
          api.get<Batch[]>('/batches'),
        ]);

        setPrograms(programsRes || []);
        setBatches(batchesRes || []);

        if (programsRes && programsRes.length > 0) {
          setSelectedProgramId(programsRes[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize curriculum portal.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch curriculum whenever program or batch changes
  const fetchCurriculum = async (progId: string, bId: string) => {
    if (!progId) return;
    try {
      setIsCurriculumLoading(true);
      const url = bId && bId !== 'ALL'
        ? `/curriculum/programs/${progId}?batch_id=${bId}`
        : `/curriculum/programs/${progId}`;
      const data = await api.get<ProgramCurriculum>(url);
      setCurriculum(data);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Curriculum Load Error',
        message: err.message || 'Failed to load course curriculum.',
      });
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProgramId) {
      fetchCurriculum(selectedProgramId, selectedBatchId);
    }
  }, [selectedProgramId, selectedBatchId]);

  // Filter batches matching current program
  const availableBatches = batches.filter(
    (b) => !b.program_id || b.program_id === selectedProgramId
  );

  useEffect(() => {
    if (availableBatches.length > 0) {
      const exists = availableBatches.some((b) => b.id === selectedBatchId);
      if (!exists) {
        setSelectedBatchId(availableBatches[0].id);
      }
    } else {
      setSelectedBatchId('');
    }
  }, [selectedProgramId, batches, selectedBatchId]);

  const handleOpenUpdateModal = (topic: CurriculumTopicItem) => {
    setSelectedTopic(topic);
    setIsCompletedStatus(topic.is_completed ? true : true);
    setAssessmentName(topic.assessment_name || '');
    setAssessmentNotes(topic.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;

    try {
      setIsSubmitting(true);
      const payload: TopicProgressUpdatePayload = {
        is_completed: isCompletedStatus,
        batch_id: selectedBatchId && selectedBatchId !== 'ALL' ? selectedBatchId : null,
        assessment_name: assessmentName.trim() || (isCompletedStatus ? 'Topic Assessment' : undefined),
        notes: assessmentNotes.trim() || undefined,
      };

      await api.put(`/curriculum/topics/${selectedTopic.id}/progress`, payload);

      addToast({
        type: 'success',
        title: 'Curriculum Updated',
        message: `Topic "${selectedTopic.title}" marked as ${isCompletedStatus ? 'Completed' : 'Pending'}. Student and HR portals updated in real time.`,
      });

      setIsModalOpen(false);
      // Refresh current curriculum
      await fetchCurriculum(selectedProgramId, selectedBatchId);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update topic completion progress.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group topics by module
  const topicsByModule = (curriculum?.topics || []).reduce((acc, topic) => {
    const mod = topic.module_name || 'General Modules';
    if (!acc[mod]) {
      acc[mod] = [];
    }
    acc[mod].push(topic);
    return acc;
  }, {} as Record<string, CurriculumTopicItem[]>);

  if (isLoading) {
    return (
      <Layout>
        <Loading fullScreen message="Loading courses and curriculum records..." />
      </Layout>
    );
  }

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const completedTopicsCount = curriculum?.completed_topics || 0;
  const totalTopicsCount = curriculum?.total_topics || 0;
  const completionPercentage = curriculum?.completion_percentage || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                Mentor Course Control
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Curriculum & Course Progression
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl font-medium">
              Review course syllabi, verify student assessments, and mark topics completed. Updates reflect instantly across both Student and HR management portals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Program Dropdown */}
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Select Course (Program)
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => {
                  setSelectedProgramId(e.target.value);
                  setSelectedBatchId('');
                }}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Dropdown */}
            <div className="flex flex-col">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Filter by Batch
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={availableBatches.length === 0}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {availableBatches.length === 0 ? (
                  <option value="" disabled>No Batches Available</option>
                ) : (
                  availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {curriculum && !curriculum.is_published && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Curriculum Draft Status (Unpublished by HR):</span>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  This curriculum is currently in draft mode. Registered students cannot view these topics until HR publishes it.
                </p>
              </div>
            </div>
            <Badge variant="warning" className="text-xs shrink-0">
              Draft
            </Badge>
          </div>
        )}

        {/* Progress Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Overall Completion
                </p>
                <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {completionPercentage}%
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, completionPercentage)}%` }}
              />
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Topics Completed
                </p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {completedTopicsCount} <span className="text-xs text-slate-400 font-semibold">/ {totalTopicsCount}</span>
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
              {totalTopicsCount - completedTopicsCount} topics remaining
            </p>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Modules Count
                </p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {Object.keys(topicsByModule).length}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
              Curriculum syllabus units
            </p>
          </Card>

          <Card className="p-4 border-l-4 border-l-sky-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Course Program
                </p>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate max-w-[170px]" title={selectedProgram?.title}>
                  {selectedProgram?.title || 'Program'}
                </h3>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-mono font-bold">
              {selectedProgram?.code || 'ACTIVE'}
            </p>
          </Card>
        </div>

        {/* Course Modules Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Course Modules & Assessment Units
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {curriculum?.topics?.length || 0} Syllabus Topics Listed
            </span>
          </div>

          {isCurriculumLoading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loading message="Updating curriculum data..." />
            </div>
          ) : Object.keys(topicsByModule).length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No syllabus topics configured for this program.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(topicsByModule).map(([moduleName, moduleTopics], modIdx) => {
                const modCompleted = moduleTopics.filter((t) => t.is_completed).length;
                const modTotal = moduleTopics.length;
                const modPct = Math.round((modCompleted / modTotal) * 100);

                return (
                  <div
                    key={moduleName}
                    className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                  >
                    {/* Module Header */}
                    <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                            Module {modIdx + 1}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {moduleName}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                          {modCompleted} of {modTotal} topics completed ({modPct}%)
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-28 sm:w-36 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all"
                            style={{ width: `${modPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
                          {modPct}%
                        </span>
                      </div>
                    </div>

                    {/* Topics List */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {moduleTopics.map((topic, tIdx) => (
                        <div
                          key={topic.id}
                          className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5 flex-1 min-w-0">
                            <span
                              className={`mt-0.5 p-1.5 rounded-xl shrink-0 ${
                                topic.is_completed
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {topic.is_completed ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <Clock className="w-5 h-5" />
                              )}
                            </span>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {topic.title}
                                </h4>
                                <Badge
                                  variant={topic.is_completed ? 'success' : 'neutral'}
                                  className="text-[10px] font-bold uppercase tracking-wider"
                                >
                                  {topic.is_completed ? 'Completed' : 'Pending'}
                                </Badge>
                              </div>

                              {topic.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-medium">
                                  {topic.description}
                                </p>
                              )}

                              {/* Assessment metadata if completed */}
                              {topic.is_completed && (
                                <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                                  {topic.assessment_name && (
                                    <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/40">
                                      <Award className="w-3.5 h-3.5" />
                                      {topic.assessment_name}
                                    </span>
                                  )}
                                  {topic.completed_at && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      {formatLocalTime(topic.completed_at)}
                                    </span>
                                  )}
                                  {topic.completed_by_name && (
                                    <span className="flex items-center gap-1">
                                      <UserCheck className="w-3 h-3 text-slate-400" />
                                      Mentor: {topic.completed_by_name}
                                    </span>
                                  )}
                                </div>
                              )}

                              {topic.is_completed && topic.notes && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 mt-1.5">
                                  "{topic.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                            <Button
                              variant={topic.is_completed ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => handleOpenUpdateModal(topic)}
                              className="text-xs font-bold"
                            >
                              <Award className="w-3.5 h-3.5 mr-1.5" />
                              {topic.is_completed ? 'Update Assessment' : 'Mark as Completed'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Assessment & Topic Completion Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => !isSubmitting && setIsModalOpen(false)}
          title="Update Topic Progress & Assessment"
        >
          {selectedTopic && (
            <form onSubmit={handleSaveProgress} className="space-y-4 text-xs font-sans">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                  {selectedTopic.module_name}
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedTopic.title}
                </h4>
                {selectedTopic.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedTopic.description}
                  </p>
                )}
              </div>

              {/* Status Toggle */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Completion Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <input
                      type="radio"
                      name="status"
                      checked={isCompletedStatus}
                      onChange={() => setIsCompletedStatus(true)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Topic Completed
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <input
                      type="radio"
                      name="status"
                      checked={!isCompletedStatus}
                      onChange={() => setIsCompletedStatus(false)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      In Progress / Pending
                    </span>
                  </label>
                </div>
              </div>

              {/* Assessment Title */}
              {isCompletedStatus && (
                <>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Assessment Title / Evaluation Tag
                    </label>
                    <input
                      type="text"
                      value={assessmentName}
                      onChange={(e) => setAssessmentName(e.target.value)}
                      placeholder="e.g., Sprint 1 Hands-on Assessment, Module Quiz, Lab Eval"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      This assessment milestone will be displayed on student and HR portals.
                    </p>
                  </div>

                  {/* Notes / Remarks */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">
                      Assessment Remarks & Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={assessmentNotes}
                      onChange={(e) => setAssessmentNotes(e.target.value)}
                      placeholder="e.g. Conducted technical assessment; students successfully implemented required specifications."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {/* Target Scope notice */}
              <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-300 text-[11px]">
                Target Cohort:{' '}
                <strong>
                  {selectedBatchId && selectedBatchId !== 'ALL'
                    ? `Batch Specific (${batches.find((b) => b.id === selectedBatchId)?.name || selectedBatchId})`
                    : `Course Standard (${selectedProgram?.title})`}
                </strong>
                . Updates reflect automatically on student progress meters and HR dashboards.
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  className="font-bold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Save & Update Progress
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
};
