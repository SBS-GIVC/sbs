import os
import pytest
from services.normalizer import ai_fallback


def test_local_mapping_found():
    assert ai_fallback.map_code_with_ai("I10") == "HTN-ESSENTIAL"


def test_local_mapping_not_found():
    assert ai_fallback.map_code_with_ai("UNKNOWN_CODE") is None


def test_ai_endpoint_mock(monkeypatch):
    monkeypatch.setenv("AI_FALLBACK_ENDPOINT", "https://mock-ai.example")
    monkeypatch.setenv("AI_FALLBACK_API_KEY", "fakekey")
    assert ai_fallback.map_code_with_ai("X99") == "AI_MAPPED_X99"
