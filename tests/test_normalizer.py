"""
Test Suite for Normalizer Service
"""

import pytest
import requests
import json

BASE_URL = "http://localhost:8000"


def test_health_check():
    """Test service health endpoint"""
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_normalize_with_local_mapping():
    """Test normalization with existing local mapping"""
    payload = {
        "facility_id": 1,
        "internal_code": "LAB-CBC-01",
        "description": "Complete Blood Count Test"
    }
    
    response = requests.post(f"{BASE_URL}/normalize", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "sbs_mapped_code" in data
    assert "official_description" in data
    assert "confidence" in data
    assert data["mapping_source"] in ["manual", "ai", "ai_cached"]


def test_normalize_invalid_facility():
    """Test normalization with invalid facility"""
    payload = {
        "facility_id": 99999,
        "internal_code": "INVALID-001",
        "description": "Invalid service"
    }
    
    response = requests.post(f"{BASE_URL}/normalize", json=payload)
    # Should either return 404 or AI suggestion
    assert response.status_code in [200, 404]


def test_normalize_missing_fields():
    """Test validation with missing required fields"""
    payload = {
        "facility_id": 1
        # Missing internal_code and description
    }
    
    response = requests.post(f"{BASE_URL}/normalize", json=payload)
    assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
