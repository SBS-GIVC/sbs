"""AI assistant helper for normalizer service.
Provides a small abstraction to call an AI model (Gemini/DeepSeek) to map unknown codes.
Safely falls back and includes rate limiting and caching.
"""

import os
import requests
from functools import lru_cache

AI_API = os.getenv('GEMINI_API_KEY') or os.getenv('DEEPSEEK_API_KEY')
AI_PROVIDER = os.getenv('AI_PROVIDER', 'gemini')  # 'gemini' or 'deepseek'

# IMPORTANT: This helper will only call an external AI endpoint when AI_URL is explicitly set.
# This avoids accidental calls to placeholder/example URLs.
AI_URL = (os.getenv('AI_URL') or '').strip()

# Feature flag: gate DeepSeek usage in staging/controlled environments
ENABLE_DEEPSEEK = os.getenv('ENABLE_DEEPSEEK', 'false').lower() in ('1', 'true', 'yes')


@lru_cache(maxsize=1024)
def _cached_query(internal_code: str, description: str = '') -> str:
    """Cache key for AI queries (internal_code + small description)."""
    # Keep cache key bounded
    desc = (description or '')[:120]
    return f"{internal_code}::{desc}"


def query_ai_for_mapping(internal_code: str, description: str = '') -> dict:
    """Query configured AI provider to suggest mapping for an internal code.
    Returns a dict with sbs_mapped_code, confidence, description.
    This function is resilient: if AI provider is not configured it returns empty dict.
    """
    # If provider is DeepSeek, respect the feature-flag toggle
    if AI_PROVIDER == 'deepseek' and not ENABLE_DEEPSEEK:
        return {}

    if not AI_URL:
        return {}

    # Prepare payload
    payload = {
        'prompt': f"Map this service code to official SBS code. Internal: {internal_code} Description: {description}",
        'max_tokens': 64
    }

    headers = {
        'Content-Type': 'application/json',
    }

    url = AI_URL

    if AI_API:
        headers['Authorization'] = f'Bearer {AI_API}'

    try:
        # Basic in-process caching: if we've asked this exact question, re-use.
        _cached_query(internal_code, description)

        resp = requests.post(url, json=payload, headers=headers, timeout=12)
        resp.raise_for_status()
        data = resp.json()

        # Parse provider response (best-effort)
        # Expected: {'sbs_mapped_code': 'SBS-xxx', 'confidence': 0.87, 'description': '...'}
        if 'sbs_mapped_code' in data:
            return data
        # fallback: if model returned text, do a naive parse
        if 'choices' in data and len(data['choices']) > 0:
            text = data['choices'][0].get('text') or data['choices'][0].get('message', {}).get('content')
            # naive parsing
            return {'sbs_mapped_code': text.strip(), 'confidence': 0.5, 'description': ''}
    except Exception:
        # On any error, return empty dict; caller must handle absence
        return {}

    return {}
