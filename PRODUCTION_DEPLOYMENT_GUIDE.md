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
