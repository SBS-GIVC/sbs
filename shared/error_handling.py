"""
Standardized error handling middleware for FastAPI services
Provides consistent error responses and prevents sensitive data leakage
"""
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import logging
from typing import Union, Dict, Any
import traceback
import os

logger = logging.getLogger(__name__)


class SanitizedException(Exception):
    """Base exception with automatic credential sanitization"""
    
    def __init__(self, message: str, status_code: int = 500, details: Dict[str, Any] = None):
        self.message = self._sanitize_message(message)
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    @staticmethod
    def _sanitize_message(message: str) -> str:
        """Remove sensitive information from error messages"""
        sensitive_patterns = [
            "password=",
            "token=",
            "api_key=",
            "secret=",
            "authorization:",
            "bearer ",
            "private_key"
        ]
        
        sanitized = message.lower()
        for pattern in sensitive_patterns:
            if pattern in sanitized:
                return "An error occurred. Details have been logged for security reasons."
        
        return message


class DatabaseError(SanitizedException):
    """Database operation error"""
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, status_code=500, details=details)


class ValidationError(SanitizedException):
    """Input validation error"""
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, status_code=400, details=details)


class AuthenticationError(SanitizedException):
    """Authentication error"""
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(SanitizedException):
    """Authorization error"""
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, status_code=403)


class RateLimitError(SanitizedException):
    """Rate limit exceeded error"""
    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(message, status_code=429)


class ExternalServiceError(SanitizedException):
    """External service error"""
    def __init__(self, service: str, message: str = None):
        msg = message or f"External service {service} is currently unavailable"
        super().__init__(msg, status_code=503, details={"service": service})


async def sanitized_exception_handler(request: Request, exc: SanitizedException) -> JSONResponse:
    """Handle sanitized exceptions"""
    
    # Log full details internally
    logger.error(
        f"Error handling request: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "status_code": exc.status_code,
            "details": exc.details,
            "request_id": getattr(request.state, "request_id", None)
        }
    )
    
    # Return sanitized response
    response = {
        "error": exc.message,
        "status_code": exc.status_code,
        "timestamp": request.state.request_time if hasattr(request.state, "request_time") else None
    }
    
    # Include details only in non-production
    if os.getenv("ENVIRONMENT", "production") != "production" and exc.details:
        response["details"] = exc.details
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response
    )


async def validation_exception_handler(request: Request, exc: Union[RequestValidationError, ValidationError]) -> JSONResponse:
    """Handle validation errors"""
    
    errors = []
    if isinstance(exc, RequestValidationError):
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"]
            })
    
    logger.warning(
        f"Validation error: {request.url.path}",
        extra={
            "errors": errors,
            "method": request.method,
            "request_id": getattr(request.state, "request_id", None)
        }
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation failed",
            "status_code": 422,
            "validation_errors": errors
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unexpected exceptions
    Sanitizes error messages to prevent information leakage
    """
    
    # Log full traceback internally
    logger.error(
        f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc(),
            "request_id": getattr(request.state, "request_id", None)
        },
        exc_info=True
    )
    
    # Determine if we should expose details
    is_production = os.getenv("ENVIRONMENT", "production") == "production"
    
    if is_production:
        # Generic error message in production
        error_message = "An internal server error occurred. Please contact support."
        details = None
    else:
        # More detailed error in non-production
        error_message = f"{type(exc).__name__}: {str(exc)}"
        details = {
            "type": type(exc).__name__,
            "traceback": traceback.format_exc().split("\n")[-10:]  # Last 10 lines
        }
    
    response = {
        "error": error_message,
        "status_code": 500,
        "request_id": getattr(request.state, "request_id", None)
    }
    
    if details:
        response["details"] = details
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response
    )


def setup_exception_handlers(app):
    """
    Register exception handlers with FastAPI app
    
    Usage:
        from shared.error_handling import setup_exception_handlers
        
        app = FastAPI()
        setup_exception_handlers(app)
    """
    app.add_exception_handler(SanitizedException, sanitized_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("Exception handlers registered")
