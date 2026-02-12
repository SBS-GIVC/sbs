# Jira Tickets for SBS Audit Findings
**Generated from**: COMPREHENSIVE_CODE_AUDIT_FINDINGS.md
**Date**: February 12, 2026

---

## Epic: SBS Integration Engine - Critical Improvements
**Epic Key**: SBS-100
**Summary**: Implement critical improvements from comprehensive code audit
**Description**: 
Based on comprehensive code audit, implement 25+ improvements across architecture, security, performance, and code quality. This epic tracks all critical, high, medium, and low priority fixes.

**Acceptance Criteria**:
- All critical issues resolved
- 80%+ test coverage
- Zero high-priority security issues
- Performance improved by 30%+

---

## Critical Priority Tickets (Week 1)

### ✅ SBS-101: Implement Database Connection Pooling
**Status**: DONE
**Priority**: Critical
**Assignee**: Backend Team
**Labels**: backend, database, performance, critical

**Description**:
Three services (signer-service, financial-rules-engine, nphies-bridge) create new database connections for each request, causing connection exhaustion under load.

**Acceptance Criteria**:
- [x] Add connection pooling to signer-service
- [x] Add connection pooling to financial-rules-engine  
- [x] Add connection pooling to nphies-bridge
- [x] Configure pool sizes appropriately (1-20 for low traffic, 2-30 for high traffic)
- [x] Add startup/shutdown lifecycle handlers
- [x] Load test with 100+ concurrent requests

**Estimate**: 8 hours
**Completed**: Feb 12, 2026

---

### ✅ SBS-102: Add Missing POST /normalize Endpoint
**Status**: DONE
**Priority**: Critical
**Assignee**: Backend Team
**Labels**: backend, api, normalizer, critical

**Description**:
Frontend expects POST /normalize endpoint but normalizer-service doesn't expose it. This breaks the code normalization workflow.

**Acceptance Criteria**:
- [x] Implement POST /normalize endpoint
- [x] Add database lookup logic
- [x] Add AI fallback when not in database
- [x] Return structured response with confidence scores
- [x] Track metrics (cache hits, AI calls, etc.)
- [x] Write comprehensive tests

**Estimate**: 6 hours
**Completed**: Feb 12, 2026

---

### ✅ SBS-103: Standardize Error Response Format
**Status**: DONE
**Priority**: Critical
**Assignee**: Backend Team
**Labels**: backend, api, error-handling, critical

**Description**:
Services return inconsistent error formats (some strings, some objects), making client-side error handling difficult.

**Acceptance Criteria**:
- [x] Create shared/error_responses.py module
- [x] Define standard error structure
- [x] Create error code constants (ErrorCodes class)
- [x] Add convenience functions
- [x] Update shared/__init__.py exports
- [ ] Update all services to use standardized errors (IN PROGRESS)
- [ ] Document error codes

**Estimate**: 8 hours
**Status**: 75% Complete

---

### SBS-104: Fix Frontend-Backend API URL Mismatch
**Priority**: Critical
**Assignee**: Full Stack Team
**Labels**: frontend, backend, api-gateway, critical

**Description**:
Frontend config uses different URLs than actual backend services. API calls are inconsistent (some direct, some proxied).

**Acceptance Criteria**:
- [ ] Add proxy routes to sbs-landing/server.js for all backend services
- [ ] Update frontend api.config.js to use consistent base URL
- [ ] Test all API flows end-to-end
- [ ] Document API gateway pattern

**Estimate**: 6 hours
**Related**: COMPREHENSIVE_CODE_AUDIT_FINDINGS.md Section 2.1

---

### SBS-105: Add Service-to-Service Authentication
**Priority**: Critical (Security)
**Assignee**: Security Team
**Labels**: security, authentication, backend, critical

**Description**:
Backend microservices have NO authentication. If network is breached, services are completely open.

**Acceptance Criteria**:
- [ ] Create shared/service_auth.py module
- [ ] Implement API key validation middleware
- [ ] Add X-Internal-API-Key header requirement
- [ ] Update all services with auth middleware
- [ ] Generate and distribute internal API keys securely
- [ ] Document authentication flow

**Estimate**: 8 hours
**Security Risk**: HIGH
**Related**: COMPREHENSIVE_CODE_AUDIT_FINDINGS.md Section 4.2.3

---

## High Priority Tickets (Week 2)

### SBS-106: Implement Redis Caching Layer
**Priority**: High
**Assignee**: Backend Team
**Labels**: backend, performance, caching, high

**Description**:
No caching for frequently accessed data (facility info, SBS code lookups). Repeated database queries slow down responses.

**Acceptance Criteria**:
- [ ] Add Redis to docker-compose
- [ ] Create caching decorator in shared module
- [ ] Cache facility lookups (TTL: 1 hour)
- [ ] Cache SBS code mappings (TTL: 24 hours)
- [ ] Implement cache invalidation strategy
- [ ] Measure performance improvement

**Estimate**: 12 hours
**Expected Impact**: 30-50% response time reduction

---

### SBS-107: Add Comprehensive Input Validation
**Priority**: High
**Assignee**: Backend Team
**Labels**: backend, validation, security, high

**Description**:
Not all endpoints validate inputs using shared.validation module. Risk of invalid data reaching database.

**Acceptance Criteria**:
- [ ] Audit all POST endpoints
- [ ] Add validation to financial-rules-engine endpoints
- [ ] Add validation to nphies-bridge endpoints
- [ ] Add validation to signer-service endpoints
- [ ] Use Pydantic models consistently
- [ ] Write validation tests

**Estimate**: 8 hours

---

### SBS-108: Standardize Frontend API Client
**Priority**: High
**Assignee**: Frontend Team
**Labels**: frontend, refactoring, high

**Description**:
Multiple API client patterns (vanilla JS, config-based, axios-based) cause confusion and duplication.

**Acceptance Criteria**:
- [ ] Create single axios instance with interceptors
- [ ] Remove duplicate API client code
- [ ] Centralize error handling
- [ ] Add request/response logging
- [ ] Update all components to use new client
- [ ] Document API client usage

**Estimate**: 6 hours
**Related**: COMPREHENSIVE_CODE_AUDIT_FINDINGS.md Section 3.1

---

### SBS-109: Add Database Performance Indexes
**Priority**: High
**Assignee**: Database Team
**Labels**: database, performance, high

**Description**:
Missing indexes on frequently queried columns causing slow queries.

**Acceptance Criteria**:
- [ ] Analyze query patterns (use EXPLAIN)
- [ ] Add index on facility_certificates(facility_id, is_active)
- [ ] Add index on sbs_normalization_map(facility_id, internal_code_id)
- [ ] Add index on nphies_transactions(submission_timestamp DESC)
- [ ] Measure query performance before/after
- [ ] Document index strategy

**Estimate**: 4 hours
**Expected Impact**: 50-80% query time reduction

---

### SBS-110: Consolidate Docker Compose Files
**Priority**: High
**Assignee**: DevOps Team
**Labels**: devops, docker, deployment, high

**Description**:
Too many docker-compose files (5 total) - unclear which to use for what environment.

**Acceptance Criteria**:
- [ ] Consolidate to 3 files: dev, test, prod
- [ ] Remove redundant configurations
- [ ] Add health checks to all services
- [ ] Document usage of each file
- [ ] Update deployment scripts

**Estimate**: 4 hours

---

## Medium Priority Tickets (Week 3)

### SBS-111: Add Type Hints to All Python Functions
**Priority**: Medium
**Assignee**: Backend Team
**Labels**: backend, code-quality, medium

**Description**:
Not all Python functions have type hints, reducing IDE support and type safety.

**Acceptance Criteria**:
- [ ] Add type hints to all service main.py files
- [ ] Add type hints to shared module
- [ ] Run mypy for type checking
- [ ] Fix any type errors found
- [ ] Add to CI/CD pipeline

**Estimate**: 12 hours

---

### SBS-112: Write Unit Tests for Shared Modules
**Priority**: Medium
**Assignee**: QA Team
**Labels**: testing, backend, medium

**Description**:
Shared module has only basic tests. Need comprehensive coverage for all utilities.

**Acceptance Criteria**:
- [ ] Tests for error_responses.py (100% coverage)
- [ ] Tests for validation.py (100% coverage)
- [ ] Tests for rate_limiter.py (100% coverage)
- [ ] Tests for logging_config.py (80% coverage)
- [ ] Tests for error_handling.py (80% coverage)
- [ ] Add to CI/CD pipeline

**Estimate**: 16 hours

---

### SBS-113: Enable Swagger API Documentation
**Priority**: Medium
**Assignee**: Backend Team
**Labels**: backend, documentation, medium

**Description**:
FastAPI auto-generates docs but not exposed. Developers don't know what endpoints exist.

**Acceptance Criteria**:
- [ ] Enable /docs endpoint on all services
- [ ] Add detailed endpoint descriptions
- [ ] Add request/response examples
- [ ] Document error responses
- [ ] Add authentication examples (when implemented)

**Estimate**: 4 hours

---

### SBS-114: Create Architecture Diagrams
**Priority**: Medium
**Assignee**: Tech Lead
**Labels**: documentation, architecture, medium

**Description**:
No visual architecture documentation. Hard for new developers to understand system.

**Acceptance Criteria**:
- [ ] Service interaction flow diagram
- [ ] Data flow diagram
- [ ] Deployment architecture diagram
- [ ] Database ER diagram
- [ ] Add to repository /docs folder
- [ ] Export as PNG and SVG

**Estimate**: 8 hours
**Tool**: Draw.io or Mermaid

---

### SBS-115: Document All Environment Variables
**Priority**: Medium
**Assignee**: DevOps Team
**Labels**: documentation, devops, medium

**Description**:
Environment variables not well documented. Missing .env.example files.

**Acceptance Criteria**:
- [ ] Create comprehensive .env.example for each service
- [ ] Document all variables with descriptions
- [ ] Specify required vs optional
- [ ] Document default values
- [ ] Add validation script to check env vars

**Estimate**: 3 hours

---

### SBS-116: Implement API Versioning
**Priority**: Medium
**Assignee**: Backend Team
**Labels**: backend, api, versioning, medium

**Description**:
APIs not versioned - breaking changes will break all clients.

**Acceptance Criteria**:
- [ ] Add /v2 prefix to all FastAPI apps
- [ ] Keep /v1 for backward compatibility (deprecated)
- [ ] Update frontend to use /v2
- [ ] Document versioning strategy
- [ ] Add deprecation warnings to /v1

**Estimate**: 6 hours

---

### SBS-117: Add Prometheus Metrics Integration
**Priority**: Medium
**Assignee**: DevOps Team
**Labels**: monitoring, prometheus, medium

**Description**:
Custom metrics tracking but not integrated with Prometheus for monitoring.

**Acceptance Criteria**:
- [ ] Add prometheus_client to all services
- [ ] Expose /metrics in Prometheus format
- [ ] Track request count, latency, errors
- [ ] Add Grafana dashboards
- [ ] Document metrics

**Estimate**: 8 hours

---

## Low Priority Tickets (Week 4)

### SBS-118: Fix Private Key Storage in Database
**Priority**: Low (Security)
**Assignee**: Security Team
**Labels**: security, database, low

**Description**:
Signer-service stores private key paths in database. Security risk if database compromised.

**Recommendation**: Move to secret management service (AWS KMS, Azure Key Vault, HashiCorp Vault)

**Estimate**: 16 hours (requires infrastructure setup)

---

### SBS-119: Add Request ID Tracking
**Priority**: Low
**Assignee**: Backend Team
**Labels**: logging, observability, low

**Description**:
Not all services track request IDs for distributed tracing.

**Estimate**: 4 hours

---

### SBS-120: Review and Update Dependencies
**Priority**: Low
**Assignee**: DevOps Team
**Labels**: dependencies, security, low

**Description**:
Review all package.json and requirements.txt for outdated packages.

**Estimate**: 4 hours

---

## Summary Statistics

**Total Tickets**: 20
- **Critical**: 5 (2 DONE, 3 TODO)
- **High**: 5 (all TODO)
- **Medium**: 7 (all TODO)
- **Low**: 3 (all TODO)

**Total Estimated Hours**: ~150 hours
**Team Capacity**: 3 developers × 40 hours/week = 120 hours/week
**Timeline**: 4 weeks

---

## How to Create These Tickets in Jira

### Option 1: CSV Import
1. Export this data to CSV format
2. Use Jira's CSV import feature
3. Map columns to Jira fields

### Option 2: Jira REST API
```bash
# Use Jira API to bulk create tickets
curl -X POST \
  -H "Authorization: Bearer ${JIRA_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @tickets.json \
  https://your-domain.atlassian.net/rest/api/3/issue/bulk
```

### Option 3: Manual Creation
Copy-paste each ticket into Jira web interface.

---

**End of Jira Tickets Template**
