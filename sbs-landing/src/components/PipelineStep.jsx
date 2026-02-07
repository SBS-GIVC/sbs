import React from 'react';
import { Loader2 } from 'lucide-react';

export function PipelineStep({ label, status, icon: Icon, active }) {
  return (
    <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${active ? 'scale-110 opacity-100' : 'opacity-40'}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
        status === 'complete' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
        status === 'loading' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 animate-pulse' :
        'bg-slate-800 border-slate-700 text-slate-500'
      }`}>
        {status === 'loading' ? <Loader2 className="animate-spin" size={20}/> : <Icon size={20}/>}
      </div>
      <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{label}</span>
    </div>
  );
}
