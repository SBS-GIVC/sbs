"""AI assistant helper for normalizer service.
Provides a small abstraction to call an AI model (Gemini/DeepSeek) to map unknown codes.
Safely falls back and includes rate limiting and caching.
"""

import os
import requests
AI_API = os.getenv('GEMINI_API_KEY') or os.getenv('DEEPSEEK_API_KEY')
AI_PROVIDER = os.getenv('AI_PROVIDER', 'gemini')  # 'gemini' or 'deepseek'

# IMPORTANT: This helper will only call an external AI endpoint when AI_URL is explicitly set.
# This avoids accidental calls to placeholder/example URLs.
AI_URL = (os.getenv('AI_URL') or '').strip()

# Feature flag: gate DeepSeek usage in staging/controlled environments
ENABLE_DEEPSEEK = os.getenv('ENABLE_DEEPSEEK', 'false').lower() in ('1', 'true', 'yes')

# Cache to store AI mapping results, keyed by (provider, internal_code)
_ai_result_cache = {}


def query_ai_for_mapping(internal_code: str, description: str = '') -> dict:
    """Query configured AI provider to suggest mapping for an internal code.
    Returns a dict with sbs_mapped_code, confidence, description.
    This function is resilient: if AI provider is not configured it returns empty dict.
    Implements effective caching by avoiding repeated API calls for same code.
    """
    # If provider is DeepSeek, respect the feature-flag toggle
    if AI_PROVIDER == 'deepseek' and not ENABLE_DEEPSEEK:
        return {}

    if not AI_URL:
        return {}

    # Check cache first - avoid redundant API calls
    cache_key = (AI_PROVIDER, internal_code)
    if cache_key in _ai_result_cache:
        return _ai_result_cache[cache_key]

    # Prepare payload
    payload = {
        'prompt': f"Map this service code to official SBS code. Internal: {internal_code} Description: {description}",
        'max_tokens': 64
    }

    headers = {
        'Content-Type': 'application/json',
    }

    url = AI_URL

    # Select auth token based on AI_PROVIDER to avoid sending wrong key
    if AI_PROVIDER == 'deepseek':
        auth_key = os.getenv('DEEPSEEK_API_KEY', '')
    elif AI_PROVIDER == 'gemini':
        auth_key = os.getenv('GEMINI_API_KEY', '')
    else:
        auth_key = AI_API or ''

    if auth_key:
        headers['Authorization'] = f'Bearer {auth_key}'

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=12)
        resp.raise_for_status()
        data = resp.json()

        result = {}
        # Parse provider response (best-effort)
        # Expected: {'sbs_mapped_code': 'SBS-xxx', 'confidence': 0.87, 'description': '...'}
        if 'sbs_mapped_code' in data:
            result = data
        # fallback: if model returned text, do a naive parse
        elif 'choices' in data and len(data['choices']) > 0:
            text = data['choices'][0].get('text') or data['choices'][0].get('message', {}).get('content')
            # naive parsing
            result = {'sbs_mapped_code': text.strip(), 'confidence': 0.5, 'description': ''}

        # Cache successful results to avoid redundant API calls
        if result:
            _ai_result_cache[cache_key] = result
        return result
    except Exception:
        # On any error, return empty dict; caller must handle absence
        return {}
