# 🚀 SBS Integration v11 - Deployment Guide

## 📋 Pre-Deployment Checklist

- [ ] n8n instance accessible and running
- [ ] All microservices deployed and healthy
- [ ] Environment variables configured
- [ ] Test data prepared
- [ ] Backup of current workflow created
- [ ] Rollback plan documented
- [ ] Team trained on new features

---

## 🔧 Step-by-Step Deployment

### Step 1: Backup Current Workflow

1. Login to n8n: `https://your-n8n-instance.com`
2. Navigate to the current SBS Integration workflow
3. Click **Settings** (⚙️) → **Duplicate**
4. Rename to: `SBS Integration - v10 Backup - YYYYMMDD`
5. Set status to **Inactive**
6. Export as JSON backup:
   - Click **Settings** → **Export**
   - Save to: `/backups/sbs-workflow-v10-backup-YYYYMMDD.json`

### Step 2: Configure Environment Variables

1. Go to n8n **Settings** → **Environments**
2. Add/Update these variables:

```env
# Core Authentication
SBS_API_KEY=<generate-with: openssl rand -hex 32>
AUTHORIZED_FACILITIES=FAC001,FAC002,FAC003

# Service URLs (adjust based on your deployment)
SBS_NORMALIZER_URL=http://sbs-normalizer:8000
SBS_FINANCIAL_RULES_URL=http://sbs-financial-rules:8002
SBS_SIGNER_URL=http://sbs-signer:8001
SBS_NPHIES_BRIDGE_URL=http://sbs-nphies-bridge:8003

# Optional but recommended
ERROR_NOTIFICATION_WEBHOOK=<your-slack-webhook-url>
ENABLE_CIRCUIT_BREAKER=true
MAX_RETRY_ATTEMPTS=3
```

3. Click **Save**
4. Restart n8n if required

### Step 3: Add Enhanced Validation Node

1. Open your active SBS Integration workflow
2. Click **Add Node** (+) after the Webhook node
3. Select **Code**
4. Configure node:
   - **Name**: `Enhanced Input Validation`
   - **Mode**: `Run Once for Each Item`
   - **Language**: `JavaScript`
5. Paste code from `enhanced_validation_node.js`
6. Click **Execute Node** to test
7. Connect nodes:
   ```
   Webhook → Enhanced Input Validation → [Next Node]
   ```

### Step 4: Update FHIR Builder Node

1. Locate the existing **Build FHIR Claim** node
2. Click to edit
3. **Backup current code** (copy to text file)
4. Replace with code from `enhanced_fhir_builder.js`
5. Update node references if needed:
   - Change `$('Webhook: HIS Claim')` to match your webhook node name
   - Change `$('Enhanced Input Validation')` to match validation node name
6. Click **Execute Node** to test

### Step 5: Add Retry Logic to HTTP Nodes

For **each** HTTP request node:

#### AI Normalizer Node:

1. Click on the node
2. Replace existing code with `http_retry_helper.js`
3. Update the URL section:
   ```javascript
   const result = await makeHttpRequestWithRetry(
     $env.SBS_NORMALIZER_URL + '/normalize',  // ← Verify endpoint
     'POST',
     $input.item.json,
     3  // max retries
   );
   ```
4. Test execution

#### Financial Rules Node:

1. Click on the node
2. Replace with `http_retry_helper.js`
3. Update URL:
   ```javascript
   const result = await makeHttpRequestWithRetry(
     $env.SBS_FINANCIAL_RULES_URL + '/validate',
     'POST',
     $input.item.json,
     3
   );
   ```

#### Digital Signer Node:

1. Click on the node
2. Replace with `http_retry_helper.js`
3. Update URL:
   ```javascript
   const result = await makeHttpRequestWithRetry(
     $env.SBS_SIGNER_URL + '/sign',
     'POST',
     $input.item.json,
     3
   );
   ```

#### NPHIES Bridge Node:

1. Click on the node
2. Replace with `http_retry_helper.js`
3. Update URL:
   ```javascript
   const result = await makeHttpRequestWithRetry(
     $env.SBS_NPHIES_BRIDGE_URL + '/submit',
     'POST',
     $input.item.json,
     3
   );
   ```

### Step 6: Add Error Handler

1. Click **Add Node** (+)
2. Select **Code**
3. Configure:
   - **Name**: `Error Handler`
   - **Mode**: `Run Once for Each Item`
4. Paste code from `error_handler_node.js`
5. Connect **all error outputs** from other nodes to this handler

### Step 7: Add Circuit Breaker (Optional)

For critical services, use circuit breaker instead of basic retry:

1. Replace the HTTP retry code in critical nodes (e.g., AI Normalizer)
2. Use code from `circuit_breaker.js`
3. Configure thresholds:
   ```javascript
   const breaker = new CircuitBreaker(
     'AI-Normalizer',
     5,      // failure threshold
     60000   // timeout (60s)
   );
   ```

### Step 8: Update Webhook Configuration

1. Click on the **Webhook** node
2. Go to **Settings** → **Options**
3. Enable authentication:
   - **Authentication**: `Header Auth`
   - **Header Name**: `X-API-Key`
4. Add IP whitelist (if needed):
   - Add allowed IP ranges in webhook settings
5. Click **Save**

### Step 9: Test the Enhanced Workflow

#### Test 1: Valid Request

```bash
export API_KEY="your-api-key"
export WEBHOOK_URL="https://your-n8n.com/webhook/sbs-gateway"

curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "facility_id": "FAC001",
    "patient_id": "PAT-12345",
    "patient_national_id": "1234567890",
    "service_code": "SRV-001",
    "service_desc": "Consultation",
    "unit_price": 150.00,
    "quantity": 1,
    "encounter_date": "2026-01-14T10:00:00Z",
    "payer_id": "PAYER-001"
  }'
```

**Expected**: 200 OK with claim ID

#### Test 2: Missing Required Field

```bash
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "facility_id": "FAC001",
    "service_code": "SRV-001"
  }'
```

**Expected**: 400 Bad Request with validation errors

#### Test 3: Invalid API Key

```bash
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{...}'
```

**Expected**: 401 Unauthorized

#### Test 4: Unauthorized Facility

```bash
curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "facility_id": "UNAUTHORIZED-FAC",
    ...
  }'
```

**Expected**: 403 Forbidden

### Step 10: Monitor Initial Executions

1. Go to n8n **Executions** tab
2. Monitor first 10-20 executions
3. Check for:
   - ✅ Successful validations
   - ✅ Proper FHIR structure
   - ✅ Audit logs being generated
   - ✅ Error handling working correctly
4. Review logs:
   ```bash
   # If using external logging
   tail -f /var/log/n8n/workflow-executions.log | grep sbs-integration
   ```

### Step 11: Performance Testing

Run load tests to ensure performance:

```bash
# Install Apache Bench
apt-get install -y apache2-utils

# Test with 100 concurrent requests
ab -n 100 -c 10 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -p test-payload.json \
  $WEBHOOK_URL
```

**Target Metrics**:
- Response time: < 5 seconds (P95)
- Success rate: > 99%
- Error rate: < 1%

### Step 12: Gradual Rollout

1. **Phase 1: 10% Traffic**
   - Add routing logic to send 10% to new workflow
   - Monitor for 2 hours
   - Check error rates

2. **Phase 2: 50% Traffic**
   - If Phase 1 successful, increase to 50%
   - Monitor for 4 hours
   - Compare metrics with old workflow

3. **Phase 3: 100% Traffic**
   - If Phase 2 successful, switch to 100%
   - Monitor closely for 24 hours
   - Keep old workflow as backup

### Step 13: Documentation Update

1. Update API documentation with new error codes
2. Update integration guides for partners
3. Document new authentication requirements
4. Create runbook for common issues

---

## 📊 Post-Deployment Monitoring

### Key Metrics to Watch

Monitor these for the first 48 hours:

| Metric | Target | Action if Failed |
|--------|--------|------------------|
| Success Rate | > 99% | Investigate errors immediately |
| Avg Response Time | < 3s | Check service performance |
| Validation Failures | < 5% | Review validation rules |
| Authentication Failures | < 1% | Check API key distribution |
| Circuit Breaker Opens | 0 | Check service health |

### Monitoring Commands

```bash
# Count total executions
grep "validation_" logs.json | wc -l

# Count failures
grep "error" logs.json | wc -l

# Success rate
total=$(grep "validation_" logs.json | wc -l)
success=$(grep "validation_success" logs.json | wc -l)
echo "Success: $(echo "scale=2; $success * 100 / $total" | bc)%"

# Average response time
grep "http_request_success" logs.json | \
  jq -r '.response_time_ms' | \
  awk '{sum+=$1} END {print "Avg:", sum/NR, "ms"}'
```

---

## 🔄 Rollback Procedure

If issues occur:

### Quick Rollback

1. Go to n8n workflows
2. **Deactivate** current v11 workflow
3. **Activate** backup v10 workflow
4. Notify team
5. Investigate issues

### Detailed Rollback Steps

```bash
# 1. Stop current workflow
curl -X POST https://n8n.com/api/v1/workflows/current/deactivate \
  -H "X-N8N-API-KEY: $N8N_API_KEY"

# 2. Activate backup
curl -X POST https://n8n.com/api/v1/workflows/backup/activate \
  -H "X-N8N-API-KEY: $N8N_API_KEY"

# 3. Verify
curl $WEBHOOK_URL/health
```

---

## 🐛 Troubleshooting

### Issue: High Validation Failure Rate

**Symptoms**: > 5% validation failures

**Investigation**:
```bash
# Check which validations are failing
grep "validation_failed" logs.json | \
  jq '.errors[].error_code' | \
  sort | uniq -c | sort -rn
```

**Solutions**:
- Review validation rules
- Check if HIS data format changed
- Adjust validation thresholds if needed

### Issue: Slow Response Times

**Symptoms**: Response time > 5 seconds

**Investigation**:
```bash
# Find slowest node
grep "http_request" logs.json | \
  jq '{url, time: .response_time_ms}' | \
  sort -k2 -rn | head -10
```

**Solutions**:
- Scale up slow services
- Increase timeouts temporarily
- Check database/network latency

### Issue: Circuit Breaker Always Open

**Symptoms**: Service unavailable errors

**Investigation**:
```bash
# Check circuit breaker events
grep "circuit_breaker_opened" logs.json | \
  jq '{service, failure_count, timestamp}'
```

**Solutions**:
- Check service health
- Increase failure threshold
- Fix underlying service issues

---

## ✅ Deployment Completion Checklist

- [ ] All environment variables configured
- [ ] Validation node added and tested
- [ ] FHIR builder updated
- [ ] Retry logic added to all HTTP nodes
- [ ] Error handler configured
- [ ] Webhook authentication enabled
- [ ] All test cases passing
- [ ] Performance tests successful
- [ ] Monitoring dashboards updated
- [ ] Documentation updated
- [ ] Team trained
- [ ] Rollback plan tested
- [ ] 24-hour monitoring completed
- [ ] Stakeholders notified

---

## 📞 Support

**Emergency Contact**: devops@brainsait.com  
**Slack Channel**: #sbs-integration-support  
**Documentation**: https://docs.brainsait.com/sbs-v11  
**Status Page**: https://status.brainsait.com

---

**Deployment Version**: 11.0  
**Date**: 2026-01-14  
**Author**: BrainSAIT DevOps Team
