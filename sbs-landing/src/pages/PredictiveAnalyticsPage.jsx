import React, { useState, useEffect } from 'react';
import { callGemini } from '../services/geminiService';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';

// Mock historical data for visualization
const MOCK_MONTHLY_DATA = [
  { month: 'Aug', claims: 1240, approved: 1085, denied: 155, pending: 0 },
  { month: 'Sep', claims: 1380, approved: 1242, denied: 138, pending: 0 },
  { month: 'Oct', claims: 1520, approved: 1368, denied: 152, pending: 0 },
  { month: 'Nov', claims: 1450, approved: 1334, denied: 116, pending: 0 },
  { month: 'Dec', claims: 1680, approved: 1512, denied: 168, pending: 0 },
  { month: 'Jan', claims: 1820, approved: 1638, denied: 145, pending: 37 },
];

const DENIAL_REASONS = [
  { reason: 'Missing Documentation', count: 234, percentage: 32, trend: 'down' },
  { reason: 'Invalid SBS Code', count: 189, percentage: 26, trend: 'down' },
  { reason: 'Prior Auth Required', count: 145, percentage: 20, trend: 'up' },
  { reason: 'Coverage Expired', count: 98, percentage: 13, trend: 'stable' },
  { reason: 'Duplicate Claim', count: 65, percentage: 9, trend: 'down' },
];

const PAYER_PERFORMANCE = [
  { payer: 'Tawuniya', approvalRate: 94, avgDays: 2.3, status: 'Optimal' },
  { payer: 'Bupa Arabia', approvalRate: 91, avgDays: 3.1, status: 'Active' },
  { payer: 'Medgulf', approvalRate: 88, avgDays: 3.8, status: 'Warning' },
  { payer: 'CCHI', approvalRate: 85, avgDays: 4.2, status: 'Warning' },
  { payer: 'AXA', approvalRate: 82, avgDays: 4.5, status: 'Critical' },
];

/**
 * Premium Predictive Analytics Dashboard
 * Optimized for GIVC-SBS Ultra-Premium Design System
 */
export function PredictiveAnalyticsPage() {
  const [predictions, setPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setPredictions({
        nextMonthClaims: 1950,
        expectedApprovalRate: 91.2,
        predictedDenials: 171,
        revenueProjection: 2850000,
        riskScore: 23,
        optimizationPotential: 125000,
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  const generateAIInsights = async () => {
    setIsGeneratingInsights(true);
    
    const prompt = `You are a healthcare billing analytics expert. Analyze this data and provide insights:
    Historical Data: ${JSON.stringify(MOCK_MONTHLY_DATA)}
    Denial Reasons: ${JSON.stringify(DENIAL_REASONS)}
    Predictions: ${JSON.stringify(predictions)}
    Return JSON with fields: summary (string), keyInsights (array of {title, description, impact, icon}), recommendations (array of {priority, action, expectedImpact, effort}).`;

    try {
      const response = await callGemini(prompt, "You are a Saudi healthcare billing analytics expert. Return only valid JSON.");
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) setAiInsights(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.error('AI insights error:', error);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="flex-1 overflow-y-auto bg-grid scrollbar-hide">
      <main className="max-w-[1400px] mx-auto p-6 sm:p-12 space-y-12 stagger-children">
        
        {/* Header section with AI trigger */}
        <section className="animate-premium-in">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <SectionHeader 
                title="Neural Forecasts" 
                subtitle="Predictive insights powered by autonomous machine learning and Saudi healthcare trends."
                badge="Inference Layer"
              />
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                 <div className="px-1 py-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex gap-1">
                    {['7d', '30d', '90d'].map(tf => (
                      <button 
                        key={tf} 
                        onClick={() => setSelectedTimeframe(tf)}
                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedTimeframe === tf ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                         {tf}
                      </button>
                    ))}
                 </div>
                 <Button 
                   icon="auto_awesome" 
                   loading={isGeneratingInsights} 
                   className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/20"
                   onClick={generateAIInsights}
                 >
                    {isGeneratingInsights ? 'Generating Analysis...' : 'Neural Insights'}
                 </Button>
              </div>
           </div>
        </section>

        {/* Prediction Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-premium-in" style={{ animationDelay: '100ms' }}>
           <PredictionKpiCard icon="trending_up" label="Claims Forecast" value={predictions.nextMonthClaims.toLocaleString()} trend="+7.1%" color="blue" />
           <PredictionKpiCard icon="verified" label="Confidence Range" value={`${predictions.expectedApprovalRate}%`} trend="+1.2%" color="emerald" />
           <PredictionKpiCard icon="payments" label="Yield Projection" value={`SAR ${(predictions.revenueProjection / 1000000).toFixed(1)}M`} trend="+12%" color="indigo" />
           <PredictionKpiCard icon="bolt" label="Cap Recovery" value={`SAR ${(predictions.optimizationPotential / 1000).toFixed(0)}K`} trend="Available" color="rose" />
        </section>

        {/* AI Insights Panel */}
        {aiInsights && (
          <section className="animate-premium-in" style={{ animationDelay: '150ms' }}>
             <Card className="bg-slate-950 text-white border-blue-600/20 shadow-2xl shadow-blue-600/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                   <span className="material-symbols-outlined text-[200px] font-black">psychology</span>
                </div>
                <CardBody className="p-10 space-y-10">
                   <div className="flex items-center gap-4">
                      <div className="size-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/40">
                         <span className="material-symbols-outlined text-white font-black">auto_awesome</span>
                      </div>
                      <div className="space-y-1">
                         <h3 className="text-xl font-black tracking-tight">AI Generated Strategic Analysis</h3>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Source: GPT-4o Relay Inference</p>
                      </div>
                   </div>

                   <div className="glass-panel p-8 rounded-[32px] border border-white/5 bg-white/5">
                      <p className="text-sm font-bold text-slate-300 leading-relaxed text-center sm:text-left">{aiInsights.summary}</p>
                   </div>

                   <div className="grid md:grid-cols-2 gap-6">
                      {aiInsights.keyInsights.map((insight, i) => (
                        <div key={i} className="flex gap-4 p-6 rounded-[28px] bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                           <div className="size-10 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-xl">{insight.icon || 'star'}</span>
                           </div>
                           <div className="space-y-1">
                              <h4 className="text-sm font-black text-white">{insight.title}</h4>
                              <p className="text-[11px] font-bold text-slate-500">{insight.description}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </CardBody>
             </Card>
          </section>
        )}

        {/* Charts and Data */}
        <div className="grid lg:grid-cols-3 gap-8">
           <Card className="lg:col-span-2 animate-premium-in" style={{ animationDelay: '200ms' }}>
              <CardHeader title="Temporal Claims Trajectory" subtitle="Aggregated historical volume vs. neural predictions." />
              <CardBody className="space-y-10">
                 <div className="h-64 flex items-end gap-3 pt-4">
                    {MOCK_MONTHLY_DATA.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3 group h-full justify-end">
                         <div className="w-full relative flex flex-col justify-end h-full">
                            <div className="absolute -top-6 w-full text-center text-[9px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">{(d.approved/10).toFixed(0)}%</div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden h-full flex flex-col justify-end">
                               <div className="w-full bg-blue-600 transition-all duration-1000 group-hover:opacity-80" style={{ height: `${(d.approved/2000)*100}%` }}></div>
                               <div className="w-full bg-indigo-400 opacity-30" style={{ height: `${(d.denied/2000)*100}%` }}></div>
                            </div>
                         </div>
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{d.month}</span>
                      </div>
                    ))}
                    {/* Forecast bar */}
                    <div className="flex-1 flex flex-col items-center gap-3 h-full justify-end">
                       <div className="w-full bg-gradient-to-b from-blue-600/20 to-transparent border-2 border-dashed border-blue-600/30 rounded-t-xl h-[85%] relative overflow-hidden">
                          <div className="absolute bottom-0 w-full bg-blue-600 opacity-20" style={{ height: '70%' }}></div>
                       </div>
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Feb*</span>
                    </div>
                 </div>
                 <div className="flex justify-center gap-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <LegendItem label="Success Relay" color="bg-blue-600" />
                    <LegendItem label="Anomaly Detected" color="bg-indigo-400 opacity-30" />
                    <LegendItem label="Forecast Vector" color="bg-blue-600/20 border-2 border-dashed border-blue-600/30" />
                 </div>
              </CardBody>
           </Card>

           <Card className="animate-premium-in" style={{ animationDelay: '300ms' }}>
              <CardHeader title="Yield Resistance Factors" subtitle="Top systemic reasons for relay failure." />
              <CardBody className="space-y-8">
                 {DENIAL_REASONS.map((r, i) => (
                   <div key={i} className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                         <span className="text-slate-500">{r.reason}</span>
                         <span className="text-slate-900 dark:text-white">{r.count} <span className={r.trend === 'up' ? 'text-rose-500' : 'text-emerald-500'}>{r.trend === 'up' ? '↑' : '↓'}</span></span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                         <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" style={{ width: `${r.percentage}%` }}></div>
                      </div>
                   </div>
                 ))}
                 <div className="p-6 rounded-[28px] bg-rose-500/5 border border-rose-500/10">
                    <p className="text-[10px] font-bold text-rose-500 leading-relaxed uppercase tracking-widest text-center">Critical: Missing documentation accounts for 32% of resistance.</p>
                 </div>
              </CardBody>
           </Card>
        </div>

        {/* Payer Perf & Risk */}
        <div className="grid lg:grid-cols-2 gap-8">
           <Card className="animate-premium-in" style={{ animationDelay: '400ms' }}>
              <CardHeader title="Payer Performance Matrix" subtitle="Adjudication efficiency across major carriers." />
              <CardBody className="grid grid-cols-5 gap-2">
                 {PAYER_PERFORMANCE.map((p, i) => (
                   <div key={i} className="text-center space-y-4 group">
                      <div className="size-16 mx-auto rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center relative transition-transform group-hover:scale-110">
                         <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent transition-all duration-1000" style={{ transform: `rotate(${p.approvalRate * 3.6}deg)` }}></div>
                         <span className="text-xs font-black text-slate-800 dark:text-gray-200">{p.approvalRate}%</span>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black uppercase text-slate-800 dark:text-white truncate">{p.payer}</p>
                         <p className="text-[9px] font-bold text-slate-400">{p.avgDays} Days</p>
                      </div>
                   </div>
                 ))}
              </CardBody>
           </Card>

           <Card className="animate-premium-in" style={{ animationDelay: '500ms' }}>
              <CardHeader title="Network Risk Assessment" subtitle="Aggregated anomaly Score for active claim registry." />
              <CardBody className="space-y-8">
                 <div className="flex justify-between items-end">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Composite Score</p>
                       <h4 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{predictions.riskScore}<span className="text-xl text-slate-300">/100</span></h4>
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Minimal Risk</div>
                 </div>
                 <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex">
                    <div className="h-full bg-emerald-500" style={{ width: '30%' }}></div>
                    <div className="h-full bg-amber-500" style={{ width: '30%' }}></div>
                    <div className="h-full bg-rose-500 opacity-20" style={{ width: '40%' }}></div>
                    <div className="absolute size-6 bg-white dark:bg-slate-900 border-4 border-blue-600 rounded-full -mt-1 shadow-xl transition-all duration-1000" style={{ marginLeft: `${predictions.riskScore}%` }}></div>
                 </div>
                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Low Probability</span>
                    <span>Action Window</span>
                    <span>Critical Alert</span>
                 </div>
              </CardBody>
           </Card>
        </div>
      </main>
    </div>
  );
}

function PredictionKpiCard({ icon, label, value, trend, color }) {
  const backgrounds = {
    blue: 'text-blue-600 bg-blue-600/5 border-blue-600/10',
    emerald: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10',
    indigo: 'text-indigo-600 bg-indigo-600/5 border-indigo-600/10',
    rose: 'text-rose-600 bg-rose-600/5 border-rose-600/10',
  };
  return (
    <div className={`glass-card p-6 rounded-[32px] border transition-all hover:scale-[1.02] ${backgrounds[color]}`}>
       <div className="flex justify-between items-start mb-6">
          <div className="size-10 rounded-2xl bg-white dark:bg-slate-900 border border-current opacity-20 flex items-center justify-center">
             <span className="material-symbols-outlined font-black">{icon}</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-current opacity-10">{trend}</span>
       </div>
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</p>
       <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</h4>
    </div>
  );
}

function LegendItem({ label, color }) {
  return (
    <div className="flex items-center gap-2">
       <div className={`size-2.5 rounded-sm ${color}`}></div>
       <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
       <div className="size-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-indigo-600/20 border-b-indigo-600 animate-spin-reverse"></div>
       </div>
       <div className="text-center space-y-1">
          <p className="text-sm font-black text-slate-800 dark:text-gray-100 uppercase tracking-widest">Inference Engine Loading</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Synchronizing Registry Payloads...</p>
       </div>
    </div>
  );
}
