import React from 'react';

/**
 * Premium Card Component
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function Card({ children, className = '', animate = true }) {
  return (
    <div className={`
      glass-card rounded-[24px] overflow-hidden
      ${animate ? 'animate-premium-in' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`px-6 py-5 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 ${className}`}>
      <div>
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '', noPadding = false }) {
  return (
    <div className={`${noPadding ? '' : 'p-6'} ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-200/50 dark:border-slate-800/50 ${className}`}>
      {children}
    </div>
  );
}
