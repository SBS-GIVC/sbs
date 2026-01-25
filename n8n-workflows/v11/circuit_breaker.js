/**
 * @fileoverview Circuit Breaker Pattern Implementation
 * @version 11.0
 * @brainsait Prevent cascading failures in microservices
 */

// ============================================================================
// BRAINSAIT: CIRCUIT BREAKER CLASS
// ============================================================================

class CircuitBreaker {
  constructor(serviceName, threshold = 5, timeout = 60000) {
    this.serviceName = serviceName;
    this.failureCount = 0;
    this.threshold = threshold; // Number of failures before opening circuit
    this.timeout = timeout; // Time in ms to wait before half-open
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
    this.lastError = null;
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const waitTime = Math.round((this.nextAttempt - Date.now()) / 1000);
        
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'circuit_breaker_open',
          service: this.serviceName,
          state: 'OPEN',
          wait_seconds: waitTime,
          last_error: this.lastError,
          severity: 'HIGH'
        }));
        
        throw new Error(JSON.stringify({
          error_code: 'CIRCUIT_BREAKER_OPEN',
          message_en: `Circuit breaker OPEN for ${this.serviceName}. Service unavailable. Retry in ${waitTime} seconds.`,
          message_ar: `قاطع الدائرة مفتوح لـ ${this.serviceName}. الخدمة غير متاحة. أعد المحاولة في ${waitTime} ثانية.`,
          http_status: 503,
          retryable: true,
          retry_after: waitTime
        }));
      }
      
      // Try half-open
      this.state = 'HALF_OPEN';
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'circuit_breaker_half_open',
        service: this.serviceName,
        state: 'HALF_OPEN',
        severity: 'MEDIUM'
      }));
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    const previousState = this.state;
    this.state = 'CLOSED';
    
    if (previousState !== 'CLOSED') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'circuit_breaker_closed',
        service: this.serviceName,
        state: 'CLOSED',
        previous_state: previousState,
        severity: 'INFO'
      }));
    }
  }
  
  onFailure(error) {
    this.failureCount++;
    this.lastError = error.message || 'Unknown error';
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'circuit_breaker_failure',
      service: this.serviceName,
      failure_count: this.failureCount,
      threshold: this.threshold,
      error: this.lastError,
      severity: 'MEDIUM'
    }));
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'circuit_breaker_opened',
        service: this.serviceName,
        state: 'OPEN',
        failure_count: this.failureCount,
        timeout_ms: this.timeout,
        next_attempt: new Date(this.nextAttempt).toISOString(),
        severity: 'HIGH'
      }));
    }
  }
  
  getState() {
    return {
      service: this.serviceName,
      state: this.state,
      failure_count: this.failureCount,
      threshold: this.threshold,
      next_attempt: new Date(this.nextAttempt).toISOString()
    };
  }
}

// ============================================================================
// USAGE EXAMPLE WITH HTTP RETRY
// ============================================================================

/**
 * Make HTTP request with circuit breaker and retry logic
 */
async function makeProtectedRequest(url, method, body, serviceName, maxRetries = 3) {
  // Create circuit breaker instance
  const breaker = new CircuitBreaker(serviceName, 5, 60000);
  
  // Execute request with circuit breaker protection
  return await breaker.execute(async () => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await $http.request({
          method: method,
          url: url,
          body: body,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          },
          timeout: 30000
        });
        
        return response.body;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors
        if (error.response?.statusCode >= 400 && error.response?.statusCode < 500) {
          throw error;
        }
        
        // Exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  });
}

// ============================================================================
// APPLY TO SPECIFIC SERVICE
// ============================================================================

const input = $input.item.json;
const result = await makeProtectedRequest(
  $env.SBS_NORMALIZER_URL + '/normalize',
  'POST',
  input,
  'AI-Normalizer',
  3
);

return result;
