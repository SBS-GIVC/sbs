"""
Standardized Error Response Module
Provides consistent error formatting across all SBS microservices
"""

from typing import Dict, Any, Optional
from datetime import datetime
import uuid
from fastapi import HTTPException, status


def create_standard_error(
    error: str,
    error_code: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
    request_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create standardized error response
    
    Args:
        error: Human-readable error message
        error_code: Machine-readable error code (e.g., "NORMALIZER_FACILITY_NOT_FOUND")
        status_code: HTTP status code
        details: Additional error details (optional)
        request_path: Request path that caused the error (optional)
        
    Returns:
        Dictionary with standardized error structure:
        {
            "error": "Human-readable message",
            "error_code": "SERVICE_ERROR_TYPE",
            "error_id": "uuid-for-tracking",
            "timestamp": "2026-02-12T20:00:00Z",
            "status": 404,
            "path": "/api/endpoint",
            "details": {...}
        }
    
    Example:
        >>> create_standard_error(
        ...     error="Facility not found",
        ...     error_code="NORMALIZER_FACILITY_NOT_FOUND",
        ...     status_code=404,
        ...     request_path="/normalize"
        ... )
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


def raise_standard_http_exception(
    error: str,
    error_code: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
    request_path: Optional[str] = None
) -> None:
    """
    Raise HTTPException with standardized error format
    
    Args:
        error: Human-readable error message
        error_code: Machine-readable error code
        status_code: HTTP status code
        details: Additional error details (optional)
        request_path: Request path (optional)
        
    Raises:
        HTTPException with standardized detail structure
        
    Example:
        >>> raise_standard_http_exception(
        ...     error="Invalid facility ID",
        ...     error_code="NORMALIZER_INVALID_FACILITY",
        ...     status_code=400
        ... )
    """
    error_detail = create_standard_error(
        error=error,
        error_code=error_code,
        status_code=status_code,
        details=details,
        request_path=request_path
    )
    raise HTTPException(status_code=status_code, detail=error_detail)


# Common error code constants
class ErrorCodes:
    """Standard error codes used across services"""
    
    # Normalizer Service (8000)
    NORMALIZER_FACILITY_NOT_FOUND = "NORMALIZER_FACILITY_NOT_FOUND"
    NORMALIZER_CODE_NOT_FOUND = "NORMALIZER_CODE_NOT_FOUND"
    NORMALIZER_INVALID_INPUT = "NORMALIZER_INVALID_INPUT"
    NORMALIZER_DATABASE_ERROR = "NORMALIZER_DATABASE_ERROR"
    NORMALIZER_AI_ERROR = "NORMALIZER_AI_ERROR"
    NORMALIZER_PROCESSING_ERROR = "NORMALIZER_PROCESSING_ERROR"
    
    # Signer Service (8001)
    SIGNER_CERTIFICATE_NOT_FOUND = "SIGNER_CERTIFICATE_NOT_FOUND"
    SIGNER_CERTIFICATE_EXPIRED = "SIGNER_CERTIFICATE_EXPIRED"
    SIGNER_PRIVATE_KEY_NOT_FOUND = "SIGNER_PRIVATE_KEY_NOT_FOUND"
    SIGNER_PRIVATE_KEY_LOAD_ERROR = "SIGNER_PRIVATE_KEY_LOAD_ERROR"
    SIGNER_INVALID_PAYLOAD = "SIGNER_INVALID_PAYLOAD"
    SIGNER_SIGNING_FAILED = "SIGNER_SIGNING_FAILED"
    SIGNER_VERIFICATION_FAILED = "SIGNER_VERIFICATION_FAILED"
    SIGNER_CERT_GEN_ERROR = "SIGNER_CERT_GEN_ERROR"
    
    # Financial Rules Engine (8002)
    FINANCIAL_FACILITY_NOT_FOUND = "FINANCIAL_FACILITY_NOT_FOUND"
    FINANCIAL_INVALID_CLAIM = "FINANCIAL_INVALID_CLAIM"
    FINANCIAL_PRICING_ERROR = "FINANCIAL_PRICING_ERROR"
    FINANCIAL_BUNDLE_ERROR = "FINANCIAL_BUNDLE_ERROR"
    FINANCIAL_DATABASE_ERROR = "FINANCIAL_DATABASE_ERROR"
    FINANCIAL_VALIDATION_ERROR = "FINANCIAL_VALIDATION_ERROR"
    
    # NPHIES Bridge (8003)
    NPHIES_SUBMISSION_FAILED = "NPHIES_SUBMISSION_FAILED"
    NPHIES_INVALID_RESOURCE = "NPHIES_INVALID_RESOURCE"
    NPHIES_AUTH_FAILED = "NPHIES_AUTH_FAILED"
    NPHIES_TRANSACTION_NOT_FOUND = "NPHIES_TRANSACTION_NOT_FOUND"
    NPHIES_TIMEOUT = "NPHIES_TIMEOUT"
    NPHIES_NETWORK_ERROR = "NPHIES_NETWORK_ERROR"
    NPHIES_TERMINOLOGY_ERROR = "NPHIES_TERMINOLOGY_ERROR"
    
    # Common Errors
    DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR"
    DATABASE_QUERY_ERROR = "DATABASE_QUERY_ERROR"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    INVALID_REQUEST = "INVALID_REQUEST"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


# Convenience functions for common errors
def not_found_error(resource: str, identifier: Any, service: str = "SBS") -> Dict[str, Any]:
    """Create standardized 404 error"""
    return create_standard_error(
        error=f"{resource} not found",
        error_code=f"{service.upper()}_{resource.upper()}_NOT_FOUND",
        status_code=status.HTTP_404_NOT_FOUND,
        details={"resource": resource, "identifier": str(identifier)}
    )


def validation_error(field: str, message: str, service: str = "SBS") -> Dict[str, Any]:
    """Create standardized validation error"""
    return create_standard_error(
        error=f"Validation failed: {message}",
        error_code=f"{service.upper()}_VALIDATION_ERROR",
        status_code=status.HTTP_400_BAD_REQUEST,
        details={"field": field, "validation_message": message}
    )


def database_error(operation: str, service: str = "SBS") -> Dict[str, Any]:
    """Create standardized database error"""
    return create_standard_error(
        error=f"Database {operation} failed",
        error_code=f"{service.upper()}_DATABASE_ERROR",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        details={"operation": operation}
    )


def rate_limit_error(retry_after: int = 60) -> Dict[str, Any]:
    """Create standardized rate limit error"""
    return create_standard_error(
        error="Rate limit exceeded",
        error_code="RATE_LIMIT_EXCEEDED",
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        details={"retry_after_seconds": retry_after}
    )


def unauthorized_error(message: str = "Unauthorized access") -> Dict[str, Any]:
    """Create standardized unauthorized error"""
    return create_standard_error(
        error=message,
        error_code="UNAUTHORIZED",
        status_code=status.HTTP_401_UNAUTHORIZED
    )
