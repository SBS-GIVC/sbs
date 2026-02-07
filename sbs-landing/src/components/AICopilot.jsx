/**
 * Premium AI Copilot - DeepSeek Powered
 * High-performance neural assistant for clinical orchestration
 */

import React, { useState, useRef, useEffect } from 'react';
import { callGemini } from '../services/geminiService';

const SYSTEM_CONTEXT = `You are GIVC-SBS AI (DeepSeek-V4). Expert in Saudi SBS codes, NPHIES, and CHI. Be technical, concise, and premium.`;

const LOCALE_TEXT = {
  en: {
    greeting: `👋 **Protocol Initialized.** I am the **GIVC-SBS Neural Assistant**. 
    
How may I assist with your clinical workflow or SBS registry today?`,
    placeholder: 'Execute neural query...',
    thinking: 'Synthesizing clinical vectors...',
    footer: 'SBS V3.1 Neural Layer • Autonomous'
  }
};

export function AICopilot({ isOpen, onClose, context = {} }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: LOCALE_TEXT.en.greeting, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const copy = LOCALE_TEXT.en;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSend = async (customText = null) => {
    const text = customText || input.trim();
    if (!text || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await callGemini(`${SYSTEM_CONTEXT}\nContext: ${JSON.stringify(context)}\nUser: ${text}`, SYSTEM_CONTEXT);
      setMessages(prev => [...prev, { role: 'assistant', content: resp, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection to DeepSeek interrupted. Recalibrating...', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-[200] flex flex-col bg-white dark:bg-slate-950 border-l border-white/5 shadow-[-32px_0_64px_-16px_rgba(0,0,0,0.5)] animate-slide-in-right overflow-hidden">
       {/* Cinematic Header */}
       <header className="px-10 py-10 bg-slate-900 text-white relative flex flex-col gap-6 shrink-0 border-b border-white/5">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <span className="material-symbols-outlined text-[100px] font-black">neurology</span>
          </div>
          <div className="flex justify-between items-center relative z-10">
             <div className="flex items-center gap-5">
                <div className="size-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/20">
                   <span className="material-symbols-outlined text-3xl font-black">psychology</span>
                </div>
                <div>
                   <h2 className="text-xl font-black tracking-tighter uppercase mb-0.5">Neural Agent</h2>
                   <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">DeepSeek-V4 Core Active</p>
                   </div>
                </div>
             </div>
             <button onClick={onClose} className="size-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
             </button>
          </div>
       </header>

       {/* Conversation Flow */}
       <div className="flex-1 overflow-y-auto px-10 py-12 space-y-10 scrollbar-hide bg-grid">
          {messages.map((m, i) => (
             <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-premium-in`} style={{ animationDelay: `${i * 100}ms` }}>
                <div className={`max-w-[85%] p-6 rounded-[32px] ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/20' 
                    : 'bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-slate-800 dark:text-slate-200'
                }`}>
                   <div className="text-sm font-bold leading-relaxed whitespace-pre-wrap">{m.content}</div>
                </div>
                <span className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400 opacity-50 px-2">{m.role}</span>
             </div>
          ))}
          {isLoading && (
             <div className="flex flex-col items-start animate-pulse">
                <div className="bg-slate-50 dark:bg-white/5 border border-white/5 p-6 rounded-[32px] flex items-center gap-4">
                   <div className="flex gap-1.5">
                      <div className="size-1.5 rounded-full bg-blue-600"></div>
                      <div className="size-1.5 rounded-full bg-blue-600 opacity-50"></div>
                      <div className="size-1.5 rounded-full bg-blue-600 opacity-20"></div>
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.thinking}</span>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
       </div>

       {/* Input Terminal */}
       <footer className="p-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5">
          <div className="relative group">
             <textarea 
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={copy.placeholder}
                className="w-full h-20 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[28px] pl-8 pr-20 py-6 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-600/30 transition-all placeholder:text-slate-400 resize-none shadow-sm"
             />
             <button 
               onClick={() => handleSend()} 
               disabled={!input.trim() || isLoading}
               className="absolute right-4 top-1/2 -translate-y-1/2 size-12 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-20"
             >
                <span className="material-symbols-outlined font-black">send</span>
             </button>
          </div>
          <div className="mt-6 flex justify-center items-center gap-4">
             <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
             <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">{copy.footer}</p>
             <div className="h-px flex-1 bg-slate-100 dark:bg-white/5"></div>
          </div>
       </footer>
    </div>
  );
}

export function AICopilotFAB({ onClick }) {
  return (
    <button onClick={onClick} className="fixed bottom-12 right-12 z-[150] size-20 rounded-[32px] bg-blue-600 text-white shadow-[0_24px_64px_-12px_rgba(37,99,235,0.6)] flex items-center justify-center group hover:scale-110 active:scale-95 transition-all animate-float">
       <span className="material-symbols-outlined text-4xl font-black group-hover:rotate-12 transition-transform">psychology</span>
       <div className="absolute inset-0 rounded-[32px] border-4 border-white/20 scale-110 animate-ping opacity-20"></div>
    </button>
  );
}
