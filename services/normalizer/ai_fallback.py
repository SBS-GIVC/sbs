"""AI Fallback Module

Provides a simple AI-like mapping fallback for code normalization when deterministic
mappings fail. Designed to be replaceable by a real LLM service via environment
configuration (e.g., OpenAI, local LLM endpoint). Includes a mock deterministic
strategy for offline use and unit tests.
"""
from typing import Optional, Dict, Tuple
import os
import json
import logging

logger = logging.getLogger(__name__)

# Simple local mapping as a fallback (could be replaced by LLM calls)
_LOCAL_FALLBACK_MAP: Dict[str, str] = {
    "I10": "HTN-ESSENTIAL",
    "E11": "DM-II",
    "H52.4": "REFRACTION-ANOMALY",
    "Z01.0": "EYE-EXAM",
}

def _get_ai_config() -> Tuple[Optional[str], Optional[str]]:
    return os.environ.get("AI_FALLBACK_ENDPOINT"), os.environ.get("AI_FALLBACK_API_KEY")


def map_code_with_ai(code: str, context: Optional[Dict] = None) -> Optional[str]:
    """Return a normalized mapping for the given code.

    Strategy:
    - If AI endpoint/config is present, this function would call the external AI/LLM service.
    - Otherwise it falls back to a deterministic local mapping to ensure offline testability.
    """
    code_upper = code.strip().upper()

    # Prefer external AI if configured (mocked for now)
    ai_endpoint, ai_api_key = _get_ai_config()
    if ai_endpoint and ai_api_key:
        # Real implementation omitted in offline test environment; would use requests or httpx.
        logger.debug("AI endpoint configured but using mock behavior in test environment.")
        # Pretend we called the AI and it returned something sensible
        return f"AI_MAPPED_{code_upper}"

    # Local deterministic fallback
    mapped = _LOCAL_FALLBACK_MAP.get(code_upper)
    if mapped:
        logger.debug("Local AI fallback mapped %s -> %s", code_upper, mapped)
    else:
        logger.debug("Local AI fallback had no mapping for %s", code_upper)
    return mapped


if __name__ == "__main__":
    # quick manual test
    print(map_code_with_ai("I10"))
