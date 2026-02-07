# Production Readiness Guide - SBS Integration Engine

**Last Updated:** February 2, 2026  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Deployment Architecture](#deployment-architecture)
5. [Health Checks & Monitoring](#health-checks--monitoring)
6. [Security Hardening](#security-hardening)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

- [ ] **Code Review**
  - [ ] All PRs merged and tested
  - [ ] No uncommitted changes
  - [ ] Branch protection enabled on `main`

- [ ] **Dependencies**
  - [ ] All Python requirements installed
  - [ ] All Node.js packages installed
  - [ ] No security vulnerabilities (run `npm audit`, `pip audit`)

- [ ] **Configuration**
  - [ ] `.env` file created with production values
  - [ ] Database credentials configured
  - [ ] API keys set (NPHIES, Gemini/DeepSeek)
  - [ ] Certificate paths configured

- [ ] **Secrets Management**
  - [ ] Secrets stored in vault (not in `.env`)
  - [ ] Rotation strategy documented
  - [ ] Access logs enabled

- [ ] **Infrastructure**
  - [ ] Docker images built and scanned
  - [ ] Database initialized and backed up
  - [ ] Network policies configured
  - [ ] Firewall rules set

---

## Environment Configuration

### Required Environment Variables

```bash
# Database Configuration
DB_HOST=postgres.example.com
DB_NAME=sbs_production
DB_USER=sbs_api_user
DB_PASSWORD=<secure_password_from_vault>
DB_PORT=5432

# NPHIES Integration
NPHIES_ENV=production
NPHIES_BASE_URL=https://api.nphies.sa/api/v1
NPHIES_API_KEY=<secure_key_from_vault>
NPHIES_TIMEOUT=30
NPHIES_MAX_RETRIES=3

# AI Service Configuration (if using Gemini/DeepSeek)
GEMINI_API_KEY=<secure_key_from_vault>
# OR
DEEPSEEK_API_KEY=<secure_key_from_vault>
AI_PROVIDER=deepseek  # Options: gemini | deepseek | custom
ENABLE_DEEPSEEK=true   # REQUIRED in production to activate DeepSeek
ENVIRONMENT=production # Controls feature flag gating

# Certificate Configuration
CERT_BASE_PATH=/etc/sbs/certs
CERT_PASSWORD=<secure_password_from_vault>

# n8n Workflow Configuration
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<secure_password_from_vault>
N8N_HOST=n8n.internal.example.com
N8N_WEBHOOK_URL=https://api.example.com/webhooks/n8n
N8N_EDITOR_BASE_URL=https://api.example.com/n8n
TIMEZONE=Asia/Riyadh

# Service URLs
SBS_NORMALIZER_URL=http://normalizer:8000
SBS_SIGNER_URL=http://signer:8001
SBS_FINANCIAL_RULES_URL=http://financial-rules:8002
SBS_NPHIES_BRIDGE_URL=http://nphies-bridge:8003

# API Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Upload Configuration
UPLOAD_DIR=/var/sbs/uploads
MAX_FILE_SIZE=10485760  # 10MB

# Feature Flags
ENABLE_MOCK_PROCESSING=false
ENABLE_STAGE_HOOKS=true
SBS_STAGE_HOOK_URL=https://your-monitoring.example.com/hooks/sbs

# pgAdmin (Optional)
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=<secure_password_from_vault>
```

### Optional Environment Variables

```bash
# Database Connection Pool
DB_POOL_MIN=5
DB_POOL_MAX=20

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_FORMAT=json  # or 'text'
LOG_LEVEL=info   # or 'debug', 'warn', 'error'

# Monitoring
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090
```

---

## Database Setup

### 1. Initialize PostgreSQL

```bash
# Connect to PostgreSQL
psql -h DB_HOST -U DB_USER -d postgres

# Create database
CREATE DATABASE sbs_production;

# Create role with limited permissions
CREATE ROLE sbs_api_user WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE sbs_production TO sbs_api_user;

# Connect to the new database
\c sbs_production

# Grant permissions
GRANT USAGE ON SCHEMA public TO sbs_api_user;
GRANT CREATE ON SCHEMA public TO sbs_api_user;
```

### 2. Run Schema Migration

```bash
# Using the provided schema
psql -h DB_HOST -U DB_USER -d sbs_production -f database/schema.sql
```

### 3. Verify Setup

```bash
psql -h DB_HOST -U sbs_api_user -d sbs_production
\dt  # List tables
```

### 4. Backup Strategy

```bash
# Daily backup at 2 AM UTC
0 2 * * * pg_dump -h DB_HOST -U DB_USER -d sbs_production | gzip > /backups/sbs_$(date +\%Y\%m\%d).sql.gz
```

---

## Deployment Architecture

### Docker Compose Stack (Production)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sbs_production
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  normalizer:
    image: sbs-normalizer:latest
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=postgres
      - DB_NAME=sbs_production
      - DB_USER=sbs_api_user
      - DB_PASSWORD=${DB_PASSWORD}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  signer:
    image: sbs-signer:latest
    ports:
      - "8001:8001"
    environment:
      - DB_HOST=postgres
      - DB_NAME=sbs_production
      - DB_USER=sbs_api_user
      - DB_PASSWORD=${DB_PASSWORD}
      - CERT_BASE_PATH=/certs
      - CERT_PASSWORD=${CERT_PASSWORD}
    volumes:
      - ./certs:/certs:ro
    depends_on:
      postgres:
        condition: service_healthy

  financial-rules:
    image: sbs-financial-rules:latest
    ports:
      - "8002:8002"
    environment:
      - DB_HOST=postgres
      - DB_NAME=sbs_production
      - DB_USER=sbs_api_user
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      postgres:
        condition: service_healthy

  nphies-bridge:
    image: sbs-nphies-bridge:latest
    ports:
      - "8003:8003"
    environment:
      - DB_HOST=postgres
      - DB_NAME=sbs_production
      - DB_USER=sbs_api_user
      - DB_PASSWORD=${DB_PASSWORD}
      - NPHIES_BASE_URL=${NPHIES_BASE_URL}
      - NPHIES_API_KEY=${NPHIES_API_KEY}
      - NPHIES_TIMEOUT=30
      - NPHIES_MAX_RETRIES=3
    depends_on:
      postgres:
        condition: service_healthy

  landing:
    image: sbs-landing:latest
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - SBS_NORMALIZER_URL=http://normalizer:8000
      - SBS_SIGNER_URL=http://signer:8001
      - SBS_FINANCIAL_RULES_URL=http://financial-rules:8002
      - SBS_NPHIES_BRIDGE_URL=http://nphies-bridge:8003
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - MAX_FILE_SIZE=10485760
    depends_on:
      - normalizer
      - signer
      - financial-rules
      - nphies-bridge

volumes:
  postgres_data:
```

### Kubernetes Deployment (Enterprise)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sbs-landing
  namespace: sbs-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sbs-landing
  template:
    metadata:
      labels:
        app: sbs-landing
    spec:
      containers:
      - name: landing
        image: sbs-landing:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: sbs-secrets
              key: db-host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sbs-secrets
              key: db-password
        # ... other environment variables
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

---

## Health Checks & Monitoring

### Service Health Endpoints

```bash
# Landing API
curl http://localhost:3000/health

# Normalizer
curl http://localhost:8000/health

# Signer
curl http://localhost:8001/health

# Financial Rules
curl http://localhost:8002/health

# NPHIES Bridge
curl http://localhost:8003/health
```

### Metrics Endpoints

```bash
# Prometheus metrics (all services)
curl http://localhost:PORT/metrics
```

### Monitoring Stack (Recommended)

```yaml
# Prometheus
scrape_configs:
  - job_name: 'sbs-services'
    static_configs:
      - targets: ['localhost:3000', 'localhost:8000', 'localhost:8001', 'localhost:8002', 'localhost:8003']

# Grafana Dashboards
- CPU & Memory usage
- Request rates & latencies
- Error rates & exceptions
- Database connection pool status
- Rate limit metrics
```

---

## Security Hardening

### 1. Network Security

```bash
# Firewall rules
ufw allow from 10.0.0.0/8 to any port 3000
ufw allow from 10.0.0.0/8 to any port 8000-8003
ufw deny from any to any port 3000
```

### 2. Database Security

```bash
# Enable SSL connections
ssl = on
ssl_cert_file = '/etc/postgresql/server.crt'
ssl_key_file = '/etc/postgresql/server.key'

# Restrict connections
pg_hba.conf:
host    sbs_production  sbs_api_user  10.0.0.0/8  md5
```

### 3. Certificate Management

```bash
# Generate certificates
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365

# Verify certificate expiry
openssl x509 -in cert.pem -noout -dates

# Rotate before expiry (30 days before)
*/30 * * * * check_cert_expiry.sh
```

### 4. API Rate Limiting

```bash
# Current defaults
- Landing API: 100 requests/minute per IP
- Normalizer: 100 requests/minute per IP

# Configure nginx rate limiting for frontend
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;
```

---

## DeepSeek AI Integration

### Overview
The normalizer service can use DeepSeek AI for intelligent medical code mapping. This section covers configuration, verification, and rollback procedures for the DeepSeek integration.

### Feature Flag Configuration

DeepSeek is gated by environment-based feature flags to ensure safe rollout:

| Environment | Behavior |
|-------------|----------|
| **Development** | Uses any AI provider with available key |
| **Staging** | DeepSeek enabled automatically if `DEEPSEEK_API_KEY` is present |
| **Production** | Requires explicit `ENABLE_DEEPSEEK=true` flag + key |

### Required Configuration

#### Environment Variables

```bash
# Required for DeepSeek in production
DEEPSEEK_API_KEY=<from-secrets-manager>
ENABLE_DEEPSEEK=true
AI_PROVIDER=deepseek
ENVIRONMENT=production

# Optional: AI fallback configuration
AI_FALLBACK_ENDPOINT=https://ai.internal.sbs/api/map
AI_FALLBACK_API_KEY=<from-secrets-manager>
```

#### Docker Compose Update

Add to `normalizer-service` environment in `docker-compose.yml`:

```yaml
normalizer:
  environment:
    - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
    - ENABLE_DEEPSEEK=true
    - AI_PROVIDER=deepseek
    - ENVIRONMENT=production
```

### Secrets Configuration

#### 1. GitHub Actions Secret (for CI/CD)

```bash
# Via GitHub UI:
# Repository > Settings > Secrets and variables > Actions > New repository secret
# Name: DEEPSEEK_API_KEY
# Value: sk-your-deepseek-api-key

# Or via API:
gh secret set DEEPSEEK_API_KEY -b "sk-your-deepseek-api-key" -R SBS-GIVC/sbs
```

#### 2. Production Runtime Secret

Use your organization's secrets manager:

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name sbs/normalizer/deepseek-api-key \
  --secret-string "sk-your-deepseek-api-key" \
  --description "DeepSeek API key for SBS normalizer service"
```

**Azure Key Vault:**
```bash
az keyvault secret set \
  --vault-name sbs-production-vault \
  --name deepseek-api-key \
  --value "sk-your-deepseek-api-key"
```

**HashiCorp Vault:**
```bash
vault kv put secret/sbs/normalizer \
  deepseek_api_key="sk-your-deepseek-api-key"
```

### Verification Procedures

#### 1. Verify Feature Flag is Active

```bash
# Check environment configuration
docker exec sbs-normalizer printenv | grep -E "(DEEPSEEK|AI_PROVIDER|ENABLE_DEEPSEEK)"

# Expected output:
# DEEPSEEK_API_KEY=<YOUR_DEEPSEEK_API_KEY>
# ENABLE_DEEPSEEK=true
# AI_PROVIDER=deepseek
```

#### 2. Verify AI Provider Initialization

Check application logs for successful initialization:

```bash
docker logs sbs-normalizer 2>&1 | grep -i "deepseek\|ai provider"

# Expected log entries:
# INFO: AI provider initialized: deepseek
# INFO: DeepSeek client ready (model: deepseek-chat)
```

#### 3. Test AI Mapping Endpoint

```bash
# Send a test request to the normalizer
curl -X POST http://localhost:8000/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "service_code": "99213",
    "service_description": "Office visit, established patient"
  }'

# Expected response includes:
# "ai_provider": "deepseek",
# "mapping_confidence": 0.95,
# "mapped_code": "..."
```

#### 4. Monitor AI Call Metrics

```bash
# Check Prometheus metrics endpoint
curl http://localhost:8000/metrics | grep ai_

# Key metrics:
# ai_requests_total{provider="deepseek"} 123
# ai_request_duration_seconds_sum{provider="deepseek"} 45.6
# ai_errors_total{provider="deepseek"} 0
```

### Rollback Procedures

#### Scenario 1: DeepSeek API Failures

If DeepSeek API calls are failing (rate limits, downtime, errors):

**Quick Rollback (No Restart):**
```bash
# The service automatically falls back to rule-based mapping
# Monitor fallback usage:
docker logs sbs-normalizer 2>&1 | grep "AI fallback"
```

**Disable DeepSeek (Requires Restart):**
```bash
# Method 1: Environment variable override
docker exec sbs-normalizer sh -c 'export ENABLE_DEEPSEEK=false'
docker restart sbs-normalizer

# Method 2: Update docker-compose.yml
# Set ENABLE_DEEPSEEK=false
docker-compose up -d normalizer

# Method 3: Switch to Gemini
# Set AI_PROVIDER=gemini and GEMINI_API_KEY
docker-compose up -d normalizer
```

#### Scenario 2: Incorrect Mappings

If DeepSeek is producing incorrect medical code mappings:

```bash
# 1. Immediately switch to deterministic fallback
export AI_PROVIDER=disabled
docker-compose up -d normalizer

# 2. Review error logs
docker logs sbs-normalizer 2>&1 | grep -A 10 "mapping error"

# 3. Audit recent mappings in database
psql -h DB_HOST -U sbs_api_user -d sbs_production -c "
  SELECT service_code, mapped_code, ai_provider, confidence, created_at 
  FROM normalized_codes 
  WHERE ai_provider = 'deepseek' 
  ORDER BY created_at DESC 
  LIMIT 50;
"

# 4. Restore previous provider or rules engine
export AI_PROVIDER=gemini  # or leave empty for rules-only
docker-compose up -d normalizer
```

#### Scenario 3: Key Rotation Incident

If the DeepSeek API key is compromised:

```bash
# Emergency key rotation (see docs/DEEPSEEK_KEY_ROTATION.md)

# 1. Immediately revoke compromised key at DeepSeek platform
# Visit: https://platform.deepseek.com/api-keys

# 2. Generate new key and update secrets
aws secretsmanager update-secret \
  --secret-id sbs/normalizer/deepseek-api-key \
  --secret-string "sk-new-key"

# 3. Force service restart to pick up new key
docker-compose pull normalizer
docker-compose up -d --force-recreate normalizer

# 4. Verify new key works
curl http://localhost:8000/health

# 5. Audit access logs at DeepSeek for unauthorized usage
# Contact DeepSeek support if suspicious activity detected
```

### Monitoring & Alerting

#### Key Metrics to Monitor

1. **AI Request Success Rate**
   - Metric: `ai_requests_total{status="success"} / ai_requests_total`
   - Alert if: < 95% over 5 minutes

2. **AI Response Time**
   - Metric: `ai_request_duration_seconds`
   - Alert if: p99 > 5 seconds

3. **Fallback Usage Rate**
   - Metric: `ai_fallback_total / ai_requests_total`
   - Alert if: > 10% over 5 minutes (indicates DeepSeek issues)

4. **API Key Expiration**
   - Manual check: Review key age every 90 days
   - Alert: 30 days before expiration

#### Recommended Alerts

```yaml
# Prometheus AlertManager rules
groups:
  - name: deepseek_ai
    rules:
      - alert: DeepSeekHighErrorRate
        expr: rate(ai_errors_total{provider="deepseek"}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "DeepSeek AI error rate above 5%"
          description: "Consider rolling back to rule-based mapping"

      - alert: DeepSeekHighLatency
        expr: histogram_quantile(0.99, ai_request_duration_seconds{provider="deepseek"}) > 5
        for: 10m
        annotations:
          summary: "DeepSeek API latency above 5s (p99)"

      - alert: DeepSeekFallbackHigh
        expr: rate(ai_fallback_total[10m]) / rate(ai_requests_total[10m]) > 0.1
        for: 5m
        annotations:
          summary: "More than 10% of requests using fallback mapping"
```

#### Dashboard Metrics

Add to your Grafana dashboard:

```
- AI Provider Distribution (pie chart)
- AI Request Rate (requests/sec by provider)
- AI Latency (p50, p95, p99)
- Fallback Rate (% of requests)
- Error Rate (% by error type)
```

### Documentation References

- **Key Rotation Guide:** `docs/DEEPSEEK_KEY_ROTATION.md`
- **Feature Flags Implementation:** `normalizer-service/feature_flags.py`
- **AI Fallback Module:** `services/normalizer/ai_fallback.py`
- **CI Workflow:** `.github/workflows/ci-deepseek.yml`
- **Environment Template:** `normalizer-service/.env.example`

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error:** `psycopg2.OperationalError: could not translate host name`

**Solution:**
```bash
# Check database host
echo $DB_HOST
# Verify connectivity
nc -zv $DB_HOST 5432
# Test credentials
psql -h $DB_HOST -U $DB_USER -d sbs_production -c "SELECT 1"
```

#### 2. Rate Limit Exceeded

**Error:** `429 Too Many Requests`

**Solution:**
- Check client IP: `X-Forwarded-For` header
- Increase `RATE_LIMIT_MAX_REQUESTS` if needed
- Implement IP whitelisting for trusted services

#### 3. Certificate Validation Failed

**Error:** `cryptography.hazmat.primitives.serialization.InvalidKeyType`

**Solution:**
```bash
# Verify certificate format
openssl x509 -in cert.pem -text -noout
# Check private key
openssl rsa -in key.pem -check
```

#### 4. NPHIES Integration Timeout

**Error:** `httpx.TimeoutException`

**Solution:**
- Check network connectivity to NPHIES
- Increase `NPHIES_TIMEOUT` if network is slow
- Review NPHIES API status
- Check firewall rules

### Logs & Debugging

```bash
# View logs
docker-compose logs -f landing

# Enable debug logging
LOG_LEVEL=debug docker-compose up

# Check specific service
docker-compose logs signer
```

---

## Post-Deployment Validation

1. **Health Checks**
   ```bash
   ./scripts/health-check.sh
   ```

2. **Smoke Tests**
   ```bash
   npm run test:smoke
   ```

3. **Load Testing**
   ```bash
   ab -n 1000 -c 10 http://localhost:3000/health
   ```

4. **Security Scan**
   ```bash
   npm audit --production
   pip audit --strict
   ```

---

## Support & Escalation

- **Infrastructure Issues:** DevOps Team
- **Database Issues:** Database Administrator
- **Security Incidents:** Security Team
- **NPHIES Integration:** NPHIES Support (nphies@nphies.sa)

---

**Production Status: ✅ READY FOR DEPLOYMENT**

*For questions, contact: sbs-platform@example.com*
