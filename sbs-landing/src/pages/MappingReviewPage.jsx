import React, { useState, useEffect } from 'react';
import { normalizeCode } from '../utils/middleware';

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
    // Simulate initial AI Analysis on mount
    handleAIAnalysis();
  }, []);

  const handleAIAnalysis = async () => {
    setLoading(true);
    try {
        // Call the util which calls the API (or mocks it if backend offline)
        const result = await normalizeCode(sourceData.code, sourceData.desc);
        
        // Transform result into a list of recommendations
        // Since normalizeCode returns one best match, we will use it as the top match
        
        const topMatch = {
            code: result.sbs_code,
            desc: result.desc,
            confidence: Math.round(result.confidence * 100),
            reason: result.rationale,
            isTop: true
        };

        const alternatives = [
            { code: "SBS-9024", desc: "Generic PCR, Single Target, Respiratory", confidence: 42 },
            { code: "SBS-8810", desc: "Pathology Consult, Comprehensive", confidence: 15 }
        ];

        setRecommendations([topMatch, ...alternatives]);
        setSelectedMapping(topMatch); // Auto-select top match
    } catch (error) {
        console.error("AI Analysis failed", error);
        // Fallback to static data if API completely fails
        setRecommendations([
            { code: "SBS-9021", desc: "Respiratory Viral Panel, Multiplex PCR, 3-5 Targets", confidence: 65, reason: "Error fetching live data. Showing cached prediction.", isTop: true }
        ]);
    } finally {
        setLoading(false);
    }
  };

  const handleSelect = (rec) => {
    setSelectedMapping(rec);
  };

  const handleConfirm = () => {
    // Here we would POST to the backend to save the mapping
    console.log("Saving Mapping:", { source: sourceData, mapped: selectedMapping });
    alert(`Mapping Confirmed:\n${sourceData.code} -> ${selectedMapping.code}`);
  };

  const handleReject = () => {
      console.log("Rejected Mapping:", sourceData.code);
      alert("Mapping Rejected. Sent to manual queue.");
  }

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden h-full">
        {/* Column 1: Source Data (HIS) */}
        <div className="lg:col-span-3 border-r border-slate-200 dark:border-[#233648] bg-white dark:bg-[#111a22] flex flex-col overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#233648] flex items-center justify-between sticky top-0 bg-white dark:bg-[#111a22] z-10">
                <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 dark:text-[#92adc9] text-[20px]">dataset</span>
                    Source Data (HIS)
                </h3>
            </div>
            <div className="p-5 flex flex-col gap-6">
                <div className="bg-slate-50 dark:bg-surface-dark rounded-lg p-4 border border-slate-200 dark:border-[#233648]">
                    <div className="flex flex-col gap-4">
                        <Field label="Internal Code" value={sourceData.code} isCode />
                        <Field label="Description" value={sourceData.desc} />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Service Date" value={sourceData.date} />
                            <Field label="Source System" value={sourceData.system} />
                        </div>
                        <Field label="Department" value={sourceData.dept} />
                    </div>
                </div>
                <div className="border-t border-slate-200 dark:border-[#233648] pt-4">
                    <h4 className="text-xs font-semibold text-slate-500 dark:text-[#92adc9] mb-3">Context Metadata</h4>
                    <div className="flex flex-col gap-2">
                        <MetaRow label="Encounter Type" value="Inpatient" />
                        <MetaRow label="Ordering Phys." value="Dr. J. Doe" />
                    </div>
                </div>
            </div>
        </div>

        {/* Column 2: AI Recommendations */}
        <div className="lg:col-span-5 border-r border-slate-200 dark:border-[#233648] bg-slate-50 dark:bg-[#0d1218] flex flex-col overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#233648] flex items-center justify-between sticky top-0 bg-slate-50 dark:bg-[#0d1218] z-10 backdrop-blur-md">
                <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">auto_awesome</span>
                    AI Recommendations
                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full border border-primary/20">Gemini 1.5 Pro</span>
                </h3>
                <button 
                    onClick={handleAIAnalysis}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    disabled={loading}
                >
                    {loading ? 'Analyzing...' : 'Refresh'}
                </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-sm">Analyzing clinical text...</p>
                    </div>
                ) : (
                    recommendations.map((rec, idx) => (
                        <RecCard 
                            key={idx}
                            code={rec.code} 
                            desc={rec.desc}
                            confidence={rec.confidence}
                            reason={rec.reason}
                            isTop={rec.isTop}
                            onSelect={() => handleSelect(rec)}
                            isSelected={selectedMapping?.code === rec.code}
                        />
                    ))
                )}
            </div>
        </div>

        {/* Column 3: Mapping Workspace */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111a22] flex flex-col h-full relative z-0">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#233648] sticky top-0 bg-white dark:bg-[#111a22] z-10">
                <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-400 dark:text-[#92adc9] text-[20px]">fact_check</span>
                    Mapping Workspace
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pb-24">
                <div className="mb-8">
                    <label className="block text-sm font-medium text-slate-700 dark:text-[#92adc9] mb-2">Search Full Registry</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
                        <input className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#182430] border border-slate-200 dark:border-[#324d67] rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" placeholder="Search by code or keywords (e.g. 'Viral Panel')" type="text"/>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-[#92adc9]">Selected Target</label>
                        <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span> Ready
                        </span>
                    </div>
                    {selectedMapping ? (
                        <div className="border border-primary/30 bg-primary/5 dark:bg-[#137fec]/10 rounded-lg p-4 relative overflow-hidden transition-all duration-300">
                            <div className="absolute top-0 right-0 p-2 opacity-10 text-primary">
                                <span className="material-symbols-outlined text-6xl">bookmark</span>
                            </div>
                            <p className="text-xs text-primary font-bold uppercase tracking-wide mb-1">Proposed Mapping</p>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{selectedMapping.code}</h2>
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{selectedMapping.desc}</p>
                            <div className="mt-4 pt-3 border-t border-primary/10 flex gap-4">
                                <div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Category</span>
                                    <span className="text-xs font-medium text-slate-900 dark:text-white">Laboratory</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Effective</span>
                                    <span className="text-xs font-medium text-slate-900 dark:text-white">Jan 01, 2023</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center text-slate-400">
                             <span className="material-symbols-outlined text-4xl mb-2">touch_app</span>
                             <p className="text-sm">Select a recommendation to map</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-[#92adc9] mb-2">Comments (Optional)</label>
                        <textarea className="w-full p-3 bg-slate-50 dark:bg-[#182430] border border-slate-200 dark:border-[#324d67] rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none" placeholder="Add notes for audit trail..." rows="3"></textarea>
                    </div>
                    <div className="flex items-center gap-2">
                        <input className="rounded border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-primary focus:ring-primary h-4 w-4" id="flagReview" type="checkbox"/>
                        <label className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer" htmlFor="flagReview">Flag for senior review</label>
                    </div>
                </div>
            </div>
            
            <div className="absolute bottom-0 left-0 w-full p-6 bg-white dark:bg-[#111a22] border-t border-slate-200 dark:border-[#233648] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-none z-20">
                <div className="flex gap-3">
                    <button 
                        onClick={handleReject}
                        className="flex-1 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-medium px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">block</span>
                        Reject
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!selectedMapping}
                        className={`flex-[2] rounded-lg text-sm font-bold px-4 py-2.5 transition-colors shadow-md flex items-center justify-center gap-2 ${selectedMapping ? 'bg-primary hover:bg-blue-600 text-white shadow-blue-500/20' : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">check</span>
                        Confirm Mapping
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}

function Field({ label, value, isCode }) {
    return (
        <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#92adc9] mb-1 block">{label}</label>
            {isCode ? (
                <div className="font-mono text-sm bg-slate-200 dark:bg-[#233648] px-2 py-1 rounded text-slate-900 dark:text-white inline-block">{value}</div>
            ) : (
                <p className="text-slate-900 dark:text-white text-sm leading-relaxed font-medium">{value}</p>
            )}
        </div>
    )
}

function MetaRow({ label, value }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-slate-900 dark:text-white font-medium">{value}</span>
        </div>
    )
}

function RecCard({ code, desc, confidence, reason, isTop, opacity, onSelect, isSelected }) {
    // Tailwind dynamic classes don't work with string interpolation fully if not safe-listed, but common colors like these usually work.
    const ringColor = confidence > 60 ? 'ring-emerald-500/30' : confidence > 30 ? 'ring-amber-500/30' : 'ring-slate-500/30';
    const textColor = confidence > 60 ? 'text-emerald-600 dark:text-emerald-400' : confidence > 30 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400';
    const bgColor = confidence > 60 ? 'bg-emerald-500/10' : confidence > 30 ? 'bg-amber-500/10' : 'bg-slate-200 dark:bg-slate-700';
    
    // Add visual indicator if selected
    const selectedClass = isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'border-slate-200 dark:border-[#233648] bg-white dark:bg-surface-dark';

    return (
        <div className={`group relative rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${opacity ? 'opacity-80 hover:opacity-100' : ''} ${selectedClass}`}>
            {isTop && !isSelected && (
                <div className="absolute -top-3 left-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">Top Match</div>
            )}
            {isSelected && (
                 <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">check</span> Selected
                 </div>
            )}
            
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center size-10 rounded-full ${bgColor} ${textColor} font-bold text-sm ${isTop ? `ring-1 ${ringColor}` : ''}`}>
                        {confidence}%
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-slate-900 dark:text-white font-bold text-lg">{code}</h4>
                            {isTop && <span className="material-symbols-outlined text-slate-400 text-[16px] cursor-help" title="Standard Billing Service v2.0">info</span>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-[#92adc9]">V2.0 Laboratory</p>
                    </div>
                </div>
                <button 
                    onClick={onSelect}
                    className={`rounded-lg text-sm font-medium px-4 py-2 transition-colors ${isSelected ? 'bg-primary text-white cursor-default' : 'border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white'}`}
                >
                    {isSelected ? 'Selected' : 'Select'}
                </button>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-sm mb-3">{desc}</p>
            {reason && (
                <div className="bg-slate-100 dark:bg-[#111a22] rounded p-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Match Reason:</span> {reason}
                </div>
            )}
            <div className="mt-3 flex gap-3 text-xs font-medium">
                <a href="#" className="text-primary hover:text-blue-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">visibility</span> View Definition
                </a>
                {isTop && (
                    <a href="#" className="text-slate-500 hover:text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">compare_arrows</span> Diff View
                    </a>
                )}
            </div>
        </div>
    )
}
