# SBS Enhancement Implementation Plan

**Priority Ranking**: Critical → High → Medium → Low
**Timeline**: 4 weeks
**Status**: Ready for execution

---

## Week 1: Critical Fixes (Priority 1)

### 1.1 Database Connection Pooling ⚠️ CRITICAL
**Services to Fix**: signer-service, financial-rules-engine, nphies-bridge

**Files to Modify**:
- `signer-service/main.py`
- `financial-rules-engine/main.py`  
- `nphies-bridge/main.py`

**Changes**:
```python
# Add at top of each file
from psycopg2 import pool
from contextlib import contextmanager

# Replace get_db_connection() function
db_pool = None

def init_db_pool():
    global db_pool
    db_pool = pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=20,
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sbs_integration"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )

@contextmanager
def get_db_connection():
    if not db_pool:
        init_db_pool()
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

# Add shutdown handler
@app.on_event("shutdown")
def shutdown_event():
    if db_pool:
        db_pool.closeall()
```

**Estimated Time**: 4 hours
**Testing**: Load test with 100 concurrent requests

---

### 1.2 Standardize Error Responses ⚠️ CRITICAL

**Issue**: Inconsistent error formats across services

**Solution**: Create shared error response builder

**File to Create**: `shared/error_responses.py`
```python
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

def create_standard_error(
    error: str,
    error_code: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
    request_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create standardized error response
    
    Returns:
        {
            "error": "Human-readable message",
            "error_code": "SERVICE_ERROR_TYPE",
            "error_id": "uuid-for-tracking",
            "timestamp": "2026-02-12T20:00:00Z",
            "status": 404,
            "path": "/api/endpoint",
            "details": {...}
        }
    """
    return {
        "error": error,
        "error_code": error_code,
        "error_id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "status": status_code,
        "path": request_path or "",
        "details": details or {}
    }
```

**Files to Update**: All service main.py files to use this function

**Estimated Time**: 6 hours

---

### 1.3 Add Missing API Endpoints ⚠️ CRITICAL

#### normalizer-service: Add POST /normalize

**File**: `normalizer-service/main.py`

**Add**:
```python
class NormalizeRequest(BaseModel):
    facility_id: int = Field(..., description="Facility ID")
    internal_code: str = Field(..., description="Internal code to normalize")
    description: Optional[str] = Field(None, description="Code description")

class NormalizeResponse(BaseModel):
    sbs_code: str
    sbs_description: str
    confidence: float
    source: str  # "database" or "ai"

@app.post("/normalize", response_model=NormalizeResponse)
async def normalize_code(request: NormalizeRequest):
    """
    Normalize internal facility code to SBS standard code
    """
    # 1. Try database lookup first
    db_result = await lookup_code_in_database(
        request.facility_id, 
        request.internal_code
    )
    
    if db_result:
        metrics["cache_hits"] += 1
        return NormalizeResponse(
            sbs_code=db_result['sbs_code'],
            sbs_description=db_result['sbs_description'],
            confidence=1.0,
            source="database"
        )
    
    # 2. Fall back to AI if not in database
    metrics["cache_misses"] += 1
    metrics["ai_calls"] += 1
    
    ai_result = await ai_normalize(request.internal_code, request.description)
    
    return NormalizeResponse(
        sbs_code=ai_result['code'],
        sbs_description=ai_result['description'],
        confidence=ai_result['confidence'],
        source="ai"
    )
```

**Estimated Time**: 3 hours

---

### 1.4 Fix Frontend-Backend URL Mismatch ⚠️ CRITICAL

**Problem**: Frontend calls `/api/normalize` but backend services don't expose unified gateway

**Solution**: Update `sbs-landing/server.js` to properly proxy

**File**: `sbs-landing/server.js`

**Add Proxy Routes**:
```javascript
// Service URLs
const NORMALIZER_URL = process.env.NORMALIZER_URL || 'http://localhost:8000';
const SIGNER_URL = process.env.SIGNER_URL || 'http://localhost:8001';
const FINANCIAL_URL = process.env.FINANCIAL_URL || 'http://localhost:8002';
const NPHIES_URL = process.env.NPHIES_URL || 'http://localhost:8003';

// Proxy to normalizer service
app.post('/api/normalize', async (req, res) => {
  try {
    const response = await axios.post(`${NORMALIZER_URL}/normalize`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// Proxy to signer service  
app.post('/api/sign', async (req, res) => {
  try {
    const response = await axios.post(`${SIGNER_URL}/sign`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// Proxy to financial rules
app.post('/api/financial/validate', async (req, res) => {
  try {
    const response = await axios.post(`${FINANCIAL_URL}/validate`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});
```

**Estimated Time**: 4 hours

---

### 1.5 Add Service-to-Service Authentication 🔒 SECURITY

**File to Create**: `shared/service_auth.py`

```python
import os
from fastapi import HTTPException, Request, status
from functools import wraps

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")

async def verify_service_auth(request: Request):
    """
    Verify internal service-to-service authentication
    """
    # Skip auth for health checks
    if request.url.path in ["/health", "/ready", "/metrics"]:
        return True
    
    api_key = request.headers.get("X-Internal-API-Key")
    if not api_key or api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Invalid or missing API key"
        )
    return True
```

**Add to all services**:
```python
from shared.service_auth import verify_service_auth

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    await verify_service_auth(request)
    return await call_next(request)
```

**Estimated Time**: 5 hours
**Note**: Requires coordination with deployment team for key distribution

---

## Week 2: Important Enhancements (Priority 2)

### 2.1 Implement Redis Caching
- Add Redis service to docker-compose
- Create caching decorators
- Cache facility lookups, SBS code mappings
**Estimated Time**: 8 hours

### 2.2 Add Comprehensive Input Validation
- Validate all request bodies using `shared.validation`
- Add Pydantic models for all requests
**Estimated Time**: 6 hours

### 2.3 Standardize Frontend API Client
- Create single Axios instance with interceptors
- Remove duplicate API client code
**Estimated Time**: 4 hours

### 2.4 Add Database Indexes
- Analyze query patterns
- Add indexes for performance
**Estimated Time**: 3 hours

### 2.5 Consolidate Docker Compose Files
- Merge into 3 files (dev, test, prod)
- Document usage
**Estimated Time**: 3 hours

---

## Week 3-4: Quality & Documentation (Priority 3)

### 3.1 Add Type Hints (8 hours)
### 3.2 Write Unit Tests (16 hours)
### 3.3 Enable API Documentation (4 hours)
### 3.4 Create Architecture Diagrams (6 hours)
### 3.5 Document Environment Variables (2 hours)
### 3.6 Implement API Versioning (6 hours)
### 3.7 Add Prometheus Metrics (8 hours)

---

## Testing Strategy

### Unit Tests
- All shared modules: 100% coverage
- Service endpoints: 80% coverage
- Validation functions: 100% coverage

### Integration Tests
- Service-to-service communication
- Database operations
- Cache operations

### Load Tests
- 100 concurrent requests
- 1000 requests/minute sustained
- Connection pool stability

---

## Rollout Plan

### Phase 1: Backend Services
1. Deploy connection pooling updates
2. Deploy error standardization
3. Deploy new endpoints
4. Test thoroughly

### Phase 2: API Gateway
1. Deploy proxy updates
2. Update frontend config
3. Test end-to-end flows

### Phase 3: Security & Performance
1. Deploy service auth
2. Deploy caching layer
3. Monitor performance metrics

---

## Success Criteria

- ✅ All critical issues resolved
- ✅ 95% uptime during implementation
- ✅ No breaking changes to existing clients
- ✅ Performance improvement: 50% reduction in DB connections
- ✅ Response time improvement: 30% faster average
- ✅ Test coverage: 80%+ for all services

---

**Total Estimated Time**: ~120 hours (3 developers × 4 weeks)

