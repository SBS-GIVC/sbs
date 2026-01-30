import React from 'react';

export function Sidebar({ currentView, setCurrentView, isOpen, onClose }) {
  return (
    <aside className={`fixed md:static inset-y-0 left-0 z-50 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-[#111a22] transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} md:w-20 hover:md:w-72 w-72 group`}>
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="h-full w-full bg-gradient-to-b from-primary/5 via-transparent to-transparent"></div>
      </div>
      <div className="px-4 py-5 flex items-center gap-3 relative">
        <div className="relative flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg transition-all duration-300 group-hover:shadow-glow">
          <span className="material-symbols-outlined text-white text-2xl">local_hospital</span>
          <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </div>
        <div className="flex flex-col transition-all duration-300 opacity-0 group-hover:opacity-100 md:group-hover:translate-x-0 md:opacity-0">
          <h1 className="text-base font-bold leading-none tracking-tight text-slate-900 dark:text-white">HealthGateway</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">Integration Admin</p>
        </div>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="absolute right-4 md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
        <SidebarItem 
            icon="dashboard" 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')}
        />
        
        {/* NPHIES Integration Section */}
        <div className="mt-4 mb-2 px-3">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">NPHIES Integration</p>
        </div>
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
        <div className="mt-4 mb-2 px-3">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">Code Management</p>
        </div>
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
        
        {/* System Section */}
        <div className="mt-4 mb-2 px-3">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">System</p>
        </div>
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
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <a className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800/50 dark:hover:to-slate-800/30 transition-all duration-300 hover:shadow-soft" href="#">
          <div className="relative">
            <div className="size-10 rounded-full bg-cover bg-center ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-primary transition-all duration-300 group-hover:scale-110" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBhFYyRcgngkAz-5vuKvrqDXcSeT0cOywkVZ4VTc0_KGoVeEtcowROYzPlqGiZtXSzR6G875kqbMceHYaVIBlqbk7UXukX9FWzLH6b4WBEj7niLrtwcAd0ZrSmvz1THD0544xciaSUYt4zIFnME70jxk-fXSRjxbl9cxJn7WKj29NgIvresaZZW7zRe32uM88gv8PKPBKquZa3UpzLA1VV1gPg3DvAuMtTvVHX0kOip_O_SSsGaOmYEX1JL5Mc5AY6e_efDKCSl084")' }}></div>
            <div className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-surface-light dark:ring-[#111a22] animate-pulse"></div>
          </div>
          <div className="flex flex-col flex-1 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
            <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">Dr. Sarah Chen</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">System Admin</p>
          </div>
          <span className="material-symbols-outlined text-slate-400 opacity-0 group-hover:opacity-100 transition-all duration-300">arrow_forward</span>
        </a>
      </div>
    </aside>
  );
}

function SidebarItem({ icon, label, active, onClick, badge }) {
    return (
        <button 
            onClick={onClick}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 w-full text-left relative overflow-hidden ${
                active 
                ? 'bg-gradient-to-r from-primary/15 to-primary/10 text-primary shadow-soft border border-primary/20' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800/50 dark:hover:to-slate-800/30 hover:shadow-soft hover:scale-[1.02]'
            }`}
        >
            {/* Active indicator */}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-blue-600 rounded-r-full"></div>
            )}
            
            <span className={`material-symbols-outlined transition-all duration-300 ${active ? 'fill-1 scale-110' : 'group-hover:scale-110'}`} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
            </span>
            <span className={`text-sm font-medium flex-1 transition-all duration-300 ${active ? 'font-semibold' : ''} opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 md:opacity-0`}>{label}</span>
            {badge && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm animate-pulse-glow">
                    {badge}
                </span>
            )}
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
    )
}
