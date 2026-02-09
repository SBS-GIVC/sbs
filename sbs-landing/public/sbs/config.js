/**
 * SBS Integration Engine - Configuration
 * Environment-based API configuration with CORS support
 * 
 * Architecture:
 * - Frontend: Hosted on GitHub Pages (fadil369.github.io/sbs)
 * - Backend API: Runs in GitHub Codespaces devcontainer
 */

// Detect environment based on hostname
const getEnvironment = () => {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    }
    
    // GitHub Pages production
    if (hostname.includes('github.io')) {
        return 'production';
    }
    
    // GitHub Codespaces
    if (hostname.includes('.app.github.dev') || hostname.includes('codespaces')) {
        return 'codespaces';
    }
    
    // Staging environments
    if (hostname.includes('staging') || hostname.includes('preview')) {
        return 'staging';
    }
    
    return 'production';
};

// Get Codespace URL if running in GitHub Codespaces
const getCodespaceApiUrl = () => {
    // Check if we're in a codespace and can derive the API URL
    const codespaceHost = window.location.hostname;
    if (codespaceHost.includes('.app.github.dev')) {
        // Replace port in codespace URL (e.g., xxx-5000.app.github.dev for API)
        return codespaceHost.replace(/-\d+\./, '-5000.');
    }
    return null;
};

// Environment configuration
const environments = {
    development: {
        apiBaseUrl: (window.location && window.location.origin) ? window.location.origin : '',
        apiTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    },
    codespaces: {
        // If the UI is running in a codespace, try to derive the API origin; otherwise use same-origin.
        apiBaseUrl: getCodespaceApiUrl() ? `https://${getCodespaceApiUrl()}` : ((window.location && window.location.origin) ? window.location.origin : ''),
        apiTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    },
    staging: {
        apiBaseUrl: window.SBS_API_URL || ((window.location && window.location.origin) ? window.location.origin : ''),
        apiTimeout: 30000,
        retryAttempts: 2,
        retryDelay: 2000
    },
    production: {
        // Default to same-origin so brainsait.cloud (and api.brainsait.cloud) work without extra config.
        apiBaseUrl: window.SBS_API_URL || ((window.location && window.location.origin) ? window.location.origin : ''),
        apiTimeout: 30000,
        retryAttempts: 2,
        retryDelay: 2000
    }
};

// Initialize configuration
const currentEnv = getEnvironment();
const config = environments[currentEnv];

// Allow runtime override via URL parameters (useful for testing)
const urlParams = new URLSearchParams(window.location.search);
const apiOverride = urlParams.get('api');
if (apiOverride) {
    try {
        const url = new URL(apiOverride);
        if (['http:', 'https:'].includes(url.protocol)) {
            config.apiBaseUrl = url.origin;
            console.log('[SBS Config] API URL overridden via URL parameter:', config.apiBaseUrl);
        }
    } catch (e) {
        console.warn('[SBS Config] Invalid API URL override:', apiOverride);
    }
}

// Export to window object
window.SBS_CONFIG = {
    environment: currentEnv,
    apiBaseUrl: config.apiBaseUrl,
    apiTimeout: config.apiTimeout,
    retryAttempts: config.retryAttempts,
    retryDelay: config.retryDelay,
    version: '2.0.0',
    // For backwards compatibility
    SBS_API_BASE_URL: config.apiBaseUrl
};

// Also set the old variable name for backwards compatibility
window.SBS_API_BASE_URL = config.apiBaseUrl;

// Log configuration (in all environments for debugging)
console.log('🔧 SBS Configuration loaded:', {
    environment: currentEnv,
    apiBaseUrl: config.apiBaseUrl,
    hostname: window.location.hostname,
    version: '2.0.0',
    timestamp: new Date().toISOString()
});
