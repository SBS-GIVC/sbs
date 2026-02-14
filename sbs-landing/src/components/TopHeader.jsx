import React, { useState, useEffect } from 'react';
import { i18n } from '../utils/i18n';

/**
 * Premium Header Component
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function TopHeader({
  title,
  subtitle,
  breadcrumbs,
  onMenuClick,
  lang = 'en',
  isRTL = false,
  onSetLanguage,
  scrollContainerRef
}) {
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const copy = i18n[lang] || i18n.en;

  useEffect(() => {
    const el = scrollContainerRef?.current || window;
    const handleScroll = () => {
      const top = el === window ? window.scrollY : el.scrollTop;
      setScrolled(top > 10);
    };

    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`
        relative flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4
        z-40 transition-all duration-500
        ${scrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-lg shadow-slate-900/5'
          : 'bg-transparent'
        }
      `}
    >
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row text-left'}`}>
        <button
          type="button"
          aria-label={lang === 'ar' ? 'فتح التنقل' : 'Open navigation'}
          onClick={onMenuClick}
          className="md:hidden size-10 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center shadow-sm active:scale-90 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-slate-600">menu</span>
        </button>

        <div className="flex flex-col">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  <span className={`text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
                    i === breadcrumbs.length - 1 ? 'text-blue-600' : 'text-slate-400'
                  }`}>
                    {crumb}
                  </span>
                  {i < breadcrumbs.length - 1 && (
                    <span className="text-slate-300 text-[10px] font-black">/</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            {subtitle && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600/90">{subtitle}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`hidden xl:flex relative transition-all duration-300 ${searchFocused ? 'w-[360px]' : 'w-64'}`}>
          <div className={`
            relative w-full overflow-hidden rounded-xl transition-all duration-300
            ${searchFocused ? 'bg-white shadow-md ring-1 ring-blue-600/20' : 'bg-white border border-slate-200/70'}
          `}>
            <span aria-hidden="true" className={`
              absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] transition-colors duration-300
              ${searchFocused ? 'text-blue-600' : 'text-slate-400'}
            `}>
              search
            </span>
            <input
              className={`w-full h-10 bg-transparent ${isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'} text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none`}
              placeholder={copy.ui.searchPlaceholder}
              type="text"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        <div
          className="h-10 flex items-center rounded-xl bg-white border border-slate-200/70 p-1"
          role="group"
          aria-label={lang === 'ar' ? 'اللغة' : 'Language'}
        >
          <button
            type="button"
            onClick={() => onSetLanguage?.('en')}
            className={`h-8 px-3 rounded-lg text-xs font-black tracking-wide transition-colors ${
              lang === 'en'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-blue-600'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white`}
            aria-pressed={lang === 'en'}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onSetLanguage?.('ar')}
            className={`h-8 px-3 rounded-lg text-xs font-black tracking-wide transition-colors ${
              lang === 'ar'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'text-slate-600 hover:text-blue-600'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white`}
            aria-pressed={lang === 'ar'}
          >
            العربية
          </button>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'claims' } }))}
          className="size-10 rounded-xl bg-white border border-slate-200/70 text-slate-500 hover:text-blue-600 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          title={copy.ui.notifications}
          aria-label={copy.ui.notifications}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">notifications</span>
        </button>

        <a
          href="https://gravatar.com/fadil369"
          target="_blank"
          rel="noreferrer"
          className={`flex items-center gap-3 pl-3 pr-1.5 py-1 rounded-xl bg-white border border-slate-200/70 hover:border-blue-300 transition-all group ${isRTL ? 'flex-row-reverse' : 'flex-row'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white`}
          title={copy.ui.profile}
        >
          <div className={`${isRTL ? 'text-left' : 'text-right'} hidden sm:block`}>
            <p className="text-[11px] font-black text-slate-900 leading-none">
              {lang === 'ar' ? 'د. محمد الفاضل' : 'Dr. Mohamed El Fadil'}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              BrainSAITبرينسايت
            </p>
          </div>
          <div className="size-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 p-0.5 shadow-md group-hover:rotate-6 transition-transform">
            <div className="size-full rounded-[6px] bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">AF</div>
          </div>
        </a>
      </div>
    </header>
  );
}
