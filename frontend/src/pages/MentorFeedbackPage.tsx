import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { MentorFeedbackModal } from '../components/MentorFeedbackModal';
import { api } from '../api/client';
import { Student, MentorFeedbackItem, PaginatedStudentList } from '../types';
import {
  MessageSquare, PlusCircle, Star, Filter, Calendar,
  User, RefreshCw, Award, CheckCircle2
} from 'lucide-react';

export const MentorFeedbackPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [feedbacks, setFeedbacks] = useState<MentorFeedbackItem[]>([]);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchData();
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Trainee Feedback Management
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Submit ratings, qualitative reviews, and track performance history for your assigned trainees.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchData}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              Give Feedback
            </Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

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
                      Professionalism
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

                {/* Comment Box */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  <div className="font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                    Mentor Remarks:
                  </div>
                  {fb.comment}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Give Feedback Modal */}
        <MentorFeedbackModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          students={students}
          preselectedStudentId={preselectedStudentId}
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      </div>
    </Layout>
  );
};
