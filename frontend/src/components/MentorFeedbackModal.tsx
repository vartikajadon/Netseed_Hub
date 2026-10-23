import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { api } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { Student, MentorFeedbackItem, MentorFeedbackCreatePayload } from '../types';
import { Star, MessageSquare, AlertCircle, CheckCircle2, Search, User, X } from 'lucide-react';

interface MentorFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  preselectedStudentId?: string;
  onFeedbackSubmitted?: (feedback: MentorFeedbackItem) => void;
}

const CATEGORIES = [
  { key: 'technical_skills', label: 'Technical Skills', description: 'Code quality, problem solving, technical comprehension' },
  { key: 'task_performance', label: 'Task Performance', description: 'Execution accuracy, timeliness, attention to detail' },
  { key: 'communication', label: 'Communication', description: 'Clarity, updates, proactive team coordination' },
  { key: 'punctuality_professionalism', label: 'Punctuality and Professionalism', description: 'Attendance, meeting decorum, workplace conduct' },
  { key: 'learning_attitude', label: 'Learning Attitude', description: 'Receptiveness to guidance, initiative, adaptability' },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

export const MentorFeedbackModal: React.FC<MentorFeedbackModalProps> = ({
  isOpen,
  onClose,
  students,
  preselectedStudentId,
  onFeedbackSubmitted,
}) => {
  const { addToast } = useNotifications();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<CategoryKey, number>>({
    technical_skills: 5,
    task_performance: 5,
    communication: 5,
    punctuality_professionalism: 5,
    learning_attitude: 5,
  });
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsDropdownOpen(false);
      if (preselectedStudentId) {
        setSelectedStudentId(preselectedStudentId);
        const st = students.find((s) => s.id === preselectedStudentId);
        setSearchTerm(st?.user?.full_name || st?.roll_number || '');
      } else {
        setSelectedStudentId('');
        setSearchTerm('');
      }
    }
  }, [isOpen, preselectedStudentId, students]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const suggestedStudents = students.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    const name = (s.user?.full_name || '').toLowerCase();
    const roll = (s.roll_number || '').toLowerCase();
    const email = (s.user?.email || '').toLowerCase();
    return name.includes(q) || roll.includes(q) || email.includes(q);
  });

  const handleRatingChange = (category: CategoryKey, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const calculateAverage = () => {
    const sum = Object.values(ratings).reduce((acc, curr) => acc + curr, 0);
    return (sum / 5.0).toFixed(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStudentId) {
      setError('Please select a student from your assigned roster.');
      return;
    }

    if (!comment.trim() || comment.trim().length < 3) {
      setError('Please provide a constructive feedback comment (minimum 3 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: MentorFeedbackCreatePayload = {
        student_id: selectedStudentId,
        technical_skills: ratings.technical_skills,
        task_performance: ratings.task_performance,
        communication: ratings.communication,
        punctuality_professionalism: ratings.punctuality_professionalism,
        learning_attitude: ratings.learning_attitude,
        comment: comment.trim(),
      };

      const result = await api.post<MentorFeedbackItem>('/feedbacks', payload);
      addToast({
        title: 'Feedback Submitted',
        message: 'Trainee evaluation recorded successfully!',
        type: 'success',
      });
      
      // Reset form
      setComment('');
      setRatings({
        technical_skills: 5,
        task_performance: 5,
        communication: 5,
        punctuality_professionalism: 5,
        learning_attitude: 5,
      });

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(result);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit mentor feedback. Please check permissions and input.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Give Trainee Feedback"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Student Selector (Type name with auto suggestions) */}
        <div className="relative">
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center justify-between">
            <span>Trainee <span className="text-rose-500">*</span></span>
            {selectedStudent && !preselectedStudentId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentId('');
                  setSearchTerm('');
                  setIsDropdownOpen(true);
                }}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Change Trainee
              </button>
            )}
          </label>

          {selectedStudent ? (
            <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {selectedStudent.user?.full_name?.charAt(0) || selectedStudent.roll_number.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                    <span>{selectedStudent.user?.full_name || selectedStudent.roll_number}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-400">
                      {selectedStudent.roll_number}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {selectedStudent.batch?.name || selectedStudent.program?.title || 'Assigned Cohort'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Selected
                </span>
                {!preselectedStudentId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentId('');
                      setSearchTerm('');
                      setIsDropdownOpen(true);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type student name or roll number to suggest..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400 shadow-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setIsDropdownOpen(true);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {isDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {suggestedStudents.length === 0 ? (
                    <div className="p-3 text-center text-slate-400">
                      No trainee matching "{searchTerm}"
                    </div>
                  ) : (
                    suggestedStudents.slice(0, 8).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setSearchTerm(s.user?.full_name || s.roll_number);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full p-2.5 text-left hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px] group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {s.user?.full_name?.charAt(0) || s.roll_number.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {s.user?.full_name || s.roll_number}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              Roll: {s.roll_number}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          {s.batch?.name || 'Cohort'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real-time Average Rating Preview */}
        <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Star className="w-4 h-4 fill-white text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">Calculated Overall Rating</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Average of 5 evaluation categories</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {calculateAverage()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">/ 5.0</span>
          </div>
        </div>

        {/* 5 Categories Rating Section */}
        <div className="space-y-3 pt-1">
          <label className="block text-slate-800 dark:text-slate-200 font-bold">
            Performance Categories (1 = Needs Work, 5 = Excellent)
          </label>

          {CATEGORIES.map(({ key, label, description }) => {
            const currentScore = ratings[key];
            return (
              <div
                key={key}
                className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{description}</div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = val <= currentScore;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleRatingChange(key, val)}
                        disabled={isSubmitting}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                          val === currentScore
                            ? 'bg-indigo-600 text-white shadow-xs scale-105'
                            : isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                        title={`Rate ${val} / 5`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comment field */}
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Feedback Comment & Qualitative Observations <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            placeholder="Write constructive observations, strengths demonstrated, and key areas for focus..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Submit Feedback
          </Button>
        </div>
      </form>
    </Modal>
  );
};
