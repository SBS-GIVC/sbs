"""
NPHIES Configuration Module
===========================

Environment-specific configuration for NPHIES API integration.
Supports development, sandbox, and production environments.
"""

import os
from typing import Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class Environment(str, Enum):
    """NPHIES environment types"""
    DEVELOPMENT = "development"
    SANDBOX = "sandbox"
    PRODUCTION = "production"


@dataclass
class NPHIESConfig:
    """NPHIES configuration for a specific environment"""
    
    # Environment identification
    environment: Environment
    
    # API endpoints
    base_url: str
    auth_url: str
    
    # Authentication
    client_id: str
    client_secret: str
    api_key: Optional[str] = None  # For backward compatibility
    
    # Timeouts and limits
    timeout: int = 30
    max_retries: int = 3
    rate_limit_per_minute: int = 100
    
    # Token management
    token_expiry_buffer: int = 300  # Refresh token 5 minutes before expiry
    token_cache_ttl: int = 3600  # Cache tokens for 1 hour
    
    # Certificate settings
    certificate_path: Optional[str] = None
    certificate_password: Optional[str] = None
    verify_ssl: bool = True
    
    # Headers
    default_headers: Dict[str, str] = None
    
    def __post_init__(self):
        """Initialize default values"""
        if self.default_headers is None:
            self.default_headers = {
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json",
                "X-Request-ID": "",  # Will be populated per request
                "X-Facility-ID": "FAC-DEFAULT"  # Will be overridden per request
            }
    
    @property
    def is_development(self) -> bool:
        """Check if this is a development environment"""
        return self.environment == Environment.DEVELOPMENT
    
    @property
    def is_sandbox(self) -> bool:
        """Check if this is a sandbox environment"""
        return self.environment == Environment.SANDBOX
    
    @property
    def is_production(self) -> bool:
        """Check if this is a production environment"""
        return self.environment == Environment.PRODUCTION
    
    def validate(self) -> bool:
        """Validate configuration"""
        errors = []
        
        # Check required fields
        if not self.base_url:
            errors.append("base_url is required")
        if not self.auth_url and not self.is_development:
            errors.append("auth_url is required for non-development environments")
        if not self.client_id and not self.is_development:
            errors.append("client_id is required for non-development environments")
        if not self.client_secret and not self.is_development:
            errors.append("client_secret is required for non-development environments")
        
        # Validate URLs
        if self.base_url and not self.base_url.startswith(("http://", "https://")):
            errors.append(f"base_url must start with http:// or https://: {self.base_url}")
        if self.auth_url and not self.auth_url.startswith(("http://", "https://")):
            errors.append(f"auth_url must start with http:// or https://: {self.auth_url}")
        
        # Validate timeouts
        if self.timeout <= 0:
            errors.append(f"timeout must be positive: {self.timeout}")
        if self.max_retries < 0:
            errors.append(f"max_retries must be non-negative: {self.max_retries}")
        
        if errors:
            logger.error(f"Configuration validation failed: {errors}")
            return False
        
        return True
    
    def get_endpoint(self, path: str) -> str:
        """Get full endpoint URL for a given path"""
        # Remove leading slash if present
        if path.startswith("/"):
            path = path[1:]
        
        return f"{self.base_url}/{path}"
    
    def get_auth_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """Get authentication headers"""
        headers = self.default_headers.copy()
        
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        elif self.api_key and self.is_development:
            # For backward compatibility with simple API key
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        return headers


class ConfigManager:
    """Manages NPHIES configuration across environments"""
    
    # Default configurations
    DEFAULT_CONFIGS = {
        Environment.DEVELOPMENT: NPHIESConfig(
            environment=Environment.DEVELOPMENT,
            base_url="http://localhost:8006",  # Local bridge
            auth_url="",
            client_id="",
            client_secret="",
            api_key="sandbox-key-123",
            timeout=30,
            max_retries=3,
            rate_limit_per_minute=1000,  # Higher limit for development
            verify_ssl=False
        ),
        
        Environment.SANDBOX: NPHIESConfig(
            environment=Environment.SANDBOX,
            base_url="https://sandbox.nphies.sa/api/v1",
            auth_url="https://auth.sandbox.nphies.sa/oauth/token",
            client_id="",  # Should be set via environment variables
            client_secret="",  # Should be set via environment variables
            timeout=30,
            max_retries=3,
            rate_limit_per_minute=100,
            verify_ssl=True
        ),
        
        Environment.PRODUCTION: NPHIESConfig(
            environment=Environment.PRODUCTION,
            base_url="https://api.nphies.sa/api/v1",
            auth_url="https://auth.nphies.sa/oauth/token",
            client_id="",  # Should be set via environment variables
            client_secret="",  # Should be set via environment variables
            timeout=60,
            max_retries=5,
            rate_limit_per_minute=50,  # Lower limit for production
            verify_ssl=True
        )
    }
    
    def __init__(self):
        self._current_config: Optional[NPHIESConfig] = None
        self._load_from_environment()
    
    def _load_from_environment(self) -> None:
        """Load configuration from environment variables"""
        # Determine environment
        env_str = os.getenv("NPHIES_ENV", "development").lower()
        try:
            environment = Environment(env_str)
        except ValueError:
            logger.warning(f"Invalid NPHIES_ENV value: {env_str}. Using development.")
            environment = Environment.DEVELOPMENT
        
        # Get base configuration
        config = self.DEFAULT_CONFIGS[environment].__dict__.copy()
        
        # Override with environment variables
        env_mappings = {
            "NPHIES_BASE_URL": "base_url",
            "NPHIES_AUTH_URL": "auth_url",
            "NPHIES_CLIENT_ID": "client_id",
            "NPHIES_CLIENT_SECRET": "client_secret",
            "NPHIES_API_KEY": "api_key",
            "NPHIES_TIMEOUT": "timeout",
            "NPHIES_MAX_RETRIES": "max_retries",
            "NPHIES_RATE_LIMIT": "rate_limit_per_minute",
            "NPHIES_CERT_PATH": "certificate_path",
            "NPHIES_CERT_PASSWORD": "certificate_password",
            "NPHIES_VERIFY_SSL": "verify_ssl"
        }
        
        for env_var, config_key in env_mappings.items():
            env_value = os.getenv(env_var)
            if env_value is not None:
                # Convert types based on expected type
                if config_key in ["timeout", "max_retries", "rate_limit_per_minute"]:
                    try:
                        config[config_key] = int(env_value)
                    except ValueError:
                        logger.warning(f"Invalid integer value for {env_var}: {env_value}")
                elif config_key == "verify_ssl":
                    config[config_key] = env_value.lower() in ["true", "1", "yes", "y"]
                else:
                    config[config_key] = env_value
        
        # Create config object - remove environment from config dict since we're passing it explicitly
        config_dict = {k: v for k, v in config.items() if k in NPHIESConfig.__annotations__}
        # Remove 'environment' from config_dict since we're passing it as a separate parameter
        config_dict.pop('environment', None)
        
        self._current_config = NPHIESConfig(
            environment=environment,
            **config_dict
        )
        
        # Validate
        if not self._current_config.validate():
            logger.error("Configuration validation failed. Using development defaults.")
            self._current_config = self.DEFAULT_CONFIGS[Environment.DEVELOPMENT]
    
    @property
    def config(self) -> NPHIESConfig:
        """Get current configuration"""
        if self._current_config is None:
            self._load_from_environment()
        return self._current_config
    
    @property
    def environment(self) -> Environment:
        """Get current environment"""
        return self.config.environment
    
    def get_config_for_environment(self, environment: Environment) -> NPHIESConfig:
        """Get configuration for a specific environment"""
        return self.DEFAULT_CONFIGS[environment]
    
    def reload(self) -> None:
        """Reload configuration from environment"""
        self._load_from_environment()
        logger.info(f"Configuration reloaded. Environment: {self.environment}")


# Global configuration manager instance
config_manager = ConfigManager()


def get_config() -> NPHIESConfig:
    """Get current NPHIES configuration"""
    return config_manager.config


def get_environment() -> Environment:
    """Get current environment"""
    return config_manager.environment


def is_development() -> bool:
    """Check if current environment is development"""
    return get_config().is_development


def is_sandbox() -> bool:
    """Check if current environment is sandbox"""
    return get_config().is_sandbox


def is_production() -> bool:
    """Check if current environment is production"""
    return get_config().is_production


def reload_config() -> None:
    """Reload configuration from environment"""
    config_manager.reload()


# Example usage
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Get current configuration
    cfg = get_config()
    print(f"Environment: {cfg.environment}")
    print(f"Base URL: {cfg.base_url}")
    print(f"Auth URL: {cfg.auth_url}")
    print(f"Timeout: {cfg.timeout}s")
    print(f"Max Retries: {cfg.max_retries}")
    print(f"Rate Limit: {cfg.rate_limit_per_minute}/minute")
    print(f"SSL Verification: {cfg.verify_ssl}")
    
    # Validate configuration
    if cfg.validate():
        print("✅ Configuration is valid")
    else:
        print("❌ Configuration validation failed")