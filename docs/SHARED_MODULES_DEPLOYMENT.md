# Shared Modules Integration - Deployment Guide

## Overview

This guide documents the integration of shared utility modules into all SBS microservices. The shared modules eliminate code duplication and ensure consistent behavior across services.

## What Changed

### 1. New Shared Modules

Created in `/shared/`:
- **rate_limiter.py**: Memory-safe rate limiting with automatic cleanup
- **logging_config.py**: Structured JSON logging for all services
- **error_handling.py**: Error handlers with automatic credential sanitization
- **validation.py**: Common input validation utilities
- **README.md**: Comprehensive module documentation

### 2. Updated Services

All four core services now use shared modules:
- **normalizer-service** (Port 8000)
- **financial-rules-engine** (Port 8002)
- **signer-service** (Port 8001)
- **nphies-bridge** (Port 8003)

### Changes Made to Each Service:
- Removed duplicate RateLimiter class (~50 lines per service)
- Added import of shared modules
- Replaced print statements with structured logging
- Added database error sanitization
- Total code reduction: ~200 lines across all services

## Benefits

1. **Code Reuse**: Eliminated 200+ lines of duplicate code
2. **Consistency**: All services use the same rate limiting and logging
3. **Security**: Automatic credential sanitization in all error messages
4. **Maintainability**: Single source of truth for common functionality
5. **Memory Safety**: Built-in protections against memory leaks in rate limiter
6. **Testing**: Comprehensive test suite (22 tests) for shared utilities

## Testing

### Test Coverage

- **22 unit tests** for shared modules (all passing)
- **1 integration test** verifying module availability
- Tests cover:
  - Rate limiting behavior and memory cleanup
  - Logging configuration
  - Credential sanitization (passwords, tokens, API keys)
  - Input validation (email, phone, required fields, amounts)
  - XSS and SQL injection prevention

### Running Tests

```bash
# Run shared module tests
pytest tests/test_shared_modules.py -v

# Run integration test
pytest tests/test_shared_integration.py -v

# Run all tests
pytest tests/ -v
```

## Deployment Steps

### 1. Prerequisites

Ensure all services have the required dependencies:

```bash
pip install fastapi pydantic python-dotenv
```

### 2. No Configuration Changes Required

The shared modules are backward compatible. No changes to:
- Environment variables
- Docker configurations
- Kubernetes manifests
- Database schemas

### 3. Verify Services

After deployment, verify each service:

```bash
# Check normalizer service
curl http://localhost:8000/health

# Check signer service
curl http://localhost:8001/health

# Check financial rules engine
curl http://localhost:8002/health

# Check NPHIES bridge
curl http://localhost:8003/health
```

### 4. Monitor Logs

All services now output structured JSON logs:

```json
{
  "timestamp": "2024-02-06T11:57:58.000Z",
  "level": "INFO",
  "logger": "normalizer-service",
  "message": "Database connection pool created successfully"
}
```

Use log aggregation tools (e.g., ELK stack) to parse and analyze logs.

## Rollback Plan

If issues occur, rollback is simple:

1. The previous version of each service had the RateLimiter class embedded
2. Simply revert to the previous commit
3. No database migrations or configuration changes are needed

```bash
git revert HEAD
git push origin main
```

## Performance Impact

### Expected Improvements:
- **Startup time**: No change (imports are fast)
- **Memory usage**: Slightly better due to improved rate limiter cleanup
- **CPU usage**: No significant change
- **Response time**: No change

### Monitoring Points:
- Watch rate limiter memory usage (should stay bounded)
- Monitor log output volume (structured logs are more verbose)
- Check error rates (should not change)

## Troubleshooting

### Issue: Import Errors

**Symptom**: `ModuleNotFoundError: No module named 'shared'`

**Solution**: Ensure the shared directory is in the Python path. Services add it automatically:
```python
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
```

### Issue: Rate Limiting Not Working

**Symptom**: Requests not being rate limited

**Solution**: 
1. Check rate limiter initialization in service
2. Verify rate limit middleware is registered
3. Check that excluded paths (like /health) are configured correctly

### Issue: Logs Not Appearing

**Symptom**: No structured JSON logs in output

**Solution**:
1. Verify LOG_LEVEL environment variable is set correctly
2. Check that logger is initialized: `logger = setup_logging("service-name")`
3. Ensure services are using logger instead of print statements

### Issue: Credential Leakage in Logs

**Symptom**: Passwords or tokens visible in logs

**Solution**:
1. Verify error_handling module is imported
2. Use `format_database_error()` for database errors
3. Use `sanitize_credentials()` before logging user data

## Best Practices

### 1. Always Use Shared Modules

When adding new services or modifying existing ones:
- **DO** import from shared module: `from shared import RateLimiter`
- **DON'T** copy-paste rate limiting code

### 2. Structured Logging

- **DO** use logger: `logger.info("Request processed", extra={"request_id": id})`
- **DON'T** use print: `print("Request processed")`

### 3. Error Handling

- **DO** sanitize errors: `logger.error(f"DB error: {format_database_error(e)}")`
- **DON'T** expose raw errors: `logger.error(f"DB error: {e}")`

### 4. Validation

- **DO** use shared validators: `if not validate_email(email): raise ValueError()`
- **DON'T** duplicate validation logic

## Future Enhancements

Potential additions to shared modules:

1. **Caching utilities**: Redis integration helpers
2. **Database helpers**: Connection pool management
3. **Metrics collection**: Prometheus metrics helpers
4. **Authentication**: JWT validation utilities
5. **Request tracing**: Distributed tracing helpers

## Support

For issues or questions:
1. Check the shared module README: `/shared/README.md`
2. Review test cases: `/tests/test_shared_modules.py`
3. Contact the development team

## Changelog

### Version 2.0.0 (2024-02-06)
- Initial integration of shared modules
- Refactored all 4 core services
- Added comprehensive test suite
- Documented deployment procedures

## Validation Checklist

Before marking deployment complete:

- [x] All shared module tests pass (22/22)
- [x] Integration test passes
- [x] All services compile without errors
- [x] Documentation complete
- [ ] Services tested in development environment
- [ ] Services tested in staging environment
- [ ] Production deployment completed
- [ ] Monitoring dashboards updated
- [ ] Team trained on new structure

## Security Notes

### Credential Sanitization

The error_handling module automatically sanitizes:
- Passwords
- Tokens
- API keys
- Secrets
- Authorization headers
- Database connection strings

Always use `sanitize_credentials()` before logging user input or error messages.

### Input Validation

The validation module helps prevent:
- SQL injection (via sanitize_input)
- XSS attacks (script tag removal)
- Command injection (dangerous character removal)
- Path traversal

Always validate user input before processing.

## Conclusion

The shared modules integration successfully reduces code duplication, improves maintainability, and enhances security across all SBS microservices. The changes are backward compatible and require no configuration updates.
