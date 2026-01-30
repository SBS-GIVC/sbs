import React from 'react';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl shadow-medium ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-5 sm:px-6 py-4 ${className}`}>{children}</div>;
}
