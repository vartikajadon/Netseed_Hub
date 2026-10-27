import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { api } from '../api/client';
import { Student } from '../types';
import { KeyRound, Copy, Check, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface StudentPasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess?: () => void;
}

export const StudentPasswordResetModal: React.FC<StudentPasswordResetModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess,
}) => {
  const [temporaryPassword, setTemporaryPassword] = useState('Welcome@2026');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ tempPass: string } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const handleClose = () => {
    setError(null);
    setSuccessInfo(null);
    setHasCopied(false);
    setTemporaryPassword('Welcome@2026');
    onClose();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await api.post<{ message: string; temporary_password?: string }>(
        `/students/${student.id}/reset-password`,
        {
          new_password: temporaryPassword.trim() || 'Welcome@2026',
        }
      );

      setSuccessInfo({
        tempPass: res.temporary_password || temporaryPassword.trim() || 'Welcome@2026',
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to reset student password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!successInfo?.tempPass) return;
    navigator.clipboard.writeText(successInfo.tempPass);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Reset Student Password (HR Admin)"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Student summary banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {student.user?.full_name || 'Trainee'}
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              {student.user?.email}
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
              {student.roll_number}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {successInfo ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                Password Reset Successfully!
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                The student account has been updated. The student will be prompted to create their own new password upon their next login.
              </p>
              <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Temporary Password</div>
                  <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                    {successInfo.tempPass}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {hasCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <span>
                Resetting credentials assigns a temporary password and flags the student to choose a personal password on their next login session.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default / Temporary Password
              </label>
              <input
                type="text"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                placeholder="Welcome@2026"
                required
                minLength={6}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Default is <strong className="font-mono text-slate-700 dark:text-slate-300">Welcome@2026</strong>. You can customize it if needed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isLoading || !temporaryPassword}>
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
