import React from 'react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/Toast';

/**
 * Premium Facility Usage & Quota Management
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function FacilityUsagePage() {
  const toast = useToast();

  const openView = (view, message) => {
    toast.info(message);
    window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view } }));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Header Section */}
        <section className="animate-premium-in">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <SectionHeader 
                title="Usage & Quota Management" 
                subtitle="Orchestrate API throughput limits and manage burst quotas across your clinical network."
                badge="Operational Governance"
              />
              <div className="flex gap-3">
                 <Button variant="secondary" icon="analytics" onClick={() => openView('facility_performance', 'Opening usage performance report')}>
                   Usage Report
                 </Button>
                 <Button icon="add_location" onClick={() => openView('settings', 'Provisioning workflow opened in settings')}>
                   Provision Node
                 </Button>
              </div>
           </div>

           <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              <UsageStat title="Global Throughput" value="1.2M" unit="req/day" trend="+12%" color="blue" />
              <UsageStat title="Network Utilization" value="64%" unit="capacity" trend="+5%" color="indigo" />
              <UsageStat title="Active Endpoints" value="142" unit="nodes" trend="+2 new" color="emerald" />
              <UsageStat title="Limit Violation" value="3" unit="critical" trend="Action Required" color="rose" />
           </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-8">
              {/* Controls */}
              <Card className="animate-premium-in" style={{ animationDelay: '100ms' }}>
                 <CardBody className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1">
                       <Input icon="search" placeholder="Filter nodes by identifier or facility name..." />
                    </div>
                    <div className="flex gap-2">
                       <Button variant="secondary" icon="tune" onClick={() => openView('mapping_rules', 'Opening governance rules')}>
                         Governance
                       </Button>
                       <Button variant="secondary" icon="sort" onClick={() => toast.success('Facilities sorted by utilization')}>
                         Priority Sort
                       </Button>
                    </div>
                 </CardBody>
              </Card>

              {/* Facility Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-premium-in" style={{ animationDelay: '200ms' }}>
                 <FacilityUsageCard name="Dammam General Hospital" id="HOSP-DAM-003" usage={95} current="95k" max="100k" color="rose" region="East" rpm={300} />
                 <FacilityUsageCard name="King Fahd Medical City" id="HOSP-RIY-001" usage={45} current="45k" max="100k" color="blue" region="Central" rpm={500} />
                 <FacilityUsageCard name="Jeddah Clinic Main" id="CLINIC-JED-05" usage={82} current="41k" max="50k" color="amber" region="West" rpm={250} />
                 <FacilityUsageCard name="National Guard Health" id="HOSP-RIY-004" usage={14} current="28k" max="200k" color="emerald" region="Central" rpm={1000} />
              </div>
           </div>

           {/* Sidebar Config */}
           <div className="space-y-6">
              <Card className="animate-premium-in sticky top-8" style={{ animationDelay: '300ms' }}>
                 <CardHeader title="Registry Governance" subtitle="Global threshold configuration for network relaying." />
                 <CardBody className="space-y-8">
                    <div className="space-y-6">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trigger Thresholds</p>
                       <ConfigRange label="Warning Alert" val="80%" color="amber" />
                       <ConfigRange label="Critical Throttle" val="95%" color="rose" />
                    </div>

                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notifications</p>
                       <CheckToggle label="Network Admin Relay" active />
                       <CheckToggle label="SMS Critical Alert" active />
                       <CheckToggle label="Webhook Integrations" />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Relay Recipients</label>
                       <textarea className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20" rows="3" placeholder="admin@health.sa, ops@relay.sa" />
                    </div>

                    <Button
                      className="w-full py-4 rounded-2xl shadow-xl shadow-blue-600/10"
                      onClick={() => toast.success('Global usage governance rule applied')}
                    >
                      Apply Global Rule
                    </Button>
                 </CardBody>
              </Card>
           </div>
        </div>
      </main>
    </div>
  );
}

function UsageStat({ title, value, unit, trend, color }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-600/10',
    indigo: 'text-indigo-600 bg-indigo-600/10',
    emerald: 'text-emerald-600 bg-emerald-600/10',
    rose: 'text-rose-600 bg-rose-600/10',
  };

  return (
    <div className="glass-card p-6 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-600/30 transition-all group overflow-hidden relative">
       <div className={`absolute bottom-0 left-0 h-1 bg-current opacity-20 ${colors[color].split(' ')[0]}`} style={{ width: '100%' }}></div>
       <div className={`absolute bottom-0 left-0 h-1 bg-current ${colors[color].split(' ')[0]}`} style={{ width: value.includes('%') ? value : '65%' }}></div>
       
       <div className="flex justify-between items-start mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border border-current ${colors[color]}`}>{trend}</span>
       </div>
       <div className="flex items-baseline gap-2">
          <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h4>
          <span className="text-[10px] font-black uppercase text-slate-400">{unit}</span>
       </div>
    </div>
  );
}

function FacilityUsageCard({ name, id, usage, current, max, color, region, rpm }) {
  const colors = {
    rose: 'from-rose-500 to-pink-500 text-rose-500',
    blue: 'from-blue-500 to-indigo-500 text-blue-500',
    amber: 'from-amber-500 to-orange-500 text-amber-500',
    emerald: 'from-emerald-500 to-teal-500 text-emerald-500',
  };

  return (
    <Card className={`border-t-4 transition-all hover:scale-[1.02] ${usage > 90 ? 'border-t-rose-500' : 'border-t-blue-600'}`}>
       <CardBody className="p-6 space-y-6">
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-3">
                <div className={`size-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${colors[color].split(' ')[2]}`}>
                   <span className="material-symbols-outlined text-xl">hub</span>
                </div>
                <div>
                   <h3 className="text-sm font-black text-slate-800 dark:text-gray-100 leading-none">{name}</h3>
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{region} Operational</span>
                </div>
             </div>
             <span className={`text-[9px] font-black uppercase px-2 py-1 rounded bg-slate-900 text-white tracking-widest`}>{id}</span>
          </div>

          <div className="flex items-center gap-8 py-2">
             <div className="relative size-28 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent transition-all duration-1000" style={{ transform: `rotate(${usage * 3.6}deg)` }}></div>
                <div className="text-center">
                   <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{usage}%</p>
                   <p className="text-[8px] font-black uppercase text-slate-400 mt-1">Utilization</p>
                </div>
             </div>
             <div className="flex-1 space-y-4">
                <div className="space-y-1">
                   <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                      <span>Live Payload</span>
                      <span className="text-slate-900 dark:text-white">{current} / {max}</span>
                   </div>
                   <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                      <div className={`h-full bg-gradient-to-r ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]} transition-all duration-1000`} style={{ width: `${usage}%` }}></div>
                   </div>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase text-slate-500">Autonomous Throttling</span>
                   <div className="w-8 h-4 bg-blue-600 rounded-full relative">
                      <div className="absolute right-1 top-1 size-2 bg-white rounded-full"></div>
                   </div>
                </div>
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Daily Cap</label>
                <input className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold" type="text" defaultValue={max} />
             </div>
             <div className="space-y-1.5">
                <div className="flex justify-between">
                   <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Rate Limit</label>
                   <span className="text-[9px] font-black text-blue-600">{rpm} RPM</span>
                </div>
                <input type="range" className="w-full accent-blue-600 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none" defaultValue={rpm} max="1000" />
             </div>
          </div>
       </CardBody>
    </Card>
  );
}

function ConfigRange({ label, val, color }) {
  const colors = {
    amber: 'accent-amber-500 text-amber-500',
    rose: 'accent-rose-500 text-rose-500',
  };
  return (
    <div className="space-y-3">
       <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 dark:text-gray-300">{label}</span>
          <span className={`text-xs font-black ${colors[color].split(' ')[1]}`}>{val}</span>
       </div>
       <input type="range" className={`w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none ${colors[color].split(' ')[0]}`} defaultValue={parseInt(val)} />
    </div>
  );
}

function CheckToggle({ label, active }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
       <span className="text-xs font-bold text-slate-600 dark:text-gray-300">{label}</span>
       <div className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${active ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
          <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${active ? 'right-1' : 'left-1'}`}></div>
       </div>
    </div>
  );
}
