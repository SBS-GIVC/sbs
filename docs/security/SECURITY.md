# Security Implementation Guide

## Recent Security Updates (January 2026)

The following security improvements have been implemented:

### CORS Configuration
- **Fixed**: All services now restrict CORS to specified allowed origins via `ALLOWED_ORIGINS` environment variable
- **Services updated**: server.js, normalizer-service, financial-rules-engine, signer-service, nphies-bridge, simulation-service
- **Default**: `http://localhost:3000,http://localhost:3001` (configure for production)

### Rate Limiting
- **Added**: Token bucket rate limiting to all Python microservices
- **Default**: 100 requests per minute per IP (50 for signer service)
- **Exempted**: Health check endpoints

### Input Validation
- **Enhanced**: SQL injection, command injection, XSS, and path traversal protection
- **Normalizer service**: Strict alphanumeric validation for internal codes
- **File uploads**: MIME type and extension validation with filename sanitization

### Environment Security
- **Removed**: All insecure default passwords from docker-compose.yml
- **Required**: Mandatory environment variables now fail startup if not set
- **Added**: Production checklist in .env.example

### Docker Security
- **Added**: `security_opt: no-new-privileges:true` to all services
- **Added**: Read-only filesystems where applicable
- **Changed**: Ports bound to localhost (127.0.0.1) except for public-facing landing API
- **Added**: Read-only volume mounts for certificates and workflows

### Test Certificate Endpoint
- **Secured**: `/generate-test-cert` now requires `ENABLE_TEST_CERTIFICATES=true` explicitly
- **Default**: Disabled in all environments

### Error Handling
- **Fixed**: Production mode no longer exposes stack traces or internal error details
- **Added**: Request ID tracking for all errors

### Content Security Policy
- **Added**: Proper CSP headers in server.js (Helmet.js configuration)

---

## Overview

This document details the security architecture and implementation for the SBS Integration Engine, ensuring compliance with:
- Saudi Personal Data Protection Law (PDPL)
- NPHIES Security Requirements
- Healthcare Data Protection Standards

---

## 1. Digital Signature Implementation

### 1.1 Signature Process

The system uses **SHA-256 with RSA** signing:

```
Payload → Canonicalization → SHA-256 Hash → RSA Sign → Base64 Encode
```

**Canonicalization Rules:**
1. Sort all JSON keys alphabetically
2. Remove all whitespace
3. Use consistent separators (`,` and `:`)

**Example:**

```python
import json
import hashlib
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

# Step 1: Canonicalize
canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'))

# Step 2: Sign
signature = private_key.sign(
    canonical.encode('utf-8'),
    padding.PKCS1v15(),
    hashes.SHA256()
)

# Step 3: Encode
signature_b64 = base64.b64encode(signature).decode('utf-8')
```

### 1.2 Certificate Management

**Certificate Lifecycle:**

1. **Generation**: CSR created on secure server
2. **Signing**: Submitted to NPHIES for signing
3. **Installation**: Stored in encrypted vault
4. **Rotation**: Auto-alert 30 days before expiry
5. **Revocation**: Immediate deactivation in database

**Storage Requirements:**
- Private keys: Encrypted at rest (AES-256)
- Access: Restricted to signer service only
- Permissions: 600 (owner read/write only)

```bash
# Correct permissions
chmod 600 /certs/facility_1/private_key.pem
chown signer-service:signer-service /certs/facility_1/private_key.pem
```

---

## 2. Mutual TLS (mTLS)

### 2.1 Configuration

NPHIES requires mutual authentication:

```python
import httpx

# Configure mTLS
client = httpx.Client(
    cert=("/path/to/client-cert.pem", "/path/to/client-key.pem"),
    verify="/path/to/nphies-ca-bundle.pem"
)

response = client.post(
    "https://nphies.sa/api/v1/Claim",
    json=payload,
    headers={"X-NPHIES-Signature": signature}
)
```

### 2.2 Certificate Validation

Server validates:
1. Certificate is signed by trusted CA
2. Certificate is not expired
3. Certificate serial matches registered facility
4. Hostname matches certificate CN

---

## 3. Data Protection

### 3.1 Encryption at Rest

**Database Encryption:**

```sql
-- Enable encryption for sensitive columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt PII before storage
INSERT INTO patient_data (ssn, encrypted_data)
VALUES (
  '1234567890',
  pgp_sym_encrypt('sensitive data', 'encryption_key')
);

-- Decrypt on retrieval
SELECT 
  ssn,
  pgp_sym_decrypt(encrypted_data::bytea, 'encryption_key') as data
FROM patient_data;
```

**File System Encryption:**

```bash
# Enable LUKS encryption for certificate storage
cryptsetup luksFormat /dev/sdb
cryptsetup open /dev/sdb certs_encrypted
mkfs.ext4 /dev/mapper/certs_encrypted
mount /dev/mapper/certs_encrypted /certs
```

### 3.2 Encryption in Transit

All communications use TLS 1.2+:

```nginx
# Nginx SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

---

## 4. Access Control

### 4.1 Service Authentication

**API Key Management:**

```python
# Environment-based secrets
API_KEY = os.getenv("NPHIES_API_KEY")

# Key rotation every 90 days
# Store in AWS Secrets Manager or HashiCorp Vault
```

**Token Validation:**

```python
from fastapi import Security, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

def verify_token(credentials: str = Security(security)):
    if credentials.credentials != os.getenv("API_KEY"):
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials
```

### 4.2 Database Access Control

```sql
-- Create role-based access
CREATE ROLE sbs_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sbs_read;

CREATE ROLE sbs_write;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO sbs_write;

-- Service-specific users
CREATE USER normalizer_service WITH PASSWORD 'strong_password';
GRANT sbs_read TO normalizer_service;

CREATE USER nphies_bridge WITH PASSWORD 'strong_password';
GRANT sbs_write TO nphies_bridge;
```

---

## 5. Logging & Audit

### 5.1 Audit Trail

**What to Log:**
- All API requests and responses
- Authentication attempts
- Certificate usage
- Data access (especially PII)
- Configuration changes

**Implementation:**

```python
import logging
from cryptography.fernet import Fernet

# Initialize encrypted logger
cipher = Fernet(os.getenv("LOG_ENCRYPTION_KEY"))

def log_audit_event(event_type, entity_id, description, sensitive_data=None):
    """Log audit event with optional PII encryption"""
    
    encrypted_data = None
    if sensitive_data:
        encrypted_data = cipher.encrypt(json.dumps(sensitive_data).encode())
    
    cursor.execute("""
        INSERT INTO system_audit_log 
        (event_type, entity_type, entity_id, event_description, 
         encrypted_data, ip_address, user_agent)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        event_type,
        "Claim",
        entity_id,
        description,
        encrypted_data,
        request.client.host,
        request.headers.get("user-agent")
    ))
```

### 5.2 Log Rotation & Retention

```bash
# /etc/logrotate.d/sbs-integration
/var/log/sbs-integration/*.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 0640 sbs-service sbs-service
    postrotate
        docker-compose restart
    endscript
}
```

---

## 6. Vulnerability Management

### 6.1 Dependency Scanning

```bash
# Python dependencies
pip install safety
safety check -r requirements.txt

# Docker images
docker scan sbs-normalizer:latest
```

### 6.2 Security Updates

```bash
# Automated security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 6.3 Penetration Testing

**Schedule:**
- Internal testing: Monthly
- External audit: Quarterly
- Vulnerability scan: Weekly

**Tools:**
- OWASP ZAP
- Burp Suite
- Nmap
- Nikto

---

## 7. Incident Response

### 7.1 Incident Types

1. **Data Breach**: Unauthorized PII access
2. **Certificate Compromise**: Private key exposure
3. **Service Disruption**: DDoS or failure
4. **Authentication Failure**: Brute force attempts

### 7.2 Response Procedure

**Immediate Actions:**

```bash
# 1. Isolate affected service
docker-compose stop <service-name>

# 2. Revoke compromised certificates
psql -d sbs_integration -c "UPDATE facility_certificates SET is_active = FALSE WHERE cert_id = X"

# 3. Rotate API keys
# Update in secrets manager and restart services

# 4. Analyze logs
grep "ERROR" /var/log/sbs-integration/* | grep "<incident-time>"

# 5. Notify stakeholders
# Send alert via configured channels
```

### 7.3 Post-Incident

1. Root cause analysis
2. Update security measures
3. Staff training
4. Documentation update

---

## 8. Compliance Checklist

### 8.1 PDPL Compliance

- [ ] Data minimization implemented
- [ ] Consent management system
- [ ] Right to erasure capability
- [ ] Data breach notification process
- [ ] Privacy impact assessment completed
- [ ] DPO appointed

### 8.2 NPHIES Requirements

- [ ] mTLS configured
- [ ] Digital signatures implemented
- [ ] FHIR R4 compliance validated
- [ ] Sandbox testing completed
- [ ] Production credentials obtained
- [ ] Audit logging enabled

### 8.3 Best Practices

- [ ] Principle of least privilege
- [ ] Defense in depth
- [ ] Secure by default
- [ ] Regular security training
- [ ] Incident response plan
- [ ] Business continuity plan

---

## 9. Security Testing

### 9.1 Pre-Deployment Tests

```bash
# 1. Certificate validation
curl -X GET http://localhost:8001/verify-certificate/1

# 2. Signature verification
python tests/test_signature.py

# 3. Encryption test
python tests/test_encryption.py

# 4. Access control test
python tests/test_auth.py
```

### 9.2 Continuous Monitoring

```python
# Health check with security validation
@app.get("/security-health")
def security_health():
    checks = {
        "certificates_valid": check_certificates_expiry(),
        "encryption_enabled": check_encryption_status(),
        "audit_logging": check_audit_logs(),
        "unauthorized_access": check_failed_logins()
    }
    
    if not all(checks.values()):
        raise HTTPException(status_code=503, detail=checks)
    
    return {"status": "secure", "checks": checks}
```

---

## 10. Security Contacts

- **Security Team**: security@sbs-integration.sa
- **Incident Response**: incident@sbs-integration.sa
- **NPHIES Security**: security@nphies.sa
- **Emergency Hotline**: +966-XXX-XXXX

---

## References

- [NPHIES Security Guidelines](https://nphies.sa/security)
- [Saudi PDPL](https://sdaia.gov.sa/en/PDPL/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FHIR Security](https://www.hl7.org/fhir/security.html)
