import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { aiAssistant } from '../services/aiAssistantService';
import { useToast } from '../components/Toast';

/**
 * SBS Code Browser - Full 10,466+ Official Codes
 * Explore, search, and get AI-powered suggestions
 */
export function SBSCodeBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCode, setSelectedCode] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [isSearching, setIsSearching] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [aiDiagnoses, setAiDiagnoses] = useState(null);
  const scrollRef = useRef(null);
  const toast = useToast();
  
  // Get all codes and categories from AI service
  const allCodes = useMemo(() => aiAssistant.getAllCodes(), []);
  const categories = useMemo(() => ['all', ...aiAssistant.getCategories()], []);
  const totalCount = aiAssistant.getTotalCount();

  // Search results with AI enhancement
  const [searchResults, setSearchResults] = useState({ results: allCodes, source: 'local' });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          const results = await aiAssistant.smartSearch(searchQuery, {
            limit: 100,
            category: selectedCategory === 'all' ? null : selectedCategory,
            includeAI: true
          });
          setSearchResults(results);
          setAiInsights(results.aiInsights);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      } else if (searchQuery.length === 0) {
        // Show all codes filtered by category
        const filtered = selectedCategory === 'all' 
          ? allCodes 
          : allCodes.filter(c => c.category === selectedCategory);
        setSearchResults({ results: filtered, source: 'local' });
        setAiInsights(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, allCodes]);

  // Filter by category when no search
  const filteredCodes = useMemo(() => {
    if (searchQuery.length >= 2) return searchResults.results;
    
    return selectedCategory === 'all' 
      ? allCodes 
      : allCodes.filter(c => c.category === selectedCategory);
  }, [searchQuery, searchResults, selectedCategory, allCodes]);

  // Displayed codes (with limit for performance)
  const displayedCodes = useMemo(() => {
    return filteredCodes.slice(0, displayLimit);
  }, [filteredCodes, displayLimit]);

  // Load more on scroll
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 200 && displayLimit < filteredCodes.length) {
      setDisplayLimit(prev => Math.min(prev + 50, filteredCodes.length));
    }
  }, [displayLimit, filteredCodes.length]);

  // Handle code selection
  const handleCodeClick = useCallback(async (code) => {
    setSelectedCode(code);
    setAiDiagnoses(null);
    
    // Get AI diagnosis suggestions
    try {
      const diagnoses = await aiAssistant.suggestDiagnoses(code.code, code.desc);
      setAiDiagnoses(diagnoses);
    } catch (error) {
      console.warn('Could not get AI diagnoses:', error);
    }
  }, []);

  // Copy code to clipboard
  const copyCode = useCallback((code) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code} to clipboard`);
  }, [toast]);

  // Stats
  const stats = useMemo(() => ({
    total: totalCount,
    filtered: filteredCodes.length,
    displayed: displayedCodes.length,
    categories: categories.length - 1
  }), [totalCount, filteredCodes, displayedCodes, categories]);

  return (
    <div className="flex-1 overflow-hidden bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <span className="material-symbols-rounded text-3xl text-white">medical_information</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">SBS Code Catalogue</h1>
              <p className="text-slate-300">
                Official CHI Saudi Billing System V3.1 • <strong className="text-emerald-400">{stats.total.toLocaleString()}</strong> codes
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {searchResults.source === 'ai_enhanced' && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500 to-purple-500 text-white flex items-center gap-1">
                  <span className="material-symbols-rounded text-sm">auto_awesome</span>
                  AI Enhanced
                </span>
              )}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px] relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayLimit(50);
                }}
                placeholder="Search by code, description, or ask AI..."
                className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              {isSearching && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-violet-400 animate-spin">
                  progress_activity
                </span>
              )}
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setDisplayLimit(50);
              }}
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30 min-w-[200px]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-slate-800">
                  {cat === 'all' ? `All Categories (${stats.categories})` : cat}
                </option>
              ))}
            </select>
            <div className="flex bg-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-slate-800' : 'text-white'}`}
              >
                <span className="material-symbols-rounded">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-slate-800' : 'text-white'}`}
              >
                <span className="material-symbols-rounded">view_list</span>
              </button>
            </div>
          </div>

          {/* Stats & AI Insights */}
          <div className="mt-4 flex flex-wrap gap-6 text-sm items-center">
            <span className="text-slate-400">
              Showing <strong className="text-white">{stats.displayed.toLocaleString()}</strong> of{' '}
              <strong className="text-white">{stats.filtered.toLocaleString()}</strong> codes
            </span>
            {aiInsights && (
              <span className="px-3 py-1 rounded-lg bg-violet-500/20 text-violet-300 flex items-center gap-2">
                <span className="material-symbols-rounded text-sm">lightbulb</span>
                {aiInsights}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-8 py-8"
          onScroll={handleScroll}
        >
          <div className="max-w-7xl mx-auto">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedCodes.map((code, index) => (
                  <CodeCard 
                    key={code.code + index} 
                    code={code} 
                    onClick={() => handleCodeClick(code)}
                    isSelected={selectedCode?.code === code.code}
                    onCopy={() => copyCode(code.code)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedCodes.map((code, index) => (
                      <tr 
                        key={code.code + index} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer ${
                          selectedCode?.code === code.code ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => handleCodeClick(code)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-primary font-semibold">{code.code}</span>
                            {code.source === 'ai' && (
                              <span className="material-symbols-rounded text-sm text-violet-500" title="AI Suggested">
                                auto_awesome
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white max-w-md truncate">
                          {code.desc}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {code.category || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); copyCode(code.code); }}
                              className="text-slate-400 hover:text-primary"
                              title="Copy code"
                            >
                              <span className="material-symbols-rounded">content_copy</span>
                            </button>
                            <button className="text-slate-400 hover:text-primary">
                              <span className="material-symbols-rounded">arrow_forward</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Load More Indicator */}
            {displayLimit < filteredCodes.length && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setDisplayLimit(prev => prev + 100)}
                  className="px-6 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Load more ({filteredCodes.length - displayLimit} remaining)
                </button>
              </div>
            )}

            {filteredCodes.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="material-symbols-rounded text-6xl text-slate-300 mb-4">search_off</span>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">No codes found</h3>
                <p className="text-slate-500">Try adjusting your search or filter criteria</p>
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

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">SBS Code</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-2xl font-bold text-primary">{selectedCode.code}</p>
                    <button 
                      onClick={() => copyCode(selectedCode.code)}
                      className="text-slate-400 hover:text-primary"
                    >
                      <span className="material-symbols-rounded text-lg">content_copy</span>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Description (English)</p>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedCode.desc}</p>
                </div>

                {selectedCode.descAr && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Description (Arabic)</p>
                    <p className="text-sm text-slate-900 dark:text-white text-right" dir="rtl">{selectedCode.descAr}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Category</p>
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-primary/10 text-primary">
                    {selectedCode.category || 'General'}
                  </span>
                </div>

                {selectedCode.chapter && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-medium mb-1">Chapter</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{selectedCode.chapter}</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Diagnoses */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-violet-500">auto_awesome</span>
                <h4 className="font-semibold text-slate-900 dark:text-white">AI Suggested Diagnoses</h4>
              </div>
              
              {aiDiagnoses === null ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                  Loading suggestions...
                </div>
              ) : aiDiagnoses.diagnoses?.length > 0 ? (
                <div className="space-y-2">
                  {aiDiagnoses.diagnoses.map((diag, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm text-emerald-600 font-semibold">{diag.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          diag.relevance === 'high' ? 'bg-emerald-100 text-emerald-700' :
                          diag.relevance === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {diag.relevance}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{diag.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No AI suggestions available</p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-6">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h4>
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    // Navigate to claim builder with this code
                    window.dispatchEvent(new CustomEvent('addToClaim', { detail: selectedCode }));
                    toast.success('Code added to claim builder');
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white text-sm font-medium hover:from-primary/90 hover:to-blue-700 flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-rounded text-lg">add_circle</span>
                  Add to Claim
                </button>
                <button 
                  onClick={() => copyCode(selectedCode.code)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">content_copy</span>
                  Copy Code
                </button>
                <button 
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-rounded text-lg">approval</span>
                  Check Prior Auth
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeCard({ code, onClick, isSelected, onCopy }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-xl border transition-all hover:shadow-lg group ${
        isSelected 
          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg' 
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-primary">{code.code}</span>
          {code.source === 'ai' && (
            <span className="material-symbols-rounded text-sm text-violet-500" title="AI Suggested">
              auto_awesome
            </span>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary transition-opacity"
        >
          <span className="material-symbols-rounded text-lg">content_copy</span>
        </button>
      </div>
      <p className="text-sm text-slate-900 dark:text-white line-clamp-2 mb-3">{code.desc}</p>
      <div className="flex items-center justify-between">
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 line-clamp-1">
          {code.category || 'General'}
        </span>
        {code.confidence && (
          <span className="text-xs text-violet-500">{Math.round(code.confidence * 100)}%</span>
        )}
      </div>
    </button>
  );
}
