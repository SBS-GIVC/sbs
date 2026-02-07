import React from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';

/**
 * Premium Facility Performance Report
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function FacilityPerformanceReport() {
  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Header & Controls */}
        <section className="animate-premium-in">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <SectionHeader 
                title="Facility Performance" 
                subtitle="Comparative operational analytics across high-throughput healthcare network nodes."
                badge="Network Intelligence"
              />
              <div className="flex gap-3">
                 <Button variant="secondary" icon="file_download">Export CSV</Button>
                 <Button icon="refresh" onClick={() => window.location.reload()}>Sync Nodes</Button>
              </div>
           </div>

           {/* Filters */}
           <div className="mt-10 p-2 glass-panel rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="px-6 py-4 space-y-1 hover:bg-white dark:hover:bg-slate-800 rounded-[24px] transition-colors cursor-pointer group">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temporal Window</p>
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-gray-100">Last 30 Days</span>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">calendar_month</span>
                 </div>
              </div>
              <div className="px-6 py-4 space-y-1 hover:bg-white dark:hover:bg-slate-800 rounded-[24px] transition-colors cursor-pointer group border-l border-slate-100 dark:border-slate-800">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity Type</p>
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-gray-100">All Facilities</span>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">corporate_fare</span>
                 </div>
              </div>
              <div className="px-6 py-4 space-y-1 hover:bg-white dark:hover:bg-slate-800 rounded-[24px] transition-colors cursor-pointer group border-l border-slate-100 dark:border-slate-800">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regional Node</p>
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 dark:text-gray-100">Riyadh Central</span>
                    <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">location_on</span>
                 </div>
              </div>
              <div className="p-1 items-center justify-center hidden lg:flex">
                 <Button className="w-full py-3.5 rounded-[22px]" variant="secondary">Update Query</Button>
              </div>
           </div>
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-premium-in" style={{ animationDelay: '100ms' }}>
           <KpiCard title="Network Accuracy" value="94.2%" trend="+2.1%" icon="verified_user" color="emerald" />
           <KpiCard title="Active Relay Vol" value="12,450" trend="+8.4%" icon="stacked_bar_chart" color="blue" />
           <KpiCard title="Systemic Failure" value="3.2%" trend="-0.5%" icon="error_outline" color="rose" />
           <KpiCard title="Relay Latency" value="8m 12s" trend="-12s" icon="timer" color="indigo" />
        </section>

        {/* Main Grid Content */}
        <div className="grid lg:grid-cols-3 gap-8">
           <Card className="lg:col-span-2 animate-premium-in" style={{ animationDelay: '200ms' }}>
              <CardHeader 
                title="Comparative Fleet Metrics" 
                subtitle="Performance breakdown by individual clinical integration endpoints."
              />
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/40">
                       <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Facility / Hub ID</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Claims Vol</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Mapping Precision</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Fail Rate</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                       <FacilityPerformanceRow name="King Salman Hospital" id="HOSP-RIY-001" claims="1,240" accuracy={98.2} failure="1.2%" />
                       <FacilityPerformanceRow name="Jeddah Specialized Clinic" id="CLINIC-JED-05" claims="850" accuracy={92.5} failure="4.5%" />
                       <FacilityPerformanceRow name="Dammam Central Hub" id="HOSP-DAM-02" claims="3,100" accuracy={85.0} failure="12.4%" warning />
                       <FacilityPerformanceRow name="Al-Amal Medical" id="MED-CENTER-09" claims="1,050" accuracy={95.4} failure="2.1%" />
                    </tbody>
                 </table>
              </div>
           </Card>

           <div className="space-y-6">
              <Card className="bg-slate-900 text-white animate-premium-in" style={{ animationDelay: '300ms' }}>
                 <CardHeader title="Auto-Map Dominance" subtitle="Top performing facilities by throughput." />
                 <CardBody className="space-y-6">
                    <div className="flex items-end justify-between h-48 pt-8">
                       <Bar height="98%" label="RIY" color="bg-blue-600" />
                       <Bar height="95%" label="MED" color="bg-blue-500" />
                       <Bar height="92%" label="JED" color="bg-indigo-600" />
                       <Bar height="91%" label="NTH" color="bg-indigo-400" />
                       <Bar height="85%" label="DAM" color="bg-rose-600" />
                    </div>
                    <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Benchmark</span>
                       <span className="text-xl font-black text-blue-500 tracking-tighter">92.0%</span>
                    </div>
                 </CardBody>
              </Card>

              <Card className="border-l-4 border-l-blue-600 animate-premium-in" style={{ animationDelay: '400ms' }}>
                 <CardBody className="p-8 space-y-6">
                    <div className="size-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                       <span className="material-symbols-outlined font-black">auto_awesome</span>
                    </div>
                    <div className="space-y-2">
                       <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Neural Insight</h4>
                       <p className="text-sm font-bold text-slate-500 leading-relaxed">
                          <span className="text-blue-600">Dammam Central Hub (HOSP-DAM-02)</span> is currently witnessing a divergence in ER coding consistency. 
                          Anomaly vectors suggest a training gap in SBS V3.1 procedural mapping.
                       </p>
                    </div>
                    <button className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors">Deploy Training Logic →</button>
                 </CardBody>
              </Card>
           </div>
        </div>
      </main>
    </div>
  );
}

function KpiCard({ title, value, trend, icon, color }) {
  const themes = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    blue: 'text-blue-600 bg-blue-600/10',
    rose: 'text-rose-500 bg-rose-500/10',
    indigo: 'text-indigo-600 bg-indigo-600/10',
  };

  return (
    <div className="glass-card p-6 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 hover:shadow-2xl hover:shadow-slate-900/5 transition-all group">
       <div className="flex justify-between items-start mb-4">
          <div className={`size-12 rounded-2xl flex items-center justify-center ${themes[color] || themes.blue} transition-transform group-hover:rotate-6`}>
             <span className="material-symbols-outlined text-2xl font-black">{icon}</span>
          </div>
          <span className={`text-[11px] font-black px-2 py-1 rounded-lg ${themes[color] || themes.blue} border border-current opacity-60`}>{trend}</span>
       </div>
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{title}</p>
       <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{value}</h4>
    </div>
  );
}

function FacilityPerformanceRow({ name, id, claims, accuracy, failure, warning }) {
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300">
       <td className="px-6 py-5">
          <div className="flex flex-col">
             <span className="text-sm font-bold text-slate-800 dark:text-gray-100">{name}</span>
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{id}</span>
          </div>
       </td>
       <td className="px-6 py-5">
          <span className="text-sm font-black text-slate-700 dark:text-gray-300">{claims}</span>
       </td>
       <td className="px-6 py-5">
          <div className="flex items-center gap-3">
             <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-32 shadow-inner">
                <div 
                  className={`h-full rounded-full ${warning ? 'bg-amber-500' : 'bg-blue-600'} transition-all duration-1000`}
                  style={{ width: `${accuracy}%` }}
                ></div>
             </div>
             <span className={`text-xs font-black ${warning ? 'text-amber-600' : 'text-blue-600'}`}>{accuracy}%</span>
          </div>
       </td>
       <td className={`px-6 py-5 text-sm font-black ${warning ? 'text-rose-500' : 'text-slate-500'}`}>{failure}</td>
    </tr>
  );
}

function Bar({ height, label, color }) {
  return (
    <div className="flex flex-col items-center gap-3 w-8 group">
       <div className="relative w-full bg-white/5 rounded-t-xl overflow-hidden h-full flex flex-col justify-end">
          <div 
             className={`w-full ${color} rounded-t-lg transition-all duration-1000 group-hover:opacity-80`}
             style={{ height }}
          ></div>
       </div>
       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}
