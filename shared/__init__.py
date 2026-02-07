"""
Shared utilities for SBS microservices.

This package provides common functionality across all SBS services:
- rate_limiter: Memory-safe rate limiting with automatic cleanup
- logging_config: Structured logging setup
- error_handling: Common error handlers with credential sanitization
- validation: Input validation utilities
"""

from .rate_limiter import RateLimiter
from .logging_config import (
    setup_logging,
    log_request,
    log_error,
    StructuredFormatter
)
from .error_handling import (
    sanitize_credentials,
    create_error_response,
    validation_exception_handler,
    general_exception_handler,
    format_database_error
)
from .validation import (
    validate_email,
    validate_phone,
    validate_national_id,
    validate_date_format,
    validate_required_fields,
    validate_numeric_range,
    validate_string_length,
    sanitize_input,
    validate_claim_amount
)

__all__ = [
    # Rate limiting
    "RateLimiter",
    
    # Logging
    "setup_logging",
    "log_request",
    "log_error",
    "StructuredFormatter",
    
    # Error handling
    "sanitize_credentials",
    "create_error_response",
    "validation_exception_handler",
    "general_exception_handler",
    "format_database_error",
    
    # Validation
    "validate_email",
    "validate_phone",
    "validate_national_id",
    "validate_date_format",
    "validate_required_fields",
    "validate_numeric_range",
    "validate_string_length",
    "sanitize_input",
    "validate_claim_amount",
]
