import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TrainerFeedbackItem, TrainerOption, Batch } from '../types';
import {
  MessageSquarePlus, Star, Filter, Calendar, User,
  RefreshCw, Shield, Clock, Sparkles, Building2, Layers
} from 'lucide-react';

export const HRTrainerFeedback: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [feedbacks, setFeedbacks] = useState<TrainerFeedbackItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const [selectedTrainer, setSelectedTrainer] = useState<string>('ALL');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [fbData, trainersData, batchesData] = await Promise.all([
        api.get<TrainerFeedbackItem[]>('/trainer-feedbacks'),
        api.get<TrainerOption[]>('/trainer-feedbacks/trainers').catch(() => []),
        api.get<Batch[]>('/batches').catch(() => []),
      ]);

      setFeedbacks(fbData || []);
      setTrainers(trainersData || []);
      setBatches(batchesData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load trainer feedback records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  // Filtered feedbacks
  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (selectedTrainer !== 'ALL' && fb.trainer_id !== selectedTrainer) {
      return false;
    }
    if (selectedBatch !== 'ALL' && fb.batch_id !== selectedBatch) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrainer = fb.trainer_name.toLowerCase().includes(q);
      const matchStudent = fb.student_name.toLowerCase().includes(q);
      const matchText = (fb.overall_feedback_text || '').toLowerCase().includes(q);
      if (!matchTrainer && !matchStudent && !matchText) return false;
    }
    return true;
  });

  // Analytics summary
  const totalReviews = filteredFeedbacks.length;
  const avgInstitutionalRating = totalReviews > 0
    ? (filteredFeedbacks.reduce((acc, curr) => acc + (curr.average_rating || 0), 0) / totalReviews).toFixed(1)
    : 'N/A';
  const anonymousCount = filteredFeedbacks.filter((f) => f.is_anonymous).length;
  const namedCount = totalReviews - anonymousCount;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquarePlus className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Trainer Feedback Intelligence
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Monitor student satisfaction, instructional quality, and constructive suggestions submitted for trainers across all cohorts.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Average Trainer Rating
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-500 font-mono">
                  {avgInstitutionalRating}
                </span>
                <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Across filtered evaluations</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-500">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Total Evaluations
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                {totalReviews}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">From active and completed batches</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MessageSquarePlus className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Feedback Privacy Mode
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                  {anonymousCount} Anonymous
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {namedCount} Named
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Full HR audit visibility maintained</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Trainer Filter */}
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <select
                value={selectedTrainer}
                onChange={(e) => setSelectedTrainer(e.target.value)}
                className="text-xs font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Trainers ({trainers.length})</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Filter */}
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-400" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="text-xs font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Batches ({batches.length})</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong className="text-indigo-600 dark:text-indigo-400">{filteredFeedbacks.length}</strong> evaluations
          </div>
        </div>

        {/* Feedbacks List */}
        {isLoading ? (
          <div className="py-12">
            <Loading message="Loading trainer feedback records..." />
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <Card>
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <MessageSquarePlus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Trainer Feedbacks Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No feedback submissions matched the current trainer or batch filters.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFeedbacks.map((fb) => (
              <Card key={fb.id}>
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            Trainer: {fb.trainer_name}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            By:{' '}
                            {fb.is_anonymous ? (
                              isSuperAdmin ? (
                                <span className="font-bold text-amber-600 dark:text-amber-400">
                                  {fb.student_name} <span className="text-[10px] font-normal text-slate-500">(Admin View)</span>
                                </span>
                              ) : (
                                <span className="italic text-slate-500 dark:text-slate-400">Anonymous Trainee</span>
                              )
                            ) : (
                              fb.student_name
                            )}
                          </span>
                          {fb.is_anonymous ? (
                            <Badge variant="neutral">Anonymous</Badge>
                          ) : (
                            <Badge variant="info">Named</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          {fb.batch_name && <span>Cohort: <strong>{fb.batch_name}</strong></span>}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(fb.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Average */}
                    {fb.average_rating && (
                      <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center gap-1.5 self-start sm:self-auto shadow-xs">
                        <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                        <span className="font-black text-amber-700 dark:text-amber-400 text-sm font-mono">
                          {Number(fb.average_rating).toFixed(1)} / 5.0
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 5 Domain Breakdown Grid */}
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

                    {/* Practical Support */}
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

                  {/* General Suggestions */}
                  {fb.overall_feedback_text && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                        General Suggestions & Qualitative Remarks:
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
    </Layout>
  );
};
