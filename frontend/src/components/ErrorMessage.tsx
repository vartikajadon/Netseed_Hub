import React from 'react';
import { AlertTriangle, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';
import { toFriendlyErrorMessage } from '../utils/errorFormatter';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onRetry,
  className = '',
}) => {
  const friendlyMessage = toFriendlyErrorMessage(message);

  // Derive contextual friendly title if not explicitly provided
  let displayTitle = title;
  let Icon = AlertTriangle;

  if (!displayTitle) {
    if (friendlyMessage.includes('connect') || friendlyMessage.includes('internet')) {
      displayTitle = 'Connection Notice';
      Icon = WifiOff;
    } else if (friendlyMessage.includes('permission') || friendlyMessage.includes('suspended') || friendlyMessage.includes('ACCESS_REVOKED')) {
      displayTitle = 'Access Notice';
      Icon = ShieldAlert;
    } else if (friendlyMessage.includes('not be found') || friendlyMessage.includes('could not be found')) {
      displayTitle = 'Resource Not Found';
      Icon = AlertCircle;
    } else if (friendlyMessage.includes('required') || friendlyMessage.includes('check your input')) {
      displayTitle = 'Action Required';
      Icon = AlertCircle;
    } else {
      displayTitle = 'Notice';
      Icon = AlertTriangle;
    }
  }

  return (
    <div className={`p-4 bg-rose-50/90 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 rounded-2xl flex items-start gap-3.5 text-rose-800 dark:text-rose-300 shadow-xs transition-all ${className}`}>
      <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center shrink-0 mt-0.5 text-rose-600 dark:text-rose-400">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
          {displayTitle}
        </h4>
        <p className="text-xs text-rose-800/95 dark:text-rose-300/90 mt-1 font-medium leading-relaxed">
          {friendlyMessage}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2.5 inline-flex items-center text-xs font-bold text-rose-700 hover:text-rose-900 dark:text-rose-400 dark:hover:text-rose-200 underline underline-offset-4 decoration-rose-300 dark:decoration-rose-600 transition-colors"
          >
            Try again &rarr;
          </button>
        )}
      </div>
    </div>
  );
};
