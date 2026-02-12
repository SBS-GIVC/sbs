"""
Service-to-Service Authentication Module
Provides internal API key validation for microservices
"""

import os
from typing import Optional
from fastapi import HTTPException, Request, status
from functools import wraps
import hashlib
import hmac
import time


# Load internal API key from environment
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY")
INTERNAL_API_KEY_HASH = os.getenv("INTERNAL_API_KEY_HASH")

# Public endpoints that don't require authentication
PUBLIC_ENDPOINTS = ["/health", "/ready", "/metrics", "/", "/docs", "/redoc", "/openapi.json"]


def verify_api_key(api_key: str) -> bool:
    """
    Verify API key against stored key or hash
    
    Args:
        api_key: The API key to verify
        
    Returns:
        True if valid, False otherwise
    """
    if not api_key:
        return False
    
    # Direct comparison if key is set
    if INTERNAL_API_KEY:
        return hmac.compare_digest(api_key, INTERNAL_API_KEY)
    
    # Hash comparison if hash is set
    if INTERNAL_API_KEY_HASH:
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        return hmac.compare_digest(key_hash, INTERNAL_API_KEY_HASH)
    
    # If no key is configured, allow access (development mode)
    return True


def is_public_endpoint(path: str) -> bool:
    """Check if endpoint is public (doesn't require auth)"""
    return any(path.startswith(public) or path == public for public in PUBLIC_ENDPOINTS)


async def verify_service_auth(request: Request) -> bool:
    """
    Verify internal service-to-service authentication
    
    Args:
        request: FastAPI request object
        
    Returns:
        True if authenticated
        
    Raises:
        HTTPException: If authentication fails
    """
    # Skip auth for public endpoints
    if is_public_endpoint(request.url.path):
        return True
    
    # Get API key from header
    api_key = request.headers.get("X-Internal-API-Key")
    
    # If no internal key is configured, allow access (dev mode)
    if not INTERNAL_API_KEY and not INTERNAL_API_KEY_HASH:
        # Log warning in production
        if os.getenv("ENV", "development") == "production":
            print("WARNING: No INTERNAL_API_KEY configured in production!")
        return True
    
    # Verify API key
    if not verify_api_key(api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Unauthorized: Invalid or missing internal API key",
                "error_code": "UNAUTHORIZED",
                "hint": "Add X-Internal-API-Key header with valid key"
            }
        )
    
    return True


def require_service_auth(func):
    """
    Decorator to require service authentication on specific endpoints
    
    Usage:
        @app.get("/protected")
        @require_service_auth
        async def protected_endpoint():
            return {"message": "Success"}
    """
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        await verify_service_auth(request)
        return await func(request, *args, **kwargs)
    return wrapper


class ServiceAuthMiddleware:
    """
    Middleware for service-to-service authentication
    
    Usage:
        from shared.service_auth import ServiceAuthMiddleware
        
        @app.middleware("http")
        async def auth_middleware(request: Request, call_next):
            return await ServiceAuthMiddleware.process(request, call_next)
    """
    
    @staticmethod
    async def process(request: Request, call_next):
        """
        Process authentication for incoming requests
        
        Args:
            request: FastAPI request
            call_next: Next middleware/handler
            
        Returns:
            Response from next handler
            
        Raises:
            HTTPException: If authentication fails
        """
        # Verify authentication
        await verify_service_auth(request)
        
        # Continue to next handler
        response = await call_next(request)
        return response


def generate_api_key(length: int = 32) -> str:
    """
    Generate a secure random API key
    
    Args:
        length: Length of the key in bytes (default: 32)
        
    Returns:
        Hex-encoded API key
        
    Usage:
        key = generate_api_key()
        print(f"INTERNAL_API_KEY={key}")
    """
    import secrets
    return secrets.token_hex(length)


def hash_api_key(api_key: str) -> str:
    """
    Generate SHA-256 hash of API key for storage
    
    Args:
        api_key: The API key to hash
        
    Returns:
        Hex-encoded SHA-256 hash
        
    Usage:
        key = "your-api-key"
        key_hash = hash_api_key(key)
        print(f"INTERNAL_API_KEY_HASH={key_hash}")
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


# Example usage and testing
if __name__ == "__main__":
    # Generate new API key
    new_key = generate_api_key()
    print(f"\nGenerated API Key:")
    print(f"INTERNAL_API_KEY={new_key}")
    print(f"\nOr use hashed version (more secure):")
    print(f"INTERNAL_API_KEY_HASH={hash_api_key(new_key)}")
    print(f"\nAdd to .env file and share key securely with services")
