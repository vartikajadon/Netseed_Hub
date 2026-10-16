import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, action, children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm dark:shadow-xl transition-all duration-200 ${className}`}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-200 dark:border-slate-800/80">
          <div>
            {title && <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="self-start sm:self-auto">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
