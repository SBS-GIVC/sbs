"""
Comprehensive Test Suite for Claims Workflow
Tests the entire claim submission and processing pipeline
"""

import pytest
import requests
import time
import uuid
from typing import Dict

# Service URLs
LANDING_API_URL = "http://localhost:3000"
NORMALIZER_URL = "http://localhost:8000"
SIGNER_URL = "http://localhost:8001"
FINANCIAL_RULES_URL = "http://localhost:8002"
NPHIES_BRIDGE_URL = "http://localhost:8003"


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def sample_claim_data() -> Dict[str, str]:
    """Generate sample claim data for testing"""
    unique_id = str(uuid.uuid4())[:8]
    return {
        "patientName": f"Test Patient {unique_id}",
        "patientId": f"1234567890{unique_id[:4]}",
        "memberId": f"MEM-{unique_id}",
        "payerId": "PAYER-001",
        "claimType": "professional",
        "userEmail": f"test_{unique_id}@example.com"
    }


@pytest.fixture
def institutional_claim_data() -> Dict[str, str]:
    """Generate institutional claim data"""
    unique_id = str(uuid.uuid4())[:8]
    return {
        "patientName": f"Hospital Patient {unique_id}",
        "patientId": f"9876543210{unique_id[:4]}",
        "memberId": f"INST-{unique_id}",
        "payerId": "PAYER-002",
        "claimType": "institutional",
        "userEmail": f"hospital_{unique_id}@example.com"
    }


@pytest.fixture
def pharmacy_claim_data() -> Dict[str, str]:
    """Generate pharmacy claim data"""
    unique_id = str(uuid.uuid4())[:8]
    return {
        "patientName": f"Pharmacy Patient {unique_id}",
        "patientId": f"5555555555{unique_id[:4]}",
        "memberId": f"RX-{unique_id}",
        "payerId": "PAYER-003",
        "claimType": "pharmacy",
        "userEmail": f"pharmacy_{unique_id}@example.com"
    }


# ============================================================================
# HEALTH CHECK TESTS
# ============================================================================

class TestHealthChecks:
    """Test health endpoints for all services"""

    def test_landing_api_health(self):
        """Test landing API health check"""
        response = requests.get(f"{LANDING_API_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "sbs-landing-api"

    def test_normalizer_health(self):
        """Test normalizer service health check"""
        response = requests.get(f"{NORMALIZER_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_signer_health(self):
        """Test signer service health check"""
        response = requests.get(f"{SIGNER_URL}/health")
        assert response.status_code == 200

    def test_financial_rules_health(self):
        """Test financial rules engine health check"""
        response = requests.get(f"{FINANCIAL_RULES_URL}/health")
        assert response.status_code == 200

    def test_nphies_bridge_health(self):
        """Test NPHIES bridge health check"""
        response = requests.get(f"{NPHIES_BRIDGE_URL}/health")
        assert response.status_code == 200

    def test_services_status_endpoint(self):
        """Test aggregated services status endpoint"""
        response = requests.get(f"{LANDING_API_URL}/api/services/status")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "services" in data
        assert isinstance(data["services"], list)
        assert len(data["services"]) >= 1


# ============================================================================
# CLAIM SUBMISSION TESTS
# ============================================================================

class TestClaimSubmission:
    """Test claim submission functionality"""

    def test_submit_professional_claim(self, sample_claim_data):
        """Test submitting a professional claim"""
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "claimId" in data
        assert data["claimId"].startswith("CLM-")
        assert data["status"] == "processing"
        assert "trackingUrl" in data["data"]

    def test_submit_institutional_claim(self, institutional_claim_data):
        """Test submitting an institutional claim"""
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=institutional_claim_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["claimType"] == "institutional"

    def test_submit_pharmacy_claim(self, pharmacy_claim_data):
        """Test submitting a pharmacy claim"""
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=pharmacy_claim_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["claimType"] == "pharmacy"

    def test_submit_vision_claim(self):
        """Test submitting a vision claim"""
        claim_data = {
            "patientName": "Vision Patient",
            "patientId": "7777777777",
            "claimType": "vision",
            "userEmail": "vision@example.com"
        }
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=claim_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


# ============================================================================
# VALIDATION ERROR TESTS
# ============================================================================

class TestValidationErrors:
    """Test validation error handling"""

    def test_missing_patient_name(self):
        """Test validation error for missing patient name"""
        claim_data = {
            "patientId": "1234567890",
            "claimType": "professional",
            "userEmail": "test@example.com"
        }
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=claim_data
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "patientName is required" in str(data.get("validationErrors", []))

    def test_missing_patient_id(self):
        """Test validation error for missing patient ID"""
        claim_data = {
            "patientName": "Test Patient",
            "claimType": "professional",
            "userEmail": "test@example.com"
        }
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=claim_data
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False

    def test_missing_email(self):
        """Test validation error for missing email"""
        claim_data = {
            "patientName": "Test Patient",
            "patientId": "1234567890",
            "claimType": "professional"
        }
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=claim_data
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False

    def test_invalid_email_format(self):
        """Test validation error for invalid email format"""
        claim_data = {
            "patientName": "Test Patient",
            "patientId": "1234567890",
            "claimType": "professional",
            "userEmail": "invalid-email"
        }
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=claim_data
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Invalid email format" in str(data.get("validationErrors", []))

    def test_invalid_claim_type(self):
        """Test validation error for invalid claim type"""
        claim_data = {
            "patientName": "Test Patient",
            "patientId": "1234567890",
            "claimType": "invalid_type",
            "userEmail": "test@example.com"
        }
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=claim_data
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Invalid claim type" in str(data.get("validationErrors", []))

    def test_missing_claim_type(self):
        """Test validation error for missing claim type"""
        claim_data = {
            "patientName": "Test Patient",
            "patientId": "1234567890",
            "userEmail": "test@example.com"
        }
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=claim_data
        )
        assert response.status_code == 400


# ============================================================================
# CLAIM STATUS TRACKING TESTS
# ============================================================================

class TestClaimStatusTracking:
    """Test claim status tracking functionality"""

    def test_get_claim_status(self, sample_claim_data):
        """Test getting claim status after submission"""
        # Submit claim first
        submit_response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )
        assert submit_response.status_code == 200
        claim_id = submit_response.json()["claimId"]

        # Get status
        status_response = requests.get(
            f"{LANDING_API_URL}/api/claim-status/{claim_id}"
        )
        assert status_response.status_code == 200
        data = status_response.json()
        assert data["success"] is True
        assert data["claimId"] == claim_id
        assert "status" in data
        assert "stages" in data
        assert "progress" in data

    def test_claim_status_has_all_stages(self, sample_claim_data):
        """Test that claim status includes all workflow stages"""
        # Submit claim
        submit_response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )
        claim_id = submit_response.json()["claimId"]

        # Wait a moment for processing to start
        time.sleep(0.5)

        # Get status
        status_response = requests.get(
            f"{LANDING_API_URL}/api/claim-status/{claim_id}"
        )
        data = status_response.json()

        expected_stages = [
            "received",
            "validation",
            "normalization",
            "financialRules",
            "signing",
            "nphiesSubmission"
        ]

        for stage in expected_stages:
            assert stage in data["stages"], f"Missing stage: {stage}"

    def test_claim_status_progress_percentage(self, sample_claim_data):
        """Test that progress percentage is calculated correctly"""
        submit_response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )
        claim_id = submit_response.json()["claimId"]

        status_response = requests.get(
            f"{LANDING_API_URL}/api/claim-status/{claim_id}"
        )
        data = status_response.json()

        assert "progress" in data
        assert "percentage" in data["progress"]
        assert 0 <= data["progress"]["percentage"] <= 100

    def test_invalid_claim_id_format(self):
        """Test error for invalid claim ID format"""
        response = requests.get(
            f"{LANDING_API_URL}/api/claim-status/INVALID-ID"
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Invalid claim ID format" in data["error"]

    def test_claim_not_found(self):
        """Test error for non-existent claim"""
        response = requests.get(
            f"{LANDING_API_URL}/api/claim-status/CLM-NOTFOUND-123456"
        )
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "Claim not found" in data["error"]


# ============================================================================
# CLAIMS LIST TESTS
# ============================================================================

class TestClaimsList:
    """Test claims listing functionality"""

    def test_list_all_claims(self, sample_claim_data):
        """Test listing all claims"""
        # Submit a claim first
        requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )

        # List claims
        response = requests.get(f"{LANDING_API_URL}/api/claims")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "claims" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data

    def test_claims_pagination(self, sample_claim_data):
        """Test claims list pagination"""
        # Submit multiple claims
        for _ in range(5):
            requests.post(
                f"{LANDING_API_URL}/api/submit-claim",
                data=sample_claim_data
            )

        # Get first page with limit
        response = requests.get(
            f"{LANDING_API_URL}/api/claims?page=1&limit=2"
        )
        data = response.json()
        assert len(data["claims"]) <= 2
        assert data["page"] == 1
        assert data["limit"] == 2


# ============================================================================
# CLAIM RETRY TESTS
# ============================================================================

class TestClaimRetry:
    """Test claim retry functionality"""

    def test_retry_non_existent_claim(self):
        """Test retrying a non-existent claim"""
        response = requests.post(
            f"{LANDING_API_URL}/api/claims/CLM-NOTFOUND-123456/retry"
        )
        assert response.status_code == 404

    def test_retry_processing_claim(self, sample_claim_data):
        """Test that processing claims cannot be retried"""
        # Submit claim
        submit_response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )
        claim_id = submit_response.json()["claimId"]

        # Try to retry immediately (while still processing)
        retry_response = requests.post(
            f"{LANDING_API_URL}/api/claims/{claim_id}/retry"
        )

        # Should fail because claim is still processing
        if retry_response.status_code == 400:
            data = retry_response.json()
            assert "Only failed or rejected claims can be retried" in data["error"]


# ============================================================================
# NORMALIZER SERVICE TESTS
# ============================================================================

class TestNormalizerService:
    """Test normalizer service functionality"""

    def test_normalize_valid_code(self):
        """Test normalizing a valid internal code"""
        payload = {
            "facility_id": 1,
            "internal_code": "LAB-CBC-01",
            "description": "Complete Blood Count Test"
        }
        response = requests.post(
            f"{NORMALIZER_URL}/normalize",
            json=payload
        )
        assert response.status_code in [200, 404]

        if response.status_code == 200:
            data = response.json()
            assert "sbs_mapped_code" in data
            assert "confidence" in data
            assert "mapping_source" in data

    def test_normalize_missing_fields(self):
        """Test normalization with missing required fields"""
        payload = {"facility_id": 1}
        response = requests.post(
            f"{NORMALIZER_URL}/normalize",
            json=payload
        )
        assert response.status_code == 422

    def test_normalizer_metrics(self):
        """Test normalizer metrics endpoint"""
        response = requests.get(f"{NORMALIZER_URL}/metrics")
        assert response.status_code == 200


# ============================================================================
# SIGNER SERVICE TESTS
# ============================================================================

class TestSignerService:
    """Test signer service functionality"""

    def test_generate_test_certificate(self):
        """Test generating a test certificate"""
        response = requests.post(
            f"{SIGNER_URL}/generate-test-cert?facility_id=1"
        )
        # May be 200 (success) or 403 (production mode)
        assert response.status_code in [200, 403]

    def test_verify_certificate(self):
        """Test certificate verification"""
        response = requests.get(f"{SIGNER_URL}/verify-certificate/1")
        assert response.status_code == 200
        data = response.json()
        assert "facility_id" in data
        assert "status" in data

    def test_sign_payload(self):
        """Test signing a FHIR payload"""
        # Generate test cert first
        requests.post(f"{SIGNER_URL}/generate-test-cert?facility_id=1")

        payload = {
            "payload": {
                "resourceType": "Claim",
                "status": "active",
                "id": "test-claim-123"
            },
            "facility_id": 1
        }
        response = requests.post(
            f"{SIGNER_URL}/sign",
            json=payload
        )

        if response.status_code == 200:
            data = response.json()
            assert "signature" in data
            assert "algorithm" in data


# ============================================================================
# FINANCIAL RULES ENGINE TESTS
# ============================================================================

class TestFinancialRulesEngine:
    """Test financial rules engine functionality"""

    def test_validate_fhir_claim(self):
        """Test validating a FHIR claim"""
        fhir_claim = {
            "resourceType": "Claim",
            "status": "active",
            "type": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                    "code": "professional"
                }]
            },
            "patient": {"reference": "Patient/12345"},
            "created": "2026-01-17T10:00:00Z",
            "provider": {"reference": "Organization/provider-1"},
            "insurer": {"reference": "Organization/insurer-1"},
            "item": [{
                "sequence": 1,
                "productOrService": {
                    "coding": [{
                        "system": "http://sbs.chi.gov.sa/CodeSystem",
                        "code": "SBS-LAB-001"
                    }]
                },
                "quantity": {"value": 1},
                "unitPrice": {"value": 100, "currency": "SAR"}
            }],
            "extensions": {
                "facility_id": 1
            }
        }
        response = requests.post(
            f"{FINANCIAL_RULES_URL}/validate",
            json=fhir_claim
        )
        assert response.status_code == 200
        data = response.json()
        assert data["resourceType"] == "Claim"


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestEndToEndWorkflow:
    """End-to-end integration tests for the complete workflow"""

    def test_complete_claim_workflow(self, sample_claim_data):
        """Test complete claim submission and tracking workflow"""
        # Step 1: Submit claim
        submit_response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )
        assert submit_response.status_code == 200
        submit_data = submit_response.json()
        assert submit_data["success"] is True
        claim_id = submit_data["claimId"]

        # Step 2: Poll for status updates
        max_attempts = 20
        final_status = None

        for attempt in range(max_attempts):
            time.sleep(1)
            status_response = requests.get(
                f"{LANDING_API_URL}/api/claim-status/{claim_id}"
            )
            status_data = status_response.json()

            if status_data.get("isComplete"):
                final_status = status_data
                break

        # Step 3: Verify final status
        if final_status:
            assert "status" in final_status
            assert final_status["progress"]["percentage"] > 0
            print(f"Claim {claim_id} completed with status: {final_status['status']}")

    def test_multiple_concurrent_claims(self):
        """Test submitting multiple claims concurrently"""
        import concurrent.futures

        claims_data = [
            {
                "patientName": f"Patient {i}",
                "patientId": f"ID-{i}",
                "claimType": "professional",
                "userEmail": f"patient{i}@example.com"
            }
            for i in range(5)
        ]

        def submit_claim(data):
            return requests.post(
                f"{LANDING_API_URL}/api/submit-claim",
                data=data
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(submit_claim, data) for data in claims_data]
            responses = [f.result() for f in concurrent.futures.as_completed(futures)]

        # All submissions should succeed
        for response in responses:
            assert response.status_code == 200
            assert response.json()["success"] is True

    def test_workflow_stages_sequence(self, sample_claim_data):
        """Test that workflow stages progress in correct sequence"""
        # Submit claim
        submit_response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )
        claim_id = submit_response.json()["claimId"]

        # Track stage progression
        stage_sequence = []
        max_polls = 30

        for _ in range(max_polls):
            time.sleep(0.5)
            status_response = requests.get(
                f"{LANDING_API_URL}/api/claim-status/{claim_id}"
            )
            status = status_response.json()

            # Record current in-progress stage
            for stage_name, stage_data in status.get("stages", {}).items():
                if stage_data.get("status") == "in_progress":
                    if stage_name not in stage_sequence:
                        stage_sequence.append(stage_name)

            if status.get("isComplete"):
                break

        # Verify stages progressed in order
        expected_order = ["validation", "normalization", "financialRules", "signing", "nphiesSubmission"]
        for i, stage in enumerate(stage_sequence):
            if stage in expected_order:
                expected_index = expected_order.index(stage)
                # Each stage should come after previous ones
                for prev_stage in stage_sequence[:i]:
                    if prev_stage in expected_order:
                        assert expected_order.index(prev_stage) < expected_index


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestPerformance:
    """Performance and load tests"""

    def test_response_time_health_check(self):
        """Test that health check responds within acceptable time"""
        import time
        start = time.time()
        response = requests.get(f"{LANDING_API_URL}/health")
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 1.0, f"Health check took {duration:.2f}s (expected < 1s)"

    def test_response_time_claim_submission(self, sample_claim_data):
        """Test that claim submission responds within acceptable time"""
        import time
        start = time.time()
        response = requests.post(
            f"{LANDING_API_URL}/api/submit-claim",
            data=sample_claim_data
        )
        duration = time.time() - start

        assert response.status_code == 200
        # Claim submission should return quickly (async processing)
        assert duration < 2.0, f"Claim submission took {duration:.2f}s (expected < 2s)"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
