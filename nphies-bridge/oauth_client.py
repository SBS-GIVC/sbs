"""
Simple OAuth2 Client for NPHIES Bridge Integration Tests
"""

import asyncio
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

# Handle both relative and absolute imports
try:
    # Try relative import first (when run as part of package)
    from .config import get_config
except ImportError:
    # Fall back to absolute import (when run directly)
    from config import get_config


class OAuth2Client:
    """Simple OAuth2 client for testing"""
    
    def __init__(self):
        self.config = get_config()
        self._access_token = "test-access-token"
    
    async def get_valid_token(self) -> str:
        """Get a valid access token (simulated for testing)"""
        return self._access_token
    
    async def make_authenticated_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make authenticated request (simulated for testing)"""
        return {
            "status": "success",
            "method": method,
            "endpoint": endpoint,
            "simulated": True,
            "environment": self.config.environment.value
        }
    
    async def post_fhir_resource(
        self,
        resource_type: str,
        fhir_payload: Dict[str, Any],
        signature: Optional[str] = None
    ) -> Dict[str, Any]:
        """Post FHIR resource (simulated for testing)"""
        return {
            "status": "success",
            "resource_type": resource_type,
            "simulated": True,
            "timestamp": datetime.now().isoformat()
        }


# Global OAuth2 client instance
_oauth_client: Optional[OAuth2Client] = None


def get_oauth_client() -> OAuth2Client:
    """Get or create global OAuth2 client instance"""
    global _oauth_client
    if _oauth_client is None:
        _oauth_client = OAuth2Client()
    return _oauth_client


class TokenInfo:
    """Simple token info for testing"""
    def __init__(self):
        self.access_token = "test-token"
        self.token_type = "Bearer"
        self.expires_in = 3600
        self.obtained_at = datetime.utcnow()
    
    @property
    def is_expired(self) -> bool:
        return False
