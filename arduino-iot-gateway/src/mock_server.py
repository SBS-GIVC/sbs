#!/usr/bin/env python3
"""
BrainSAIT Mock Cloud Server
===========================
A local test server that simulates the BrainSAIT SBS Cloud API.
Useful for development and testing without hitting production.

Usage:
    python3 mock_server.py [--port 8000]

Access:
    POST http://localhost:8000/ingest
    GET  http://localhost:8000/health
    GET  http://localhost:8000/stats
"""

import json
import argparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from typing import List, Dict, Any


class MockCloudState:
    """Store received events for debugging."""
    events: List[Dict[str, Any]] = []
    received_count: int = 0
    started_at: datetime = datetime.now()


class MockCloudHandler(BaseHTTPRequestHandler):
    """HTTP request handler for mock cloud API."""
    
    def do_GET(self):
        """Handle GET requests for health and stats."""
        if self.path == '/health':
            self._send_json(200, {
                "status": "healthy",
                "service": "BrainSAIT Mock Cloud",
                "version": "1.0.0"
            })
        elif self.path == '/stats':
            uptime = (datetime.now() - MockCloudState.started_at).total_seconds()
            self._send_json(200, {
                "events_received": MockCloudState.received_count,
                "uptime_seconds": uptime,
                "last_events": MockCloudState.events[-5:] if MockCloudState.events else []
            })
        elif self.path == '/events':
            self._send_json(200, {
                "total": MockCloudState.received_count,
                "events": MockCloudState.events[-50:]  # Last 50 events
            })
        else:
            self._send_json(404, {"error": "Not found"})
    
    def do_POST(self):
        """Handle POST requests for event ingestion."""
        if self.path in ['/ingest', '/api/v1/iot/events']:
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length).decode('utf-8')
                data = json.loads(body)
                
                # Extract metadata
                auth_header = self.headers.get('Authorization', 'none')
                node_id = self.headers.get('X-Node-ID', data.get('node', 'unknown'))
                
                # Store event
                event_record = {
                    "received_at": datetime.utcnow().isoformat() + "Z",
                    "node": node_id,
                    "event": data.get('event', 'unknown'),
                    "payload": data
                }
                MockCloudState.events.append(event_record)
                MockCloudState.received_count += 1
                
                # Pretty console output
                print(f"\n{'='*60}")
                print(f"🚀 [EVENT #{MockCloudState.received_count}] {datetime.now().strftime('%H:%M:%S')}")
                print(f"   Node: {node_id}")
                print(f"   Event: {data.get('event', 'unknown')}")
                print(f"   Auth: {auth_header[:20]}..." if len(auth_header) > 20 else f"   Auth: {auth_header}")
                print(f"   📦 Payload:")
                print(json.dumps(data, indent=4))
                print(f"{'='*60}")
                
                # Send success response
                self._send_json(200, {
                    "status": "received",
                    "event_id": f"evt_{MockCloudState.received_count:06d}",
                    "stored_at": event_record["received_at"],
                    "next_sync": 5000  # Suggested next sync interval (ms)
                })
                
            except json.JSONDecodeError as e:
                print(f"❌ Invalid JSON: {e}")
                self._send_json(400, {"error": "Invalid JSON", "details": str(e)})
            except Exception as e:
                print(f"❌ Server error: {e}")
                self._send_json(500, {"error": "Internal server error", "details": str(e)})
        else:
            self._send_json(404, {"error": "Endpoint not found", "path": self.path})
    
    def _send_json(self, status_code: int, data: dict):
        """Send JSON response."""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Suppress default HTTP logging for cleaner output."""
        pass


def run_server(port: int = 8000):
    """Start the mock server."""
    server_address = ('', port)
    httpd = HTTPServer(server_address, MockCloudHandler)
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║         🌩️  BrainSAIT Mock Cloud Server v1.0.0  🌩️           ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Endpoints:                                                  ║
║    POST http://localhost:{port}/ingest         (IoT events)   ║
║    POST http://localhost:{port}/api/v1/iot/events (alias)     ║
║    GET  http://localhost:{port}/health         (health check) ║
║    GET  http://localhost:{port}/stats          (statistics)   ║
║    GET  http://localhost:{port}/events         (event log)    ║
║                                                              ║
║  Configure gateway to use:                                   ║
║    export API_URL="http://localhost:{port}/ingest"            ║
║                                                              ║
║  Press Ctrl+C to stop                                        ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    MockCloudState.started_at = datetime.now()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n\n✅ Server stopped. Received {MockCloudState.received_count} events.")
    finally:
        httpd.server_close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='BrainSAIT Mock Cloud Server')
    parser.add_argument('--port', '-p', type=int, default=8000, help='Port to listen on')
    args = parser.parse_args()
    
    run_server(args.port)
