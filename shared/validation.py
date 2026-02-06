"""
Shared Validation Module
Common input validation utilities for SBS services
"""

import re
from typing import Any, List, Optional
from datetime import datetime


def validate_email(email: str) -> bool:
    """
    Validate email address format.
    
    Args:
        email: Email address to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone(phone: str) -> bool:
    """
    Validate phone number format (Saudi Arabia format).
    
    Args:
        phone: Phone number to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not phone:
        return False
    # Saudi phone numbers: +966 or 05 followed by 8 digits
    pattern = r'^(\+966|966|05)\d{8}$'
    return bool(re.match(pattern, phone.replace(' ', '').replace('-', '')))


def validate_national_id(national_id: str) -> bool:
    """
    Validate Saudi national ID format.
    
    Args:
        national_id: National ID to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not national_id:
        return False
    # Saudi national ID: 10 digits starting with 1 or 2
    pattern = r'^[12]\d{9}$'
    return bool(re.match(pattern, national_id))


def validate_date_format(date_str: str, format_str: str = "%Y-%m-%d") -> bool:
    """
    Validate date string format.
    
    Args:
        date_str: Date string to validate
        format_str: Expected date format
        
    Returns:
        True if valid, False otherwise
    """
    if not date_str:
        return False
    try:
        datetime.strptime(date_str, format_str)
        return True
    except ValueError:
        return False


def validate_required_fields(data: dict, required_fields: List[str]) -> tuple[bool, Optional[str]]:
    """
    Validate that all required fields are present in data.
    
    Args:
        data: Dictionary to validate
        required_fields: List of required field names
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    missing_fields = [field for field in required_fields if field not in data or data[field] is None]
    
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    return True, None


def validate_numeric_range(value: Any, min_val: Optional[float] = None, max_val: Optional[float] = None) -> tuple[bool, Optional[str]]:
    """
    Validate that a numeric value is within specified range.
    
    Args:
        value: Value to validate
        min_val: Minimum allowed value (inclusive)
        max_val: Maximum allowed value (inclusive)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        num_value = float(value)
    except (TypeError, ValueError):
        return False, f"Value must be numeric, got: {type(value).__name__}"
    
    if min_val is not None and num_value < min_val:
        return False, f"Value {num_value} is below minimum {min_val}"
    
    if max_val is not None and num_value > max_val:
        return False, f"Value {num_value} exceeds maximum {max_val}"
    
    return True, None


def validate_string_length(value: str, min_length: Optional[int] = None, max_length: Optional[int] = None) -> tuple[bool, Optional[str]]:
    """
    Validate string length.
    
    Args:
        value: String to validate
        min_length: Minimum allowed length
        max_length: Maximum allowed length
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(value, str):
        return False, f"Value must be a string, got: {type(value).__name__}"
    
    length = len(value)
    
    if min_length is not None and length < min_length:
        return False, f"String length {length} is below minimum {min_length}"
    
    if max_length is not None and length > max_length:
        return False, f"String length {length} exceeds maximum {max_length}"
    
    return True, None


def sanitize_input(value: str) -> str:
    """
    Sanitize user input by removing potentially dangerous characters.
    
    Args:
        value: Input string to sanitize
        
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        return value
    
    # Remove control characters
    value = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', value)
    
    # Remove script tags
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove potential SQL injection patterns
    value = re.sub(r'(--|;|\/\*|\*\/)', '', value)
    
    return value.strip()


def validate_claim_amount(amount: Any) -> tuple[bool, Optional[str]]:
    """
    Validate claim amount is positive and within reasonable bounds.
    
    Args:
        amount: Amount to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    return validate_numeric_range(amount, min_val=0.01, max_val=10000000.0)
