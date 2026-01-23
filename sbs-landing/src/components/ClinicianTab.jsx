import React from 'react';
import { Mic, Loader2, Sparkles, Send } from 'lucide-react';

export function ClinicianTab({
  t,
  isRTL,
  isListening,
  setIsListening,
  transcript,
  clinicalInsights,
  medicalNote,
  isThinking,
  isSummarizing,
  handleGetInsights,
  handleSummarize,
  startPipeline
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-8 bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
          <div className={`flex justify-between items-center mb-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <h2 className={`text-xl font-black text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Mic className={isListening ? "text-rose-500 animate-pulse" : "text-indigo-500"} size={20}/>
              {t.ambientStream}
            </h2>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <button
                onClick={() => setIsListening(!isListening)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  isListening
                    ? 'bg-rose-500 border-rose-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isListening ? t.pauseSync : t.resumeListen}
              </button>
              <button
                onClick={handleGetInsights}
                disabled={!transcript || isThinking}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-30"
              >
                {isThinking ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                {t.getInsights}
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl h-[200px] overflow-y-auto mb-6">
            <p className="text-slate-400 font-mono text-sm leading-relaxed" dir={isRTL ? 'rtl' : 'ltr'}>
              {transcript || t.waitingData}
            </p>
          </div>

          <div className={`flex justify-between items-end ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-1 ${isRTL ? 'ml-4' : 'mr-4'}`}>
              {clinicalInsights && (
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl animate-in slide-in-from-left-2">
                  <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">✨ GIVC Intelligence</p>
                  <p className="text-xs text-indigo-100 leading-relaxed italic" dir={isRTL ? 'rtl' : 'ltr'}>
                    {clinicalInsights}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleSummarize}
              disabled={!transcript || isSummarizing}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-30"
            >
              {isSummarizing ? <Loader2 size={16} className="animate-spin"/> : t.generateNote}
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <label className={`text-[10px] font-black text-slate-500 uppercase mb-4 block tracking-[0.2em] ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.structuredDoc}
          </label>
          <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl h-[360px] overflow-y-auto text-slate-300 text-sm whitespace-pre-wrap font-light leading-relaxed" dir={isRTL ? 'rtl' : 'ltr'}>
            {medicalNote || (isRTL ? 'ستظهر التقارير الطبية هنا بعد المعالجة.' : 'Finalized documentation will appear here.')}
          </div>
          {medicalNote && (
            <button
              onClick={startPipeline}
              className="w-full mt-4 bg-indigo-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
            >
              {t.syncToCoder} <Send size={14}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
