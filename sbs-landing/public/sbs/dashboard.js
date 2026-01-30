/**
 * SBS Claims Dashboard
 * Real-time monitoring dashboard for user's claim submissions and progression
 */

class ClaimsDashboard {
  constructor() {
    this.claims = [];
    this.filteredClaims = [];
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.sortBy = 'submittedAt';
    this.sortOrder = 'desc';
    this.filterStatus = 'all';
    this.searchTerm = '';
    this.isLoading = false;
    this.refreshInterval = null;
    this.stats = {
      total: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      avgProcessingTime: 0
    };
  }

  init() {
    this.loadUserClaims();
    this.startAutoRefresh();
    this.render();
  }

  destroy() {
    this.stopAutoRefresh();
  }

  startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadUserClaims(false);
    }, 30000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async loadUserClaims(showLoading = true) {
    if (showLoading) {
      this.isLoading = true;
      this.render();
    }

    try {
      const userEmail = localStorage.getItem('sbs-user-email');
      const apiBaseUrl = window.SBS_API_BASE_URL || '';
      const url = userEmail 
        ? `${apiBaseUrl}/api/claims?email=${encodeURIComponent(userEmail)}`
        : `${apiBaseUrl}/api/claims`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        this.claims = data.claims || [];
        this.calculateStats();
        this.applyFiltersAndSort();
      }
    } catch (error) {
      console.error('Failed to load claims:', error);
      toast.error('Failed to load claims. Please try again.');
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  calculateStats() {
    this.stats = {
      total: this.claims.length,
      processing: this.claims.filter(c => !c.isComplete).length,
      completed: this.claims.filter(c => c.isComplete && c.isSuccess).length,
      failed: this.claims.filter(c => c.isComplete && !c.isSuccess).length,
      avgProcessingTime: this.calculateAvgProcessingTime()
    };
  }

  calculateAvgProcessingTime() {
    const completedClaims = this.claims.filter(c => c.isComplete && c.completedAt && c.submittedAt);
    if (completedClaims.length === 0) return 0;

    const totalTime = completedClaims.reduce((sum, claim) => {
      const start = new Date(claim.submittedAt).getTime();
      const end = new Date(claim.completedAt).getTime();
      return sum + (end - start);
    }, 0);

    return Math.round(totalTime / completedClaims.length / 1000); // In seconds
  }

  applyFiltersAndSort() {
    let filtered = [...this.claims];

    // Apply status filter
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter(claim => {
        switch (this.filterStatus) {
          case 'processing':
            return !claim.isComplete;
          case 'completed':
            return claim.isComplete && claim.isSuccess;
          case 'failed':
            return claim.isComplete && !claim.isSuccess;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(claim =>
        claim.claimId?.toLowerCase().includes(term) ||
        claim.patientName?.toLowerCase().includes(term) ||
        claim.patientId?.toLowerCase().includes(term)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      let aVal = a[this.sortBy];
      let bVal = b[this.sortBy];

      if (this.sortBy === 'submittedAt' || this.sortBy === 'completedAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      if (this.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    this.filteredClaims = filtered;
  }

  setFilter(status) {
    this.filterStatus = status;
    this.currentPage = 1;
    this.applyFiltersAndSort();
    this.render();
  }

  setSearch(term) {
    this.searchTerm = term;
    this.currentPage = 1;
    this.applyFiltersAndSort();
    this.render();
  }

  setSort(field) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
    this.applyFiltersAndSort();
    this.render();
  }

  setPage(page) {
    this.currentPage = page;
    this.render();
  }

  getPaginatedClaims() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredClaims.slice(start, end);
  }

  getTotalPages() {
    return Math.ceil(this.filteredClaims.length / this.itemsPerPage);
  }

  getStatusBadge(claim) {
    if (!claim.isComplete) {
      return `<span class="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 flex items-center gap-1">
        <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Processing
      </span>`;
    } else if (claim.isSuccess) {
      return `<span class="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Completed
      </span>`;
    } else {
      return `<span class="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Failed
      </span>`;
    }
  }

  getProgressBar(claim) {
    const progress = claim.progress?.percentage || 0;
    const color = claim.isComplete 
      ? (claim.isSuccess ? 'bg-emerald-500' : 'bg-red-500')
      : 'bg-blue-500';
    
    return `<div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div class="${color} h-full transition-all duration-500" style="width: ${progress}%"></div>
    </div>`;
  }

  getCurrentStage(claim) {
    if (!claim.stages) return 'Unknown';
    
    const stageOrder = ['received', 'validation', 'normalization', 'financialRules', 'signing', 'nphiesSubmission'];
    
    for (const stage of stageOrder.reverse()) {
      if (claim.stages[stage]?.status === 'in_progress') {
        return this.formatStageName(stage);
      }
      if (claim.stages[stage]?.status === 'completed') {
        const nextIndex = stageOrder.indexOf(stage) + 1;
        if (nextIndex < stageOrder.length) {
          return `Awaiting ${this.formatStageName(stageOrder[nextIndex])}`;
        }
      }
    }
    
    if (claim.isComplete) {
      return claim.isSuccess ? 'Completed' : 'Failed';
    }
    
    return 'Pending';
  }

  formatStageName(stage) {
    const names = {
      received: 'Received',
      validation: 'Validation',
      normalization: 'Normalization',
      financialRules: 'Financial Rules',
      signing: 'Digital Signing',
      nphiesSubmission: 'NPHIES Submission'
    };
    return names[stage] || stage;
  }

  formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    const container = document.getElementById('dashboard-container');
    if (!container) return;

    const paginatedClaims = this.getPaginatedClaims();
    const totalPages = this.getTotalPages();

    container.innerHTML = `
      <div class="bg-slate-900 min-h-screen p-6">
        <!-- Header -->
        <div class="max-w-7xl mx-auto">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 class="text-3xl font-bold text-white mb-2">Claims Dashboard</h1>
              <p class="text-slate-400">Monitor your claim submissions in real-time</p>
            </div>
            <div class="flex gap-3">
              <button onclick="dashboard.loadUserClaims()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors">
                <svg class="w-4 h-4 ${this.isLoading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </button>
              <button onclick="app.openClaimModal()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold flex items-center gap-2 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                New Claim
              </button>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-slate-400 text-sm">Total Claims</p>
                  <p class="text-2xl font-bold text-white">${this.stats.total}</p>
                </div>
                <div class="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="bg-slate-800/50 border border-blue-500/30 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-blue-400 text-sm">Processing</p>
                  <p class="text-2xl font-bold text-white">${this.stats.processing}</p>
                </div>
                <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-emerald-400 text-sm">Completed</p>
                  <p class="text-2xl font-bold text-white">${this.stats.completed}</p>
                </div>
                <div class="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="bg-slate-800/50 border border-red-500/30 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-red-400 text-sm">Failed</p>
                  <p class="text-2xl font-bold text-white">${this.stats.failed}</p>
                </div>
                <div class="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-slate-400 text-sm">Avg. Processing</p>
                  <p class="text-2xl font-bold text-white">${this.formatDuration(this.stats.avgProcessingTime)}</p>
                </div>
                <div class="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Filters and Search -->
          <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
            <div class="flex flex-col md:flex-row justify-between gap-4">
              <!-- Status Filters -->
              <div class="flex flex-wrap gap-2">
                <button onclick="dashboard.setFilter('all')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${this.filterStatus === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">
                  All
                </button>
                <button onclick="dashboard.setFilter('processing')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${this.filterStatus === 'processing' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">
                  Processing
                </button>
                <button onclick="dashboard.setFilter('completed')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${this.filterStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">
                  Completed
                </button>
                <button onclick="dashboard.setFilter('failed')" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors ${this.filterStatus === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">
                  Failed
                </button>
              </div>
              
              <!-- Search -->
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search claims..." 
                  value="${this.escapeHtml(this.searchTerm)}"
                  onkeyup="dashboard.setSearch(this.value)"
                  class="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none w-full md:w-64"
                />
              </div>
            </div>
          </div>

          <!-- Claims Table -->
          <div class="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            ${this.isLoading ? `
              <div class="flex justify-center items-center py-20">
                <svg class="w-8 h-8 text-emerald-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </div>
            ` : paginatedClaims.length === 0 ? `
              <div class="flex flex-col justify-center items-center py-20 text-slate-400">
                <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p class="text-lg font-medium">No claims found</p>
                <p class="text-sm">Submit your first claim to get started</p>
                <button onclick="app.openClaimModal()" class="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg font-bold transition-colors">
                  Submit Claim
                </button>
              </div>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-slate-900/50">
                    <tr>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white" onclick="dashboard.setSort('claimId')">
                        Claim ID
                        ${this.sortBy === 'claimId' ? `<span class="ml-1">${this.sortOrder === 'asc' ? '↑' : '↓'}</span>` : ''}
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white" onclick="dashboard.setSort('patientName')">
                        Patient
                        ${this.sortBy === 'patientName' ? `<span class="ml-1">${this.sortOrder === 'asc' ? '↑' : '↓'}</span>` : ''}
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Progress
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Current Stage
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white" onclick="dashboard.setSort('submittedAt')">
                        Submitted
                        ${this.sortBy === 'submittedAt' ? `<span class="ml-1">${this.sortOrder === 'asc' ? '↑' : '↓'}</span>` : ''}
                      </th>
                      <th class="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-700">
                    ${paginatedClaims.map(claim => `
                      <tr class="hover:bg-slate-800/50 transition-colors">
                        <td class="px-6 py-4">
                          <span class="text-emerald-400 font-mono text-sm">${this.escapeHtml(claim.claimId)}</span>
                        </td>
                        <td class="px-6 py-4">
                          <div>
                            <p class="text-white font-medium">${this.escapeHtml(claim.patientName || '—')}</p>
                            <p class="text-slate-400 text-sm">${this.escapeHtml(claim.patientId || '—')}</p>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <span class="px-2 py-1 bg-slate-700 rounded text-slate-300 text-xs uppercase">${this.escapeHtml(claim.claimType || 'professional')}</span>
                        </td>
                        <td class="px-6 py-4">
                          ${this.getStatusBadge(claim)}
                        </td>
                        <td class="px-6 py-4 min-w-32">
                          <div class="flex items-center gap-2">
                            <div class="flex-1">
                              ${this.getProgressBar(claim)}
                            </div>
                            <span class="text-slate-400 text-xs">${claim.progress?.percentage || 0}%</span>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <span class="text-slate-300 text-sm">${this.getCurrentStage(claim)}</span>
                        </td>
                        <td class="px-6 py-4">
                          <span class="text-slate-400 text-sm">${this.formatDate(claim.submittedAt)}</span>
                        </td>
                        <td class="px-6 py-4 text-right">
                          <button onclick="app.openTrackingModal('${this.escapeHtml(claim.claimId)}')" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors">
                            View
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>

          <!-- Pagination -->
          ${totalPages > 1 ? `
            <div class="flex justify-between items-center mt-4 px-2">
              <p class="text-slate-400 text-sm">
                Showing ${(this.currentPage - 1) * this.itemsPerPage + 1} to ${Math.min(this.currentPage * this.itemsPerPage, this.filteredClaims.length)} of ${this.filteredClaims.length} claims
              </p>
              <div class="flex gap-2">
                <button 
                  onclick="dashboard.setPage(${this.currentPage - 1})"
                  ${this.currentPage === 1 ? 'disabled' : ''}
                  class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                ${Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - this.currentPage) <= 1)
                  .map((p, i, arr) => {
                    let result = '';
                    if (i > 0 && arr[i - 1] !== p - 1) {
                      result += '<span class="px-2 text-slate-500">...</span>';
                    }
                    result += `<button onclick="dashboard.setPage(${p})" class="px-3 py-1 ${p === this.currentPage ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-white'} rounded transition-colors">${p}</button>`;
                    return result;
                  }).join('')}
                <button 
                  onclick="dashboard.setPage(${this.currentPage + 1})"
                  ${this.currentPage === totalPages ? 'disabled' : ''}
                  class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClaimsDashboard;
}
