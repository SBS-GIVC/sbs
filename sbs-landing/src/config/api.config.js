// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || window.SBS_API_URL || 'http://localhost:3000';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.brainsait.cloud/webhook/sbs-claim-submission';
const NPHIES_BRIDGE_URL = import.meta.env.VITE_NPHIES_BRIDGE_URL || 'http://localhost:8003';

export const config = {
  apiBaseUrl: API_BASE_URL,
  n8nWebhookUrl: N8N_WEBHOOK_URL,
  environment: import.meta.env.MODE || 'development',
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
};

// API Endpoints
export const endpoints = {
  // Health check
  health: `${API_BASE_URL}/health`,
  
  // Claims endpoints
  claims: {
    submit: `${API_BASE_URL}/api/claims/submit`,
    list: `${API_BASE_URL}/api/claims`,
    details: (id) => `${API_BASE_URL}/api/claims/${id}`,
    validate: `${API_BASE_URL}/api/claims/validate`,
  },
  
  // Eligibility endpoints
  eligibility: {
    check: `${API_BASE_URL}/api/eligibility/check`,
    verify: `${API_BASE_URL}/api/eligibility/verify`,
  },
  
  // Prior authorization endpoints
  priorAuth: {
    submit: `${API_BASE_URL}/api/prior-auth/submit`,
    status: (id) => `${API_BASE_URL}/api/prior-auth/${id}/status`,
  },
  
  // Normalization endpoints
  normalization: {
    normalize: `${API_BASE_URL}/api/normalize`,
    validate: `${API_BASE_URL}/api/normalize/validate`,
  },
  
  // n8n webhook
  n8n: {
    claimSubmission: N8N_WEBHOOK_URL,
  },

  // Healthcare API endpoints (NPHIES Bridge)
  healthcare: {
    baseUrl: NPHIES_BRIDGE_URL,
    claims: {
      submit: `${NPHIES_BRIDGE_URL}/unified-healthcare-submit`,
      list: `${NPHIES_BRIDGE_URL}/healthcare/requests`,
      details: (id) => `${NPHIES_BRIDGE_URL}/healthcare/requests/${id}`,
      updateStatus: (id) => `${NPHIES_BRIDGE_URL}/healthcare/requests/${id}/status`,
      approve: (id) => `${NPHIES_BRIDGE_URL}/healthcare/requests/${id}/approve`,
    },
    priorAuth: {
      submit: `${NPHIES_BRIDGE_URL}/healthcare/prior-auth`,
    },
    eligibility: {
      check: `${NPHIES_BRIDGE_URL}/healthcare/eligibility/check`,
    },
    patients: {
      search: `${NPHIES_BRIDGE_URL}/healthcare/patients/search`,
    },
    payers: {
      list: `${NPHIES_BRIDGE_URL}/healthcare/payers`,
    },
    services: {
      search: `${NPHIES_BRIDGE_URL}/healthcare/services/search`,
    },
    dashboard: {
      get: (role) => `${NPHIES_BRIDGE_URL}/healthcare/dashboard/${role}`,
    },
    analytics: {
      get: `${NPHIES_BRIDGE_URL}/healthcare/analytics/dashboard`,
    },
    terminology: {
      validate: `${NPHIES_BRIDGE_URL}/terminology/validate-code`,
      validatePayload: `${NPHIES_BRIDGE_URL}/terminology/validate-payload`,
      search: `${NPHIES_BRIDGE_URL}/terminology/codes`,
      codeSystems: `${NPHIES_BRIDGE_URL}/terminology/codesystems`,
    },
  },
};

// Utility function to build API URL
export const buildApiUrl = (path) => {
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default config;
