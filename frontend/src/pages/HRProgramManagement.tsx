import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { ProgramFormModal } from '../components/ProgramFormModal';
import { Modal } from '../components/Modal';
import { api } from '../api/client';
import { Program, User, Batch, ProgramCurriculum } from '../types';
import { BookOpen, Plus, Search, UserCheck, Users, Calendar, Clock, Layers, Sparkles, Filter, Trash2, CheckCircle2, Award, TrendingUp } from 'lucide-react';
import { formatLocalTime } from '../lib/dateUtils';

export const HRProgramManagement: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion state
  const [deletingProgram, setDeletingProgram] = useState<Program | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Curriculum inspection modal state
  const [curriculumProgram, setCurriculumProgram] = useState<Program | null>(null);
  const [curriculumData, setCurriculumData] = useState<ProgramCurriculum | null>(null);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState(false);
  const [programBatches, setProgramBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [progData, userData] = await Promise.all([
        api.get<Program[]>('/programs'),
        api.get<User[]>('/users'),
      ]);
      setPrograms(progData);
      setMentors(userData.filter((u) => u.role === 'MENTOR'));
    } catch (err: any) {
      setError(err.message || 'Failed to load programs catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteProgram = async () => {
    if (!deletingProgram) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await api.delete(`/programs/${deletingProgram.id}`);
      setDeletingProgram(null);
      fetchData();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete program.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openCurriculumModal = async (program: Program) => {
    setCurriculumProgram(program);
    setSelectedBatchId('');
    try {
      setIsCurriculumLoading(true);
      const [curr, batchesRes] = await Promise.all([
        api.get<ProgramCurriculum>(`/curriculum/programs/${program.id}`),
        api.get<Batch[]>('/batches').catch(() => []),
      ]);
      setCurriculumData(curr);
      setProgramBatches(batchesRes.filter((b) => !b.program_id || b.program_id === program.id));
    } catch (err: any) {
      console.error('Failed to load program curriculum:', err);
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  const handleBatchFilterChange = async (batchId: string) => {
    if (!curriculumProgram) return;
    setSelectedBatchId(batchId);
    try {
      setIsCurriculumLoading(true);
      const url = batchId ? `/curriculum/programs/${curriculumProgram.id}?batch_id=${batchId}` : `/curriculum/programs/${curriculumProgram.id}`;
      const curr = await api.get<ProgramCurriculum>(url);
      setCurriculumData(curr);
    } catch (err: any) {
      console.error('Failed to load batch curriculum:', err);
    } finally {
      setIsCurriculumLoading(false);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.program_type && p.program_type.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType =
      selectedType === 'ALL' ||
      (p.program_type && p.program_type.toUpperCase() === selectedType.toUpperCase()) ||
      (selectedType === 'Short Duration' &&
        p.program_type &&
        (p.program_type.toUpperCase() === '6 MONTHS' ||
          p.program_type.toUpperCase() === 'SIX_MONTHS' ||
          p.program_type.toUpperCase() === 'SHORT DURATION' ||
          p.program_type.toUpperCase() === 'SHORT_DURATION'));

    return matchesSearch && matchesType;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Prominent Create Program Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Training Programs & Curricula
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Create, configure, and manage traineeships, bootcamps, mentor bindings, and skill requirements.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsProgramModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-md shadow-indigo-500/20 border border-indigo-400/30 px-5 py-3 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            Create New Program
          </Button>
        </div>

        {/* Search & Filter Control Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800/80 rounded-xl shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search programs by name, code, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Program Types</option>
              <option value="Tech Master">Tech Master</option>
              <option value="Short Duration">Short Duration</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        </div>

        {isLoading && <Loading message="Loading programs catalog..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && !error && (
          <div>
            {filteredPrograms.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4 shadow-xs">
                <BookOpen className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">No Programs Found</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto font-medium">
                    {searchTerm || selectedType !== 'ALL'
                      ? 'No programs matched your current search filters.'
                      : 'Get started by creating your first program with mentor assignment, capacity, dates, and required skills.'}
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setIsProgramModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 font-bold"
                >
                  <Plus className="w-4 h-4" />
                  Create New Program Now
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrograms.map((p) => {
                  const skillsList = Array.isArray(p.skills)
                    ? p.skills
                    : typeof p.skills === 'string'
                    ? p.skills.split(',').map((s) => s.trim()).filter(Boolean)
                    : [];

                  const mentorUser = mentors.find((m) => m.id === p.mentor_id) || p.mentor;

                  return (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                              {p.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="info">{p.code}</Badge>
                              {p.program_type && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200 dark:border-indigo-500/30">
                                  {p.program_type}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingProgram(p);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Program"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {p.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-medium">{p.description}</p>
                        )}

                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                          {/* Mentor */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              Program Mentor:
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {mentorUser ? mentorUser.full_name : 'Unassigned'}
                            </span>
                          </div>

                          {/* Student Capacity */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                              <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Max Capacity:
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {p.max_students ? `${p.max_students} Students` : 'Flexible'}
                            </span>
                          </div>

                          {/* Schedule Dates */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              Schedule:
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              {p.start_date || 'TBD'} ~ {p.end_date || 'TBD'}
                            </span>
                          </div>

                          {/* Duration */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-sky-500" />
                              Duration:
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{p.duration_weeks} Weeks</span>
                          </div>
                        </div>

                        {/* Skills Selection */}
                        {skillsList.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Program Skills:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {skillsList.map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Curriculum Progress Action */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openCurriculumModal(p)}
                            className="w-full text-xs font-bold justify-center hover:border-indigo-400 dark:hover:border-indigo-500"
                          >
                            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                            Curriculum & Assessment Progress
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ProgramFormModal
          isOpen={isProgramModalOpen}
          onClose={() => setIsProgramModalOpen(false)}
          onSuccess={fetchData}
          mentors={mentors}
        />

        {/* Delete Program Confirmation Modal */}
        <Modal
          isOpen={!!deletingProgram}
          onClose={() => {
            if (!isDeleting) {
              setDeletingProgram(null);
              setDeleteError(null);
            }
          }}
          title="Confirm Program Deletion"
        >
          <div className="space-y-4 text-xs font-sans">
            {deleteError && <ErrorMessage message={deleteError} />}
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the program{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                "{deletingProgram?.title}"
              </strong>{' '}
              ({deletingProgram?.code})?
            </p>
            <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 rounded-xl leading-relaxed">
              Warning: All curriculum batches will be removed, and enrolled students will be unlinked from this program.
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDeletingProgram(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteProgram}
                isLoading={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Yes, Delete Program
              </Button>
            </div>
          </div>
        </Modal>

        {/* Program Curriculum Details Modal */}
        <Modal
          isOpen={!!curriculumProgram}
          onClose={() => {
            setCurriculumProgram(null);
            setCurriculumData(null);
          }}
          title={`Curriculum Progress — ${curriculumProgram?.title || ''}`}
        >
          {curriculumProgram && (
            <div className="space-y-4 text-xs font-sans max-h-[75vh] overflow-y-auto pr-1">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{curriculumProgram.title}</span>
                    <Badge variant="info" className="font-mono text-[10px] font-bold">{curriculumProgram.code}</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Live syllabus tracking updated by assigned course mentors.
                  </p>
                </div>

                {programBatches.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Cohort:</span>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => handleBatchFilterChange(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Cohorts (Course Standard)</option>
                      {programBatches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {isCurriculumLoading ? (
                <div className="py-8 text-center"><Loading message="Loading syllabus progression..." /></div>
              ) : curriculumData ? (
                <>
                  {/* Progress Meter */}
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Course Completion Rate
                      </span>
                      <span className="font-black text-sm text-indigo-700 dark:text-indigo-300">
                        {curriculumData.completion_percentage}% ({curriculumData.completed_topics} / {curriculumData.total_topics} Topics)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${curriculumData.completion_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Modules & Topics */}
                  <div className="space-y-3">
                    {Object.entries(
                      (curriculumData.topics || []).reduce((acc, t) => {
                        const m = t.module_name || 'General Modules';
                        if (!acc[m]) acc[m] = [];
                        acc[m].push(t);
                        return acc;
                      }, {} as Record<string, typeof curriculumData.topics>)
                    ).map(([modName, modTopics], idx) => {
                      const modCompleted = modTopics.filter((t) => t.is_completed).length;
                      return (
                        <div key={modName} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                          <div className="p-3 bg-slate-100/70 dark:bg-slate-800/60 flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Module {idx + 1}: {modName}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {modCompleted} / {modTopics.length} completed
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {modTopics.map((topic) => (
                              <div key={topic.id} className="p-3 flex items-start justify-between gap-3">
                                <div className="space-y-0.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                      {topic.title}
                                    </span>
                                    <Badge variant={topic.is_completed ? 'success' : 'neutral'} className="text-[10px]">
                                      {topic.is_completed ? 'Completed' : 'Pending'}
                                    </Badge>
                                  </div>
                                  {topic.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{topic.description}</p>
                                  )}
                                  {topic.is_completed && (
                                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-1">
                                      {topic.assessment_name && (
                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                                          Assessment: {topic.assessment_name}
                                        </span>
                                      )}
                                      {topic.completed_at && (
                                        <span>Completed: {formatLocalTime(topic.completed_at)}</span>
                                      )}
                                      {topic.completed_by_name && (
                                        <span>Mentor: {topic.completed_by_name}</span>
                                      )}
                                    </div>
                                  )}
                                  {topic.is_completed && topic.notes && (
                                    <p className="text-[10px] text-slate-600 dark:text-slate-300 italic pt-0.5">
                                      "{topic.notes}"
                                    </p>
                                  )}
                                </div>
                                <div className="shrink-0 mt-0.5">
                                  {topic.is_completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="py-6 text-center text-slate-500">No curriculum topics found for this program.</div>
              )}

              <div className="pt-2 flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setCurriculumProgram(null)}>
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
