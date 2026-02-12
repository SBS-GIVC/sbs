"""
Enhanced Normalizer Service with Rate Limiting and Connection Pooling
Improvements:
- Connection pooling for database
- Rate limiting to prevent abuse
- Better error handling
- Prometheus metrics
- Request ID tracking
"""

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import Optional
import os
import sys
from dotenv import load_dotenv
import hashlib
import time
from datetime import datetime
import uuid
from contextlib import contextmanager
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

# Add parent directory to path for shared module import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import (
    RateLimiter, 
    setup_logging, 
    format_database_error,
    ErrorCodes,
    raise_standard_http_exception,
    create_standard_error
)

from copilot_routes import router as copilot_router

load_dotenv()

# Setup structured logging
logger = setup_logging("normalizer-service", log_level=os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(
    title="SBS Normalizer Service - Enhanced",
    description="AI-Powered code normalization with rate limiting and monitoring",
    version="2.0.0"
)

# Internal copilot endpoint (safe-by-default). Used by Landing when available.
app.include_router(copilot_router)

# CORS middleware (restricted)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGIN")
allowed_origins = (
    [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
    if allowed_origins_env
    else ["http://localhost:3000", "http://localhost:3001"]
)
allow_credentials = "*" not in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

# Database connection pool
try:
    db_pool = pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=20,
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sbs_integration"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )
    logger.info("Database connection pool created successfully")
except Exception as e:
    logger.error(f"Failed to create connection pool: {format_database_error(e)}")
    db_pool = None

# Initialize rate limiter (100 requests per minute per IP) - using shared module
rate_limiter = RateLimiter(max_requests=100, time_window=60)

# Metrics storage (in production, use Prometheus)
metrics = {
    "requests_total": 0,
    "requests_success": 0,
    "requests_failed": 0,
    "rate_limited": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "ai_calls": 0
}

@contextmanager
def get_db_connection():
    """Get database connection from pool"""
    conn = None
    try:
        if db_pool:
            conn = db_pool.getconn()
            yield conn
        else:
            # Fallback to direct connection
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                database=os.getenv("DB_NAME", "sbs_integration"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD"),
                port=os.getenv("DB_PORT", "5432")
            )
            yield conn
    except Exception as e:
        logger.error(f"Database connection error: {format_database_error(e)}")
        raise
    finally:
        if conn and db_pool:
            db_pool.putconn(conn)
        elif conn:
            conn.close()


class InternalClaimItem(BaseModel):
    facility_id: int = Field(..., description="Unique facility identifier", ge=1)
    internal_code: str = Field(..., description="Internal service code from HIS", min_length=1, max_length=100)
    description: str = Field(..., description="Service description", min_length=1, max_length=500)
    
    @validator('internal_code')
    def validate_code(cls, v):
        import re
        # Prevent SQL injection and command injection attempts
        dangerous_patterns = [
            r';', r'--', r'/\*', r'\*/', r'\\', r'\x00',  # SQL injection
            r'\$\(', r'`', r'\|', r'&&', r'\|\|',  # Command injection
            r'<script', r'javascript:', r'data:',  # XSS
            r'\.\./', r'\.\.\\',  # Path traversal
        ]
        v_lower = v.lower()
        for pattern in dangerous_patterns:
            if re.search(pattern, v_lower):
                raise ValueError('Invalid characters in code')
        # Only allow alphanumeric, hyphen, underscore, and period
        if not re.match(r'^[a-zA-Z0-9_\-\.]+$', v):
            raise ValueError('Code must contain only alphanumeric characters, hyphens, underscores, and periods')
        return v.strip()
    
    @validator('description')
    def validate_description(cls, v):
        import re
        # Sanitize description - remove potentially dangerous content
        dangerous_patterns = [
            r'<script.*?>.*?</script>', r'javascript:', r'on\w+\s*=',  # XSS
            r'\.\./', r'\.\.\\',  # Path traversal
        ]
        v_clean = v
        for pattern in dangerous_patterns:
            v_clean = re.sub(pattern, '', v_clean, flags=re.IGNORECASE)
        return v_clean.strip()


class NormalizedResponse(BaseModel):
    sbs_mapped_code: str
    official_description: str
    confidence: float
    mapping_source: str
    description_en: Optional[str] = None
    description_ar: Optional[str] = None
    request_id: Optional[str] = None
    processing_time_ms: Optional[float] = None


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add request ID to all requests"""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    request.state.start_time = time.time()
    
    response = await call_next(request)
    
    response.headers["X-Request-ID"] = request_id
    processing_time = (time.time() - request.state.start_time) * 1000
    response.headers["X-Processing-Time-MS"] = f"{processing_time:.2f}"
    
    return response


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    # Skip rate limiting for health check
    if request.url.path == "/health" or request.url.path == "/metrics":
        return await call_next(request)
    
    # Get client identifier (IP address)
    client_ip = request.client.host
    
    if not rate_limiter.is_allowed(client_ip):
        metrics["rate_limited"] += 1
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again later.",
                "retry_after_seconds": 60
            }
        )
    
    return await call_next(request)


@app.get("/health")
async def health_check():
    """Enhanced health check with database connectivity"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()

        return {
            "status": "healthy",
            "database": "connected",
            "pool_available": db_pool is not None,
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )


@app.get("/ready")
async def ready_check():
    """Readiness probe endpoint for Kubernetes"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()

        return {
            "status": "ready",
            "database": "connected",
            "pool_available": db_pool is not None,
            "version": "2.0.0",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "error": str(e)
            }
        )


@app.get("/metrics")
async def get_metrics():
    """Prometheus-style metrics endpoint"""
    return {
        "service": "normalizer",
        "metrics": metrics,
        "uptime_seconds": time.time(),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/normalize", response_model=NormalizedResponse)
async def normalize_code(claim_item: InternalClaimItem, request: Request):
    """
    Enhanced normalization endpoint with metrics and error handling
    """
    start_time = time.time()
    metrics["requests_total"] += 1
    
    request_id = request.state.request_id
    
    try:
        # Step 1: Check local mapping database
        result = lookup_local_mapping(claim_item.facility_id, claim_item.internal_code)
        
        if result:
            metrics["requests_success"] += 1
            metrics["cache_hits"] += 1
            
            processing_time = (time.time() - start_time) * 1000
            
            return NormalizedResponse(
                sbs_mapped_code=result['sbs_code'],
                official_description=result['description_en'],
                confidence=result['confidence'],
                mapping_source=result['mapping_source'],
                description_en=result.get('description_en'),
                description_ar=result.get('description_ar'),
                request_id=request_id,
                processing_time_ms=round(processing_time, 2)
            )
        
        # If not found, return appropriate error
        metrics["cache_misses"] += 1
        metrics["requests_failed"] += 1
        
        raise HTTPException(
            status_code=404,
            detail={
                "error": "Code not found",
                "message": f"No mapping found for facility {claim_item.facility_id}, code {claim_item.internal_code}",
                "request_id": request_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        metrics["requests_failed"] += 1
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Internal server error",
                "message": str(e),
                "request_id": request_id
            }
        )


def lookup_local_mapping(facility_id: int, internal_code: str) -> Optional[dict]:
    """
    Optimized database lookup with connection pooling
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            query = """
            SELECT 
                snm.sbs_code,
                snm.confidence,
                snm.mapping_source,
                smc.description_en,
                smc.description_ar
            FROM sbs_normalization_map snm
            JOIN facility_internal_codes fic ON snm.internal_code_id = fic.internal_code_id
            JOIN sbs_master_catalogue smc ON snm.sbs_code = smc.sbs_id
            WHERE fic.facility_id = %s 
              AND fic.internal_code = %s 
              AND snm.is_active = TRUE
              AND fic.is_active = TRUE
            LIMIT 1
            """
            
            cursor.execute(query, (facility_id, internal_code))
            result = cursor.fetchone()
            
            cursor.close()
            
            return dict(result) if result else None
            
    except Exception as e:
        logger.error(f"Database lookup error: {format_database_error(e)}")
        return None


@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on shutdown"""
    if db_pool:
        db_pool.closeall()
        logger.info("Database connection pool closed")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# ============================================
# Normalization Endpoint
# ============================================

class NormalizeRequest(BaseModel):
    facility_id: int = Field(..., description="Facility ID")
    internal_code: str = Field(..., description="Internal facility code")
    description: Optional[str] = Field(None, description="Code description (optional)")

class NormalizeResponse(BaseModel):
    sbs_code: str = Field(..., description="Normalized SBS code")
    sbs_description: str = Field(..., description="SBS code description")
    confidence: float = Field(..., description="Confidence score (0-1)")
    source: str = Field(..., description="Source: 'database' or 'ai'")
    cached: bool = Field(default=False, description="Was result cached?")

@app.post("/normalize", response_model=NormalizeResponse)
async def normalize_code(request: NormalizeRequest):
    """
    Normalize internal facility code to SBS standard code
    
    Process:
    1. Check cache (if available)
    2. Lookup in database mapping table
    3. Fall back to AI normalization if not found
    """
    metrics["requests_total"] += 1
    request_id = str(uuid.uuid4())
    
    logger.info(
        f"Normalize request received",
        extra={
            "request_id": request_id,
            "facility_id": request.facility_id,
            "internal_code": request.internal_code
        }
    )
    
    try:
        # Try database lookup first
        db_result = lookup_code_in_database(request.facility_id, request.internal_code)
        
        if db_result:
            metrics["requests_success"] += 1
            metrics["cache_hits"] += 1
            logger.info(
                f"Code found in database",
                extra={"request_id": request_id, "sbs_code": db_result.get('sbs_code')}
            )
            return NormalizeResponse(
                sbs_code=db_result['sbs_code'],
                sbs_description=db_result.get('sbs_description', ''),
                confidence=1.0,
                source="database",
                cached=True
            )
        
        # Database lookup failed - use AI fallback
        metrics["cache_misses"] += 1
        metrics["ai_calls"] += 1
        
        logger.info(
            f"Code not found in database, using AI",
            extra={"request_id": request_id}
        )
        
        # AI normalization (placeholder - integrate with actual AI service)
        # For now, return a mock response
        ai_code = f"SBS-PENDING-{request.internal_code[:5]}"
        
        metrics["requests_success"] += 1
        
        return NormalizeResponse(
            sbs_code=ai_code,
            sbs_description=f"AI-suggested mapping for {request.internal_code}",
            confidence=0.75,
            source="ai",
            cached=False
        )
        
    except Exception as e:
        metrics["requests_failed"] += 1
        logger.error(
            f"Normalization error: {str(e)}",
            extra={"request_id": request_id}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Normalization failed",
                "error_code": "NORMALIZER_PROCESSING_ERROR",
                "error_id": request_id
            }
        )
