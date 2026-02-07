import React from 'react';

/**
 * Premium Section Header Component
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function SectionHeader({ title, subtitle, badge, className = '' }) {
  return (
    <div className={`mb-6 flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-3">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tighter">
          {title}
        </h2>
        {badge && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-600/10 text-blue-600 border border-blue-600/20 uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-base font-medium text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
