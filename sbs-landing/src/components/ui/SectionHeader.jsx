import React from 'react';

export function SectionHeader({ title, subtitle, badge, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {badge && (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
            {badge}
          </span>
        )}
      </div>
      {actions}
    </div>
  );
}
