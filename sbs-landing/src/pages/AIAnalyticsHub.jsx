import React, { useState, useEffect } from 'react';
import { i18n } from '../utils/i18n';
import {
  predictClaim,
  optimizeCost,
  detectFraud,
  checkCompliance,
  analyzeClaim,
  getFacilityAnalytics
} from '../services/aiPredictionService';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/**
 * Premium AI Analytics Hub
 * Powered by GIVC-SBS Intelligence
 */
export function AIAnalyticsHub({ lang = 'en', isRTL = false }) {
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.aiAnalytics || i18n.en.pages.aiAnalytics;
  const [activeTab, setActiveTab] = useState('predict');
  const [claimData, setClaimData] = useState({
    facility_id: 1,
    patient_age: 45,
    patient_gender: 'M',
    diagnosis_codes: ['I10', 'E11.9'],
    procedure_codes: ['1101001', '1201001'],
    service_date: '2026-01-31',
    total_amount: 5000,
    items: [
      { sbs_code: '1101001', quantity: 1, description: 'CT Scan' },
      { sbs_code: '1201001', quantity: 2, description: 'CBC Test' }
    ]
  });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [facilityAnalytics, setFacilityAnalytics] = useState(null);

  useEffect(() => {
    loadFacilityAnalytics();
  }, []);

  const loadFacilityAnalytics = async () => {
    try {
      const analytics = await getFacilityAnalytics(claimData.facility_id, 30);
      setFacilityAnalytics(analytics);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  };

  const executeAIAction = async (fn, key) => {
    setLoading(true);
    try {
      let result;
      if (key === 'predict') {
        result = await predictClaim(
          claimData.facility_id, claimData.patient_age, claimData.patient_gender,
          claimData.diagnosis_codes, claimData.procedure_codes,
          claimData.service_date, claimData.total_amount
        );
        setAnalysisResult({ prediction: result });
      } else if (key === 'optimize') {
        result = await optimizeCost(claimData.facility_id, claimData.items);
        setAnalysisResult({ optimization: result });
      } else if (key === 'fraud') {
        result = await detectFraud(claimData.facility_id, claimData);
        setAnalysisResult({ fraud: result });
      } else if (key === 'compliance') {
        result = await checkCompliance(claimData.facility_id, claimData);
        setAnalysisResult({ compliance: result });
      } else {
        result = await analyzeClaim(claimData.facility_id, claimData);
        setAnalysisResult(result);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateClaimData = (field, value) => setClaimData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="flex-1">
      <main className="max-w-[1500px] mx-auto p-6 sm:p-12 space-y-12 stagger-children">
        
        {/* Header */}
        <section className="animate-premium-in">
           <SectionHeader 
             title={t.header.title}
             subtitle={t.header.subtitle}
             badge={t.header.badge}
           />
        </section>

        {/* Global Stats Overview */}
        {facilityAnalytics && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-premium-in" style={{ animationDelay: '100ms' }}>
             <AnalyticsKpi label={t.kpis.registryVolume} value={facilityAnalytics.total_claims || 0} unit={t.kpis.units.claims} color="blue" />
             <AnalyticsKpi label={t.kpis.syncSuccess} value={((facilityAnalytics.approved_claims / facilityAnalytics.total_claims) * 100 || 0).toFixed(1)} unit="%" color="emerald" />
             <AnalyticsKpi label={t.kpis.totalFlux} value={facilityAnalytics.total_amount?.toFixed(0) || 0} unit="SAR" color="indigo" />
             <AnalyticsKpi label={t.kpis.avgLatency} value="1.2" unit={t.kpis.units.seconds} color="rose" />
          </section>
        )}

        {/* Interactive Workspace */}
        <div className="grid lg:grid-cols-12 gap-8">
           {/* Left: Configuration Form */}
           <div className="lg:col-span-5 space-y-8 animate-premium-in" style={{ animationDelay: '200ms' }}>
              <Card>
                 <CardHeader title={t.form.title} subtitle={t.form.subtitle} />
                 <CardBody className="space-y-6 py-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                       <Input label={t.form.facilityId} type="number" value={claimData.facility_id} onChange={(e) => updateClaimData('facility_id', e.target.value)} />
                       <Input label={t.form.yieldValueSar} type="number" value={claimData.total_amount} onChange={(e) => updateClaimData('total_amount', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                       <Input label={t.form.age} type="number" value={claimData.patient_age} onChange={(e) => updateClaimData('patient_age', e.target.value)} />
                        <div className="space-y-2">
                          <label htmlFor="ai-analytics-gender" className="text-[10px] font-black uppercase tracking-widest text-slate-400" style={{ marginInlineStart: '0.25rem' }}>
                            {t.form.gender}
                          </label>
                          <select
                            id="ai-analytics-gender"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                            value={claimData.patient_gender}
                            onChange={(e) => updateClaimData('patient_gender', e.target.value)}
                          >
                             <option value="M">{t.form.genderOptions.male}</option>
                             <option value="F">{t.form.genderOptions.female}</option>
                          </select>
                       </div>
                       <Input label={t.form.date} type="date" value={claimData.service_date} onChange={(e) => updateClaimData('service_date', e.target.value)} />
                    </div>
                    <Input label={t.form.diagnosisRegistry} placeholder={t.form.diagnosisPlaceholder} value={claimData.diagnosis_codes.join(', ')} onChange={(e) => updateClaimData('diagnosis_codes', e.target.value.split(','))} />
                    <Input label={t.form.procedureCodes} placeholder={t.form.procedurePlaceholder} value={claimData.procedure_codes.join(', ')} onChange={(e) => updateClaimData('procedure_codes', e.target.value.split(','))} />
                 </CardBody>
              </Card>

              {/* Action Hub */}
              <div className="flex flex-wrap gap-4">
                 <ActionTab active={activeTab === 'predict'} label={t.tabs.predict} icon="online_prediction" onClick={() => setActiveTab('predict')} />
                 <ActionTab active={activeTab === 'optimize'} label={t.tabs.optimize} icon="savings" onClick={() => setActiveTab('optimize')} />
                 <ActionTab active={activeTab === 'fraud'} label={t.tabs.fraud} icon="shield_person" onClick={() => setActiveTab('fraud')} />
                 <ActionTab active={activeTab === 'compliance'} label={t.tabs.compliance} icon="policy" onClick={() => setActiveTab('compliance')} />
                 <ActionTab active={activeTab === 'analyze'} label={t.tabs.analyze} icon="analytics" onClick={() => setActiveTab('analyze')} />
              </div>

              <Button 
                className="w-full h-16 text-lg shadow-2xl shadow-blue-600/20" 
                icon="bolt" 
                loading={loading}
                onClick={() => executeAIAction(null, activeTab)}
              >
                 {t.actions.initialize}
              </Button>
           </div>

           {/* Right: Inference Terminal */}
           <div className="lg:col-span-7 space-y-8 animate-premium-in" style={{ animationDelay: '300ms' }}>
              <Card className="min-h-[600px] flex flex-col bg-slate-950 text-white overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <span className="material-symbols-outlined text-[200px] font-black">satellite_alt</span>
                 </div>
                 <CardHeader title={t.terminal.title} subtitle={t.terminal.subtitle} />
                 <CardBody className="flex-1 flex flex-col p-10 space-y-8">
                    {loading ? (
                      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                         <div className="size-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.terminal.processing}</p>
                      </div>
                    ) : analysisResult ? (
                       <div className="space-y-8 animate-premium-in">
                          {/* Top Status */}
                          <div className="p-8 rounded-[38px] bg-white/5 border border-white/10 flex justify-between items-center group hover:bg-white/10 transition-colors">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.terminal.statusLabel}</p>
                                <h4 className="text-3xl font-black text-white tracking-tighter uppercase">{analysisResult.overall_status || t.terminal.statusFallback}</h4>
                             </div>
                             {analysisResult.overall_risk_score !== undefined && (
                                <div className="text-right">
                                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.terminal.riskMarker}</p>
                                   <h4 className={`text-3xl font-black tracking-tighter ${analysisResult.overall_risk_score > 70 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                      {analysisResult.overall_risk_score.toFixed(0)}%
                                   </h4>
                                </div>
                             )}
                          </div>

                          {/* Specific Result Components */}
                          {analysisResult.prediction && <ResultModule title={t.results.approvalAnalysis} data={analysisResult.prediction} icon="trending_up" />}
                          {analysisResult.optimization && <ResultModule title={t.results.yieldOptimization} data={analysisResult.optimization} icon="savings" />}
                          {analysisResult.fraud && <ResultModule title={t.results.integrityAudit} data={analysisResult.fraud} icon="verified" alert={analysisResult.fraud.is_fraudulent} />}
                          {analysisResult.compliance && <ResultModule title={t.results.regulatorySafety} data={analysisResult.compliance} icon="gavel" />}

                          {/* Comprehensive Footer */}
                          {analysisResult.recommendations && (
                             <div className="p-8 rounded-[32px] bg-blue-600/10 border border-blue-600/20 space-y-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">{t.terminal.recommendations}</h4>
                                <ul className="space-y-3">
                                   {analysisResult.recommendations.map((r, i) => (
                                      <li key={i} className="flex gap-4 text-xs font-bold text-slate-300">
                                         <span className="text-blue-500 font-black">•</span> {r}
                                      </li>
                                   ))}
                                </ul>
                             </div>
                          )}
                       </div>
                    ) : (
                       <div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-30">
                          <span className="material-symbols-outlined text-[80px] font-black">airwave</span>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t.terminal.awaiting}</p>
                       </div>
                    )}
                 </CardBody>
              </Card>
           </div>
        </div>
      </main>
    </div>
  );
}

function AnalyticsKpi({ label, value, unit, color }) {
  const backgrounds = {
    blue: 'text-blue-600 bg-blue-600/5 border-blue-600/10',
    emerald: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10',
    indigo: 'text-indigo-600 bg-indigo-600/5 border-indigo-600/10',
    rose: 'text-rose-600 bg-rose-600/5 border-rose-600/10',
  };
  return (
    <Card className={`group hover:scale-[1.03] transition-all hover:bg-current hover:shadow-2xl ${backgrounds[color]}`}>
       <CardBody className="p-8 space-y-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <div className="flex items-baseline gap-2">
             <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:text-white transition-colors">{value}</h4>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white/60 transition-colors">{unit}</span>
          </div>
       </CardBody>
    </Card>
  );
}

function ActionTab({ active, label, icon, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-4 rounded-[24px] border transition-all flex items-center gap-3 ${
        active 
          ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20 scale-[1.05]' 
          : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:border-blue-600/30'
      }`}
    >
       <span className="material-symbols-outlined text-xl font-black">{icon}</span>
       <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function ResultModule({ title, data, icon, alert }) {
  return (
    <div className={`p-8 rounded-[38px] border bg-white/5 transition-all hover:bg-white/10 ${alert ? 'border-rose-500/30' : 'border-white/5'}`}>
       <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4">
             <div className={`size-10 rounded-xl flex items-center justify-center ${alert ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-white/10 text-slate-400'}`}>
                <span className="material-symbols-outlined text-xl font-black">{icon}</span>
             </div>
             <div className="space-y-1">
                <h4 className="text-sm font-black text-white">{title}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Inference Complete</p>
             </div>
          </div>
          {data.confidence && <span className="text-xl font-black text-blue-600 tracking-tighter">{(data.confidence * 100).toFixed(0)}% <span className="text-[10px]">Conf.</span></span>}
       </div>
       {data.recommendations && (
          <div className="grid gap-2">
             {data.recommendations.map((r, i) => (
                <p key={i} className="text-[11px] font-bold text-slate-400 leading-relaxed italic">• {r}</p>
             ))}
          </div>
       )}
       {data.risk_factors && (
          <div className="grid gap-2">
             {data.risk_factors.map((r, i) => (
                <p key={i} className="text-[11px] font-bold text-rose-400 leading-relaxed italic animate-pulse">• {r}</p>
             ))}
          </div>
       )}
    </div>
  );
}
