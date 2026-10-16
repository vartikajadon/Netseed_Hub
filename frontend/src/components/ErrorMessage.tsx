import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
}) => {
  return (
    <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-800 dark:text-rose-300 shadow-xs">
      <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">{title}</h4>
        <p className="text-xs text-rose-800 dark:text-rose-300/90 mt-0.5 font-medium">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs font-semibold text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-300 underline underline-offset-2"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};
