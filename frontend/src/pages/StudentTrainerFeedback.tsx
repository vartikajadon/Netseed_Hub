import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { TrainerFeedbackItem, TrainerOption } from '../types';
import {
  MessageSquarePlus, Star, Send, Shield, User,
  Clock, Sparkles, MessageSquare, History
} from 'lucide-react';

interface FeedbackFieldConfig {
  key: 'technical' | 'teaching' | 'doubt_solving' | 'practical_guidance' | 'communication';
  title: string;
  description: string;
  options: { value: number; label: string }[];
}

const FEEDBACK_FIELDS: FeedbackFieldConfig[] = [
  {
    key: 'technical',
    title: 'Technical Knowledge & Expertise',
    description: 'Mastery of programming concepts, architecture, and industry tooling.',
    options: [
      { value: 1, label: '1 - Basic' },
      { value: 2, label: '2 - Adequate' },
      { value: 3, label: '3 - Proficient' },
      { value: 4, label: '4 - Advanced' },
      { value: 5, label: '5 - Expert / Master' },
    ],
  },
  {
    key: 'teaching',
    title: 'Teaching Methodology & Clarity',
    description: 'Pacing, clarity of explanations, code demonstrations, and concept breakdown.',
    options: [
      { value: 1, label: '1 - Needs Improvement' },
      { value: 2, label: '2 - Fair' },
      { value: 3, label: '3 - Good' },
      { value: 4, label: '4 - Very Good' },
      { value: 5, label: '5 - Exceptional' },
    ],
  },
  {
    key: 'doubt_solving',
    title: 'Doubt Solving & Responsiveness',
    description: 'Promptness, patience, and effectiveness in resolving technical blockers.',
    options: [
      { value: 1, label: '1 - Rarely Addressed' },
      { value: 2, label: '2 - Average' },
      { value: 3, label: '3 - Helpful' },
      { value: 4, label: '4 - Thorough & Patient' },
      { value: 5, label: '5 - Instant & Insightful' },
    ],
  },
  {
    key: 'practical_guidance',
    title: 'Practical Guidance & Project Support',
    description: 'Hands-on project mentoring, code reviews, debugging assistance, and real-world tips.',
    options: [
      { value: 1, label: '1 - Minimal' },
      { value: 2, label: '2 - Occasional' },
      { value: 3, label: '3 - Good Guidance' },
      { value: 4, label: '4 - Hands-On Support' },
      { value: 5, label: '5 - Invaluable Mentorship' },
    ],
  },
  {
    key: 'communication',
    title: 'Communication & Professionalism',
    description: 'Approachability, constructive delivery, active listening, and classroom engagement.',
    options: [
      { value: 1, label: '1 - Inconsistent' },
      { value: 2, label: '2 - Acceptable' },
      { value: 3, label: '3 - Clear & Courteous' },
      { value: 4, label: '4 - Highly Engaging' },
      { value: 5, label: '5 - Exemplary' },
    ],
  },
];

export const StudentTrainerFeedback: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotifications();

  // Active view tab: SUBMIT or HISTORY
  const [activeTab, setActiveTab] = useState<'SUBMIT' | 'HISTORY'>('SUBMIT');

  // Trainers list
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(true);

  // Form State
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [selectedTrainerName, setSelectedTrainerName] = useState<string>('');

  // Ratings (1-5 or 0 for none)
  const [ratings, setRatings] = useState<Record<string, number>>({
    technical: 0,
    teaching: 0,
    doubt_solving: 0,
    practical_guidance: 0,
    communication: 0,
  });

  // Texts for each field (optional)
  const [fieldTexts, setFieldTexts] = useState<Record<string, string>>({
    technical: '',
    teaching: '',
    doubt_solving: '',
    practical_guidance: '',
    communication: '',
  });

  // Overall text option (totally optional)
  const [overallText, setOverallText] = useState<string>('');

  // Identity preference: 'NAMED' or 'ANONYMOUS'
  const [identityMode, setIdentityMode] = useState<'NAMED' | 'ANONYMOUS'>('NAMED');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<TrainerFeedbackItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch available trainers
  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        setIsLoadingTrainers(true);
        const data = await api.get<TrainerOption[]>('/trainer-feedbacks/trainers');
        const list = data || [];
        setTrainers(list);
        if (list.length > 0) {
          setSelectedTrainerId(list[0].id);
          setSelectedTrainerName(list[0].full_name);
        }
      } catch (err: any) {
        console.error('Failed to load trainers:', err);
      } finally {
        setIsLoadingTrainers(false);
      }
    };
    fetchTrainers();
  }, []);

  // Fetch feedback history when switching to HISTORY tab
  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const data = await api.get<TrainerFeedbackItem[]>('/trainer-feedbacks');
      setHistory(data || []);
    } catch (err: any) {
      console.error('Failed to load feedback history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleRatingSelect = (fieldKey: string, val: number) => {
    setRatings((prev) => ({
      ...prev,
      [fieldKey]: prev[fieldKey] === val ? 0 : val, // toggle
    }));
  };

  const handleFieldTextChange = (fieldKey: string, text: string) => {
    setFieldTexts((prev) => ({
      ...prev,
      [fieldKey]: text,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTrainerId) {
      setError('Please select the trainer you are evaluating.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/trainer-feedbacks', {
        trainer_id: selectedTrainerId,
        technical_rating: ratings.technical || undefined,
        technical_text: fieldTexts.technical.trim() || undefined,
        teaching_rating: ratings.teaching || undefined,
        teaching_text: fieldTexts.teaching.trim() || undefined,
        doubt_solving_rating: ratings.doubt_solving || undefined,
        doubt_solving_text: fieldTexts.doubt_solving.trim() || undefined,
        practical_guidance_rating: ratings.practical_guidance || undefined,
        practical_guidance_text: fieldTexts.practical_guidance.trim() || undefined,
        communication_rating: ratings.communication || undefined,
        communication_text: fieldTexts.communication.trim() || undefined,
        overall_feedback_text: overallText.trim() || undefined,
        is_anonymous: identityMode === 'ANONYMOUS',
      });

      addToast({
        type: 'success',
        title: 'Feedback Submitted',
        message: `Your evaluation has been sent to ${selectedTrainerName}, HR, and Management${identityMode === 'ANONYMOUS' ? ' anonymously' : ''}.`,
      });

      // Reset form
      setRatings({
        technical: 0,
        teaching: 0,
        doubt_solving: 0,
        practical_guidance: 0,
        communication: 0,
      });
      setFieldTexts({
        technical: '',
        teaching: '',
        doubt_solving: '',
        practical_guidance: '',
        communication: '',
      });
      setOverallText('');
      setIdentityMode('NAMED');
      setActiveTab('HISTORY');
    } catch (err: any) {
      setError(err.message || 'Failed to submit trainer feedback.');
      addToast({
        type: 'error',
        title: 'Submission Error',
        message: err.message || 'Unable to submit your feedback.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquarePlus className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Feedback for Trainers
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
              Submit structured evaluations across key training dimensions. Sent directly to your trainer, HR, and Management.
            </p>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl">
            <button
              onClick={() => setActiveTab('SUBMIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'SUBMIT'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Submit Evaluation
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'HISTORY'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Submission History
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {activeTab === 'SUBMIT' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Trainer Selection & Identity Options */}
            <Card>
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Trainer & Identity Preferences
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Trainer */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Select Trainer / Mentor *
                    </label>
                    <select
                      value={selectedTrainerId}
                      onChange={(e) => {
                        setSelectedTrainerId(e.target.value);
                        const matched = trainers.find((t) => t.id === e.target.value);
                        if (matched) setSelectedTrainerName(matched.full_name);
                      }}
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Submission Mode: Name or Anonymous */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Identity Mode (Two Options) *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                          identityMode === 'NAMED'
                            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-indigo-600" />
                            Send with Name
                          </span>
                          <input
                            type="radio"
                            name="identityMode"
                            checked={identityMode === 'NAMED'}
                            onChange={() => setIdentityMode('NAMED')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          Visible to trainer & leadership
                        </span>
                      </label>

                      <label
                        className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                          identityMode === 'ANONYMOUS'
                            ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-purple-600" />
                            Send Anonymously
                          </span>
                          <input
                            type="radio"
                            name="identityMode"
                            checked={identityMode === 'ANONYMOUS'}
                            onChange={() => setIdentityMode('ANONYMOUS')}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          Identity masked for trainer
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Structured Feedback Fields */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Field Evaluations (Select Option, Write Text, or Both)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  All fields optional & flexible
                </span>
              </div>

              {FEEDBACK_FIELDS.map((field) => {
                const currentRating = ratings[field.key] || 0;
                const currentText = fieldTexts[field.key] || '';

                return (
                  <Card key={field.key}>
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                            {field.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {field.description}
                          </p>
                        </div>
                        {currentRating > 0 && (
                          <div className="flex items-center gap-1 text-xs font-black text-amber-500 font-mono">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {currentRating} / 5
                          </div>
                        )}
                      </div>

                      {/* Option Pills */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Select Option Rating
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {field.options.map((opt) => (
                            <button
                              type="button"
                              key={opt.value}
                              onClick={() => handleRatingSelect(field.key, opt.value)}
                              className={`p-2 rounded-xl text-left border text-[11px] font-semibold transition-all ${
                                currentRating === opt.value
                                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Written Text Option for this field */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Written Remarks for this field (Optional)
                        </div>
                        <input
                          type="text"
                          placeholder={`Add specific comments on ${field.title.toLowerCase()}...`}
                          value={currentText}
                          onChange={(e) => handleFieldTextChange(field.key, e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* General Text Option (Totally Optional) */}
            <Card>
              <div className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    General Suggestions & Overall Feedback
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                    Totally Optional
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Share open suggestions, what you liked most, areas of enhancement, or topics you want covered in future sessions.
                </p>
                <textarea
                  rows={4}
                  placeholder="Write any thoughts, appreciation, or suggestions here..."
                  value={overallText}
                  onChange={(e) => setOverallText(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </Card>

            {/* Bottom Submit Action */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Submitting as: <strong className="text-slate-800 dark:text-slate-200">{identityMode === 'ANONYMOUS' ? 'Anonymous Trainee' : (user?.full_name || 'Named')}</strong>. Sent to Trainer, HR, and Management.
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-2 px-6 shadow-sm"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Submitting Feedback...' : 'Send Feedback to Trainer & Management'}
              </Button>
            </div>
          </form>
        ) : (
          /* Submission History Tab */
          <div className="space-y-4">
            {isLoadingHistory ? (
              <div className="py-12">
                <Loading message="Loading your submitted feedback history..." />
              </div>
            ) : history.length === 0 ? (
              <Card>
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Feedback Submitted Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    You haven't submitted any trainer evaluations yet. Use the form to share constructive feedback.
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('SUBMIT')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                  >
                    Submit First Feedback
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <Card key={item.id}>
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            Trainer: {item.trainer_name}
                          </div>
                          {item.is_anonymous ? (
                            <Badge variant="neutral">
                              Anonymous
                            </Badge>
                          ) : (
                            <Badge variant="info">
                              {item.student_name || 'Named'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(item.created_at)}
                        </div>
                      </div>

                      {/* Ratings Breakdown Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Tech Knowledge</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {item.technical_rating ? `${item.technical_rating} / 5` : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Teaching Method</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {item.teaching_rating ? `${item.teaching_rating} / 5` : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Doubt Solving</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {item.doubt_solving_rating ? `${item.doubt_solving_rating} / 5` : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Practical Support</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {item.practical_guidance_rating ? `${item.practical_guidance_rating} / 5` : '—'}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Communication</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {item.communication_rating ? `${item.communication_rating} / 5` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Overall Comments if any */}
                      {item.overall_feedback_text && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                            General Suggestions:
                          </span>
                          <p className="text-slate-600 dark:text-slate-400 italic">
                            "{item.overall_feedback_text}"
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
      </div>
    </Layout>
  );
};
