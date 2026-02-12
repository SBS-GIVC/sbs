"""
NPHIES Bridge Service
Manages all API communications with NPHIES platform
Port: 8003
"""

from fastapi import FastAPI, HTTPException, status, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import httpx
import json
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import asyncio
import uuid
import time
import sys
import os
from terminology_catalog import build_catalog_from_environment

# Add parent directory to path for shared module import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared import RateLimiter, setup_logging, format_database_error  # noqa: E402

load_dotenv()

# Setup structured logging
logger = setup_logging("nphies-bridge", log_level=os.getenv("LOG_LEVEL", "INFO"))

app = FastAPI(
    title="NPHIES Bridge Service",
    description="API Bridge to NPHIES national platform",
    version="1.0.0"
)

# CORS middleware - Restrict to allowed origins
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

# Initialize rate limiter (100 requests per minute per IP) - using shared module
rate_limiter = RateLimiter(max_requests=100, time_window=60)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    if request.url.path in ["/health", "/"]:
        return await call_next(request)
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retry_after_seconds": 60}
        )
    return await call_next(request)

ALLOWED_MOCK_OUTCOMES = {"accepted", "rejected", "error"}
ALLOWED_CLAIM_RESOURCE_TYPES = {"Claim"}
ALLOWED_COMMUNICATION_RESOURCE_TYPES = {"Communication", "CommunicationRequest"}

# NPHIES API Configuration
NPHIES_BASE_URL = os.getenv("NPHIES_BASE_URL", "https://nphies.sa/api/v1")
NPHIES_TIMEOUT = int(os.getenv("NPHIES_TIMEOUT", "30"))
MAX_RETRIES = int(os.getenv("NPHIES_MAX_RETRIES", "3"))
ENABLE_MOCK_NPHIES = os.getenv("ENABLE_MOCK_NPHIES", "false").lower() in ("1", "true", "yes", "on")
STRICT_TERMINOLOGY_VALIDATION = os.getenv("NPHIES_TERMINOLOGY_STRICT", "false").lower() in ("1", "true", "yes", "on")
terminology_catalog = build_catalog_from_environment()


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sbs_integration"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )


class ClaimSubmission(BaseModel):
    facility_id: int = Field(..., description="Facility identifier")
    fhir_payload: Dict[str, Any] = Field(..., description="FHIR Claim payload")
    signature: str = Field(..., description="Digital signature")
    resource_type: str = Field(default="Claim", description="FHIR resource type")
    # Testing-only: when ENABLE_MOCK_NPHIES=true, caller can request an outcome.
    # Valid values: accepted | rejected | error
    mock_outcome: Optional[str] = Field(default=None, description="Mock outcome for local testing")


class SubmissionResponse(BaseModel):
    transaction_id: str
    transaction_uuid: str
    status: str
    nphies_response: Optional[Dict[str, Any]] = None
    http_status: Optional[int] = None
    terminology_validation: Optional[Dict[str, Any]] = None
    message: str


class TerminologyCodeValidationRequest(BaseModel):
    system: str = Field(..., description="CodeSystem URL")
    code: str = Field(..., description="Code value")
    value_set: Optional[str] = Field(default=None, description="Optional ValueSet URL for system compatibility check")


class TerminologyPayloadValidationRequest(BaseModel):
    fhir_payload: Dict[str, Any] = Field(..., description="FHIR resource payload to validate")


def validate_terminology(payload: Dict[str, Any]) -> Dict[str, Any]:
    if terminology_catalog is None:
        return {
            "enabled": False,
            "available": False,
            "is_valid": True,
            "summary": {"error_count": 0, "warning_count": 0},
            "errors": [],
            "warnings": [],
            "load_error": "NPHIES terminology validation is disabled by configuration.",
        }

    summary = terminology_catalog.summary()
    if not summary.get("available"):
        return {
            "enabled": True,
            "available": False,
            "is_valid": True,
            "summary": {"error_count": 0, "warning_count": 0},
            "errors": [],
            "warnings": [],
            "load_error": summary.get("load_error"),
        }

    report = terminology_catalog.validate_payload_codings(payload)
    report["enabled"] = True
    report["load_error"] = None

    if STRICT_TERMINOLOGY_VALIDATION and report["summary"]["error_count"] > 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "NPHIES terminology validation failed",
                "strict_mode": True,
                "validation": report,
            },
        )

    return report


def validate_payload_resource_type(payload: Dict[str, Any], allowed_types: set[str]) -> str:
    resource_type = payload.get("resourceType")
    if resource_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid FHIR payload: resourceType must be one of {sorted(allowed_types)}",
        )
    return resource_type


def normalize_submission_status(http_status: Optional[int], response_data: Optional[Dict[str, Any]]) -> str:
    normalized_raw = str((response_data or {}).get("status") or "").strip().lower()
    if normalized_raw in {"accepted", "submitted", "submitted_successfully", "processed", "ok", "success"}:
        return "accepted"
    if normalized_raw in {"rejected", "denied", "invalid"}:
        return "rejected"
    if normalized_raw in {"error", "failed", "failure", "timeout"}:
        return "error"

    if http_status is not None:
        if 200 <= http_status < 300:
            return "accepted"
        if 400 <= http_status < 500:
            return "rejected"
    return "error"


def build_mock_submission_outcome(desired_outcome: str) -> tuple[int, Dict[str, Any], Optional[str]]:
    if desired_outcome == "rejected":
        return 400, {"id": f"MOCK-{uuid.uuid4().hex[:8]}", "status": "rejected"}, "Mock rejection"
    if desired_outcome == "error":
        return 503, {"status": "error"}, "Mock upstream error"
    return 200, {"id": f"MOCK-{uuid.uuid4().hex[:8]}", "status": "accepted"}, None


async def submit_transaction(
    submission: ClaimSubmission,
    allowed_resource_types: set[str],
    success_message: str,
    request_type: Optional[str] = None,
    endpoint: Optional[str] = None,
) -> SubmissionResponse:
    resource_type = validate_payload_resource_type(submission.fhir_payload, allowed_resource_types)
    target_endpoint = endpoint or resource_type
    log_request_type = request_type or resource_type
    terminology_validation = validate_terminology(submission.fhir_payload)

    if ENABLE_MOCK_NPHIES:
        desired = (submission.mock_outcome or "accepted").lower()
        if desired not in ALLOWED_MOCK_OUTCOMES:
            desired = "accepted"
        http_status, response_data, error_msg = build_mock_submission_outcome(desired)
    else:
        response_data, http_status, error_msg = await submit_to_nphies_with_retry(
            endpoint=target_endpoint,
            payload=submission.fhir_payload,
            signature=submission.signature,
        )

    nphies_txn_id = response_data.get("id") if isinstance(response_data, dict) else None
    normalized_status = normalize_submission_status(http_status, response_data)

    txn_uuid = log_transaction(
        facility_id=submission.facility_id,
        request_type=log_request_type,
        fhir_payload=submission.fhir_payload,
        signature=submission.signature,
        response_data=response_data,
        http_status=http_status,
        nphies_txn_id=nphies_txn_id,
        error_msg=error_msg,
    )

    if normalized_status == "accepted":
        message = success_message
    elif normalized_status == "rejected":
        message = error_msg or f"{log_request_type} rejected by NPHIES"
    else:
        message = error_msg or f"Error submitting {log_request_type} to NPHIES"

    return SubmissionResponse(
        transaction_id=nphies_txn_id or "N/A",
        transaction_uuid=txn_uuid,
        status=normalized_status,
        nphies_response=response_data,
        http_status=http_status,
        terminology_validation=terminology_validation,
        message=message,
    )


def log_transaction(
    facility_id: int,
    request_type: str,
    fhir_payload: Dict,
    signature: str,
    response_data: Optional[Dict] = None,
    http_status: Optional[int] = None,
    nphies_txn_id: Optional[str] = None,
    error_msg: Optional[str] = None
) -> str:
    """
    Log transaction to database for audit trail
    Returns transaction UUID
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        txn_uuid = str(uuid.uuid4())
        txn_status = "submitted" if http_status and http_status < 400 else "error"
        
        if http_status and http_status >= 200 and http_status < 300:
            txn_status = "accepted"
        elif http_status and http_status >= 400:
            txn_status = "rejected"
        
        cursor.execute("""
            INSERT INTO nphies_transactions 
            (facility_id, transaction_uuid, request_type, fhir_payload, signature,
             nphies_transaction_id, http_status_code, response_payload, status, 
             error_message, submission_timestamp, response_timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING transaction_id
        """, (
            facility_id,
            txn_uuid,
            request_type,
            json.dumps(fhir_payload),
            signature,
            nphies_txn_id,
            http_status,
            json.dumps(response_data) if response_data else None,
            txn_status,
            error_msg,
            datetime.utcnow(),
            datetime.utcnow() if response_data else None
        ))
        
        result = cursor.fetchone()
        transaction_id = result['transaction_id']
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return txn_uuid
        
    except Exception as e:
        logger.error(f"Error logging transaction: {format_database_error(e)}")
        return str(uuid.uuid4())  # Return UUID even if logging fails


async def submit_to_nphies_with_retry(
    endpoint: str,
    payload: Dict[str, Any],
    signature: str,
    retry_count: int = 0
) -> tuple:
    """
    Submit request to NPHIES with exponential backoff retry logic
    Returns (response_dict, status_code, error_message)
    """
    
    headers = {
        "Content-Type": "application/fhir+json",
        "Accept": "application/fhir+json",
        "X-NPHIES-Signature": signature,
        "Authorization": f"Bearer {os.getenv('NPHIES_API_KEY', '')}"
    }
    
    url = f"{NPHIES_BASE_URL}/{endpoint}"
    
    async with httpx.AsyncClient(timeout=NPHIES_TIMEOUT) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            
            # Success
            if response.status_code in [200, 201]:
                return response.json(), response.status_code, None
            
            # Retriable errors (500s, 429)
            if response.status_code >= 500 or response.status_code == 429:
                if retry_count < MAX_RETRIES:
                    wait_time = 2 ** retry_count  # Exponential backoff
                    await asyncio.sleep(wait_time)
                    return await submit_to_nphies_with_retry(endpoint, payload, signature, retry_count + 1)
            
            # Client errors (4xx)
            error_message = f"HTTP {response.status_code}: {response.text}"
            return response.json() if response.text else {}, response.status_code, error_message
            
        except httpx.TimeoutException:
            if retry_count < MAX_RETRIES:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await submit_to_nphies_with_retry(endpoint, payload, signature, retry_count + 1)
            return {}, None, f"Timeout after {MAX_RETRIES} retries"
            
        except Exception as e:
            error_message = f"Connection error: {str(e)}"
            if retry_count < MAX_RETRIES:
                wait_time = 2 ** retry_count
                await asyncio.sleep(wait_time)
                return await submit_to_nphies_with_retry(endpoint, payload, signature, retry_count + 1)
            return {}, None, error_message


@app.get("/")
def root():
    terminology_status = terminology_catalog.summary() if terminology_catalog else {"available": False}
    return {
        "service": "NPHIES Bridge Service",
        "version": "1.0.0",
        "status": "active",
        "nphies_endpoint": NPHIES_BASE_URL,
        "terminology_validation": {
            "enabled": terminology_catalog is not None,
            "strict_mode": STRICT_TERMINOLOGY_VALIDATION,
            "available": terminology_status.get("available", False),
        },
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        terminology_status = terminology_catalog.summary() if terminology_catalog else {"available": False}
        return {
            "status": "healthy",
            "database": "connected",
            "nphies_endpoint": NPHIES_BASE_URL,
            "terminology_validation": {
                "enabled": terminology_catalog is not None,
                "strict_mode": STRICT_TERMINOLOGY_VALIDATION,
                "available": terminology_status.get("available", False),
                "load_error": terminology_status.get("load_error"),
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


@app.get("/ready")
def ready_check():
    """Readiness probe endpoint for Kubernetes"""
    try:
        conn = get_db_connection()
        conn.close()
        terminology_status = terminology_catalog.summary() if terminology_catalog else {"available": False}
        return {
            "status": "ready",
            "database": "connected",
            "nphies_endpoint": NPHIES_BASE_URL,
            "terminology_validation": {
                "enabled": terminology_catalog is not None,
                "strict_mode": STRICT_TERMINOLOGY_VALIDATION,
                "available": terminology_status.get("available", False),
                "load_error": terminology_status.get("load_error"),
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


@app.get("/terminology/summary")
def terminology_summary():
    if terminology_catalog is None:
        return {
            "enabled": False,
            "available": False,
            "load_error": "NPHIES terminology validation is disabled by configuration.",
        }
    return {"enabled": True, **terminology_catalog.summary()}


@app.get("/terminology/codesystems")
def terminology_codesystems(limit: int = 250):
    if terminology_catalog is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NPHIES terminology catalog is disabled.",
        )
    systems = terminology_catalog.list_code_systems()
    bounded_limit = max(1, min(limit, 1000))
    return {"count": len(systems), "items": systems[:bounded_limit]}


@app.get("/terminology/codes")
def terminology_codes(system: str, q: str = "", limit: int = 50):
    if terminology_catalog is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NPHIES terminology catalog is disabled.",
        )
    bounded_limit = max(1, min(limit, 500))
    return {
        "system": system,
        "query": q,
        "items": terminology_catalog.search_codes(system=system, query=q, limit=bounded_limit),
    }


@app.get("/terminology/lookup")
def terminology_lookup(system: str, code: str):
    if terminology_catalog is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NPHIES terminology catalog is disabled.",
        )
    match = terminology_catalog.lookup(system=system, code=code)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Code '{code}' was not found in code system '{system}'.",
        )
    return match


@app.post("/terminology/validate-code")
def terminology_validate_code(request: TerminologyCodeValidationRequest):
    if terminology_catalog is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="NPHIES terminology catalog is disabled.",
        )
    validation = terminology_catalog.validate_code(
        system=request.system,
        code=request.code,
        value_set=request.value_set or "",
    )
    return validation


@app.post("/terminology/validate-payload")
def terminology_validate_payload(request: TerminologyPayloadValidationRequest):
    return validate_terminology(request.fhir_payload)


@app.post("/submit-claim", response_model=SubmissionResponse)
async def submit_claim(submission: ClaimSubmission, background_tasks: BackgroundTasks):
    """
    Submit a signed FHIR Claim to NPHIES
    
    Features:
    - Automatic retry with exponential backoff
    - Transaction logging for audit
    - Error handling and reporting
    """
    
    return await submit_transaction(
        submission=submission,
        allowed_resource_types=ALLOWED_CLAIM_RESOURCE_TYPES,
        success_message="Claim submitted successfully to NPHIES",
        request_type="Claim",
        endpoint="Claim",
    )


@app.post("/submit-preauth")
async def submit_preauth(submission: ClaimSubmission):
    """
    Submit a pre-authorization request to NPHIES
    """
    return await submit_transaction(
        submission=submission,
        allowed_resource_types=ALLOWED_CLAIM_RESOURCE_TYPES,
        success_message="Pre-authorization submitted",
        request_type="PreAuth",
        endpoint="Claim/$submit",
    )


@app.post("/submit-communication", response_model=SubmissionResponse)
async def submit_communication(submission: ClaimSubmission):
    """
    Submit Communication or CommunicationRequest resources for
    re-adjudication/supporting-information exchanges.
    """
    return await submit_transaction(
        submission=submission,
        allowed_resource_types=ALLOWED_COMMUNICATION_RESOURCE_TYPES,
        success_message="Communication submitted to NPHIES",
    )


@app.get("/transaction/{transaction_uuid}")
def get_transaction_status(transaction_uuid: str):
    """
    Retrieve transaction status and details
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                transaction_id,
                transaction_uuid,
                request_type,
                nphies_transaction_id,
                http_status_code,
                status,
                error_message,
                submission_timestamp,
                response_timestamp
            FROM nphies_transactions
            WHERE transaction_uuid = %s
        """, (transaction_uuid,))
        
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction {transaction_uuid} not found"
            )
        
        return dict(result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving transaction: {str(e)}"
        )


@app.get("/facility/{facility_id}/transactions")
def get_facility_transactions(facility_id: int, limit: int = 50):
    """
    Get recent transactions for a facility
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                transaction_uuid,
                request_type,
                status,
                nphies_transaction_id,
                http_status_code,
                submission_timestamp
            FROM nphies_transactions
            WHERE facility_id = %s
            ORDER BY submission_timestamp DESC
            LIMIT %s
        """, (facility_id, limit))
        
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [dict(row) for row in results]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving transactions: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
