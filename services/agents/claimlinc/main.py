"""
ClaimLinc Agent - Revenue Cycle Management
Orchestrates full claim processing pipeline
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import os
import sys
import uvicorn
from datetime import datetime
import httpx
import logging

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
    title="ClaimLinc Agent",
    description="Revenue Cycle Management agent for claim processing",
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
    service_name="ClaimLinc",
    service_oid=get_service_oid("claimlinc")
)

# Service URLs
NORMALIZER_URL = os.getenv("NORMALIZER_URL", "http://normalizer-service:8000")
FINANCIAL_RULES_URL = os.getenv("FINANCIAL_RULES_URL", "http://financial-rules-engine:8002")
SIGNER_URL = os.getenv("SIGNER_URL", "http://signer-service:8001")
NPHIES_BRIDGE_URL = os.getenv("NPHIES_BRIDGE_URL", "http://nphies-bridge:8003")


# Pydantic models
class ClaimRequest(BaseModel):
    claim_data: Dict[str, Any] = Field(..., description="Claim data")
    requester: Optional[str] = Field(None, description="Requester ID")


class TrackStatusRequest(BaseModel):
    claim_id: str = Field(..., description="Claim ID to track")
    nphies_reference: Optional[str] = Field(None, description="NPHIES reference ID")


class DenialRequest(BaseModel):
    claim_id: str = Field(..., description="Denied claim ID")
    denial_reason: str = Field(..., description="Denial reason")
    claim_data: Dict[str, Any] = Field(..., description="Original claim data")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ClaimLinc Agent",
        "version": "1.0.0",
        "capabilities": ["process_claim", "track_status", "handle_denial"],
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/process_claim")
async def process_claim(request: ClaimRequest):
    """
    Process a claim through the full pipeline
    
    Flow: Normalization → Financial Rules → Signing → NPHIES Submission
    """
    try:
        logger.info(f"Processing claim from {request.requester}")
        
        results = {
            "claim_id": request.claim_data.get("claimId", "unknown"),
            "status": "processing",
            "stages": {},
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Stage 1: Normalization
        logger.info("Stage 1: Normalization")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{NORMALIZER_URL}/normalize",
                json=request.claim_data
            )
            response.raise_for_status()
            normalized_data = response.json()
            results["stages"]["normalization"] = {
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Stage 2: Financial Rules
        logger.info("Stage 2: Financial Rules")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{FINANCIAL_RULES_URL}/apply-rules",
                json=normalized_data
            )
            response.raise_for_status()
            financial_data = response.json()
            results["stages"]["financial_rules"] = {
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Stage 3: Signing
        logger.info("Stage 3: Signing")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SIGNER_URL}/sign",
                json=financial_data
            )
            response.raise_for_status()
            signed_data = response.json()
            results["stages"]["signing"] = {
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        # Stage 4: NPHIES Submission
        logger.info("Stage 4: NPHIES Submission")
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{NPHIES_BRIDGE_URL}/submit",
                json=signed_data
            )
            response.raise_for_status()
            submission_result = response.json()
            results["stages"]["nphies_submission"] = {
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat(),
                "nphies_reference": submission_result.get("reference_id")
            }
        
        results["status"] = "completed"
        results["nphies_result"] = submission_result
        
        logger.info(f"Claim processing completed: {results['claim_id']}")
        
        return results
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error during claim processing: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Pipeline failed at stage: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Claim processing failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Claim processing failed: {str(e)}"
        )


@app.post("/track_status")
async def track_status(request: TrackStatusRequest):
    """
    Track claim status through NPHIES
    """
    try:
        logger.info(f"Tracking claim status: {request.claim_id}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{NPHIES_BRIDGE_URL}/claim-status/{request.claim_id}"
            )
            response.raise_for_status()
            status_data = response.json()
        
        return {
            "claim_id": request.claim_id,
            "status": status_data.get("status", "unknown"),
            "nphies_status": status_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error tracking claim: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Failed to track claim: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Claim tracking failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Claim tracking failed: {str(e)}"
        )


@app.post("/handle_denial")
async def handle_denial(request: DenialRequest):
    """
    Handle denied claims and prepare for resubmission
    """
    try:
        logger.info(f"Handling denial for claim: {request.claim_id}")
        
        # Analyze denial reason
        denial_analysis = {
            "claim_id": request.claim_id,
            "denial_reason": request.denial_reason,
            "recommended_actions": [],
            "can_resubmit": False
        }
        
        # Common denial reasons and actions
        if "documentation" in request.denial_reason.lower():
            denial_analysis["recommended_actions"].append("Attach missing documentation")
            denial_analysis["can_resubmit"] = True
        elif "code" in request.denial_reason.lower() or "coding" in request.denial_reason.lower():
            denial_analysis["recommended_actions"].append("Review and correct medical codes")
            denial_analysis["can_resubmit"] = True
        elif "eligibility" in request.denial_reason.lower():
            denial_analysis["recommended_actions"].append("Verify patient eligibility")
            denial_analysis["can_resubmit"] = False
        elif "duplicate" in request.denial_reason.lower():
            denial_analysis["recommended_actions"].append("Check for duplicate submission")
            denial_analysis["can_resubmit"] = False
        else:
            denial_analysis["recommended_actions"].append("Manual review required")
            denial_analysis["can_resubmit"] = False
        
        denial_analysis["timestamp"] = datetime.utcnow().isoformat()
        
        logger.info(f"Denial analysis completed for claim: {request.claim_id}")
        
        return denial_analysis
        
    except Exception as e:
        logger.error(f"Denial handling failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Denial handling failed: {str(e)}"
        )


if __name__ == "__main__":
    port = int(os.getenv("PORT", "4001"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )
