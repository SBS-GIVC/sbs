import { useState, useMemo, useCallback } from 'react';
import sbsCodesData from '../data/sbs_codes.json';

/**
 * SBS Code Browser
 * Explore and search the official Saudi Billing System code catalogue
 */
export function SBSCodeBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCode, setSelectedCode] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Get all codes as array
  const allCodes = useMemo(() => {
    return Object.values(sbsCodesData.codes || {});
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    allCodes.forEach(code => {
      if (code.category) cats.add(code.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [allCodes]);

  // Filter codes based on search and category
  const filteredCodes = useMemo(() => {
    return allCodes.filter(code => {
      const matchesSearch = searchQuery === '' || 
        code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.desc.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        code.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [allCodes, searchQuery, selectedCategory]);

  // Stats
  const stats = useMemo(() => ({
    total: allCodes.length,
    filtered: filteredCodes.length,
    categories: categories.length - 1
  }), [allCodes, filteredCodes, categories]);

  const handleCodeClick = useCallback((code) => {
    setSelectedCode(code);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <span className="material-symbols-rounded text-3xl text-white">medical_information</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">SBS Code Catalogue</h1>
              <p className="text-slate-300">Official CHI Saudi Billing System V3.1 • {stats.total.toLocaleString()} codes</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px] relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-rounded text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code or description..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/30 min-w-[200px]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-slate-800">
                  {cat === 'all' ? 'All Categories' : cat}
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

          {/* Stats Bar */}
          <div className="mt-4 flex gap-6 text-sm">
            <span className="text-slate-400">
              Showing <strong className="text-white">{stats.filtered.toLocaleString()}</strong> of {stats.total.toLocaleString()} codes
            </span>
            <span className="text-slate-400">
              <strong className="text-white">{stats.categories}</strong> categories
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-8 py-8 flex gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCodes.slice(0, 50).map((code, index) => (
                <CodeCard 
                  key={index} 
                  code={code} 
                  onClick={() => handleCodeClick(code)}
                  isSelected={selectedCode?.code === code.code}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCodes.slice(0, 50).map((code, index) => (
                    <tr 
                      key={index} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer ${
                        selectedCode?.code === code.code ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleCodeClick(code)}
                    >
                      <td className="px-6 py-4 font-mono text-sm text-primary font-semibold">{code.code}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{code.desc}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {code.category || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-primary hover:text-primary/80">
                          <span className="material-symbols-rounded">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredCodes.length > 50 && (
            <div className="mt-6 text-center">
              <p className="text-slate-500">
                Showing first 50 results. Refine your search to see more specific codes.
              </p>
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

        {/* Detail Sidebar */}
        {selectedCode && (
          <div className="w-80 flex-shrink-0">
            <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sticky top-8">
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
                  <p className="font-mono text-xl font-bold text-primary">{selectedCode.code}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Description</p>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedCode.desc}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-1">Category</p>
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-primary/10 text-primary">
                    {selectedCode.category || 'General'}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 uppercase font-medium mb-2">Quick Actions</p>
                  <div className="space-y-2">
                    <button className="w-full px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
                      <span className="material-symbols-rounded text-lg">add_circle</span>
                      Add to Claim
                    </button>
                    <button className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2">
                      <span className="material-symbols-rounded text-lg">content_copy</span>
                      Copy Code
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeCard({ code, onClick, isSelected }) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-xl border transition-all hover:shadow-lg ${
        isSelected 
          ? 'border-primary bg-primary/5 dark:bg-primary/10' 
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="font-mono text-sm font-bold text-primary">{code.code}</span>
        <span className="material-symbols-rounded text-slate-300 text-lg">arrow_forward</span>
      </div>
      <p className="text-sm text-slate-900 dark:text-white line-clamp-2 mb-3">{code.desc}</p>
      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
        {code.category || 'General'}
      </span>
    </button>
  );
}
