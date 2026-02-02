import os
from services.normalizer import ai_fallback
import importlib.util
import sys
import requests

def load_ai_assistant_module():
    spec = importlib.util.spec_from_file_location("ai_assistant", "./normalizer-service/ai_assistant.py")
    assert spec is not None, "Failed to create spec for ai_assistant"
    ai_assistant = importlib.util.module_from_spec(spec)
    assert ai_assistant is not None
    sys.modules[spec.name] = ai_assistant
    assert spec.loader is not None
    spec.loader.exec_module(ai_assistant)
    return ai_assistant

class DummyResp:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status
    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError()
    def json(self):
        return self._payload


def test_deepseek_smoke(monkeypatch):
    # Simulate enabling DeepSeek via env and having its API key
    monkeypatch.setenv('AI_PROVIDER', 'deepseek')
    monkeypatch.setenv('DEEPSEEK_API_KEY', 'sk-test-deepseek')
    monkeypatch.setenv('ENABLE_DEEPSEEK', 'true')

    called = {}

    def fake_post(url, json=None, headers=None, timeout=None):
        called['url'] = url
        called['headers'] = headers
        return DummyResp({'sbs_mapped_code': 'SBS-999', 'confidence': 0.93, 'description': 'ok'})

    monkeypatch.setattr('requests.post', fake_post)

    # Load the ai_assistant module after environment is set so it reads current env
    ai_assistant = load_ai_assistant_module()

    res = ai_assistant.query_ai_for_mapping('X99', 'Some descr')

    assert isinstance(res, dict)
    # ensure the mock was called and returned the expected key
    assert res.get('sbs_mapped_code') == 'SBS-999'
    assert 'Authorization' in called['headers']
