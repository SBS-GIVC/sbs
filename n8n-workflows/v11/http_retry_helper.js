/**
 * @fileoverview HTTP Request Helper with Retry Logic
 * @version 11.0
 * @brainsait Exponential backoff retry mechanism
 */

/**
 * Make HTTP request with automatic retry on transient failures
 * @param {string} url - Target URL
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {object} body - Request body
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<object>} Response body
 */
async function makeHttpRequestWithRetry(url, method, body, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // BRAINSAIT: Log request attempt
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'http_request_attempt',
        url: url,
        method: method,
        attempt: attempt,
        max_retries: maxRetries,
        severity: 'INFO'
      }));
      
      const response = await $http.request({
        method: method,
        url: url,
        body: body,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'User-Agent': 'BrainSAIT-SBS-Integration/v11.0'
        },
        timeout: 30000, // 30 seconds
        returnFullResponse: true
      });
      
      // BRAINSAIT: Success audit log
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'http_request_success',
        url: url,
        status: response.statusCode,
        attempt: attempt,
        response_time_ms: response.headers['x-response-time'] || 'unknown',
        severity: 'INFO'
      }));
      
      return response.body;
      
    } catch (error) {
      lastError = error;
      
      // BRAINSAIT: Error audit log
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'http_request_failed',
        url: url,
        attempt: attempt,
        error_message: error.message,
        statusCode: error.response?.statusCode,
        severity: attempt === maxRetries ? 'HIGH' : 'MEDIUM'
      }));
      
      // Don't retry on client errors (4xx)
      if (error.response?.statusCode >= 400 && error.response?.statusCode < 500) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'http_client_error_no_retry',
          url: url,
          statusCode: error.response.statusCode,
          severity: 'MEDIUM'
        }));
        
        throw new Error(JSON.stringify({
          error_code: 'HTTP_CLIENT_ERROR',
          message_en: `Client error (${error.response.statusCode}): ${error.message}`,
          message_ar: `خطأ العميل (${error.response.statusCode}): ${error.message}`,
          http_status: error.response.statusCode,
          retryable: false
        }));
      }
      
      // Exponential backoff: 2s, 4s, 8s
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'http_retry_scheduled',
          url: url,
          attempt: attempt,
          next_attempt: attempt + 1,
          delay_ms: delay,
          severity: 'INFO'
        }));
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'http_all_retries_failed',
    url: url,
    max_retries: maxRetries,
    last_error: lastError.message,
    severity: 'HIGH'
  }));
  
  throw new Error(JSON.stringify({
    error_code: 'HTTP_ALL_RETRIES_FAILED',
    message_en: `All ${maxRetries} attempts failed. Last error: ${lastError.message}`,
    message_ar: `فشلت جميع المحاولات (${maxRetries}). آخر خطأ: ${lastError.message}`,
    http_status: lastError.response?.statusCode || 500,
    retryable: true
  }));
}

// ============================================================================
// USAGE EXAMPLE FOR AI NORMALIZER
// ============================================================================

const input = $input.item.json;
const result = await makeHttpRequestWithRetry(
  $env.SBS_NORMALIZER_URL + '/normalize',
  'POST',
  input,
  3
);

return result;
