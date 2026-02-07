/**
 * SBS API Client with Retry Logic and Enhanced Error Handling
 * Handles HTTP requests with automatic retries, timeouts, and comprehensive error reporting
 */

class SBSAPIClient {
    constructor(baseUrl = null) {
            const baseConfig = window.SBS_CONFIG || {
                        apiBaseUrl: 'http://localhost:5000',
                        apiTimeout: 30000,
                        retryAttempts: 3,
                        retryDelay: 1000
            };

            this.config = {
                        ...baseConfig,
                        apiBaseUrl: baseUrl !== null ? baseUrl : baseConfig.apiBaseUrl
            };
    }

  setBaseUrl(baseUrl) {
          this.config.apiBaseUrl = baseUrl;
  }

  /**
     * Make an HTTP request with retry logic and error handling
     * @param {string} endpoint - API endpoint (e.g., '/api/submit-claim')
     * @param {Object} options - Fetch options (method, body, headers, etc.)
     * @returns {Promise<Object>} - Response data
     */
  async request(endpoint, options = {}) {
        const url = `${this.config.apiBaseUrl}${endpoint}`;
        let lastError = null;
        let attempt = 0;

      // Retry loop
      while (attempt < this.config.retryAttempts) {
              try {
                        attempt++;
                        console.log(`[SBS API] ${options.method || 'GET'} ${endpoint} (Attempt ${attempt}/${this.config.retryAttempts})`);

                // Set default options
                const fetchOptions = {
                            method: options.method || 'GET',
                            headers: {
                                          'Accept': 'application/json',
                                          ...options.headers
                            }
                };

                // Add body for POST/PUT/PATCH requests (don't stringify FormData)
                if (options.body) {
                            if (!(options.body instanceof FormData)) {
                                          fetchOptions.headers['Content-Type'] = 'application/json';
                                          fetchOptions.body = JSON.stringify(options.body);
                            } else {
                                          fetchOptions.body = options.body;
                            }
                }

                // Create timeout promise
                const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Request timeout')), this.config.apiTimeout)
                                                           );

                // Race between fetch and timeout
                const response = await Promise.race([
                            fetch(url, fetchOptions),
                            timeoutPromise
                          ]);

                // Check response status
                if (!response.ok) {
                            const errorData = await this.parseErrorResponse(response);
                            throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
                }

                // Parse response
                const data = await response.json();
                        console.log(`[SBS API] Success: ${endpoint}`, data);
                        return { success: true, data };

              } catch (error) {
                        lastError = error;
                        console.error(`[SBS API] Error on attempt ${attempt}:`, error.message);

                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                            console.error('[SBS API] Non-retryable error, stopping retries');
                            break;
                }

                // Wait before retry (exponential backoff)
                if (attempt < this.config.retryAttempts) {
                            const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
                            console.log(`[SBS API] Retrying in ${delay}ms...`);
                            await this.sleep(delay);
                }
              }
      }

      // All retries exhausted
      return {
              success: false,
              error: {
                        message: lastError.message || 'Unknown error',
                        code: 'API_REQUEST_FAILED',
                        attempts: attempt,
                        url: url
              }
      };
  }

  /**
     * Submit a claim to the backend
     * @param {FormData} formData - Form data containing claim information
     * @returns {Promise<Object>} - Submission result with claimId if successful
     */
  async submitClaim(formData) {
        return this.request('/api/submit-claim', {
                method: 'POST',
                body: formData
        });
  }

  /**
     * Get claim status
     * @param {string} claimId - Claim ID to track
     * @returns {Promise<Object>} - Claim status information
     */
  async getClaimStatus(claimId) {
        return this.request(`/api/claim-status/${claimId}`);
  }

  /**
     * Retry a failed claim
     * @param {string} claimId - Claim ID to retry
     * @returns {Promise<Object>} - Retry result
     */
  async retryClaim(claimId) {
          return this.request(`/api/claims/${claimId}/retry`, {
                    method: 'POST'
          });
  }

  /**
     * Check API connectivity
     * @returns {Promise<boolean>} - True if API is reachable
     */
  async healthCheck() {
        const result = await this.request('/health');
        return result.success;
  }

  /**
     * Determine if an error should not be retried
     */
  isNonRetryableError(error) {
        const message = error.message.toLowerCase();
        // Don't retry on validation errors, authentication errors, etc.
      return (
              message.includes('400') ||
              message.includes('401') ||
              message.includes('403') ||
              message.includes('404') ||
              message.includes('validation') ||
              message.includes('unauthorized') ||
              message.includes('forbidden')
            );
  }

  /**
     * Parse error response from the server
     */
  async parseErrorResponse(response) {
        try {
                const data = await response.json();
                return data;
        } catch {
                return { message: response.statusText };
        }
  }

  /**
     * Sleep helper for delays
     */
  sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create global instance
window.sbsApiClient = new SBSAPIClient();
window.SBSAPIClient = SBSAPIClient;
