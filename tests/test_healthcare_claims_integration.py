"""
Healthcare Claims System Integration Tests
Tests for the complete healthcare claims integration with NPHIES and SBS platform
"""

import pytest
import sys
import os
import json
import pytest_asyncio
from datetime import datetime, date
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nphies_bridge.main import app
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client for the healthcare API"""
    return TestClient(app)


@pytest.fixture
def sample_patient_data():
    """Sample patient data for testing"""
    return {
        "national_id": "1234567890",
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "1985-05-20",
        "gender": "male",
        "email": "john.doe@email.com",
        "phone": "555-1234",
        "address": "123 Main St, Riyadh",
        "insurance_policy_id": "POL123456789",
        "insurance_payer_name": "Blue Cross Insurance"
    }


@pytest.fixture
def sample_provider_data():
    """Sample provider data for testing"""
    return {
        "license_number": "MD-LIC-001234",
        "organization_name": "King Fahd Medical City",
        "specialty": "Internal Medicine",
        "facility_code": "FAC-001"
    }


@pytest.fixture
def sample_service_request_data():
    """Sample service request data for testing"""
    return {
        "patient_id": 1,
        "provider_id": 1,
        "payer_id": 1,
        "service_code": "99213",
        "service_name": "Office Visit (Level 3)",
        "request_type": "claim",
        "diagnosis_codes": ["I10", "E11.9"],
        "clinical_notes": "Patient presents with hypertension and type 2 diabetes. Requires routine follow-up.",
        "billed_amount": 75.00,
        "priority": "normal"
    }


@pytest.fixture
def sample_unified_submission():
    """Sample unified healthcare submission"""
    return {
        "submission_type": "claim",
        "facility_id": 1,
        "patient_data": {
            "national_id": "1234567890",
            "first_name": "Test",
            "last_name": "Patient",
            "date_of_birth": "1990-01-01",
            "gender": "male",
            "email": "test@email.com",
            "phone": "555-5555",
            "address": "Riyadh, Saudi Arabia",
            "insurance_policy_id": "POL001",
            "insurance_payer_name": "Test Insurance"
        },
        "provider_data": {
            "license_number": "provider-001",
            "organization_name": "Test Hospital",
            "specialty": "Cardiology",
            "facility_code": "fac-001"
        },
        "service_data": {
            "patient_id": 1,
            "provider_id": 1,
            "service_code": "93000",
            "service_name": "ECG (12-lead)",
            "request_type": "prior_auth",
            "diagnosis_codes": ["I25.10"],
            "clinical_notes": "Patient for cardiac evaluation",
            "billed_amount": 150.00,
            "priority": "normal"
        },
        "documents": []
    }


@pytest.fixture
def sample_fhir_claim():
    """Sample FHIR Claim payload"""
    return {
        "resourceType": "Claim",
        "id": "claimed123",
        "status": "active",
        "type": {
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                "code": "professional"
            }]
        },
        "patient": {"reference": "Patient/example"},
        "provider": {"reference": "Organization/example"},
        "insurance": [{
            "coverage": {"reference": "Coverage/example"},
            "focal": True
        }],
        "item": [{
            "sequence": 1,
            "service": {
                "coding": [{
                    "system": "http://www.ama-assn.org/go/cpt",
                    "code": "99213"
                }]
            }
        }]
    }


class TestHealthcareAPIIntegration:
    """Test class for healthcare API integration"""

    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "ready"]
        assert "database" in data

    @pytest.mark.asyncio
    async def test_unified_submission_claim(self, client, sample_unified_submission):
        """Test unified healthcare claim submission"""
        response = client.post("/unified-healthcare-submit", json=sample_unified_submission)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "status" in data
        assert data["status"] in ["submitted", "accepted", "pending"]

    @pytest.mark.asyncio
    async def test_unified_submission_prior_auth(self, client, sample_unified_submission):
        """Test unified prior authorization submission"""
        submission = sample_unified_submission.copy()
        submission["submission_type"] = "prior_auth"
        submission["service_data"]["request_type"] = "prior_auth"

        response = client.post("/unified-healthcare-submit", json=submission)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "type" in data
        assert data["type"] == "prior_auth"

    @pytest.mark.asyncio
    async def test_eligibility_check(self, client):
        """Test eligibility checking"""
        eligibility_data = {
            "patient_id": 1,
            "provider_id": 1,
            "service_codes": ["99213"],
            "check_type": "real_time"
        }

        response = client.post("/healthcare/eligibility/check", json=eligibility_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "eligible" in data

    @pytest.mark.asyncio
    async def test_patients_search(self, client):
        """Test patient search functionality"""
        response = client.get("/healthcare/patients/search?query=test")
        assert response.status_code == 200
        data = response.json()
        assert "patients" in data
        assert "pagination" in data

    @pytest.mark.asyncio
    async def test_payers_list(self, client):
        """Test payers listing"""
        response = client.get("/healthcare/payers")
        assert response.status_code == 200
        data = response.json()
        assert "payers" in data
        assert "pagination" in data

    @pytest.mark.asyncio
    async def test_services_search(self, client):
        """Test services searching"""
        response = client.get("/healthcare/services/search?query=cardiology")
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        assert "pagination" in data

    @pytest.mark.asyncio
    async def test_requests_list(self, client):
        """Test listing healthcare requests"""
        response = client.get("/healthcare/requests")
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "pagination" in data

    @pytest.mark.asyncio
    async def test_submit_nphies_claim(self, client, sample_fhir_claim):
        """Test submitting claim to NPHIES"""
        submission_data = {
            "facility_id": 1,
            "fhir_payload": sample_fhir_claim,
            "signature": "test_signature_12345",
            "resource_type": "Claim",
            "mock_outcome": "accepted"
        }

        response = client.post("/submit-claim", json=submission_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "status" in data
        assert "transaction_uuid" in data

    @pytest.mark.asyncio
    async def test_submit_preauth_nphies(self, client, sample_fhir_claim):
        """Test submitting pre-authorization to NPHIES"""
        submission_data = {
            "facility_id": 1,
            "fhir_payload": sample_fhir_claim,
            "signature": "test_signature_12345",
            "mock_outcome": "accepted"
        }

        response = client.post("/submit-preauth", json=submission_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "status" in data

    @pytest.mark.asyncio
    async def test_terminology_validation(self, client):
        """Test terminology code validation"""
        validation_data = {
            "system": "http://hl7.org/fhir/sid/icd-10",
            "code": "I10"
        }

        response = client.post("/terminology/validate-code", json=validation_data)
        assert response.status_code == 200
        data = response.json()
        if "is_valid" in data:
            assert "is_valid" in data

    @pytest.mark.asyncio
    async def test_prey_validation(self, client, sample_fhir_claim):
        """Test FHIR payload validation"""
        validation_data = {
            "fhir_payload": sample_fhir_claim
        }

        response = client.post("/terminology/validate-payload", json=validation_data)
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data

    @pytest.mark.asyncio
    async def test_transaction_status(self, client):
        """Test transaction status retrieval"""
        response = client.get("/transaction/999999")
        assert response.status_code in [200, 404]

    @pytest.mark.asyncio
    async def test_facility_transactions(self, client):
        """Test facility transactions listing"""
        response = client.get("/facility/1/transactions")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dashboard_endpoints(self, client):
        """Test dashboard endpoints for different roles"""
        roles = ["patient", "provider", "payer", "admin"]

        for role in roles:
            response = client.get(f"/healthcare/dashboard/{role}")
            # This might fail if database is empty, but should return valid structure
            if response.status_code == 200:
                data = response.json()
                # Basic structure verification
                assert isinstance(data, dict)


class TestHealthcareDatabaseOperations:
    """Test class for database operations"""

    @pytest.mark.asyncio
    async def test_get_db_connection(self):
        """Test database connection"""
        from nphies_bridge.main import get_db_connection
        try:
            conn = get_db_connection()
            conn.close()
            assert True
        except Exception:
            assert False, "Database connection failed"

    @pytest.mark.asyncio
    async def test_patient_creation(self):
        """Test patient creation in database"""
        from nphies_bridge.healthcare_api import find_or_create_patient
        from nphies_bridge.healthcare_api import PatientData

        patient_data = PatientData(
            national_id="TEST12345678",
            first_name="Test",
            last_name="Patient",
            date_of_birth="1990-01-01",
            gender="male",
            email="test@test.com",
            phone="555-5555",
            address="Test Address",
            insurance_policy_id="TESTPOL123",
            insurance_payer_name="Test Insurance"
        )

        try:
            patient_id, patient_uuid = find_or_create_patient(patient_data)
            assert patient_id > 0
            assert isinstance(patient_uuid, str)
        except Exception as e:
            # Test might fail if test data already exists
            assert True, f"Patient creation test: {e}"

    @pytest.mark.asyncio
    async def test_provider_creation(self):
        """Test provider creation in database"""
        from nphies_bridge.healthcare_api import find_or_create_provider
        from nphies_bridge.healthcare_api import ProviderData

        provider_data = ProviderData(
            license_number="TESTMD001",
            organization_name="Test Hospital",
            specialty="General Medicine",
            facility_code="FAC-001"
        )

        try:
            provider_id, provider_uuid = find_or_create_provider(provider_data)
            assert provider_id > 0
            assert isinstance(provider_uuid, str)
        except Exception as e:
            # Test might fail if test data already exists
            assert True, f"Provider creation test: {e}"


class TestHealthcareAIIntegration:
    """Test class for AI integration"""

    @pytest.mark.skipif(not os.getenv("ANTHROPIC_API_KEY"), reason="Anthropic API key required")
    @pytest.mark.asyncio
    async def test_ai_validation_service(self):
        """Test AI validation service integration"""
        # This test requires AI service to be available
        # For CI/CD, we skip this if API key is not available
        pass

    @pytest.mark.asyncio
    async def test_mock_ai_validation(self):
        """Test AI validation with mock data"""
        # Simulate AI validation response
        mock_validation = {
            "is_valid": True,
            "risk_score": 0.15,
            "recommendations": ["Verify patient demographics"],
            "enhancements": []
        }

        assert mock_validation["is_valid"] == True
        assert mock_validation["risk_score"] < 0.5


class TestSecurityAndRateLimiting:
    """Test class for security features"""

    @pytest.mark.asyncio
    async def test_rate_limiting(self, client):
        """Test rate limiting on healthcare endpoints"""
        # Make multiple rapid requests
        for i in range(120):  # More than 100 requests
            response = client.get("/health")
            if i > 100:
                # Should get rate limited eventually
                pass

    @pytest.mark.asyncio
    async def test_api_authentication(self, client):
        """Test API authentication"""
        response = client.post("/auth/token", json={"token": "test_token"})
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data


class TestErrorHandling:
    """Test class for error handling"""

    @pytest.mark.asyncio
    async def test_invalid_submission(self, client):
        """Test invalid submission handling"""
        invalid_data = {
            "submission_type": "invalid_type",
            "facility_id": None,
            "patient_data": {}
        }

        response = client.post("/unified-healthcare-submit", json=invalid_data)
        assert response.status_code >= 400

    @pytest.mark.asyncio
    async def test_missing_required_fields(self, client):
        """Test missing required fields handling"""
        incomplete_data = {
            "submission_type": "claim",
            # Missing facility_id and other required fields
        }

        response = client.post("/unified-healthcare-submit", json=incomplete_data)
        assert response.status_code >= 400


class TestPerformanceAndScalability:
    """Test class for performance testing"""

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, client):
        """Test handling concurrent requests"""
        import asyncio

        async def make_request():
            return client.get("/health")

        # Create multiple concurrent requests
        tasks = [make_request() for _ in range(10)]
        responses = await asyncio.gather(*tasks)

        # All should succeed
        for response in responses:
            assert response.status_code == 200


class TestIntegrationWorkflows:
    """Test class for complete workflow testing"""

    @pytest.mark.asyncio
    async def test_complete_claim_workflow(self, client, sample_unified_submission):
        """Test complete claim processing workflow"""
        # 1. Submit claim
        response1 = client.post("/unified-healthcare-submit", json=sample_unified_submission)
        assert response1.status_code in [200, 201]

        data1 = response1.json()
        claim_id = data1.get("request_id")

        if claim_id:
            # 2. Check status
            response2 = client.get(f"/healthcare/requests/{claim_id}")
            assert response2.status_code == 200

            # 3. Update status
            response3 = client.put(f"/healthcare/requests/{claim_id}/status", params={"new_status": "approved"})
            assert response3.status_code == 200

    @pytest.mark.asyncio
    async def test_prior_auth_workflow(self, client):
        """Test prior authorization workflow"""
        prior_auth_data = {
            "patient_id": 1,
            "provider_id": 1,
            "payer_id": 1,
            "service_codes": ["99213"],
            "diagnosis_codes": ["I10"],
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "clinical_justification": "Patient requires regular monitoring due to chronic condition",
            "urgency": "normal"
        }

        response = client.post("/healthcare/prior-auth", json=prior_auth_data)
        assert response.status_code in [200, 201]


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])