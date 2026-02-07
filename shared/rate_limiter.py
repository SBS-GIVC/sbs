"""
Shared Rate Limiter Module
Memory-safe rate limiting with automatic cleanup
"""

from collections import deque
from threading import Lock
import time


class RateLimiter:
    """
    Token bucket rate limiter with automatic cleanup to prevent memory leaks.
    
    Features:
    - Sliding window rate limiting
    - Periodic cleanup of stale entries
    - Maximum tracked IPs cap to prevent unbounded memory growth
    - Thread-safe operations
    """
    
    def __init__(self, max_requests: int = 100, time_window: int = 60, max_tracked_ips: int = 10000):
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests allowed per time window
            time_window: Time window in seconds
            max_tracked_ips: Maximum number of IPs to track (prevents memory leak)
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.max_tracked_ips = max_tracked_ips
        self.requests = {}
        self.lock = Lock()
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # Cleanup every 5 minutes
    
    def _cleanup_old_entries(self, now: float) -> None:
        """
        Remove stale IP entries to prevent memory leak.
        
        Args:
            now: Current timestamp
        """
        if now - self.last_cleanup < self.cleanup_interval:
            return
        
        # Remove entries with no recent requests
        stale_threshold = now - self.time_window * 2
        to_remove = [ip for ip, reqs in self.requests.items() 
                     if not reqs or reqs[-1] < stale_threshold]
        for ip in to_remove:
            del self.requests[ip]
        
        # If still too many entries, remove oldest
        if len(self.requests) > self.max_tracked_ips:
            sorted_ips = sorted(self.requests.keys(), 
                               key=lambda ip: self.requests[ip][-1] if self.requests[ip] else 0)
            for ip in sorted_ips[:len(self.requests) - self.max_tracked_ips]:
                del self.requests[ip]
        
        self.last_cleanup = now
    
    def is_allowed(self, identifier: str) -> bool:
        """
        Check if request is allowed for given identifier.
        
        Args:
            identifier: IP address or other identifier for rate limiting
            
        Returns:
            True if request is allowed, False if rate limit exceeded
        """
        with self.lock:
            now = time.time()
            
            # Periodic cleanup to prevent memory leak
            self._cleanup_old_entries(now)
            
            if identifier not in self.requests:
                self.requests[identifier] = deque()
            
            # Remove old requests outside time window
            while self.requests[identifier] and self.requests[identifier][0] < now - self.time_window:
                self.requests[identifier].popleft()
            
            # Check if under limit
            if len(self.requests[identifier]) < self.max_requests:
                self.requests[identifier].append(now)
                return True
            
            return False
    
    def get_stats(self) -> dict:
        """
        Get rate limiter statistics.
        
        Returns:
            Dictionary with rate limiter statistics
        """
        with self.lock:
            return {
                "tracked_ips": len(self.requests),
                "max_requests": self.max_requests,
                "time_window": self.time_window,
                "max_tracked_ips": self.max_tracked_ips
            }
