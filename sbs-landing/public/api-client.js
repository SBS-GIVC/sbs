// Minimal API client used by landing.js (optional).
// Kept intentionally small: the UI can fall back to fetch() directly.

(function () {
  class SBSAPIClient {
    constructor(baseUrl = '') {
      this.baseUrl = baseUrl;
    }

    setBaseUrl(baseUrl = '') {
      this.baseUrl = (baseUrl || '').trim();
    }

    url(path) {
      if (!path.startsWith('/')) path = `/${path}`;
      return this.baseUrl ? `${this.baseUrl}${path}` : path;
    }

    async jsonFetch(path, opts = {}) {
      const res = await fetch(this.url(path), {
        headers: {
          ...(opts.headers || {}),
        },
        ...opts,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { success: false, error: data || { message: `HTTP ${res.status}` } };
      }
      return { success: true, data };
    }

    submitClaim(formData) {
      return this.jsonFetch('/api/submit-claim', { method: 'POST', body: formData });
    }

    getClaimStatus(claimId) {
      return this.jsonFetch(`/api/claim-status/${encodeURIComponent(claimId)}`);
    }

    getClaimAnalysis(claimId) {
      return this.jsonFetch(`/api/claims/${encodeURIComponent(claimId)}/analyzer`);
    }

    retryClaim(claimId) {
      return this.jsonFetch(`/api/claims/${encodeURIComponent(claimId)}/retry`, { method: 'POST' });
    }

    getServicesStatus() {
      return this.jsonFetch('/api/services/status');
    }

    copilotChat(message, context = {}) {
      return this.jsonFetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      });
    }

    normalizeCode(payload) {
      return this.jsonFetch('/api/normalizer/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    eligibilityCheck(payload) {
      return this.jsonFetch('/api/eligibility/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    priorAuthSubmit(payload) {
      return this.jsonFetch('/api/prior-auth/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  }

  window.SBSAPIClient = SBSAPIClient;
  window.sbsApiClient = new SBSAPIClient();
})();
