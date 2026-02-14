import { useState, useMemo, useEffect } from 'react';
import { unifiedTerminology, CODE_SYSTEMS } from '../services/unifiedTerminologyService';
import { useToast } from '../components/Toast';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';
import { i18n } from '../utils/i18n';

/**
 * Premium Unified Code Browser
 * Multi-System Clinical Registry Explorer
 */
export function UnifiedCodeBrowser({ lang = 'en', isRTL = false }) {
  const copy = i18n[lang] || i18n.en;
  const t = copy.pages?.unifiedBrowser || i18n.en.pages.unifiedBrowser;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState({ total: 0, results: [], systems: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const toast = useToast();

  const allSystems = useMemo(() => Object.values(CODE_SYSTEMS), []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults({ total: 0, results: [], systems: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await unifiedTerminology.search(searchQuery, {
          systems: selectedSystems.length > 0 ? selectedSystems : null,
          category: selectedCategory !== 'all' ? selectedCategory : null,
          limit: 50
        });
        setResults(res);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedSystems, selectedCategory]);

  const toggleSystem = (id) => {
    setSelectedSystems(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleCodeSelect = async (code) => {
    setSelectedCode(code);
    setMappings([]);
    setLoadingMappings(true);
    try {
      const m = await unifiedTerminology.getMappings(code.code, code.system);
      setMappings(m);
    } finally {
      setLoadingMappings(false);
    }
  };

  const copyCode = (code, system) => {
    navigator.clipboard
      .writeText(`${system}|${code}`)
      .then(() => toast.success(t.toast.codeCopied.replace('{system}', system)))
      .catch(() => toast.error(t.toast.clipboardDenied));
  };

  const getRegistryLink = (code) => {
    const system = String(code?.system || '').toLowerCase();
    const encoded = encodeURIComponent(code?.code || '');
    if (system === 'sbs') return 'https://portal.nphies.sa';
    if (system === 'icd11') return `https://icd.who.int/browse11/l-m/en?q=${encoded}`;
    if (system === 'icd10am') return `https://www.who.int/standards/classifications/classification-of-diseases?q=${encoded}`;
    if (system === 'snomed') return `https://browser.ihtsdotools.org/?perspective=full&conceptId1=${encoded}`;
    if (system === 'loinc') return `https://loinc.org/search/?search=${encoded}`;
    return `https://www.google.com/search?q=${encodeURIComponent(`${code?.systemName || 'healthcare code'} ${code?.code || ''}`)}`;
  };

  return (
    <div className="flex-1 overflow-hidden bg-grid flex flex-col">
       <header className="flex-shrink-0 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-4 py-8 sm:px-8 sm:py-10 border-b border-slate-200/70 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <span className="material-symbols-outlined text-[200px] font-black">hub</span>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
             <div className="space-y-4">
                <SectionHeader 
                  title={t.header.title}
                  subtitle={t.header.subtitleTemplate.replace('{count}', allSystems.length.toLocaleString(lang === 'ar' ? 'ar-SA' : undefined))}
                  badge={t.header.badge}
                />
             </div>
             <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-widest">{t.header.tags.fhir}</div>
                <div className="px-4 py-2 rounded-2xl bg-blue-600/10 border border-blue-600/20 text-blue-600 text-[10px] font-black uppercase tracking-widest">{t.header.tags.ai}</div>
             </div>
          </div>

          <div className="relative z-10 space-y-6">
             <div className="relative group">
                <span className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-500`}>search</span>
                <input
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.search.placeholder}
                  aria-label={t.search.label}
                  data-testid="unifiedbrowser-search"
                  className={`w-full h-16 sm:h-20 bg-white border border-slate-200 rounded-[24px] sm:rounded-[32px] ${isRTL ? 'pr-14 sm:pr-16 pl-16 sm:pl-20 text-right' : 'pl-14 sm:pl-16 pr-16 sm:pr-20 text-left'} text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-600/30 focus:ring-4 focus:ring-blue-600/10 transition-all shadow-sm`}
                />
                {isSearching && <div className={`absolute ${isRTL ? 'left-8' : 'right-8'} top-1/2 -translate-y-1/2 size-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin`}></div>}
             </div>

             <div className="flex flex-wrap gap-2">
                {allSystems.map(s => (
                   <button 
                     key={s.id}
                     onClick={() => toggleSystem(s.id)}
                     data-testid={`unifiedbrowser-system-${s.id}`}
                     className={`px-3 sm:px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${
                       selectedSystems.includes(s.id) 
                         ? 'border-current shadow-lg shadow-current/20' 
                         : 'opacity-80 border-slate-200 text-slate-600 hover:border-slate-300'
                     }`}
                     style={{ color: selectedSystems.includes(s.id) ? s.color : undefined, backgroundColor: selectedSystems.includes(s.id) ? `${s.color}15` : 'white' }}
                   >
                      <span className="size-2 rounded-full" style={{ backgroundColor: s.color }}></span>
                      {s.name}
                   </button>
                ))}
             </div>
          </div>
       </header>

       <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto px-8 sm:px-12 py-10 scrollbar-hide">
             <div className="max-w-[1200px] mx-auto space-y-6">
                {searchQuery.length < 2 ? (
                   <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-premium-in">
                      {allSystems.map(s => <SystemPill key={s.id} system={s} t={t} lang={lang} />)}
                   </section>
                ) : results.results.length > 0 ? (
                   <div className="space-y-4 stagger-children">
                      {results.results.map((c, i) => (
                         <UnifiedResultCard 
                           key={c.code + i} 
                           code={c} 
                           selected={selectedCode?.code === c.code}
                           onClick={() => handleCodeSelect(c)}
                           t={t}
                         />
                      ))}
                   </div>
                ) : (
                   <div className="flex flex-col items-center justify-center py-40 opacity-40">
                      <span className="material-symbols-outlined text-[80px] font-black">manage_search</span>
                      <p className="text-sm font-black uppercase tracking-widest mt-6">{t.empty}</p>
                   </div>
                )}
             </div>
          </div>

          {selectedCode && (
             <aside data-testid="unifiedbrowser-detail" className="w-[480px] bg-white dark:bg-slate-950 border-l border-slate-100 dark:border-slate-800 overflow-y-auto animate-premium-in shadow-2xl relative">
                <div className="p-12 space-y-12">
                   <div className="flex justify-between items-start">
                      <div className="space-y-2">
                         <div className="inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-600/10 text-blue-600 border border-blue-600/20">{selectedCode.systemName}</div>
                         <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white">{selectedCode.code}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedCode(null)}
                        aria-label={t.detail.close}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400"
                      >
                         <span className="material-symbols-outlined">close</span>
                      </button>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t.detail.semantics}</p>
                         <p className="text-base font-bold text-slate-800 dark:text-gray-100 leading-relaxed italic">"{selectedCode.display}"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <InfoByte label={t.detail.statusLabel} value={t.detail.statusActive} color="emerald" />
                         <InfoByte label={t.detail.authReqLabel} value={t.detail.authReqManual} color="amber" />
                      </div>
                   </div>

                   <Card>
                      <CardHeader title={t.detail.bridgingTitle} subtitle={t.detail.bridgingSubtitle} icon="lan" />
                      <CardBody className="p-0">
                         {loadingMappings ? (
                            <div className="p-10 text-center"><div className="size-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                         ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                               {mappings.map((m, i) => (
                                  <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                     <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{m.system}</p>
                                        <p className="text-sm font-black text-blue-600 font-mono tracking-tight">{m.code}</p>
                                     </div>
                                     <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                       {Math.round(m.confidence * 100)}% {t.detail.match}
                                     </span>
                                  </div>
                               ))}
                            </div>
                         )}
                      </CardBody>
                   </Card>

                   <div className="space-y-4 py-4">
                      <Button
                        className="w-full py-6 shadow-2xl shadow-blue-600/20"
                        icon="add_reaction"
                        data-testid="unifiedbrowser-add-context"
                        onClick={() => {
                          const payload = {
                            source: 'unified-browser',
                            system: selectedCode.system,
                            systemName: selectedCode.systemName,
                            code: selectedCode.code,
                            description: selectedCode.display
                          };
                          try { window.sessionStorage.setItem('sbs_claim_context_code', JSON.stringify(payload)); } catch {}
                          try { window.dispatchEvent(new CustomEvent('sbs:claim-context', { detail: payload })); } catch {}
                          toast.success(t.toast.contextAdded);
                          window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'claim-builder' } }));
                        }}
                      >
                        {t.actions.addContext}
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full py-6"
                        icon="share"
                        onClick={() => {
                          const url = getRegistryLink(selectedCode);
                          window.open(url, '_blank', 'noopener,noreferrer');
                          toast.info(t.toast.openedReference);
                        }}
                      >
                        {t.actions.deepLink}
                      </Button>
                   </div>
                </div>
             </aside>
          )}
       </div>
    </div>
  );
}

function SystemPill({ system, t, lang = 'en' }) {
  return (
    <Card className="hover:scale-[1.02] transition-transform">
       <CardBody className="p-8 space-y-4">
          <div className="size-12 rounded-2xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${system.color}15`, color: system.color }}>
             <span className="material-symbols-outlined">{system.icon}</span>
          </div>
          <div>
             <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{system.name}</h4>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               {system.count.toLocaleString(lang === 'ar' ? 'ar-SA' : undefined)} {t.systems.codes}
             </p>
          </div>
       </CardBody>
    </Card>
  );
}

function UnifiedResultCard({ code, selected, onClick, t }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`unifiedbrowser-result-${code.system}-${code.code}`}
      className={`p-6 rounded-[28px] border-2 transition-all cursor-pointer flex items-center gap-6 ${
        selected ? 'border-blue-600 bg-blue-600/5 shadow-2xl shadow-blue-600/10' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
      aria-label={t.result.ariaLabelTemplate.replace('{system}', code.systemName).replace('{code}', code.code)}
    >
       <div className="size-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: `${code.systemColor}15`, color: code.systemColor }}>
          <span className="material-symbols-outlined">api</span>
       </div>
       <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-current" style={{ color: code.systemColor, backgroundColor: `${code.systemColor}10` }}>{code.systemName}</span>
             <span className="text-lg font-black text-blue-600 font-mono tracking-tighter">{code.code}</span>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-gray-200 line-clamp-1 italic">"{code.display}"</p>
       </div>
       <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600">chevron_right</span>
    </button>
  );
}

function InfoByte({ label, value, color }) {
  return (
    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
       <p className={`text-sm font-black ${color === 'emerald' ? 'text-emerald-500' : 'text-amber-500'}`}>{value}</p>
    </div>
  );
}
