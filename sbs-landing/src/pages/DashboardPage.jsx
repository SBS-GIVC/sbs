import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Ultra-Premium Dashboard Page
 * The Cinematic Hub of GIVC-SBS
 */
export function DashboardPage() {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = [
    { title: 'Relay Volume', value: '1,240', trend: '+12.5%', trendUp: true, icon: 'dataset', color: 'blue', delay: 0 },
    { title: 'Neural Sync Rate', value: '94.2%', trend: '+2.1%', trendUp: true, icon: 'auto_fix_high', color: 'emerald', delay: 100 },
    { title: 'Pending Triage', value: '45', trend: '-5.2%', trendUp: true, icon: 'hourglass_top', color: 'amber', delay: 200 },
    { title: 'Network Uptime', value: '99.9%', trend: '+0.1%', trendUp: true, icon: 'verified', color: 'indigo', delay: 300 },
  ];

  const handleAction = (action, view) => {
    if (view) {
      window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view } }));
    }
    toast.info(`${action} Sequence Initiated`);
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1700px] mx-auto p-6 sm:p-12 space-y-12 stagger-children">
        
        {/* Cinematic Hero */}
        <section className="relative overflow-hidden rounded-[48px] bg-gradient-to-br from-white via-blue-50 to-cyan-50 border border-slate-200/70 shadow-xl animate-premium-in group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-cyan-600/10 opacity-70"></div>
          
          {/* Neural Network Visualization Background (CSS only) */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.15)_0,transparent_50%)]"></div>
             <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.15)_0,transparent_50%)]"></div>
          </div>

          <div className="relative p-12 lg:p-20 flex flex-col lg:flex-row items-center justify-between gap-16">
            <div className="max-w-3xl space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/25 text-[10px] font-black uppercase tracking-[0.3em]">
                 <span className="flex size-2 bg-white rounded-full animate-pulse"></span>
                 System Protocol 3.1 Active
              </div>
              
              <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter leading-[0.95] stagger-children">
                 The Future of <br />
                 <span className="text-blue-500 bg-clip-text">Clinical Relay</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 font-bold leading-relaxed max-w-2xl">
                Orchestrating the Saudi healthcare economy with adaptive AI, 
                real-time NPHIES compliance, and autonomous revenue intelligence.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-4">
                <Button 
                  icon="rocket_launch" 
                  onClick={() => handleAction('Launch Center', 'claim-builder')}
                  className="px-12 py-4 text-sm shadow-xl shadow-blue-600/20"
                >
                  New Claim Relay
                </Button>
                <Button 
                  variant="secondary" 
                  icon="hub" 
                  onClick={() => handleAction('Analyze Network', 'ai-analytics')}
                  className="px-10 py-4 text-sm bg-white border-slate-200 text-slate-700 hover:bg-blue-50"
                >
                  Neural Insights
                </Button>
              </div>
            </div>

            {/* Live Telemetry Mini-Card */}
            <div className="hidden xl:flex flex-col gap-6 w-96 animate-float">
                 <div className="glass-card p-8 rounded-[38px] border-blue-100 bg-white/80 backdrop-blur-3xl space-y-6 select-none border">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">System Pulse</span>
                     <span className="text-[10px] font-black text-emerald-500">OPTIMAL</span>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="size-16 rounded-3xl bg-blue-600/20 flex items-center justify-center border border-blue-600/30">
                        <span className="material-symbols-outlined text-3xl text-blue-500 font-black">electric_bolt</span>
                     </div>
                     <div className="space-y-1">
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">1.2s</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg Relay Latency</p>
                     </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-blue-600 w-3/4 animate-shimmer"></div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Global KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        <div className="grid lg:grid-cols-12 gap-10">
           {/* Real-time Operations */}
           <Card className="lg:col-span-8 animate-premium-in" style={{ animationDelay: '400ms' }}>
              <CardHeader 
                title="Live Operations Registry" 
                subtitle="Aggregated throughput from active clinical nodes."
                action={<Button variant="secondary" size="sm" icon="filter_list" onClick={() => handleAction('System Filter', 'facility_usage')}>System Filter</Button>}
              />
              <CardBody className="p-0 overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                             <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entity & Carrier</th>
                             <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inference Hub</th>
                             <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Neural Marker</th>
                             <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Relay Status</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          <ClaimRow carrier="Tawuniya" location="Riyadh Central" score={98} status="Authenticated" color="emerald" id="CLM-9821" />
                          <ClaimRow carrier="Bupa Arabia" location="Jeddah Health" score={85} status="In-Review" color="amber" id="CLM-4402" />
                          <ClaimRow carrier="Medgulf" location="Eastern Clinic" score={92} status="Authenticated" color="emerald" id="CLM-0192" />
                          <ClaimRow carrier="Al-Rajhi" location="Dammam Heart" score={99} status="Authenticated" color="emerald" id="CLM-5521" />
                       </tbody>
                    </table>
                 </div>
              </CardBody>
           </Card>

           {/* AI Advisor / System Hub */}
           <div className="lg:col-span-4 space-y-8 animate-premium-in" style={{ animationDelay: '500ms' }}>
              <Card className="bg-blue-600 text-white shadow-2xl shadow-blue-600/30 overflow-hidden relative">
                 <div className="absolute -top-10 -right-10 opacity-10">
                    <span className="material-symbols-outlined text-[180px] font-black">auto_awesome</span>
                 </div>
                 <CardBody className="p-10 space-y-6">
                    <h3 className="text-2xl font-black tracking-tight leading-tight">Neural Deployment Ready</h3>
                    <p className="text-sm font-bold text-blue-100/80 leading-relaxed">
                       Your local V3.1 inference models have reached 99.2% accuracy on staging. Ready for production synchronization.
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full bg-white text-blue-600 border-none hover:bg-blue-50 shadow-xl"
                      icon="sync"
                      onClick={() => handleAction('Production Sync', 'settings')}
                    >
                      Sync Production Node
                    </Button>
                 </CardBody>
              </Card>

              <Card>
                 <CardHeader title="System Integrity" />
                 <CardBody className="p-8 space-y-6">
                    <IntegrityNode label="NPHIES Cloud Node" status="High Priority" active />
                    <IntegrityNode label="SBS Rules Engine" status="Optimal" active />
                    <IntegrityNode label="AI Inference Grid" status="Overload" alert />
                    <IntegrityNode label="Local Cache Layer" status="Optimal" active />
                 </CardBody>
              </Card>
           </div>
        </div>

        {/* Global Utilities */}
        <section className="grid md:grid-cols-3 gap-8 animate-premium-in" style={{ animationDelay: '600ms' }}>
           <UtilityTile icon="hub" title="Code Registry" desc="Unified access to SBS, ICD-10, and SNOMED-CT ontologies." onClick={() => handleAction('Registry Browser', 'unified-browser')} />
           <UtilityTile icon="science" title="Simulation Lab" desc="Validate complex claim scenarios in a sandboxed relay." onClick={() => handleAction('Workflow Simulation', 'facility_performance')} />
           <UtilityTile icon="sensors" title="Edge Monitor" desc="Real-time telemetry from clinical IoT integration nodes." onClick={() => handleAction('IoT Dashboard', 'iot_dashboard')} />
        </section>

      </main>
    </div>
  );
}

function StatCard({ title, value, trend, trendUp, icon, color, delay }) {
  const themes = {
    blue: 'text-blue-600 bg-blue-600/5 border-blue-600/10',
    emerald: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/5 border-amber-500/10',
    indigo: 'text-indigo-600 bg-indigo-600/5 border-indigo-600/10',
  };
  return (
    <Card className={`group hover:scale-[1.03] transition-all duration-500 ${themes[color]}`} style={{ animationDelay: `${delay}ms` }}>
       <CardBody className="p-10 space-y-8">
          <div className="flex justify-between items-center">
             <div className="size-14 rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-3xl font-black text-current">{icon}</span>
             </div>
             <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${trendUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {trend}
             </div>
          </div>
          <div>
             <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">{value}</h4>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
          </div>
       </CardBody>
    </Card>
  );
}

function ClaimRow({ carrier, location, score, status, color, id }) {
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-pointer">
       <td className="px-10 py-6">
          <div className="flex flex-col">
             <span className="text-sm font-black text-slate-800 dark:text-white leading-none whitespace-nowrap">{carrier}</span>
             <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{location}</span>
          </div>
       </td>
       <td className="px-10 py-6">
          <div className="font-mono text-[10px] font-black text-blue-600 bg-blue-600/5 px-3 py-1 rounded-lg inline-block border border-blue-600/10">
             {id}
          </div>
       </td>
       <td className="px-10 py-6">
          <div className="flex items-center gap-4">
             <div className="flex-1 min-w-[100px] h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${score > 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${score}%` }}></div>
             </div>
             <span className="text-[10px] font-black text-slate-500">{score}%</span>
          </div>
       </td>
       <td className="px-10 py-6">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
             <span className={`size-1.5 rounded-full ${color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
             {status}
          </div>
       </td>
    </tr>
  );
}

function IntegrityNode({ label, status, active, alert }) {
  return (
    <div className="flex items-center justify-between group hover:translate-x-1 transition-transform cursor-context-menu">
       <div className="space-y-0.5">
          <p className="text-xs font-black text-slate-800 dark:text-gray-100 leading-none group-hover:text-blue-600 transition-colors">{label}</p>
          <p className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-slate-400' : alert ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>{status}</p>
       </div>
       <div className={`size-2 rounded-full ${active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : alert ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-slate-300'} animate-pulse`}></div>
    </div>
  );
}

function UtilityTile({ icon, title, desc, onClick }) {
  return (
    <Card className="group cursor-pointer hover:border-blue-600/30 transition-all hover:bg-blue-600/5" onClick={onClick}>
       <CardBody className="p-10 space-y-6 text-center">
          <div className="size-16 mx-auto rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
             <span className="material-symbols-outlined text-3xl font-black">{icon}</span>
          </div>
          <div className="space-y-2">
             <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{title}</h4>
             <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">{desc}</p>
          </div>
       </CardBody>
    </Card>
  );
}
