# 🔌 Complete Arduino IoT Gateway Integration Setup

## Overview

The IoT Gateway integration has been implemented but requires additional setup and validation. This issue tracks the remaining work to fully integrate the Arduino IoT Gateway with the SBS platform.

## ✅ Already Completed

### Backend API (server.cjs)
- [x] `POST /api/v1/iot/events` - Event ingestion endpoint with authentication
- [x] `GET /api/v1/iot/events` - Query events with filters
- [x] `GET /api/v1/iot/stats` - IoT statistics
- [x] `GET /api/v1/iot/dashboard` - Dashboard aggregation
- [x] `GET /api/v1/iot/devices` - Device list with status
- [x] `GET /api/v1/iot/alerts` - Alert management
- [x] `POST /api/v1/iot/alerts/:eventId/acknowledge` - Alert acknowledgment
- [x] `GET /api/v1/iot/health` - Health check

### Database Schema (database/schema-iot.sql)
- [x] `iot_devices` table
- [x] `iot_events` table
- [x] `iot_alert_rules` table
- [x] `iot_alert_history` table
- [x] Sample data

### n8n Workflow (n8n-workflows/iot-event-processing.json)
- [x] IoT webhook endpoint
- [x] Database storage nodes
- [x] Alert processing
- [x] Notification triggers

## 📋 Remaining Tasks

### 1. Database Migration
Apply the IoT schema to PostgreSQL:
```bash
cd ~/sbs/sbs/database
./apply-iot-schema.sh --docker
```

### 2. Update Frontend Dashboard
Add IoT monitoring section to the SBS dashboard (`sbs-landing/src/`):
- [ ] Create `IoTDashboard.jsx` component
- [ ] Add device status cards
- [ ] Add real-time event stream display
- [ ] Add alert notification panel
- [ ] Add charts for telemetry visualization

### 3. Configure n8n Workflow
- [ ] Import `iot-event-processing.json` to n8n
- [ ] Configure PostgreSQL credential (`sbs-postgres-cred`)
- [ ] Set `NOTIFICATION_WEBHOOK_URL` environment variable
- [ ] Activate the workflow

### 4. Arduino Gateway Setup
- [ ] Copy `arduino-iot-gateway/` to target machine
- [ ] Configure `.env` with proper credentials
- [ ] Test connectivity with mock server
- [ ] Deploy as system service (launchd/systemd)

### 5. Token Management
- [ ] Implement secure token generation endpoint
- [ ] Add token rotation mechanism
- [ ] Store tokens in database instead of memory

### 6. Testing
- [ ] Test event ingestion from actual Arduino device
- [ ] Verify alert triggering and notifications
- [ ] Load test with multiple concurrent devices
- [ ] Test database cleanup procedures

### 7. Documentation
- [ ] Update main README with IoT section
- [ ] Create API documentation (OpenAPI/Swagger)
- [ ] Add troubleshooting guide

## 🔗 Related Resources

- **Arduino Gateway**: `~/sbs/arduino-iot-gateway/`
- **API Endpoint**: `https://sbs.brainsait.cloud/api/v1/iot/events`
- **n8n Workflow**: `https://n8n.srv791040.hstgr.cloud`
- **Integration Docs**: `~/sbs/INTEGRATION_ARCHITECTURE.md`

## 📊 Test Commands

```bash
# Test IoT endpoint
curl -X POST http://localhost:3000/api/v1/iot/events \
  -H "Authorization: Bearer dev_iot_token_12345" \
  -H "Content-Type: application/json" \
  -d '{"node":"BS-EDGE-001","event":"heartbeat","ts":12345}'

# Check stats
curl http://localhost:3000/api/v1/iot/stats

# Check dashboard
curl http://localhost:3000/api/v1/iot/dashboard

# Test alert
curl -X POST http://localhost:3000/api/v1/iot/events \
  -H "Authorization: Bearer dev_iot_token_12345" \
  -H "Content-Type: application/json" \
  -d '{"node":"BS-EDGE-001","event":"alert","data":{"severity":"critical","message":"Temperature exceeded"}}'
```

## 🎯 Acceptance Criteria

- [ ] IoT endpoints are accessible on production domain
- [ ] Database tables are properly created
- [ ] n8n workflow is active and processing events
- [ ] Dashboard shows real-time device status
- [ ] Alerts are properly triggered and can be acknowledged
- [ ] Arduino gateway can successfully send events

## Labels

`enhancement` `iot` `integration` `priority:high`

## Assignees

@copilot (GitHub Copilot)
