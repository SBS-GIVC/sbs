"""
Input validation utilities for SBS microservices
Provides common validation patterns and sanitization functions
"""
from pydantic import BaseModel, Field, validator, constr
from typing import Optional, Dict, Any, List
import re
from datetime import datetime


# Common validation patterns
FACILITY_ID_PATTERN = re.compile(r'^[A-Z0-9]{3,20}$')
SBS_CODE_PATTERN = re.compile(r'^\d{5,10}$')
PHONE_PATTERN = re.compile(r'^\+?[0-9]{8,15}$')
EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


class FacilityIDValidator:
    """Validate facility IDs"""
    
    @staticmethod
    def validate(value: str) -> str:
        """Validate facility ID format"""
        if not value:
            raise ValueError("Facility ID is required")
        
        value = value.strip().upper()
        
        if not FACILITY_ID_PATTERN.match(value):
            raise ValueError(
                "Invalid facility ID format. Must be 3-20 alphanumeric characters"
            )
        
        return value


class SBSCodeValidator:
    """Validate SBS codes"""
    
    @staticmethod
    def validate(value: str) -> str:
        """Validate SBS code format"""
        if not value:
            raise ValueError("SBS code is required")
        
        value = value.strip()
        
        if not SBS_CODE_PATTERN.match(value):
            raise ValueError(
                "Invalid SBS code format. Must be 5-10 digits"
            )
        
        return value


class PayloadValidator:
    """Validate JSON payloads"""
    
    @staticmethod
    def validate_depth(data: Any, max_depth: int = 10, current_depth: int = 0) -> None:
        """
        Validate JSON payload depth to prevent DoS attacks
        
        Args:
            data: Data to validate
            max_depth: Maximum allowed nesting depth
            current_depth: Current depth (for recursion)
            
        Raises:
            ValueError: If depth exceeds max_depth
        """
        if current_depth > max_depth:
            raise ValueError(
                f"Payload nesting depth exceeds maximum of {max_depth}"
            )
        
        if isinstance(data, dict):
            for value in data.values():
                PayloadValidator.validate_depth(value, max_depth, current_depth + 1)
        elif isinstance(data, list):
            for item in data:
                PayloadValidator.validate_depth(item, max_depth, current_depth + 1)
    
    @staticmethod
    def validate_size(data: Dict[str, Any], max_size_mb: float = 10) -> None:
        """
        Validate payload size
        
        Args:
            data: Data to validate
            max_size_mb: Maximum size in megabytes
            
        Raises:
            ValueError: If size exceeds max_size_mb
        """
        import json
        import sys
        
        # Estimate size
        size_bytes = sys.getsizeof(json.dumps(data))
        size_mb = size_bytes / (1024 * 1024)
        
        if size_mb > max_size_mb:
            raise ValueError(
                f"Payload size ({size_mb:.2f}MB) exceeds maximum of {max_size_mb}MB"
            )


class PaginationParams(BaseModel):
    """Standard pagination parameters"""
    
    page: int = Field(default=1, ge=1, le=1000, description="Page number")
    page_size: int = Field(default=50, ge=1, le=100, description="Items per page")
    
    @property
    def offset(self) -> int:
        """Calculate offset for database queries"""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """Get limit for database queries"""
        return self.page_size


class NormalizeRequest(BaseModel):
    """Request model for normalization endpoint"""
    
    facility_id: constr(min_length=3, max_length=20, strip_whitespace=True)
    internal_code: constr(min_length=1, max_length=50, strip_whitespace=True)
    code_type: constr(min_length=1, max_length=20, strip_whitespace=True)
    description: Optional[str] = Field(None, max_length=500)
    
    @validator('facility_id')
    def validate_facility_id(cls, v):
        return FacilityIDValidator.validate(v)
    
    @validator('code_type')
    def validate_code_type(cls, v):
        allowed_types = ['procedure', 'diagnosis', 'medication', 'service']
        v = v.lower()
        if v not in allowed_types:
            raise ValueError(f"Invalid code_type. Must be one of: {', '.join(allowed_types)}")
        return v


class ClaimValidationRequest(BaseModel):
    """Request model for claim validation endpoint"""
    
    facility_id: constr(min_length=3, max_length=20, strip_whitespace=True)
    claim_data: Dict[str, Any]
    
    @validator('facility_id')
    def validate_facility_id(cls, v):
        return FacilityIDValidator.validate(v)
    
    @validator('claim_data')
    def validate_claim_data(cls, v):
        # Validate payload depth and size
        PayloadValidator.validate_depth(v, max_depth=10)
        PayloadValidator.validate_size(v, max_size_mb=5)
        
        # Validate required fields
        required_fields = ['patient_id', 'services']
        for field in required_fields:
            if field not in v:
                raise ValueError(f"Required field '{field}' missing from claim_data")
        
        return v


class SignRequest(BaseModel):
    """Request model for signing endpoint"""
    
    payload: Dict[str, Any]
    certificate_id: Optional[str] = Field(None, max_length=100)
    
    @validator('payload')
    def validate_payload(cls, v):
        # Validate payload depth and size
        PayloadValidator.validate_depth(v, max_depth=15)
        PayloadValidator.validate_size(v, max_size_mb=10)
        return v


class ClaimSubmission(BaseModel):
    """Request model for NPHIES claim submission"""
    
    facility_id: constr(min_length=3, max_length=20, strip_whitespace=True)
    claim_id: constr(min_length=1, max_length=100, strip_whitespace=True)
    fhir_payload: Dict[str, Any]
    signature: Optional[str] = None
    
    @validator('facility_id')
    def validate_facility_id(cls, v):
        return FacilityIDValidator.validate(v)
    
    @validator('fhir_payload')
    def validate_fhir_payload(cls, v):
        # Validate payload
        PayloadValidator.validate_depth(v, max_depth=20)
        PayloadValidator.validate_size(v, max_size_mb=20)
        
        # Validate FHIR structure basics
        if 'resourceType' not in v:
            raise ValueError("FHIR payload must have 'resourceType' field")
        
        if v['resourceType'] not in ['Claim', 'Bundle']:
            raise ValueError("FHIR resourceType must be 'Claim' or 'Bundle'")
        
        return v


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """
    Sanitize string input to prevent injection attacks
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not value:
        return ""
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Limit length
    value = value[:max_length]
    
    # Strip whitespace
    value = value.strip()
    
    return value


def sanitize_dict_keys(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively sanitize dictionary keys
    
    Args:
        data: Dictionary to sanitize
        
    Returns:
        Sanitized dictionary
    """
    if not isinstance(data, dict):
        return data
    
    sanitized = {}
    for key, value in data.items():
        # Sanitize key
        safe_key = sanitize_string(str(key), max_length=100)
        
        # Recursively sanitize nested dicts
        if isinstance(value, dict):
            sanitized[safe_key] = sanitize_dict_keys(value)
        elif isinstance(value, list):
            sanitized[safe_key] = [
                sanitize_dict_keys(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            sanitized[safe_key] = value
    
    return sanitized
