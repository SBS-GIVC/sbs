"""
Shared Error Handling Module
Provides common error handlers with credential sanitization
"""

import re
from typing import Any, Dict, Optional
from fastapi import Request
from fastapi.responses import JSONResponse


# Patterns for sensitive data that should be sanitized
SENSITIVE_PATTERNS = [
    (re.compile(r'("password"\s*:\s*")[^"]*(")', re.IGNORECASE), r'\1***REDACTED***\2'),
    (re.compile(r'("token"\s*:\s*")[^"]*(")', re.IGNORECASE), r'\1***REDACTED***\2'),
    (re.compile(r'("api[_-]?key"\s*:\s*")[^"]*(")', re.IGNORECASE), r'\1***REDACTED***\2'),
    (re.compile(r'("secret"\s*:\s*")[^"]*(")', re.IGNORECASE), r'\1***REDACTED***\2'),
    (re.compile(r'("authorization"\s*:\s*")[^"]*(")', re.IGNORECASE), r'\1***REDACTED***\2'),
    (re.compile(r'("Bearer\s+)[^"]*', re.IGNORECASE), r'\1***REDACTED***'),
    (re.compile(r'password=\S+', re.IGNORECASE), 'password=***REDACTED***'),
]


def sanitize_credentials(data: Any) -> Any:
    """
    Sanitize sensitive data from strings, dicts, or other objects.
    
    Args:
        data: Data to sanitize
        
    Returns:
        Sanitized data with credentials removed
    """
    if isinstance(data, str):
        # Apply all sanitization patterns
        for pattern, replacement in SENSITIVE_PATTERNS:
            data = pattern.sub(replacement, data)
        return data
    elif isinstance(data, dict):
        # Recursively sanitize dictionary values
        return {k: sanitize_credentials(v) for k, v in data.items()}
    elif isinstance(data, (list, tuple)):
        # Recursively sanitize list/tuple items
        return [sanitize_credentials(item) for item in data]
    else:
        # Return other types as-is
        return data


def create_error_response(
    status_code: int,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """
    Create standardized error response with sanitized content.
    
    Args:
        status_code: HTTP status code
        message: Error message
        details: Optional error details
        request_id: Optional request ID for tracking
        
    Returns:
        JSON response with error information
    """
    error_content = {
        "error": message,
        "status_code": status_code
    }
    
    if details:
        error_content["details"] = sanitize_credentials(details)
    
    if request_id:
        error_content["request_id"] = request_id
    
    return JSONResponse(
        status_code=status_code,
        content=error_content
    )


async def validation_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle validation exceptions with sanitized output.
    
    Args:
        request: FastAPI request
        exc: Exception instance
        
    Returns:
        JSON response with sanitized error details
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    # Get exception details
    if hasattr(exc, "errors"):
        details = {"validation_errors": exc.errors()}
    else:
        details = {"error": str(exc)}
    
    return create_error_response(
        status_code=422,
        message="Validation error",
        details=details,
        request_id=request_id
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle general exceptions with sanitized output.
    
    Args:
        request: FastAPI request
        exc: Exception instance
        
    Returns:
        JSON response with sanitized error details
    """
    request_id = request.headers.get("X-Request-ID", "unknown")
    
    # Sanitize exception message
    error_message = sanitize_credentials(str(exc))
    
    return create_error_response(
        status_code=500,
        message="Internal server error",
        details={"error": error_message},
        request_id=request_id
    )


def format_database_error(error: Exception) -> str:
    """
    Format database error with sanitized connection strings.
    
    Args:
        error: Database exception
        
    Returns:
        Sanitized error message
    """
    error_str = str(error)
    # Remove connection strings and credentials
    error_str = re.sub(r'postgresql://[^@]+@', 'postgresql://***:***@', error_str)
    error_str = re.sub(r'host=\S+', 'host=***', error_str)
    error_str = re.sub(r'password=\S+', 'password=***', error_str)
    return error_str
