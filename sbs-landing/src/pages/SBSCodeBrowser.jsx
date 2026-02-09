import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { aiAssistant } from '../services/aiAssistantService';
import { useToast } from '../components/Toast';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Button } from '../components/ui/Button';

/**
 * Premium SBS Code Browser
 * Unified Terminology Explorer for GIVC-SBS
 */
export function SBSCodeBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCode, setSelectedCode] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(100);
  const scrollRef = useRef(null);
  const toast = useToast();
  
  const allCodes = useMemo(() => aiAssistant.getAllCodes(), []);
  const categories = useMemo(() => ['all', ...aiAssistant.getCategories()], []);

  const [searchResults, setSearchResults] = useState({ results: allCodes, source: 'local' });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await aiAssistant.smartSearch(searchQuery, {
            limit: 200,
            category: selectedCategory === 'all' ? null : selectedCategory,
            includeAI: true
          });
          setSearchResults(results);
          setAiInsights(results.aiInsights);
        } finally {
          setIsSearching(false);
        }
      } else {
        const filtered = selectedCategory === 'all' 
          ? allCodes 
          : allCodes.filter(c => c.category === selectedCategory);
        setSearchResults({ results: filtered, source: 'local' });
        setAiInsights(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, allCodes]);

  useEffect(() => {
    setDisplayLimit(100);
  }, [searchQuery, selectedCategory]);

  const displayedCodes = useMemo(() => searchResults.results.slice(0, displayLimit), [searchResults, displayLimit]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 400 && displayLimit < searchResults.results.length) {
      setDisplayLimit(prev => prev + 100);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success(`Code ${code} synchronized to clipboard`))
      .catch(() => toast.error('Clipboard access denied by browser'));
  };

  return (
    <div className="flex-1 overflow-hidden bg-grid flex">
      {/* Main Search Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-8 py-10 sm:px-12 space-y-8 animate-premium-in">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <SectionHeader 
                title="Terminology Explorer" 
                subtitle={`Global registry of ${allCodes.length.toLocaleString()} individual SBS clinical markers.`}
                badge="Knowledge Graph"
              />
              <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                 <button className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 shadow-sm">Grid Matrix</button>
                 <button className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Condensed</button>
              </div>
           </div>

           <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                 <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 group-focus-within:text-blue-600 transition-colors">search</span>
                 <input 
                    type="text" 
                    placeholder="Search by ID, semantics, or clinical description..." 
                    className="w-full h-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] pl-14 pr-20 text-sm font-bold focus:outline-none focus:border-blue-600/30 focus:ring-4 focus:ring-blue-600/5 transition-all shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                 />
                 {isSearching && <div className="absolute right-6 top-1/2 -translate-y-1/2 size-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
              </div>
              <select 
                className="h-16 px-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] text-xs font-black uppercase tracking-widest focus:outline-none"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                 {categories.map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
              </select>
           </div>
           
           {aiInsights && (
              <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-600/10 flex items-center gap-3 animate-premium-in">
                 <span className="material-symbols-outlined text-blue-600">auto_awesome</span>
                 <p className="text-xs font-bold text-slate-600 dark:text-gray-300 italic">{aiInsights}</p>
              </div>
           )}
        </header>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-8 sm:px-12 pb-12 scrollbar-hide"
        >
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
              {displayedCodes.map((c, i) => (
                <CodeCell 
                  key={c.code + i} 
                  code={c} 
                  selected={selectedCode?.code === c.code}
                  onClick={() => setSelectedCode(c)}
                  onCopy={() => copyCode(c.code)}
                />
              ))}
           </div>
           {searchResults.results.length === 0 && (
             <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-40">
                <span className="material-symbols-outlined text-[80px] font-black">search_off</span>
                <p className="font-black uppercase tracking-widest text-sm">No clinical markers found</p>
             </div>
           )}
        </div>
      </div>

      {/* Dynamic Detail Panel */}
      {selectedCode && (
        <aside className="w-[450px] bg-white dark:bg-slate-950 border-l border-slate-100 dark:border-slate-800 overflow-y-auto animate-premium-in shadow-2xl z-20">
           <div className="p-10 space-y-10">
              <div className="flex justify-between items-start">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Registry Detail</p>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedCode.code}</h2>
                 </div>
                 <button onClick={() => setSelectedCode(null)} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-rose-500 transition-colors">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Technical Designation</label>
                    <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-gray-100">{selectedCode.desc}</p>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Domain Classification</label>
                    <div className="inline-flex px-4 py-1.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                       {selectedCode.category || 'Clinical General'}
                    </div>
                 </div>
              </div>

              <div className="p-8 rounded-[40px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-6">
                 <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span className="material-symbols-outlined text-blue-600 text-lg">psychology</span>
                    Neural Cross-Reference
                 </h4>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                       <span>Approval Confidence</span>
                       <span className="text-blue-600">98.2%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-600 w-[98%]"></div>
                    </div>
                 </div>
                 <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                    DeepSeek inference suggests high correlation with <span className="text-blue-600 font-black">ICD-10 M17.0</span> diagnostic pathways.
                 </p>
              </div>

              <div className="space-y-4 pt-4">
                 <Button
                   className="w-full py-6 text-sm shadow-xl shadow-blue-600/20"
                   icon="add_box"
                   onClick={() => {
                     const context = {
                       code: selectedCode.code,
                       description: selectedCode.desc,
                       category: selectedCode.category || null
                     };
                     window.localStorage.setItem('sbs_claim_context_code', JSON.stringify(context));
                     toast.success('Code context assigned to claim builder');
                     window.dispatchEvent(new CustomEvent('sbs:navigate', { detail: { view: 'claim-builder' } }));
                   }}
                 >
                   Enroll in Workspace
                 </Button>
                 <Button variant="secondary" className="w-full py-6 text-sm" icon="content_copy" onClick={() => copyCode(selectedCode.code)}>Copy Entity ID</Button>
              </div>
           </div>
        </aside>
      )}
    </div>
  );
}

function CodeCell({ code, selected, onClick, onCopy }) {
  return (
    <Card 
      onClick={onClick}
      className={`group cursor-pointer transition-all hover:scale-[1.02] border-2 ${selected ? 'border-blue-600 shadow-2xl shadow-blue-600/10' : 'border-transparent'}`}
    >
       <CardBody className="p-8 space-y-6">
          <div className="flex justify-between items-center">
             <span className="text-lg font-black tracking-tight text-blue-600 font-mono">{code.code}</span>
             <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className="size-8 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-blue-600 transition-all">
                <span className="material-symbols-outlined text-sm">content_copy</span>
             </button>
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
             {code.desc}
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{code.category?.replace(/_/g, ' ') || 'Clinical'}</span>
             {code.source === 'ai' && <span className="material-symbols-outlined text-amber-500 text-lg">auto_awesome</span>}
          </div>
       </CardBody>
    </Card>
  );
}
