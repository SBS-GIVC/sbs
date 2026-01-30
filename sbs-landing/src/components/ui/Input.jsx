import React from 'react';

export function Input({
  label,
  hint,
  icon,
  className = '',
  ...props
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
      {label && <span>{label}</span>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-soft transition-all ${className}`}
        />
      </div>
      {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}
