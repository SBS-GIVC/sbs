"""
Structured Logging and Monitoring for NPHIES Bridge
Provides comprehensive logging, metrics collection, and monitoring capabilities
"""

import logging
import json
import sys
import os
from datetime import datetime
from typing import Dict, Any, Optional, Union, List
from enum import Enum
from dataclasses import dataclass, asdict, field
from contextlib import contextmanager
import time
import threading
from collections import defaultdict
import uuid

# Configure default logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('nphies_bridge.log')
    ]
)


class LogLevel(Enum):
    """Log levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogCategory(Enum):
    """Log categories for structured logging"""
    AUTHENTICATION = "authentication"
    API_REQUEST = "api_request"
    API_RESPONSE = "api_response"
    VALIDATION = "validation"
    DATABASE = "database"
    BUSINESS_LOGIC = "business_logic"
    PERFORMANCE = "performance"
    AUDIT = "audit"
    SECURITY = "security"
    SYSTEM = "system"


@dataclass
class LogContext:
    """Context information for structured logging"""
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    facility_id: Optional[int] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    endpoint: Optional[str] = None
    http_method: Optional[str] = None
    duration_ms: Optional[float] = None
    additional_context: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)


class StructuredLogger:
    """Structured logger for NPHIES bridge"""
    
    def __init__(
        self,
        name: str = "nphies_bridge",
        enable_json_logging: bool = True,
        log_file: Optional[str] = None,
        enable_metrics: bool = True
    ):
        self.name = name
        self.enable_json_logging = enable_json_logging
        self.enable_metrics = enable_metrics
        
        # Create logger instance
        self.logger = logging.getLogger(name)
        
        # Configure file handler if specified
        if log_file:
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
            self.logger.addHandler(file_handler)
        
        # Initialize metrics
        if enable_metrics:
            self.metrics = MetricsCollector()
        else:
            self.metrics = None
    
    def log(
        self,
        level: LogLevel,
        message: str,
        category: LogCategory,
        context: Optional[LogContext] = None,
        extra: Optional[Dict[str, Any]] = None
    ):
        """
        Log a structured message
        
        Args:
            level: Log level
            message: Log message
            category: Log category
            context: Context information
            extra: Additional structured data
        """
        # Create log record
        log_record = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": level.value,
            "category": category.value,
            "message": message,
            "logger": self.name
        }
        
        # Add context if provided
        if context:
            log_record["context"] = context.to_dict()
        
        # Add extra data if provided
        if extra:
            log_record["extra"] = extra
        
        # Log based on format
        if self.enable_json_logging:
            log_message = json.dumps(log_record, ensure_ascii=False)
        else:
            # Format as plain text
            context_str = f" | Context: {json.dumps(context.to_dict())}" if context else ""
            extra_str = f" | Extra: {json.dumps(extra)}" if extra else ""
            log_message = f"[{category.value}] {message}{context_str}{extra_str}"
        
        # Log at appropriate level
        log_method = getattr(self.logger, level.value)
        log_method(log_message)
        
        # Update metrics if enabled
        if self.enable_metrics:
            self.metrics.record_log(level, category)
    
    def debug(self, message: str, category: LogCategory, **kwargs):
        """Log debug message"""
        self.log(LogLevel.DEBUG, message, category, **kwargs)
    
    def info(self, message: str, category: LogCategory, **kwargs):
        """Log info message"""
        self.log(LogLevel.INFO, message, category, **kwargs)
    
    def warning(self, message: str, category: LogCategory, **kwargs):
        """Log warning message"""
        self.log(LogLevel.WARNING, message, category, **kwargs)
    
    def error(self, message: str, category: LogCategory, **kwargs):
        """Log error message"""
        self.log(LogLevel.ERROR, message, category, **kwargs)
    
    def critical(self, message: str, category: LogCategory, **kwargs):
        """Log critical message"""
        self.log(LogLevel.CRITICAL, message, category, **kwargs)
    
    @contextmanager
    def timed_operation(
        self,
        operation_name: str,
        category: LogCategory = LogCategory.PERFORMANCE,
        context: Optional[LogContext] = None
    ):
        """
        Context manager for timing operations
        
        Args:
            operation_name: Name of the operation being timed
            category: Log category
            context: Context information
        """
        start_time = time.time()
        
        try:
            yield
        finally:
            duration_ms = (time.time() - start_time) * 1000
            
            # Update context with duration
            if context:
                context.duration_ms = duration_ms
            else:
                context = LogContext(duration_ms=duration_ms)
            
            # Log the operation
            self.info(
                f"Operation '{operation_name}' completed in {duration_ms:.2f}ms",
                category,
                context=context,
                extra={"operation": operation_name, "duration_ms": duration_ms}
            )
            
            # Record metric if enabled
            if self.enable_metrics:
                self.metrics.record_operation(operation_name, duration_ms)
    
    def audit_log(
        self,
        action: str,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Create an audit log entry
        
        Args:
            action: Action performed (e.g., "create", "update", "delete", "view")
            user_id: ID of user performing action
            resource_type: Type of resource affected
            resource_id: ID of resource affected
            details: Additional details about the action
        """
        context = LogContext(
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id
        )
        
        self.info(
            f"Audit: {action} on {resource_type or 'unknown'} {resource_id or ''}",
            LogCategory.AUDIT,
            context=context,
            extra={"action": action, "details": details or {}}
        )
    
    def api_request_log(
        self,
        method: str,
        endpoint: str,
        request_id: str,
        status_code: Optional[int] = None,
        duration_ms: Optional[float] = None,
        error: Optional[str] = None
    ):
        """
        Log API request details
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            request_id: Request ID
            status_code: HTTP status code
            duration_ms: Request duration in milliseconds
            error: Error message if any
        """
        context = LogContext(
            request_id=request_id,
            endpoint=endpoint,
            http_method=method,
            duration_ms=duration_ms
        )
        
        level = LogLevel.ERROR if error else LogLevel.INFO
        category = LogCategory.API_REQUEST if not status_code else LogCategory.API_RESPONSE
        
        message = f"API {method} {endpoint}"
        if status_code:
            message += f" - {status_code}"
        if error:
            message += f" - Error: {error}"
        
        extra = {
            "http_method": method,
            "endpoint": endpoint,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "error": error
        }
        
        self.log(level, message, category, context=context, extra=extra)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        if self.enable_metrics:
            return self.metrics.get_metrics()
        return {}


class MetricsCollector:
    """Collects and aggregates metrics"""
    
    def __init__(self):
        self.log_counts = defaultdict(lambda: defaultdict(int))
        self.operation_times = defaultdict(list)
        self.api_request_counts = defaultdict(int)
        self.api_error_counts = defaultdict(int)
        self.start_time = time.time()
        self.lock = threading.Lock()
    
    def record_log(self, level: LogLevel, category: LogCategory):
        """Record a log entry"""
        with self.lock:
            self.log_counts[level.value][category.value] += 1
    
    def record_operation(self, operation_name: str, duration_ms: float):
        """Record operation timing"""
        with self.lock:
            self.operation_times[operation_name].append(duration_ms)
    
    def record_api_request(self, endpoint: str, status_code: int):
        """Record API request"""
        with self.lock:
            self.api_request_counts[endpoint] += 1
            if status_code >= 400:
                self.api_error_counts[endpoint] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get aggregated metrics"""
        with self.lock:
            uptime_seconds = time.time() - self.start_time
            
            # Calculate operation statistics
            operation_stats = {}
            for op_name, times in self.operation_times.items():
                if times:
                    operation_stats[op_name] = {
                        "count": len(times),
                        "avg_ms": sum(times) / len(times),
                        "min_ms": min(times),
                        "max_ms": max(times),
                        "p95_ms": sorted(times)[int(len(times) * 0.95)] if len(times) > 1 else times[0]
                    }
            
            # Calculate API statistics
            api_stats = {}
            for endpoint, count in self.api_request_counts.items():
                error_count = self.api_error_counts.get(endpoint, 0)
                api_stats[endpoint] = {
                    "request_count": count,
                    "error_count": error_count,
                    "success_rate": ((count - error_count) / count * 100) if count > 0 else 100
                }
            
            return {
                "uptime_seconds": uptime_seconds,
                "log_counts": dict(self.log_counts),
                "operation_stats": operation_stats,
                "api_stats": api_stats,
                "timestamp": datetime.utcnow().isoformat()
            }


class RequestLogger:
    """Middleware for logging HTTP requests"""
    
    def __init__(self, logger: StructuredLogger):
        self.logger = logger
    
    async def log_request(self, request, call_next):
        """Log HTTP request and response"""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Log request
        self.logger.api_request_log(
            method=request.method,
            endpoint=str(request.url.path),
            request_id=request_id
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log response
            self.logger.api_request_log(
                method=request.method,
                endpoint=str(request.url.path),
                request_id=request_id,
                status_code=response.status_code,
                duration_ms=duration_ms
            )
            
            # Record metric
            if self.logger.enable_metrics:
                self.logger.metrics.record_api_request(
                    str(request.url.path),
                    response.status_code
                )
            
            return response
            
        except Exception as e:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log error
            self.logger.api_request_log(
                method=request.method,
                endpoint=str(request.url.path),
                request_id=request_id,
                duration_ms=duration_ms,
                error=str(e)
            )
            
            raise


# Global logger instance
_global_logger: Optional[StructuredLogger] = None


def get_logger() -> StructuredLogger:
    """Get or create global structured logger instance"""
    global _global_logger
    if _global_logger is None:
        # Load configuration from environment
        enable_json_logging = os.getenv("ENABLE_JSON_LOGGING", "true").lower() == "true"
        log_file = os.getenv("LOG_FILE", "nphies_bridge.log")
        enable_metrics = os.getenv("ENABLE_METRICS", "true").lower() == "true"
        
        _global_logger = StructuredLogger(
            name="nphies_bridge",
            enable_json_logging=enable_json_logging,
            log_file=log_file,
            enable_metrics=enable_metrics
        )
    
    return _global_logger


# Convenience functions
def log(level: LogLevel, message: str, category: LogCategory, **kwargs):
    """Convenience function for logging"""
    logger = get_logger()
    logger.log(level, message, category, **kwargs)


def debug(message: str, category: LogCategory, **kwargs):
    """Convenience function for debug logging"""
    logger = get_logger()
    logger.debug(message, category, **kwargs)


def info(message: str, category: LogCategory, **kwargs):
    """Convenience function for info logging"""
    logger = get_logger()
    logger.info(message, category, **kwargs)


def warning(message: str, category: LogCategory, **kwargs):
    """Convenience function for warning logging"""
    logger = get_logger()
    logger.warning(message, category, **kwargs)


def error(message: str, category: LogCategory, **kwargs):
    """Convenience function for error logging"""
    logger = get_logger()
    logger.error(message, category, **kwargs)


def critical(message: str, category: LogCategory, **kwargs):
    """Convenience function for critical logging"""
    logger = get_logger()
    logger.critical(message, category, **kwargs)


@contextmanager
def timed_operation(operation_name: str, **kwargs):
    """Convenience context manager for timed operations"""
    logger = get_logger()
    with logger.timed_operation(operation_name, **kwargs):
        yield


def audit_log(action: str, **kwargs):
    """Convenience function for audit logging"""
    logger = get_logger()
    logger.audit_log(action, **kwargs)


def get_metrics() -> Dict[str, Any]:
    """Get current metrics"""
    logger = get_logger()
    return logger.get_metrics()


# Test the logger
if __name__ == "__main__":
    print("🧪 Testing Structured Logger")
    print("=" * 50)
    
    # Create test logger
    test_logger = StructuredLogger(
        name="test_logger",
        enable_json_logging=False,  # Use plain text for testing
        enable_metrics=True
    )
    
    # Test 1: Basic logging
    test_logger.info(
        "Test info message",
        LogCategory.SYSTEM,
        context=LogContext(request_id="test-123")
    )
    
    # Test 2: Timed operation
    with test_logger.timed_operation("test_operation", LogCategory.PERFORMANCE):
        time.sleep(0.1)
    
    # Test 3: Audit log
    test_logger.audit_log(
        action="view",
        user_id="user-123",
        resource_type="Patient",
        resource_id="PAT-001",
        details={"ip_address": "192.168.1.1"}
    )
    
    # Test 4: API request log
    test_logger.api_request_log(
        method="POST",
        endpoint="/submit-claim",
        request_id="req-123",
        status_code=200,
        duration_ms=150.5
    )
    
    # Test 5: Get metrics
    metrics = test_logger.get_metrics()
    print(f"Metrics: {json.dumps(metrics, indent=2)}")
    
    print("\n" + "=" * 50)
    print("✅ Structured Logger test completed")
