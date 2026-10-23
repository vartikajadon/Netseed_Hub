import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import { StudentCurriculumSkillItem, StudentCurriculumSkillsResponse } from '../types';
import {
  Sparkles,
  Award,
  CheckCircle2,
  Lock,
  Unlock,
  BookOpen,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  RefreshCw,
  Layers,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentSkillsPage: React.FC = () => {
  const [data, setData] = useState<StudentCurriculumSkillsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'ENTRY_LEVEL' | 'MIDDLE_LEVEL' | 'EXIT_LEVEL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSkills = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get<StudentCurriculumSkillsResponse>('/assessments/student-curriculum-skills');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load curriculum skills.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const filteredSkills = useMemo(() => {
    if (!data?.skills) return [];
    return data.skills.filter((skill) => {
      if (statusFilter === 'UNLOCKED' && !skill.is_unlocked) return false;
      if (statusFilter === 'LOCKED' && skill.is_unlocked) return false;
      if (levelFilter !== 'ALL' && skill.level !== levelFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = skill.skill_name.toLowerCase().includes(q);
        const matchModule = skill.module_name.toLowerCase().includes(q);
        const matchAssess = (skill.assessment_title || '').toLowerCase().includes(q);
        return matchTitle || matchModule || matchAssess;
      }
      return true;
    });
  }, [data, statusFilter, levelFilter, searchQuery]);

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
        {/* Hero Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold tracking-wide text-xs uppercase">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Curriculum-Aligned Technical Skills & Credentials</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {data?.program_title || 'Enrolled Curriculum'} Skills
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Skills are earned as you advance through each concept level in your curriculum.
              Each skill credential is unlocked upon successfully passing the corresponding topic assessment evaluated by your mentor.
            </p>
            {data?.batch_name && (
              <div className="flex items-center gap-2 pt-1 text-xs text-indigo-300 font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-900/50 border border-indigo-700/50">
                  Batch: {data.batch_name}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-900/50 border border-indigo-700/50">
                  Trainee: {data.student_name} ({data.student_roll_no})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 self-start md:self-auto shrink-0 relative z-10">
            <Button
              size="sm"
              variant="secondary"
              onClick={fetchSkills}
              isLoading={isLoading}
              className="gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
            <Link to="/student/assessments">
              <Button size="sm" variant="primary" className="gap-1.5 text-xs font-bold shadow-md shadow-indigo-600/30">
                <Award className="w-3.5 h-3.5" />
                <span>View Assessments</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading & Error States */}
        {isLoading && <Loading message="Loading your curriculum skills and assessment unlock status..." />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && data && (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Curriculum Skills */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Curriculum Skills</span>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                  {data.total_skills}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Configured across all concept levels
                </div>
              </div>

              {/* Card 2: Unlocked Skills */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Unlocked / Earned</span>
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {data.unlocked_skills}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Verified through passed assessments
                </div>
              </div>

              {/* Card 3: Locked Skills */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">In Progress / Locked</span>
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-slate-300">
                  {data.locked_skills}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Pending upcoming assessments
                </div>
              </div>

              {/* Card 4: Overall Mastery Percentage */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                  <span className="text-xs font-bold uppercase tracking-wider">Mastery Completion</span>
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
                  {data.completion_percentage}%
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, data.completion_percentage)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by skill name, topic, or assessment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status and Level Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Toggle */}
                <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    All ({data.total_skills})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('UNLOCKED')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'UNLOCKED'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Unlocked ({data.unlocked_skills})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('LOCKED')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'LOCKED'
                        ? 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Locked ({data.locked_skills})
                  </button>
                </div>

                {/* Level Dropdown Filter */}
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Concept Levels</option>
                  <option value="ENTRY_LEVEL">Beginner (Entry Level)</option>
                  <option value="MIDDLE_LEVEL">Intermediate (Middle Level)</option>
                  <option value="EXIT_LEVEL">Advanced (Exit Level)</option>
                </select>
              </div>
            </div>

            {/* Skills Grid */}
            {filteredSkills.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  No skills matching your filter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Try clearing the search query or changing the status and concept level filters above.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setLevelFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs"
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSkills.map((skill) => {
                  const isUnlocked = skill.is_unlocked;
                  const levelBadgeVariant =
                    skill.level === 'EXIT_LEVEL'
                      ? 'neutral'
                      : skill.level === 'MIDDLE_LEVEL'
                      ? 'info'
                      : 'success';

                  return (
                    <div
                      key={skill.id}
                      className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                        isUnlocked
                          ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800/80'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="p-5 pb-3 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                            {skill.module_name}
                          </span>
                          <Badge variant={levelBadgeVariant}>
                            {skill.level_label}
                          </Badge>
                        </div>

                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                          {skill.skill_name}
                        </h3>

                        {skill.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal line-clamp-2">
                            {skill.description}
                          </p>
                        )}
                      </div>

                      {/* Unlock Status Body */}
                      <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-2.5">
                        {isUnlocked ? (
                          <>
                            {/* UNLOCKED BADGE */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] border border-emerald-300 dark:border-emerald-700/60">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>UNLOCKED & VERIFIED</span>
                              </span>
                              {skill.score_percentage !== null && skill.score_percentage !== undefined && (
                                <span className="font-extrabold text-xs text-emerald-700 dark:text-emerald-300">
                                  {skill.marks_obtained}/{skill.total_marks} ({skill.score_percentage}%)
                                </span>
                              )}
                            </div>

                            {/* Assessment Credential Info */}
                            <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                              <div className="flex items-center justify-between">
                                <span>Passed Test:</span>
                                <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[160px]">
                                  {skill.assessment_title || 'Topic Assessment'}
                                </span>
                              </div>
                              {skill.unlocked_by_name && (
                                <div className="flex items-center justify-between">
                                  <span>Evaluated by:</span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                                    {skill.unlocked_by_name}
                                  </span>
                                </div>
                              )}
                              {skill.unlocked_at && (
                                <div className="flex items-center justify-between">
                                  <span>Unlocked date:</span>
                                  <span className="font-medium text-slate-500">
                                    {new Date(skill.unlocked_at).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {/* LOCKED BADGE */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] border border-slate-300 dark:border-slate-700">
                                <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>LOCKED (Pending Assessment)</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Min Pass: {skill.passing_marks || 40}%
                              </span>
                            </div>

                            {/* Requirement description */}
                            <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                              <div className="font-medium">
                                Pass <strong className="text-slate-800 dark:text-slate-200">{skill.assessment_title || `${skill.level_label} Assessment`}</strong> evaluated by your mentor to unlock this skill.
                              </div>
                            </div>

                            <Link
                              to="/student/assessments"
                              className="inline-flex items-center justify-between w-full text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold text-xs pt-1 transition-colors"
                            >
                              <span>Go to Assessments</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
