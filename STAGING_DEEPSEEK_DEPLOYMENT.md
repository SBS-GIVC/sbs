# DeepSeek AI Integration - Staging Deployment Guide

**Date:** February 2, 2026  
**PR:** #98 - https://github.com/SBS-GIVC/sbs/pull/98  
**Branch:** feature/normalizer-deepseek-env  
**Status:** Ready for Staging Deployment

---

## Overview

This guide provides step-by-step instructions for deploying and verifying the DeepSeek AI integration in the staging environment.

## Pre-Deployment Checklist

- [x] PR #98 reviewed and approved
- [x] All tests passing (12 tests in services/normalizer/tests/)
- [x] Security documentation completed (`docs/DEEPSEEK_KEY_ROTATION.md`)
- [x] CI workflow configured (`.github/workflows/ci-deepseek.yml`)
- [x] Feature flags implemented (`normalizer-service/feature_flags.py`)
- [ ] **PR #98 merged to main** (pending - CI status: pending)
- [ ] GitHub Secret `DEEPSEEK_API_KEY` configured
- [ ] Staging environment variables updated
- [ ] Staging deployment completed
- [ ] Verification tests passed

---

## Deployment Steps

### Step 1: Merge PR #98

**Status:** ⚠️ Waiting for CI completion

The PR cannot be merged until CI checks complete. Current status: `pending`

**Action Required:**
```bash
# Once CI passes, merge via GitHub API or UI
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/SBS-GIVC/sbs/pulls/98/merge \
  -d '{"merge_method":"squash"}'

# Or via GitHub UI:
# Visit: https://github.com/SBS-GIVC/sbs/pull/98
# Click: "Merge pull request" > "Squash and merge"
```

### Step 2: Configure GitHub Secret

**Status:** ⚠️ Action Required - Manual Configuration

The `DEEPSEEK_API_KEY` secret must be set in the repository. This secret is used by the CI workflow to test DeepSeek integration.

#### Option A: Via GitHub UI

1. Navigate to: https://github.com/SBS-GIVC/sbs/settings/secrets/actions
2. Click "New repository secret"
3. Set:
   - **Name:** `DEEPSEEK_API_KEY`
   - **Value:** `sk-your-deepseek-api-key` (obtain from https://platform.deepseek.com/)
4. Click "Add secret"

#### Option B: Via GitHub CLI (if `gh` is installed)

```bash
# Install gh if needed
brew install gh  # macOS
# or
sudo apt install gh  # Linux

# Authenticate
gh auth login

# Set the secret
gh secret set DEEPSEEK_API_KEY -R SBS-GIVC/sbs -b "sk-your-deepseek-api-key"
```

#### Option C: Via API

```bash
# Note: Requires additional setup for secret encryption
# See: https://docs.github.com/en/rest/actions/secrets#create-or-update-a-repository-secret
```

#### Verification

After setting the secret, verify it's configured:

```bash
# This will show the secret name (but not the value)
curl -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/SBS-GIVC/sbs/actions/secrets \
  2>/dev/null | grep -i deepseek
```

### Step 3: Update Staging Environment

Update the staging environment configuration to enable DeepSeek.

#### For Docker Compose Staging

1. **Update `.env` file:**

```bash
# On staging server
cat >> /path/to/staging/.env <<EOF

# DeepSeek AI Configuration (added $(date +%Y-%m-%d))
DEEPSEEK_API_KEY=sk-your-staging-key
AI_PROVIDER=deepseek
ENABLE_DEEPSEEK=true  # Optional in staging, auto-enabled if key present
ENVIRONMENT=staging
EOF
```

2. **Update `docker-compose.yml`** (if needed):

```yaml
normalizer-service:
  environment:
    - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
    - AI_PROVIDER=${AI_PROVIDER:-deepseek}
    - ENABLE_DEEPSEEK=${ENABLE_DEEPSEEK:-true}
    - ENVIRONMENT=${ENVIRONMENT:-staging}
```

#### For Kubernetes/Cloud Deployment

Create a secret and update the deployment:

```bash
# Create secret
kubectl create secret generic deepseek-api-key \
  --from-literal=key=sk-your-staging-key \
  --namespace=sbs-staging

# Update deployment to reference secret
kubectl patch deployment normalizer-service \
  --namespace=sbs-staging \
  --patch '
spec:
  template:
    spec:
      containers:
      - name: normalizer
        env:
        - name: DEEPSEEK_API_KEY
          valueFrom:
            secretKeyRef:
              name: deepseek-api-key
              key: key
        - name: AI_PROVIDER
          value: "deepseek"
        - name: ENVIRONMENT
          value: "staging"
'
```

### Step 4: Deploy to Staging

```bash
# Pull latest changes
cd /path/to/sbs
git checkout main
git pull origin main

# Rebuild and restart services
docker-compose build normalizer-service
docker-compose up -d normalizer-service

# Verify service is running
docker-compose ps normalizer-service
docker logs sbs-normalizer --tail 50
```

Expected log output:
```
INFO: Starting SBS Normalizer Service
INFO: Environment: staging
INFO: AI provider initialized: deepseek
INFO: DeepSeek client ready (model: deepseek-chat)
INFO: Application startup complete
```

### Step 5: Verify Deployment

Run the verification checklist below.

---

## Verification Checklist

### 1. Service Health Check

```bash
# Check health endpoint
curl -X GET http://staging.sbs.local:8000/health

# Expected response:
{
  "status": "healthy",
  "service": "normalizer",
  "timestamp": "2026-02-02T16:00:00Z",
  "ai_provider": "deepseek",
  "ai_status": "ready"
}
```

**Status:** [ ]

### 2. Environment Configuration Verification

```bash
# Check environment variables in container
docker exec sbs-normalizer printenv | grep -E "(DEEPSEEK|AI_PROVIDER|ENVIRONMENT)"

# Expected output:
# DEEPSEEK_API_KEY=sk-***
# AI_PROVIDER=deepseek
# ENVIRONMENT=staging
```

**Status:** [ ]

### 3. AI Mapping Test - Simple Case

```bash
# Test basic medical code mapping
curl -X POST http://staging.sbs.local:8000/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "service_code": "99213",
    "service_description": "Office visit, established patient, 15 min"
  }' | jq

# Expected response includes:
# {
#   "status": "success",
#   "ai_provider": "deepseek",
#   "mapped_code": "...",
#   "confidence": 0.95,
#   "processing_time_ms": 250
# }
```

**Status:** [ ]  
**Confidence Score:** _______  
**Response Time:** _______ ms

### 4. AI Mapping Test - Complex Case

```bash
# Test complex medical procedure mapping
curl -X POST http://staging.sbs.local:8000/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "service_code": "CPT-43235",
    "service_description": "Esophagogastroduodenoscopy with biopsy"
  }' | jq

# Verify DeepSeek provides accurate mapping
```

**Status:** [ ]  
**Mapped Code:** _______  
**Confidence:** _______

### 5. AI Mapping Test - Arabic Input

```bash
# Test Arabic language support
curl -X POST http://staging.sbs.local:8000/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "service_code": "LAB-CBC",
    "service_description": "فحص الدم الشامل"
  }' | jq

# Verify Arabic text is handled correctly
```

**Status:** [ ]

### 6. Feature Flag Test - Provider Override

```bash
# Test switching providers via environment
docker exec sbs-normalizer sh -c '
  export AI_PROVIDER=disabled
  python -c "from normalizer-service.feature_flags import get_ai_provider; print(get_ai_provider())"
'

# Expected output: disabled
```

**Status:** [ ]

### 7. Fallback Behavior Test

```bash
# Simulate DeepSeek unavailability
docker exec sbs-normalizer sh -c 'export DEEPSEEK_API_KEY=invalid-key'
docker restart sbs-normalizer

# Send test request
curl -X POST http://staging.sbs.local:8000/normalize \
  -H "Content-Type: application/json" \
  -d '{"service_code": "99213", "service_description": "Office visit"}'

# Verify fallback to rule-based mapping
# Check logs for "Using fallback mapping"
docker logs sbs-normalizer --tail 20 | grep -i fallback

# Restore valid key
docker exec sbs-normalizer sh -c 'export DEEPSEEK_API_KEY=sk-valid-key'
docker restart sbs-normalizer
```

**Status:** [ ]  
**Fallback Triggered:** [ ] Yes [ ] No

### 8. Load Test - Concurrent Requests

```bash
# Test with concurrent requests
for i in {1..10}; do
  curl -X POST http://staging.sbs.local:8000/normalize \
    -H "Content-Type: application/json" \
    -d '{"service_code": "99213", "service_description": "Office visit"}' &
done
wait

# Check logs for any errors
docker logs sbs-normalizer --tail 50 | grep -i error
```

**Status:** [ ]  
**Errors Found:** [ ] Yes [ ] No  
**Average Response Time:** _______ ms

### 9. Metrics Verification

```bash
# Check Prometheus metrics
curl http://staging.sbs.local:8000/metrics | grep -E "^ai_"

# Expected metrics:
# ai_requests_total{provider="deepseek"} N
# ai_request_duration_seconds_sum{provider="deepseek"} X.XX
# ai_errors_total{provider="deepseek"} 0
```

**Status:** [ ]  
**Total Requests:** _______  
**Error Count:** _______

### 10. Database Audit

```bash
# Check that AI mappings are being stored
psql -h staging-db.local -U sbs_api_user -d sbs_integration -c "
  SELECT 
    service_code, 
    mapped_code, 
    ai_provider, 
    confidence, 
    created_at 
  FROM normalized_codes 
  WHERE ai_provider = 'deepseek' 
  ORDER BY created_at DESC 
  LIMIT 10;
"
```

**Status:** [ ]  
**Records Found:** _______

---

## Test Cases for DeepSeek Integration

### Test Case 1: Standard CPT Code Mapping

**Input:**
```json
{
  "service_code": "99214",
  "service_description": "Office visit, established patient, moderate complexity"
}
```

**Expected Output:**
- AI provider: `deepseek`
- Confidence: > 0.85
- Mapped to valid NPHIES code
- Response time: < 1000ms

**Result:** [ ] Pass [ ] Fail  
**Notes:** ________________________________

---

### Test Case 2: ICD-10 Diagnosis Code

**Input:**
```json
{
  "service_code": "E11.9",
  "service_description": "Type 2 diabetes mellitus without complications"
}
```

**Expected Output:**
- Correct ICD-10 to NPHIES mapping
- High confidence (> 0.9)
- Appropriate category classification

**Result:** [ ] Pass [ ] Fail  
**Notes:** ________________________________

---

### Test Case 3: Arabic Medical Term

**Input:**
```json
{
  "service_code": "LAB-001",
  "service_description": "تحليل الدم الكامل مع عد الصفائح الدموية"
}
```

**Expected Output:**
- Successful Arabic text processing
- Mapped to CBC/hematology code
- Confidence: > 0.80

**Result:** [ ] Pass [ ] Fail  
**Notes:** ________________________________

---

### Test Case 4: Ambiguous Description

**Input:**
```json
{
  "service_code": "CONSULT",
  "service_description": "Patient consultation"
}
```

**Expected Output:**
- Lower confidence score (0.5 - 0.7)
- Suggestion for clarification or multiple options
- Fallback to rule-based if confidence < 0.5

**Result:** [ ] Pass [ ] Fail  
**Notes:** ________________________________

---

### Test Case 5: Invalid/Unknown Code

**Input:**
```json
{
  "service_code": "INVALID",
  "service_description": "Unknown service"
}
```

**Expected Output:**
- Graceful error handling
- Fallback suggestion
- No crash or 500 error

**Result:** [ ] Pass [ ] Fail  
**Notes:** ________________________________

---

### Test Case 6: Provider Failover

**Steps:**
1. Temporarily disable DeepSeek (set `ENABLE_DEEPSEEK=false`)
2. Send test request
3. Verify fallback to rule-based mapping
4. Re-enable DeepSeek
5. Verify switch back

**Expected:**
- Seamless failover
- No service disruption
- Appropriate logging

**Result:** [ ] Pass [ ] Fail  
**Notes:** ________________________________

---

## Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Average Response Time | < 500ms | _____ ms | [ ] |
| P95 Response Time | < 1000ms | _____ ms | [ ] |
| P99 Response Time | < 2000ms | _____ ms | [ ] |
| Success Rate | > 95% | _____ % | [ ] |
| Fallback Rate | < 5% | _____ % | [ ] |
| Error Rate | < 1% | _____ % | [ ] |

---

## Rollback Plan

If any critical issues are found during staging verification:

### Quick Rollback (No Service Restart)

```bash
# Disable DeepSeek via feature flag
docker exec sbs-normalizer sh -c 'export ENABLE_DEEPSEEK=false'

# Service will use rule-based mapping for new requests
# No restart required
```

### Full Rollback (Revert to Previous Version)

```bash
# Stop and remove current deployment
docker-compose down normalizer-service

# Checkout previous commit (before PR #98 merge)
git checkout <previous-commit-sha>

# Rebuild and restart
docker-compose build normalizer-service
docker-compose up -d normalizer-service

# Verify rollback
curl http://staging.sbs.local:8000/health
```

---

## Sign-Off

Once all verification steps pass, complete this section:

**Verified By:** ________________________________  
**Date:** ________________________________  
**Signature:** ________________________________

**Staging Deployment Status:** [ ] Approved for Production [ ] Issues Found (see notes)

**Notes/Issues:**
_______________________________________________
_______________________________________________
_______________________________________________

---

## Next Steps

After successful staging verification:

1. **Production Deployment Planning**
   - Review PRODUCTION_DEPLOYMENT_GUIDE.md
   - Schedule production deployment window
   - Notify stakeholders

2. **Runbook Update**
   - Confirm monitoring alerts are configured
   - Update on-call runbook with DeepSeek procedures
   - Document any staging-specific findings

3. **Production Rollout Strategy**
   - Consider canary deployment (10% → 50% → 100%)
   - Enable feature flag gradually
   - Monitor metrics closely for first 48 hours

4. **Documentation**
   - Update production deployment checklist
   - Add staging test results to deployment notes
   - Document any configuration changes

---

**For Questions or Issues:**
- Technical: sbs-platform@example.com
- Security: security@example.com
- DeepSeek API: support@deepseek.com
