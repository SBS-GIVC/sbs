import React, { useState } from 'react';
import { normalizeCode } from '../utils/middleware';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/Toast';

/**
 * Premium Mapping Rules Configuration
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function MappingRulesConfig() {
  const toast = useToast();
  const [testInput, setTestInput] = useState("Appy removal w/ complications");
  const [testResult, setTestResult] = useState({
      code: "Appendectomy (47562)",
      confidence: 92,
      status: "Auto-Accepted"
  });
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    try {
        const result = await normalizeCode("TEST_CODE", testInput);
        setTestResult({
            code: `${result.sbs_code} - ${result.desc.substring(0, 24)}...`,
            confidence: Math.round(result.confidence * 100),
            status: result.confidence > 0.85 ? "Auto-Accepted" : "Review Required"
        });
    } catch (e) {
        setTestResult({
            code: "Resolution Error",
            confidence: 0,
            status: "Failed"
        });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-8 space-y-8 stagger-children">
        
        {/* Header Section */}
        <section className="animate-premium-in">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <SectionHeader 
                title="Orchestration Rules" 
                subtitle="Configure neural confidence thresholds and behavioral overrides for the GIVC-SBS integration engine."
                badge="Governance Engine"
              />
              <div className="flex gap-3">
                 <Button variant="secondary" icon="history" onClick={() => toast.info('Loading version history')}>
                   Version History
                 </Button>
                 <Button icon="restore" onClick={() => toast.success('Default mapping profile restored')}>
                   Node Reset
                 </Button>
              </div>
           </div>
        </section>

        <div className="grid lg:grid-cols-12 gap-8">
           {/* Global Thresholds & Logic Settings */}
           <div className="lg:col-span-5 space-y-8 animate-premium-in" style={{ animationDelay: '100ms' }}>
              <Card>
                 <CardHeader title="Global Logic Thresholds" subtitle="Confidence markers that dictate autonomous relay behavior." />
                 <CardBody className="space-y-10 py-6">
                    <ConfigSlider unit="%" label="Auto-Accept Marker" val={85} color="emerald" hint="Payloads exceeding this marker bypass manual triage." />
                    <ConfigSlider unit="%" label="Review Trigger" val={50} color="amber" hint="Minimum marker required for AI-suggested candidates." />
                    
                    <div className="p-6 bg-blue-600/5 rounded-[28px] border border-blue-600/10 flex gap-4">
                       <span className="material-symbols-outlined text-blue-600 font-black">info</span>
                       <p className="text-xs font-bold text-slate-500 leading-relaxed">
                          Claims falling between <span className="text-blue-600">50% and 84%</span> will be queued for expert verification. Payloads <span className="text-rose-500">below 50%</span> are automatically re-routed for provider correction.
                       </p>
                    </div>
                 </CardBody>
              </Card>

              <Card>
                 <CardHeader title="Operational Heuristics" />
                 <CardBody className="p-0">
                    <ToggleRule label="Fuzzy Normalization" sub="Enable semantic matching for unstructured clinical shorthand." active />
                    <ToggleRule label="Universal SBS Priority" sub="Prefer Saudi-specific V3.1 code systems during conflicts." active />
                    <ToggleRule label="Strict ICD-10 Enforcement" sub="Reject claims missing secondary diagnostic validation." />
                 </CardBody>
              </Card>
           </div>

           {/* Facility Overrides & Simulator */}
           <div className="lg:col-span-7 space-y-8 animate-premium-in" style={{ animationDelay: '200ms' }}>
              <Card className="flex flex-col">
                 <CardHeader 
                   title="Entity Overrides" 
                   subtitle="Region or facility-specific logic that bypasses global heuristics." 
                   action={<Button variant="secondary" size="sm" icon="add" onClick={() => toast.info('Override editor opened')}>Add Override</Button>}
                 />
                 <CardBody className="p-0">
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead className="bg-slate-50 dark:bg-slate-900/40">
                             <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Facility ID</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Behavior</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">Context</th>
                                <th className="px-6 py-4"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                             <OverrideListItem name="City General Hospital" type="Acute" rule="Safety +5%" color="indigo" />
                             <OverrideListItem name="North Surgical Center" type="High Risk" rule="Force ICD-10" color="rose" />
                             <OverrideListItem name="Valley View Clinic" type="Outpatient" rule="Lax Syntax" color="emerald" />
                          </tbody>
                       </table>
                    </div>
                 </CardBody>
              </Card>

              {/* Simulation Playground */}
              <Card className="bg-slate-900 text-white overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <span className="material-symbols-outlined text-[100px] font-black">biotech</span>
                 </div>
                 <CardHeader title="Neural Simulator" subtitle="Validate your governance rules against sample clinical narratives." />
                 <CardBody className="space-y-8">
                    <div className="flex gap-4 items-end">
                       <div className="flex-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Test Narrative</label>
                          <input 
                             className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-6 py-3.5 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                             value={testInput}
                             onChange={(e) => setTestInput(e.target.value)}
                             placeholder="Describe a clinical service..."
                          />
                       </div>
                       <Button loading={loading} icon="play_arrow" className="py-3.5 px-8" onClick={handleSimulate}>Simulate</Button>
                    </div>

                    <div className="glass-panel p-8 rounded-[32px] border border-white/5 relative overflow-hidden flex flex-col sm:flex-row gap-8">
                       <div className={`absolute left-0 top-0 bottom-0 w-2 ${testResult.confidence >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                       <div className="flex-1 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Predicted Normalization</p>
                          <h4 className={`text-2xl font-black tracking-tight ${loading ? 'animate-pulse opacity-50' : ''}`}>{testResult.code}</h4>
                       </div>
                       <div className="text-center sm:text-right space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confidence</p>
                          <h4 className={`text-3xl font-black tracking-tighter ${testResult.confidence >= 85 ? 'text-emerald-500' : 'text-amber-500'}`}>{testResult.confidence}%</h4>
                       </div>
                    </div>

                    <div className="flex justify-center">
                       <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-white/10 ${testResult.confidence >= 85 ? 'text-emerald-500 bg-emerald-500/5' : 'text-amber-500 bg-amber-500/5'}`}>
                          Result: {testResult.status}
                       </span>
                    </div>
                 </CardBody>
              </Card>
           </div>
        </div>
      </main>
    </div>
  );
}

function ConfigSlider({ label, val, color, unit, hint }) {
  const themes = {
    emerald: 'accent-emerald-500 text-emerald-600',
    amber: 'accent-amber-500 text-amber-600',
  };
  return (
    <div className="space-y-4">
       <div className="flex justify-between items-end">
          <div className="space-y-1">
             <label className="text-sm font-black text-slate-800 dark:text-gray-100 leading-none">{label}</label>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hint}</p>
          </div>
          <span className={`text-xl font-black ${themes[color].split(' ')[1]}`}>{val}{unit}</span>
       </div>
       <input type="range" className={`w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none transition-all ${themes[color].split(' ')[0]}`} defaultValue={val} />
    </div>
  );
}

function ToggleRule({ label, sub, active }) {
  return (
    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
       <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800 dark:text-gray-100">{label}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
       </div>
       <div className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${active ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
          <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${active ? 'right-1' : 'left-1'}`}></div>
       </div>
    </div>
  );
}

function OverrideListItem({ name, type, rule, color }) {
  const backgrounds = {
    indigo: 'text-indigo-600 bg-indigo-600/10',
    rose: 'text-rose-600 bg-rose-600/10',
    emerald: 'text-emerald-600 bg-emerald-600/10',
  };
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-300">
       <td className="px-6 py-5">
          <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{name}</p>
       </td>
       <td className="px-6 py-5">
          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${backgrounds[color] || backgrounds.indigo}`}>{type}</span>
       </td>
       <td className="px-6 py-5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
             <span className="material-symbols-outlined text-sm font-black">verified</span>
             {rule}
          </div>
       </td>
       <td className="px-6 py-5 text-right">
          <button className="text-slate-300 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
       </td>
    </tr>
  );
}
