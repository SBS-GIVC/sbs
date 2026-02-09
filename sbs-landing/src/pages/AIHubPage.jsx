/**
 * Premium AI Hub Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */

import React, { useState } from 'react';
import { AICopilot } from '../components/AICopilot';
import { SmartClaimAnalyzer } from '../components/SmartClaimAnalyzer';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';

const AI_FEATURES = [
  {
    id: 'copilot',
    icon: 'psychology',
    title: 'GIVC-SBS Copilot',
    description: 'Neural billing assistant trained on SBS codes and CHI/NPHIES regulatory frameworks.',
    color: 'blue',
    stats: { label: 'Queries Handled', value: '2,450+' },
    badge: 'POPULAR'
  },
  {
    id: 'analyzer',
    icon: 'analytics',
    title: 'Claim Analyzer',
    description: 'Predictive approval modeling with risk vector assessment and code optimization.',
    color: 'indigo',
    stats: { label: 'Claims Analyzed', value: '12,800+' },
    badge: 'V4.0'
  },
  {
    id: 'coder',
    icon: 'code',
    title: 'Smart Code Mapper',
    description: 'Autonomous mapping of legacy hospital codes to official SBS V3.1 standards.',
    color: 'emerald',
    stats: { label: 'Codes Mapped', value: '45,000+' }
  }
];

export function AIHubPage() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [analyzerOpen, setAnalyzerOpen] = useState(false);
  const appLang = typeof document !== 'undefined' && document.documentElement.lang === 'ar' ? 'ar' : 'en';

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-12 stagger-children">
        
        {/* Cinematic Hero */}
        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-white via-blue-50 to-cyan-50 text-slate-900 p-8 sm:p-12 animate-premium-in shadow-xl border border-slate-200/70">
           <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-cyan-500/10"></div>
           <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-transparent to-transparent blur-3xl"></div>
           </div>

           <div className="relative flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 space-y-8 text-center lg:text-left">
                 <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-600/30 text-blue-700">
                    <span className="material-symbols-outlined text-sm font-black animate-pulse">auto_awesome</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Next-Gen Integration Intelligence</span>
                 </div>
                 
                 <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-none">
                    The Pulse of <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Autonomous Billing</span>
                 </h1>

                 <p className="text-lg font-bold text-slate-600 max-w-xl leading-relaxed">
                    Leverage specialized neural agents trained specifically on the Saudi SBS and NPHIES ecosystems. 
                    Guaranteed <span className="text-slate-900">99.8% normalization accuracy</span> for enterprise health systems.
                 </p>

                 <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                    <Button icon="psychology" onClick={() => setCopilotOpen(true)} className="px-8 py-4">Launch Copilot</Button>
                    <Button variant="secondary" icon="analytics" onClick={() => setAnalyzerOpen(true)} className="px-8 py-4">Start Analysis</Button>
                 </div>
              </div>

              <div className="hidden lg:block relative group">
                 <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                 <div className="size-64 rounded-[48px] bg-white/80 border border-blue-100 flex items-center justify-center animate-float shadow-2xl">
                    <span className="material-symbols-outlined text-9xl text-blue-600 opacity-80 group-hover:scale-110 transition-transform duration-500">smart_toy</span>
                 </div>
              </div>
           </div>
        </section>

        {/* Intelligence Grid */}
        <section className="space-y-6">
           <SectionHeader title="Autonomous Capabilities" subtitle="Specialized AI models designed for specific healthcare integration vectors." />
           <div className="grid md:grid-cols-3 gap-8">
              {AI_FEATURES.map((feature, i) => (
                <FeatureCard key={i} feature={feature} onClick={() => feature.id === 'copilot' ? setCopilotOpen(true) : setAnalyzerOpen(true)} delay={i * 100} />
              ))}
           </div>
        </section>

        {/* Global Stats */}
        <section className="animate-premium-in" style={{ animationDelay: '400ms' }}>
           <Card className="bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50">
              <CardBody className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 p-12">
                 <StatItem icon="trending_up" label="Accuracy Lift" value="+14.2%" color="emerald" />
                 <StatItem icon="bolt" label="Decision Speed" value="120ms" color="blue" />
                 <StatItem icon="security" label="Compliance" value="100%" color="indigo" />
                 <StatItem icon="savings" label="Savings Yield" value="SAR 4.2M" color="amber" />
              </CardBody>
           </Card>
        </section>

      </main>

      <AICopilot isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} lang={appLang} />
      <SmartClaimAnalyzer 
        isOpen={analyzerOpen} 
        onClose={() => setAnalyzerOpen(false)} 
        claimData={{
          patientId: 'P-12345',
          serviceDate: '2026-01-15',
          claimType: 'Professional',
          totalAmount: 15000,
          items: [
            { sbsCode: '90471-00-00', description: 'Immunization administration', quantity: 1, unitPrice: 500 },
            { sbsCode: '99213-00-00', description: 'Office visit, established patient', quantity: 1, unitPrice: 800 },
          ]
        }}
      />
    </div>
  );
}

function FeatureCard({ feature, onClick, delay }) {
  const colors = {
    blue: 'text-blue-500 bg-blue-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
  };

  return (
    <div 
      onClick={onClick}
      className="glass-card p-8 rounded-[40px] border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-600/30 transition-all duration-300 group cursor-pointer animate-premium-in"
      style={{ animationDelay: `${delay}ms` }}
    >
       <div className="flex justify-between items-start mb-8">
          <div className={`size-16 rounded-[24px] flex items-center justify-center ${colors[feature.color] || colors.blue} group-hover:scale-110 transition-transform`}>
             <span className="material-symbols-outlined text-3xl font-black">{feature.icon}</span>
          </div>
          {feature.badge && (
            <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black tracking-widest uppercase border border-white/10">{feature.badge}</span>
          )}
       </div>
       <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3 leading-none">{feature.title}</h3>
       <p className="text-sm font-bold text-slate-500 leading-relaxed min-h-[48px]">{feature.description}</p>
       
       <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{feature.stats.label}</p>
             <p className="text-lg font-black text-slate-900 dark:text-white">{feature.stats.value}</p>
          </div>
          <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
             <span className="material-symbols-outlined">arrow_forward</span>
          </div>
       </div>
    </div>
  );
}

function StatItem({ icon, label, value, color }) {
  const colors = {
    blue: 'text-blue-500',
    indigo: 'text-indigo-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
  };

  return (
    <div className="text-center group">
       <div className="flex justify-center mb-4">
          <span className={`material-symbols-outlined text-3xl font-black ${colors[color] || colors.blue} group-hover:scale-110 transition-transform`}>{icon}</span>
       </div>
       <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-1 leading-none">{value}</h4>
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    </div>
  );
}
