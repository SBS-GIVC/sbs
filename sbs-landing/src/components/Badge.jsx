import React from 'react';

export function Badge({ children, variant = 'default', size = 'medium', icon, pulse = false }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  };

  const sizes = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-xs',
    large: 'px-3 py-1.5 text-sm',
  };

  return (
    <span 
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full shadow-sm transition-all duration-300 ${variants[variant]} ${sizes[size]} ${pulse ? 'animate-pulse-glow' : ''}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-[14px]">{icon}</span>
      )}
      {children}
    </span>
  );
}
