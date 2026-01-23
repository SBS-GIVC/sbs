import React from 'react';
import { BrainCircuit, Info, Layers, FileJson, DollarSign, Send } from 'lucide-react';
import { PipelineStep } from './PipelineStep';

export function CoderTab({ t, isRTL, pipelineStatus, submissionData }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
        <div className={`flex justify-between items-center mb-8 px-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.subtitle}</h3>
          <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-bold">
            <BrainCircuit size={12}/> BrainSAIT AI Verified ✨
          </div>
        </div>

        <div className={`flex justify-between max-w-2xl mx-auto ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <PipelineStep
            label={t.normalize}
            icon={Layers}
            status={pipelineStatus === 'normalizing' ? 'loading' : pipelineStatus !== 'idle' ? 'complete' : 'idle'}
            active={pipelineStatus === 'normalizing'}
          />
          <PipelineStep
            label={t.fhirBuild}
            icon={FileJson}
            status={pipelineStatus === 'fhir' ? 'loading' : ['signing', 'submitted'].includes(pipelineStatus) ? 'complete' : 'idle'}
            active={pipelineStatus === 'fhir'}
          />
          <PipelineStep
            label={t.financials}
            icon={DollarSign}
            status={pipelineStatus === 'rules' ? 'loading' : ['signing', 'submitted'].includes(pipelineStatus) ? 'complete' : 'idle'}
            active={pipelineStatus === 'rules'}
          />
          <PipelineStep
            label={t.nphiesGate}
            icon={Send}
            status={pipelineStatus === 'submitted' ? 'complete' : 'idle'}
            active={pipelineStatus === 'submitted'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <h4 className={`text-xs font-black text-white uppercase tracking-widest mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.mappingRationale}
          </h4>
          <div className="space-y-4">
            {submissionData ? submissionData.items.map((it, i) => (
              <div
                key={i}
                className="p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-colors group"
              >
                <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <span className="font-mono text-xs font-black text-indigo-400 tracking-tight">
                      {it.productOrService?.coding?.[0]?.code || it.sbs_code}
                    </span>
                    <p className="text-sm font-bold text-white mt-1">
                      {it.productOrService?.coding?.[0]?.display || it.desc}
                    </p>
                  </div>
                  <div className={isRTL ? 'text-left' : 'text-right'}>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                      it.source?.includes('✨') ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {it.source || 'SBS Engine'}
                    </span>
                    <p className="text-xs font-black text-white mt-1">
                      SAR {it.net?.value || it.adjustedFee || it.fee}
                    </p>
                  </div>
                </div>
                <div className={`pt-3 border-t border-slate-900 flex gap-2 items-start ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Info size={12} className="text-slate-500 mt-0.5"/>
                  <p className={`text-[11px] text-slate-500 italic leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
                    {it.rationale || (isRTL ? 'تم المعايرة عبر محرك SBS' : 'Normalized via SBS engine')}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 text-slate-700 italic font-medium uppercase tracking-widest text-[10px]">
                {t.processEncounter}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <h4 className={`text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            GIVC-FHIR Payload Preview
          </h4>
          <pre className="text-[9px] font-mono text-indigo-300/80 overflow-auto max-h-[500px] leading-tight" dir="ltr">
            {submissionData ? JSON.stringify(submissionData, null, 2) : "// Waiting for data normalization..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
