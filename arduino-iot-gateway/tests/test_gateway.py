#!/usr/bin/env python3
"""
BrainSAIT Arduino IoT Gateway - Unit Tests
==========================================
Tests for the serial gateway and cloud connector.
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from serial_gateway import ArduinoCloudConnector, GatewayConfig


class TestGatewayConfig:
    """Test configuration loading."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = GatewayConfig()
        assert config.baud_rate == 115200
        assert config.buffer_size == 1024
        assert config.max_retries == 3
        assert "sbs.brainsait.cloud" in config.api_url
    
    def test_config_from_env(self):
        """Test configuration from environment variables."""
        with patch.dict('os.environ', {
            'SERIAL_PORT': '/dev/test123',
            'BAUD_RATE': '9600',
            'API_URL': 'https://test.example.com/api',
            'NODE_ID': 'TEST-NODE-001',
        }):
            config = GatewayConfig()
            assert config.serial_port == '/dev/test123'
            assert config.baud_rate == 9600
            assert config.api_url == 'https://test.example.com/api'
            assert config.node_id == 'TEST-NODE-001'


class TestArduinoCloudConnector:
    """Test the main gateway class."""
    
    @pytest.fixture
    def gateway(self):
        """Create a gateway instance with test config."""
        config = GatewayConfig()
        config.api_token = "test_token_123"
        config.api_url = "https://test.sbs.brainsait.cloud/api/v1/iot/events"
        return ArduinoCloudConnector(config)
    
    def test_enrich_payload(self, gateway):
        """Test payload enrichment with gateway metadata."""
        payload = {"event": "heartbeat", "node": "TEST-001"}
        enriched = gateway._enrich_payload(payload)
        
        assert "gateway_ts" in enriched
        assert "gateway_iso" in enriched
        assert "facility_code" in enriched
        assert enriched["gateway_node_id"] == gateway.config.node_id
    
    def test_process_valid_json_line(self, gateway):
        """Test processing a valid JSON line."""
        with patch.object(gateway, '_send_to_cloud', return_value=True):
            line = '{"event": "heartbeat", "node": "BS-EDGE-001", "ts": 12345}'
            result = gateway.process_line(line)
            
            assert result is not None
            assert result["event"] == "heartbeat"
            assert "gateway_ts" in result
    
    def test_process_invalid_json_line(self, gateway):
        """Test processing an invalid JSON line returns None."""
        result = gateway.process_line("not valid json {broken}")
        assert result is None
    
    def test_process_empty_line(self, gateway):
        """Test processing empty lines gracefully."""
        assert gateway.process_line("") is None
        assert gateway.process_line("   ") is None
        assert gateway.process_line(None) is None
    
    def test_stats_tracking(self, gateway):
        """Test that stats are tracked correctly."""
        gateway._start_time = datetime.now()
        gateway._events_sent = 10
        gateway._events_failed = 2
        
        stats = gateway.get_stats()
        
        assert stats["events_sent"] == 10
        assert stats["events_failed"] == 2
        assert stats["uptime_seconds"] > 0
        assert "sbs.brainsait.cloud" in stats["api_url"]
    
    @patch('requests.Session.post')
    def test_send_to_cloud_success(self, mock_post, gateway):
        """Test successful cloud sync."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_post.return_value = mock_response
        
        payload = {"event": "test", "node": "TEST-001"}
        result = gateway._send_to_cloud(payload)
        
        assert result is True
        assert gateway._events_sent == 1
    
    @patch('requests.Session.post')
    def test_send_to_cloud_failure(self, mock_post, gateway):
        """Test failed cloud sync."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response
        
        payload = {"event": "test", "node": "TEST-001"}
        result = gateway._send_to_cloud(payload)
        
        assert result is False
        assert gateway._events_failed == 1
    
    def test_send_to_cloud_no_token(self, gateway):
        """Test that cloud sync is skipped without token."""
        gateway.config.api_token = ""
        payload = {"event": "test"}
        result = gateway._send_to_cloud(payload)
        
        assert result is False


class TestMockServerIntegration:
    """Integration tests with mock server."""
    
    def test_full_event_flow(self):
        """Test complete event processing flow."""
        config = GatewayConfig()
        config.api_token = "test_token"
        config.api_url = "http://localhost:8000/ingest"
        
        gateway = ArduinoCloudConnector(config)
        
        # Simulate receiving a JSON line from Arduino
        test_line = json.dumps({
            "node": "BS-EDGE-001",
            "event": "temperature",
            "ts": 1707273645,
            "data": {"temp_c": 23.5, "humidity": 65}
        })
        
        with patch.object(gateway, '_send_to_cloud', return_value=True) as mock_send:
            result = gateway.process_line(test_line)
            
            assert result is not None
            assert mock_send.called
            call_args = mock_send.call_args[0][0]
            assert call_args["event"] == "temperature"
            assert call_args["data"]["temp_c"] == 23.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
