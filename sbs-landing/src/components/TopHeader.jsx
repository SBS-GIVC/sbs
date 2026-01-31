import React, { useState, useEffect } from 'react';

export function TopHeader({ title, subtitle, breadcrumbs, onMenuClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`
        flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-5
        border-b border-slate-200/80 dark:border-slate-800/80
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
        sticky top-0 z-40
        transition-all duration-300
        ${scrolled ? 'shadow-soft' : ''}
      `}
    >
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="md:hidden p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/10 active:scale-95 transition-all duration-200"
        >
          <span className="material-symbols-outlined text-xl text-slate-600 dark:text-slate-300">menu</span>
        </button>
        
        {/* Title & Breadcrumbs */}
        <div className="flex flex-col gap-1.5">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  <a 
                    href="#" 
                    className={`
                      transition-all duration-200
                      ${i === breadcrumbs.length - 1 
                        ? 'text-slate-700 dark:text-slate-300 font-medium' 
                        : 'text-slate-400 dark:text-slate-500 hover:text-primary'
                      }
                    `}
                  >
                    {crumb}
                  </a>
                  {i < breadcrumbs.length - 1 && (
                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-base">chevron_right</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{subtitle}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="hidden md:flex items-center gap-3">
        <div className={`relative transition-all duration-300 ${searchFocused ? 'w-96' : 'w-72'}`}>
          <label className="relative flex items-center group">
            <span className={`
              absolute left-4 material-symbols-outlined text-lg
              transition-all duration-200
              ${searchFocused ? 'text-primary scale-110' : 'text-slate-400'}
            `}>
              search
            </span>
            <input 
              className={`
                w-full h-11 
                bg-slate-50 dark:bg-slate-800/50
                border-2 border-transparent
                rounded-xl pl-12 pr-16
                text-sm text-slate-900 dark:text-white 
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                transition-all duration-200
                ${searchFocused 
                  ? 'bg-white dark:bg-slate-800 ring-2 ring-primary/20 border-primary shadow-glow' 
                  : 'hover:bg-white dark:hover:bg-slate-800 hover:shadow-soft'
                }
              `}
              placeholder="Search claims, patients, codes..." 
              type="text"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] text-slate-500 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-600">
                ⌘K
              </kbd>
            </div>
          </label>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button 
            className="p-2.5 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/10 transition-all duration-200"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <button 
            className="p-2.5 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/10 transition-all duration-200"
            title="Help"
          >
            <span className="material-symbols-outlined text-xl">help</span>
          </button>
        </div>
      </div>
    </header>
  );
}
