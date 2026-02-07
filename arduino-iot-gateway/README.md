# BrainSAIT Arduino IoT Gateway Module

[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![License](https://img.shields.io/badge/license-proprietary-red.svg)]()
[![Status](https://img.shields.io/badge/status-production--ready-green.svg)]()

> **Bridges Arduino devices to BrainSAIT Healthcare Cloud via USB Serial**

**Domains:**
- 🌐 Landing Page: [brainsait.cloud](https://brainsait.cloud)
- 🏥 App Dashboard: [sbs.brainsait.cloud](https://sbs.brainsait.cloud)
- 🔌 IoT API: `https://sbs.brainsait.cloud/api/v1/iot/events`

---

## 📁 Directory Structure

```
sbs/arduino-iot-gateway/
├── src/
│   ├── serial_gateway.py      # Core gateway (ArduinoCloudConnector class)
│   ├── mock_server.py         # Local test server
│   └── __init__.py
├── config/
│   ├── .env.example           # Configuration template
│   └── com.brainsait.gateway.plist  # macOS launch agent
├── tests/
│   ├── test_gateway.py        # Unit tests
│   └── __init__.py
├── docs/
│   └── SETUP.md               # Detailed setup guide
├── logs/                      # Runtime logs (auto-created)
├── requirements.txt
├── .gitignore
└── README.md                  ← You are here
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ~/sbs/arduino-iot-gateway
pip3 install -r requirements.txt
```

### 2. Configure Environment

```bash
cp config/.env.example .env
nano .env  # Set SERIAL_PORT and API_TOKEN
```

### 3. Test Locally (Without Arduino)

**Terminal 1 - Start mock cloud:**
```bash
python3 src/mock_server.py
```

**Terminal 2 - Test gateway (with simulated events):**
```bash
export API_URL="http://localhost:8000/ingest"
python3 src/serial_gateway.py
```

### 4. Run with Arduino

```bash
# Load environment and run
export $(cat .env | grep -v '#')
python3 src/serial_gateway.py
```

---

## 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SERIAL_PORT` | `/dev/cu.usbmodem1201` | Arduino USB serial port |
| `BAUD_RATE` | `115200` | Serial baud rate |
| `API_URL` | `https://sbs.brainsait.cloud/api/v1/iot/events` | Cloud endpoint |
| `API_TOKEN` | (required) | Bearer token from SBS admin |
| `NODE_ID` | `BS-EDGE-001` | Device identifier |
| `FACILITY_CODE` | `HQ` | Healthcare facility code |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

---

## 🧪 Testing

```bash
# Run unit tests
cd ~/sbs/arduino-iot-gateway
pip3 install -r requirements.txt
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html
```

---

## 📟 Arduino Firmware

### Basic Example (Arduino UNO/Nano)

```cpp
#include <ArduinoJson.h>

void setup() {
  Serial.begin(115200);
  delay(2000);  // Wait for serial connection
}

void loop() {
  StaticJsonDocument<128> doc;
  doc["node"] = "BS-EDGE-001";
  doc["event"] = "heartbeat";
  doc["ts"] = millis();
  doc["analog_0"] = analogRead(A0);
  
  serializeJson(doc, Serial);
  Serial.println();  // CRITICAL: newline for framing!
  
  delay(5000);
}
```

### ESP32 with WiFi (Direct Cloud)

See [docs/SETUP.md](./docs/SETUP.md) for ESP32 firmware that connects directly to the cloud.

---

## 🔁 Run as Service (macOS)

```bash
# Copy launch agent
cp config/com.brainsait.gateway.plist ~/Library/LaunchAgents/

# Edit token in plist first!
nano ~/Library/LaunchAgents/com.brainsait.gateway.plist

# Load service
launchctl load ~/Library/LaunchAgents/com.brainsait.gateway.plist

# Verify running
launchctl list | grep brainsait

# View logs
tail -f ~/sbs/arduino-iot-gateway/logs/gateway.log
```

---

## 🔍 Troubleshooting

### Port Busy

```bash
lsof /dev/cu.usbmodem1201
kill -9 <PID>
```

### Test Cloud Connectivity

```bash
curl -X POST https://sbs.brainsait.cloud/api/v1/iot/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"node":"test","event":"ping"}'
```

### View Serial Data Directly

```bash
cat /dev/cu.usbmodem1201
```

---

## 📊 Architecture

```
┌─────────────────┐     JSON/NDJSON     ┌──────────────────┐
│   Arduino       │ ──────────────────> │  Serial Gateway  │
│   (USB Serial)  │                     │  (Python)        │
└─────────────────┘                     └────────┬─────────┘
                                                 │ HTTPS POST
                                                 ▼
                                   ┌─────────────────────────────┐
                                   │ sbs.brainsait.cloud         │
                                   │ /api/v1/iot/events          │
                                   └─────────────────────────────┘
                                                 │
                                                 ▼
                                   ┌─────────────────────────────┐
                                   │ SBS Healthcare Platform     │
                                   │ Dashboard & Analytics       │
                                   └─────────────────────────────┘
```

---

## 📚 Documentation

- [SETUP.md](./docs/SETUP.md) - Complete installation guide
- [SBS README](../sbs/README.md) - Main SBS platform documentation

---

## 🔐 Security Best Practices

1. **Never commit `.env`** - Contains API tokens
2. **Rotate tokens every 90 days** - Generate from SBS admin
3. **Use HTTPS only** - Never HTTP in production
4. **Restrict firewall** - Allow only SBS domain outbound

---

## 📄 License

Proprietary - All rights reserved. © BrainSAIT 2024-2026.
