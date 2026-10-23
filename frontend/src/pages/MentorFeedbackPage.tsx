import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import { TrainerFeedbackItem } from '../types';
import {
  MessageSquare, Star, Search, RefreshCw, Shield,
  Clock, User, CheckCircle2, SlidersHorizontal, MessageSquarePlus
} from 'lucide-react';

export const MentorFeedbackPage: React.FC = () => {
  const [trainerFeedbacks, setTrainerFeedbacks] = useState<TrainerFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'ALL' | '5' | '4_PLUS' | 'BELOW_4'>('ALL');
  const [privacyFilter, setPrivacyFilter] = useState<'ALL' | 'NAMED' | 'ANONYMOUS'>('ALL');

  const fetchTrainerFeedbacks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Automatically filtered by backend for the authenticated mentor
      const data = await api.get<TrainerFeedbackItem[]>('/trainer-feedbacks');
      setTrainerFeedbacks(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load feedback received from trainees.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainerFeedbacks();
  }, []);

  // Filtered feedback list
  const filteredFeedbacks = useMemo(() => {
    return trainerFeedbacks.filter((fb) => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (fb.student_name || '').toLowerCase().includes(q);
        const matchComments = (
          (fb.overall_feedback_text || '') +
          ' ' +
          (fb.technical_text || '') +
          ' ' +
          (fb.teaching_text || '') +
          ' ' +
          (fb.doubt_solving_text || '')
        ).toLowerCase().includes(q);
        if (!matchName && !matchComments) return false;
      }

      // Rating filter
      const avg = Number(fb.average_rating) || 0;
      if (ratingFilter === '5' && avg < 4.95) return false;
      if (ratingFilter === '4_PLUS' && avg < 4.0) return false;
      if (ratingFilter === 'BELOW_4' && avg >= 4.0) return false;

      // Privacy filter
      if (privacyFilter === 'NAMED' && fb.is_anonymous) return false;
      if (privacyFilter === 'ANONYMOUS' && !fb.is_anonymous) return false;

      return true;
    });
  }, [trainerFeedbacks, searchQuery, ratingFilter, privacyFilter]);

  // Statistics
  const avgRatingReceived = trainerFeedbacks.length > 0
    ? (trainerFeedbacks.reduce((acc, curr) => acc + (Number(curr.average_rating) || 0), 0) / trainerFeedbacks.length).toFixed(1)
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
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Feedback Received
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Review evaluations, ratings, and constructive reviews submitted by your trainees.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTrainerFeedbacks}
              className="text-xs"
              isLoading={isLoading}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Average Rating */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                My Overall Trainer Rating
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-2xl font-black text-amber-500 font-mono">
                  {avgRatingReceived}
                </span>
                <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Average across all trainee submissions</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-500">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
          </div>

          {/* Card 2: Total Feedbacks */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Total Feedbacks Received
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                {trainerFeedbacks.length}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Submitted by cohort students</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MessageSquarePlus className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Privacy breakdown */}
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
              <span className="text-[10px] text-slate-400 font-medium">Constructive performance reviews</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Rating Filter */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Ratings</option>
              <option value="5">5.0 Star Reviews</option>
              <option value="4_PLUS">4.0+ Stars</option>
              <option value="BELOW_4">Below 4.0</option>
            </select>

            {/* Privacy Filter */}
            <select
              value={privacyFilter}
              onChange={(e) => setPrivacyFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Privacy Modes</option>
              <option value="NAMED">Named Trainees</option>
              <option value="ANONYMOUS">Anonymous Reviews</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium self-end md:self-auto">
            Showing <strong className="text-indigo-600 dark:text-indigo-400">{filteredFeedbacks.length}</strong> of {trainerFeedbacks.length} feedbacks
          </div>
        </div>

        {/* Feedback List */}
        {isLoading ? (
          <Loading message="Loading feedback received from trainees..." />
        ) : filteredFeedbacks.length === 0 ? (
          <Card>
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <MessageSquarePlus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {trainerFeedbacks.length === 0 ? 'No Feedback Received Yet' : 'No Feedback Matches Your Filter'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {trainerFeedbacks.length === 0
                  ? 'When trainees submit evaluations from their portal, their ratings and reviews will be displayed here in real time.'
                  : 'Try clearing the search query or adjusting the filters.'}
              </p>
              {trainerFeedbacks.length > 0 && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setRatingFilter('ALL');
                      setPrivacyFilter('ALL');
                    }}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFeedbacks.map((fb) => (
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
                        General Suggestions & Trainee Feedback:
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
