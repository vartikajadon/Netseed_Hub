import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { MentorFeedbackModal } from '../components/MentorFeedbackModal';
import { api } from '../api/client';
import { Student, MentorFeedbackItem, PaginatedStudentList, TrainerFeedbackItem } from '../types';
import {
  MessageSquare, PlusCircle, Star, Filter, Calendar,
  User, RefreshCw, Award, CheckCircle2, Shield, Clock,
  Sparkles, MessageSquarePlus
} from 'lucide-react';

export const MentorFeedbackPage: React.FC = () => {
  // Navigation tabs: 'GIVE_FEEDBACK' (mentor evaluates trainees) or 'RECEIVED_FEEDBACK' (trainees evaluated mentor)
  const [activeTab, setActiveTab] = useState<'GIVE_FEEDBACK' | 'RECEIVED_FEEDBACK'>('GIVE_FEEDBACK');

  // Mentor evaluating students state
  const [students, setStudents] = useState<Student[]>([]);
  const [feedbacks, setFeedbacks] = useState<MentorFeedbackItem[]>([]);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student feedback received for this mentor state
  const [trainerFeedbacks, setTrainerFeedbacks] = useState<TrainerFeedbackItem[]>([]);
  const [isLoadingTrainerFeedbacks, setIsLoadingTrainerFeedbacks] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preselectedStudentId, setPreselectedStudentId] = useState<string | undefined>(undefined);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [stdRes, fbRes] = await Promise.all([
        api.get<PaginatedStudentList | Student[]>('/students'),
        api.get<MentorFeedbackItem[]>('/feedbacks'),
      ]);

      const studentList = Array.isArray(stdRes) ? stdRes : stdRes.items || [];
      setStudents(studentList);
      setFeedbacks(fbRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback records.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrainerFeedbacks = async () => {
    try {
      setIsLoadingTrainerFeedbacks(true);
      // Automatically filtered by backend for current mentor
      const data = await api.get<TrainerFeedbackItem[]>('/trainer-feedbacks');
      setTrainerFeedbacks(data || []);
    } catch (err: any) {
      console.error('Failed to load feedback from trainees:', err);
    } finally {
      setIsLoadingTrainerFeedbacks(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTrainerFeedbacks();
  }, []);

  const handleOpenModal = (studentId?: string) => {
    setPreselectedStudentId(studentId);
    setIsModalOpen(true);
  };

  const handleFeedbackSubmitted = (newFeedback: MentorFeedbackItem) => {
    setFeedbacks((prev) => [newFeedback, ...prev]);
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (selectedStudentFilter === 'ALL') return true;
    return fb.student_id === selectedStudentFilter;
  });

  // Calculate stats for feedback received
  const avgRatingReceived = trainerFeedbacks.length > 0
    ? (trainerFeedbacks.reduce((acc, curr) => acc + (curr.average_rating || 0), 0) / trainerFeedbacks.length).toFixed(1)
    : 'N/A';

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Feedback Management
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Review evaluations given to trainees and inspect performance feedback submitted by your students.
            </p>
          </div>

          {/* Tab Switcher & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl">
              <button
                onClick={() => setActiveTab('GIVE_FEEDBACK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'GIVE_FEEDBACK'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Trainee Evaluations Given ({feedbacks.length})
              </button>
              <button
                onClick={() => setActiveTab('RECEIVED_FEEDBACK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'RECEIVED_FEEDBACK'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Feedback from Students ({trainerFeedbacks.length})
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                fetchData();
                fetchTrainerFeedbacks();
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>

            {activeTab === 'GIVE_FEEDBACK' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Give Feedback
              </Button>
            )}
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {activeTab === 'GIVE_FEEDBACK' ? (
          /* TAB 1: Mentor evaluating trainees */
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter by Trainee:</span>
                <select
                  value={selectedStudentFilter}
                  onChange={(e) => setSelectedStudentFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Assigned Trainees ({students.length})</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user?.full_name || s.roll_number} ({s.roll_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing <strong className="text-indigo-600 dark:text-indigo-400">{filteredFeedbacks.length}</strong> submitted feedback entries
              </div>
            </div>

            {/* Feedback List */}
            {isLoading ? (
              <Loading message="Loading feedback history..." />
            ) : filteredFeedbacks.length === 0 ? (
              <Card>
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {selectedStudentFilter === 'ALL'
                      ? 'No feedback submitted yet'
                      : 'No feedback found for selected trainee'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Select an assigned student and submit an evaluation across technical skills, task performance, and attitude.
                  </p>
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenModal(selectedStudentFilter !== 'ALL' ? selectedStudentFilter : undefined)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Give Feedback Now
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredFeedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {fb.student_name || 'Assigned Trainee'}
                            </span>
                            {fb.student_roll_number && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 font-semibold">
                                {fb.student_roll_number}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-medium">
                            <span>Evaluated by: <strong>{fb.mentor_name || 'Lead Mentor'}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(fb.created_at).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Overall Average Rating Badge */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center gap-1.5 shadow-xs">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          <span className="font-black text-amber-700 dark:text-amber-400 text-sm font-mono">
                            {Number(fb.average_rating).toFixed(1)}
                          </span>
                          <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-bold">/ 5.0</span>
                        </div>
                      </div>
                    </div>

                    {/* 5 Categories Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                          Technical
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                            {fb.technical_skills} / 5
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                          Tasks
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                            {fb.task_performance} / 5
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                          Communication
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                            {fb.communication} / 5
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                          Punctuality
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                            {fb.punctuality_professionalism} / 5
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                          Attitude
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                            {fb.learning_attitude} / 5
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mentor Comments */}
                    {fb.comment && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                          Qualitative Remarks:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {fb.comment}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: Feedback received by this Mentor from Students */
          <div className="space-y-4">
            {/* Overview Stats Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                    My Trainer Rating
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-2xl font-black text-amber-500 font-mono">
                      {avgRatingReceived}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Average across student reviews</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-500">
                  <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                    Total Feedbacks Received
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                    {trainerFeedbacks.length}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">From enrolled cohort students</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <MessageSquarePlus className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                    Anonymous vs Named
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                      {trainerFeedbacks.filter((f) => f.is_anonymous).length} Anon
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                      {trainerFeedbacks.filter((f) => !f.is_anonymous).length} Named
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Privacy-safe constructive feedback</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Shield className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* List of Received Student Feedback */}
            {isLoadingTrainerFeedbacks ? (
              <Loading message="Loading student feedback..." />
            ) : trainerFeedbacks.length === 0 ? (
              <Card>
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <MessageSquarePlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Trainee Feedback Received Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    When trainees submit evaluations from their dashboard, their ratings and constructive comments will appear here.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {trainerFeedbacks.map((fb) => (
                  <Card key={fb.id}>
                    <div className="p-4 sm:p-5 space-y-3">
                      {/* Top Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {fb.is_anonymous ? <Shield className="w-4 h-4 text-purple-500" /> : <User className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                {fb.student_name}
                              </span>
                              {fb.is_anonymous ? (
                                <Badge variant="neutral">Anonymous</Badge>
                              ) : (
                                <Badge variant="info">Named</Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(fb.created_at)}
                            </div>
                          </div>
                        </div>

                        {/* Average Score Badge */}
                        {fb.average_rating && (
                          <div className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center gap-1.5 self-start sm:self-auto">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span className="font-black text-amber-700 dark:text-amber-400 text-xs font-mono">
                              {Number(fb.average_rating).toFixed(1)} / 5.0
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Domain Breakdown Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        {/* Technical */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Tech Knowledge</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {fb.technical_rating ? `${fb.technical_rating} / 5` : '—'}
                          </span>
                          {fb.technical_text && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                              "{fb.technical_text}"
                            </p>
                          )}
                        </div>

                        {/* Teaching */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Teaching Method</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {fb.teaching_rating ? `${fb.teaching_rating} / 5` : '—'}
                          </span>
                          {fb.teaching_text && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                              "{fb.teaching_text}"
                            </p>
                          )}
                        </div>

                        {/* Doubt Solving */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Doubt Solving</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {fb.doubt_solving_rating ? `${fb.doubt_solving_rating} / 5` : '—'}
                          </span>
                          {fb.doubt_solving_text && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                              "{fb.doubt_solving_text}"
                            </p>
                          )}
                        </div>

                        {/* Practical Guidance */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Practical Support</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {fb.practical_guidance_rating ? `${fb.practical_guidance_rating} / 5` : '—'}
                          </span>
                          {fb.practical_guidance_text && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                              "{fb.practical_guidance_text}"
                            </p>
                          )}
                        </div>

                        {/* Communication */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Communication</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {fb.communication_rating ? `${fb.communication_rating} / 5` : '—'}
                          </span>
                          {fb.communication_text && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                              "{fb.communication_text}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* General Suggestions / Overall comments */}
                      {fb.overall_feedback_text && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                            General Suggestions & Feedback:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 italic">
                            "{fb.overall_feedback_text}"
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal for Giving Feedback */}
        <MentorFeedbackModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onFeedbackSubmitted={handleFeedbackSubmitted}
          students={students}
          preselectedStudentId={preselectedStudentId}
        />
      </div>
    </Layout>
  );
};
