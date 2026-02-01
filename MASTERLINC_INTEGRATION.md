# BrainSAIT Linc Agent Integration

## Overview

This integration connects the SBS (Saudi Billing System) Integration Engine with the BrainSAIT "Linc" agentic ecosystem through the MasterLinc Coordinator (MCP). This enables intelligent, event-driven orchestration of medical coding workflows with autonomous agents for claim processing, eligibility verification, and compliance monitoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  MasterLinc Orchestrator (MCP)                  │
│         Central Coordination for BrainSAIT Linc Agents          │
│                        Port: 4000                               │
└─────────────────────────────────────────────────────────────────┘
                              │ REST/GraphQL
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  ClaimLinc  │        │  AuthLinc   │        │ComplianceLinc│
│  (RCM Agent)│        │(Eligibility)│        │   (Audit)   │
│  Port: 4001 │        │  Port: 4002 │        │  Port: 4003 │
└─────────────┘        └─────────────┘        └─────────────┘
       │                      │                      │
       └──────────────────────┼──────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SBS Core Services Layer                      │
├─────────────┬─────────────┬─────────────┬─────────────┬────────┤
│ Normalizer  │  Financial  │   Signer    │   NPHIES    │   AI   │
│   (8000)    │   Rules     │   (8001)    │   Bridge    │ Predict│
│             │   (8002)    │             │   (8003)    │ (8004) │
└─────────────┴─────────────┴─────────────┴─────────────┴────────┘
```

## Components

### 1. MasterLinc Bridge Service (Port 4000)

Central coordinator that manages agents and orchestrates workflows.

**Key Features:**
- Agent registration and discovery
- Workflow state machine
- Event streaming via Redis
- BrainSAIT OID compliance

**Endpoints:**
- `POST /agents/register` - Register a new agent
- `GET /agents` - List all registered agents
- `GET /agents/{agent_name}` - Get agent details
- `POST /workflows/start` - Start a new workflow
- `GET /workflows/{workflow_id}` - Get workflow status
- `GET /health` - Health check

### 2. ClaimLinc Agent (Port 4001)

Revenue Cycle Management agent for full claim processing pipeline.

**Capabilities:**
- `process_claim` - Orchestrates Normalizer → Financial Rules → Signer → NPHIES
- `track_status` - Track claim status through NPHIES
- `handle_denial` - Process and prepare denied claims for resubmission

**Endpoints:**
- `POST /process_claim` - Process claim through full pipeline
- `POST /track_status` - Track claim status
- `POST /handle_denial` - Handle denied claims
- `GET /health` - Health check

### 3. AuthLinc Agent (Port 4002)

Eligibility and Pre-Authorization agent.

**Capabilities:**
- `verify_eligibility` - Real-time insurance eligibility verification
- `request_prior_auth` - Submit prior authorization requests

**Endpoints:**
- `POST /verify_eligibility` - Verify patient eligibility
- `POST /request_prior_auth` - Request prior authorization
- `GET /check_auth_status/{auth_id}` - Check authorization status
- `GET /health` - Health check

**Features:**
- 24-hour eligibility caching
- Redis-backed cache storage
- Automatic NPHIES integration

### 4. ComplianceLinc Agent (Port 4003)

Audit and Compliance agent for NPHIES and PDPL validation.

**Capabilities:**
- `audit_claim` - Full compliance audit
- `validate_nphies` - NPHIES format validation
- `check_pdpl` - PDPL (Personal Data Protection Law) compliance check

**Endpoints:**
- `POST /audit_claim` - Full compliance audit
- `POST /validate_nphies` - NPHIES validation
- `POST /check_pdpl` - PDPL compliance check
- `GET /health` - Health check

## BrainSAIT OID Compliance

All services implement BrainSAIT OID headers:

- **PEN**: 61026
- **OID Root**: 1.3.6.1.4.1.61026

### Service OIDs

| Service | OID |
|---------|-----|
| MasterLinc | 1.3.6.1.4.1.61026.3.3.0 |
| ClaimLinc | 1.3.6.1.4.1.61026.3.3.1 |
| AuthLinc | 1.3.6.1.4.1.61026.3.3.2 |
| ComplianceLinc | 1.3.6.1.4.1.61026.3.3.3 |
| ClinicalLinc | 1.3.6.1.4.1.61026.3.3.4 |

All responses include these headers:
```
X-BrainSAIT-OID: <service-specific-oid>
X-BrainSAIT-Service: <service-name>
X-BrainSAIT-PEN: 61026
```

## API Integration

### Landing API Endpoints

New endpoints added to `sbs-landing/server.cjs`:

#### 1. MasterLinc Orchestrated Claim Submission
```bash
POST /api/submit-claim-linc
Content-Type: application/json

{
  "claimId": "CLM-001",
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
```

**Response:**
```json
{
  "success": true,
  "claimId": "CLM-001",
  "workflowId": "WF-abc123",
  "status": "processing",
  "trackingUrl": "/api/workflow-status/WF-abc123"
}
```

#### 2. Verify Eligibility
```bash
POST /api/verify-eligibility
Content-Type: application/json

{
  "patientId": "PAT-001",
  "insuranceId": "INS-001",
  "payerId": "PAYER-001",
  "serviceDate": "2024-02-01T00:00:00Z"
}
```

#### 3. Audit Claim
```bash
POST /api/audit-claim
Content-Type: application/json

{
  "claimId": "CLM-001",
  "patientId": "PAT-001",
  "items": [...]
}
```

#### 4. Get Agent Status
```bash
GET /api/agents/status
```

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "name": "ClaimLinc",
      "status": "active",
      "capabilities": ["process_claim", "track_status"],
      "last_heartbeat": "2024-02-01T12:00:00Z"
    }
  ],
  "total": 4
}
```

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# MasterLinc Configuration
MASTERLINC_URL=http://masterlinc-bridge:4000
REDIS_URL=redis://redis:6379

# Agent Configuration
CLAIMLINC_URL=http://claimlinc-agent:4001
AUTHLINC_URL=http://authlinc-agent:4002
COMPLIANCELINC_URL=http://compliancelinc-agent:4003

# BrainSAIT OID
BRAINSAIT_OID_ROOT=1.3.6.1.4.1.61026
BRAINSAIT_PEN=61026
```

## Deployment

### Using Docker Compose

All services are configured in `docker-compose.yml`:

```bash
# Start all services including MasterLinc and agents
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f masterlinc-bridge
docker-compose logs -f claimlinc-agent
```

### Service Dependencies

- **Redis**: Required for event streaming and caching
- **PostgreSQL**: Required for core SBS services
- **All SBS Core Services**: Required for ClaimLinc agent

## Testing

### Run Integration Tests

```bash
# Run all MasterLinc integration tests
pytest tests/test_masterlinc_integration.py -v

# Run specific test class
pytest tests/test_masterlinc_integration.py::TestMasterLincIntegration -v

# Run with coverage
pytest tests/test_masterlinc_integration.py --cov=services
```

### Test Categories

1. **MasterLinc Integration**: Agent registration, workflow orchestration
2. **ClaimLinc Tests**: Claim processing pipeline
3. **AuthLinc Tests**: Eligibility verification
4. **ComplianceLinc Tests**: Compliance audits
5. **Workflow Tests**: Workflow state machine
6. **Landing API Tests**: API integration
7. **Fallback Tests**: Direct submission fallback
8. **OID Compliance Tests**: BrainSAIT OID headers

## Workflow Types

### 1. Claim Processing Workflow
```
Received → Compliance Audit → Normalization → 
Financial Rules → Signing → NPHIES Submission → Completed
```

### 2. Eligibility Check Workflow
```
Received → Eligibility Verification → Completed
```

### 3. Compliance Audit Workflow
```
Received → NPHIES Validation → PDPL Check → Completed
```

## Error Handling & Fallback

### Automatic Fallback

If MasterLinc is unavailable, the system automatically falls back to direct SBS pipeline:

```javascript
// Landing API automatically handles fallback
try {
  // Try MasterLinc submission
  result = await submitViaMasterLinc(claim);
} catch (error) {
  // Fallback to direct pipeline
  result = await callDirectSBSPipeline(claim);
}
```

## Event Streaming

### Redis Streams

All workflow events are streamed to Redis:

```
Stream Key: workflow:<workflow_id>:events
```

### Event Structure
```json
{
  "event_id": "evt-123",
  "workflow_id": "WF-abc",
  "stage": "normalization",
  "status": "completed",
  "message": "Normalization completed",
  "timestamp": "2024-02-01T12:00:00Z",
  "data": {}
}
```

## Monitoring

### Health Checks

All services expose `/health` endpoints:

```bash
# MasterLinc Bridge
curl http://localhost:4000/health

# ClaimLinc Agent
curl http://localhost:4001/health

# AuthLinc Agent
curl http://localhost:4002/health

# ComplianceLinc Agent
curl http://localhost:4003/health
```

### Agent Status

Monitor agent health through MasterLinc:

```bash
curl http://localhost:4000/agents
```

## Security

### Compliance

- **PDPL**: Personal Data Protection Law compliance checks
- **NPHIES**: Full NPHIES format validation
- **Audit Trail**: Complete event logging via Redis
- **BrainSAIT OID**: Service identification headers

### Container Security

- Read-only root filesystem
- Non-root user (UID 1000)
- Security options: `no-new-privileges`
- Resource limits configured

## API Documentation

Each service provides OpenAPI/Swagger documentation:

- MasterLinc: http://localhost:4000/docs
- ClaimLinc: http://localhost:4001/docs
- AuthLinc: http://localhost:4002/docs
- ComplianceLinc: http://localhost:4003/docs

## Troubleshooting

### Common Issues

1. **MasterLinc not starting**
   - Check Redis connection: `docker-compose logs redis`
   - Verify environment variables in `.env`

2. **Agents not registered**
   - Check agent service logs: `docker-compose logs claimlinc-agent`
   - Verify agent URLs in environment configuration

3. **Workflow stuck**
   - Check workflow status: `GET /workflows/{workflow_id}`
   - View event history: `GET /events/history/{workflow_id}`

4. **Fallback always triggered**
   - Verify MasterLinc URL: `echo $MASTERLINC_URL`
   - Test connectivity: `curl http://masterlinc-bridge:4000/health`

## Development

### Adding New Agents

1. Create agent directory: `services/agents/{agent_name}/`
2. Implement FastAPI application with BrainSAIT OID middleware
3. Add to `docker-compose.yml`
4. Register in MasterLinc startup
5. Update tests

### Extending Workflows

Edit `services/masterlinc-bridge/workflows.py`:

```python
async def _execute_custom_workflow(self, workflow: Workflow):
    """Execute custom workflow"""
    # Implement workflow stages
    pass
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/Fadil369/sbs/issues
- Documentation: See ARCHITECTURE.md for system architecture

## License

Part of the SBS Integration Engine project.
