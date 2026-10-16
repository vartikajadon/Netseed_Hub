import React from 'react';
import { useNotifications, ToastItem } from '../context/NotificationContext';
import {
  CheckCircle2, AlertCircle, Info, FileCheck, IndianRupee,
  Mail, Award, X, Sparkles
} from 'lucide-react';

export const NotificationToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'ACKNOWLEDGEMENT':
        return <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0" />;
      case 'NO_DUES':
        return <FileCheck className="w-5 h-5 text-indigo-500 shrink-0" />;
      case 'FEE_PAYMENT':
        return <IndianRupee className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'LETTER_ISSUED':
        return <Mail className="w-5 h-5 text-purple-500 shrink-0" />;
      case 'CERTIFICATE_ISSUED':
        return <Award className="w-5 h-5 text-yellow-500 shrink-0" />;
      default:
        return <Sparkles className="w-5 h-5 text-sky-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex items-start gap-3 transition-all animate-in slide-in-from-top-2 duration-200"
        >
          {getToastIcon(toast.type)}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
              {toast.title}
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 font-medium">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
