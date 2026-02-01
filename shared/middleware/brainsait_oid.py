"""
BrainSAIT OID Middleware
Adds BrainSAIT-compliant OID headers to all responses

BrainSAIT PEN (Private Enterprise Number): 61026
OID Root: 1.3.6.1.4.1.61026
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import os
from typing import Optional


class BrainSAITOIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds BrainSAIT OID headers to all responses
    
    Headers added:
    - X-BrainSAIT-OID: Service-specific OID
    - X-BrainSAIT-Service: Service name
    - X-BrainSAIT-PEN: Private Enterprise Number (61026)
    """
    
    def __init__(self, app, service_name: str, service_oid: str):
        super().__init__(app)
        self.service_name = service_name
        self.service_oid = service_oid
        self.pen = os.getenv("BRAINSAIT_PEN", "61026")
        self.oid_root = os.getenv("BRAINSAIT_OID_ROOT", "1.3.6.1.4.1.61026")
        
    async def dispatch(self, request: Request, call_next):
        """Add BrainSAIT OID headers to response"""
        response = await call_next(request)
        
        # Add BrainSAIT OID headers
        response.headers["X-BrainSAIT-OID"] = self.service_oid
        response.headers["X-BrainSAIT-Service"] = self.service_name
        response.headers["X-BrainSAIT-PEN"] = self.pen
        
        return response


# Service-specific OIDs for BrainSAIT Linc agents
BRAINSAIT_SERVICE_OIDS = {
    "masterlinc": "1.3.6.1.4.1.61026.3.3.0",      # MasterLinc Coordinator
    "claimlinc": "1.3.6.1.4.1.61026.3.3.1",       # ClaimLinc Agent
    "authlinc": "1.3.6.1.4.1.61026.3.3.2",        # AuthLinc Agent
    "compliancelinc": "1.3.6.1.4.1.61026.3.3.3",  # ComplianceLinc Agent
    "clinicallinc": "1.3.6.1.4.1.61026.3.3.4",    # ClinicalLinc Agent
    "normalizer": "1.3.6.1.4.1.61026.3.1.1",      # Normalizer Service
    "financial": "1.3.6.1.4.1.61026.3.1.2",       # Financial Rules Engine
    "signer": "1.3.6.1.4.1.61026.3.1.3",          # Signer Service
    "nphies": "1.3.6.1.4.1.61026.3.1.4",          # NPHIES Bridge
    "ai-prediction": "1.3.6.1.4.1.61026.3.1.5",   # AI Prediction Service
}


def get_service_oid(service_name: str) -> str:
    """Get OID for a given service name"""
    return BRAINSAIT_SERVICE_OIDS.get(service_name.lower(), "1.3.6.1.4.1.61026.3.9.0")
