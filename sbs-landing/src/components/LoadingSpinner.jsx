import React from 'react';

export function LoadingSpinner({ size = 'medium', message = 'Loading...' }) {
  const sizeClasses = {
    small: 'size-6',
    medium: 'size-10',
    large: 'size-16'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="relative">
        {/* Outer rotating ring */}
        <div className={`${sizeClasses[size]} rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-primary animate-spin`}></div>
        
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-2 bg-primary rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {message && (
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-2xl bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 shadow-soft animate-pulse">
      <div className="flex justify-between items-start mb-5">
        <div className="flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
        </div>
        <div className="size-12 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-surface-dark">
      <div className="animate-pulse">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#151e29] p-4">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="grid grid-cols-6 gap-4 items-center">
              {[...Array(6)].map((_, colIndex) => (
                <div key={colIndex} className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
