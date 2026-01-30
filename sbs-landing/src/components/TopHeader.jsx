import React from 'react';

export function TopHeader({ title, subtitle, breadcrumbs, onMenuClick }) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-[#111a22] backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 sticky top-0 z-40 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="md:hidden p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-xl text-slate-600 dark:text-slate-300">menu</span>
        </button>
        <div className="flex flex-col gap-2">
        {breadcrumbs && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={i}>
                        <a href="#" className="hover:text-primary transition-all duration-300 hover:underline hover:underline-offset-4">{crumb}</a>
                        {i < breadcrumbs.length - 1 && <span className="text-slate-300 dark:text-slate-600">/</span>}
                    </React.Fragment>
                ))}
            </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text">{title}</h1>
        {subtitle && <p className="text-secondary-text text-sm font-normal flex items-center gap-2">
          <span className="inline-block size-2 bg-green-500 rounded-full animate-pulse"></span>
          {subtitle}
        </p>}
        </div>
      </div>
      <div className="hidden md:block w-full max-w-sm">
        <label className="relative flex items-center group">
          <span className="absolute left-4 text-slate-400 group-focus-within:text-primary transition-all duration-300 material-symbols-outlined group-focus-within:scale-110">search</span>
          <input 
            className="w-full h-11 bg-slate-100 dark:bg-[#1c2630] border border-slate-200 dark:border-slate-700 hover:border-primary/30 focus:border-primary rounded-xl pl-12 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 transition-all duration-300 shadow-soft hover:shadow-medium focus:shadow-glow" 
            placeholder="Search Claim IDs, patients, or codes..." 
            type="text"
          />
          <div className="absolute right-3 px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs text-slate-500 dark:text-slate-400 font-mono">
            ⌘K
          </div>
        </label>
      </div>
    </header>
  );
}
