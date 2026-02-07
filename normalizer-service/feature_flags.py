"""Feature flags for normalizer service

Controls which AI providers and features are enabled based on environment.
Recommended: enable in staging/dev, disable or carefully gate in production.
"""
import os
import logging

logger = logging.getLogger("normalizer.feature_flags")

def is_feature_enabled(feature_name: str, default: bool = False) -> bool:
    """Check if a feature flag is enabled via environment variable.
    
    Args:
        feature_name: Name of the feature (e.g., 'ENABLE_DEEPSEEK')
        default: Default value if env var not set
    
    Returns:
        True if enabled, False otherwise
    """
    raw_val = os.getenv(feature_name, '')
    env_val = raw_val.lower()
    if env_val in ('1', 'true', 'yes', 'on'):
        return True
    elif env_val in ('0', 'false', 'no', 'off'):
        return False
    if raw_val == '':
        # Visible during staging/prod debugging, but low-noise.
        logger.debug("Feature flag %s not set; using default=%s", feature_name, default)
    return default


def get_ai_provider() -> str:
    """Get the configured AI provider with staging/production gating.
    
    Returns one of: 'gemini', 'deepseek', 'disabled'
    
    Staging behavior (ENVIRONMENT=staging):
        - DeepSeek enabled by default if DEEPSEEK_API_KEY present
    
    Production behavior (ENVIRONMENT=production):
        - DeepSeek disabled by default, require explicit ENABLE_DEEPSEEK=true
        - Gemini used as fallback unless explicitly disabled
    """
    environment = os.getenv('ENVIRONMENT', 'development').lower()
    ai_provider = os.getenv('AI_PROVIDER', '').lower()
    
    # Explicit provider setting takes precedence
    if ai_provider in ('gemini', 'deepseek', 'disabled'):
        return ai_provider
    
    # Environment-based gating
    if environment == 'production':
        # Production: require explicit opt-in for DeepSeek
        if is_feature_enabled('ENABLE_DEEPSEEK', default=False):
            if os.getenv('DEEPSEEK_API_KEY'):
                return 'deepseek'
        # Fall back to Gemini if available
        if os.getenv('GEMINI_API_KEY'):
            return 'gemini'
        return 'disabled'
    
    elif environment == 'staging':
        # Staging: DeepSeek enabled by default if key present
        if os.getenv('DEEPSEEK_API_KEY'):
            return 'deepseek'
        if os.getenv('GEMINI_API_KEY'):
            return 'gemini'
        return 'disabled'
    
    else:
        # Development: use whatever is configured
        if os.getenv('DEEPSEEK_API_KEY'):
            return 'deepseek'
        if os.getenv('GEMINI_API_KEY'):
            return 'gemini'
        return 'disabled'
