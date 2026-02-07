import React from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Mappings Analytics Page
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function MappingsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Header */}
        <section className="animate-premium-in">
          <SectionHeader 
            title="Claims Mapping Analytics" 
            subtitle="Deep inspection of AI normalization performance and regional integration accuracy."
            badge="Live Intelligence"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <StatCard title="Claims Processed" value="142,890" trend="+12.4%" icon="dataset" color="blue" />
            <StatCard title="Auto-Map Rate" value="94.2%" trend="+2.4%" icon="psychology" color="indigo" />
            <StatCard title="Validation Pass" value="98.5%" trend="+0.5%" icon="fact_check" color="emerald" />
            <StatCard title="Neural Latency" value="1.2s" trend="-0.1s" icon="bolt" color="amber" />
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="animate-premium-in" style={{ animationDelay: '100ms' }}>
              <CardHeader 
                title="Transformation Accuracy" 
                subtitle="Daily performance metrics of the SBS normalization engine."
                action={
                  <div className="flex items-center gap-4">
                    <LegendDot color="bg-blue-600" label="Auto-Maps" />
                    <LegendDot color="bg-indigo-400" label="Neural Correction" />
                  </div>
                }
              />
              <CardBody>
                <div className="relative w-full h-[320px] rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent"></div>
                    <div className="relative text-center space-y-3">
                       <div className="size-16 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto text-blue-600 group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-3xl">query_stats</span>
                       </div>
                       <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Real-time Telemetry Active</p>
                    </div>
                </div>
              </CardBody>
            </Card>

            <Card className="animate-premium-in" style={{ animationDelay: '200ms' }}>
               <CardHeader title="Regional Performance Leaderboard" subtitle="Top 10 healthcare facilities by integration efficiency." />
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 dark:bg-slate-900/40">
                        <tr>
                           <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Source Entity</th>
                           <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Geographic Node</th>
                           <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Throughput</th>
                           <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Precision</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <FacilityRow name="Mercy General Hospital" region="Riyadh Central" volume="12,405" accuracy={98.2} />
                        <FacilityRow name="King Faisal Medical" region="Jeddah West" volume="8,230" accuracy={96.5} />
                        <FacilityRow name="Specialized Health" region="Dammam East" volume="5,102" accuracy={82.1} warning />
                        <FacilityRow name="Prince Sultan Center" region="Riyadh Central" volume="3,890" accuracy={94.8} />
                     </tbody>
                  </table>
               </div>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="animate-premium-in" style={{ animationDelay: '300ms' }}>
               <CardHeader title="Anomaly Vectors" />
               <CardBody className="space-y-6">
                  <div className="flex justify-center py-8">
                     <div className="size-44 rounded-full border-[12px] border-slate-100 dark:border-slate-800 relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-[12px] border-blue-600 border-t-transparent -rotate-45"></div>
                        <div className="text-center">
                           <p className="text-3xl font-black text-slate-900 dark:text-white">842</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Flags</p>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-3">
                     <ErrorLink label="Semantic Ambiguity" count={421} color="bg-blue-600" />
                     <ErrorLink label="Schema Discrepancy" count={252} color="bg-indigo-500" />
                     <ErrorLink label="Cipher Mismatch" count={169} color="bg-rose-500" />
                  </div>
               </CardBody>
            </Card>

            <Card className="bg-indigo-600 text-white animate-premium-in" style={{ animationDelay: '400ms' }}>
               <CardBody className="p-8 text-center space-y-6">
                  <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto border border-white/20">
                     <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-xl font-black tracking-tight">AI Audit Ready</h4>
                     <p className="text-sm font-bold text-indigo-100">Our neural agent has suggested 12 new mapping rules based on yesterday's discrepancies.</p>
                  </div>
                  <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-transform active:scale-95">Review Proposals</button>
               </CardBody>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, trend, icon, color }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-600/10',
    indigo: 'text-indigo-600 bg-indigo-600/10',
    emerald: 'text-emerald-600 bg-emerald-600/10',
    amber: 'text-amber-600 bg-amber-600/10',
  };
  return (
    <div className="glass-card p-6 rounded-[28px] border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-600/30 transition-all group">
       <div className="flex justify-between items-start mb-4">
          <div className={`size-12 rounded-2xl flex items-center justify-center ${colors[color] || colors.blue} transition-transform group-hover:rotate-6`}>
             <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
          <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{trend}</span>
       </div>
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</p>
       <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h4>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`size-2.5 rounded-full ${color}`}></div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

function FacilityRow({ name, region, volume, accuracy, warning }) {
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
       <td className="px-6 py-5">
          <div className="flex items-center gap-3">
             <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                {name.charAt(0)}
             </div>
             <p className="text-sm font-bold text-slate-900 dark:text-white">{name}</p>
          </div>
       </td>
       <td className="px-6 py-5">
          <p className="text-xs font-bold text-slate-500">{region}</p>
       </td>
       <td className="px-6 py-5 text-right">
          <p className="text-sm font-black text-slate-700 dark:text-slate-300">{volume}</p>
       </td>
       <td className="px-6 py-5">
          <div className="flex items-center gap-3">
             <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-24 shadow-inner">
                <div 
                  className={`h-full rounded-full ${warning ? 'bg-amber-500' : 'bg-blue-600'} transition-all duration-1000`}
                  style={{ width: `${accuracy}%` }}
                ></div>
             </div>
             <span className={`text-xs font-black ${warning ? 'text-amber-600' : 'text-blue-600'}`}>{accuracy}%</span>
          </div>
       </td>
    </tr>
  );
}

function ErrorLink({ label, count, color }) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
       <div className="flex items-center gap-3">
          <div className={`size-2.5 rounded-full ${color}`}></div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
       </div>
       <span className="text-xs font-black text-slate-400 group-hover:text-blue-600">{count}</span>
    </div>
  );
}
