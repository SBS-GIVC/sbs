import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/**
 * Premium Settings Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function SettingsPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoMapping, setAutoMapping] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1000px] mx-auto p-6 sm:p-12 space-y-12 stagger-children">
        
        {/* Header Section */}
        <section className="animate-premium-in">
           <SectionHeader 
             title="System Configuration" 
             subtitle="Fine-tune your GIVC-SBS environment, security parameters, and autonomous relay logic."
             badge="Security Gate"
           />
        </section>

        <div className="space-y-8">
           {/* Governance Settings */}
           <Card className="animate-premium-in shadow-2xl shadow-slate-900/5 group" style={{ animationDelay: '100ms' }}>
              <CardHeader 
                title="Operational Logic" 
                subtitle="Manage how the relay handles autonomous decision making." 
                icon="settings_suggest"
              />
              <CardBody className="p-0">
                 <SettingItem 
                    label="Autonomous Mapping" 
                    desc="Automatically synchronize claims that exceed the neural confidence threshold."
                    active={autoMapping}
                    onToggle={() => setAutoMapping(!autoMapping)}
                 />
                 <div className="px-10 py-8 space-y-4">
                    <div className="flex justify-between items-end">
                       <div className="space-y-1">
                          <p className="text-sm font-black text-slate-800 dark:text-gray-100">Confidence Threshold</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Minimum marker for auto-triage</p>
                       </div>
                       <span className="text-xl font-black text-blue-600">{confidenceThreshold}%</span>
                    </div>
                    <input 
                       type="range" 
                       className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-blue-600 cursor-pointer"
                       value={confidenceThreshold}
                       max="100"
                       min="50"
                       onChange={(e) => setConfidenceThreshold(e.target.value)}
                    />
                 </div>
              </CardBody>
           </Card>

           {/* Security & API */}
           <Card className="animate-premium-in" style={{ animationDelay: '200ms' }}>
              <CardHeader title="Gateway Connectivity" subtitle="Manage your production endpoints and security keys." icon="key" />
              <CardBody className="p-10 space-y-8">
                 <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">n8n Relay Webhook</label>
                       <Input icon="link" placeholder="https://n8n.brainsait.cloud/..." />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">NPHIES Environment</label>
                       <select className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 appearance-none">
                          <option>Production Node</option>
                          <option>Developer Sandbox</option>
                          <option>UAT Staging</option>
                       </select>
                    </div>
                 </div>
                 <div className="p-6 rounded-[28px] bg-amber-500/5 border border-amber-500/10 flex gap-4">
                    <span className="material-symbols-outlined text-amber-500 font-black">shield</span>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                       Changing the NPHIES environment will invalidate current session tokens and requires a full security re-handshake.
                    </p>
                 </div>
              </CardBody>
           </Card>

           {/* Personalization */}
           <Card className="animate-premium-in" style={{ animationDelay: '300ms' }}>
              <CardHeader title="Interface Preferences" icon="palette" />
              <CardBody className="p-0">
                 <SettingItem 
                    label="Luminance Profile" 
                    desc="Switch between specialized high-contrast dark mode and clinical light mode."
                    active={darkMode}
                    onToggle={() => setDarkMode(!darkMode)}
                    icon="dark_mode"
                 />
                 <SettingItem 
                    label="Dispatch Notifications" 
                    desc="Receive real-time relay failure alerts via encrypted email channels."
                    active={emailNotifications}
                    onToggle={() => setEmailNotifications(!emailNotifications)}
                    icon="mail"
                 />
              </CardBody>
           </Card>

           <div className="flex justify-between items-center py-6">
              <button className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500 transition-colors">Factory Reset Configuration</button>
              <div className="flex gap-4">
                 <Button variant="secondary" className="px-8">Discard</Button>
                 <Button className="px-10 shadow-2xl shadow-blue-600/20" icon="save">Commit Changes</Button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

function SettingItem({ label, desc, active, onToggle, icon }) {
  return (
    <div className="flex items-center justify-between px-10 py-8 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
       <div className="flex gap-4">
          {icon && (
            <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
               <span className="material-symbols-outlined text-xl">{icon}</span>
            </div>
          )}
          <div className="space-y-1">
             <h4 className="text-sm font-black text-slate-800 dark:text-white leading-none">{label}</h4>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-sm">{desc}</p>
          </div>
       </div>
       <div 
         onClick={onToggle}
         className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${active ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'bg-slate-200 dark:bg-slate-700'}`}
       >
          <div className={`absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm ${active ? 'right-1' : 'left-1'}`}></div>
       </div>
    </div>
  );
}
