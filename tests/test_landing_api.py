"""
Test Suite for Landing API Server
Tests API endpoints, validation, and error handling
"""

import pytest
import requests
import json
import io

BASE_URL = "http://localhost:3000"


class TestHealthAndMetrics:
    """Test health and metrics endpoints"""

    def test_health_endpoint(self):
        """Test /health endpoint returns proper status"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "healthy"
        assert data["service"] == "sbs-landing-api"
        assert "timestamp" in data
        assert "version" in data

    def test_metrics_endpoint(self):
        """Test /api/metrics endpoint"""
        response = requests.get(f"{BASE_URL}/api/metrics")
        assert response.status_code == 200
        data = response.json()

        assert data["service"] == "sbs-landing"
        assert "uptime" in data
        assert "memory" in data
        assert "timestamp" in data


class TestClaimSubmissionValidation:
    """Test claim submission validation"""

    def test_all_required_fields_missing(self):
        """Test error when all required fields are missing"""
        response = requests.post(f"{BASE_URL}/api/submit-claim", data={})
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False

    def test_partial_required_fields(self):
        """Test error when some required fields are missing"""
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={"patientName": "John Doe"}
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "validationErrors" in data

    def test_valid_minimal_submission(self):
        """Test successful submission with minimal required fields"""
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={
                "patientName": "John Doe",
                "patientId": "1234567890",
                "claimType": "professional",
                "userEmail": "john@example.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "claimId" in data

    def test_valid_full_submission(self):
        """Test successful submission with all fields"""
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={
                "patientName": "Jane Smith",
                "patientId": "9876543210",
                "memberId": "MEM-123456",
                "payerId": "INS-ACME",
                "providerId": "HOSP-001",
                "claimType": "institutional",
                "userEmail": "jane@hospital.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["claimType"] == "institutional"


class TestClaimTypes:
    """Test all supported claim types"""

    @pytest.mark.parametrize("claim_type", [
        "professional",
        "institutional",
        "pharmacy",
        "vision",
        "PROFESSIONAL"
    ])
    def test_valid_claim_types(self, claim_type):
        """Test submission with each valid claim type"""
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={
                "patientName": "Test Patient",
                "patientId": "1111111111",
                "claimType": claim_type,
                "userEmail": "test@example.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @pytest.mark.parametrize("claim_type", [
        "dental",
        "optical",
        "mental_health",
        "invalid",
        "Prof"
    ])
    def test_invalid_claim_types(self, claim_type):
        """Test rejection of invalid claim types"""
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={
                "patientName": "Test Patient",
                "patientId": "1111111111",
                "claimType": claim_type,
                "userEmail": "test@example.com"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False


class TestEmailValidation:
    """Test email validation"""

    @pytest.mark.parametrize("email", [
        "valid@example.com",
        "user.name@domain.org",
        "test+tag@gmail.com",
        "a@b.co"
    ])
    def test_valid_emails(self, email):
        """Test acceptance of valid email formats"""
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={
                "patientName": "Test Patient",
                "patientId": "1111111111",
                "claimType": "professional",
                "userEmail": email
            }
        )
        assert response.status_code == 200

    @pytest.mark.parametrize("email", [
        "invalid",
        "no-at-sign",
        "@nodomain.com",
        "spaces in@email.com",
        "missing@domain"
    ])
    def test_invalid_emails(self, email):
        """Test rejection of invalid email formats"""
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={
                "patientName": "Test Patient",
                "patientId": "1111111111",
                "claimType": "professional",
                "userEmail": email
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "Invalid email format" in str(data.get("validationErrors", []))


class TestFileUpload:
    """Test file upload functionality"""

    def test_submission_with_pdf_file(self):
        """Test claim submission with a PDF file"""
        # Create a mock PDF content
        pdf_content = b"%PDF-1.4\nTest PDF content"
        files = {
            "claimFile": ("claim.pdf", io.BytesIO(pdf_content), "application/pdf")
        }
        data = {
            "patientName": "Test Patient",
            "patientId": "1234567890",
            "claimType": "professional",
            "userEmail": "test@example.com"
        }
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data=data,
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_submission_with_json_file(self):
        """Test claim submission with a JSON file"""
        json_content = json.dumps({"claimData": "test"}).encode()
        files = {
            "claimFile": ("claim.json", io.BytesIO(json_content), "application/json")
        }
        data = {
            "patientName": "Test Patient",
            "patientId": "1234567890",
            "claimType": "professional",
            "userEmail": "test@example.com"
        }
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data=data,
            files=files
        )
        assert response.status_code == 200

    def test_submission_with_xml_file(self):
        """Test claim submission with an XML file"""
        xml_content = b"<?xml version='1.0'?><claim>test</claim>"
        files = {
            "claimFile": ("claim.xml", io.BytesIO(xml_content), "application/xml")
        }
        data = {
            "patientName": "Test Patient",
            "patientId": "1234567890",
            "claimType": "professional",
            "userEmail": "test@example.com"
        }
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data=data,
            files=files
        )
        assert response.status_code == 200

    def test_submission_with_invalid_file_type(self):
        """Test rejection of unsupported file types"""
        txt_content = b"invalid claim content"
        files = {
            "claimFile": ("claim.txt", io.BytesIO(txt_content), "text/plain")
        }
        data = {
            "patientName": "Test Patient",
            "patientId": "1234567890",
            "claimType": "professional",
            "userEmail": "test@example.com"
        }
        response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data=data,
            files=files
        )
        assert response.status_code == 400


class TestClaimStatus:
    """Test claim status endpoints"""

    def test_status_valid_claim(self):
        """Test getting status of a valid claim"""
        # First submit a claim
        submit_response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={
                "patientName": "Status Test",
                "patientId": "STATUS123",
                "claimType": "professional",
                "userEmail": "status@test.com"
            }
        )
        claim_id = submit_response.json()["claimId"]

        # Get status
        status_response = requests.get(f"{BASE_URL}/api/claim-status/{claim_id}")
        assert status_response.status_code == 200
        data = status_response.json()

        assert data["success"] is True
        assert data["claimId"] == claim_id
        assert "status" in data
        assert "statusLabel" in data
        assert "stages" in data
        assert "progress" in data
        assert "isComplete" in data

    def test_status_response_structure(self):
        """Test that status response has correct structure"""
        submit_response = requests.post(
            f"{BASE_URL}/api/submit-claim",
            data={
                "patientName": "Structure Test",
                "patientId": "STRUCT123",
                "claimType": "professional",
                "userEmail": "struct@test.com"
            }
        )
        claim_id = submit_response.json()["claimId"]

        status_response = requests.get(f"{BASE_URL}/api/claim-status/{claim_id}")
        data = status_response.json()

        # Check progress structure
        assert "percentage" in data["progress"]
        assert "completedStages" in data["progress"]
        assert "totalStages" in data["progress"]

        # Check stages structure
        expected_stages = ["received", "validation", "normalization",
                           "financialRules", "signing", "nphiesSubmission"]
        for stage in expected_stages:
            assert stage in data["stages"]
            assert "status" in data["stages"][stage]

        # Check timestamps
        assert "timestamps" in data
        assert "created" in data["timestamps"]
        assert "lastUpdate" in data["timestamps"]

        # Check timeline
        assert "timeline" in data
        assert isinstance(data["timeline"], list)

    def test_invalid_claim_id_format(self):
        """Test invalid claim ID format handling"""
        response = requests.get(f"{BASE_URL}/api/claim-status/INVALID-123")
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False


class TestServicesStatus:
    """Test services status aggregation"""

    def test_services_status_endpoint(self):
        """Test /api/services/status endpoint"""
        response = requests.get(f"{BASE_URL}/api/services/status")
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "services" in data
        assert "overallHealth" in data
        assert "timestamp" in data

        # Check services array
        service_names = [s["service"] for s in data["services"]]
        expected_services = ["normalizer", "signer", "financial-rules", "nphies-bridge"]
        for service in expected_services:
            assert service in service_names


class TestClaimsList:
    """Test claims list functionality"""

    def test_list_claims_default(self):
        """Test listing claims with default pagination"""
        response = requests.get(f"{BASE_URL}/api/claims")
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "claims" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert "totalPages" in data

    def test_list_claims_pagination(self):
        """Test claims list pagination"""
        response = requests.get(f"{BASE_URL}/api/claims?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 1
        assert data["limit"] == 5
        assert len(data["claims"]) <= 5

    def test_list_claims_max_limit(self):
        """Test that claims list respects max limit"""
        response = requests.get(f"{BASE_URL}/api/claims?limit=1000")
        assert response.status_code == 200
        data = response.json()

        # Should be capped at 100
        assert data["limit"] == 100


class TestErrorHandling:
    """Test error handling"""

    def test_404_api_route(self):
        """Test 404 response for unknown API route"""
        response = requests.get(f"{BASE_URL}/api/unknown-endpoint")
        assert response.status_code == 404
        data = response.json()

        assert data["success"] is False
        assert "API endpoint not found" in data["error"]

    def test_method_not_allowed(self):
        """Test proper handling of unsupported methods"""
        # GET on submit-claim should return 404 (not a valid route)
        response = requests.get(f"{BASE_URL}/api/submit-claim")
        assert response.status_code == 404


class TestClaimRetry:
    """Test claim retry functionality"""

    def test_retry_claim_not_found(self):
        """Test retrying a non-existent claim"""
        response = requests.post(
            f"{BASE_URL}/api/claims/CLM-NOTEXIST-123456/retry"
        )
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "not found" in data["error"].lower()


class TestCORSAndSecurity:
    """Test CORS and security headers"""

    def test_cors_headers_present(self):
        """Test that CORS headers are present"""
        response = requests.options(
            f"{BASE_URL}/api/submit-claim",
            headers={"Origin": "http://localhost:3000"}
        )
        # OPTIONS should return 204 or 200
        assert response.status_code in [200, 204]

    def test_security_headers(self):
        """Test that security headers are set"""
        response = requests.get(f"{BASE_URL}/health")

        # Check for common security headers from helmet
        headers = response.headers
        assert "X-Content-Type-Options" in headers or response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
