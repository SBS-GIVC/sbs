"""Test feature flags and AI provider selection logic."""
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../normalizer-service'))
from feature_flags import is_feature_enabled, get_ai_provider


def test_feature_flag_enabled(monkeypatch):
    """Test feature flag detection with various truthy values."""
    monkeypatch.setenv('TEST_FEATURE', 'true')
    assert is_feature_enabled('TEST_FEATURE') is True
    
    monkeypatch.setenv('TEST_FEATURE', '1')
    assert is_feature_enabled('TEST_FEATURE') is True
    
    monkeypatch.setenv('TEST_FEATURE', 'yes')
    assert is_feature_enabled('TEST_FEATURE') is True


def test_feature_flag_disabled(monkeypatch):
    """Test feature flag detection with various falsy values."""
    monkeypatch.setenv('TEST_FEATURE', 'false')
    assert is_feature_enabled('TEST_FEATURE') is False
    
    monkeypatch.setenv('TEST_FEATURE', '0')
    assert is_feature_enabled('TEST_FEATURE') is False
    
    monkeypatch.setenv('TEST_FEATURE', 'no')
    assert is_feature_enabled('TEST_FEATURE') is False


def test_feature_flag_default(monkeypatch):
    """Test default behavior when env var not set."""
    monkeypatch.delenv('NONEXISTENT_FEATURE', raising=False)
    assert is_feature_enabled('NONEXISTENT_FEATURE', default=True) is True
    assert is_feature_enabled('NONEXISTENT_FEATURE', default=False) is False


def test_get_ai_provider_production_explicit_enable(monkeypatch):
    """In production, DeepSeek requires explicit opt-in."""
    monkeypatch.setenv('ENVIRONMENT', 'production')
    monkeypatch.setenv('DEEPSEEK_API_KEY', 'sk-test')
    monkeypatch.setenv('ENABLE_DEEPSEEK', 'true')
    
    assert get_ai_provider() == 'deepseek'


def test_get_ai_provider_production_disabled_by_default(monkeypatch):
    """In production, DeepSeek is disabled by default even if key present."""
    monkeypatch.setenv('ENVIRONMENT', 'production')
    monkeypatch.setenv('DEEPSEEK_API_KEY', 'sk-test')
    monkeypatch.delenv('ENABLE_DEEPSEEK', raising=False)
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    
    # Should return disabled since DeepSeek not explicitly enabled
    assert get_ai_provider() == 'disabled'


def test_get_ai_provider_staging_enabled_by_default(monkeypatch):
    """In staging, DeepSeek is enabled by default if key present."""
    monkeypatch.setenv('ENVIRONMENT', 'staging')
    monkeypatch.setenv('DEEPSEEK_API_KEY', 'sk-test')
    
    assert get_ai_provider() == 'deepseek'


def test_get_ai_provider_explicit_override(monkeypatch):
    """AI_PROVIDER env var takes precedence over environment gating."""
    monkeypatch.setenv('ENVIRONMENT', 'production')
    monkeypatch.setenv('AI_PROVIDER', 'deepseek')
    monkeypatch.setenv('DEEPSEEK_API_KEY', 'sk-test')
    
    # Explicit AI_PROVIDER bypasses production gating
    assert get_ai_provider() == 'deepseek'


def test_get_ai_provider_fallback_to_gemini(monkeypatch):
    """When DeepSeek unavailable, fall back to Gemini."""
    monkeypatch.setenv('ENVIRONMENT', 'production')
    monkeypatch.delenv('DEEPSEEK_API_KEY', raising=False)
    monkeypatch.setenv('GEMINI_API_KEY', 'gk-test')
    
    assert get_ai_provider() == 'gemini'
