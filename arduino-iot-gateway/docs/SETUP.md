# BrainSAIT Arduino IoT Gateway - Setup Guide

## System Architecture

```
┌─────────────────┐
│   Arduino Board │ (USB Serial)
│  BS-EDGE-001    │
└────────┬────────┘
         │
    JSON Lines (NDJSON)
         │
    ┌────▼──────────────────┐
    │  Gateway Service      │ (Python)
    │  - Reads Serial       │
    │  - Buffers by \n      │
    │  - Posts HTTPS        │
    └────┬──────────────────┘
         │
    ┌────▼────────────────────────────────┐
    │  sbs.brainsait.cloud/api/v1/iot/... │
    │  (BrainSAIT SBS API)                │
    └────┬────────────────────────────────┘
         │
    ┌────▼───────────────────────────────┐
    │  Dashboard                         │
    │  https://sbs.brainsait.cloud       │
    │  https://brainsait.cloud (landing) │
    └────────────────────────────────────┘
```

## Prerequisites

- Python 3.7+
- Arduino board (UNO, Nano, ESP32, etc.)
- USB cable + driver (usually pre-installed)
- macOS/Linux (or Windows with WSL)

## Installation Steps

### 1. Identify Serial Port

```bash
# macOS / Linux
ls /dev/cu.* 
# Look for: /dev/cu.usbmodem1201 or similar

# Windows (PowerShell)
[System.IO.Ports.SerialPort]::getportnames()
```

### 2. Clone & Setup

```bash
cd ~/sbs/arduino-iot-gateway
pip3 install -r requirements.txt
cp config/.env.example .env
```

### 3. Update `.env` with BrainSAIT Credentials

```bash
nano .env
```

Set:
```
SERIAL_PORT=/dev/cu.usbmodem1201
API_URL=https://sbs.brainsait.cloud/api/v1/iot/events
API_TOKEN=<your_token_from_sbs.brainsait.cloud>
NODE_ID=BS-EDGE-001
FACILITY_CODE=HQ
```

### 4. Test Locally (Development)

**Terminal 1 - Mock cloud server:**
```bash
python3 src/mock_server.py
```

**Terminal 2 - Run gateway (test mode):**
```bash
export API_URL=http://localhost:8000/ingest
export $(cat .env | grep -v '#' | grep -v API_URL)
python3 src/serial_gateway.py
```

**Expected output:**
```
2026-02-07 02:00:45 - [BrainSAIT-Gateway] - INFO - Starting Serial Gateway on /dev/cu.usbmodem1201 @ 115200
🚀 [CLOUD RECEIVED] Node: BS-EDGE-001 | Event: heartbeat
   📦 Payload: {"node":"BS-EDGE-001","event":"heartbeat","ts":12345}
```

### 5. Production Deployment (macOS)

**Install as persistent service:**
```bash
cp config/com.brainsait.gateway.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.brainsait.gateway.plist
```

**Verify running:**
```bash
launchctl list | grep brainsait
# Output should show: 0  com.brainsait.gateway
```

**View live logs:**
```bash
tail -f ~/sbs/arduino-iot-gateway/logs/gateway.log
```

**Stop service:**
```bash
launchctl unload ~/Library/LaunchAgents/com.brainsait.gateway.plist
```

## Arduino Firmware Template

### ESP32 / Arduino with WiFi (Advanced)

If your board has WiFi, you can send directly:

```cpp
#include <WiFi.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>

const char* ssid = "YourWiFi";
const char* password = "YourPassword";
const char* apiUrl = "https://sbs.brainsait.cloud/api/v1/iot/events";
const char* apiToken = "your_token_here";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected!");
}

void loop() {
  StaticJsonDocument<256> doc;
  doc["node"] = "BS-EDGE-001";
  doc["event"] = "telemetry";
  doc["ts"] = millis();
  doc["temperature"] = 23.5;
  
  String json;
  serializeJson(doc, json);
  
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiUrl);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", String("Bearer ") + apiToken);
    
    int httpCode = http.POST(json);
    http.end();
  }
  
  delay(5000);
}
```

### Arduino UNO / Nano (Serial via Gateway)

```cpp
#include <ArduinoJson.h>

void setup() {
  Serial.begin(115200);
  delay(2000);
}

void loop() {
  StaticJsonDocument<128> doc;
  doc["node"] = "BS-EDGE-001";
  doc["event"] = "heartbeat";
  doc["ts"] = millis();
  doc["analog_0"] = analogRead(A0);
  
  serializeJson(doc, Serial);
  Serial.println();  // CRITICAL: adds \n for framing
  
  delay(5000);
}
```

## API Request/Response Format

### Request (Gateway → SBS API)

```json
POST /api/v1/iot/events HTTP/1.1
Host: sbs.brainsait.cloud
Authorization: Bearer bsk_abc123...
Content-Type: application/json

{
  "node": "BS-EDGE-001",
  "event": "heartbeat",
  "ts": 12345,
  "gateway_ts": 1707273645.123,
  "facility_code": "HQ",
  "data": {
    "temperature": 23.5,
    "humidity": 65
  }
}
```

### Response (200 OK)

```json
{
  "status": "received",
  "event_id": "evt_abc123def456",
  "stored_at": "2026-02-07T02:00:45Z",
  "next_sync": 5000
}
```

### Error Responses

| Code | Meaning | Fix |
|------|---------|-----|
| `401` | Unauthorized | Check `API_TOKEN` in `.env` |
| `403` | Forbidden | Token expired or revoked; regenerate |
| `400` | Bad Request | Invalid JSON from Arduino; check firmware |
| `429` | Rate Limited | Reduce event frequency |
| `503` | Service Unavailable | SBS API down; gateway will retry |

## Monitoring & Maintenance

### Check Service Health

```bash
# Is it running?
launchctl list | grep brainsait

# Recent errors?
tail -50 ~/sbs/arduino-iot-gateway/logs/gateway.err

# Log summary
grep ERROR ~/sbs/arduino-iot-gateway/logs/gateway.log | tail -10
```

### Update Configuration

After editing `.env`:

```bash
launchctl unload ~/Library/LaunchAgents/com.brainsait.gateway.plist
launchctl load ~/Library/LaunchAgents/com.brainsait.gateway.plist
```

### Rotate API Token (Every 90 Days)

1. Generate new token at `https://sbs.brainsait.cloud/admin/tokens`
2. Update `API_TOKEN` in `~/.env`
3. Restart service: `launchctl unload ... && launchctl load ...`
4. Revoke old token (optional but recommended)

## Troubleshooting

### "Resource busy" on serial port

```bash
# Find what's using it
lsof /dev/cu.usbmodem1201

# Kill process
kill -9 <PID>
```

### "Connection refused" to API

```bash
# Test connectivity
curl -v -H "Authorization: Bearer <TOKEN>" \
  https://sbs.brainsait.cloud/api/v1/iot/events

# Check DNS
nslookup sbs.brainsait.cloud

# Check firewall
sudo tcpdump -i en0 "host sbs.brainsait.cloud"
```

### "No data arriving"

```bash
# Check Arduino is sending
cat /dev/cu.usbmodem1201

# Should see JSON lines. If not:
# 1. Upload firmware to Arduino
# 2. Open Arduino Serial Monitor (9600 baud)
# 3. Verify Serial.println() calls
```

### High CPU Usage

Edit `src/serial_gateway.py`, change:
```python
time.sleep(0.01)  # to
time.sleep(0.1)   # less frequent polls
```

## Security Best Practices

1. **Never commit `.env` to git** — Add to `.gitignore`
2. **Rotate tokens every 90 days** — Use SBS admin dashboard
3. **Use HTTPS only** — Never HTTP in production
4. **Firewall the gateway** — Restrict outbound to SBS domain only
5. **Log rotation** — Archive old logs weekly

## Performance Targets

- **Latency:** <500ms (Arduino → Cloud)
- **Throughput:** 1000+ events/sec
- **Uptime:** >99% (with auto-restart)
- **Memory:** ~20MB Python process

## Support

- **Issues?** Check logs: `tail -f ~/sbs/arduino-iot-gateway/logs/gateway.log`
- **Questions?** Visit: https://sbs.brainsait.cloud/support
- **Landing Page:** https://brainsait.cloud
