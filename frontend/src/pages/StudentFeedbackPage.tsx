import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { api } from '../api/client';
import { MentorFeedbackItem } from '../types';
import {
  MessageSquare, Star, Calendar, User, Award,
  Sparkles, CheckCircle2, RefreshCw
} from 'lucide-react';

export const StudentFeedbackPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<MentorFeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyFeedbacks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Backend automatically enforces isolation to student's own record
      const data = await api.get<MentorFeedbackItem[]>('/feedbacks');
      setFeedbacks(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your mentor feedback.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyFeedbacks();
  }, []);

  const overallAvg = feedbacks.length > 0
    ? (feedbacks.reduce((acc, f) => acc + Number(f.average_rating), 0) / feedbacks.length).toFixed(1)
    : 'N/A';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
              My Mentor Feedback
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Review evaluations, ratings across key competency areas, and guidance provided by your lead mentors.
            </p>
          </div>

          <button
            onClick={fetchMyFeedbacks}
            className="self-stretch sm:self-auto justify-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:border-slate-300 dark:hover:border-slate-700 flex items-center gap-1.5 transition-colors min-h-[38px]"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            Refresh
          </button>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Overall Average Rating
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {overallAvg}
                </span>
                <span className="text-xs text-slate-400 font-bold">/ 5.0</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center text-amber-500">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                Evaluations Received
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                {feedbacks.length}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Feedback List */}
        {isLoading ? (
          <Loading message="Loading feedback evaluations..." />
        ) : feedbacks.length === 0 ? (
          <Card>
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No mentor feedback received yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Your assigned mentor will provide periodic performance ratings across technical proficiency, tasks, communication, and learning attitude.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 transition-all"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        Feedback by {fb.mentor_name || 'Lead Mentor'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(fb.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Average Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-xl shadow-xs self-start sm:self-auto">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span className="font-black text-amber-700 dark:text-amber-400 text-sm font-mono">
                      {Number(fb.average_rating).toFixed(1)}
                    </span>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-bold">/ 5.0</span>
                  </div>
                </div>

                {/* 5 Categories Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">
                      Technical Skills
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
                      Task Performance
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
                      Learning Attitude
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs font-mono">
                        {fb.learning_attitude} / 5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  <div className="font-bold text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                    Mentor Comments:
                  </div>
                  {fb.comment}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
