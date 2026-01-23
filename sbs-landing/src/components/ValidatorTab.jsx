import React from 'react';
import {
  ShieldAlert, TrendingUp, Loader2, FileText, MessageSquare,
  CheckCircle, Cpu
} from 'lucide-react';

export function ValidatorTab({
  t,
  isRTL,
  denialRisk,
  appealText,
  isThinking,
  handleDraftAppeal
}) {
  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
          <h3 className={`text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <ShieldAlert className="text-amber-500" size={18}/>
            {t.denialGuard}
          </h3>

          {denialRisk ? (
            <div className="space-y-6">
              <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl relative overflow-hidden">
                <div className={`absolute top-0 p-2 text-amber-500 opacity-20 ${isRTL ? 'left-0' : 'right-0'}`}>
                  <TrendingUp size={40}/>
                </div>
                <p className="text-amber-200 text-sm font-medium leading-relaxed">{denialRisk}</p>
              </div>
              <button
                onClick={handleDraftAppeal}
                disabled={isThinking}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700"
              >
                {isThinking ? <Loader2 size={14} className="animate-spin"/> : <FileText size={14}/>}
                {t.draftAppeal}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-700">
              <Cpu size={48} className="opacity-10 mb-4"/>
              <p className="text-xs font-bold uppercase tracking-widest">
                {isRTL ? 'جاري فحص القواعد...' : 'Scanning Rules Engine...'}
              </p>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
          <h3 className={`text-sm font-black text-white uppercase tracking-widest mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t.archive}
          </h3>
          <div className="space-y-3">
            {appealText ? (
              <div className="p-5 bg-indigo-500/5 border border-indigo-500/30 rounded-2xl animate-in fade-in zoom-in-95">
                <p className={`text-[10px] font-black text-indigo-400 uppercase mb-3 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <MessageSquare size={10}/> {isRTL ? 'مسودة التبرير' : 'Medical Rationale Draft'}
                </p>
                <p className="text-xs text-slate-300 leading-relaxed font-light italic" dir={isRTL ? 'rtl' : 'ltr'}>
                  {appealText}
                </p>
              </div>
            ) : (
              [1, 2].map(i => (
                <div
                  key={i}
                  className={`flex justify-between items-center p-4 bg-slate-950 border border-slate-800/50 rounded-2xl group cursor-pointer hover:border-indigo-500/30 transition-all ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-black tracking-widest shadow-inner">
                      TX
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">
                        #GIVC-AUTH-{8800 + i}
                      </p>
                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
                        Verified Origin Gateway ({t.verified})
                      </p>
                    </div>
                  </div>
                  <div className={`text-emerald-500 flex items-center gap-1 text-[10px] font-black`}>
                    {t.accepted} <CheckCircle size={12}/>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
