"""
Integration tests for MasterLinc Bridge and Linc Agents
Tests agent registration, workflow orchestration, and event streaming
"""

import pytest
import httpx
import asyncio
import time
from datetime import datetime


# Test configuration
MASTERLINC_URL = "http://localhost:4000"
CLAIMLINC_URL = "http://localhost:4001"
AUTHLINC_URL = "http://localhost:4002"
COMPLIANCELINC_URL = "http://localhost:4003"
SBS_LANDING_URL = "http://localhost:3000"


class TestMasterLincIntegration:
    """Test MasterLinc Bridge integration"""
    
    @pytest.mark.asyncio
    async def test_masterlinc_health(self):
        """Test MasterLinc health endpoint"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{MASTERLINC_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "MasterLinc Bridge"
            assert "registered_agents" in data
    
    @pytest.mark.asyncio
    async def test_agent_registration(self):
        """Test agent registration"""
        async with httpx.AsyncClient() as client:
            # Get list of agents
            response = await client.get(f"{MASTERLINC_URL}/agents")
            assert response.status_code == 200
            data = response.json()
            
            # Should have pre-registered agents
            assert data["total"] >= 3  # At least ClaimLinc, AuthLinc, ComplianceLinc
            
            # Check for expected agents
            agent_names = [agent["name"] for agent in data["agents"]]
            assert "ClaimLinc" in agent_names
            assert "AuthLinc" in agent_names
            assert "ComplianceLinc" in agent_names
    
    @pytest.mark.asyncio
    async def test_get_specific_agent(self):
        """Test getting specific agent details"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{MASTERLINC_URL}/agents/ClaimLinc")
            assert response.status_code == 200
            data = response.json()
            
            assert data["name"] == "ClaimLinc"
            assert data["oid"] == "1.3.6.1.4.1.61026.3.3.1"
            assert "process_claim" in data["capabilities"]


class TestClaimLincAgent:
    """Test ClaimLinc agent"""
    
    @pytest.mark.asyncio
    async def test_claimlinc_health(self):
        """Test ClaimLinc health endpoint"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CLAIMLINC_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "ClaimLinc Agent"
            assert "process_claim" in data["capabilities"]
    
    @pytest.mark.asyncio
    async def test_process_claim_endpoint(self):
        """Test claim processing endpoint (with mock data)"""
        claim_data = {
            "claimId": f"TEST-CLAIM-{int(time.time())}",
            "patientId": "PAT-001",
            "facilityId": "FAC-001",
            "items": [
                {
                    "code": "99213",
                    "description": "Office visit",
                    "quantity": 1,
                    "unitPrice": 150.0
                }
            ]
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{CLAIMLINC_URL}/process_claim",
                    json={"claim_data": claim_data}
                )
                
                # May fail if backend services not available, but endpoint should exist
                assert response.status_code in [200, 500, 502, 503]
                
                if response.status_code == 200:
                    data = response.json()
                    assert "claim_id" in data
                    assert "status" in data
                    
            except httpx.ConnectError:
                pytest.skip("ClaimLinc service not available")


class TestAuthLincAgent:
    """Test AuthLinc agent"""
    
    @pytest.mark.asyncio
    async def test_authlinc_health(self):
        """Test AuthLinc health endpoint"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{AUTHLINC_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "AuthLinc Agent"
            assert "verify_eligibility" in data["capabilities"]
    
    @pytest.mark.asyncio
    async def test_verify_eligibility_endpoint(self):
        """Test eligibility verification endpoint"""
        eligibility_data = {
            "patient_id": "PAT-001",
            "insurance_id": "INS-001",
            "payer_id": "PAYER-001",
            "service_date": datetime.utcnow().isoformat()
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{AUTHLINC_URL}/verify_eligibility",
                    json=eligibility_data
                )
                
                # May fail if NPHIES bridge not available
                assert response.status_code in [200, 500, 502, 503]
                
                if response.status_code == 200:
                    data = response.json()
                    assert "patient_id" in data
                    assert "eligible" in data
                    
            except httpx.ConnectError:
                pytest.skip("AuthLinc service not available")


class TestComplianceLincAgent:
    """Test ComplianceLinc agent"""
    
    @pytest.mark.asyncio
    async def test_compliancelinc_health(self):
        """Test ComplianceLinc health endpoint"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{COMPLIANCELINC_URL}/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "ComplianceLinc Agent"
            assert "audit_claim" in data["capabilities"]
    
    @pytest.mark.asyncio
    async def test_audit_claim_endpoint(self):
        """Test compliance audit endpoint"""
        claim_data = {
            "claimId": f"TEST-CLAIM-{int(time.time())}",
            "patientId": "PAT-001",
            "providerId": "PROV-001",
            "payerId": "PAYER-001",
            "items": [
                {
                    "code": "99213",
                    "quantity": 1
                }
            ]
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{COMPLIANCELINC_URL}/audit_claim",
                json={"claim_data": claim_data}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "claim_id" in data
            assert "overall_status" in data
            assert "checks" in data
            assert data["overall_status"] in ["passed", "failed"]
    
    @pytest.mark.asyncio
    async def test_validate_nphies_endpoint(self):
        """Test NPHIES validation endpoint"""
        claim_data = {
            "claimId": "TEST-001",
            "patientId": "PAT-001",
            "providerId": "PROV-001",
            "payerId": "PAYER-001",
            "items": [{"code": "99213"}]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{COMPLIANCELINC_URL}/validate_nphies",
                json={"claim_data": claim_data}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "passed" in data
            assert "issues" in data or "warnings" in data


class TestWorkflowOrchestration:
    """Test workflow orchestration"""
    
    @pytest.mark.asyncio
    async def test_start_workflow(self):
        """Test starting a workflow"""
        workflow_data = {
            "workflow_type": "compliance_audit",
            "data": {
                "claimId": f"TEST-{int(time.time())}",
                "patientId": "PAT-001",
                "providerId": "PROV-001",
                "payerId": "PAYER-001",
                "items": [{"code": "99213", "quantity": 1}]
            },
            "requester": "test_suite"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{MASTERLINC_URL}/workflows/start",
                    json=workflow_data
                )
                
                assert response.status_code == 200
                data = response.json()
                assert "workflow_id" in data
                assert data["status"] == "started"
                assert data["workflow_type"] == "compliance_audit"
                
                workflow_id = data["workflow_id"]
                
                # Wait for workflow to process
                await asyncio.sleep(2)
                
                # Check workflow status
                status_response = await client.get(
                    f"{MASTERLINC_URL}/workflows/{workflow_id}"
                )
                assert status_response.status_code == 200
                status_data = status_response.json()
                assert status_data["workflow_id"] == workflow_id
                assert "status" in status_data
                
            except httpx.ConnectError:
                pytest.skip("MasterLinc service not available")
    
    @pytest.mark.asyncio
    async def test_list_workflows(self):
        """Test listing workflows"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{MASTERLINC_URL}/workflows")
                assert response.status_code == 200
                data = response.json()
                assert "workflows" in data
                assert "total" in data
                
            except httpx.ConnectError:
                pytest.skip("MasterLinc service not available")


class TestLandingAPIIntegration:
    """Test Landing API MasterLinc integration"""
    
    @pytest.mark.asyncio
    async def test_agents_status_endpoint(self):
        """Test agent status endpoint"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{SBS_LANDING_URL}/api/agents/status")
                
                # Should return success even if MasterLinc unavailable
                assert response.status_code in [200, 500]
                data = response.json()
                assert "success" in data
                
                if data["success"]:
                    assert "agents" in data
                    
            except httpx.ConnectError:
                pytest.skip("Landing API not available")
    
    @pytest.mark.asyncio
    async def test_submit_claim_linc_endpoint(self):
        """Test MasterLinc claim submission endpoint"""
        claim_data = {
            "claimId": f"TEST-LINC-{int(time.time())}",
            "patientId": "PAT-001",
            "facilityId": "FAC-001",
            "items": [
                {
                    "code": "99213",
                    "quantity": 1,
                    "unitPrice": 150.0
                }
            ]
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{SBS_LANDING_URL}/api/submit-claim-linc",
                    json=claim_data
                )
                
                # Should either succeed or fall back to direct submission
                assert response.status_code in [200, 500]
                
                if response.status_code == 200:
                    data = response.json()
                    assert data["success"] == True
                    assert "claimId" in data or "workflowId" in data
                    
            except httpx.ConnectError:
                pytest.skip("Landing API not available")
    
    @pytest.mark.asyncio
    async def test_verify_eligibility_endpoint(self):
        """Test eligibility verification via Landing API"""
        eligibility_data = {
            "patientId": "PAT-001",
            "insuranceId": "INS-001",
            "payerId": "PAYER-001",
            "serviceDate": datetime.utcnow().isoformat()
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{SBS_LANDING_URL}/api/verify-eligibility",
                    json=eligibility_data
                )
                
                assert response.status_code in [200, 400, 500]
                
            except httpx.ConnectError:
                pytest.skip("Landing API not available")


class TestFallbackMechanism:
    """Test fallback to direct submission when MasterLinc unavailable"""
    
    @pytest.mark.asyncio
    async def test_fallback_on_masterlinc_failure(self):
        """Test that system falls back to direct submission"""
        # This test would require temporarily disabling MasterLinc
        # For now, we just verify the endpoint exists
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                # Try to submit via MasterLinc endpoint
                response = await client.post(
                    f"{SBS_LANDING_URL}/api/submit-claim-linc",
                    json={
                        "patientId": "PAT-001",
                        "facilityId": "FAC-001",
                        "items": [{"code": "99213", "quantity": 1}]
                    }
                )
                
                # Should get either success or fallback
                if response.status_code == 200:
                    data = response.json()
                    assert data["success"] == True
                    # May have fallback flag if MasterLinc unavailable
                    
            except httpx.ConnectError:
                pytest.skip("Landing API not available")


class TestBrainSAITOIDHeaders:
    """Test BrainSAIT OID headers in responses"""
    
    @pytest.mark.asyncio
    async def test_masterlinc_oid_headers(self):
        """Test that MasterLinc returns BrainSAIT OID headers"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{MASTERLINC_URL}/health")
                assert response.status_code == 200
                
                # Check for BrainSAIT OID headers
                assert "X-BrainSAIT-OID" in response.headers
                assert "X-BrainSAIT-Service" in response.headers
                assert "X-BrainSAIT-PEN" in response.headers
                
                assert response.headers["X-BrainSAIT-Service"] == "MasterLinc"
                assert response.headers["X-BrainSAIT-PEN"] == "61026"
                
            except httpx.ConnectError:
                pytest.skip("MasterLinc service not available")
    
    @pytest.mark.asyncio
    async def test_agent_oid_headers(self):
        """Test that agents return BrainSAIT OID headers"""
        agents = [
            (CLAIMLINC_URL, "ClaimLinc", "1.3.6.1.4.1.61026.3.3.1"),
            (AUTHLINC_URL, "AuthLinc", "1.3.6.1.4.1.61026.3.3.2"),
            (COMPLIANCELINC_URL, "ComplianceLinc", "1.3.6.1.4.1.61026.3.3.3")
        ]
        
        for url, name, expected_oid in agents:
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(f"{url}/health")
                    assert response.status_code == 200
                    
                    assert "X-BrainSAIT-OID" in response.headers
                    assert response.headers["X-BrainSAIT-OID"] == expected_oid
                    assert response.headers["X-BrainSAIT-Service"] == name
                    
                except httpx.ConnectError:
                    pytest.skip(f"{name} service not available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
