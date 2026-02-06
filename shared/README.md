# Shared Utilities Module

Common utilities for all SBS microservices to ensure consistency and reduce code duplication.

## Modules

### 1. Rate Limiter (`rate_limiter.py`)

Memory-safe rate limiting with automatic cleanup to prevent memory leaks.

**Features:**
- Sliding window rate limiting
- Periodic cleanup of stale entries
- Maximum tracked IPs cap to prevent unbounded memory growth
- Thread-safe operations

**Usage:**
```python
from shared import RateLimiter

# Initialize rate limiter
rate_limiter = RateLimiter(max_requests=100, time_window=60)

# Check if request is allowed
if rate_limiter.is_allowed(client_ip):
    # Process request
    pass
else:
    # Return rate limit error
    pass

# Get statistics
stats = rate_limiter.get_stats()
```

### 2. Logging Configuration (`logging_config.py`)

Structured logging setup with JSON formatting for all services.

**Features:**
- JSON-formatted logs for easy parsing
- Request context tracking (request_id, client_ip, endpoint)
- Exception logging support
- Consistent log format across services

**Usage:**
```python
from shared import setup_logging, log_request, log_error

# Setup logger for service
logger = setup_logging("service-name", log_level="INFO")

# Log request with context
log_request(logger, request_id="123", client_ip="1.2.3.4", 
            endpoint="/api/endpoint", message="Processing request")

# Log error with exception
try:
    # Some operation
    pass
except Exception as e:
    log_error(logger, "Operation failed", exc_info=e)
```

### 3. Error Handling (`error_handling.py`)

Common error handlers with credential sanitization to prevent sensitive data leaks.

**Features:**
- Automatic sanitization of passwords, tokens, API keys, etc.
- Standardized error response format
- FastAPI exception handlers
- Database error formatting

**Usage:**
```python
from shared import (
    sanitize_credentials, 
    create_error_response,
    validation_exception_handler,
    general_exception_handler
)
from fastapi import FastAPI

app = FastAPI()

# Register exception handlers
app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Sanitize sensitive data
safe_data = sanitize_credentials(user_input)

# Create error response
return create_error_response(
    status_code=400,
    message="Invalid input",
    details={"field": "email"},
    request_id="123"
)
```

### 4. Validation (`validation.py`)

Common input validation utilities for all services.

**Features:**
- Email validation
- Phone number validation (Saudi format)
- National ID validation (Saudi format)
- Date format validation
- Required fields validation
- Numeric range validation
- String length validation
- Input sanitization (XSS, SQL injection prevention)
- Claim amount validation

**Usage:**
```python
from shared import (
    validate_email,
    validate_phone,
    validate_required_fields,
    sanitize_input,
    validate_claim_amount
)

# Validate email
if not validate_email("user@example.com"):
    raise ValueError("Invalid email")

# Validate required fields
is_valid, error = validate_required_fields(
    data={"name": "John", "email": "john@example.com"},
    required_fields=["name", "email", "phone"]
)
if not is_valid:
    print(error)  # "Missing required fields: phone"

# Sanitize user input
safe_input = sanitize_input(user_provided_text)

# Validate claim amount
is_valid, error = validate_claim_amount(1500.50)
```

## Integration Guide

### Step 1: Install Dependencies

Ensure your service has the required dependencies:
```bash
pip install fastapi pydantic python-dotenv
```

### Step 2: Import Shared Modules

Add imports to your service's main.py:
```python
from shared import (
    RateLimiter,
    setup_logging,
    create_error_response,
    validation_exception_handler,
    general_exception_handler
)
```

### Step 3: Replace Duplicated Code

Remove local implementations and use shared modules:

**Before:**
```python
# Local RateLimiter class implementation
class RateLimiter:
    def __init__(self, max_requests: int = 100):
        # ... 50+ lines of duplicate code
```

**After:**
```python
from shared import RateLimiter

rate_limiter = RateLimiter(max_requests=100, time_window=60)
```

### Step 4: Setup Logging (Optional)

Add structured logging to your service:
```python
from shared import setup_logging

logger = setup_logging("my-service", log_level="INFO")
```

### Step 5: Register Error Handlers (Optional)

Add standardized error handling:
```python
from shared import validation_exception_handler, general_exception_handler

app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)
```

## Benefits

1. **Code Reuse**: Eliminate duplicate code across services
2. **Consistency**: Same behavior across all services
3. **Maintainability**: Single source of truth for common functionality
4. **Security**: Centralized credential sanitization
5. **Quality**: Well-tested, production-ready utilities
6. **Memory Safety**: Built-in protections against memory leaks

## Testing

Run tests for shared modules:
```bash
pytest tests/test_shared_modules.py -v
```

## Best Practices

1. **Always use shared modules** instead of copying code
2. **Keep shared modules minimal** - only add truly common functionality
3. **Document any changes** to shared modules thoroughly
4. **Test changes** across all services before merging
5. **Version carefully** - changes affect all services

## Troubleshooting

### Import Errors

If you get import errors, ensure the `shared` directory is in your Python path:
```python
import sys
sys.path.append('/path/to/sbs')
```

Or use relative imports:
```python
from ..shared import RateLimiter
```

### Memory Issues

If rate limiter is using too much memory, adjust parameters:
```python
# Reduce tracked IPs and cleanup more frequently
rate_limiter = RateLimiter(
    max_requests=100,
    time_window=60,
    max_tracked_ips=5000  # Default is 10000
)
```

## Contributing

When adding new shared utilities:

1. Ensure the utility is truly common across multiple services
2. Write comprehensive documentation
3. Add unit tests
4. Update this README
5. Test integration with at least 2 services before merging
