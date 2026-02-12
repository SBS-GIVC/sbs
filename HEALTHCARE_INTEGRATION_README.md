# Healthcare Claims System Integration with Basma Platform

## Overview

This document describes the complete healthcare claims system integration built on top of the Basma platform. The system provides a unified healthcare claims submission and management solution that integrates with the Saudi NPHIES platform.

## What's New in This Integration

### Key Features Added

1. **Unified Submission Channel** - Single endpoint for claims, prior authorization, and eligibility verification
2. **Role-Based Access Control** - Patient, Provider, Payer, and Admin portals
3. **AI-Powered Validation** - ML-based pre-submission validation and denial prevention
4. **NPHIES Integration** - Direct submission to Saudi National Platform for Health Information Exchange
5. **Workflow Automation** - n8n workflows for automated claim processing
6. **Analytics Dashboard** - Comprehensive analytics and reporting
7. **HIPAA-Aware Design** - Compliance-focused architecture

### Architecture Enhancements

```
Basma Platform (Existing)              Healthcare Add-ons (New)
┌─────────────────────────┐           ┌─────────────────────────┐
│  SBS Landing (React)    │           │  Healthcare Dashboard   │
│  - Core Dashboard       │           │  - Patient Portal       │
│  - Claim Builder        │◄────────►│  - Provider Portal      │
│  - Analytics            │           │  - Payer Portal         │
│                         │           │  - Admin Dashboard      │
├─────────────────────────┤           ├─────────────────────────┤
│  API Gateway (Port 3000)│           │  NPHIES Bridge (8003)   │
│  - Core SBS APIs        │           │  - Unified Submit       │
│  - Integration Layer    │           │  - Prior Auth API       │
│                         │           │  - Eligibility API      │
├─────────────────────────┤           ├─────────────────────────┤
│  PostgreSQL Database    │           │   New Healthcare Tables │
│  - Existing SBS Tables  │    ═══►   │   - Patients            │
│  - Shared Configuration │           │   - Providers           │
│                         │           │   - Payers              │
│                         │           │   - ServiceRequest      │
│                         │           │   - Claims              │
│                         │           │   - PriorAuths          │
├─────────────────────────┤           ├─────────────────────────┤
│  AI Services            │           │  Healthcare AI Service  │
│  - Claim Analyzer       │           │  - Code Validation      │
│  - Denial Prediction    │           │  - Denial Prevention    │
│  - Copilot              │           │  - Clinical Review      │
└─────────────────────────┘           └─────────────────────────┘
```

## Integration Points

### Database Schema Extension

The healthcare system adds **11 new tables** to the existing database:

```sql
-- Healthcare Entity Tables
patients
providers
payers
services

-- Core Healthcare Workflow
service_request
prior_authorizations
claims
claim_line_items

-- Workflow & Approvals
approvals
request_status_history

-- AI Features
ai_claim_validation_cache
denial_prevention_analysis
healthcare_analytics_events
healthcare_kpis
```

See [`database/schema.sql`](infrastructure/schema.sql) for complete definitions.

### API Endpoint Integration

#### Integrated NPHIES Bridge (Port 8003)

The existing NPHIES bridge is enhanced with healthcare-specific endpoints:

**Healthcare Submission Endpoints:**
```
POST /unified-healthcare-submit
POST /healthcare/prior-auth
POST /healthcare/eligibility/check
POST /healthcare/claims

**Healthcare Management Endpoints:**
```
GET  /healthcare/requests
GET  /healthcare/requests/{id}
PUT  /healthcare/requests/{id}/status
POST /healthcare/requests/{id}/approve

**Healthcare Search Endpoints:**
```
GET  /healthcare/patients/search
GET  /healthcare/payers
GET  /healthcare/services/search

**Healthcare Dashboard Endpoints:**
```
GET  /healthcare/dashboard/{role}
GET  /healthcare/analytics/dashboard
```

#### Integration with Existing SBS APIs

The healthcare system leverages existing SBS services:
- **Normalizer Service**: Code translation (HIPAA codes ↔ SBS codes)
- **Signer Service**: Digital signatures for NPHIES submission
- **Financial Rules Engine**: Pre-submission validation
- **AI Prediction Service**: Claim outcome predictions
- **MasterLinc**: Agent orchestration

### Frontend Integration

#### Added React Pages

1. **`/healthcare-claims`** - Main healthcare claims management interface
2. **`/healthcare-dashboard`** - Role-specific dashboard
3. **Integrated components** in existing SBS UI:
   - Quick actions for healthcare claims
   - Analytics integration

#### Component Integration

```jsx
// Existing SBS components reused
import { Card, Modal, Table, Badge, Tabs } from '../components/ui';
import { useAuth, useLanguage, useToast } from '../hooks';

// New healthcare components
import { HealthcareClaimsPage } from '../pages/HealthcareClaimsPage';
import { UnifiedHealthcareDashboard } from '../pages/UnifiedHealthcareDashboard';
```

### n8n Workflow Integration

#### Integrated Workflows

The healthcare system includes pre-built n8n workflows:

1. **Healthcare Claim Processing** - Full claim lifecycle automation
2. **Prior Authorization Workflow** - Automated prior auth processing
3. **Eligibility Verification** - Real-time eligibility checking

#### Workflow Communication

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │ ─► │    n8n      │ ─► │  Services   │ ─► │  Database   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                  │                  │
       ▼                   ▼                  ▼                  ▼
  React Pages       Workflow Engine    Normalizer/Signer     PostgreSQL
       │                   │                  │                  │
       └───────────────────┼──────────────────┼──────────────────┘
                           │
                           ▼
                    NPHIES Bridge
          (Port 8003 - Healthcare API)
```

## Installation Guide

### Prerequisites

1. **Existing Basma Platform** - Must be installed and running
2. **PostgreSQL Database** - At least version 13
3. **Redis** - For caching and session management
4. **Node.js** - For frontend (optional, if using existing)
5. **Python 3.9+** - For NPHIES bridge and healthcare API
6. **Docker (optional)** - For containerized deployment

### Installation Steps

#### Step 1: Database Setup

```bash
# Apply healthcare schema extensions
cd /Users/fadil369/sbs

# Run the schema updates
npm run db:migrate

# Or apply manually:
psql -U postgres -d sbs_integration < database/schema.sql
```

#### Step 2: NPHIES Bridge Setup

```bash
# Install Python dependencies
cd nphies-bridge
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run the bridge
python main.py
```

#### Step 3: Frontend Integration

```bash
# Add healthcare pages to your React app
cd sbs-landing

# Build the frontend
npm run build

# Start the development server
npm run dev
```

#### Step 4: n8n Workflow Setup

```bash
# Import healthcare workflows
# The n8n workflows will be loaded automatically via docker-compose
# Or manually import via n8n UI:
# 1. Open n8n (http://localhost:5678)
# 2. Import workflow: n8n-workflows/healthcare-claim-processing.json
# 3. Configure credentials
# 4. Activate workflow
```

### Docker Deployment (Recommended)

```bash
# Use the provided deployment script
./deployment/deploy-healthcare.sh development

# Or deploy with docker-compose
docker-compose -f docker-compose.yml up -d
```

### Kubernetes Deployment

```bash
# Deploy to Kubernetes
./deployment/deploy-healthcare.sh production

# Or apply manually:
kubectl apply -f deployment/healthcare-k8s-deployment.yaml
```

## Configuration

### Environment Variables

Create or update `.env` with healthcare configuration:

```bash
# Healthcare Database Configuration
DB_NAME=sbs_integration
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# NPHIES Configuration
NPHIES_BASE_URL=https://sandbox.nphies.sa/api/v1
NPHIES_API_KEY=your_nphies_api_key
ENABLE_MOCK_NPHIES=false  # Set to true for local testing

# AI Service Configuration
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://healthcare.brainsait.cloud

# SBS Integration
SBS_API_URL=http://localhost:3000
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

### Configuration Files

1. **`database/schema.sql`** - Healthcare schema extensions
2. **`nphies-bridge/healthcare_api.py`** - Healthcare API implementation
3. **`sbs-landing/src/config/api.config.js`** - Client configuration
4. **`n8n-workflows/healthcare-claim-processing.json`** - Workflow definitions

## Usage Guide

### Patient Portal Workflow

1. **Registration** - Patient registers with insurance information
2. **View Claims** - Patients can view their claims history
3. **Track Status** - Real-time claim status updates
4. **Eligibility Check** - Verify insurance coverage

### Provider Portal Workflow

1. **Patient Management** - Select patient for service
2. **Service Selection** - Choose from healthcare codes
3. **Claims Submission** - Submit claims with digital signature
4. **Prior Authorization** - Request approval for specific services
5. **Analytics** - View practice metrics and denials

### Payer Portal Workflow

1. **Review Queue** - View pending claims and prior auths
2. **Decisions** - Approve, deny, or request more information
3. **Analytics** - View payer-specific metrics
4. **Reports** - Generate reports for compliance

### Admin Portal Workflow

1. **System Configuration** - Configure settings and users
2. **Analytics Dashboard** - System-wide analytics
3. **User Management** - Create and manage users
4. **System Monitoring** - Health and performance monitoring

## API Examples

### Submit Healthcare Claim

```bash
curl -X POST http://localhost:8003/unified-healthcare-submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
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
      "clinical_notes": "Patient requires follow-up",
      "billed_amount": 75.00,
      "priority": "normal"
    }
  }'
```

### Check Eligibility

```bash
curl -X POST http://localhost:8003/healthcare/eligibility/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "patient_id": 1,
    "provider_id": 1,
    "service_codes": ["99213"],
    "check_type": "real_time"
  }'
```

### Submit Prior Authorization

```bash
curl -X POST http://localhost:8003/healthcare/prior-auth \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "patient_id": 1,
    "provider_id": 1,
    "payer_id": 1,
    "service_codes": ["99213", "80053"],
    "diagnosis_codes": ["I10", "E11.9"],
    "start_date": "2024-01-01",
    "end_date": "2024-12-31",
    "clinical_justification": "Patient requires ongoing monitoring",
    "urgency": "normal"
  }'
```

## Integration Features

### AI-Powered Validation

The healthcare system integrates with existing AI services:

1. **Denial Prevention Cop** - AI assistant from Basma platform
2. **Claim Analyzer** - Pre-submission validation and scoring
3. **Clinical Review** - AI-powered clinical notes analysis
4. **Code Suggestion** - Intelligent CPT/ICD code recommendations

### Workflow Automation

#### n8n Integration Points

```
1. Claim Submission
   ├── Webhook receive
   ├── AI validation
   ├── Eligibility check
   ├── Digital signature
   ├── NPHIES submission
   ├── Status update
   └── Analytics logging

2. Prior Authorization
   ├── Request creation
   ├── Payer routing
   ├── Clinical review
   ├── Decision workflow
   └── Notification

3. Eligibility Verification
   ├── Real-time check
   ├── Coverage verification
   ├── Cost estimate
   └── Authorization requirements
```

### Analytics & Reporting

#### Built-in Analytics

- Claims volume and trends
- Denial rates by payer/service
- Prior authorization turnaround times
- Provider performance metrics
- Payer compliance analysis

#### Business Intelligence

Integration with existing SBS analytics infrastructure for:
- Predictive analytics
- Trend analysis
- Quality metrics
- Cost analysis

## Testing

### Test Data

The system includes sample data for testing:

```sql
-- Sample Patients
INSERT INTO users (username, password_hash, email, role) VALUES
('test_patient', 'hashed_password', 'patient@test.com', 'patient');

-- Sample Providers
INSERT INTO users (username, password_hash, email, role) VALUES
('test_provider', 'hashed_password', 'provider@test.com', 'provider');

-- Sample Payers
INSERT INTO payers (company_name, nphies_payer_id) VALUES
('Test Insurance', 'NPHIES-T1-001');
```

### Run Tests

```bash
# Healthcare integration tests
cd /Users/fadil369/sbs
python -m pytest tests/test_healthcare_claims_integration.py -v

# API endpoint tests
python -m pytest tests/test_total_system_integration.py -v

# Load tests
python -m pytest tests/test_performance.py -v
```

## Monitoring & Maintenance

### Health Checks

```bash
# System health
curl http://localhost:8003/health
curl http://localhost:8003/ready

# Database connectivity
psql -U postgres -d sbs_integration -c "SELECT COUNT(*) FROM patients;"

# Redis connectivity
redis-cli ping
```

### Logs

```bash
# NPHIES Bridge logs
docker logs -f sbs-nphies-bridge

# Database logs
docker logs -f sbs-postgres

# Application logs
tail -f logs/application.log
```

### Performance Monitoring

Key metrics to monitor:
1. **Claim submission rate** - Target: 1000+ claims/hour
2. **NPHIES response time** - Target: < 2 seconds
3. **API response time** - Target: < 500ms
4. **Database query time** - Target: < 100ms
5. **System uptime** - Target: 99.99%

### Backup Strategy

1. **Database**: Daily automated backups to R2/Cloud Storage
2. **Configuration**: Version controlled in git
3. **Workflows**: Automatic export from n8n
4. **Logs**: Centralized logging infrastructure

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# Or
systemctl status postgresql

# Test connection
psql -U postgres -d sbs_integration -c "SELECT 1;"
```

#### NPHIES API Issues

```bash
# Enable mock mode for testing
export ENABLE_MOCK_NPHIES=true

# Check NPHIES configuration
curl -X POST http://localhost:8003/terminology/validate-code \
  '{
    "system": "http://hl7.org/fhir/sid/icd-10",
    "code": "I10"
  }'
```

#### CORS Issues

```bash
# Verify ALLOWED_ORIGINS is set correctly
echo $ALLOWED_ORIGINS

# Check browser console for specific error messages
# Ensure both frontend and backend ports are allowed
```

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
export PYTHONPATH=/Users/fadil369/sbs:/Users/fadil369/sbs/nphies-bridge

# Run with debug
python main.py --log-level DEBUG
```

## Integration with Existing Basma Features

### Reused Components

The healthcare system seamlessly integrates with existing Basma features:

1. **Authentication** - Same JWT system as Basma
2. **UI Components** - Reusable Card, Table, Modal, Badge components
3. **AI Services** - Shared AI infrastructure
4. **API Gateway** - Unified API access
5. **Database** - Shared PostgreSQL instance
6. **Monitoring** - Integrated logging and metrics

### Additive Changes

The integration adds new features without modifying existing ones:

- ✅ New pages in existing UI
- ✅ New API endpoints on existing path
- ✅ New database tables
- ✅ New n8n workflows
- ✅ New test coverage

### Backward Compatibility

All existing Basma functionality remains unchanged:
- Existing APIs continue to work
- Existing database schema remains
- Existing UI components available
- Existing workflows still functional

## Performance Considerations

### Optimization Strategies

1. **Database Indexing**: Proper indexes on all healthcare tables
2. **Redis Caching**: Cache frequently accessed data
3. **Connection Pooling**: Reuse database connections
4. **Async Processing**: Background job processing with n8n
5. **CDN Usage**: Serve static assets via CDN

### Scaling

1. **Horizontal Scaling**: Kubernetes HPA for API pods
2. **Database Read Replicas**: For read-heavy operations
3. **Load Balancing**: Multiple API instances
4. **Queue Processing**: n8n workflows scale with queue size

## Security Considerations

### HIPAA Compliance

1. **PHI Protection**: No Protected Health Information in logs
2. **Encryption**: TLS for data in transit, AES-256 at rest
3. **Access Control**: Role-based access control
4. **Audit Trail**: Complete audit logging
5. **Data Retention**: Automatic data retention policies

### Security Checklist

- [x] SSL/TLS for all external communication
- [x] JWT-based authentication with expiration
- [x] Rate limiting per IP address
- [x] Role-based access control
- [x] Input validation and sanitization
- [x] SQL injection prevention
- [x] XSS protection
- [x] CSRF protection
- [x] Audit logging
- [x] Regular security updates

## Migration from SBS

### Data Migration

If you have existing SBS data, no migration is required. The healthcare system extends the existing database with new tables only.

### Configuration Migration

Copy your existing SBS configuration:

```bash
# Copy existing SBS env to new .env
cp .env.sbs .env

# Add healthcare-specific variables
cat >> .env << EOF
# Healthcare Configuration
NPHIES_BASE_URL=https://sandbox.nphies.sa/api/v1
NPHIES_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
EOF
```

## Future Enhancements

### Planned Features

1. **Mobile Application** - React Native app for patients
2. **Real-time Chat** - Provider-patient communication
3. **Telehealth Integration** - Virtual visit support
4. **Inventory Management** - Pharmacy and medical supplies
5. **Lab Integration** - Results delivery to patients
6. **Portals** - Enhanced portals for different stakeholders

### Integration Roadmap

- Phase 1: Core claims processing (Current ✅)
- Phase 2: Advanced AI features (Q1 2025)
- Phase 3: Mobile applications (Q2 2025)
- Phase 4: International expansion (Q3 2025)

## Support

### Documentation

- **API Documentation**: Available at `http://localhost:8003/docs`
- **Healthcare Documentation**: [`HEALTHCARE_SYSTEM_DOCUMENTATION.md`](HEALTHCARE_SYSTEM_DOCUMENTATION.md)
- **Deployment Guide**: [`deployment/deploy-healthcare.sh`](deployment/deploy-healthcare.sh)

### Getting Help

1. **Documentation**: This file and inline code comments
2. **Health Check**: `/health` endpoint for system status
3. **Healthcare Support**: healthcare-support@brainsait.com
4. **Basma Support**: support@brainsait.com

### Community

- GitHub Issues for bug reports
- Discord/Slack for community discussion
- Monthly community calls

## License

This healthcare claims system is part of the Basma platform and is licensed under the same terms.

---

**Note**: This integration is production-ready but should be thoroughly tested in a staging environment before deploying to production. The healthcare system operates independently from the core SBS system, ensuring stability and reliability.