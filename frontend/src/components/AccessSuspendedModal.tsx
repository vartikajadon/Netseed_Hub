import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { ShieldX, Mail, Phone, LogOut, AlertTriangle } from 'lucide-react';

export const AccessSuspendedModal: React.FC = () => {
  const { user, logout } = useAuth();
  const [isRevokedByApi, setIsRevokedByApi] = useState(false);

  useEffect(() => {
    const handleRevokedAccess = () => {
      setIsRevokedByApi(true);
    };

    window.addEventListener('access_revoked', handleRevokedAccess);
    return () => {
      window.removeEventListener('access_revoked', handleRevokedAccess);
    };
  }, []);

  if (!user || user.role !== 'STUDENT') {
    return null;
  }

  const enrollmentStatus = (user.enrollment_status || '').toUpperCase();
  const isDropoutOrEnded =
    enrollmentStatus === 'DROPOUT' ||
    enrollmentStatus === 'DROPPED' ||
    enrollmentStatus === 'TERMINATED' ||
    user.is_active === false ||
    isRevokedByApi;

  if (!isDropoutOrEnded) {
    return null;
  }

  const handleContactHR = () => {
    window.location.href = 'mailto:hr@netlink.org?subject=Inquiry%20Regarding%20Student%20Account%20Access';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-2 border-rose-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scaleUp">
        {/* Banner header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30 shadow-inner">
            <ShieldX className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Access Revoked
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
              Account Access Ended
            </h2>
          </div>
        </div>

        {/* Message body */}
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2">
          <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
            Your enrollment status in the Netlink Trainee Lifecycle Platform has been marked as{' '}
            <span className="font-black underline uppercase">{user.enrollment_status || 'Dropout / Ended'}</span>.
          </p>
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            All dashboard features, attendance punch-in, assessments, curriculum documents, and active profile access have been disabled in accordance with HR policies.
          </p>
        </div>

        {/* HR Contact Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>Need Assistance? Contact Human Resources</span>
          </div>
          <p className="leading-relaxed">
            If you believe this status was applied in error or have pending paperwork/clearing with the training team, please reach out to HR administration directly:
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-1 font-medium text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-500" />
              <span>hr@netlink.org</span>
            </div>
            <div className="hidden sm:inline text-slate-400">•</div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-indigo-500" />
              <span>+91 (0755) 400-8800</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleContactHR}
            className="w-full sm:w-auto justify-center"
          >
            <Mail className="w-4 h-4 mr-2 text-indigo-500" /> Contact HR
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => logout()}
            className="w-full sm:w-auto justify-center font-bold"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
