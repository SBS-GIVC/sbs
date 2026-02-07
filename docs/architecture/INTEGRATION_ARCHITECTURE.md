# 🏥 SBS Platform Integration Architecture

## Complete System Overview

This document describes the integration architecture for the **Saudi Billing System (SBS)** platform, including IoT device connectivity via the **Arduino IoT Gateway**.

---

## 📊 Service Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BrainSAIT Cloud Platform                              │
│                                                                                 │
│  ┌─────────────────┐    ┌────────────────────────────────────────────────────┐ │
│  │  brainsait.cloud│────│             sbs.brainsait.cloud                    │ │
│  │  (Landing Page) │    │                 (App + API)                        │ │
│  └─────────────────┘    └───────────────────────┬────────────────────────────┘ │
│                                                 │                               │
│  ┌──────────────────────────────────────────────┼────────────────────────────┐ │
│  │                         API Gateway (n8n + server.cjs)                    │ │
│  │                                              │                            │ │
│  │  POST /api/v1/iot/events ◄─── Arduino IoT Gateway + Edge Devices         │ │
│  │  POST /api/submit-claim  ◄─── Healthcare Facilities / HIS                │ │
│  │  POST /api/normalize     ◄─── Internal Code Translation                  │ │
│  └──────────────────────────────────────────────┼────────────────────────────┘ │
│                                                 │                               │
│  ┌──────────────────────────────────────────────┼────────────────────────────┐ │
│  │                         Microservices Layer                               │ │
│  │                                                                           │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │ │
│  │  │  Normalizer     │  │  Financial      │  │  Signer         │           │ │
│  │  │  Service        │  │  Rules Engine   │  │  Service        │           │ │
│  │  │  :8000          │  │  :8002          │  │  :8001          │           │ │
│  │  │                 │  │                 │  │                 │           │ │
│  │  │  - AI-powered   │  │  - CHI rules    │  │  - RSA signing  │           │ │
│  │  │  - Code mapping │  │  - Bundles      │  │  - Certificates │           │ │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │ │
│  │           │                    │                    │                    │ │
│  │  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐           │ │
│  │  │  NPHIES         │  │  AI Prediction  │  │  Simulation     │           │ │
│  │  │  Bridge         │  │  Service        │  │  Service        │           │ │
│  │  │  :8003          │  │  :8004          │  │  :8005          │           │ │
│  │  │                 │  │                 │  │                 │           │ │
│  │  │  - NPHIES API   │  │  - Fraud detect │  │  - Test data    │           │ │
│  │  │  - Claim submit │  │  - Predictions  │  │  - Scenarios    │           │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘           │ │
│  │                                                                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                 │                               │
│  ┌──────────────────────────────────────────────┼────────────────────────────┐ │
│  │                         Data Layer                                        │ │
│  │                                                                           │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │ │
│  │  │  PostgreSQL     │  │  n8n Workflows  │  │  Prometheus     │           │ │
│  │  │  :5432          │  │  :5678          │  │  Monitoring     │           │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘           │ │
│  │                                                                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │
                                    │ HTTPS (Bearer Token)
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────────┐
│                           Edge Devices Layer                                    │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  Arduino UNO    │  │  ESP32          │  │  Raspberry Pi   │                 │
│  │  (via Gateway)  │  │  (Direct WiFi)  │  │  (Gateway Host) │                 │
│  │                 │  │                 │  │                 │                 │
│  │  └──USB───┐     │  │     WiFi ───────┼──┼────────────────►│                 │
│  │           │     │  │                 │  │                 │                 │
│  └───────────┼─────┘  └─────────────────┘  └─────────────────┘                 │
│              │                                                                  │
│  ┌───────────▼───────────────────────────────────────────────────────────────┐ │
│  │                     Arduino IoT Gateway (Python)                          │ │
│  │                     ~/sbs/arduino-iot-gateway                             │ │
│  │                                                                           │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │  serial_gateway.py                                                  │ │ │
│  │  │  - Reads USB Serial (NDJSON framing)                                │ │ │
│  │  │  - Buffers until newline                                            │ │ │
│  │  │  - Enriches with gateway metadata                                   │ │ │
│  │  │  - POSTs to sbs.brainsait.cloud/api/v1/iot/events                   │ │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                           │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Service Ports Reference

| Service | Port | Purpose |
|---------|------|---------|
| **Normalizer Service** | 8000 | AI-powered code normalization (internal → SBS) |
| **Signer Service** | 8001 | Digital certificate management & RSA signing |
| **Financial Rules Engine** | 8002 | CHI business rules, bundles, pricing |
| **NPHIES Bridge** | 8003 | NPHIES API communication & retry logic |
| **AI Prediction Service** | 8004 | Fraud detection, predictions, compliance |
| **Simulation Service** | 8005 | Test data generation & mock responses |
| **SBS Landing API** | 3000 | Main web API & frontend server |
| **n8n Workflows** | 5678 | Workflow orchestration engine |
| **PostgreSQL** | 5432 | Central database |
| **pgAdmin** | 5050 | Database management (optional) |

---

## 🔌 Arduino IoT Gateway Integration

### Where It Fits

The Arduino IoT Gateway bridges **physical edge devices** (Arduino, ESP32, sensors) to the **SBS Cloud Platform**. It's designed for:

1. **Healthcare IoT Devices** - Temperature, patient monitors, asset trackers
2. **Facility Monitoring** - Environmental sensors, equipment status
3. **Real-time Events** - Alert triggers, threshold notifications

### Integration Points

#### Option A: Direct API Integration (Recommended)

```
Arduino → Gateway → POST /api/v1/iot/events → SBS Landing API → Database
```

**Add IoT endpoint to sbs-landing/server.cjs:**

```javascript
// IoT Event Ingestion Endpoint
app.post('/api/v1/iot/events', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }
    
    const event = req.body;
    const deviceToken = authHeader.split(' ')[1];
    
    // Validate token and extract device info
    // Store event in database
    // Trigger alerts if thresholds exceeded
    
    res.json({
      status: 'received',
      event_id: `evt_${Date.now()}`,
      stored_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Option B: n8n Workflow Integration

```
Arduino → Gateway → n8n Webhook → IoT Processing Workflow → Database/Alerts
```

**Create n8n workflow for IoT events:**

```json
{
  "name": "IoT Event Processing",
  "nodes": [
    {
      "name": "IoT Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "iot-events",
        "method": "POST"
      }
    },
    {
      "name": "Store Event",
      "type": "n8n-nodes-base.postgres",
      "parameters": {
        "operation": "insert",
        "table": "iot_events"
      }
    },
    {
      "name": "Check Alerts",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": "event.value > threshold"
      }
    }
  ]
}
```

#### Option C: AI Prediction Integration

Route IoT events through the AI Prediction Service for anomaly detection:

```
Arduino → Gateway → AI Prediction Service (:8004) → Anomaly Detection → Alerts
```

---

## 📁 Directory Structure

```
sbs/
├── sbs/                           # Main SBS platform (clone of repo)
│   ├── ai-prediction-service/     # Fraud detection & predictions
│   ├── certs/                     # Digital certificates (empty, add yours)
│   ├── database/                  # PostgreSQL schema & migrations
│   ├── financial-rules-engine/    # CHI business rules
│   ├── k8s-production/            # Kubernetes manifests
│   ├── monitoring/                # Prometheus config
│   ├── n8n-workflows/             # n8n workflow definitions
│   ├── normalizer-service/        # AI code normalization
│   ├── nphies-bridge/             # NPHIES API integration
│   ├── sbs-landing/               # Frontend + API server
│   ├── signer-service/            # Digital signing
│   ├── simulation-service/        # Test data generation
│   ├── docker-compose.yml         # Local dev orchestration
│   └── *.md                       # Documentation
│
└── arduino-iot-gateway/           # IoT device connectivity
    ├── src/
    │   ├── serial_gateway.py      # Main gateway (ArduinoCloudConnector)
    │   ├── mock_server.py         # Local testing server
    │   └── __init__.py
    ├── config/
    │   ├── .env.example           # Configuration template
    │   └── com.brainsait.gateway.plist  # macOS service
    ├── tests/
    │   └── test_gateway.py        # Unit tests
    ├── docs/
    │   └── SETUP.md               # Installation guide
    └── requirements.txt
```

---

## 🚀 Deployment Options

### Option 1: Docker Compose (Development)

```bash
cd ~/sbs/sbs
docker-compose up -d

# Then run gateway separately
cd ~/sbs/arduino-iot-gateway
python3 src/serial_gateway.py
```

### Option 2: Kubernetes (Production)

```bash
cd ~/sbs/sbs/k8s-production
./deploy-sbs-k8s.sh
```

### Option 3: Cloudflare Workers (Edge)

The normalizer-service has Wrangler config for Cloudflare deployment:
```bash
cd ~/sbs/sbs/normalizer-service
wrangler deploy
```

---

## 🔐 Security Configuration

### Required Secrets

| Secret | Service | Purpose |
|--------|---------|---------|
| `DB_PASSWORD` | All services | PostgreSQL access |
| `NPHIES_API_KEY` | nphies-bridge | NPHIES authentication |
| `SIGNER_PRIVATE_KEY_B64` | signer-service | RSA private key |
| `API_TOKEN` | arduino-iot-gateway | Device authentication |
| `DEEPSEEK_API_KEY` | sbs-landing | AI chat responses |

### Certificate Management

Place NPHIES certificates in `sbs/certs/`:
```
certs/
├── facility_1/
│   ├── private_key.pem
│   └── certificate.pem
└── facility_2/
    ├── private_key.pem
    └── certificate.pem
```

---

## 🔗 Integration Checklist

### Phase 1: Core Services ✅
- [x] Normalizer Service (AI code mapping)
- [x] Financial Rules Engine (CHI compliance)
- [x] Signer Service (Digital signatures)
- [x] NPHIES Bridge (API communication)
- [x] AI Prediction Service (Fraud detection)
- [x] Simulation Service (Test data)
- [x] n8n Workflows (Orchestration)

### Phase 2: IoT Integration ✅
- [x] Arduino IoT Gateway module
- [x] Serial fragmentation handling
- [x] NDJSON protocol support
- [x] Environment configuration
- [x] Unit tests
- [ ] Add IoT endpoint to sbs-landing
- [ ] Create IoT n8n workflow
- [ ] Database schema for IoT events

### Phase 3: Production Hardening
- [ ] TLS certificates for domains
- [ ] Rate limiting configuration
- [ ] Monitoring dashboards
- [ ] Alert notifications
- [ ] Backup automation

---

## 📞 Domain Configuration

| Domain | Purpose | Target |
|--------|---------|--------|
| `brainsait.cloud` | Landing page | sbs-landing:3000 |
| `sbs.brainsait.cloud` | App + API | sbs-landing:3000/api/* |
| `n8n.brainsait.cloud` | Workflow admin | n8n:5678 |

---

## 🎯 Next Steps

1. **Add IoT endpoint to sbs-landing:**
   ```bash
   # Edit server.cjs to add /api/v1/iot/events endpoint
   ```

2. **Create IoT database table:**
   ```sql
   CREATE TABLE iot_events (
     id SERIAL PRIMARY KEY,
     node_id VARCHAR(50) NOT NULL,
     event_type VARCHAR(50) NOT NULL,
     payload JSONB NOT NULL,
     gateway_ts TIMESTAMP,
     received_at TIMESTAMP DEFAULT NOW(),
     facility_code VARCHAR(20),
     processed BOOLEAN DEFAULT FALSE
   );
   ```

3. **Deploy and test:**
   ```bash
   # Start all services
   cd ~/sbs/sbs && docker-compose up -d
   
   # Start IoT gateway
   cd ~/sbs/arduino-iot-gateway
   python3 src/serial_gateway.py
   ```

---

*Built for Saudi Arabia's Digital Health Transformation 🇸🇦*
