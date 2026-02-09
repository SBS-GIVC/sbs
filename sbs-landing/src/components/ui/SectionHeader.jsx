import React from 'react';

/**
 * Premium Section Header Component
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function SectionHeader({ title, subtitle, badge, className = '', dark = false }) {
  return (
    <div className={`mb-6 flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-3">
        <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tighter ${dark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          {title}
        </h2>
        {badge && (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
            dark ? 'bg-white/10 text-white border-white/20' : 'bg-blue-600/10 text-blue-600 border-blue-600/20'
          }`}>
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className={`text-base font-medium max-w-2xl leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
