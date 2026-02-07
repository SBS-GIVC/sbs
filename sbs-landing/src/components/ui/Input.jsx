import React from 'react';

/**
 * Premium Input Component
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function Input({
  label,
  hint,
  icon,
  className = '',
  ...props
}) {
  return (
    <div className="flex flex-col gap-2 w-full group">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors material-symbols-outlined text-[20px]">
            {icon}
          </span>
        )}
        <input
          {...props}
          className={`
            w-full ${icon ? 'pl-12' : 'px-4'} pr-4 py-3.5 
            bg-slate-50 dark:bg-slate-900/50 
            border border-slate-200 dark:border-slate-800 
            rounded-2xl text-sm font-bold 
            text-slate-900 dark:text-white 
            placeholder:text-slate-400 dark:placeholder:text-slate-600
            focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600/50
            shadow-inner transition-all duration-300
            ${className}
          `}
        />
      </div>
      {hint && <span className="text-[10px] font-bold text-slate-400 mt-1 ml-1">{hint}</span>}
    </div>
  );
}
