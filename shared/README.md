# Shared Modules Documentation

This directory contains shared utilities and modules used across all SBS microservices.

## 📦 Modules

### 1. `logging_config.py` - Structured Logging

Provides structured JSON logging with audit trails and security event tracking.

#### Features
- JSON-formatted logs for easy parsing
- Automatic request ID tracking
- Audit logging for security events
- Configurable log levels
- Security event types enumeration

#### Usage

```python
from shared.logging_config import setup_logging, AuditLogger, SecurityEvents

# Setup logging for your service
logger = setup_logging("normalizer-service", log_level="INFO")

# Use logger
logger.info("Service started", extra={"port": 8000})
logger.error("Database connection failed", extra={"error": str(e)})

# Audit logging
audit_logger = AuditLogger("normalizer-service")
audit_logger.log_event(
    event_type=SecurityEvents.DATA_ACCESS,
    user_id="user123",
    resource="sbs_codes",
    action="query",
    result="success",
    details={"facility_id": "FAC001", "code": "12345"}
)
```

#### Environment Variables
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `LOG_FORMAT`: Log format (`json` or `text`)

---

### 2. `rate_limiter.py` - Improved Rate Limiting

Token bucket rate limiter with automatic memory cleanup to prevent memory leaks.

#### Features
- Sliding window rate limiting
- Automatic cleanup of old entries
- Memory-bounded IP tracking
- Thread-safe operations
- Configurable limits and cleanup intervals

#### Usage

```python
from shared.rate_limiter import ImprovedRateLimiter

# Initialize rate limiter
rate_limiter = ImprovedRateLimiter(
    max_requests=100,         # 100 requests
    time_window=60,           # per 60 seconds
    cleanup_interval=300,     # cleanup every 5 minutes
    max_tracked_ips=10000     # track max 10k IPs
)

# In your endpoint
@app.post("/api/endpoint")
async def endpoint(request: Request):
    client_ip = request.client.host
    
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Process request
    return {"status": "success"}

# Get statistics
stats = rate_limiter.get_stats()
print(f"Tracking {stats['tracked_ips']} IPs")
```

#### Configuration
- `max_requests`: Maximum requests allowed in time window
- `time_window`: Time window in seconds
- `cleanup_interval`: Seconds between automatic cleanup runs
- `max_tracked_ips`: Maximum number of IPs to track (prevents memory exhaustion)

---

### 3. `error_handling.py` - Standardized Error Handling

Provides consistent error responses and prevents sensitive data leakage.

#### Features
- Automatic credential sanitization
- Structured error responses
- Environment-aware detail exposure
- Request ID tracking
- Comprehensive exception types

#### Exception Types
- `DatabaseError`: Database operation errors
- `InputValidationError`: Input validation failures
- `AuthenticationError`: Authentication failures
- `AuthorizationError`: Authorization denials
- `RateLimitError`: Rate limit exceeded
- `ExternalServiceError`: External service failures

#### Usage

```python
from shared.error_handling import (
    setup_exception_handlers,
    DatabaseError,
    InputValidationError,
    RateLimitError
)
from fastapi import FastAPI

app = FastAPI()

# Setup exception handlers
setup_exception_handlers(app)

# Use in your code
@app.post("/api/validate")
async def validate_claim(data: dict):
    try:
        # Validation logic
        if not data.get("facility_id"):
            raise InputValidationError(
                "Missing required field: facility_id",
                details={"field": "facility_id"}
            )
        
        # Database operation
        result = execute_query(data)
        return result
        
    except psycopg2.Error as e:
        raise DatabaseError(
            "Database operation failed",
            details={"operation": "query"}
        )
```

#### Error Response Format

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "status_code": 429,
  "timestamp": "2026-02-06T12:00:00Z",
  "request_id": "req_123456"
}
```

---

### 4. `validation.py` - Input Validation

Comprehensive input validation utilities with depth/size checks and sanitization.

#### Features
- Pydantic-based validation models
- Payload depth validation (prevents DoS)
- Payload size validation
- String sanitization
- Recursive dictionary sanitization
- Common pattern validators

#### Validation Models
- `PaginationParams`: Standard pagination
- `NormalizeRequest`: Code normalization requests
- `ClaimValidationRequest`: Claim validation
- `SignRequest`: Digital signature requests
- `ClaimSubmission`: NPHIES claim submission

#### Usage

```python
from shared.validation import (
    NormalizeRequest,
    PayloadValidator,
    sanitize_string,
    FacilityIDValidator
)

# Use Pydantic models
@app.post("/normalize")
async def normalize(request: NormalizeRequest):
    # Request is automatically validated
    facility_id = request.facility_id  # Already validated
    internal_code = request.internal_code
    
    # Process normalized data
    return {"sbs_code": result}

# Manual validation
facility_id = FacilityIDValidator.validate(user_input)

# Payload validation
PayloadValidator.validate_depth(complex_json, max_depth=10)
PayloadValidator.validate_size(complex_json, max_size_mb=5)

# String sanitization
safe_string = sanitize_string(user_input, max_length=1000)
```

#### Validation Rules
- Facility IDs: 3-20 alphanumeric characters
- SBS codes: 5-10 digits
- Payload depth: Max 10-20 levels (configurable)
- Payload size: Max 5-20 MB (configurable)
- String length: Max 1000 characters (configurable)

---

## 🔧 Integration Guide

### Step 1: Install Dependencies

Add to your service's `requirements.txt`:

```txt
fastapi>=0.100.0
pydantic>=2.0.0
```

### Step 2: Update Service Code

```python
from fastapi import FastAPI, Request
from shared.logging_config import setup_logging
from shared.rate_limiter import ImprovedRateLimiter
from shared.error_handling import setup_exception_handlers, RateLimitError
from shared.validation import NormalizeRequest

# Initialize logging
logger = setup_logging("your-service-name")

# Initialize rate limiter
rate_limiter = ImprovedRateLimiter(
    max_requests=100,
    time_window=60,
    cleanup_interval=300,
    max_tracked_ips=10000
)

# Create FastAPI app
app = FastAPI(title="Your Service")

# Setup exception handlers
setup_exception_handlers(app)

# Add rate limiting middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    
    if not rate_limiter.is_allowed(client_ip):
        raise RateLimitError()
    
    response = await call_next(request)
    return response

# Use validation models
@app.post("/api/endpoint")
async def endpoint(data: NormalizeRequest):
    logger.info("Processing request", extra={"facility_id": data.facility_id})
    # Your logic here
    return {"status": "success"}
```

### Step 3: Environment Configuration

Add to your `.env` file:

```bash
# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Environment
ENVIRONMENT=production
```

---

## 🧪 Testing

Example test using the shared modules:

```python
import pytest
from shared.rate_limiter import ImprovedRateLimiter
from shared.validation import NormalizeRequest, FacilityIDValidator
from pydantic import ValidationError

def test_rate_limiter():
    limiter = ImprovedRateLimiter(max_requests=5, time_window=60)
    
    # First 5 requests should pass
    for i in range(5):
        assert limiter.is_allowed("192.168.1.1")
    
    # 6th request should fail
    assert not limiter.is_allowed("192.168.1.1")

def test_facility_id_validation():
    # Valid IDs
    assert FacilityIDValidator.validate("FAC001") == "FAC001"
    assert FacilityIDValidator.validate("hosp123") == "HOSP123"
    
    # Invalid IDs
    with pytest.raises(ValueError):
        FacilityIDValidator.validate("AB")  # Too short
    
    with pytest.raises(ValueError):
        FacilityIDValidator.validate("invalid@facility")  # Special chars

def test_normalize_request_validation():
    # Valid request
    request = NormalizeRequest(
        facility_id="FAC001",
        internal_code="CODE123",
        code_type="procedure"
    )
    assert request.facility_id == "FAC001"
    
    # Invalid request
    with pytest.raises(ValidationError):
        NormalizeRequest(
            facility_id="AB",  # Too short
            internal_code="CODE123",
            code_type="invalid_type"
        )
```

---

## 📊 Monitoring

The shared modules provide built-in metrics and statistics:

### Rate Limiter Stats

```python
stats = rate_limiter.get_stats()
# {
#     "tracked_ips": 150,
#     "total_active_requests": 450,
#     "max_requests_per_window": 100,
#     "time_window_seconds": 60,
#     "max_tracked_ips": 10000
# }
```

### Logging Integration

All modules use Python's standard logging, which integrates with:
- Prometheus (via log parsing)
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Grafana Loki
- CloudWatch Logs

---

## 🔒 Security Considerations

1. **Credential Sanitization**: Error messages automatically remove sensitive data
2. **Rate Limiting**: Prevents DoS attacks and API abuse
3. **Input Validation**: Prevents injection attacks and malformed data
4. **Audit Logging**: Tracks all security-relevant events
5. **Memory Safety**: Rate limiter prevents memory exhaustion

---

## 📝 Best Practices

1. **Always use structured logging** instead of `print()` statements
2. **Apply rate limiting** to all public-facing endpoints
3. **Validate all inputs** using Pydantic models
4. **Use exception handlers** to prevent information leakage
5. **Monitor rate limiter stats** to adjust limits as needed
6. **Log security events** for audit compliance
7. **Test error handling** to ensure no sensitive data is exposed

---

## 🤝 Contributing

When adding new shared modules:

1. Follow existing patterns and naming conventions
2. Add comprehensive docstrings
3. Include usage examples
4. Add tests
5. Update this README
6. Ensure thread safety if using global state

---

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Python Logging HOWTO](https://docs.python.org/3/howto/logging.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

---

**Last Updated**: 2026-02-06  
**Version**: 1.0.0
