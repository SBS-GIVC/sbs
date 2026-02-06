"""
Shared logging configuration for SBS microservices
Provides structured logging with audit trails and security event tracking
"""
import logging
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional
import os

class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "service": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "facility_id"):
            log_data["facility_id"] = record.facility_id
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
            
        return json.dumps(log_data)


class AuditLogger:
    """Specialized logger for audit trails"""
    
    def __init__(self, service_name: str):
        self.logger = logging.getLogger(f"{service_name}.audit")
        
    def log_event(
        self,
        event_type: str,
        user_id: Optional[str] = None,
        resource: Optional[str] = None,
        action: Optional[str] = None,
        result: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log an audit event"""
        audit_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": event_type,
            "user_id": user_id,
            "resource": resource,
            "action": action,
            "result": result,
            "details": details or {}
        }
        self.logger.info("AUDIT_EVENT", extra={"audit_data": json.dumps(audit_data)})


def setup_logging(
    service_name: str,
    log_level: str = None,
    use_json: bool = None
) -> logging.Logger:
    """
    Configure logging for a microservice
    
    Args:
        service_name: Name of the service (e.g., "normalizer-service")
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        use_json: Whether to use JSON structured logging
    
    Returns:
        Configured logger instance
    """
    # Get configuration from environment
    log_level = log_level or os.getenv("LOG_LEVEL", "INFO")
    use_json = use_json if use_json is not None else os.getenv("LOG_FORMAT", "json") == "json"
    
    # Create logger
    logger = logging.getLogger(service_name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    logger.handlers.clear()
    
    # Create console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logger.level)
    
    # Set formatter
    if use_json:
        formatter = StructuredFormatter()
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    # Don't propagate to root logger
    logger.propagate = False
    
    return logger


def get_logger(name: str = None) -> logging.Logger:
    """Get a logger instance"""
    return logging.getLogger(name or __name__)


# Security event types
class SecurityEvents:
    """Standard security event types for audit logging"""
    AUTHENTICATION_SUCCESS = "auth.success"
    AUTHENTICATION_FAILURE = "auth.failure"
    AUTHORIZATION_DENIED = "authz.denied"
    RATE_LIMIT_EXCEEDED = "rate_limit.exceeded"
    INVALID_INPUT = "input.invalid"
    DATA_ACCESS = "data.access"
    DATA_MODIFICATION = "data.modification"
    CERTIFICATE_GENERATED = "certificate.generated"
    SIGNATURE_CREATED = "signature.created"
    API_CALL_FAILED = "api.call.failed"
    DATABASE_ERROR = "database.error"
