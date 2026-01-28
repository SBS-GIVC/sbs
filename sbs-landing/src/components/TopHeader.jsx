import React from 'react';

export function TopHeader({ title, subtitle, breadcrumbs }) {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-[#111a22]">
      <div className="flex flex-col gap-1">
        {breadcrumbs && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={i}>
                        <a href="#" className="hover:text-primary transition-colors">{crumb}</a>
                        {i < breadcrumbs.length - 1 && <span>/</span>}
                    </React.Fragment>
                ))}
            </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-secondary-text text-sm font-normal">{subtitle}</p>}
      </div>
      <div className="w-full max-w-sm">
        <label className="relative flex items-center group">
          <span className="absolute left-3 text-slate-400 group-focus-within:text-primary transition-colors material-symbols-outlined">search</span>
          <input 
            className="w-full h-10 bg-slate-100 dark:bg-[#1c2630] border-none rounded-lg pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50" 
            placeholder="Search Claim IDs..." 
            type="text"
          />
        </label>
      </div>
    </header>
  );
}
