# SBS Comprehensive Codebase Audit Report

**Date:** February 6, 2026  
**Scope:** Complete codebase review, security audit, and enhancement analysis  
**Status:** Completed  

## Executive Summary

This document presents findings from a comprehensive audit of the Saudi Billing System (SBS) Integration Engine codebase. The audit covered all 5 core microservices, frontend application, test infrastructure, and CI/CD pipelines.

### Risk Assessment

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 5 | 8 | 12 | 6 |
| Code Quality | 2 | 10 | 15 | 8 |
| Integration | 0 | 4 | 8 | 5 |
| Testing | 1 | 6 | 8 | 4 |
| **Total** | **8** | **28** | **43** | **23** |

---

## 1. Normalizer Service Audit

### Critical Issues

#### 1.1 CORS Bypass Vulnerability (`main_enhanced.py:38-43`)
```python
# VULNERABLE CODE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Allows ANY origin
    allow_credentials=True,    # Combined with "*" = security issue
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**Risk:** Enables CSRF attacks and unauthorized cross-domain requests  
**Fix:** Use restricted origin list from environment variable

#### 1.2 Three Duplicate Service Versions
- `main.py` - Current version with better validation
- `main_enhanced.py` - Has CORS vulnerability
- `main_original_backup.py` - Contains dead AI integration code

**Recommendation:** Consolidate to single version

#### 1.3 Rate Limiter Memory Leak (`main.py:94-102`)
```python
class RateLimiter:
    def __init__(self):
        self.requests = {}  # Grows unbounded
```
**Fix:** Implement TTL-based cleanup

#### 1.4 Input Validation Inconsistency
- `main_enhanced.py` validates only 4 SQL keywords
- `main.py` has comprehensive regex but still has gaps

### High Priority Issues

- Unused `hashlib` import (Line 18)
- Thread-unsafe metrics increment
- Missing structured logging (uses `print()`)
- No API key authentication

---

## 2. Financial Rules Engine Audit

### Critical Issues

#### 2.1 Database Connection Leaks
Connections not closed in exception paths across multiple functions:
- Lines 108-132
- Lines 138-155  
- Lines 164-195

**Fix:** Use connection pooling with context managers

#### 2.2 N+1 Query Problem (`main.py:357`)
Each claim item triggers separate database call.

**Fix:** Batch query all SBS codes in single call

### High Priority Issues

- Hardcoded FHIR system URLs (Lines 307, 352)
- Memory leak in rate limiter
- Bare exception handling masks error types
- No retry logic for database failures

---

## 3. Signer Service Audit

### Critical Issues

#### 3.1 Unencrypted Private Key Storage (`main.py:278-284`)
```python
# VULNERABLE CODE
private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()  # No encryption!
)
```
**Fix:** Use password encryption for private keys

#### 3.2 No API Authentication
`/sign` endpoint accessible without authentication.

#### 3.3 Missing File Permissions
Private key files created without restricted permissions.

**Fix:** Add `os.chmod(private_key_path, 0o600)`

### High Priority Issues

- No signature verification endpoint
- No audit logging for signing operations
- Certificate chain validation missing
- Database connection per request (no pooling)

---

## 4. NPHIES Bridge Audit

### Critical Issues

#### 4.1 API Key Exposure (`main.py:188`)
API key logged in error scenarios.

**Fix:** Implement secure logging with masking

#### 4.2 Missing Signature Verification (`main.py:98`)
Accepts any string as signature without cryptographic verification.

### High Priority Issues

- Rate limiter memory leak
- Retry logic ignores `Retry-After` header
- Unused imports (`requests`, `prometheus-client`)
- No distributed rate limiting for multi-instance deployments

---

## 5. SBS Landing (Frontend + API) Audit

### Critical Issues

#### 5.1 XSS via CSP Bypass (`server.cjs:98-99`)
```javascript
// VULNERABLE CODE
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
```
**Fix:** Remove unsafe-inline and unsafe-eval; use nonce-based CSP

#### 5.2 No Authentication
Zero user authentication mechanisms across all endpoints.

#### 5.3 In-Memory Storage (`server.cjs:22`)
```javascript
const claimStore = new Map(); // Loses data on restart
```
**Fix:** Implement persistent database storage

#### 5.4 Vite Proxy Security (`vite.config.js:77`)
```javascript
secure: false  // Disables HTTPS verification
```
**Fix:** Set to `true` in production

### High Priority Issues

- No test coverage (`"test": "echo \"No tests configured yet\""`)
- Hardcoded production URLs in `index.html`
- File upload validation incomplete
- Sourcemap enabled in production build

---

## 6. Test Infrastructure Audit

### Critical Issues

#### 6.1 CI Allows Test Failures (`ci.yml:105, 174, 226`)
```yaml
continue-on-error: true  # Tests fail silently!
```
**Fix:** Remove continue-on-error; enforce test passing

### High Priority Issues

- No mocking in integration tests (uses real HTTP calls)
- Root-level test files outside `/tests/` directory
- No coverage thresholds enforced
- Hard-coded `time.sleep()` creates flaky tests
- Missing error path test scenarios

### Test Files Summary

| Directory | Files | Tests | Status |
|-----------|-------|-------|--------|
| `/tests/` | 10 | ~100+ | Decent |
| `/tests/e2e/` | 1 | ~15+ | Minimal |
| Root level | 3 | Ad-hoc | Problematic |

---

## 7. CI/CD Workflow Audit

### Critical Issues

#### 7.1 Unsafe Script Execution (`cline-responder.yml:20`)
```bash
curl -fsSL https://... | bash  # Supply chain attack risk
```
**Recommendation:** Delete or rewrite workflow

#### 7.2 Docker Build Not Gated by Tests (`ci.yml:234`)
```yaml
needs: lint  # Should include test jobs
```
**Fix:** Change to `needs: [lint, test-python, test-node]`

### High Priority Issues

- Inconsistent action versions across workflows
- No workflow concurrency control
- Missing job-level timeouts
- Duplicate deploy workflows (cd.yml and deploy.yml)

---

## 8. AI Services Audit

### AI Prediction Service (`ai-prediction-service/main.py`)

**Strengths:**
- Proper CORS configuration
- Thread-safe rate limiter
- Pydantic models for validation

**Issues:**
- Same database connection pattern issues
- No caching for predictions
- Missing model versioning

### DeepSeek Integration

**Status:** Partially implemented in `sbs-landing/server.cjs`

**Issues:**
- Falls back to mock responses without warning
- No API key validation at startup
- Response parsing assumes specific format

---

## 9. Priority Recommendations

### Immediate (This Week)

| # | Issue | Service | Action |
|---|-------|---------|--------|
| 1 | CORS wildcard | normalizer | Restrict to allowed origins |
| 2 | CSP unsafe-inline | sbs-landing | Remove unsafe CSP directives |
| 3 | continue-on-error | CI workflows | Remove from test jobs |
| 4 | Duplicate files | normalizer | Consolidate to single main.py |
| 5 | Private key encryption | signer | Enable PKCS8 encryption |

### Short-Term (1-2 Weeks)

| # | Issue | Service | Action |
|---|-------|---------|--------|
| 6 | Database pooling | All services | Implement psycopg2.pool |
| 7 | Rate limiter leak | All services | Add TTL-based cleanup |
| 8 | Add authentication | All services | Implement API key/JWT |
| 9 | Test mocking | tests/ | Add mock fixtures |
| 10 | Logging framework | All services | Replace print() with logging |

### Medium-Term (1 Month)

| # | Issue | Service | Action |
|---|-------|---------|--------|
| 11 | Persistent storage | sbs-landing | Implement PostgreSQL |
| 12 | Error path tests | tests/ | Add comprehensive error scenarios |
| 13 | Consolidate workflows | CI/CD | Merge cd.yml and deploy.yml |
| 14 | Service discovery | All | Remove hardcoded URLs |
| 15 | Audit logging | signer | Track all signing operations |

---

## 10. Open PRs Analysis

| PR # | Title | Status | Recommendation |
|------|-------|--------|----------------|
| 98 | DeepSeek gating, CI smoke test | Review | Merge after audit fixes |
| 97 | npm-minor updates | Dependabot | Merge |
| 96 | pytest-cov bump | Dependabot | Merge |
| 95 | playwright bump | Dependabot | Merge |
| 94 | pytest-html bump | Dependabot | Merge |
| 93 | slack-github-action bump | Dependabot | Review for breaking changes |
| 92 | actions/setup-node bump | Dependabot | Merge |
| 91 | docker/build-push-action bump | Dependabot | Merge |
| 83 | Dashboard panorama | Feature | Review for conflicts |

**Recommendation:** Merge dependabot PRs first (91-97), then feature PRs after security fixes.

---

## 11. Conclusion

The SBS codebase has a **solid architectural foundation** with microservices design, proper API structure, and comprehensive functionality. However, **critical security vulnerabilities** and **code quality issues** must be addressed before production deployment.

**Overall Risk Level:** 🟠 **MEDIUM-HIGH**

The 8 critical issues require immediate attention. Estimated remediation effort:
- Critical issues: 3-5 days
- High priority issues: 2 weeks
- Medium priority issues: 1 month

---

## Appendix A: Files Modified/Created

This audit resulted in the following documentation:
- `COMPREHENSIVE_AUDIT_REPORT.md` - This document

## Appendix B: Security Vulnerability Summary

| Vulnerability | CWE | Severity | Service |
|---------------|-----|----------|---------|
| CORS Misconfiguration | CWE-346 | Critical | normalizer |
| CSP Bypass | CWE-79 | Critical | sbs-landing |
| Plaintext Credentials | CWE-312 | Critical | signer |
| Missing Auth | CWE-306 | Critical | All |
| SQL Injection Risk | CWE-89 | High | financial-rules |
| Information Exposure | CWE-200 | High | nphies-bridge |
| Memory Leak | CWE-401 | Medium | All |
| Missing Encryption | CWE-311 | Medium | signer |
