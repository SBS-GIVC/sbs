"""
Comprehensive tests for the /normalize endpoint
Tests database lookup, AI fallback, error handling, and metrics
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the app (will need to handle DB connection mocking)
@pytest.fixture
def mock_db_pool():
    """Mock database pool to avoid real connections"""
    with patch('normalizer_service.main.db_pool') as mock_pool:
        yield mock_pool


@pytest.fixture
def client(mock_db_pool):
    """Create test client with mocked dependencies"""
    # Import after mocking to ensure mocks are in place
    from normalizer_service.main import app
    return TestClient(app)


class TestNormalizeEndpoint:
    """Test suite for POST /normalize endpoint"""
    
    def test_normalize_success_database_hit(self, client):
        """Test successful normalization with database hit"""
        # Mock database lookup to return a result
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.return_value = {
                'sbs_code': 'SBS-123-456',
                'sbs_description': 'Standard Medical Procedure'
            }
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "PROC-001",
                "description": "Test procedure"
            })
            
            assert response.status_code == 200
            data = response.json()
            
            assert data['sbs_code'] == 'SBS-123-456'
            assert data['sbs_description'] == 'Standard Medical Procedure'
            assert data['confidence'] == 1.0
            assert data['source'] == 'database'
            assert data['cached'] == True
    
    def test_normalize_success_ai_fallback(self, client):
        """Test successful normalization with AI fallback when not in database"""
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            # Database returns None (not found)
            mock_lookup.return_value = None
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "UNKNOWN-CODE",
                "description": "Unknown procedure"
            })
            
            assert response.status_code == 200
            data = response.json()
            
            # AI fallback should return pending code
            assert data['sbs_code'].startswith('SBS-PENDING-')
            assert data['confidence'] < 1.0
            assert data['source'] == 'ai'
            assert data['cached'] == False
    
    def test_normalize_missing_facility_id(self, client):
        """Test validation error when facility_id is missing"""
        response = client.post("/normalize", json={
            "internal_code": "PROC-001"
        })
        
        assert response.status_code == 422  # Validation error
        data = response.json()
        assert 'detail' in data
    
    def test_normalize_missing_internal_code(self, client):
        """Test validation error when internal_code is missing"""
        response = client.post("/normalize", json={
            "facility_id": 1
        })
        
        assert response.status_code == 422
    
    def test_normalize_invalid_facility_id(self, client):
        """Test validation error with invalid facility_id type"""
        response = client.post("/normalize", json={
            "facility_id": "invalid",
            "internal_code": "PROC-001"
        })
        
        assert response.status_code == 422
    
    def test_normalize_database_error(self, client):
        """Test error handling when database lookup fails"""
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            # Simulate database error
            mock_lookup.side_effect = Exception("Database connection failed")
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "PROC-001"
            })
            
            assert response.status_code == 500
            data = response.json()
            assert 'detail' in data
            assert 'error' in data['detail']
            assert 'error_id' in data['detail']
            assert data['detail']['error_code'] == 'NORMALIZER_PROCESSING_ERROR'
    
    def test_normalize_with_description(self, client):
        """Test normalization with optional description"""
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.return_value = {
                'sbs_code': 'SBS-789-012',
                'sbs_description': 'Consultation'
            }
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "CONSULT-01",
                "description": "Initial consultation"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data['sbs_code'] == 'SBS-789-012'
    
    def test_normalize_metrics_tracking(self, client):
        """Test that metrics are properly tracked"""
        from normalizer_service.main import metrics
        
        # Reset metrics
        initial_total = metrics.get("requests_total", 0)
        initial_success = metrics.get("requests_success", 0)
        
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.return_value = {
                'sbs_code': 'SBS-999-888',
                'sbs_description': 'Test'
            }
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "TEST-001"
            })
            
            assert response.status_code == 200
            
            # Check metrics increased
            assert metrics["requests_total"] > initial_total
            assert metrics["requests_success"] > initial_success
    
    def test_normalize_cache_hit_tracking(self, client):
        """Test cache hit metric tracking"""
        from normalizer_service.main import metrics
        
        initial_hits = metrics.get("cache_hits", 0)
        
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.return_value = {
                'sbs_code': 'SBS-111-222',
                'sbs_description': 'Cached result'
            }
            
            client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "CACHED-CODE"
            })
            
            assert metrics["cache_hits"] > initial_hits
    
    def test_normalize_cache_miss_tracking(self, client):
        """Test cache miss and AI call metric tracking"""
        from normalizer_service.main import metrics
        
        initial_misses = metrics.get("cache_misses", 0)
        initial_ai_calls = metrics.get("ai_calls", 0)
        
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            # No database result = cache miss + AI call
            mock_lookup.return_value = None
            
            client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "NOT-IN-DB"
            })
            
            assert metrics["cache_misses"] > initial_misses
            assert metrics["ai_calls"] > initial_ai_calls


class TestNormalizeResponseSchema:
    """Test response schema validation"""
    
    def test_response_has_all_required_fields(self, client):
        """Verify response contains all required fields"""
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.return_value = {
                'sbs_code': 'SBS-TEST',
                'sbs_description': 'Test Description'
            }
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "TEST"
            })
            
            data = response.json()
            
            # Check all required fields exist
            assert 'sbs_code' in data
            assert 'sbs_description' in data
            assert 'confidence' in data
            assert 'source' in data
            assert 'cached' in data
    
    def test_confidence_score_range(self, client):
        """Test confidence score is between 0 and 1"""
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.return_value = None  # AI fallback
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "TEST"
            })
            
            data = response.json()
            assert 0.0 <= data['confidence'] <= 1.0
    
    def test_source_is_valid_enum(self, client):
        """Test source is either 'database' or 'ai'"""
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.return_value = {
                'sbs_code': 'SBS-TEST',
                'sbs_description': 'Test'
            }
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "TEST"
            })
            
            data = response.json()
            assert data['source'] in ['database', 'ai']


class TestNormalizeErrorHandling:
    """Test error handling and error response format"""
    
    def test_error_response_structure(self, client):
        """Test error responses follow standardized format"""
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.side_effect = Exception("Test error")
            
            response = client.post("/normalize", json={
                "facility_id": 1,
                "internal_code": "TEST"
            })
            
            assert response.status_code == 500
            data = response.json()
            
            # Check standardized error structure
            assert 'detail' in data
            detail = data['detail']
            assert 'error' in detail
            assert 'error_code' in detail
            assert 'error_id' in detail
    
    def test_error_logging(self, client, caplog):
        """Test that errors are properly logged"""
        with patch('normalizer_service.main.lookup_code_in_database') as mock_lookup:
            mock_lookup.side_effect = Exception("Database error")
            
            with caplog.at_level('ERROR'):
                response = client.post("/normalize", json={
                    "facility_id": 1,
                    "internal_code": "TEST"
                })
            
            # Check error was logged
            assert "Normalization error" in caplog.text or "error" in caplog.text.lower()


@pytest.mark.integration
class TestNormalizeIntegration:
    """Integration tests (require actual database)"""
    
    @pytest.mark.skip(reason="Requires database setup")
    def test_normalize_with_real_database(self):
        """Test normalization with real database connection"""
        # This would be run in CI/CD with actual database
        pass
    
    @pytest.mark.skip(reason="Requires AI service")
    def test_normalize_with_real_ai_service(self):
        """Test normalization with real AI service"""
        # This would test actual AI integration
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
