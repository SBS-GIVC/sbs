"""
Improved rate limiter with memory cleanup and per-user tracking
Prevents memory leaks and provides better rate limiting granularity
"""
import time
from collections import deque
from threading import Lock
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class ImprovedRateLimiter:
    """
    Token bucket rate limiter with automatic cleanup
    
    Features:
    - Sliding window rate limiting
    - Automatic cleanup of old entries
    - Memory-bounded IP tracking
    - Thread-safe operations
    """
    
    def __init__(
        self,
        max_requests: int = 100,
        time_window: int = 60,
        cleanup_interval: int = 300,
        max_tracked_ips: int = 10000
    ):
        """
        Initialize rate limiter
        
        Args:
            max_requests: Maximum requests allowed in time window
            time_window: Time window in seconds
            cleanup_interval: Seconds between cleanup runs
            max_tracked_ips: Maximum number of IPs to track (prevents memory exhaustion)
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.cleanup_interval = cleanup_interval
        self.max_tracked_ips = max_tracked_ips
        
        self.requests: Dict[str, deque] = {}
        self.lock = Lock()
        self.last_cleanup = time.time()
        
        logger.info(
            f"Rate limiter initialized: {max_requests} requests per {time_window}s, "
            f"cleanup every {cleanup_interval}s, max {max_tracked_ips} tracked IPs"
        )
    
    def _cleanup_old_entries(self) -> Tuple[int, int]:
        """
        Remove expired entries and limit tracked IPs
        
        Returns:
            Tuple of (entries_removed, ips_removed)
        """
        now = time.time()
        cutoff = now - self.time_window
        
        entries_removed = 0
        ips_to_remove = []
        
        # Clean up old requests
        for identifier, request_times in self.requests.items():
            original_len = len(request_times)
            
            # Remove old timestamps
            while request_times and request_times[0] < cutoff:
                request_times.popleft()
                entries_removed += 1
            
            # Mark empty queues for removal
            if not request_times:
                ips_to_remove.append(identifier)
        
        # Remove empty IP entries
        for identifier in ips_to_remove:
            del self.requests[identifier]
        
        # If still too many IPs, remove oldest inactive ones
        if len(self.requests) > self.max_tracked_ips:
            # Sort by last access time (last item in deque)
            sorted_ips = sorted(
                self.requests.items(),
                key=lambda x: x[1][-1] if x[1] else 0
            )
            
            # Remove oldest 10%
            num_to_remove = max(1, len(sorted_ips) // 10)
            for identifier, _ in sorted_ips[:num_to_remove]:
                del self.requests[identifier]
                ips_to_remove.append(identifier)
        
        ips_removed = len(ips_to_remove)
        
        if entries_removed > 0 or ips_removed > 0:
            logger.debug(
                f"Rate limiter cleanup: removed {entries_removed} entries, "
                f"{ips_removed} IPs, {len(self.requests)} IPs tracked"
            )
        
        return entries_removed, ips_removed
    
    def is_allowed(self, identifier: str) -> bool:
        """
        Check if request is allowed for given identifier
        
        Args:
            identifier: IP address or user ID
            
        Returns:
            True if request is allowed, False if rate limited
        """
        with self.lock:
            now = time.time()
            
            # Periodic cleanup
            if now - self.last_cleanup > self.cleanup_interval:
                self._cleanup_old_entries()
                self.last_cleanup = now
            
            # Initialize deque for new identifier
            if identifier not in self.requests:
                # Check if we're at capacity
                if len(self.requests) >= self.max_tracked_ips:
                    # Emergency cleanup
                    self._cleanup_old_entries()
                    
                    # If still at capacity, reject
                    if len(self.requests) >= self.max_tracked_ips:
                        logger.warning(
                            f"Rate limiter at capacity ({self.max_tracked_ips} IPs), "
                            f"rejecting new identifier: {identifier[:10]}..."
                        )
                        return False
                
                self.requests[identifier] = deque()
            
            # Remove old requests outside time window
            cutoff = now - self.time_window
            while self.requests[identifier] and self.requests[identifier][0] < cutoff:
                self.requests[identifier].popleft()
            
            # Check if under limit
            if len(self.requests[identifier]) < self.max_requests:
                self.requests[identifier].append(now)
                return True
            
            # Rate limited
            logger.warning(
                f"Rate limit exceeded for {identifier[:10]}...: "
                f"{len(self.requests[identifier])} requests in {self.time_window}s"
            )
            return False
    
    def get_stats(self) -> Dict[str, int]:
        """Get current rate limiter statistics"""
        with self.lock:
            total_requests = sum(len(times) for times in self.requests.values())
            return {
                "tracked_ips": len(self.requests),
                "total_active_requests": total_requests,
                "max_requests_per_window": self.max_requests,
                "time_window_seconds": self.time_window,
                "max_tracked_ips": self.max_tracked_ips
            }
    
    def reset_identifier(self, identifier: str) -> bool:
        """
        Reset rate limit for specific identifier
        
        Args:
            identifier: IP address or user ID to reset
            
        Returns:
            True if identifier was found and reset, False otherwise
        """
        with self.lock:
            if identifier in self.requests:
                del self.requests[identifier]
                logger.info(f"Rate limit reset for identifier: {identifier[:10]}...")
                return True
            return False
