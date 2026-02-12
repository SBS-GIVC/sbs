# HealthcareLinc Agent

**Unified Healthcare Workflow Management for BrainSAIT SBS Platform**

HealthcareLinc is a FHIR-compliant healthcare management agent that provides a unified submission API for all healthcare transactions, role-based access control, and intelligent workflow orchestration.

---

## 🎯 Overview

HealthcareLinc implements the complete NHIES (National Health Information Exchange System) as described in `healthcare.md`, integrating seamlessly with the existing SBS microservices architecture.

### Key Features

✅ **Unified Submission API** - Single endpoint for all healthcare transactions  
✅ **Role-Based Access Control** - JWT authentication with patient/provider/payer/admin roles  
✅ **FHIR R4 Compliant** - Standards-based healthcare data models  
✅ **Intelligent Workflow Routing** - Auto-routing to appropriate Linc agents  
✅ **Multi-Stakeholder Management** - Patients, Providers, Payers, Admins  
✅ **Real-time Status Tracking** - Request lifecycle management  
✅ **Integration Ready** - Works with NPHIES Bridge, MasterLinc, ClaimLinc, AuthLinc  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         HealthcareLinc Agent (Port 4004)    │
│  ┌─────────────────────────────────────┐   │
│  │  Unified Submission API (/api/submit)│   │
│  │  • Prior Authorization               │   │
│  │  • Claims                            │   │
│  │  • Referrals                         │   │
│  │  • Eligibility Checks                │   │
│  └─────────────────────────────────────┘   │
│                     ↓                        │
│  ┌─────────────────────────────────────┐   │
│  │  Intelligent Workflow Router         │   │
│  │  • prior_auth → AuthLinc            │   │
│  │  • claim → ClaimLinc                │   │
│  │  • referral → ComplianceLinc        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓
    ┌───────────────┴───────────────┐
    ↓                               ↓
MasterLinc (4000)            NPHIES Bridge (8003)
    ↓                               ↓
Linc Agents                   NPHIES Platform
```

---

## 📋 API Endpoints

### Authentication
```
POST   /auth/login           - Login and get JWT token
GET    /auth/me              - Get current user info
```

### Unified Submission (Provider Only)
```
POST   /api/submit           - Submit any healthcare transaction
```

### Request Management
```
GET    /api/requests         - List requests (role-filtered)
GET    /api/requests/{id}    - Get request details
PUT    /api/requests/{id}/status  - Update status (provider)
POST   /api/requests/{id}/approve - Approve/deny (payer)
```

### Dashboards
```
GET    /api/dashboard/{role} - Get role-specific dashboard data
```

### Health Check
```
GET    /health               - Service health check
GET    /                     - Service info and endpoints
```

---

## 🔐 Authentication

HealthcareLinc uses JWT (JSON Web Tokens) for authentication with role-based access control.

### Login Example

```bash
curl -X POST http://localhost:4004/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cityhospital",
    "password": "provider123"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 3,
    "username": "cityhospital",
    "role": "provider",
    "full_name": "City Hospital Riyadh"
  }
}
```

### Using the Token

```bash
curl -X GET http://localhost:4004/api/requests \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🚀 Unified Submission API

The heart of the NHIES system - one endpoint for all healthcare transactions.

### Example: Submit a Prior Authorization

```bash
curl -X POST http://localhost:4004/api/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_type": "prior_auth",
    "patient_id": 1,
    "service_code": "73562",
    "service_date": "2026-02-15",
    "diagnosis_codes": ["M17.11"],
    "clinical_notes": "Patient presents with knee pain",
    "priority": "normal"
  }'
```

### Example: Submit a Claim

```bash
curl -X POST http://localhost:4004/api/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "request_type": "claim",
    "patient_id": 1,
    "service_code": "99213",
    "service_date": "2026-02-12",
    "diagnosis_codes": ["I10"],
    "clinical_notes": "Follow-up visit for hypertension",
    "estimated_cost": 250.00,
    "details": {
      "billed_amount": 250.00
    }
  }'
```

---

## 👥 User Roles

### Patient
- View their own medical requests
- Track request status
- Access personal health information

### Provider
- Submit all types of healthcare transactions
- View and manage their submitted requests
- Update request status after service delivery

### Payer (Insurance Company)
- Review pending authorization requests
- Approve or deny requests
- View assigned requests only

### Admin
- Full system access
- Manage users and services
- View all requests across the system

---

## 🗄️ Database Schema

HealthcareLinc uses PostgreSQL with FHIR-compliant tables:

- `healthcare_users` - Multi-role user management
- `healthcare_patients` - Patient profiles
- `healthcare_providers` - Healthcare providers
- `healthcare_payers` - Insurance companies
- `healthcare_services` - Service catalog (CPT/ICD codes)
- `healthcare_requests` - Unified service requests
- `healthcare_approvals` - Approval/denial records
- `healthcare_claims` - Financial claims

---

## 🔄 Workflow Examples

### Prior Authorization Workflow

1. **Provider** submits prior auth via `/api/submit`
2. **System** auto-assigns to patient's payer
3. **System** routes to AuthLinc for eligibility check
4. **Payer** receives notification of pending request
5. **Payer** reviews and approves via `/api/requests/{id}/approve`
6. **Provider** notified of approval
7. **Provider** delivers service and updates status

### Claim Processing Workflow

1. **Provider** submits claim via `/api/submit`
2. **System** creates claim record
3. **System** routes to ClaimLinc for processing
4. **ClaimLinc** → Normalizer → Financial Rules → Signer → NPHIES
5. **Payer** processes claim
6. **System** tracks payment status

---

## 🛠️ Development

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis (for session management)

### Local Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export DB_HOST=localhost
export DB_NAME=sbs_integration
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_PORT=5432
export JWT_SECRET_KEY=your-secret-key
```

3. Initialize database:
```bash
psql -U postgres -d sbs_integration -f ../../../database/schema/healthcare.sql
```

4. Seed demo data:
```bash
python seed_data.py
```

5. Run the service:
```bash
uvicorn main:app --reload --port 4004
```

---

## 🐳 Docker Deployment

See the main `docker-compose.yml` for the complete deployment configuration.

### Build and Run

```bash
docker-compose up healthcarelinc-agent
```

The service will be available at `http://localhost:4004`

---

## 🧪 Testing

### Manual Testing with cURL

Test authentication:
```bash
# Login
curl -X POST http://localhost:4004/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "cityhospital", "password": "provider123"}'

# Get user info
curl http://localhost:4004/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### API Documentation

Interactive API docs available at:
- Swagger UI: `http://localhost:4004/docs`
- ReDoc: `http://localhost:4004/redoc`

---

## 📊 Demo Credentials

After running `seed_data.py`, use these credentials:

**Admin:**
- Username: `admin`
- Password: `admin123`

**Provider (City Hospital):**
- Username: `cityhospital`
- Password: `provider123`

**Payer (InsureCo):**
- Username: `insureco`
- Password: `payer123`

**Patient (Ahmed Ali):**
- Username: `ahmed_ali`
- Password: `patient123`

---

## 🔗 Integration Points

### With Existing SBS Services

- **MasterLinc** (Port 4000) - Workflow orchestration
- **NPHIES Bridge** (Port 8003) - NPHIES platform integration
- **ClaimLinc** (Port 4001) - Claim processing pipeline
- **AuthLinc** (Port 4002) - Eligibility and authorization
- **ComplianceLinc** (Port 4003) - Compliance checking
- **PostgreSQL** - Shared database
- **Redis** - Session and real-time updates

---

## 📈 Scaling Considerations

- **Horizontal Scaling**: Multiple instances behind load balancer
- **Database**: Read replicas for reporting
- **Caching**: Redis for frequently accessed data
- **Message Queue**: For asynchronous workflow processing
- **Monitoring**: Prometheus metrics at `/metrics`

---

## 🔒 Security

- JWT tokens with role-based claims
- Password hashing with bcrypt
- HTTPS in production (via Traefik)
- Rate limiting (shared middleware)
- Input validation with Pydantic
- SQL injection protection (SQLAlchemy ORM)
- CORS restrictions

---

## 📝 License

Part of BrainSAIT SBS Platform - Internal Use

---

## 🤝 Contributing

This service is part of the BrainSAIT ecosystem. For changes:

1. Follow existing code patterns
2. Update tests
3. Document API changes
4. Update this README

---

## 📞 Support

For issues or questions:
- GitHub: https://github.com/SBS-GIVC/sbs
- Email: ops@brainsait.cloud

---

**Built with ❤️ for Healthcare Transformation by BrainSAIT Team**
