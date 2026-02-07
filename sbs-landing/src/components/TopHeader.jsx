import React, { useState, useEffect } from 'react';

/**
 * Premium Header Component
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
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
        relative flex items-center justify-between px-6 sm:px-8 py-5
        z-40 transition-all duration-500
        ${scrolled 
          ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-slate-900/5 py-4' 
          : 'bg-transparent py-6'
        }
      `}
    >
      <div className="flex items-center gap-6">
        {/* Mobile Menu Button with Premium Feel */}
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="md:hidden size-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center shadow-lg active:scale-90 transition-all duration-300"
        >
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">menu</span>
        </button>
        
        {/* Title & Path */}
        <div className="flex flex-col">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-2 mb-1">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  <span className={`text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
                    i === breadcrumbs.length - 1 
                      ? 'text-blue-600' 
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {crumb}
                  </span>
                  {i < breadcrumbs.length - 1 && (
                    <span className="text-slate-300 dark:text-slate-700 text-[10px] font-black">/</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          
          <div className="flex items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
              {title}
            </h1>
            {subtitle && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-blue-600/5 border border-blue-600/10 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/80">{subtitle}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Search & Actions */}
      <div className="flex items-center gap-6">
        <div className={`hidden lg:flex relative transition-all duration-500 ${searchFocused ? 'w-[400px]' : 'w-72'}`}>
          <div className={`
            relative w-full overflow-hidden rounded-2xl transition-all duration-500
            ${searchFocused 
              ? 'bg-white dark:bg-slate-800 shadow-2xl shadow-blue-600/10 ring-1 ring-blue-600/20' 
              : 'bg-slate-100 dark:bg-slate-800/40 border border-transparent'
            }
          `}>
            <span className={`
              absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] transition-colors duration-300
              ${searchFocused ? 'text-blue-600' : 'text-slate-400'}
            `}>
              search
            </span>
            <input 
              className="w-full h-12 bg-transparent pl-12 pr-12 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              placeholder="Deep Search [⌘K]" 
              type="text"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>
        
        {/* Profile / Notifications Link */}
        <div className="flex items-center gap-3">
           <button className="size-11 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 transition-all hover:scale-105 active:scale-95 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
           </button>
           <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
           <button className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 hover:border-blue-600/30 transition-all group">
              <div className="text-right hidden sm:block">
                 <p className="text-[11px] font-black text-slate-900 dark:text-white leading-none">Dr. Al-Fadil</p>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Admin Node</p>
              </div>
              <div className="size-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-0.5 shadow-lg group-hover:rotate-6 transition-transform">
                 <div className="size-full rounded-[10px] bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">AF</div>
              </div>
           </button>
        </div>
      </div>
    </header>
  );
}
