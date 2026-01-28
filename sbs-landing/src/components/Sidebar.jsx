import React from 'react';

export function Sidebar({ currentView, setCurrentView }) {
  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-surface-light dark:bg-[#111a22]">
      <div className="p-6 flex items-center gap-3">
        <div className="relative flex items-center justify-center size-10 rounded-lg bg-primary/10">
          <span className="material-symbols-outlined text-primary text-2xl">local_hospital</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-bold leading-none tracking-tight text-slate-900 dark:text-white">HealthGateway</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">Integration Admin</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1">
        <SidebarItem 
            icon="dashboard" 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')}
        />
        <SidebarItem 
            icon="hub" 
            label="Mappings" 
            active={currentView === 'mappings'} 
            onClick={() => setCurrentView('mappings')}
        />
        <SidebarItem 
            icon="description" 
            label="Claims Queue" 
            active={currentView === 'claims'} 
            onClick={() => setCurrentView('claims')}
        />
        <SidebarItem 
            icon="fact_check" 
            label="Worklist" 
            active={currentView === 'review'} 
            onClick={() => setCurrentView('review')}
        />
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
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors" href="#">
          <div className="size-9 rounded-full bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBhFYyRcgngkAz-5vuKvrqDXcSeT0cOywkVZ4VTc0_KGoVeEtcowROYzPlqGiZtXSzR6G875kqbMceHYaVIBlqbk7UXukX9FWzLH6b4WBEj7niLrtwcAd0ZrSmvz1THD0544xciaSUYt4zIFnME70jxk-fXSRjxbl9cxJn7WKj29NgIvresaZZW7zRe32uM88gv8PKPBKquZa3UpzLA1VV1gPg3DvAuMtTvVHX0kOip_O_SSsGaOmYEX1JL5Mc5AY6e_efDKCSl084")' }}></div>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Dr. Sarah Chen</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">System Admin</p>
          </div>
        </a>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${
                active 
                ? 'bg-primary/10 text-primary' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
        >
            <span className={`material-symbols-outlined ${active ? 'fill-1' : ''}`} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
            </span>
            <span className="text-sm font-medium">{label}</span>
        </button>
    )
}
