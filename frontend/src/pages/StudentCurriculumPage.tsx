import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import { ProgramCurriculum, CurriculumTopicItem } from '../types';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  Sparkles,
  Calendar,
  UserCheck,
  TrendingUp,
  FileCheck2,
  GraduationCap
} from 'lucide-react';
import { formatLocalTime } from '../lib/dateUtils';

export const StudentCurriculumPage: React.FC = () => {
  const [curriculum, setCurriculum] = useState<ProgramCurriculum | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurriculum = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.get<ProgramCurriculum>('/curriculum/my-curriculum');
      setCurriculum(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your course curriculum.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
  }, []);

  if (isLoading && !curriculum) {
    return (
      <Layout>
        <div className="py-24">
          <Loading message="Loading your program syllabus and progress records..." />
        </div>
      </Layout>
    );
  }

  // Group topics by module
  const topicsByModule = (curriculum?.topics || []).reduce((acc, topic) => {
    const mod = topic.module_name || 'General Modules';
    if (!acc[mod]) {
      acc[mod] = [];
    }
    acc[mod].push(topic);
    return acc;
  }, {} as Record<string, CurriculumTopicItem[]>);

  const completedCount = curriculum?.completed_topics || 0;
  const totalCount = curriculum?.total_topics || 0;
  const completionPercentage = curriculum?.completion_percentage || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/80 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                Course Syllabus & Progression
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              {curriculum?.program_title || 'Enrolled Course Curriculum'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl font-medium">
              Track your real-time academic progression across modules. When your mentor evaluates topic assessments, completed topics and assessment remarks appear here instantly.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {curriculum?.program_code && (
              <Badge variant="info" className="font-mono font-bold text-xs px-2.5 sm:px-3 py-1">
                {curriculum.program_code}
              </Badge>
            )}
            {curriculum?.batch_name && (
              <Badge variant="neutral" className="text-xs font-semibold px-2.5 sm:px-3 py-1">
                Batch: {curriculum.batch_name}
              </Badge>
            )}
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {curriculum && !curriculum.is_published ? (
          <Card className="p-8 sm:p-12 text-center bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <Clock className="w-10 sm:w-12 h-10 sm:h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-200">
              Curriculum Pending Publication
            </h3>
            <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 max-w-lg mx-auto mt-1 mb-2">
              The curriculum for <b>{curriculum.program_title}</b> is currently being prepared and reviewed by the HR academic department.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Once published by HR, all syllabus modules, topics, and assessment progress will be displayed here.
            </p>
          </Card>
        ) : (
          <>
            {/* Progress Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 sm:p-5 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Overall Progress
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {completionPercentage}%
                </h3>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 sm:h-2.5 mt-3 overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-2 sm:h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, completionPercentage)}%` }}
              />
            </div>
          </Card>

          <Card className="p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Topics Completed
                </span>
                <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {completedCount} <span className="text-sm font-semibold text-slate-400">/ {totalCount}</span>
                </h3>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
              {totalCount - completedCount > 0
                ? `${totalCount - completedCount} upcoming syllabus topics`
                : 'All syllabus topics successfully completed!'}
            </p>
          </Card>

          <Card className="p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Curriculum Modules
                </span>
                <h3 className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {Object.keys(topicsByModule).length}
                </h3>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Layers className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-medium">
              Structured learning units
            </p>
          </Card>
        </div>

        {/* Modules Breakdown */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Module Syllabus & Assessment Milestones
            </h2>
          </div>

          {Object.keys(topicsByModule).length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No syllabus topics listed for your program yet.
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

                    {/* Module Topics List */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {moduleTopics.map((topic, tIdx) => (
                        <div
                          key={topic.id}
                          className={`p-4 sm:p-5 flex items-start gap-4 transition-colors ${
                            topic.is_completed
                              ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                          }`}
                        >
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

                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-400">
                                #{topic.order_index}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {topic.title}
                              </h4>
                              <Badge
                                variant={topic.is_completed ? 'success' : 'neutral'}
                                className="text-[10px] font-bold uppercase tracking-wider"
                              >
                                {topic.is_completed ? 'Completed' : 'Upcoming'}
                              </Badge>
                            </div>

                            {topic.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {topic.description}
                              </p>
                            )}

                            {/* Assessment Details */}
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
                                    Completed on {formatLocalTime(topic.completed_at)}
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
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 mt-2">
                                <span className="font-semibold text-slate-700 dark:text-slate-200 block not-italic mb-0.5">
                                  Mentor Assessment Remarks:
                                </span>
                                "{topic.notes}"
                              </div>
                            )}
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
      </>
    )}
  </div>
</Layout>
  );
};
