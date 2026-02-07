# Product Requirements Document (PRD)
# The "Plug & Play" Saudi Billing System (SBS) Integration Engine

**Version:** 1.0  
**Date:** January 2024  
**Status:** Implementation Ready

---

## Executive Summary

The SBS Integration Engine is a mission-critical middleware solution designed to bridge the gap between healthcare providers' Hospital Information Systems (HIS) and Saudi Arabia's national health platform, NPHIES. By automating the translation of proprietary hospital service codes to the standardized Saudi Billing System (SBS) codes, this solution directly addresses the Kingdom's digital health transformation objectives.

**Key Benefits:**
- ✅ Reduces claim rejection rates by 70%+
- ✅ Accelerates claim processing from days to minutes
- ✅ Ensures 100% compliance with national standards
- ✅ Provides transparent, auditable billing transactions

---

## 1. Strategic Business Drivers

### 1.1 Problem Statement

Healthcare providers in Saudi Arabia currently face significant challenges in the claims submission process:

1. **Code Fragmentation**: Each hospital uses proprietary service codes
2. **High Rejection Rates**: 30-40% of claims rejected due to coding errors
3. **Manual Processing**: Labor-intensive code mapping
4. **Compliance Burden**: Keeping up with CHI regulation changes

### 1.2 Solution Vision

A fully automated, AI-powered integration engine that:
- Translates internal codes to SBS codes in real-time
- Applies financial rules automatically
- Ensures cryptographic security for all transactions
- Provides complete audit trail

---

## 2. System Architecture

### 2.1 Architectural Principles

| Principle | Implementation |
|-----------|----------------|
| **Decoupled Services** | Independent microservices with defined APIs |
| **FHIR R4 Compliance** | All payloads conform to HL7 FHIR standard |
| **RESTful APIs** | HTTP/JSON for all communications |
| **Automation First** | Event-driven, zero-touch processing |
| **Security by Design** | mTLS, digital signatures, encrypted storage |

### 2.2 Technology Stack

- **Backend**: Python 3.11+ (FastAPI framework)
- **Database**: PostgreSQL 14+
- **AI Engine**: Google Gemini Pro
- **Orchestration**: n8n workflow automation
- **Containerization**: Docker & Docker Compose
- **Security**: RSA-2048, SHA-256, mTLS

---

## 3. Microservices Specifications

### 3.1 Normalizer Service (Port 8000)

**Purpose**: Translate internal codes to SBS codes

**Technology**: FastAPI + Gemini AI

**Logic Flow**:
1. Check local mapping database (instant)
2. Check AI cache (< 100ms)
3. Invoke Gemini AI for dynamic lookup (< 2s)

**API Contract**:
```json
POST /normalize
Input: {"facility_id": 1, "internal_code": "LAB-001", "description": "CBC"}
Output: {"sbs_mapped_code": "SBS-LAB-001", "confidence": 0.95}
```

### 3.2 Financial Rules Engine (Port 8002)

**Purpose**: Apply CHI business rules and pricing

**Features**:
- Service bundle detection
- Facility tier-based markup calculation
- Coverage limit validation
- Price adjustment automation

**API Contract**:
```json
POST /validate
Input: {FHIR Claim with SBS codes}
Output: {FHIR Claim with prices, bundles applied}
```

### 3.3 Security & Signer Service (Port 8001)

**Purpose**: Digital signature generation

**Security Features**:
- RSA-2048 signing
- SHA-256 hashing
- Certificate lifecycle management
- Encrypted key storage

**API Contract**:
```json
POST /sign
Input: {"payload": {FHIR object}, "facility_id": 1}
Output: {"signature": "Base64EncodedSignature"}
```

### 3.4 NPHIES Bridge (Port 8003)

**Purpose**: NPHIES API communication

**Features**:
- Automatic retry with exponential backoff
- Transaction logging for audit
- mTLS configuration
- Response normalization

---

## 4. End-to-End Workflow

### 4.1 Automated Claim Submission Pipeline

```
HIS Webhook → Normalizer → FHIR Builder → Financial Rules → Signer → NPHIES
    ↓            ↓              ↓              ↓              ↓         ↓
  Trigger    Translate      Structure      Validate       Sign     Submit
```

**Timing**: Complete pipeline executes in < 5 seconds

### 4.2 n8n Orchestration

The workflow is orchestrated by n8n, providing:
- Visual workflow design
- Error handling and retries
- Monitoring and alerting
- Workflow versioning

---

## 5. Data Architecture

### 5.1 Core Tables

1. **sbs_master_catalogue**: Official CHI SBS codes
2. **facility_internal_codes**: Hospital-specific codes
3. **sbs_normalization_map**: Code mapping registry
4. **pricing_tier_rules**: Financial compliance rules
5. **nphies_transactions**: Complete audit trail

### 5.2 Multi-Tenancy

The system supports multiple facilities through:
- Facility-specific mappings
- Individual certificates per facility
- Isolated transaction logging
- Facility-level configuration

---

## 6. Security & Compliance

### 6.1 Security Layers

1. **Transport Security**: TLS 1.3, mTLS
2. **Payload Security**: Digital signatures (SHA-256 + RSA)
3. **Data Security**: Encryption at rest and in transit
4. **Access Control**: Role-based permissions
5. **Audit Security**: Encrypted logs for PII

### 6.2 Compliance Framework

- ✅ Saudi PDPL (Personal Data Protection Law)
- ✅ NPHIES Integration Standards
- ✅ CHI Business Rules
- ✅ ISO 27001 principles
- ✅ FHIR R4 specification

### 6.3 Digital Signature Process

```
FHIR Payload
    ↓
Canonicalize (sort keys, remove whitespace)
    ↓
SHA-256 Hash
    ↓
Sign with RSA Private Key
    ↓
Base64 Encode
    ↓
Attach to X-NPHIES-Signature header
```

---

## 7. Deployment Strategy

### 7.1 Environment Stages

1. **Development**: Local Docker environment
2. **Sandbox**: NPHIES sandbox integration
3. **Staging**: Pre-production validation
4. **Production**: Live NPHIES connection

### 7.2 Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Storage | 100 GB SSD | 500 GB SSD |
| Network | 100 Mbps | 1 Gbps |
| Availability | 99.5% | 99.9% |

### 7.3 Deployment Automation

```bash
# One-command deployment
./quickstart.sh

# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

---

## 8. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Normalization latency | < 2s | P95 |
| End-to-end processing | < 5s | P95 |
| NPHIES submission | < 3s | P95 |
| Throughput | 1000 claims/hour | Per facility |
| Availability | 99.9% | Monthly |
| Database queries | < 100ms | P95 |

---

## 9. Monitoring & Observability

### 9.1 Health Checks

All services expose `/health` endpoints:
- Database connectivity
- Certificate validity
- External API status
- Resource utilization

### 9.2 Logging

- **Application logs**: Structured JSON logging
- **Audit logs**: PII-encrypted transaction history
- **System logs**: Docker container logs
- **Retention**: 90 days minimum

### 9.3 Alerting

Critical alerts for:
- Service downtime (> 1 minute)
- Certificate expiry (< 30 days)
- High error rate (> 5%)
- Database connection failures

---

## 10. Testing Strategy

### 10.1 Test Coverage

- ✅ Unit tests: Individual service functions
- ✅ Integration tests: Service-to-service communication
- ✅ End-to-end tests: Complete workflow validation
- ✅ Security tests: Penetration testing, vulnerability scans
- ✅ Performance tests: Load testing, stress testing

### 10.2 Test Automation

```bash
# Run all tests
pytest tests/ -v --cov

# Integration tests
pytest tests/integration/ -v

# Load testing
locust -f tests/load/locustfile.py
```

---

## 11. Migration & Onboarding

### 11.1 Hospital Onboarding Process

1. **Week 1**: Initial setup and certificate generation
2. **Week 2**: Internal code mapping (AI-assisted)
3. **Week 3**: Sandbox testing
4. **Week 4**: Production cutover

### 11.2 Data Migration

```sql
-- Import existing mappings
COPY sbs_normalization_map(internal_code_id, sbs_code, confidence)
FROM '/path/to/mappings.csv' CSV HEADER;
```

---

## 12. Success Metrics

### 12.1 Technical KPIs

- Claim submission success rate: > 95%
- Average processing time: < 5 seconds
- System uptime: > 99.9%
- AI mapping confidence: > 85%

### 12.2 Business KPIs

- Reduction in claim rejections: > 70%
- Processing cost reduction: > 60%
- Staff time savings: > 50%
- Revenue cycle acceleration: 3-5 days faster

---

## 13. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| NPHIES API changes | High | Medium | Version monitoring, sandbox testing |
| Certificate expiry | High | Low | Automated alerts, 30-day warning |
| Database failure | High | Low | Automated backups, failover |
| AI service downtime | Medium | Low | Fallback to manual mapping |
| Security breach | High | Low | Defense in depth, regular audits |

---

## 14. Future Enhancements

### Phase 2 (Q2 2024)
- Real-time eligibility checking
- Pre-authorization automation
- Mobile app for claim tracking

### Phase 3 (Q3 2024)
- ML-based fraud detection
- Predictive analytics dashboard
- Multi-language support (Arabic UI)

### Phase 4 (Q4 2024)
- Integration with 10+ HIS vendors
- Cross-border claims support
- Advanced reporting and BI

---

## 15. Support & Maintenance

### 15.1 Support Channels

- **L1 Support**: 24/7 helpdesk
- **L2 Support**: Technical team (business hours)
- **L3 Support**: Engineering escalation
- **Documentation**: Comprehensive online docs

### 15.2 Maintenance Windows

- **Regular maintenance**: Sunday 2-4 AM
- **Emergency patches**: As needed
- **System updates**: Monthly

---

## 16. Conclusion

The SBS Integration Engine represents a comprehensive, production-ready solution for Saudi healthcare billing automation. With its microservices architecture, AI-powered normalization, and robust security framework, it directly addresses the strategic objectives of the Kingdom's digital health transformation while delivering measurable business value to healthcare providers.

**Implementation Status**: ✅ Ready for deployment

**Next Steps**:
1. Deploy to sandbox environment
2. Onboard pilot facility
3. Complete CHI certification
4. Production rollout

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2024 | Engineering Team | Initial release |

---

**Appendix A: API Endpoints Summary**

See [API.md](./docs/API.md) for complete documentation.

**Appendix B: Security Framework**

See [SECURITY.md](./docs/SECURITY.md) for complete security guide.

**Appendix C: Deployment Guide**

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production deployment.
