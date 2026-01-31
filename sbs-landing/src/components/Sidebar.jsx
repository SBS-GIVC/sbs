import React from 'react';

export function Sidebar({ currentView, setCurrentView, isOpen, onClose }) {
  return (
    <aside 
      className={`
        fixed md:static inset-y-0 left-0 z-50 
        flex flex-col
        border-r border-slate-200/80 dark:border-slate-800/80
        bg-white dark:bg-slate-900
        transition-all duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} 
        md:w-[72px] hover:md:w-72 w-72 
        group/sidebar
      `}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-500">
        <div className="h-full w-full bg-gradient-to-b from-primary/3 via-transparent to-transparent"></div>
      </div>
      
      {/* Logo Section */}
        <div className="px-4 py-5 flex items-center gap-3 relative border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20 transition-all duration-300 group-hover/sidebar:shadow-glow flex-shrink-0">
            <span className="material-symbols-outlined text-white text-2xl">local_hospital</span>
            <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover/sidebar:opacity-20 transition-opacity duration-300"></div>
          </div>
          <div className="flex flex-col overflow-hidden transition-all duration-300 opacity-0 group-hover/sidebar:opacity-100 md:group-hover/sidebar:translate-x-0 md:opacity-0 translate-x-2 group-hover/sidebar:translate-x-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">GIVC-SBS</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium whitespace-nowrap">Saudi Billing System</p>
          </div>
        
        {/* Close button (mobile only) */}
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="absolute right-3 md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 flex flex-col gap-0.5 scrollbar-hide">
        <SidebarItem 
          icon="dashboard" 
          label="Dashboard" 
          active={currentView === 'dashboard'} 
          onClick={() => setCurrentView('dashboard')}
        />
        
        {/* NPHIES Integration Section */}
        <SidebarSection title="NPHIES Integration" />
        <SidebarItem 
          icon="smart_toy" 
          label="Smart Claim Builder" 
          active={currentView === 'claim-builder'} 
          onClick={() => setCurrentView('claim-builder')}
          badge="NEW"
        />
        <SidebarItem 
          icon="verified_user" 
          label="Eligibility Check" 
          active={currentView === 'eligibility'} 
          onClick={() => setCurrentView('eligibility')}
        />
        <SidebarItem 
          icon="approval" 
          label="Prior Authorization" 
          active={currentView === 'prior-auth'} 
          onClick={() => setCurrentView('prior-auth')}
        />
        <SidebarItem 
          icon="description" 
          label="Claims Queue" 
          active={currentView === 'claims'} 
          onClick={() => setCurrentView('claims')}
        />
        
        {/* Code Management Section */}
        <SidebarSection title="Code Management" />
        <SidebarItem 
          icon="hub" 
          label="Unified Code Browser" 
          active={currentView === 'unified-browser'} 
          onClick={() => setCurrentView('unified-browser')}
          badge="NEW"
        />
        <SidebarItem 
          icon="medical_information" 
          label="SBS Code Browser" 
          active={currentView === 'code-browser'} 
          onClick={() => setCurrentView('code-browser')}
        />
        <SidebarItem 
          icon="hub" 
          label="SBS Mappings" 
          active={currentView === 'mappings'} 
          onClick={() => setCurrentView('mappings')}
        />
        <SidebarItem 
          icon="fact_check" 
          label="Review Worklist" 
          active={currentView === 'review'} 
          onClick={() => setCurrentView('review')}
        />
        
        {/* AI Tools Section */}
        <SidebarSection title="AI Tools" />
        <SidebarItem 
          icon="psychology" 
          label="AI Copilot" 
          active={currentView === 'ai-copilot'} 
          onClick={() => setCurrentView('ai-copilot')}
          badge="AI"
          badgeColor="purple"
        />
        <SidebarItem 
          icon="auto_awesome" 
          label="Claim Optimizer" 
          active={currentView === 'claim-optimizer'} 
          onClick={() => setCurrentView('claim-optimizer')}
          badge="NEW"
        />
        <SidebarItem
          icon="analytics"
          label="Predictive Analytics"
          active={currentView === 'predictive-analytics'}
          onClick={() => setCurrentView('predictive-analytics')}
          badge="ML"
          badgeColor="blue"
        />
        <SidebarItem
          icon="insights"
          label="AI Analytics Hub"
          active={currentView === 'ai-analytics'}
          onClick={() => setCurrentView('ai-analytics')}
          badge="NEW"
          badgeColor="purple"
        />
        
        {/* System Section */}
        <SidebarSection title="System" />
        <SidebarItem 
          icon="tune" 
          label="Configuration" 
          active={currentView === 'mapping_rules'} 
          onClick={() => setCurrentView('mapping_rules')}
        />
        <SidebarItem 
          icon="code" 
          label="Developer Portal" 
          active={currentView === 'developer'} 
          onClick={() => setCurrentView('developer')}
        />
        <SidebarItem 
          icon="settings" 
          label="Settings" 
          active={currentView === 'settings'} 
          onClick={() => setCurrentView('settings')}
        />
      </nav>
      
      {/* User Profile */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <a 
          href="https://fadil369.github.io/profile" 
          target="_blank"
          rel="noreferrer"
          className="group/user flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
        >
          <div className="relative flex-shrink-0">
            <div 
              className="size-10 rounded-full bg-gradient-to-br from-primary to-blue-600 ring-2 ring-slate-100 dark:ring-slate-800 group-hover/user:ring-primary/30 transition-all flex items-center justify-center text-white font-semibold text-sm"
            >
              SC
            </div>
            <div className="absolute bottom-0 right-0 size-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50"></span>
            </div>
          </div>
          <div className="flex-1 min-w-0 overflow-hidden transition-all duration-300 opacity-0 group-hover/sidebar:opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover/user:text-primary transition-colors">Dr. Mohamed El Fadil</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Founder & Medical Director</p>
          </div>
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-base opacity-0 group-hover/sidebar:opacity-100 group-hover/user:text-primary transition-all">
            chevron_right
          </span>
        </a>
      </div>
    </aside>
  );
}

function SidebarSection({ title }) {
  return (
    <div className="mt-5 mb-2 px-3">
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] opacity-0 group-hover/sidebar:opacity-100 md:opacity-0 md:group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap">
        {title}
      </p>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, badge, badgeColor = 'emerald' }) {
  const badgeColors = {
    emerald: 'from-emerald-500 to-teal-500',
    purple: 'from-violet-500 to-purple-500',
    blue: 'from-blue-500 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-red-500 to-pink-500',
  };
  
  return (
    <button 
      onClick={onClick}
      className={`
        group/item relative flex items-center gap-3 px-3 py-2.5 rounded-xl 
        transition-all duration-200 w-full text-left overflow-hidden
        ${active 
          ? 'bg-primary/10 dark:bg-primary/15 text-primary shadow-sm' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
        }
      `}
    >
      {/* Active indicator line */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-primary to-blue-500 rounded-r-full shadow-glow" />
      )}
      
      {/* Icon */}
      <span 
        className={`
          material-symbols-outlined text-xl flex-shrink-0
          transition-all duration-200
          ${active ? 'scale-110' : 'group-hover/item:scale-110'}
        `}
        style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
      >
        {icon}
      </span>
      
      {/* Label */}
      <span 
        className={`
          text-sm font-medium flex-1 whitespace-nowrap
          opacity-0 group-hover/sidebar:opacity-100 
          md:group-hover/sidebar:opacity-100 md:opacity-0 
          transition-all duration-300
          ${active ? 'font-semibold' : ''}
        `}
      >
        {label}
      </span>
      
      {/* Badge */}
      {badge && (
        <span 
          className={`
            px-2 py-0.5 text-[10px] font-bold rounded-md
            bg-gradient-to-r ${badgeColors[badgeColor] || badgeColors.emerald} 
            text-white shadow-sm
            opacity-100 group-hover/sidebar:opacity-100
            transition-all duration-300
          `}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
