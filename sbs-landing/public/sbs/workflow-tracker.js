/**
 * Enhanced Workflow Tracker
 * Visual component showing real-time claim processing progress through all stages
 */

class WorkflowTracker {
  constructor(claimId) {
    this.claimId = claimId;
    this.stages = [
      {
        key: 'received',
        name: 'Received',
        icon: '📥',
        description: 'Claim received and queued'
      },
      {
        key: 'validation',
        name: 'Validation',
        icon: '✓',
        description: 'Validating claim data'
      },
      {
        key: 'normalization',
        name: 'Normalization',
        icon: '🔄',
        description: 'Mapping codes to SBS standard'
      },
      {
        key: 'financialRules',
        name: 'Financial Rules',
        icon: '💰',
        description: 'Applying pricing and bundles'
      },
      {
        key: 'signing',
        name: 'Digital Signing',
        icon: '🔐',
        description: 'Signing claim with certificate'
      },
      {
        key: 'nphiesSubmission',
        name: 'NPHIES Submission',
        icon: '🚀',
        description: 'Submitting to NPHIES platform'
      }
    ];

    this.claimData = null;
    this.pollingInterval = null;
    this.isPolling = false;
  }

  async init() {
    await this.render();
    await this.fetchStatus();
    this.startPolling();
  }

  async fetchStatus() {
    try {
      const apiBaseUrl = window.SBS_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/claim-status/${this.claimId}`);
      const data = await response.json();

      if (data.success) {
        this.claimData = data;
        this.updateDisplay();

        // Stop polling if complete
        if (data.isComplete) {
          this.stopPolling();
        }
      } else {
        console.error('Failed to fetch claim status:', data);
        toast?.error('Failed to fetch claim status');
      }
    } catch (error) {
      console.error('Error fetching claim status:', error);
      toast?.error('Network error while fetching status');
    }
  }

  startPolling() {
    if (this.isPolling) return;

    this.isPolling = true;
    this.pollingInterval = setInterval(async () => {
      await this.fetchStatus();
    }, 3000); // Poll every 3 seconds
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
    }
  }

  destroy() {
    this.stopPolling();
  }

  getStageStatus(stageKey) {
    if (!this.claimData || !this.claimData.stages) {
      return { status: 'pending', timestamp: null, data: null };
    }

    const stage = this.claimData.stages[stageKey];
    return stage || { status: 'pending', timestamp: null, data: null };
  }

  getOverallStatus() {
    if (!this.claimData) return 'loading';

    if (this.claimData.isFailed) return 'failed';
    if (this.claimData.isSuccess) return 'success';
    if (this.claimData.isComplete) return 'completed';
    return 'processing';
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getStageColor(status) {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'blue';
      case 'failed': return 'red';
      default: return 'gray';
    }
  }

  updateDisplay() {
    // Update progress bar
    const progressBar = document.getElementById('workflowProgressBar');
    if (progressBar && this.claimData) {
      const percentage = this.claimData.progress?.percentage || 0;
      progressBar.style.width = `${percentage}%`;
      progressBar.className = `h-full transition-all duration-500 ease-out rounded-full ${
        this.claimData.isFailed ? 'bg-red-500' :
        this.claimData.isSuccess ? 'bg-green-500' :
        'bg-gradient-to-r from-blue-500 to-purple-600'
      }`;
    }

    // Update percentage text
    const percentageText = document.getElementById('workflowPercentage');
    if (percentageText && this.claimData) {
      percentageText.textContent = `${this.claimData.progress?.percentage || 0}%`;
    }

    // Update stage indicators
    this.stages.forEach(stage => {
      const stageElement = document.getElementById(`stage-${stage.key}`);
      if (!stageElement) return;

      const stageStatus = this.getStageStatus(stage.key);
      const color = this.getStageColor(stageStatus.status);

      // Update circle indicator
      const circle = stageElement.querySelector('.stage-circle');
      if (circle) {
        circle.className = `stage-circle w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
          stageStatus.status === 'completed' ? `bg-${color}-500 text-white scale-110` :
          stageStatus.status === 'in_progress' ? `bg-${color}-500 text-white animate-pulse` :
          stageStatus.status === 'failed' ? `bg-${color}-500 text-white` :
          'bg-gray-200 text-gray-400'
        }`;
      }

      // Update status badge
      const badge = stageElement.querySelector('.stage-badge');
      if (badge) {
        badge.className = `stage-badge text-xs font-medium px-2 py-1 rounded-full ${
          stageStatus.status === 'completed' ? 'bg-green-100 text-green-800' :
          stageStatus.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          stageStatus.status === 'failed' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-600'
        }`;
        badge.textContent = stageStatus.status === 'in_progress' ? 'Processing...' :
                           stageStatus.status === 'completed' ? 'Completed' :
                           stageStatus.status === 'failed' ? 'Failed' :
                           'Pending';
      }

      // Update timestamp
      const timestamp = stageElement.querySelector('.stage-timestamp');
      if (timestamp) {
        timestamp.textContent = this.formatTimestamp(stageStatus.timestamp);
      }

      // Update details
      const details = stageElement.querySelector('.stage-details');
      if (details && stageStatus.data) {
        details.innerHTML = this.renderStageDetails(stage.key, stageStatus.data);
        details.classList.remove('hidden');
      }
    });

    // Update overall status
    this.updateOverallStatus();

    // Update timeline
    this.updateTimeline();
  }

  renderStageDetails(stageKey, data) {
    switch (stageKey) {
      case 'normalization':
        return `
          <div class="text-xs space-y-1">
            ${data.sbsCode ? `<div>✓ SBS Code: <span class="font-medium">${data.sbsCode}</span></div>` : ''}
            ${data.confidence ? `<div>Confidence: ${(data.confidence * 100).toFixed(0)}%</div>` : ''}
          </div>
        `;

      case 'financialRules':
        return `
          <div class="text-xs space-y-1">
            ${data.total ? `<div>Total: <span class="font-medium">${data.total} ${data.currency || 'SAR'}</span></div>` : ''}
            ${data.bundleApplied ? `<div class="text-green-600">✓ Bundle applied</div>` : ''}
          </div>
        `;

      case 'nphiesSubmission':
        return `
          <div class="text-xs space-y-1">
            ${data.transactionId ? `<div>Transaction: <span class="font-mono text-xs">${data.transactionId.substring(0, 20)}...</span></div>` : ''}
          </div>
        `;

      default:
        return '';
    }
  }

  updateOverallStatus() {
    const statusContainer = document.getElementById('overallStatusContainer');
    if (!statusContainer || !this.claimData) return;

    const status = this.getOverallStatus();
    const statusConfig = {
      loading: {
        color: 'gray',
        icon: '⏳',
        title: 'Loading...',
        message: 'Fetching claim status'
      },
      processing: {
        color: 'blue',
        icon: '⚡',
        title: 'Processing',
        message: 'Your claim is being processed'
      },
      success: {
        color: 'green',
        icon: '✓',
        title: 'Success!',
        message: 'Claim submitted successfully to NPHIES'
      },
      failed: {
        color: 'red',
        icon: '✗',
        title: 'Failed',
        message: 'Claim processing failed'
      },
      completed: {
        color: 'blue',
        icon: '✓',
        title: 'Completed',
        message: 'Claim processing completed'
      }
    };

    const config = statusConfig[status];

    statusContainer.innerHTML = `
      <div class="bg-${config.color}-50 border-2 border-${config.color}-200 rounded-lg p-6 text-center">
        <div class="text-6xl mb-3">${config.icon}</div>
        <h3 class="text-2xl font-bold text-${config.color}-800 mb-2">${config.title}</h3>
        <p class="text-${config.color}-600">${config.message}</p>
        ${this.claimData.processingTimeMs ? `
          <div class="mt-4 text-sm text-${config.color}-600">
            Processing time: ${(this.claimData.processingTimeMs / 1000).toFixed(2)}s
          </div>
        ` : ''}
      </div>
    `;
  }

  updateTimeline() {
    const timelineContainer = document.getElementById('timelineContainer');
    if (!timelineContainer || !this.claimData || !this.claimData.timeline) return;

    timelineContainer.innerHTML = `
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Activity Timeline</h3>
      <div class="space-y-3">
        ${this.claimData.timeline.map((event, index) => `
          <div class="flex items-start gap-3 ${index > 0 ? 'border-l-2 border-gray-200 ml-2 pl-4' : ''}">
            <div class="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
            <div class="flex-1">
              <div class="text-sm font-medium text-gray-800">${this.escapeHtml(event.message || event.event)}</div>
              <div class="text-xs text-gray-500">${this.formatTimestamp(event.timestamp)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  async render() {
    const container = document.getElementById('workflowTrackerContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="max-w-6xl mx-auto space-y-6">
        <!-- Overall Status -->
        <div id="overallStatusContainer"></div>

        <!-- Progress Bar -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-lg font-semibold text-gray-800">Processing Progress</h3>
            <span id="workflowPercentage" class="text-2xl font-bold text-blue-600">0%</span>
          </div>
          <div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div id="workflowProgressBar" class="h-full transition-all duration-500 ease-out rounded-full bg-gradient-to-r from-blue-500 to-purple-600" style="width: 0%"></div>
          </div>
        </div>

        <!-- Stage Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${this.stages.map(stage => `
            <div id="stage-${stage.key}" class="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow">
              <div class="flex items-center gap-3 mb-3">
                <div class="stage-circle w-12 h-12 rounded-full flex items-center justify-center text-xl bg-gray-200 text-gray-400">
                  ${stage.icon}
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-gray-800">${stage.name}</div>
                  <div class="stage-badge text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 inline-block">
                    Pending
                  </div>
                </div>
              </div>
              <div class="text-sm text-gray-600 mb-2">${stage.description}</div>
              <div class="stage-timestamp text-xs text-gray-500"></div>
              <div class="stage-details mt-2 text-sm text-gray-700 hidden"></div>
            </div>
          `).join('')}
        </div>

        <!-- Timeline -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <div id="timelineContainer">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Activity Timeline</h3>
            <div class="text-gray-500 text-center py-8">Loading timeline...</div>
          </div>
        </div>

        <!-- Error Details -->
        <div id="errorDetailsContainer" class="hidden bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-red-800 mb-3">Error Details</h3>
          <div id="errorDetailsList" class="space-y-2"></div>
        </div>

        <!-- NPHIES Response -->
        <div id="nphiesResponseContainer" class="hidden bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-3">NPHIES Response</h3>
          <pre id="nphiesResponseContent" class="bg-white p-4 rounded border border-gray-300 overflow-x-auto text-xs"></pre>
        </div>
      </div>
    `;
  }
}

// Export for use in other files
window.WorkflowTracker = WorkflowTracker;
