/**
 * Premium Smart Claim Analyzer
 * AI-Powered Real-time Clinical Vector Analysis 
 */

import React, { useState, useEffect } from 'react';
import { callGemini } from '../services/geminiService';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

const ANALYSIS_CATEGORIES = [
  { id: 'compliance', icon: 'verified', label: 'Safety Hub', color: 'emerald' },
  { id: 'optimization', icon: 'query_stats', label: 'Yield Ops', color: 'amber' },
  { id: 'risk', icon: 'shield_alert', label: 'Risk Vector', color: 'rose' },
  { id: 'prediction', icon: 'psychology', label: 'Neural Out', color: 'blue' },
];

export function SmartClaimAnalyzer({ claimData, isOpen, onClose, onApplySuggestion }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('compliance');
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());

  useEffect(() => {
    if (isOpen && claimData) runAnalysis();
  }, [isOpen]);

  const runAnalysis = async () => {
    if (!claimData) return;
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const prompt = `Full Neural Analysis of Claim: ${JSON.stringify(claimData, null, 2)}. Provide JSON with approvalProbability, estimatedProcessingDays, overallScore, compliance, optimization, risk, and prediction details.`;
      const response = await callGemini(prompt, "Saudi SBS Healthcare Analyst Expert. Output JSON strictly.");
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) setAnalysis(JSON.parse(jsonMatch[0]));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestion = (suggestion, index) => {
    setAppliedSuggestions(prev => new Set([...prev, index]));
    onApplySuggestion?.(suggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-full flex flex-col bg-white dark:bg-slate-950 rounded-[48px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.6)] border border-white/5 animate-premium-in overflow-hidden">
        
        {/* Dynamic Header */}
        <header className="px-12 py-12 flex flex-col md:flex-row justify-between items-center gap-8 border-b border-slate-100 dark:border-white/5 relative">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <span className="material-symbols-outlined text-[160px] font-black">neurology</span>
          </div>
          <div className="flex items-center gap-8 relative z-10">
             <div className="size-20 rounded-[32px] bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/40">
                <span className="material-symbols-outlined text-4xl text-white">analytics</span>
             </div>
             <div className="space-y-1">
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">Inference Engine</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Autonomous clinical auditing active</p>
             </div>
          </div>

          <div className="flex gap-4 relative z-10">
             <Button variant="secondary" icon="refresh" loading={isAnalyzing} onClick={runAnalysis}>Recalibrate</Button>
             <button onClick={onClose} className="size-14 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
             </button>
          </div>
        </header>

        {/* Neural Metrics Bar */}
        {analysis && !isAnalyzing && (
           <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-white/5 border-b border-slate-100 dark:border-white/5">
              <KpiTile label="Approval Likelihood" value={`${analysis.approvalProbability}%`} color="blue" />
              <KpiTile label="Neural Score" value={`${analysis.overallScore}/100`} color="emerald" />
              <KpiTile label="Adjudication ETA" value={`${analysis.estimatedProcessingDays}D`} color="amber" />
              <KpiTile label="Yield Gain" value={`${analysis.optimization?.potentialSavings || 0} SAR`} color="rose" />
           </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
           {/* Sidebar Navigation */}
           <aside className="w-full lg:w-72 border-r border-slate-100 dark:border-white/5 p-8 flex flex-col gap-3 shrink-0">
              {ANALYSIS_CATEGORIES.map(cat => (
                 <button 
                  key={cat.id} 
                  onClick={() => setActiveTab(cat.id)}
                  className={`flex items-center gap-4 px-6 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === cat.id 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                      : 'text-slate-500 hover:text-blue-600 hover:bg-blue-600/5'
                  }`}
                 >
                    <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                    {cat.label}
                 </button>
              ))}
           </aside>

           {/* Main Work Context */}
           <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
              {isAnalyzing ? (
                 <div className="h-full flex flex-col items-center justify-center space-y-8 animate-pulse">
                    <div className="relative">
                       <div className="size-24 rounded-full border-4 border-blue-600/10 border-t-blue-600 animate-spin"></div>
                       <div className="absolute inset-0 flex items-center justify-center">
                          <span className="material-symbols-outlined text-blue-600 text-3xl">psychology</span>
                       </div>
                    </div>
                    <div className="text-center space-y-2">
                       <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Running DeepSeek-V4 Inference</h3>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comparing clinical vectors against CHI regulatory dataset</p>
                    </div>
                 </div>
              ) : analysis ? (
                 <div className="max-w-4xl mx-auto space-y-12 animate-premium-in">
                    {activeTab === 'compliance' && (
                       <div className="space-y-8">
                          <div className={`p-8 rounded-[38px] flex items-center justify-between gap-12 ${analysis.compliance?.status === 'passing' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
                             <div className="space-y-2">
                                <h3 className={`text-4xl font-black uppercase tracking-tighter ${analysis.compliance?.status === 'passing' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                   {analysis.compliance?.status === 'passing' ? 'REGULATORY SECURE' : 'COMPLIANCE VOID'}
                                </h3>
                                <p className="text-sm font-bold text-slate-500 italic">"Global score of {analysis.compliance?.score}% based on CHI-SBS criteria."</p>
                             </div>
                             <div className="size-24 rounded-full border-8 border-current flex items-center justify-center text-3xl font-black opacity-20">
                                {analysis.compliance?.score}%
                             </div>
                          </div>
                          <div className="grid gap-4">
                             {analysis.compliance?.items?.map((item, i) => <ComplianceCell key={i} item={item} />)}
                          </div>
                       </div>
                    )}

                    {activeTab === 'optimization' && (
                       <div className="grid sm:grid-cols-2 gap-6">
                          {analysis.optimization?.items?.map((item, i) => (
                             <OptimizationCell 
                              key={i} 
                              item={item} 
                              applied={appliedSuggestions.has(`opt-${i}`)}
                              onApply={() => handleApplySuggestion(item, `opt-${i}`)}
                             />
                          ))}
                       </div>
                    )}

                    {activeTab === 'risk' && (
                       <div className="space-y-8">
                          <div className="p-8 rounded-[40px] bg-slate-950 text-white relative overflow-hidden">
                             <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-3xl"></div>
                             <div className="relative z-10 flex justify-between items-center">
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rejection Probability</p>
                                   <h4 className={`text-5xl font-black tracking-tighter ${analysis.risk?.rejectionProbability > 40 ? 'text-rose-500' : 'text-blue-500'}`}>{analysis.risk?.rejectionProbability}%</h4>
                                </div>
                                <div className="h-2 w-72 bg-white/10 rounded-full overflow-hidden">
                                   <div className={`h-full ${analysis.risk?.rejectionProbability > 40 ? 'bg-rose-500' : 'bg-blue-600'} transition-all duration-1000`} style={{ width: `${analysis.risk?.rejectionProbability}%` }}></div>
                                </div>
                             </div>
                          </div>
                          <div className="grid gap-4">
                             {analysis.risk?.items?.map((item, i) => <RiskCell key={i} item={item} />)}
                          </div>
                       </div>
                    )}

                    {activeTab === 'prediction' && (
                       <div className="grid gap-8">
                          <Card className="bg-blue-600 text-white border-none shadow-2xl shadow-blue-600/20">
                             <CardBody className="p-10 space-y-6">
                                <span className="material-symbols-outlined text-4xl font-black">electric_bolt</span>
                                <h3 className="text-3xl font-black tracking-tighter leading-tight italic">"{analysis.prediction?.summary}"</h3>
                                <div className="flex gap-4">
                                   {analysis.prediction?.recommendations?.slice(0, 2).map((r, i) => (
                                      <p key={i} className="text-xs font-black uppercase tracking-widest text-white/60"># {r}</p>
                                   ))}
                                </div>
                             </CardBody>
                          </Card>
                          
                          <div className="grid sm:grid-cols-2 gap-8">
                             <PredictionTile label="NPHIES Adjudication Rate" value={`${analysis.prediction?.similarClaimsApprovalRate}%`} sub="Historical accuracy in sector" />
                             <PredictionTile label="Prior Auth Trigger" value={analysis.prediction?.priorAuthRequired ? 'Required' : 'Automated'} sub={analysis.prediction?.priorAuthItems?.[0] || 'Clean pathway'} />
                          </div>
                       </div>
                    )}
                 </div>
              ) : null}
           </div>
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, color }) {
   const colors = {
      blue: 'text-blue-600',
      emerald: 'text-emerald-500',
      amber: 'text-amber-500',
      rose: 'text-rose-500',
   };
   return (
      <div className="p-10 text-center space-y-2">
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
         <h4 className={`text-4xl font-black tracking-tighter ${colors[color]}`}>{value}</h4>
      </div>
   );
}

function ComplianceCell({ item }) {
   return (
      <div className={`p-8 rounded-[32px] border flex gap-6 items-center ${item.status === 'pass' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
         <div className={`p-3 rounded-2xl ${item.status === 'pass' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            <span className="material-symbols-outlined text-xl font-black">{item.status === 'pass' ? 'check' : 'close'}</span>
         </div>
         <div className="flex-1 space-y-1">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">{item.title}</h4>
            <p className="text-xs font-bold text-slate-500 opacity-80">{item.description}</p>
         </div>
         {item.fix && <div className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-blue-600">Manual Resolve</div>}
      </div>
   );
}

function OptimizationCell({ item, applied, onApply }) {
   return (
      <Card className={`group relative overflow-hidden transition-all ${applied ? 'border-emerald-500 bg-emerald-500/5 shadow-2xl shadow-emerald-500/10' : 'border-amber-500/20'}`}>
         <CardBody className="p-8 space-y-6">
            <div className="flex justify-between items-start">
               <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <span className="material-symbols-outlined">{item.type === 'bundle' ? 'inventory_2' : 'payments'}</span>
               </div>
               <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1 rounded">High Impact</span>
            </div>
            <div className="space-y-1">
               <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.title}</h4>
               <p className="text-xs font-bold text-slate-500 leading-relaxed italic">"{item.description}"</p>
            </div>
            <button 
              onClick={onApply} 
              disabled={applied}
              className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${applied ? 'bg-emerald-500 text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xl'}`}
            >
               {applied ? 'Optimization Synchronized' : 'Analyze & Inject'}
            </button>
         </CardBody>
      </Card>
   );
}

function RiskCell({ item }) {
   return (
      <div className="p-8 rounded-[38px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex justify-between items-center group">
         <div className="flex gap-6 items-center">
            <div className={`p-4 rounded-2xl ${item.severity === 'high' ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'}`}>
               <span className="material-symbols-outlined text-xl font-black text-white">shield_alert</span>
            </div>
            <div className="space-y-1">
               <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tighter uppercase">{item.title}</h4>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol: Neural-Scan V4</p>
            </div>
         </div>
         <div className="text-right">
            <p className="text-xs font-bold text-slate-500 mb-2 italic px-8">"{item.description}"</p>
         </div>
      </div>
   );
}

function PredictionTile({ label, value, sub }) {
   return (
      <div className="p-10 rounded-[44px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
         <h4 className="text-5xl font-black tracking-tighter text-blue-600">{value}</h4>
         <p className="text-xs font-bold text-slate-500 italic">#{sub}</p>
      </div>
   );
}
