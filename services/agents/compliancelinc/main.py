"""
ComplianceLinc Agent - Audit and Compliance
Validates claims against NPHIES requirements and PDPL compliance
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
import re

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
    title="ComplianceLinc Agent",
    description="Audit and Compliance agent for NPHIES and PDPL validation",
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
    service_name="ComplianceLinc",
    service_oid=get_service_oid("compliancelinc")
)

# Pydantic models
class AuditRequest(BaseModel):
    claim_data: Dict[str, Any] = Field(..., description="Claim data to audit")
    audit_level: Optional[str] = Field("full", description="Audit level: full, basic, or quick")


class ValidationRequest(BaseModel):
    claim_data: Dict[str, Any] = Field(..., description="Claim data to validate")


class PDPLCheckRequest(BaseModel):
    claim_data: Dict[str, Any] = Field(..., description="Claim data to check for PDPL compliance")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ComplianceLinc Agent",
        "version": "1.0.0",
        "capabilities": ["audit_claim", "validate_nphies", "check_pdpl"],
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/audit_claim")
async def audit_claim(request: AuditRequest):
    """
    Perform full compliance audit on a claim
    
    Checks:
    - NPHIES format compliance
    - PDPL compliance
    - Business rules validation
    - Data quality checks
    """
    try:
        logger.info(f"Auditing claim: {request.claim_data.get('claimId', 'unknown')}")
        
        audit_results = {
            "claim_id": request.claim_data.get("claimId", "unknown"),
            "audit_level": request.audit_level,
            "audit_timestamp": datetime.utcnow().isoformat(),
            "overall_status": "passed",
            "issues": [],
            "warnings": [],
            "checks": {}
        }
        
        # 1. NPHIES Format Validation
        nphies_check = await _validate_nphies_format(request.claim_data)
        audit_results["checks"]["nphies_format"] = nphies_check
        if not nphies_check["passed"]:
            audit_results["overall_status"] = "failed"
            audit_results["issues"].extend(nphies_check.get("issues", []))
        audit_results["warnings"].extend(nphies_check.get("warnings", []))
        
        # 2. PDPL Compliance Check
        pdpl_check = await _check_pdpl_compliance(request.claim_data)
        audit_results["checks"]["pdpl_compliance"] = pdpl_check
        if not pdpl_check["passed"]:
            audit_results["overall_status"] = "failed"
            audit_results["issues"].extend(pdpl_check.get("issues", []))
        audit_results["warnings"].extend(pdpl_check.get("warnings", []))
        
        # 3. Business Rules Validation (if full audit)
        if request.audit_level == "full":
            business_rules_check = await _validate_business_rules(request.claim_data)
            audit_results["checks"]["business_rules"] = business_rules_check
            if not business_rules_check["passed"]:
                audit_results["warnings"].extend(business_rules_check.get("warnings", []))
        
        # 4. Data Quality Checks
        data_quality_check = await _check_data_quality(request.claim_data)
        audit_results["checks"]["data_quality"] = data_quality_check
        if not data_quality_check["passed"]:
            audit_results["warnings"].extend(data_quality_check.get("warnings", []))
        
        # Summary
        audit_results["summary"] = {
            "total_checks": len(audit_results["checks"]),
            "passed_checks": sum(1 for c in audit_results["checks"].values() if c["passed"]),
            "total_issues": len(audit_results["issues"]),
            "total_warnings": len(audit_results["warnings"])
        }
        
        logger.info(f"Audit completed for claim: {audit_results['claim_id']} - Status: {audit_results['overall_status']}")
        
        return audit_results
        
    except Exception as e:
        logger.error(f"Audit failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Audit failed: {str(e)}"
        )


@app.post("/validate_nphies")
async def validate_nphies(request: ValidationRequest):
    """
    Validate claim against NPHIES requirements
    """
    try:
        logger.info(f"Validating NPHIES compliance for claim: {request.claim_data.get('claimId', 'unknown')}")
        
        validation_result = await _validate_nphies_format(request.claim_data)
        
        return {
            "claim_id": request.claim_data.get("claimId", "unknown"),
            "validation_timestamp": datetime.utcnow().isoformat(),
            **validation_result
        }
        
    except Exception as e:
        logger.error(f"NPHIES validation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"NPHIES validation failed: {str(e)}"
        )


@app.post("/check_pdpl")
async def check_pdpl(request: PDPLCheckRequest):
    """
    Check PDPL (Personal Data Protection Law) compliance
    """
    try:
        logger.info(f"Checking PDPL compliance for claim: {request.claim_data.get('claimId', 'unknown')}")
        
        pdpl_result = await _check_pdpl_compliance(request.claim_data)
        
        return {
            "claim_id": request.claim_data.get("claimId", "unknown"),
            "check_timestamp": datetime.utcnow().isoformat(),
            **pdpl_result
        }
        
    except Exception as e:
        logger.error(f"PDPL check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"PDPL check failed: {str(e)}"
        )


# Helper functions
async def _validate_nphies_format(claim_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate NPHIES format requirements"""
    result = {
        "passed": True,
        "issues": [],
        "warnings": []
    }
    
    # Check required fields
    required_fields = ["claimId", "patientId", "providerId", "payerId", "items"]
    for field in required_fields:
        if field not in claim_data:
            result["passed"] = False
            result["issues"].append(f"Missing required field: {field}")
    
    # Validate claim ID format
    if "claimId" in claim_data:
        if not re.match(r'^[A-Z0-9-]{5,50}$', str(claim_data["claimId"])):
            result["passed"] = False
            result["issues"].append("Invalid claim ID format")
    
    # Validate items structure
    if "items" in claim_data:
        if not isinstance(claim_data["items"], list) or len(claim_data["items"]) == 0:
            result["passed"] = False
            result["issues"].append("Claim must have at least one item")
        else:
            for idx, item in enumerate(claim_data["items"]):
                if "code" not in item:
                    result["warnings"].append(f"Item {idx} missing procedure code")
                if "quantity" not in item:
                    result["warnings"].append(f"Item {idx} missing quantity")
    
    return result


async def _check_pdpl_compliance(claim_data: Dict[str, Any]) -> Dict[str, Any]:
    """Check PDPL compliance"""
    result = {
        "passed": True,
        "issues": [],
        "warnings": []
    }
    
    # Check for sensitive data encryption markers
    sensitive_fields = ["patientName", "nationalId", "contactInfo", "medicalHistory"]
    
    for field in sensitive_fields:
        if field in claim_data:
            value = str(claim_data[field])
            # In production, check for proper encryption/hashing
            if len(value) > 100:
                result["warnings"].append(f"Sensitive field '{field}' may contain unencrypted data")
    
    # Check for consent markers
    if "patientConsent" not in claim_data:
        result["warnings"].append("Patient consent marker not found")
    
    # Check for audit trail
    if "auditLog" not in claim_data and "createdBy" not in claim_data:
        result["warnings"].append("Audit trail information missing")
    
    return result


async def _validate_business_rules(claim_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate business rules"""
    result = {
        "passed": True,
        "warnings": []
    }
    
    # Check for duplicate items
    if "items" in claim_data:
        codes = [item.get("code") for item in claim_data["items"] if "code" in item]
        if len(codes) != len(set(codes)):
            result["warnings"].append("Duplicate procedure codes detected")
    
    # Check claim amount reasonableness
    if "totalAmount" in claim_data:
        total = float(claim_data["totalAmount"])
        if total <= 0:
            result["warnings"].append("Total amount must be greater than zero")
        elif total > 1000000:  # 1 million SAR
            result["warnings"].append("Unusually high claim amount - may require additional review")
    
    return result


async def _check_data_quality(claim_data: Dict[str, Any]) -> Dict[str, Any]:
    """Check data quality"""
    result = {
        "passed": True,
        "warnings": []
    }
    
    # Check for empty strings
    for key, value in claim_data.items():
        if isinstance(value, str) and value.strip() == "":
            result["warnings"].append(f"Empty value for field: {key}")
    
    # Check date formats
    date_fields = ["serviceDate", "admissionDate", "dischargeDate"]
    for field in date_fields:
        if field in claim_data:
            try:
                datetime.fromisoformat(str(claim_data[field]).replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                result["warnings"].append(f"Invalid date format in field: {field}")
    
    return result


if __name__ == "__main__":
    port = int(os.getenv("PORT", "4003"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=True
    )
