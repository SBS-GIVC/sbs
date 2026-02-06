"""
Shared Logging Configuration Module
Provides structured logging setup for all SBS services
"""

import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as JSON.
        
        Args:
            record: Log record to format
            
        Returns:
            JSON-formatted log string
        """
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "client_ip"):
            log_data["client_ip"] = record.client_ip
        if hasattr(record, "endpoint"):
            log_data["endpoint"] = record.endpoint
        
        return json.dumps(log_data)


def setup_logging(service_name: str, log_level: str = "INFO") -> logging.Logger:
    """
    Setup structured logging for a service.
    
    Args:
        service_name: Name of the service for logging context
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        
    Returns:
        Configured logger instance
    """
    # Create logger
    logger = logging.getLogger(service_name)
    logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Remove existing handlers to avoid duplicates
    logger.handlers.clear()
    
    # Create console handler with structured formatter
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    logger.addHandler(handler)
    
    # Prevent propagation to root logger
    logger.propagate = False
    
    return logger


def log_request(logger: logging.Logger, request_id: str, client_ip: str, endpoint: str, message: str) -> None:
    """
    Log request with context information.
    
    Args:
        logger: Logger instance
        request_id: Request ID for tracking
        client_ip: Client IP address
        endpoint: API endpoint
        message: Log message
    """
    extra = {
        "request_id": request_id,
        "client_ip": client_ip,
        "endpoint": endpoint
    }
    logger.info(message, extra=extra)


def log_error(logger: logging.Logger, message: str, exc_info: Any = None, **kwargs) -> None:
    """
    Log error with optional exception info and context.
    
    Args:
        logger: Logger instance
        message: Error message
        exc_info: Exception info tuple
        **kwargs: Additional context fields
    """
    logger.error(message, exc_info=exc_info, extra=kwargs)
