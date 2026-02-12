# Healthcare Claims System Documentation

## Overview

This document provides comprehensive documentation for the integrated Healthcare Claims System built on top of the Basma platform. The system integrates seamlessly with the Saudi NPHIES platform for healthcare claims submission and management.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Healthcare Claims System                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Patient   │    │  Provider   │    │    Payer    │         │
│  │  Portal     │    │  Portal     │    │  Portal     │         │
│  │   (Web)     │    │   (Web)     │    │   (Web)     │         │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘         │
│         │                  │                  │                │
│  ┌──────▼──────────────────▼──────────────────▼──────┐         │
│  │               Unified API Gateway                  │         │
│  │          (NPHIES Bridge - Port 8003)              │         │
│  └──────┬──────────────────┬──────────────────┬──────┘         │
│         │                  │                  │                │
│  ┌──────▼──────┐  ┌────────▼──────┐  ┌──────▼──────┐          │
│  │   Claims    │  │ Prior Auth    │  │ Eligibility │          │
│  │ Processing  │  │  Processing   │  │  Checking   │          │
│  └──────┬──────┘  └──────┬────────┘  └──────┬──────┘          │
│         │                │                 │                 │
│  ┌──────▼────────────────▼──────────────────▼──────┐         │
│  │      AI Validation & Denial Prevention          │         │
│  │          (Anthropic Claude + OpenAI)            │         │
│  └──────┬─────────────────────┬────────────────────┘         │
│         │                     │                              │
│  ┌──────▼──────────┐  ┌──────▼──────────────┐               │
│  │   PostgreSQL    │  │   Redis Cache       │               │
│  │   Database      │  │   (Sessions/Cache)  │               │
│  └─────────────────┘  └─────────────────────┘               │
└───────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + Vite | User interface for all portals |
| **Backend API** | FastAPI (Python) | Unified healthcare claims API |
| **Database** | PostgreSQL (D1 compatible) | Storage for all healthcare data |
| **Cache/Session** | Redis | Caching and session management |
| **AI Services** | Anthropic Claude + OpenAI GPT | AI validation and predictions |
| **Workflow** | n8n | Automated claim processing workflows |
| **NPHIES Integration** | Custom Bridge | Communication with Saudi NPHIES |
| **Deployment** | Kubernetes | Container orchestration |
| **Monitoring** | Prometheus + Grafana | System monitoring and metrics |

## Database Schema Extension

### Healthcare-Specific Tables

The system extends the existing SBS database with healthcare-specific tables:

1. **Patients** - Patient demographics and insurance information
2. **Providers** - Healthcare provider details and credentials
3. **Payers** - Insurance company information
4. **Services** - Healthcare services catalog
5. **ServiceRequest** - Core healthcare request entity
6. **PriorAuthorizations** - Pre-authorization tracking
7. **Claims** - Healthcare claims with billing information
8. **Approvals** - Payer approval/denial decisions
9. **RequestStatusHistory** - Audit trail for status changes

See [`database/schema.sql`](../database/schema.sql) for complete schema definition.

## API Endpoints

### Core Healthcare Endpoints

#### Unified Submission Channel
```http
POST /unified-healthcare-submit
```
Submits any healthcare transaction type (claim, prior auth, referral, eligibility).

**Request Body:**
```json
{
  "submission_type": "claim",
  "facility_id": 1,
  "patient_data": {
    "national_id": "1234567890",
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1985-05-20",
    "gender": "male",
    "email": "john@email.com",
    "phone": "555-1234",
    "address": "Riyadh, Saudi Arabia",
    "insurance_policy_id": "POL123456789",
    "insurance_payer_name": "Blue Cross Insurance"
  },
  "provider_data": {
    "license_number": "MD-LIC-001234",
    "organization_name": "King Fahd Medical City",
    "specialty": "Internal Medicine",
    "facility_code": "FAC-001"
  },
  "service_data": {
    "patient_id": 1,
    "provider_id": 1,
    "service_code": "99213",
    "service_name": "Office Visit (Level 3)",
    "request_type": "claim",
    "diagnosis_codes": ["I10", "E11.9"],
    "clinical_notes": "Patient requires follow-up for hypertension and diabetes",
    "billed_amount": 75.00,
    "priority": "normal"
  }
}
```

**Response:**
```json
{
  "status": "submitted",
  "request_id": 12345,
  "request_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "request_type": "claim",
  "submitted_at": "2024-01-15T10:30:00Z",
  "patient_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "provider_uuid": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "workflow": "healthcare_claim"
}
```

#### Prior Authorization
```http
POST /healthcare/prior-auth
```
Submit a prior authorization request.

**Request Body:**
```json
{
  "patient_id": 1,
  "provider_id": 1,
  "payer_id": 1,
  "service_codes": ["99213", "80053"],
  "diagnosis_codes": ["I10", "E11.9"],
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "clinical_justification": "Patient requires ongoing monitoring for chronic conditions",
  "urgency": "normal"
}
```

#### Eligibility Check
```http
POST /healthcare/eligibility/check
```
Check patient eligibility for services.

**Request Body:**
```json
{
  "patient_id": 1,
  "provider_id": 1,
  "service_codes": ["99213"],
  "check_type": "real_time"
}
```

**Response:**
```json
{
  "eligible": true,
  "patient_name": "John Doe",
  "payer_name": "Blue Cross Insurance",
  "coverage_date": "2024-01-01",
  "services_covered": ["99213"],
  "copay_required": 25.00,
  "deductible_remaining": 1500.00,
  "authorization_required": false
}
```

#### Request Management
```http
GET /healthcare/requests
POST /healthcare/requests/{id}
PUT /healthcare/requests/{id}/status
DELETE /healthcare/requests/{id}
```

#### Prior Authorization Management
```http
POST /healthcare/prior-auth
GET /healthcare/prior-auth/{id}
PUT /healthcare/prior-auth/{id}/approve
POST /healthcare/prior-auth/{id}/cancel
```

#### Claims Management
```http
POST /healthcare/claims
GET /healthcare/claims
GET /healthcare/claims/{id}
PUT /healthcare/claims/{id}/status
POST /healthcare/claims/{id}/retry
```

#### Dashboard & Analytics
```http
GET /healthcare/dashboard/{role}
GET /healthcare/analytics/dashboard
```

#### Search & Lookup
```http
GET /healthcare/patients/search?query=...
GET /healthcare/payers
GET /healthcare/services/search?query=...
GET /healthcare/terminology/codes?system=...&q=...
```

#### NPHIES Integration
```http
POST /submit-claim
POST /submit-preauth
POST /submit-communication
GET /transaction/{uuid}
GET /facility/{id}/transactions
POST /terminology/validate-code
POST /terminology/validate-payload
```

## React Components

### HealthcareClaimsPage.jsx
Main claims management interface with tabs:
- Claims Queue
- Prior Authorization
- Eligibility
- Analytics
- Settings

### UnifiedHealthcareDashboard.jsx
Role-based dashboard showing:
- Statistical cards
- Recent requests table
- Quick actions
- Facilities panel (admin only)

### ClaimSubmitModal.jsx
Form for submitting new claims with:
- Patient/Provider selection
- Service code entry
- Diagnosis code entry
- Clinical notes
- Billed amount

### ClaimViewModal.jsx
Detailed claim view with:
- Claim information
- Approvals history
- Status timeline

## AI-Powered Features

### AI Validation Service (`healthcareAIService.js`)

1. **Claim Validation**: AI-powered pre-submission validation
2. **Denial Risk Analysis**: Predicts denial probability
3. **Clinical Notes Review**: AI analysis of clinical documentation
4. **Diagnosis Code Validation**: ICD-10 code verification
5. **CPT Code Suggestions**: AI-powered procedure code recommendations
6. **Payer Rules Analysis**: Compliance checking with payer requirements

### Integration with Basma AI

The healthcare system integrates with existing Basma AI capabilities:
- **Denial Prevention Cop**: AI assistant for preventing claim denials
- **AI Prediction Service**: Claim outcome predictions
- **AI Assistant Service**: Natural language interaction

## Workflow Orchestration (n8n)

### Claim Processing Workflow

The n8n workflow automates the complete claim processing pipeline:

1. **Webhook Receive**: Accept claim submission
2. **AI Validation**: Pre-submission validation
3. **Eligibility Check**: Verify insurance coverage
4. **Digital Signature**: Generate digital signature
5. **NPHIES Submission**: Submit to Saudi NPHIES
6. **Status Update**: Update claim status in database
7. **Analytics Logging**: Log processing metrics

### Workflow Configuration

See [`n8n-workflows/healthcare-claim-processing.json`](../n8n-workflows/healthcare-claim-processing.json) for complete workflow definition.

## Security & Compliance

### HIPAA-Aware Features

1. **PHI Protection**: Protected Health Information is not logged
2. **Audit Trail**: Complete audit trail for all data access
3. **Role-Based Access Control**: Patient, Provider, Payer, Admin roles
4. **Data Encryption**: Encrypt sensitive data at rest and in transit
5. **Certification Management**: Digital certificate management for NPHIES

### Authentication & Authoriation

- **JWT Tokens**: API authentication with expiry
- **Role Middleware**: Role-based endpoint protection
- **Rate Limiting**: 100 requests/min per IP
- **Request ID Tracking**: Correlation IDs for auditing

## Testing

### Comprehensive Test Suite

The system includes comprehensive test coverage:

1. **Unit Tests**: Database operations, validation logic
2. **Integration Tests**: API endpoint testing
3. **AI Service Tests**: Validation and prediction services
4. **Performance Tests**: Concurrent request handling
5. **Security Tests**: Authentication and rate limiting

### Running Tests

```bash
# Run healthcare claim tests
cd /Users/fadil369/sbs
python -m pytest tests/test_healthcare_claims_integration.py -v

# Run all NPHIES tests
python -m pytest tests/test_claim_workflow.py -v

# Run comprehensive test suite
python -m pytest tests/ -v --tb=short
```

## Deployment

### Kubernetes Deployment

The system is ready for Kubernetes deployment:

```bash
# Apply healthcare deployments
cd /Users/fadil369/sbs
kubectl apply -f deployment/healthcare-k8s-deployment.yaml

# Apply database
kubectl apply -f deployment/postgres-deployment.yaml

# Create secrets
kubectl create secret generic nphies-secrets --from-literal=api_key=your_key
kubectl create secret generic db-credentials --from-literal=username=postgres --from-literal=password=your_password
```

### Local Development

```bash
# Start all services
cd /Users/fadil369/sbs
npm run dev

# Start NPHIES bridge
cd /Users/fadil369/sbs/nphies-bridge
python main.py

# Start healthcare API
cd /Users/fadil369/sbs/nphies-bridge
python healthcare_api.py

# Run database migrations
npm run db:migrate
```

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_NAME=sbs_integration
DB_USER=postgres
DB_PASSWORD=your_password
DB_PORT=5432

# NPHIES
NPHIES_BASE_URL=https://nphies.sa/api/v1
NPHIES_API_KEY=your_api_key
ENABLE_MOCK_NPHIES=false
NPHIES_TIMEOUT=30
NPHIES_MAX_RETRIES=3

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# AI Services
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://healthcare.brainsait.cloud

# n8n
N8N_WEBHOOK_URL=https://n8n.brainsait.cloud/webhook
```

## Monitoring & Analytics

### Built-in Monitoring

1. **Health Checks**: `/health` and `/ready` endpoints
2. **Metrics Endpoint**: `/metrics` (Prometheus format)
3. **Transaction Logs**: Oracle-style nphies_transactions table
4. **Analytics Dashboard**: Built-in analytics UI

### Key Metrics to Monitor

- Claim submission success rate
- NPHIES response times
- Denial rates by payer
- Prior authorization approval times
- System performance (CPU, Memory, DB connections)

## API Authentication

### Obtaining an API Token

```bash
# Step 1: Generate JWT token
curl -X POST http://localhost:8003/auth/token \
  -H "Content-Type: application/json" \
  -d '{"token": "your-secret-token"}'

# Step 2: Use token in requests
curl -X GET http://localhost:8003/healthcare/requests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL service is running
   - Verify database credentials
   - Check network connectivity

2. **NPHIES Submission Failed**
   - Verify NPHIES API credentials
   - Check internet connectivity to NPHIES
   - Verify FHIR payload format

3. **AI Service Not Responding**
   - Check API keys for Claude/OpenAI
   - Verify network connectivity to AI services
   - Check rate limits

4. **CORS Errors**
   - Verify `ALLOWED_ORIGINS` configuration
   - Check browser console for specific error messages
   - Ensure proper CORS headers in response

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
export ENABLE_MOCK_NPHIES=true  # For testing without real NPHIES
```

## Integration with Existing Basma Platform

### Unified UI

The healthcare claims system integrates seamlessly with the existing Basma UI:

1. **Sidebar Navigation**: Add healthcare claims to existing sidebar
2. **Unified Authentication**: Use same JWT tokens
3. **Shared Components**: Reuse Card, Table, Modal, Badge components
4. **Consistent Styling**: Same color scheme and typography

### Data Sharing

1. **Database**: Extends existing Postgres database
2. **API Gateway**: Runs on same infrastructure (port 8003)
3. **Frontend**: Additional pages and components in existing React app

## Performance Considerations

### Optimizations

1. **Redis Caching**: Frequently accessed data cached
2. **Database Indexing**: Proper indexing for query performance
3. **Connection Pooling**: Database connection reuse
4. **Async Processing**: n8n workflows for background processing
5. **CDN**: Static assets served via CDN

### Scaling

1. **Horizontal Scaling**: Kubernetes HPA for API pods
2. **Database Read Replicas**: For read-heavy operations
3. **Load Balancing**: Multiple API instances behind load balancer
4. **Queue Processing**: n8n workflows scale with queue processing

## Support & Contact

For technical support or questions:
- **Documentation**: This file and inline code comments
- **Repository Issues**: GitHub repository
- **Email**: support@brainsait.com

## License

This healthcare claims system is part of the Basma platform and is licensed under the same terms as the base platform.