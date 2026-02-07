// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || window.SBS_API_URL || 'http://localhost:3000';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.brainsait.cloud/webhook/sbs-claim-submission';

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
};

// Utility function to build API URL
export const buildApiUrl = (path) => {
  return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default config;
