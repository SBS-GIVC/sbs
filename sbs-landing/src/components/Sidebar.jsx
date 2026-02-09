import React from 'react';
import { i18n } from '../utils/i18n';

/**
 * Premium Sidebar Component
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function Sidebar({ currentView, setCurrentView, isOpen, onClose, lang = 'en', isRTL = false }) {
  const copy = i18n[lang] || i18n.en;
  const hiddenTranslate = isRTL ? 'translate-x-full' : '-translate-x-full';
  const sidePlacement = isRTL
    ? 'right-0 border-l border-slate-200/50 dark:border-slate-800/50'
    : 'left-0 border-r border-slate-200/50 dark:border-slate-800/50';

  const navigate = (view) => {
    setCurrentView(view);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden transition-all duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed inset-y-0 z-50 w-72 
        bg-white/90 dark:bg-slate-900/90
        backdrop-blur-xl ${sidePlacement}
        transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
        ${isOpen ? 'translate-x-0 shadow-2xl' : hiddenTranslate}
        md:relative md:translate-x-0 md:shadow-none ${isRTL ? 'md:order-last' : ''}
        flex flex-col h-full
      `}>
        {/* Brand/Logo Section */}
        <div className="p-6">
          <div className="flex items-center gap-3 group px-2 py-1">
            <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-white text-2xl">health_metrics</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                GIVC <span className="text-blue-600">SBS</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                {lang === 'ar' ? 'امتثال V3.1' : 'V3.1 Compliance'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8 scrollbar-hide">
          <SidebarSection title={copy.nav.sections.nphies}>
            <SidebarItem 
              icon="dashboard" 
              label={copy.nav.items.dashboard} 
              active={currentView === 'dashboard'} 
              onClick={() => navigate('dashboard')} 
            />
            <SidebarItem 
              icon="verified_user" 
              label={copy.nav.items.eligibility} 
              active={currentView === 'eligibility'} 
              onClick={() => navigate('eligibility')} 
            />
            <SidebarItem 
              icon="approval" 
              label={copy.nav.items.priorAuth} 
              active={currentView === 'prior-auth'} 
              onClick={() => navigate('prior-auth')} 
            />
            <SidebarItem 
              icon="add_box" 
              label={copy.nav.items.claimBuilder} 
              active={currentView === 'claim-builder'} 
              onClick={() => navigate('claim-builder')} 
              badge="NEW"
            />
            <SidebarItem 
              icon="queue" 
              label={copy.nav.items.claims} 
              active={currentView === 'claims'} 
              onClick={() => navigate('claims')} 
              badge="12"
            />
          </SidebarSection>

          <SidebarSection title={copy.nav.sections.code}>
            <SidebarItem 
              icon="database" 
              label={copy.nav.items.codeBrowser} 
              active={currentView === 'code-browser'} 
              onClick={() => navigate('code-browser')} 
            />
            <SidebarItem 
              icon="terminal" 
              label={copy.nav.items.unifiedBrowser} 
              active={currentView === 'unified-browser'} 
              onClick={() => navigate('unified-browser')} 
            />
            <SidebarItem 
              icon="sync_alt" 
              label={copy.nav.items.mappings} 
              active={currentView === 'mappings'} 
              onClick={() => navigate('mappings')} 
            />
            <SidebarItem 
              icon="settings_suggest" 
              label={copy.nav.items.rulesEngine} 
              active={currentView === 'mapping_rules'} 
              onClick={() => navigate('mapping_rules')} 
            />
          </SidebarSection>

          <SidebarSection title={copy.nav.sections.ai}>
            <SidebarItem 
              icon="hub" 
              label={copy.nav.items.aiHub} 
              active={currentView === 'ai-hub' || currentView === 'ai_hub' || currentView === 'ai-copilot'} 
              onClick={() => navigate('ai-hub')} 
              glow
            />
            <SidebarItem 
              icon="trending_up" 
              label={copy.nav.items.analyticsHub} 
              active={currentView === 'ai-analytics'} 
              onClick={() => navigate('ai-analytics')} 
            />
            <SidebarItem 
              icon="monitoring" 
              label={copy.nav.items.predictiveAnalytics} 
              active={currentView === 'predictive-analytics'} 
              onClick={() => navigate('predictive-analytics')} 
            />
          </SidebarSection>

          <SidebarSection title={copy.nav.sections.system}>
            <SidebarItem 
              icon="sensors" 
              label={copy.nav.items.iotDashboard} 
              active={currentView === 'iot-dashboard' || currentView === 'iot_dashboard'} 
              onClick={() => navigate('iot-dashboard')} 
            />
            <SidebarItem 
              icon="api" 
              label={copy.nav.items.developerPortal} 
              active={currentView === 'developer'} 
              onClick={() => navigate('developer')} 
            />
            <SidebarItem 
              icon="settings" 
              label={copy.nav.items.settings} 
              active={currentView === 'settings'} 
              onClick={() => navigate('settings')} 
            />
          </SidebarSection>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <a 
            href="https://gravatar.com/fadil369" 
            target="_blank"
            rel="noreferrer"
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 flex items-center gap-3 group cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all duration-300"
          >
            <div className="relative">
              <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-105 transition-transform">
                FA
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white dark:border-slate-800 bg-emerald-500"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">Dr. Mohamed El Fadil</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                {lang === 'ar' ? 'توثيق • BrainSAITبرينسايت' : 'Auth • BrainSAITبرينسايت'}
              </p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 group-hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-lg">more_vert</span>
            </button>
          </a>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({ icon, label, active, onClick, badge, glow }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full group flex items-center justify-between px-3 py-2.5 rounded-xl
        transition-all duration-300 relative overflow-hidden
        ${active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.02]' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
        }
      `}
    >
      <div className="flex items-center gap-3.5 relative z-10">
        <span className={`
          material-symbols-outlined text-[20px] transition-transform duration-300
          ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:text-blue-600'}
        `}>
          {icon}
        </span>
        <span className="text-sm font-semibold tracking-tight">{label}</span>
      </div>

      {badge && (
        <span className={`
          px-2 py-0.5 rounded-md text-[10px] font-bold relative z-10
          ${active 
            ? 'bg-white/20 text-white' 
            : 'bg-blue-600/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
          }
        `}>
          {badge}
        </span>
      )}

      {glow && !active && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-500/10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
      )}

      {active && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white rounded-l-full"></div>
      )}
    </button>
  );
}

function SidebarSection({ title, children }) {
  return (
    <div className="space-y-1.5">
      <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">
        {title}
      </h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}
