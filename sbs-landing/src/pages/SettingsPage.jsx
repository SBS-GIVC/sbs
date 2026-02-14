import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/Toast';
import { i18n } from '../utils/i18n';

/**
 * Premium Settings Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function SettingsPage({ lang = 'en' }) {
  const toast = useToast();
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.settings || i18n.en.pages.settings;
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoMapping, setAutoMapping] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [nphiesEnv, setNphiesEnv] = useState('production');

  return (
    <div className="flex-1">
      <main className="max-w-[1000px] mx-auto p-6 sm:p-12 space-y-12 stagger-children">
        
        {/* Header Section */}
        <section className="animate-premium-in">
           <SectionHeader 
             title={t.header.title} 
             subtitle={t.header.subtitle}
             badge={t.header.badge}
           />
        </section>

        <div className="space-y-8">
           {/* Governance Settings */}
           <Card className="animate-premium-in shadow-2xl shadow-slate-900/5 group" style={{ animationDelay: '100ms' }}>
              <CardHeader 
                title={t.operationalLogic.title}
                subtitle={t.operationalLogic.subtitle}
                icon="settings_suggest"
              />
              <CardBody className="p-0">
                 <SettingItem 
                    label={t.operationalLogic.autonomousMapping.label}
                    desc={t.operationalLogic.autonomousMapping.desc}
                    active={autoMapping}
                    onToggle={() => setAutoMapping(!autoMapping)}
                    lang={lang}
                  />
                 <div className="px-10 py-8 space-y-4">
                    <div className="flex justify-between items-end">
                       <div className="space-y-1">
                          <p className="text-sm font-black text-slate-800 dark:text-gray-100">{t.operationalLogic.confidenceThreshold.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.operationalLogic.confidenceThreshold.hint}</p>
                       </div>
                       <span className="text-xl font-black text-blue-600">{confidenceThreshold}%</span>
                    </div>
                    <input 
                       type="range" 
                       className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-blue-600 cursor-pointer"
                       value={confidenceThreshold}
                       max="100"
                       min="50"
                       aria-label={t.operationalLogic.confidenceThreshold.label}
                       onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                    />
                 </div>
              </CardBody>
           </Card>

           {/* Security & API */}
           <Card className="animate-premium-in" style={{ animationDelay: '200ms' }}>
              <CardHeader title={t.connectivity.title} subtitle={t.connectivity.subtitle} icon="key" />
              <CardBody className="p-10 space-y-8">
                 <div className="grid sm:grid-cols-2 gap-8">
                    <Input icon="link" label={t.connectivity.n8nWebhook.label} placeholder={t.connectivity.n8nWebhook.placeholder} />
                    <div className="space-y-1.5">
                       <label htmlFor="settings-nphies-env" className="text-[10px] font-black uppercase tracking-widest text-slate-400" style={{ marginInlineStart: '0.25rem' }}>
                         {t.connectivity.nphiesEnv.label}
                       </label>
                       <select
                         id="settings-nphies-env"
                         value={nphiesEnv}
                         onChange={(e) => setNphiesEnv(e.target.value)}
                         className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20 appearance-none"
                       >
                          <option value="production">{t.connectivity.nphiesEnv.options.production}</option>
                          <option value="sandbox">{t.connectivity.nphiesEnv.options.sandbox}</option>
                          <option value="uat">{t.connectivity.nphiesEnv.options.uat}</option>
                       </select>
                    </div>
                 </div>
                 <div className="p-6 rounded-[28px] bg-amber-500/5 border border-amber-500/10 flex gap-4">
                    <span className="material-symbols-outlined text-amber-500 font-black">shield</span>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                       {t.connectivity.warning}
                    </p>
                 </div>
              </CardBody>
           </Card>

           {/* Personalization */}
           <Card className="animate-premium-in" style={{ animationDelay: '300ms' }}>
              <CardHeader title={t.preferences.title} icon="palette" />
              <CardBody className="p-0">
                 <SettingItem 
                    label={t.preferences.luminanceProfile.label}
                    desc={t.preferences.luminanceProfile.desc}
                    active={darkMode}
                    onToggle={() => setDarkMode(!darkMode)}
                    icon="dark_mode"
                    lang={lang}
                 />
                 <SettingItem 
                    label={t.preferences.dispatchNotifications.label}
                    desc={t.preferences.dispatchNotifications.desc}
                    active={emailNotifications}
                    onToggle={() => setEmailNotifications(!emailNotifications)}
                    icon="mail"
                    lang={lang}
                 />
              </CardBody>
           </Card>

           <div className="flex justify-between items-center py-6">
              <button
                type="button"
                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500 transition-colors"
                onClick={() => toast.warning(t.toast.factoryReset)}
              >
                {t.actions.factoryReset}
              </button>
              <div className="flex gap-4">
                 <Button variant="secondary" className="px-8" onClick={() => toast.info(t.toast.discarded)}>
                   {t.actions.discard}
                 </Button>
                 <Button className="px-10 shadow-2xl shadow-blue-600/20" icon="save" onClick={() => toast.success(t.toast.committed)}>
                   {t.actions.commit}
                 </Button>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

function SettingItem({ label, desc, active, onToggle, icon, lang = 'en' }) {
  const copy = i18n[lang] || i18n.en;
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
       <button
         type="button"
         onClick={onToggle}
         role="switch"
         aria-checked={!!active}
         aria-label={`${label}: ${active ? copy.common.on : copy.common.off}`}
         className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${active ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'bg-slate-200 dark:bg-slate-700'}`}
       >
          <span
            className="absolute top-1 size-4 bg-white rounded-full transition-all shadow-sm"
            style={active ? { insetInlineEnd: '0.25rem' } : { insetInlineStart: '0.25rem' }}
          ></span>
       </button>
    </div>
  );
}
