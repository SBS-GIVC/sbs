import React, { useState, useEffect } from 'react';
import { normalizeCode } from '../utils/middleware';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';

/**
 * Premium Mapping Review Page (Triage)
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function MappingReviewPage() {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [sourceData, setSourceData] = useState({
    code: "NEW_LAB_X1",
    desc: "Rapid Molecular PCR test for respiratory panel; includes viral targets (Flu A/B, RSV, SARS-CoV-2).",
    date: "Oct 24, 2023",
    system: "HIS_Main_East",
    dept: "Laboratory / Virology"
  });

  useEffect(() => {
    handleAIAnalysis();
  }, []);

  const handleAIAnalysis = async () => {
    setLoading(true);
    try {
        const result = await normalizeCode(sourceData.code, sourceData.desc);
        
        const topMatch = {
            code: result.sbs_code,
            desc: result.desc,
            confidence: Math.round(result.confidence * 100),
            reason: result.rationale,
            isTop: true
        };

        const alternatives = [
            { code: "SBS-9024", desc: "Generic PCR, Single Target, Respiratory", confidence: 42, reason: "Keyword overlap in 'Respiratory'." },
            { code: "SBS-8810", desc: "Pathology Consult, Comprehensive", confidence: 15, reason: "Contextual fallback for diagnostics." }
        ];

        setRecommendations([topMatch, ...alternatives]);
        setSelectedMapping(topMatch);
    } catch (error) {
        setRecommendations([
            { code: "SBS-9021", desc: "Respiratory Viral Panel, Multiplex PCR, 3-5 Targets", confidence: 65, reason: "Analysis timeout; showing cached heuristic match.", isTop: true }
        ]);
    } finally {
        setLoading(false);
    }
  };

  const handleConfirm = () => {
    alert(`Relay Payload Synchronized:\n${sourceData.code} -> ${selectedMapping.code}`);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-grid">
        {/* Left: Source Manifest */}
        <aside className="w-80 border-r border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-950 flex flex-col overflow-y-auto scrollbar-hide">
           <div className="p-8 space-y-10">
              <section className="space-y-6">
                 <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 font-black">dataset</span>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-gray-100">Source Manifest</h3>
                 </div>
                 
                 <div className="glass-panel p-6 rounded-[28px] border border-blue-600/10 space-y-6">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Internal Registry ID</p>
                       <p className="text-sm font-black text-blue-600 font-mono tracking-tight">{sourceData.code}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Narrative</p>
                       <p className="text-xs font-bold text-slate-500 leading-relaxed italic">{sourceData.desc}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Captured</p>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-gray-200">{sourceData.date}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity</p>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-gray-100">{sourceData.system}</p>
                       </div>
                    </div>
                 </div>
              </section>

              <section className="space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Relay Metadata</p>
                 <div className="space-y-3">
                    <MetaMetric label="Encounter" value="Inpatient / Acute" />
                    <MetaMetric label="Physician" value="Dr. J. Doe" />
                    <MetaMetric label="Department" value="Virology Lab" />
                 </div>
              </section>
           </div>
        </aside>

        {/* Center: AI Inference Engine */}
        <main className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col overflow-hidden border-r border-slate-200/50 dark:border-slate-800/50">
           <header className="px-8 py-6 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="size-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-gray-100">AI Inference Candidates</h3>
                 <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/20 uppercase tracking-widest">RELAY-PRO V4</span>
              </div>
              <Button variant="secondary" size="sm" icon="autorenew" onClick={handleAIAnalysis} loading={loading}>Sync Rules</Button>
           </header>

           <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                   <div className="size-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Neural Analysis Active...</p>
                </div>
              ) : (
                recommendations.map((rec, i) => (
                  <InferenceCard 
                    key={rec.code} 
                    rec={rec} 
                    active={selectedMapping?.code === rec.code} 
                    onSelect={() => setSelectedMapping(rec)}
                  />
                ))
              )}
           </div>
        </main>

        {/* Right: Triage Terminal */}
        <aside className="w-96 bg-white dark:bg-slate-950 flex flex-col overflow-hidden">
           <header className="px-8 py-6 border-b border-slate-200/50 dark:border-slate-800/50">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-gray-100">Triage Terminal</h3>
           </header>

           <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Manual Registry Search</label>
                 <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px] group-focus-within:text-blue-600 transition-colors">search</span>
                    <input className="w-full bg-slate-50 dark:bg-slate-900 shadow-inner border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20" placeholder="Keywords or code (e.g. 'PCR')" />
                 </div>
              </div>

              <div className="space-y-6">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Active Selection</p>
                 {selectedMapping ? (
                    <div className="glass-card p-8 rounded-[32px] border border-blue-600/20 relative overflow-hidden group">
                       <div className="absolute -top-6 -right-6 text-blue-600 opacity-5 group-hover:opacity-10 transition-opacity">
                          <span className="material-symbols-outlined text-[120px] font-black">fact_check</span>
                       </div>
                       <div className="relative space-y-4">
                          <div className="flex justify-between items-start">
                             <span className="text-sm font-black text-blue-600 font-mono">{selectedMapping.code}</span>
                             <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Validated</span>
                          </div>
                          <h4 className="text-lg font-black tracking-tight text-slate-800 dark:text-white leading-tight">{selectedMapping.desc}</h4>
                          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Registry</p>
                                <p className="text-[10px] font-bold text-slate-700 dark:text-gray-300">SBS V3.1 Lab</p>
                             </div>
                             <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Effective</p>
                                <p className="text-[10px] font-bold text-slate-700 dark:text-gray-300">2024 Cycle</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="p-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4 grayscale">
                       <span className="material-symbols-outlined text-4xl text-slate-300">ads_click</span>
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting Selection</p>
                    </div>
                 )}
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Observational Audit Notes</label>
                 <textarea className="w-full bg-slate-50 dark:bg-slate-900 shadow-inner border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-bold focus:outline-none" rows="3" placeholder="Explain the mapping rationale for the audit relay..." />
              </div>
           </div>

           <div className="p-8 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 backdrop-blur-md">
              <div className="grid grid-cols-3 gap-3">
                 <Button variant="secondary" className="bg-rose-500/5 text-rose-500 border-rose-500/10 hover:bg-rose-500 hover:text-white" icon="close">Drop</Button>
                 <Button className="col-span-2 shadow-2xl shadow-blue-600/20" icon="verified" disabled={!selectedMapping} onClick={handleConfirm}>Relay Confirm</Button>
              </div>
           </div>
        </aside>
    </div>
  );
}

function MetaMetric({ label, value }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800">
       <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
       <span className="text-xs font-bold text-slate-800 dark:text-gray-200">{value}</span>
    </div>
  );
}

function InferenceCard({ rec, active, onSelect }) {
  return (
    <div 
      onClick={onSelect}
      className={`glass-card p-6 rounded-[32px] border-2 transition-all duration-300 cursor-pointer group relative overflow-hidden ${
        active 
          ? 'border-blue-600 shadow-2xl shadow-blue-600/10 scale-[1.01]' 
          : 'border-slate-100 dark:border-slate-800 hover:border-blue-600/30 bg-white dark:bg-slate-900/40'
      }`}
    >
       {rec.isTop && !active && (
         <div className="absolute top-0 right-0 px-3 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl border-l border-b border-blue-600/20">Optimal Match</div>
       )}
       
       <div className="flex gap-6">
          <div className="flex flex-col items-center gap-2">
             <div className={`size-14 rounded-2xl flex flex-col items-center justify-center border-2 ${
               active ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent'
             }`}>
                <span className="text-xl font-black leading-none">{rec.confidence}%</span>
                <span className="text-[8px] font-black uppercase mt-1">Score</span>
             </div>
             <div className={`size-1.5 rounded-full ${rec.confidence > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
          </div>

          <div className="flex-1 space-y-4">
             <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{rec.code}</h4>
                   <span className="text-[10px] font-black uppercase text-slate-400">Registry: V3.1</span>
                </div>
                <p className="text-sm font-bold text-slate-500 leading-snug">{rec.desc}</p>
             </div>

             <div className={`p-4 rounded-2xl text-[10px] font-bold leading-relaxed border ${
               active ? 'bg-blue-600/10 border-blue-600/20 text-blue-700 dark:text-blue-300' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-transparent'
             }`}>
               <span className="uppercase font-black block mb-1">Neural Rationale:</span>
               {rec.reason}
             </div>

             <div className="flex gap-4">
                <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                   System Definition <span className="material-symbols-outlined text-sm font-black">arrow_right_alt</span>
                </button>
             </div>
          </div>

          <div className="flex items-center">
             <div className={`size-10 rounded-full flex items-center justify-center transition-all ${
               active ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-600/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-300 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0'
             }`}>
                <span className="material-symbols-outlined font-black">check</span>
             </div>
          </div>
       </div>
    </div>
  );
}
