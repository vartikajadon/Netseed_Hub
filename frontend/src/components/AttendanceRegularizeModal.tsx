import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { api } from '../api/client';
import { AttendanceDailyRecord } from '../types';
import { CheckCircle2, AlertCircle, ShieldAlert, FileText, Clock } from 'lucide-react';

interface AttendanceRegularizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: AttendanceDailyRecord | null;
}

export const AttendanceRegularizeModal: React.FC<AttendanceRegularizeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  record,
}) => {
  const [status, setStatus] = useState<string>('PRESENT');
  const [workingHours, setWorkingHours] = useState<string>('8.0');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && record) {
      setError(null);
      setSuccessMsg(null);
      setStatus('PRESENT');
      setWorkingHours(record.total_working_hours ? String(record.total_working_hours) : '8.0');
      setReason('');
    }
  }, [isOpen, record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!reason.trim() || reason.trim().length < 5) {
      return setError('A mandatory business justification reason (minimum 5 characters) is required for attendance regularization.');
    }

    const hoursNum = parseFloat(workingHours);
    if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 24) {
      return setError('Please specify a valid total working hours value between 0.0 and 24.0.');
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/attendance/regularize', {
        attendance_record_id: record.id,
        status: status,
        override_working_hours: hoursNum,
        reason: reason.trim(),
      });

      // Dispatch acknowledgment notification for attendance override
      if (record.student?.user_id) {
        await api.post('/notifications', {
          user_id: record.student.user_id,
          title: 'Attendance Regularized & Approved',
          message: `Your attendance record for ${record.date} was regularized to ${status} (${hoursNum} hrs). Reason: ${reason.trim()}`,
          notification_type: 'ACKNOWLEDGEMENT'
        }).catch(() => null);
      }

      setSuccessMsg('Attendance record regularized successfully! Immutable audit log recorded.');
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to regularize attendance record.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="HR Manual Attendance Regularization & Audit Override"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {successMsg}
          </div>
        )}

        {record && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-slate-900 dark:text-slate-100 font-semibold">
              <span>Trainee: {record.student?.user?.full_name || record.student?.roll_number}</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{record.date}</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Current Status: <strong className="text-amber-600 dark:text-amber-400">{record.status}</strong> | Logged Hours: {record.total_working_hours} hrs
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Regularized Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PRESENT">PRESENT (Completed Shift)</option>
              <option value="REGULARIZED">REGULARIZED (Override Exception)</option>
              <option value="ABSENT">ABSENT</option>
            </select>
          </div>

          <Input
            label="Override Total Daily Working Hours *"
            type="number"
            value={workingHours}
            onChange={(e) => setWorkingHours(e.target.value)}
            placeholder="e.g. 8.0"
            min={0}
            max={24}
            step={0.5}
            required
          />
        </div>

        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
            Mandatory Business Justification Reason *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter clear rationale (e.g. Biometric scanner issue / Approved official duty / Geofence GPS drift verification)..."
            rows={3}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <span>
            Compliance Audit Notice: Manual attendance overrides are logged in the immutable system audit log table with your HR identity, IP address, and rationale.
          </span>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Submit Regularization & Log Audit
          </Button>
        </div>
      </form>
    </Modal>
  );
};
