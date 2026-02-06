"""
Integration test to verify shared modules work with services
This is a simple import test to ensure services can load the shared modules.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_shared_modules_available():
    """Test that all shared modules are available"""
    from shared import (
        RateLimiter,
        setup_logging,
        sanitize_credentials,
        validate_email,
        validate_phone
    )
    
    # Verify we can instantiate and use them
    limiter = RateLimiter(max_requests=10, time_window=60)
    assert limiter.is_allowed("test_ip") is True
    
    logger = setup_logging("test-service")
    assert logger is not None
    
    assert validate_email("test@example.com") is True
    assert validate_phone("0501234567") is True
    
    sanitized = sanitize_credentials('{"password": "secret"}')
    assert "secret" not in sanitized


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
