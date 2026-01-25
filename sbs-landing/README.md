# 🚀 SBS Landing Page - Complete Integration Guide

## 📋 Overview

This is the production-ready landing page for **brainsait.cloud** that integrates with your SBS microservices and n8n workflow automation.

### ✨ Key Features

- ✅ **Bilingual Support** - English & Arabic
- ✅ **Claim Submission Form** - Upload and submit insurance claims
- ✅ **n8n Workflow Integration** - Automatically triggers workflow on submission
- ✅ **Direct SBS Integration** - Fallback to microservices if n8n unavailable
- ✅ **Traefik Integration** - Auto SSL with Let's Encrypt
- ✅ **Production Hardened** - Rate limiting, security headers, file validation
- ✅ **Health Monitoring** - Built-in health checks and metrics

---

## 📁 Project Structure

```
/root/sbs-landing/
├── server.js                 # Express backend API
├── public/
│   ├── index.html           # Landing page HTML
│   └── landing.js           # Frontend JavaScript
├── Dockerfile               # Container configuration
├── docker-compose.yml       # Deployment configuration
├── deploy.sh                # Automated deployment script
├── .env                     # Environment variables
├── package.json             # Node.js dependencies
└── README.md                # This file
```

---

## 🔧 Architecture

### Request Flow

```
User uploads claim
     ↓
Frontend (landing.js)
     ↓
Backend API (server.js)
     ↓
n8n Workflow Webhook
     ↓
├─→ 1. Normalizer Service (Port 8000)
├─→ 2. Financial Rules (Port 8002)
├─→ 3. Signer Service (Port 8001)
└─→ 4. NPHIES Bridge (Port 8003)
     ↓
NPHIES Submission
```

### Technologies

- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Proxy**: Traefik (reverse proxy + SSL)
- **Orchestration**: n8n workflows
- **Containerization**: Docker

---

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
cd /root/sbs-landing
./deploy.sh
```

### Option 2: Manual Deployment

```bash
cd /root/sbs-landing

# Build Docker image
docker build -t sbs-landing:latest .

# Deploy with Docker Compose
docker compose up -d

# Check status
docker ps --filter "name=sbs-landing"

# View logs
docker logs sbs-landing -f
```

---

## 🔗 n8n Workflow Integration

### Step 1: Create Webhook in n8n

1. Open n8n dashboard: https://n8n.srv791040.hstgr.cloud
2. Create new workflow: "SBS Claim Submission"
3. Add **Webhook** node:
   - **Method**: POST
   - **Path**: `sbs-claim-submission`
   - **Response**: Return Data
4. Configure workflow stages:

```
Webhook Trigger
    ↓
Data Validation
    ↓
Call Normalizer API
    ↓
Call Financial Rules API
    ↓
Call Signer API
    ↓
Call NPHIES Bridge API
    ↓
Send Notification Email
    ↓
Return Response
```

### Step 2: Update Environment Variables

```bash
# Edit .env file
nano /root/sbs-landing/.env

# Update this line with your webhook URL:
N8N_WEBHOOK_URL=https://n8n.srv791040.hstgr.cloud/webhook/sbs-claim-submission
```

### Step 3: n8n Workflow Example (JSON)

Save this as a new workflow in n8n:

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "webhookId": "sbs-claim-submission",
      "parameters": {
        "path": "sbs-claim-submission",
        "responseMode": "lastNode",
        "options": {}
      }
    },
    {
      "name": "Normalizer",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "url": "http://sbs-normalizer:8000/normalize",
        "method": "POST",
        "jsonParameters": true,
        "options": {},
        "bodyParametersJson": "={{ $json }}"
      }
    },
    {
      "name": "Financial Rules",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 300],
      "parameters": {
        "url": "http://sbs-financial-rules:8002/apply-rules",
        "method": "POST",
        "jsonParameters": true,
        "bodyParametersJson": "={{ $json }}"
      }
    },
    {
      "name": "Signer",
      "type": "n8n-nodes-base.httpRequest",
      "position": [850, 300],
      "parameters": {
        "url": "http://sbs-signer:8001/sign",
        "method": "POST",
        "jsonParameters": true,
        "bodyParametersJson": "={{ $json }}"
      }
    },
    {
      "name": "NPHIES Submit",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1050, 300],
      "parameters": {
        "url": "http://sbs-nphies-bridge:8003/submit",
        "method": "POST",
        "jsonParameters": true,
        "bodyParametersJson": "={{ $json }}"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Normalizer", "type": "main", "index": 0}]]
    },
    "Normalizer": {
      "main": [[{"node": "Financial Rules", "type": "main", "index": 0}]]
    },
    "Financial Rules": {
      "main": [[{"node": "Signer", "type": "main", "index": 0}]]
    },
    "Signer": {
      "main": [[{"node": "NPHIES Submit", "type": "main", "index": 0}]]
    }
  }
}
```

---

## 🌐 DNS Configuration

### Current Setup

```
Domain: brainsait.cloud
IP: 82.25.101.65
IPv6: 2600:1901:0:84ef::
```

### Required DNS Records

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 82.25.101.65 | 3600 |
| A | www | 82.25.101.65 | 3600 |
| AAAA | @ | 2600:1901:0:84ef:: | 3600 |
| AAAA | www | 2600:1901:0:84ef:: | 3600 |

✅ **DNS is already correctly configured!**

---

## 🔒 Security Features

### Implemented

- ✅ **Rate Limiting**: 100 requests per 15 minutes per IP
- ✅ **File Validation**: Only allowed file types (PDF, DOC, XLS, JSON, XML, Images)
- ✅ **File Size Limit**: Maximum 10MB
- ✅ **Security Headers**: Helmet.js with strict CSP
- ✅ **SSL/TLS**: Automatic Let's Encrypt certificates via Traefik
- ✅ **CORS**: Configured for brainsait.cloud only
- ✅ **Input Sanitization**: All form inputs validated

### Traefik Security Headers

```yaml
- STSSeconds: 315360000 (10 years)
- browserXSSFilter: true
- contentTypeNosniff: true
- forceSTSHeader: true
- STSIncludeSubdomains: true
- STSPreload: true
- SSLRedirect: true
```

---

## 📊 API Endpoints

### Public Endpoints

#### 1. Landing Page
```
GET https://brainsait.cloud/
```

#### 2. Submit Claim
```
POST https://brainsait.cloud/api/submit-claim
Content-Type: multipart/form-data

Fields:
  - patientName: string (required)
  - patientId: string (required)
  - memberId: string
  - payerId: string
  - claimType: string (required) - professional|institutional|pharmacy|vision
  - userEmail: string (required)
  - claimFile: file (optional) - PDF, DOC, XLS, JSON, XML, images

Response:
{
  "success": true,
  "message": "Claim submitted successfully",
  "claimId": "CLAIM-1737000000000",
  "status": "processing",
  "data": {
    "patientId": "...",
    "submissionId": "...",
    "estimatedProcessingTime": "2-5 minutes"
  }
}
```

#### 3. Health Check
```
GET https://brainsait.cloud/health

Response:
{
  "status": "healthy",
  "service": "sbs-landing-api",
  "timestamp": "2026-01-16T...",
  "version": "1.0.0"
}
```

#### 4. Service Status
```
GET https://brainsait.cloud/api/services/status

Response:
{
  "success": true,
  "timestamp": "...",
  "services": [
    { "service": "normalizer", "status": "healthy" },
    { "service": "signer", "status": "healthy" },
    ...
  ],
  "overallHealth": "healthy"
}
```

#### 5. Claim Status
```
GET https://brainsait.cloud/api/claim-status/:claimId

Response:
{
  "success": true,
  "claimId": "CLAIM-123",
  "status": "processing",
  "lastUpdate": "...",
  "stages": {
    "validation": "completed",
    "normalization": "completed",
    "financialRules": "in-progress",
    ...
  }
}
```

---

## 🧪 Testing

### 1. Test Landing Page

```bash
curl https://brainsait.cloud/
```

### 2. Test Health Endpoint

```bash
curl https://brainsait.cloud/health
```

### 3. Test Claim Submission

```bash
curl -X POST https://brainsait.cloud/api/submit-claim \
  -F "patientName=Ahmed Hassan" \
  -F "patientId=1234567890" \
  -F "memberId=MEM123" \
  -F "payerId=PAYER001" \
  -F "claimType=professional" \
  -F "userEmail=test@example.com" \
  -F "claimFile=@sample-claim.pdf"
```

### 4. Test Services Status

```bash
curl https://brainsait.cloud/api/services/status | jq
```

---

## 📈 Monitoring

### View Logs

```bash
# Real-time logs
docker logs sbs-landing -f

# Last 100 lines
docker logs sbs-landing --tail 100

# Logs since 1 hour ago
docker logs sbs-landing --since 1h
```

### Health Checks

```bash
# Container health
docker ps --filter "name=sbs-landing" --format "{{.Status}}"

# Application health
curl -f https://brainsait.cloud/health
```

### Metrics

```bash
# Service metrics
curl https://brainsait.cloud/api/metrics | jq

# All SBS services
curl https://brainsait.cloud/api/services/status | jq
```

---

## 🛠 Maintenance

### Restart Service

```bash
cd /root/sbs-landing
docker compose restart
```

### Update Configuration

```bash
# Edit environment variables
nano .env

# Rebuild and redeploy
docker compose down
docker compose build
docker compose up -d
```

### View Container Stats

```bash
docker stats sbs-landing
```

### Backup

```bash
# Backup entire directory
tar -czf sbs-landing-backup-$(date +%Y%m%d).tar.gz /root/sbs-landing
```

---

## 🐛 Troubleshooting

### Issue: Container won't start

```bash
# Check logs
docker logs sbs-landing

# Check if port 3000 is in use
netstat -tlnp | grep 3000

# Rebuild without cache
docker compose build --no-cache
docker compose up -d
```

### Issue: Can't access via domain

```bash
# Check Traefik logs
docker logs n8n-traefik-1

# Verify DNS
host brainsait.cloud

# Check SSL certificate
curl -vI https://brainsait.cloud 2>&1 | grep -i "ssl\|certificate"
```

### Issue: n8n webhook not working

```bash
# Test webhook directly
curl -X POST https://n8n.srv791040.hstgr.cloud/webhook/sbs-claim-submission \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check n8n logs
docker logs n8n-n8n-1

# Verify webhook URL in .env
cat /root/sbs-landing/.env | grep N8N_WEBHOOK_URL
```

---

## 📞 Support

### Documentation

- **Full Audit Report**: `/root/SBS_N8N_INTEGRATION_AUDIT_REPORT.md`
- **Production Guide**: `/root/PRODUCTION_READY_VERIFICATION.md`
- **Next Steps**: `/root/NEXT_STEPS_PRODUCTION.md`

### External Links

- **Blog/Docs**: https://brainsait369.blogspot.com/
- **BrainSAIT**: https://github.com/enterprises/brainsait
- **Author**: https://github.com/Fadil369

---

## ✅ Deployment Checklist

- [ ] DNS records configured correctly
- [ ] Traefik running with SSL
- [ ] n8n workflow created with webhook
- [ ] Environment variables configured
- [ ] Docker image built successfully
- [ ] Container deployed and healthy
- [ ] Landing page accessible at https://brainsait.cloud
- [ ] Claim submission form working
- [ ] n8n workflow triggered successfully
- [ ] SBS microservices responding
- [ ] Health checks passing
- [ ] Metrics endpoint working

---

**Generated**: January 16, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

**Powered by BrainSAIT برينسايت**  
**Author**: Dr. Mohamed El Fadil
