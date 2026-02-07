# Shared Modules - Troubleshooting Guide

## Common Issues and Solutions

### 1. Import Errors

#### Problem: `ModuleNotFoundError: No module named 'shared'`

**Symptoms:**
- Service fails to start
- Import error in stack trace

**Causes:**
- Shared directory not in Python path
- Service running from wrong directory
- Docker volume mount issue

**Solutions:**

**For local development:**
```python
# Verify this line is in service main.py
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import RateLimiter
```

**For Docker:**
```dockerfile
# Ensure shared directory is copied
COPY shared /app/shared
```

**For Kubernetes:**
```yaml
# Ensure shared module is in container
- name: shared-modules
  mountPath: /app/shared
```

**Quick test:**
```bash
cd /path/to/sbs
python -c "from shared import RateLimiter; print('OK')"
```

---

### 2. Rate Limiting Issues

#### Problem: Rate limiter not blocking requests

**Symptoms:**
- Unlimited requests being allowed
- Rate limit middleware not triggering

**Diagnostics:**
```python
# Add debug logging
logger.info(f"Rate limiter stats: {rate_limiter.get_stats()}")
```

**Check:**
1. Is rate limiter initialized?
```python
rate_limiter = RateLimiter(max_requests=100, time_window=60)
```

2. Is middleware registered?
```python
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # ... rate limiting code
```

3. Are paths excluded correctly?
```python
if request.url.path in ["/health", "/metrics"]:
    return await call_next(request)
```

**Solutions:**
- Verify rate limiter is instantiated before middleware
- Check that client IP is being extracted correctly
- Ensure middleware is not bypassed for all routes

---

#### Problem: Rate limiter using too much memory

**Symptoms:**
- Service memory usage growing over time
- OOM (Out of Memory) errors

**Diagnostics:**
```python
# Check tracked IPs
stats = rate_limiter.get_stats()
print(f"Tracked IPs: {stats['tracked_ips']}")
```

**Solutions:**

**Reduce max_tracked_ips:**
```python
rate_limiter = RateLimiter(
    max_requests=100,
    time_window=60,
    max_tracked_ips=5000  # Default is 10000
)
```

**Verify cleanup is working:**
```python
# Check cleanup is being called
# Should automatically clean every 5 minutes
```

---

### 3. Logging Issues

#### Problem: No logs appearing

**Symptoms:**
- No JSON-formatted logs in output
- Services appear to be working but no logs

**Diagnostics:**
```bash
# Check if logger is initialized
grep "setup_logging" service/main.py

# Check log level
echo $LOG_LEVEL
```

**Solutions:**

**1. Ensure logger is initialized:**
```python
from shared import setup_logging
logger = setup_logging("service-name", log_level=os.getenv("LOG_LEVEL", "INFO"))
```

**2. Set log level:**
```bash
export LOG_LEVEL=DEBUG
```

**3. Verify logging calls:**
```python
# Use logger, not print
logger.info("Message")  # Good
print("Message")        # Bad
```

---

#### Problem: Logs missing context (request_id, etc.)

**Symptoms:**
- Logs don't have request_id or other context fields

**Solutions:**

**Use log_request helper:**
```python
from shared import log_request

log_request(
    logger,
    request_id="abc-123",
    client_ip="1.2.3.4",
    endpoint="/api/endpoint",
    message="Processing request"
)
```

**Or use extra parameter:**
```python
logger.info("Processing request", extra={
    "request_id": request_id,
    "client_ip": client_ip
})
```

---

### 4. Credential Leakage

#### Problem: Passwords or tokens visible in logs

**Symptoms:**
- Sensitive data in log files
- Security audit findings

**Diagnostics:**
```bash
# Search logs for sensitive patterns
grep -i "password" /var/log/service.log
grep -i "token" /var/log/service.log
```

**Solutions:**

**1. Use format_database_error:**
```python
from shared import format_database_error

try:
    # Database operation
    pass
except Exception as e:
    logger.error(f"DB error: {format_database_error(e)}")
```

**2. Sanitize user data:**
```python
from shared import sanitize_credentials

safe_data = sanitize_credentials(user_input)
logger.info(f"Received data: {safe_data}")
```

**3. Never log raw exceptions with credentials:**
```python
# BAD - may expose credentials
logger.error(f"Error: {str(e)}")

# GOOD - sanitizes credentials
logger.error(f"Error: {sanitize_credentials(str(e))}")
```

---

### 5. Validation Failures

#### Problem: Valid inputs being rejected

**Symptoms:**
- Legitimate emails rejected
- Valid phone numbers failing validation

**Diagnostics:**

**Test validators directly:**
```python
from shared import validate_email, validate_phone

email = "test@example.com"
phone = "0501234567"

print(f"Email valid: {validate_email(email)}")
print(f"Phone valid: {validate_phone(phone)}")
```

**Solutions:**

**For email validation:**
- Ensure email follows standard format: `user@domain.com`
- Check for special characters that might be causing issues

**For phone validation (Saudi Arabia):**
- Valid formats:
  - `+966501234567` (country code + 9 digits)
  - `966501234567` (country code + 9 digits)
  - `0501234567` (10 digits starting with 05)
- Must start with 5 after country code
- Remove spaces and dashes: `validate_phone(phone.replace(' ', '').replace('-', ''))`

**For custom validation needs:**
- Extend the validation module
- Or use custom validators in service

---

#### Problem: Input sanitization too aggressive

**Symptoms:**
- Legitimate content being removed
- Special characters stripped unnecessarily

**Solutions:**

**Review what's being sanitized:**
```python
from shared import sanitize_input

input_text = "Some text with special chars"
sanitized = sanitize_input(input_text)
print(f"Original: {input_text}")
print(f"Sanitized: {sanitized}")
```

**For specific needs:**
- Modify validation.py sanitize_input() function
- Or create service-specific sanitization

---

### 6. Performance Issues

#### Problem: Service slower after integration

**Symptoms:**
- Increased response times
- Higher CPU usage

**Diagnostics:**

**Profile rate limiter:**
```python
import time

start = time.time()
result = rate_limiter.is_allowed("test_ip")
elapsed = time.time() - start
print(f"Rate limiter took {elapsed*1000:.2f}ms")
```

**Profile logging:**
```python
start = time.time()
logger.info("Test message")
elapsed = time.time() - start
print(f"Logging took {elapsed*1000:.2f}ms")
```

**Solutions:**

**If rate limiter is slow:**
- Reduce max_tracked_ips
- Increase cleanup_interval (default 300s)
- Consider Redis-based rate limiting for high traffic

**If logging is slow:**
- Reduce log level (INFO instead of DEBUG)
- Use async logging
- Write logs to fast storage

---

### 7. Testing Issues

#### Problem: Tests failing after integration

**Symptoms:**
- Import errors in tests
- Rate limiter causing test failures

**Solutions:**

**Fix import paths in tests:**
```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
```

**Mock rate limiter in tests:**
```python
from unittest.mock import Mock

# Mock rate limiter to always allow
mock_limiter = Mock()
mock_limiter.is_allowed.return_value = True
```

**Reset rate limiter between tests:**
```python
@pytest.fixture(autouse=True)
def reset_rate_limiter():
    rate_limiter.requests.clear()
    yield
```

---

### 8. Docker/Kubernetes Issues

#### Problem: Services work locally but fail in containers

**Symptoms:**
- Import errors in container logs
- Services crash on startup

**Diagnostics:**
```bash
# Check if shared directory exists in container
docker exec <container> ls -la /app/shared

# Check Python path
docker exec <container> python -c "import sys; print('\n'.join(sys.path))"
```

**Solutions:**

**Verify Dockerfile:**
```dockerfile
# Ensure shared is copied
COPY shared /app/shared
COPY service-name /app/service-name

WORKDIR /app/service-name
```

**Verify docker-compose.yml:**
```yaml
services:
  service-name:
    volumes:
      - ./shared:/app/shared
    working_dir: /app/service-name
```

---

## Quick Reference

### Check Service Health
```bash
curl http://localhost:PORT/health
```

### View Rate Limiter Stats
```python
stats = rate_limiter.get_stats()
print(f"Tracked IPs: {stats['tracked_ips']}")
print(f"Max requests: {stats['max_requests']}")
```

### Test Validators
```python
from shared import validate_email, validate_phone, validate_claim_amount

validate_email("test@example.com")  # True
validate_phone("0501234567")        # True
validate_claim_amount(1000.50)      # (True, None)
```

### Sanitize Sensitive Data
```python
from shared import sanitize_credentials

safe = sanitize_credentials('{"password": "secret"}')
# Returns: '{"password": "***REDACTED***"}'
```

### Enable Debug Logging
```bash
export LOG_LEVEL=DEBUG
```

---

## Getting Help

### 1. Check Documentation
- Main README: `/shared/README.md`
- Deployment guide: `/docs/SHARED_MODULES_DEPLOYMENT.md`
- Test examples: `/tests/test_shared_modules.py`

### 2. Run Tests
```bash
# Test shared modules
pytest tests/test_shared_modules.py -v

# Test integration
pytest tests/test_shared_integration.py -v
```

### 3. Enable Verbose Logging
```bash
LOG_LEVEL=DEBUG python service/main.py
```

### 4. Contact Support
- Create an issue in the repository
- Contact the development team
- Review commit history for recent changes

---

## Prevention

### Best Practices to Avoid Issues

1. **Always test locally before deploying**
   ```bash
   pytest tests/ -v
   ```

2. **Review shared module docs before using**
   - Read `/shared/README.md`
   - Check function signatures
   - Review test examples

3. **Use structured logging consistently**
   ```python
   logger.info("message", extra={"context": "value"})
   ```

4. **Sanitize all user input and errors**
   ```python
   safe_data = sanitize_credentials(user_input)
   ```

5. **Monitor rate limiter memory**
   ```python
   stats = rate_limiter.get_stats()
   if stats['tracked_ips'] > 8000:
       logger.warning("High IP count in rate limiter")
   ```

---

## Emergency Procedures

### If Services Are Down

1. **Check logs immediately**
   ```bash
   docker logs <container>
   kubectl logs <pod>
   ```

2. **Verify shared modules**
   ```bash
   ls -la /app/shared
   python -c "from shared import RateLimiter"
   ```

3. **Quick rollback if needed**
   ```bash
   git revert HEAD
   git push origin main
   ```

4. **Restart services**
   ```bash
   docker-compose restart
   kubectl rollout restart deployment/<service>
   ```

---

## Reporting Issues

When reporting issues, include:

1. **Error message and stack trace**
2. **Service name and version**
3. **Environment** (dev/staging/prod)
4. **Steps to reproduce**
5. **Relevant configuration** (env vars, Docker setup)
6. **Log output** (with sensitive data removed)

Example issue report:
```
Service: normalizer-service
Version: 2.0.0
Environment: staging
Error: ModuleNotFoundError: No module named 'shared'

Steps to reproduce:
1. Deploy to staging
2. Service fails to start
3. Check logs: ImportError

Configuration:
- LOG_LEVEL=INFO
- Docker compose file attached

Logs: [attach sanitized logs]
```
