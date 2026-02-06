"""
Test suite for shared utility modules
"""

import pytest
import time
from shared import (
    RateLimiter,
    setup_logging,
    sanitize_credentials,
    validate_email,
    validate_phone,
    validate_required_fields,
    validate_claim_amount,
    sanitize_input
)


class TestRateLimiter:
    """Tests for RateLimiter class"""
    
    def test_rate_limiter_allows_requests_under_limit(self):
        """Test that requests under the limit are allowed"""
        limiter = RateLimiter(max_requests=5, time_window=60)
        
        # Should allow first 5 requests
        for i in range(5):
            assert limiter.is_allowed("test_ip") is True
    
    def test_rate_limiter_blocks_requests_over_limit(self):
        """Test that requests over the limit are blocked"""
        limiter = RateLimiter(max_requests=3, time_window=60)
        
        # Allow first 3 requests
        for i in range(3):
            assert limiter.is_allowed("test_ip") is True
        
        # Block 4th request
        assert limiter.is_allowed("test_ip") is False
    
    def test_rate_limiter_resets_after_time_window(self):
        """Test that rate limiter resets after time window"""
        limiter = RateLimiter(max_requests=2, time_window=1)
        
        # Use up the limit
        assert limiter.is_allowed("test_ip") is True
        assert limiter.is_allowed("test_ip") is True
        assert limiter.is_allowed("test_ip") is False
        
        # Wait for time window to pass
        time.sleep(1.1)
        
        # Should be allowed again
        assert limiter.is_allowed("test_ip") is True
    
    def test_rate_limiter_tracks_multiple_ips(self):
        """Test that rate limiter tracks multiple IPs separately"""
        limiter = RateLimiter(max_requests=2, time_window=60)
        
        # IP1 uses its limit
        assert limiter.is_allowed("ip1") is True
        assert limiter.is_allowed("ip1") is True
        assert limiter.is_allowed("ip1") is False
        
        # IP2 should still be allowed
        assert limiter.is_allowed("ip2") is True
        assert limiter.is_allowed("ip2") is True
    
    def test_rate_limiter_cleanup(self):
        """Test that old entries are cleaned up"""
        limiter = RateLimiter(max_requests=100, time_window=1, max_tracked_ips=10)
        
        # Add multiple IPs
        for i in range(15):
            limiter.is_allowed(f"ip_{i}")
        
        # Force cleanup
        limiter._cleanup_old_entries(time.time() + 300)
        
        # Should have cleaned up to max_tracked_ips
        stats = limiter.get_stats()
        assert stats["tracked_ips"] <= 10
    
    def test_rate_limiter_get_stats(self):
        """Test that get_stats returns correct information"""
        limiter = RateLimiter(max_requests=100, time_window=60, max_tracked_ips=5000)
        
        stats = limiter.get_stats()
        
        assert stats["max_requests"] == 100
        assert stats["time_window"] == 60
        assert stats["max_tracked_ips"] == 5000
        assert "tracked_ips" in stats


class TestLogging:
    """Tests for logging configuration"""
    
    def test_setup_logging_creates_logger(self):
        """Test that setup_logging creates a logger"""
        logger = setup_logging("test-service", log_level="INFO")
        
        assert logger is not None
        assert logger.name == "test-service"
    
    def test_logging_level_is_set(self):
        """Test that logging level is set correctly"""
        import logging
        
        logger = setup_logging("test-service", log_level="DEBUG")
        assert logger.level == logging.DEBUG
        
        logger = setup_logging("test-service", log_level="WARNING")
        assert logger.level == logging.WARNING


class TestErrorHandling:
    """Tests for error handling utilities"""
    
    def test_sanitize_credentials_password(self):
        """Test that passwords are sanitized"""
        data = '{"password": "secret123", "username": "john"}'
        sanitized = sanitize_credentials(data)
        
        assert "secret123" not in sanitized
        assert "***REDACTED***" in sanitized
        assert "john" in sanitized
    
    def test_sanitize_credentials_token(self):
        """Test that tokens are sanitized"""
        data = '{"token": "abc123xyz", "data": "public"}'
        sanitized = sanitize_credentials(data)
        
        assert "abc123xyz" not in sanitized
        assert "***REDACTED***" in sanitized
    
    def test_sanitize_credentials_api_key(self):
        """Test that API keys are sanitized"""
        data = '{"api_key": "sk-123456", "name": "test"}'
        sanitized = sanitize_credentials(data)
        
        assert "sk-123456" not in sanitized
        assert "***REDACTED***" in sanitized
    
    def test_sanitize_credentials_dict(self):
        """Test that dictionaries are sanitized"""
        data = {"password": "secret", "username": "john"}
        sanitized = sanitize_credentials(data)
        
        assert isinstance(sanitized, dict)
        assert "secret" not in str(sanitized)
        assert "john" in str(sanitized)
    
    def test_sanitize_credentials_list(self):
        """Test that lists are sanitized"""
        data = ["password=secret", "username=john"]
        sanitized = sanitize_credentials(data)
        
        assert isinstance(sanitized, list)
        assert "secret" not in str(sanitized)


class TestValidation:
    """Tests for validation utilities"""
    
    def test_validate_email_valid(self):
        """Test validation of valid email addresses"""
        assert validate_email("user@example.com") is True
        assert validate_email("john.doe@company.org") is True
        assert validate_email("test+tag@domain.co.uk") is True
    
    def test_validate_email_invalid(self):
        """Test validation of invalid email addresses"""
        assert validate_email("invalid") is False
        assert validate_email("@example.com") is False
        assert validate_email("user@") is False
        assert validate_email("") is False
    
    def test_validate_phone_valid(self):
        """Test validation of valid Saudi phone numbers"""
        assert validate_phone("+966501234567") is True
        assert validate_phone("966501234567") is True
        assert validate_phone("0501234567") is True
    
    def test_validate_phone_invalid(self):
        """Test validation of invalid phone numbers"""
        assert validate_phone("123456") is False
        assert validate_phone("") is False
        assert validate_phone("+1234567890") is False
    
    def test_validate_required_fields_success(self):
        """Test validation of required fields - success case"""
        data = {"name": "John", "email": "john@example.com", "phone": "123"}
        is_valid, error = validate_required_fields(data, ["name", "email", "phone"])
        
        assert is_valid is True
        assert error is None
    
    def test_validate_required_fields_missing(self):
        """Test validation of required fields - missing field"""
        data = {"name": "John", "email": "john@example.com"}
        is_valid, error = validate_required_fields(data, ["name", "email", "phone"])
        
        assert is_valid is False
        assert "phone" in error
    
    def test_validate_claim_amount_valid(self):
        """Test validation of valid claim amounts"""
        is_valid, error = validate_claim_amount(100.50)
        assert is_valid is True
        assert error is None
        
        is_valid, error = validate_claim_amount(1000000)
        assert is_valid is True
    
    def test_validate_claim_amount_invalid(self):
        """Test validation of invalid claim amounts"""
        # Negative amount
        is_valid, error = validate_claim_amount(-100)
        assert is_valid is False
        
        # Zero amount
        is_valid, error = validate_claim_amount(0)
        assert is_valid is False
        
        # Too large
        is_valid, error = validate_claim_amount(20000000)
        assert is_valid is False
    
    def test_sanitize_input_removes_dangerous_chars(self):
        """Test that input sanitization removes dangerous characters"""
        # Script tags
        result = sanitize_input("<script>alert('xss')</script>normal text")
        assert "<script>" not in result
        assert "normal text" in result
        
        # SQL injection patterns
        result = sanitize_input("SELECT * FROM users; DROP TABLE users--")
        assert "--" not in result
        assert ";" not in result
        
        # Control characters
        result = sanitize_input("text\x00with\x1fcontrol")
        assert "\x00" not in result
        assert "\x1f" not in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
