import React from 'react';
import { BrainCircuit, Languages } from 'lucide-react';

export function Header({ lang, setLang, activeTab, setActiveTab, t, isRTL }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div className={`max-w-7xl mx-auto px-6 h-20 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3 border border-white/10">
            <BrainCircuit className="text-white" size={28} />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h1 className="text-2xl font-black tracking-tighter text-white">{t.title}</h1>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{t.tagline}</p>
          </div>
        </div>

        <nav className="hidden lg:flex bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800">
          {['doctor', 'coder', 'validator'].map(id => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t[id === 'doctor' ? 'clinician' : id === 'coder' ? 'coder' : 'validator']}
            </button>
          ))}
        </nav>

        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <button
            onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}
            className="px-3 py-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 flex items-center gap-2 font-black text-xs border border-slate-800"
          >
            <Languages size={18}/> {lang.toUpperCase()}
          </button>
          <div className="w-10 h-10 rounded-2xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-white font-black shadow-inner">
            GIVC
          </div>
        </div>
      </div>
    </header>
  );
}
