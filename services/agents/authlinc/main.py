"""
AuthLinc Agent - Eligibility and Pre-Authorization
Verifies patient insurance eligibility and handles prior authorization requests
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import os
import sys
import uvicorn
from datetime import datetime, timedelta
import httpx
import logging
import hashlib
import json

# Add parent directory to path for shared imports
sys.path.append(os.path.join(os.path.dirname(__file__), "../../.."))
from shared.middleware.brainsait_oid import BrainSAITOIDMiddleware, get_service_oid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AuthLinc Agent",
    description="Eligibility and Pre-Authorization agent",
    version="1.0.0"
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Add BrainSAIT OID middleware
app.add_middleware(
    BrainSAITOIDMiddleware,
    service_name="AuthLinc",
    service_oid=get_service_oid("authlinc")
)

# Service URLs
NPHIES_BRIDGE_URL = os.getenv("NPHIES_BRIDGE_URL", "http://nphies-bridge:8003")
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")

# In-memory cache for eligibility (would use Redis in production)
eligibility_cache = {}


# Pydantic models
class EligibilityRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    insurance_id: str = Field(..., description="Insurance policy ID")
    payer_id: str = Field(..., description="Payer/Insurance company ID")
    service_date: Optional[str] = Field(None, description="Service date (ISO format)")


class PriorAuthRequest(BaseModel):
    patient_id: str = Field(..., description="Patient ID")
    insurance_id: str = Field(..., description="Insurance policy ID")
    payer_id: str = Field(..., description="Payer ID")
    procedure_codes: List[str] = Field(..., description="Procedure codes requiring authorization")
    diagnosis_codes: List[str] = Field(..., description="Diagnosis codes")
    service_date: str = Field(..., description="Proposed service date")
    justification: Optional[str] = Field(None, description="Medical justification")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AuthLinc Agent",
        "version": "1.0.0",
        "capabilities": ["verify_eligibility", "request_prior_auth"],
        "cache_entries": len(eligibility_cache),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/verify_eligibility")
async def verify_eligibility(request: EligibilityRequest):
    """
    Verify patient insurance eligibility in real-time
    
    Checks cache first, then queries NPHIES if needed
    """
    try:
        logger.info(f"Verifying eligibility for patient: {request.patient_id}")
        
        # Generate cache key
        cache_key = hashlib.md5(
            f"{request.patient_id}:{request.insurance_id}:{request.payer_id}".encode()
        ).hexdigest()
        
        # Check cache (valid for 24 hours)
        if cache_key in eligibility_cache:
            cached_entry = eligibility_cache[cache_key]
            cache_age = datetime.utcnow() - cached_entry["cached_at"]
            
            if cache_age < timedelta(hours=24):
                logger.info(f"Eligibility found in cache for patient: {request.patient_id}")
                return {
                    **cached_entry["data"],
                    "cached": True,
                    "cache_age_seconds": int(cache_age.total_seconds())
                }
        
        # Query NPHIES
        logger.info(f"Querying NPHIES for eligibility: {request.patient_id}")
        
        eligibility_data = {
            "patientId": request.patient_id,
            "insuranceId": request.insurance_id,
            "payerId": request.payer_id,
            "serviceDate": request.service_date or datetime.utcnow().isoformat()
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{NPHIES_BRIDGE_URL}/eligibility/check",
                json=eligibility_data
            )
            response.raise_for_status()
            nphies_result = response.json()
        
        # Build eligibility response
        eligibility_response = {
            "patient_id": request.patient_id,
            "insurance_id": request.insurance_id,
            "payer_id": request.payer_id,
            "eligible": nphies_result.get("eligible", False),
            "coverage_status": nphies_result.get("status", "unknown"),
            "coverage_details": {
                "plan_name": nphies_result.get("planName", "N/A"),
                "coverage_start": nphies_result.get("coverageStart"),
                "coverage_end": nphies_result.get("coverageEnd"),
                "copay_amount": nphies_result.get("copayAmount", 0),
                "deductible_remaining": nphies_result.get("deductibleRemaining", 0)
            },
            "benefits": nphies_result.get("benefits", []),
            "exclusions": nphies_result.get("exclusions", []),
            "nphies_reference": nphies_result.get("referenceId"),
            "verified_at": datetime.utcnow().isoformat(),
            "cached": False
        }
        
        # Cache the result
        eligibility_cache[cache_key] = {
            "data": eligibility_response,
            "cached_at": datetime.utcnow()
        }
        
        logger.info(f"Eligibility verified for patient: {request.patient_id} - Eligible: {eligibility_response['eligible']}")
        
        return eligibility_response
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error during eligibility check: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Eligibility check failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Eligibility verification failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Eligibility verification failed: {str(e)}"
        )


@app.post("/request_prior_auth")
async def request_prior_auth(request: PriorAuthRequest):
    """
    Submit prior authorization request
    """
    try:
        logger.info(f"Requesting prior authorization for patient: {request.patient_id}")
        
        # Build prior auth request
        prior_auth_data = {
            "patientId": request.patient_id,
            "insuranceId": request.insurance_id,
            "payerId": request.payer_id,
            "procedureCodes": request.procedure_codes,
            "diagnosisCodes": request.diagnosis_codes,
            "serviceDate": request.service_date,
            "justification": request.justification or "Medical necessity",
            "requestDate": datetime.utcnow().isoformat()
        }
        
        # Submit to NPHIES
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{NPHIES_BRIDGE_URL}/prior-auth/request",
                json=prior_auth_data
            )
            response.raise_for_status()
            nphies_result = response.json()
        
        # Build response
        auth_response = {
            "auth_id": nphies_result.get("authorizationId", f"AUTH-{datetime.utcnow().timestamp()}"),
            "patient_id": request.patient_id,
            "status": nphies_result.get("status", "pending"),
            "approval_status": nphies_result.get("approvalStatus", "under_review"),
            "procedures": request.procedure_codes,
            "diagnoses": request.diagnosis_codes,
            "service_date": request.service_date,
            "valid_from": nphies_result.get("validFrom"),
            "valid_until": nphies_result.get("validUntil"),
            "approved_amount": nphies_result.get("approvedAmount"),
            "nphies_reference": nphies_result.get("referenceId"),
            "requested_at": datetime.utcnow().isoformat(),
            "notes": nphies_result.get("notes", [])
        }
        
        logger.info(f"Prior authorization requested: {auth_response['auth_id']} - Status: {auth_response['status']}")
        
        return auth_response
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error during prior auth request: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Prior authorization request failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Prior authorization request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Prior authorization request failed: {str(e)}"
        )


@app.get("/check_auth_status/{auth_id}")
async def check_auth_status(auth_id: str):
    """
    Check prior authorization status
    """
    try:
        logger.info(f"Checking prior authorization status: {auth_id}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{NPHIES_BRIDGE_URL}/prior-auth/status/{auth_id}"
            )
            response.raise_for_status()
            status_data = response.json()
        
        return {
            "auth_id": auth_id,
            "status": status_data.get("status", "unknown"),
            "approval_status": status_data.get("approvalStatus", "unknown"),
            "checked_at": datetime.utcnow().isoformat(),
            "details": status_data
        }
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error checking auth status: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Failed to check authorization status: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Authorization status check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Authorization status check failed: {str(e)}"
        )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "4002"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )
