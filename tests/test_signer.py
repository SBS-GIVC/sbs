"""
Test Suite for Signer Service
"""

import pytest
import requests
import json

BASE_URL = "http://localhost:8001"


def test_health_check():
    """Test service health endpoint"""
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200


def test_generate_test_certificate():
    """Test certificate generation for sandbox"""
    response = requests.post(f"{BASE_URL}/generate-test-cert?facility_id=1")
    assert response.status_code in [200, 403]  # 403 if in production mode
    
    if response.status_code == 200:
        data = response.json()
        assert data["status"] == "success"


def test_verify_certificate():
    """Test certificate verification"""
    response = requests.get(f"{BASE_URL}/verify-certificate/1")
    assert response.status_code == 200
    data = response.json()
    assert "facility_id" in data
    assert "status" in data


def test_sign_payload():
    """Test payload signing"""
    # First generate test cert
    requests.post(f"{BASE_URL}/generate-test-cert?facility_id=1")
    
    # Then sign a payload
    payload = {
        "payload": {
            "resourceType": "Claim",
            "status": "active",
            "id": "test-123"
        },
        "facility_id": 1
    }
    
    response = requests.post(f"{BASE_URL}/sign", json=payload)
    
    if response.status_code == 200:
        data = response.json()
        assert "signature" in data
        assert "algorithm" in data
        assert data["algorithm"] == "SHA256withRSA"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
