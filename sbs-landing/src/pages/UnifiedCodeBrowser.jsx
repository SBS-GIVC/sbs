import { useState, useMemo, useCallback, useEffect } from 'react';
import { unifiedTerminology, CODE_SYSTEMS, SYSTEM_CATEGORIES } from '../services/unifiedTerminologyService';
import { useToast } from '../components/Toast';

/**
 * Unified Code Browser
 * Search across all healthcare coding systems in one interface
 */
export function UnifiedCodeBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystems, setSelectedSystems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [results, setResults] = useState({ total: 0, results: [], systems: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const toast = useToast();

  // All available systems
  const allSystems = useMemo(() => Object.values(CODE_SYSTEMS), []);

  // System stats
  const systemStats = useMemo(() => {
    const stats = {};
    for (const result of results.results) {
      stats[result.system] = (stats[result.system] || 0) + 1;
    }
    return stats;
  }, [results]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults({ total: 0, results: [], systems: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await unifiedTerminology.search(searchQuery, {
          systems: selectedSystems.length > 0 ? selectedSystems : null,
          category: selectedCategory !== 'all' ? selectedCategory : null,
          limit: 50
        });
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedSystems, selectedCategory, toast]);

  // Handle system toggle
  const toggleSystem = useCallback((systemId) => {
    setSelectedSystems(prev => {
      if (prev.includes(systemId)) {
        return prev.filter(s => s !== systemId);
      } else {
        return [...prev, systemId];
      }
    });
  }, []);

  // Handle code selection
  const handleCodeSelect = useCallback(async (code) => {
    setSelectedCode(code);
    setMappings([]);
    setLoadingMappings(true);

    try {
      const codeMappings = await unifiedTerminology.getMappings(code.code, code.system);
      setMappings(codeMappings);
    } catch (error) {
      console.warn('Failed to load mappings:', error);
    } finally {
      setLoadingMappings(false);
    }
  }, []);

  // Copy code
  const copyCode = useCallback((code, system) => {
    navigator.clipboard.writeText(`${system}|${code}`);
    toast.success(`Copied: ${system}|${code}`);
  }, [toast]);

  return (
    <div className="flex-1 overflow-hidden bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <span className="material-symbols-rounded text-3xl text-white">hub</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Unified Code Browser</h1>
              <p className="text-slate-300">
                Search across <strong className="text-violet-400">8 code systems</strong> • 500,000+ codes
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                FHIR R4 Native
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30">
                AI-Powered
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400 text-xl">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diagnoses, procedures, labs, medications... (e.g., 'appendectomy', 'diabetes', 'glucose')"
              className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/10 border border-white/20 text-white text-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            {isSearching && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-violet-400 animate-spin">
                progress_activity
              </span>
            )}
          </div>

          {/* Code System Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {allSystems.map(system => (
              <button
                key={system.id}
                onClick={() => toggleSystem(system.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  selectedSystems.length === 0 || selectedSystems.includes(system.id)
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 opacity-60'
                }`}
                style={{
                  borderColor: selectedSystems.includes(system.id) ? system.color : undefined
                }}
              >
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: system.color }}
                />
                {system.name}
                {systemStats[system.id] && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-white/20">
                    {systemStats[system.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Context:</span>
            <div className="flex gap-2">
              {['all', 'diagnosis', 'procedure', 'laboratory', 'medication', 'billing'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-sm transition-all ${
                    selectedCategory === cat
                      ? 'bg-violet-500 text-white'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Results */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {searchQuery.length < 2 ? (
              <WelcomePanel systems={allSystems} />
            ) : results.results.length > 0 ? (
              <>
                <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  Found <strong className="text-slate-700 dark:text-white">{results.total}</strong> results across{' '}
                  <strong className="text-slate-700 dark:text-white">{results.systems.length}</strong> systems
                </div>

                <div className="space-y-3">
                  {results.results.map((code, index) => (
                    <CodeResultCard
                      key={`${code.system}-${code.code}-${index}`}
                      code={code}
                      isSelected={selectedCode?.code === code.code && selectedCode?.system === code.system}
                      onClick={() => handleCodeSelect(code)}
                      onCopy={() => copyCode(code.code, code.system)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <span className="material-symbols-rounded text-6xl text-slate-300 dark:text-slate-600 mb-4">search_off</span>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No results found</h3>
                <p className="text-slate-500">Try different search terms or adjust your filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Sidebar */}
        {selectedCode && (
          <div className="w-96 flex-shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark overflow-y-auto">
            <div className="p-6 sticky top-0 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Code Details</h3>
                <button
                  onClick={() => setSelectedCode(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-rounded">close</span>
                </button>
              </div>

              {/* Code Info */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedCode.systemColor }}
                    />
                    <span className="text-xs text-slate-500 uppercase font-medium">
                      {selectedCode.systemName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-2xl font-bold text-primary">{selectedCode.code}</p>
                    <button
                      onClick={() => copyCode(selectedCode.code, selectedCode.system)}
                      className="text-slate-400 hover:text-primary"
                    >
                      <span className="material-symbols-rounded text-lg">content_copy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Description</p>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedCode.display}</p>
                </div>

                {selectedCode.displayAr && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Arabic</p>
                    <p className="text-sm text-slate-900 dark:text-white text-right" dir="rtl">
                      {selectedCode.displayAr}
                    </p>
                  </div>
                )}

                {selectedCode.category && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Category</p>
                    <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-primary/10 text-primary">
                      {selectedCode.category}
                    </span>
                  </div>
                )}

                {selectedCode.chapter && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Chapter</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{selectedCode.chapter}</p>
                  </div>
                )}

                {selectedCode.weight && (
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-medium mb-1">Weight</p>
                      <p className="text-lg font-bold text-emerald-600">{selectedCode.weight}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-medium mb-1">Avg LOS</p>
                      <p className="text-lg font-bold text-blue-600">{selectedCode.avgLOS} days</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cross-System Mappings */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-violet-500">hub</span>
                <h4 className="font-semibold text-slate-900 dark:text-white">Cross-System Mappings</h4>
              </div>

              {loadingMappings ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                  Loading mappings...
                </div>
              ) : mappings.length > 0 ? (
                <div className="space-y-2">
                  {mappings.map((mapping, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 uppercase">{mapping.system}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          mapping.confidence >= 0.9 ? 'bg-emerald-100 text-emerald-700' :
                          mapping.confidence >= 0.7 ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {Math.round(mapping.confidence * 100)}%
                        </span>
                      </div>
                      <p className="font-mono text-sm text-primary font-semibold">{mapping.code}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{mapping.display}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No mappings available</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-6">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white text-sm font-medium hover:from-primary/90 hover:to-blue-700 flex items-center justify-center gap-2 transition-all">
                  <span className="material-symbols-rounded text-lg">add_circle</span>
                  Add to Claim
                </button>
                <button className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
                  <span className="material-symbols-rounded text-lg">swap_horiz</span>
                  Find Mappings
                </button>
                <button className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
                  <span className="material-symbols-rounded text-lg">account_tree</span>
                  View Hierarchy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomePanel({ systems }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {systems.map(system => (
        <div
          key={system.id}
          className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark hover:shadow-lg transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${system.color}20` }}
            >
              <span 
                className="material-symbols-rounded text-xl"
                style={{ color: system.color }}
              >
                {system.icon}
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{system.name}</h4>
              <p className="text-xs text-slate-500">{system.publisher}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {system.count.toLocaleString()}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              system.loaded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {system.loaded ? '✓ Loaded' : 'Available'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Version: {system.version}</p>
        </div>
      ))}
    </div>
  );
}

function CodeResultCard({ code, isSelected, onClick, onCopy }) {
  const system = CODE_SYSTEMS[code.system.toUpperCase()] || { color: '#6b7280', icon: 'code' };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-md ${
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${code.systemColor || system.color}15` }}
        >
          <span 
            className="material-symbols-rounded"
            style={{ color: code.systemColor || system.color }}
          >
            {system.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: `${code.systemColor || system.color}20`,
                color: code.systemColor || system.color
              }}
            >
              {code.systemName || code.system.toUpperCase()}
            </span>
            <span className="font-mono text-sm font-bold text-primary">{code.code}</span>
            {code.score && code.score >= 0.9 && (
              <span className="text-xs text-emerald-600">★ Best Match</span>
            )}
          </div>
          <p className="text-sm text-slate-900 dark:text-white line-clamp-2">{code.display}</p>
          {code.displayAr && (
            <p className="text-xs text-slate-500 mt-1 text-right" dir="rtl">{code.displayAr}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-rounded text-lg">content_copy</span>
          </button>
          <span className="material-symbols-rounded text-slate-400">arrow_forward</span>
        </div>
      </div>
    </button>
  );
}
