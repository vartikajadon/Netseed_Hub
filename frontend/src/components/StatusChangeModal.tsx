import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { api } from '../api/client';
import { Student } from '../types';
import { AlertCircle, AlertTriangle, UserMinus } from 'lucide-react';

interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: Student | null;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  student,
}) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dropoutReason, setDropoutReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setSelectedStatus(student.enrollment_status);
      setDropoutReason(student.dropout_reason || '');
    }
  }, [student]);

  const isDropout = selectedStatus === 'DROPOUT' || selectedStatus === 'DROPPED';

  const quickReasons = [
    'Switched course to another program mid-way',
    'Switched technology stack / domain',
    'Academic schedule conflict with college exams',
    'Relocation to another city / state',
    'Medical / Health reasons',
    'Financial / Fee payment constraints',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    if (isDropout && !dropoutReason.trim()) {
      setError('A mandatory reason is required when marking a student as Dropout (e.g. course switch mid-way).');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await api.patch(`/students/${student.id}/status`, {
        status: selectedStatus,
        reason: isDropout ? dropoutReason.trim() : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update enrollment status');
    } finally {
      setIsLoading(false);
    }
  };

  const statuses = [
    { label: 'ACTIVE (Participating in Traineeship)', value: 'ACTIVE' },
    { label: 'ENROLLED (Initial State)', value: 'ENROLLED' },
    { label: 'DROPOUT (Course Switched / Left Midway)', value: 'DROPOUT' },
    { label: 'ON_LEAVE (Temporary Hold)', value: 'ON_LEAVE' },
    { label: 'COMPLETED (Traineeship Finished)', value: 'COMPLETED' },
    { label: 'GRADUATED (Alumni Status)', value: 'GRADUATED' },
    { label: 'TERMINATED (Disciplinary Discharge)', value: 'TERMINATED' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Change Enrollment Status — ${student?.user?.full_name || student?.roll_number || 'Student'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
            Select Enrollment Status *
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setError(null);
            }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dropout Reason section */}
        {isDropout && (
          <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-3">
            <div className="flex items-start gap-2 text-purple-900 dark:text-purple-200">
              <UserMinus className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-xs block">HR Dropout Verification & Reason *</span>
                <p className="text-[11px] text-purple-700 dark:text-purple-300/80 mt-0.5">
                  Only HR can mark students as dropout. Explain why this trainee switched courses or discontinued mid-way.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1">
                Quick Select Common Reason:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map((qr) => (
                  <button
                    key={qr}
                    type="button"
                    onClick={() => setDropoutReason(qr)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                      dropoutReason === qr
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-purple-200 dark:border-purple-700/60 hover:bg-purple-50'
                    }`}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Specific Dropout Reason / Notes *
              </label>
              <textarea
                value={dropoutReason}
                onChange={(e) => setDropoutReason(e.target.value)}
                rows={3}
                placeholder="e.g. Student requested to switch from Full Stack to Data Analytics course mid-way after Module 2..."
                className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>
        )}

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className={isDropout ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold' : ''}
          >
            {isDropout ? 'Mark as Dropout' : 'Update Status'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
