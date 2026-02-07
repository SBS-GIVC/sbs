"""
Comprehensive Error Handling for NPHIES Bridge
Provides structured error handling, exception hierarchy, and user-friendly error messages
"""

import logging
import traceback
import json
from typing import Dict, Any, Optional, Union, List
from enum import Enum
from datetime import datetime
from dataclasses import dataclass, asdict
from functools import wraps

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels"""
    CRITICAL = "critical"  # System failure, requires immediate attention
    ERROR = "error"        # Operation failed, user action required
    WARNING = "warning"    # Operation succeeded with issues
    INFO = "info"          # Informational message


class ErrorCategory(Enum):
    """Error categories for classification"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    NETWORK = "network"
    DATABASE = "database"
    EXTERNAL_API = "external_api"
    CONFIGURATION = "configuration"
    BUSINESS_LOGIC = "business_logic"
    UNKNOWN = "unknown"


@dataclass
class ErrorContext:
    """Context information for errors"""
    timestamp: datetime
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    facility_id: Optional[int] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    additional_context: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        result = asdict(self)
        result["timestamp"] = self.timestamp.isoformat()
        return result


class NPHIESError(Exception):
    """Base exception for all NPHIES bridge errors"""
    
    def __init__(
        self,
        message: str,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        severity: ErrorSeverity = ErrorSeverity.ERROR,
        error_code: Optional[str] = None,
        context: Optional[ErrorContext] = None,
        original_exception: Optional[Exception] = None
    ):
        super().__init__(message)
        self.message = message
        self.category = category
        self.severity = severity
        self.error_code = error_code or self._generate_error_code()
        self.context = context or ErrorContext(timestamp=datetime.utcnow())
        self.original_exception = original_exception
        self.stack_trace = traceback.format_exc()
    
    def _generate_error_code(self) -> str:
        """Generate error code from category and severity"""
        return f"NPHIES-{self.category.value.upper()}-{self.severity.value.upper()}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for serialization"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "category": self.category.value,
            "severity": self.severity.value,
            "context": self.context.to_dict() if self.context else None,
            "stack_trace": self.stack_trace if self.severity == ErrorSeverity.CRITICAL else None,
            "original_exception": str(self.original_exception) if self.original_exception else None
        }
    
    def __str__(self) -> str:
        """String representation"""
        return f"[{self.error_code}] {self.message}"


# Authentication Errors
class AuthenticationError(NPHIESError):
    """Authentication related errors"""
    def __init__(self, message: str, **kwargs):
        super().__init__(
            message,
            category=ErrorCategory.AUTHENTICATION,
            severity=ErrorSeverity.ERROR,
            **kwargs
        )


class TokenExpiredError(AuthenticationError):
    """OAuth2 token has expired"""
    def __init__(self, **kwargs):
        super().__init__(
            "Authentication token has expired",
            error_code="NPHIES-AUTH-TOKEN-EXPIRED",
            **kwargs
        )


class InvalidCredentialsError(AuthenticationError):
    """Invalid client credentials"""
    def __init__(self, **kwargs):
        super().__init__(
            "Invalid client credentials",
            error_code="NPHIES-AUTH-INVALID-CREDENTIALS",
            **kwargs
        )


# Authorization Errors
class AuthorizationError(NPHIESError):
    """Authorization related errors"""
    def __init__(self, message: str, **kwargs):
        super().__init__(
            message,
            category=ErrorCategory.AUTHORIZATION,
            severity=ErrorSeverity.ERROR,
            **kwargs
        )


class InsufficientPermissionsError(AuthorizationError):
    """User lacks required permissions"""
    def __init__(self, required_permissions: List[str], **kwargs):
        super().__init__(
            f"Insufficient permissions. Required: {', '.join(required_permissions)}",
            error_code="NPHIES-AUTH-INSUFFICIENT-PERMISSIONS",
            **kwargs
        )


# Validation Errors
class ValidationError(NPHIESError):
    """Data validation errors"""
    def __init__(self, message: str, validation_details: Optional[Dict[str, Any]] = None, **kwargs):
        super().__init__(
            message,
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.ERROR,
            **kwargs
        )
        self.validation_details = validation_details or {}


class FHIRValidationError(ValidationError):
    """FHIR resource validation errors"""
    def __init__(self, validation_result: Dict[str, Any], **kwargs):
        errors = validation_result.get("errors", [])
        error_messages = [e.get("description", "") for e in errors]
        
        super().__init__(
            f"FHIR validation failed with {len(errors)} errors",
            validation_details=validation_result,
            error_code="NPHIES-VALIDATION-FHIR-INVALID",
            **kwargs
        )


class RequiredFieldError(ValidationError):
    """Required field is missing"""
    def __init__(self, field_name: str, resource_type: str, **kwargs):
        super().__init__(
            f"Required field '{field_name}' is missing for {resource_type}",
            error_code="NPHIES-VALIDATION-REQUIRED-FIELD",
            **kwargs
        )


# Network Errors
class NetworkError(NPHIESError):
    """Network related errors"""
    def __init__(self, message: str, **kwargs):
        super().__init__(
            message,
            category=ErrorCategory.NETWORK,
            severity=ErrorSeverity.ERROR,
            **kwargs
        )


class ConnectionError(NetworkError):
    """Connection to NPHIES API failed"""
    def __init__(self, endpoint: str, **kwargs):
        super().__init__(
            f"Failed to connect to NPHIES endpoint: {endpoint}",
            error_code="NPHIES-NETWORK-CONNECTION-FAILED",
            **kwargs
        )


class TimeoutError(NetworkError):
    """Request timeout"""
    def __init__(self, endpoint: str, timeout_seconds: int, **kwargs):
        super().__init__(
            f"Request to {endpoint} timed out after {timeout_seconds} seconds",
            error_code="NPHIES-NETWORK-TIMEOUT",
            **kwargs
        )


class RateLimitError(NetworkError):
    """Rate limit exceeded"""
    def __init__(self, endpoint: str, retry_after: Optional[int] = None, **kwargs):
        message = f"Rate limit exceeded for {endpoint}"
        if retry_after:
            message += f". Retry after {retry_after} seconds"
        
        super().__init__(
            message,
            error_code="NPHIES-NETWORK-RATE-LIMIT",
            **kwargs
        )


# External API Errors
class ExternalAPIError(NPHIESError):
    """Errors from external APIs (NPHIES)"""
    def __init__(self, message: str, status_code: Optional[int] = None, response_body: Optional[str] = None, **kwargs):
        super().__init__(
            message,
            category=ErrorCategory.EXTERNAL_API,
            severity=ErrorSeverity.ERROR,
            **kwargs
        )
        self.status_code = status_code
        self.response_body = response_body


class NPHIESAPIError(ExternalAPIError):
    """Specific NPHIES API errors"""
    def __init__(self, status_code: int, response_body: str, **kwargs):
        try:
            response_data = json.loads(response_body)
            error_message = response_data.get("error", {}).get("message", "Unknown NPHIES API error")
        except:
            error_message = f"NPHIES API returned HTTP {status_code}"
        
        super().__init__(
            error_message,
            status_code=status_code,
            response_body=response_body,
            error_code=f"NPHIES-API-{status_code}",
            **kwargs
        )


# Database Errors
class DatabaseError(NPHIESError):
    """Database related errors"""
    def __init__(self, message: str, **kwargs):
        super().__init__(
            message,
            category=ErrorCategory.DATABASE,
            severity=ErrorSeverity.ERROR,
            **kwargs
        )


class DatabaseConnectionError(DatabaseError):
    """Database connection failed"""
    def __init__(self, **kwargs):
        super().__init__(
            "Failed to connect to database",
            error_code="NPHIES-DB-CONNECTION-FAILED",
            **kwargs
        )


class TransactionError(DatabaseError):
    """Database transaction error"""
    def __init__(self, operation: str, **kwargs):
        super().__init__(
            f"Database transaction failed for operation: {operation}",
            error_code="NPHIES-DB-TRANSACTION-ERROR",
            **kwargs
        )


# Configuration Errors
class ConfigurationError(NPHIESError):
    """Configuration related errors"""
    def __init__(self, message: str, **kwargs):
        super().__init__(
            message,
            category=ErrorCategory.CONFIGURATION,
            severity=ErrorSeverity.CRITICAL,
            **kwargs
        )


class MissingConfigurationError(ConfigurationError):
    """Required configuration is missing"""
    def __init__(self, config_key: str, **kwargs):
        super().__init__(
            f"Required configuration '{config_key}' is missing",
            error_code="NPHIES-CONFIG-MISSING",
            **kwargs
        )


class InvalidConfigurationError(ConfigurationError):
    """Configuration is invalid"""
    def __init__(self, config_key: str, config_value: Any, reason: str, **kwargs):
        super().__init__(
            f"Invalid configuration for '{config_key}': {reason} (value: {config_value})",
            error_code="NPHIES-CONFIG-INVALID",
            **kwargs
        )


class ErrorHandler:
    """Main error handler for NPHIES bridge"""
    
    def __init__(self, enable_sentry: bool = False, sentry_dsn: Optional[str] = None):
        self.enable_sentry = enable_sentry
        self.sentry_dsn = sentry_dsn
        
        if enable_sentry and sentry_dsn:
            try:
                import sentry_sdk
                sentry_sdk.init(
                    dsn=sentry_dsn,
                    traces_sample_rate=1.0,
                    profiles_sample_rate=1.0,
                )
                logger.info("Sentry error tracking initialized")
            except ImportError:
                logger.warning("Sentry SDK not installed, error tracking disabled")
                self.enable_sentry = False
    
    def handle_error(
        self,
        error: Exception,
        context: Optional[ErrorContext] = None,
        raise_exception: bool = True
    ) -> Dict[str, Any]:
        """
        Handle an error, log it, and optionally re-raise
        
        Args:
            error: The exception to handle
            context: Additional context information
            raise_exception: Whether to re-raise the exception
            
        Returns:
            Dictionary with error information
        """
        # Create error context if not provided
        if context is None:
            context = ErrorContext(timestamp=datetime.utcnow())
        
        # Convert to NPHIESError if it's a generic exception
        if not isinstance(error, NPHIESError):
            error = self._wrap_generic_error(error, context)
        
        # Add context to error
        error.context = context
        
        # Log the error based on severity
        self._log_error(error)
        
        # Send to Sentry if enabled
        if self.enable_sentry:
            self._send_to_sentry(error)
        
        # Return error information
        error_info = error.to_dict()
        
        # Re-raise if requested
        if raise_exception:
            raise error
        
        return error_info
    
    def _wrap_generic_error(self, error: Exception, context: ErrorContext) -> NPHIESError:
        """Wrap a generic exception in an NPHIESError"""
        error_message = str(error)
        
        # Map common exception types to NPHIES errors
        if isinstance(error, ConnectionError) or "connection" in error_message.lower():
            return ConnectionError(
                message=error_message,
                context=context,
                original_exception=error
            )
        elif isinstance(error, TimeoutError) or "timeout" in error_message.lower():
            return TimeoutError(
                message=error_message,
                context=context,
                original_exception=error
            )
        elif isinstance(error, ValueError):
            return ValidationError(
                message=error_message,
                context=context,
                original_exception=error
            )
        elif isinstance(error, KeyError):
            return RequiredFieldError(
                field_name=str(error),
                resource_type="unknown",
                context=context,
                original_exception=error
            )
        else:
            return NPHIESError(
                message=error_message,
                context=context,
                original_exception=error
            )
    
    def _log_error(self, error: NPHIESError):
        """Log error based on severity"""
        log_message = f"{error.error_code}: {error.message}"
        
        if error.context:
            log_message += f" | Context: {json.dumps(error.context.to_dict())}"
        
        if error.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, exc_info=error.original_exception)
        elif error.severity == ErrorSeverity.ERROR:
            logger.error(log_message, exc_info=error.original_exception)
        elif error.severity == ErrorSeverity.WARNING:
            logger.warning(log_message)
        else:
            logger.info(log_message)
    
    def _send_to_sentry(self, error: NPHIESError):
        """Send error to Sentry if enabled"""
        try:
            import sentry_sdk
            with sentry_sdk.push_scope() as scope:
                # Add error context to Sentry scope
                if error.context:
                    scope.set_context("error_context", error.context.to_dict())
                
                # Set error fingerprint for grouping
                scope.fingerprint = [error.error_code]
                
                # Capture exception
                if error.original_exception:
                    sentry_sdk.capture_exception(error.original_exception)
                else:
                    sentry_sdk.capture_message(f"{error.error_code}: {error.message}")
        except Exception as e:
            logger.warning(f"Failed to send error to Sentry: {e}")
    
    def create_error_response(
        self,
        error: Exception,
        include_stack_trace: bool = False,
        user_friendly: bool = True
    ) -> Dict[str, Any]:
        """
        Create a user-friendly error response
        
        Args:
            error: The exception
            include_stack_trace: Whether to include stack trace (for debugging)
            user_friendly: Whether to create user-friendly messages
            
        Returns:
            Dictionary suitable for API response
        """
        # Handle the error (but don't re-raise)
        error_info = self.handle_error(error, raise_exception=False)
        
        # Create response
        response = {
            "success": False,
            "error": {
                "code": error_info["error_code"],
                "message": self._get_user_friendly_message(error_info) if user_friendly else error_info["message"],
                "category": error_info["category"],
                "timestamp": error_info["context"]["timestamp"] if error_info.get("context") else datetime.utcnow().isoformat()
            }
        }
        
        # Add details for debugging if requested
        if include_stack_trace:
            response["error"]["details"] = {
                "original_message": error_info["message"],
                "stack_trace": error_info.get("stack_trace"),
                "original_exception": error_info.get("original_exception")
            }
        
        # Add validation details if available
        if isinstance(error, ValidationError) and hasattr(error, 'validation_details'):
            response["error"]["validation_details"] = error.validation_details
        
        return response
    
    def _get_user_friendly_message(self, error_info: Dict[str, Any]) -> str:
        """Convert error to user-friendly message"""
        error_code = error_info["error_code"]
        original_message = error_info["message"]
        
        # Map error codes to user-friendly messages
        user_messages = {
            "NPHIES-AUTH-TOKEN-EXPIRED": "Your session has expired. Please re-authenticate.",
            "NPHIES-AUTH-INVALID-CREDENTIALS": "Invalid credentials. Please check your username and password.",
            "NPHIES-VALIDATION-REQUIRED-FIELD": "Please fill in all required fields.",
            "NPHIES-VALIDATION-FHIR-INVALID": "The submitted data contains validation errors.",
            "NPHIES-NETWORK-CONNECTION-FAILED": "Unable to connect to the service. Please check your internet connection.",
            "NPHIES-NETWORK-TIMEOUT": "The request timed out. Please try again.",
            "NPHIES-NETWORK-RATE-LIMIT": "Too many requests. Please wait a moment and try again.",
            "NPHIES-API-400": "Invalid request. Please check your input data.",
            "NPHIES-API-401": "Authentication failed. Please check your credentials.",
            "NPHIES-API-403": "Access denied. You don't have permission to perform this action.",
            "NPHIES-API-404": "The requested resource was not found.",
            "NPHIES-API-429": "Too many requests. Please wait and try again.",
            "NPHIES-API-500": "Server error. Please try again later.",
            "NPHIES-API-502": "Service temporarily unavailable. Please try again later.",
            "NPHIES-API-503": "Service temporarily unavailable. Please try again later.",
            "NPHIES-API-504": "Gateway timeout. Please try again.",
            "NPHIES-DB-CONNECTION-FAILED": "Database connection failed. Please contact support.",
            "NPHIES-DB-TRANSACTION-ERROR": "Database error occurred. Please try again.",
            "NPHIES-CONFIG-MISSING": "System configuration error. Please contact support.",
            "NPHIES-CONFIG-INVALID": "System configuration error. Please contact support.",
        }
        
        # Return user-friendly message or fall back to original
        return user_messages.get(error_code, original_message)
    
    def error_handler_decorator(self, include_stack_trace: bool = False, user_friendly: bool = True):
        """
        Decorator for handling errors in functions
        
        Args:
            include_stack_trace: Whether to include stack trace in response
            user_friendly: Whether to use user-friendly error messages
            
        Returns:
            Decorator function
        """
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    # Create error context
                    context = ErrorContext(
                        timestamp=datetime.utcnow(),
                        endpoint=getattr(func, '__name__', 'unknown'),
                        additional_context={
                            "function": func.__name__,
                            "module": func.__module__
                        }
                    )
                    
                    # Handle the error
                    error_info = self.handle_error(e, context, raise_exception=False)
                    
                    # Create error response
                    error_response = self.create_error_response(
                        e,
                        include_stack_trace=include_stack_trace,
                        user_friendly=user_friendly
                    )
                    
                    return error_response
            
            return wrapper
        return decorator
    
    def async_error_handler_decorator(self, include_stack_trace: bool = False, user_friendly: bool = True):
        """
        Decorator for handling errors in async functions
        
        Args:
            include_stack_trace: Whether to include stack trace in response
            user_friendly: Whether to use user-friendly error messages
            
        Returns:
            Decorator function
        """
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    # Create error context
                    context = ErrorContext(
                        timestamp=datetime.utcnow(),
                        endpoint=getattr(func, '__name__', 'unknown'),
                        additional_context={
                            "function": func.__name__,
                            "module": func.__module__
                        }
                    )
                    
                    # Handle the error
                    error_info = self.handle_error(e, context, raise_exception=False)
                    
                    # Create error response
                    error_response = self.create_error_response(
                        e,
                        include_stack_trace=include_stack_trace,
                        user_friendly=user_friendly
                    )
                    
                    return error_response
            
            return wrapper
        return decorator


# Global error handler instance
_error_handler_instance: Optional[ErrorHandler] = None


def get_error_handler() -> ErrorHandler:
    """Get or create global error handler instance"""
    global _error_handler_instance
    if _error_handler_instance is None:
        # Load configuration from environment
        import os
        enable_sentry = os.getenv("ENABLE_SENTRY", "false").lower() == "true"
        sentry_dsn = os.getenv("SENTRY_DSN")
        
        _error_handler_instance = ErrorHandler(
            enable_sentry=enable_sentry,
            sentry_dsn=sentry_dsn
        )
    
    return _error_handler_instance


# Convenience functions
def handle_error(error: Exception, context: Optional[ErrorContext] = None, raise_exception: bool = True) -> Dict[str, Any]:
    """Convenience function to handle an error"""
    handler = get_error_handler()
    return handler.handle_error(error, context, raise_exception)


def create_error_response(error: Exception, include_stack_trace: bool = False, user_friendly: bool = True) -> Dict[str, Any]:
    """Convenience function to create error response"""
    handler = get_error_handler()
    return handler.create_error_response(error, include_stack_trace, user_friendly)


def error_handler(include_stack_trace: bool = False, user_friendly: bool = True):
    """Convenience decorator for error handling"""
    handler = get_error_handler()
    return handler.error_handler_decorator(include_stack_trace, user_friendly)


def async_error_handler(include_stack_trace: bool = False, user_friendly: bool = True):
    """Convenience decorator for async error handling"""
    handler = get_error_handler()
    return handler.async_error_handler_decorator(include_stack_trace, user_friendly)


# Test the error handler
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    print("🧪 Testing Error Handler")
    print("=" * 50)
    
    # Test error handling
    handler = ErrorHandler()
    
    # Test 1: Handle a generic exception
    try:
        raise ValueError("Test validation error")
    except Exception as e:
        result = handler.handle_error(e, raise_exception=False)
        print(f"Test 1 - Generic Exception:")
        print(f"  Error Code: {result['error_code']}")
        print(f"  Message: {result['message']}")
        print(f"  Category: {result['category']}")
    
    print()
    
    # Test 2: Create error response
    try:
        raise TokenExpiredError()
    except Exception as e:
        response = handler.create_error_response(e, user_friendly=True)
        print(f"Test 2 - Error Response:")
        print(f"  Success: {response['success']}")
        print(f"  Error Code: {response['error']['code']}")
        print(f"  User Message: {response['error']['message']}")
    
    print()
    
    # Test 3: Test decorator
    @handler.error_handler_decorator(user_friendly=True)
    def test_function():
        raise ConnectionError("https://api.example.com")
    
    result = test_function()
    print(f"Test 3 - Decorator:")
    print(f"  Result: {json.dumps(result, indent=2)}")
    
    print("\n" + "=" * 50)
    print("✅ Error Handler test completed")
