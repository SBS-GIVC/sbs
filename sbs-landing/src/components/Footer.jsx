import React from 'react';
import { BrainCircuit } from 'lucide-react';

export function Footer({ t, isRTL }) {
  return (
    <footer className="border-t border-slate-900 bg-slate-950/80 p-8">
      <div className={`max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.25em] ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex gap-8 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            GIVC CLOUD CORE
          </span>
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
            {t.sbsEngine}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            {t.liveSync}
          </span>
        </div>
        <div className="flex items-center gap-3 group cursor-default">
          <div className="w-6 h-6 bg-indigo-900/50 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
            <BrainCircuit size={14} className="text-indigo-400 group-hover:text-white" />
          </div>
          <p className="group-hover:text-indigo-400 transition-colors tracking-[0.1em]">{t.poweredBy}</p>
        </div>
        <p dir="ltr" className="opacity-40 tracking-widest">© 2026 GIVC HEALTH SYSTEMS</p>
      </div>
    </footer>
  );
}
