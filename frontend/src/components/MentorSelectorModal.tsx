import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { api } from '../api/client';
import { User, Student } from '../types';

interface MentorSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  student: Student | null;
}

export const MentorSelectorModal: React.FC<MentorSelectorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  student,
}) => {
  const [mentors, setMentors] = useState<User[]>([]);
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMentors();
      setSelectedMentorId(student?.mentor_id || '');
    }
  }, [isOpen, student]);

  const fetchMentors = async () => {
    try {
      const allUsers = await api.get<User[]>('/users');
      setMentors(allUsers.filter((u) => u.role === 'MENTOR'));
    } catch {
      setError('Failed to fetch mentor list');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setError(null);
    setIsLoading(true);

    try {
      await api.patch(`/students/${student.id}/mentor`, {
        mentor_id: selectedMentorId,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update mentor assignment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Lead Mentor — ${student?.user?.full_name || student?.roll_number || 'Student'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Select Lead Mentor *</label>
          <select
            value={selectedMentorId}
            onChange={(e) => setSelectedMentorId(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          >
            <option value="">-- Select Mentor --</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.email})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Update Mentor Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
