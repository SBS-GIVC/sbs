#!/usr/bin/env python3
"""
BrainSAIT Arduino IoT Gateway - Serial to Cloud Bridge
=======================================================
Bridges Arduino devices via USB Serial to the BrainSAIT SBS Cloud API.

Domains:
- Landing: https://brainsait.cloud
- App API: https://sbs.brainsait.cloud
- IoT Endpoint: https://sbs.brainsait.cloud/api/v1/iot/events
"""

import serial
import json
import time
import requests
import logging
import os
import signal
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# --- Try to load .env file ---
try:
    from dotenv import load_dotenv
    # Load .env from multiple possible locations
    env_paths = [
        Path(__file__).parent.parent / '.env',
        Path(__file__).parent.parent / 'config' / '.env',
        Path.home() / 'sbs' / 'arduino-iot-gateway' / '.env',
    ]
    for env_path in env_paths:
        if env_path.exists():
            load_dotenv(env_path)
            break
except ImportError:
    pass  # python-dotenv not installed, rely on system env vars

# --- Configuration Dataclass ---
@dataclass
class GatewayConfig:
    """Configuration for the BrainSAIT IoT Gateway."""
    serial_port: str = field(default_factory=lambda: os.getenv("SERIAL_PORT", "/dev/cu.usbmodem1201"))
    baud_rate: int = field(default_factory=lambda: int(os.getenv("BAUD_RATE", "115200")))
    api_url: str = field(default_factory=lambda: os.getenv("API_URL", "https://sbs.brainsait.cloud/api/v1/iot/events"))
    api_token: str = field(default_factory=lambda: os.getenv("API_TOKEN", ""))
    node_id: str = field(default_factory=lambda: os.getenv("NODE_ID", "BS-EDGE-001"))
    facility_code: str = field(default_factory=lambda: os.getenv("FACILITY_CODE", "HQ"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    buffer_size: int = 1024
    read_timeout: float = 1.0
    http_timeout: int = 5
    max_retries: int = 3
    backoff_factor: float = 1.0


class ArduinoCloudConnector:
    """
    Main gateway class that reads from Arduino serial port
    and forwards events to BrainSAIT Cloud API.
    
    Features:
    - JSON line framing (NDJSON) - handles fragmentation
    - Automatic retry with exponential backoff
    - Graceful shutdown handling
    - Event enrichment with gateway metadata
    """
    
    def __init__(self, config: Optional[GatewayConfig] = None):
        self.config = config or GatewayConfig()
        self._setup_logging()
        self._http_session = self._create_resilient_session()
        self._serial: Optional[serial.Serial] = None
        self._buffer = ""
        self._running = False
        self._events_sent = 0
        self._events_failed = 0
        self._start_time: Optional[datetime] = None
        
        # Register signal handlers
        signal.signal(signal.SIGINT, self._handle_exit)
        signal.signal(signal.SIGTERM, self._handle_exit)
    
    def _setup_logging(self):
        """Configure logging with timestamped format."""
        log_level = getattr(logging, self.config.log_level.upper(), logging.INFO)
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - [BrainSAIT-Gateway] - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        self.logger = logging.getLogger(__name__)
    
    def _create_resilient_session(self) -> requests.Session:
        """Creates a requests session with automatic retry strategy."""
        session = requests.Session()
        retry_strategy = Retry(
            total=self.config.max_retries,
            backoff_factor=self.config.backoff_factor,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session
    
    def _handle_exit(self, signum, frame):
        """Graceful shutdown handler for signals."""
        self.logger.info("Shutdown signal received. Stopping gateway...")
        self._running = False
        self.stop()
        sys.exit(0)
    
    def _enrich_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Add gateway metadata to event payload."""
        payload["gateway_ts"] = time.time()
        payload["gateway_iso"] = datetime.utcnow().isoformat() + "Z"
        payload["gateway_node_id"] = self.config.node_id
        payload["facility_code"] = self.config.facility_code
        return payload
    
    def _send_to_cloud(self, payload: Dict[str, Any]) -> bool:
        """Send enriched payload to BrainSAIT Cloud API."""
        if not self.config.api_token:
            self.logger.warning("No API_TOKEN configured. Skipping cloud sync.")
            return False
        
        headers = {
            "Authorization": f"Bearer {self.config.api_token}",
            "Content-Type": "application/json",
            "X-Gateway-Version": "1.1.0",
            "X-Node-ID": self.config.node_id,
        }
        
        try:
            response = self._http_session.post(
                self.config.api_url, 
                json=payload, 
                headers=headers, 
                timeout=self.config.http_timeout
            )
            
            if response.status_code in [200, 201, 202]:
                self.logger.info(f"✓ Cloud sync success: {response.status_code}")
                self._events_sent += 1
                return True
            else:
                self.logger.warning(f"✗ Cloud sync failed: {response.status_code} - {response.text[:200]}")
                self._events_failed += 1
                return False
                
        except requests.exceptions.RequestException as e:
            self.logger.error(f"✗ Network error: {e}")
            self._events_failed += 1
            return False
    
    def process_line(self, line: str) -> Optional[Dict[str, Any]]:
        """Parse JSON line from Arduino and send to cloud."""
        if not line or not line.strip():
            return None
        
        try:
            payload = json.loads(line)
            event_type = payload.get('event', 'unknown')
            node = payload.get('node', self.config.node_id)
            
            self.logger.info(f"📥 Received: event={event_type} from node={node}")
            
            # Enrich and send
            enriched = self._enrich_payload(payload)
            self._send_to_cloud(enriched)
            
            return enriched
            
        except json.JSONDecodeError as e:
            self.logger.debug(f"Malformed JSON ignored: {line[:100]}... ({e})")
            return None
        except Exception as e:
            self.logger.error(f"Unexpected processing error: {e}")
            return None
    
    def connect(self) -> bool:
        """Open serial connection to Arduino."""
        try:
            self._serial = serial.Serial(
                port=self.config.serial_port,
                baudrate=self.config.baud_rate,
                timeout=self.config.read_timeout
            )
            self.logger.info(f"✓ Serial connected: {self.config.serial_port} @ {self.config.baud_rate}")
            return True
        except serial.SerialException as e:
            self.logger.critical(f"✗ Could not open serial port: {e}")
            return False
    
    def run(self):
        """Main loop: read serial, buffer lines, process JSON."""
        if not self.connect():
            sys.exit(1)
        
        self._running = True
        self._start_time = datetime.now()
        
        self.logger.info(f"🚀 Gateway started")
        self.logger.info(f"   Serial: {self.config.serial_port}")
        self.logger.info(f"   Target: {self.config.api_url}")
        self.logger.info(f"   Node:   {self.config.node_id}")
        
        while self._running:
            try:
                if self._serial and self._serial.in_waiting > 0:
                    chunk = self._serial.read(self._serial.in_waiting).decode("utf-8", errors="ignore")
                    self._buffer += chunk
                    
                    # Process complete lines (NDJSON framing)
                    while "\n" in self._buffer:
                        line, self._buffer = self._buffer.split("\n", 1)
                        self.process_line(line.strip())
                
                # Small sleep to prevent CPU burn
                time.sleep(0.01)
                
            except OSError as e:
                self.logger.error(f"Serial I/O error: {e}")
                time.sleep(1)
                # Attempt reconnect
                if not self.connect():
                    time.sleep(5)
                    
            except Exception as e:
                self.logger.error(f"Loop error: {e}")
                time.sleep(1)
    
    def stop(self):
        """Clean up resources."""
        self._running = False
        if self._serial and self._serial.is_open:
            self._serial.close()
            self.logger.info("Serial port closed.")
        
        # Print stats
        if self._start_time:
            uptime = datetime.now() - self._start_time
            self.logger.info(f"📊 Stats: {self._events_sent} sent, {self._events_failed} failed, uptime: {uptime}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Return current gateway statistics."""
        return {
            "events_sent": self._events_sent,
            "events_failed": self._events_failed,
            "uptime_seconds": (datetime.now() - self._start_time).total_seconds() if self._start_time else 0,
            "serial_port": self.config.serial_port,
            "api_url": self.config.api_url,
            "node_id": self.config.node_id,
        }


def main():
    """Entry point for command-line execution."""
    config = GatewayConfig()
    gateway = ArduinoCloudConnector(config)
    
    try:
        gateway.run()
    except KeyboardInterrupt:
        pass
    finally:
        gateway.stop()


if __name__ == "__main__":
    main()
