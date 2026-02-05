# SBS N8N Workflow Testing & Production Deployment Guide

## Current Status

**Webhook URL (Test):** `https://n8n.brainsait.cloud/webhook-test/sbs-claim-submission`  
**Webhook URL (Production):** `https://n8n.brainsait.cloud/webhook/sbs-claim-submission`  
**Status:** Test URL requires workflow execution button, Production URL is ACTIVE but backend services are NOT running

## Critical Finding: Backend Services Required

The n8n workflow is active, but the backend microservices that process the claims are NOT currently running:
- ❌ **Normalizer Service** (Port 8000) - AI-powered SBS code normalization
- ❌ **Financial Rules Engine** (Port 8002) - Pricing and tier calculations
- ❌ **Signer Service** (Port 8001) - Digital signature generation
- ❌ **NPHIES Bridge** (Port 8003) - NPHIES API integration
- ❌ **PostgreSQL Database** (Port 5432) - Data persistence

**This is why all tests are returning HTTP 500 errors!**

---

## Phase 1: Start Backend Services

### Step 1: Verify Environment Configuration

```bash
# Check if .env file exists
ls -la /home/hostinger/.env

# Verify required variables (don't print sensitive values)
grep -E "DB_PASSWORD|GEMINI_API_KEY|NPHIES_API_KEY" /home/hostinger/.env
```

### Step 2: Start Services with Docker Compose

```bash
cd /home/hostinger

# Start all backend services
docker-compose -f docker-compose.services.yml up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose -f docker-compose.services.yml ps

# Check service health
docker-compose -f docker-compose.services.yml logs --tail=50
```

### Step 3: Verify Services Are Running

```bash
# Check all services are listening
netstat -tlnp | grep -E ":(8000|8001|8002|8003|5432)"

# Test each service health endpoint
curl -s http://localhost:8000/health | jq '.'  # Normalizer
curl -s http://localhost:8001/health | jq '.'  # Signer
curl -s http://localhost:8002/health | jq '.'  # Financial Rules
curl -s http://localhost:8003/health | jq '.'  # NPHIES Bridge
```

**Expected Output:** All services should return `{"status": "healthy"}` or similar

---

## Phase 2: Comprehensive Workflow Testing

Once backend services are running, execute the comprehensive test suite:

### Test Suite Overview

The automated test suite (`test_sbs_workflow_comprehensive.py`) includes:

1. **Basic Scenarios (8 tests)**
   - Simple outpatient visit
   - Chronic disease management
   - Emergency case with surgery
   - High-cost multiple services
   - Bundle services
   - Pediatric case
   - Maternity care
   - Surgical package bundle

2. **Multi-Facility Testing (5 tests)**
   - Same patient across 5 different facilities
   - Tests facility-specific markup rates

3. **Stress Testing (20 tests)**
   - Rapid submission of 20 claims
   - 100ms delay between requests
   - Tests concurrency and performance

4. **Edge Cases (3 tests)**
   - High quantity (100x multiplier)
   - Zero patient responsibility
   - Elderly patient (95 years old)

5. **All Payers Testing (5 tests)**
   - BUPA Arabia
   - MedGulf Insurance
   - Tawuniya
   - ACIG Insurance
   - SAGIA Insurance

6. **Service Category Testing (6 tests)**
   - Laboratory services
   - Radiology services
   - Consultation services
   - Surgery services
   - Pharmacy services
   - Bundle services

7. **Error Handling (3 tests)**
   - Incomplete data
   - Invalid service codes
   - Future dates

8. **Complex Claims (2 tests)**
   - 10 different services in one claim
   - Bundle + individual services combination

**Total: 52 comprehensive test scenarios**

### Run the Test Suite

```bash
cd /home/hostinger

# Run full test suite against TEST webhook
python3 test_sbs_workflow_comprehensive.py https://n8n.brainsait.cloud/webhook-test/sbs-claim-submission

# Or run against PRODUCTION webhook
python3 test_sbs_workflow_comprehensive.py https://n8n.brainsait.cloud/webhook/sbs-claim-submission
```

### Review Test Results

```bash
# View the test execution log
cat sbs_test_execution_final.log

# View detailed JSON report
cat sbs_test_report_*.json | jq '.test_run'

# Check for failed tests
cat sbs_test_report_*.json | jq '.results[] | select(.success == false) | {test_name, error, response_body}'

# View performance metrics
cat sbs_test_report_*.json | jq '.results[] | {test_name, response_time, status_code}'
```

---

## Phase 3: Manual Testing Scenarios

### Test 1: Simple Professional Claim

```bash
curl -X POST https://n8n.brainsait.cloud/webhook/sbs-claim-submission \
  -H "Content-Type: application/json" \
  -d '{
    "claimHeader": {
      "claimId": "CLM-MANUAL-001",
      "claimType": "Professional",
      "submissionDate": "2026-02-05",
      "claimStatus": "submitted",
      "facilityId": 1,
      "facilityName": "King Fahad Medical City"
    },
    "patientInfo": {
      "patientName": "Ahmed Test",
      "patientId": "1234567890",
      "patientAge": 35,
      "patientGender": "M"
    },
    "claimItems": [
      {
        "itemSequence": 1,
        "serviceCode": "SBS-CONS-001",
        "serviceDescription": "General Medical Consultation",
        "category": "Consultation",
        "unitPrice": 200.00,
        "quantity": 1,
        "netPrice": 200.00
      }
    ],
    "financialInfo": {
      "totalNetPrice": 200.00,
      "currency": "SAR"
    }
  }' | jq '.'
```

### Test 2: Complex Multi-Service Claim

```bash
curl -X POST https://n8n.brainsait.cloud/webhook/sbs-claim-submission \
  -H "Content-Type: application/json" \
  -d @/home/hostinger/SAMPLE_TEST_CLAIM.json | jq '.'
```

### Test 3: High-Value Surgical Claim

```bash
curl -X POST https://n8n.brainsait.cloud/webhook/sbs-claim-submission \
  -H "Content-Type: application/json" \
  -d '{
    "claimHeader": {
      "claimId": "CLM-SURG-001",
      "claimType": "Professional",
      "submissionDate": "2026-02-05",
      "facilityId": 2
    },
    "patientInfo": {
      "patientName": "Surgical Patient",
      "patientId": "9876543210",
      "patientAge": 45,
      "patientGender": "F"
    },
    "claimItems": [
      {
        "itemSequence": 1,
        "serviceCode": "SBS-SURG-002",
        "serviceDescription": "Cholecystectomy",
        "category": "Surgery",
        "unitPrice": 7000.00,
        "quantity": 1,
        "netPrice": 7000.00
      },
      {
        "itemSequence": 2,
        "serviceCode": "SBS-LAB-001",
        "serviceDescription": "Complete Blood Count",
        "category": "Lab",
        "unitPrice": 50.00,
        "quantity": 1,
        "netPrice": 50.00
      }
    ],
    "financialInfo": {
      "totalNetPrice": 7050.00,
      "currency": "SAR"
    }
  }' | jq '.'
```

---

## Phase 4: Monitoring & Validation

### Check N8N Execution History

1. Open n8n UI: `https://n8n.brainsait.cloud`
2. Navigate to **Executions** tab
3. Review recent workflow runs
4. Check for errors or failed nodes

### Monitor Backend Services

```bash
# View real-time logs
docker-compose -f docker-compose.services.yml logs -f --tail=100

# Check specific service
docker-compose -f docker-compose.services.yml logs normalizer-service --tail=50

# Check database connections
docker-compose -f docker-compose.services.yml exec postgres psql -U postgres -d sbs_integration -c "SELECT COUNT(*) FROM claims;"
```

### Performance Metrics

```bash
# Check average response times
cat sbs_test_report_*.json | jq '.results[] | select(.success == true) | .response_time' | awk '{sum+=$1; count++} END {print "Avg:", sum/count, "seconds"}'

# Check success rate
cat sbs_test_report_*.json | jq '.test_run.success_rate'

# Find slowest requests
cat sbs_test_report_*.json | jq '.results[] | {test: .test_name, time: .response_time}' | jq -s 'sort_by(.time) | reverse | .[0:5]'
```

---

## Phase 5: Production Conversion

### Understanding Webhook URLs

**Test URL:** `https://n8n.brainsait.cloud/webhook-test/sbs-claim-submission`
- Requires manual "Execute Workflow" button click
- Only works for ONE call after activation
- Used for development and debugging

**Production URL:** `https://n8n.brainsait.cloud/webhook/sbs-claim-submission`
- Always available when workflow is ACTIVE
- No manual intervention required
- Handles unlimited concurrent requests

### Activate Production Webhook

The production webhook is ALREADY active if:
1. The workflow is toggled ON in n8n (top-right toggle)
2. The workflow contains a Webhook node with production settings

### Update Client Applications

Once testing is complete, update all client applications to use the production URL:

**Before:**
```javascript
const WEBHOOK_URL = 'https://n8n.brainsait.cloud/webhook-test/sbs-claim-submission';
```

**After:**
```javascript
const WEBHOOK_URL = 'https://n8n.brainsait.cloud/webhook/sbs-claim-submission';
```

---

## Phase 6: Production Readiness Checklist

### Pre-Production Validation

- [ ] All backend services running and healthy
- [ ] Database schema initialized
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Firewall rules configured
- [ ] Monitoring and alerting set up

### Test Suite Results

- [ ] All basic scenarios passing (8/8)
- [ ] Multi-facility tests passing (5/5)
- [ ] Stress test passing (20/20 with <5s response time)
- [ ] Edge cases handled gracefully (3/3)
- [ ] All payers tested (5/5)
- [ ] All service categories tested (6/6)
- [ ] Error handling validated (3/3)
- [ ] Complex claims processed (2/2)
- [ ] **Overall success rate: >= 95%**

### Performance Requirements

- [ ] Average response time: < 2 seconds
- [ ] P95 response time: < 5 seconds
- [ ] P99 response time: < 10 seconds
- [ ] Concurrent request handling: >= 10 requests/second
- [ ] Zero data loss
- [ ] Proper error responses

### Documentation

- [ ] API documentation complete
- [ ] Error codes documented
- [ ] Integration guide for clients
- [ ] Troubleshooting guide
- [ ] Runbook for operations team

---

## Quick Start Commands

### 1. Start Everything

```bash
# Start backend services
docker-compose -f docker-compose.services.yml up -d

# Wait 60 seconds for services to be healthy
sleep 60

# Verify services
curl -s http://localhost:8000/health && echo "✓ Normalizer healthy"
curl -s http://localhost:8001/health && echo "✓ Signer healthy"
curl -s http://localhost:8002/health && echo "✓ Financial Rules healthy"
curl -s http://localhost:8003/health && echo "✓ NPHIES Bridge healthy"
```

### 2. Run Full Test Suite

```bash
python3 test_sbs_workflow_comprehensive.py https://n8n.brainsait.cloud/webhook/sbs-claim-submission
```

### 3. View Results

```bash
cat sbs_test_report_*.json | jq '.test_run'
```

### 4. If All Tests Pass: Go to Production

```bash
# Production webhook is already active at:
# https://n8n.brainsait.cloud/webhook/sbs-claim-submission

echo "✅ Production webhook is live and ready!"
echo "🔗 URL: https://n8n.brainsait.cloud/webhook/sbs-claim-submission"
```

---

## Troubleshooting

### Issue: HTTP 500 Errors

**Cause:** Backend services not running or unhealthy

**Solution:**
```bash
docker-compose -f docker-compose.services.yml ps
docker-compose -f docker-compose.services.yml logs --tail=100
```

### Issue: HTTP 404 Errors

**Cause:** Workflow not active or wrong URL

**Solution:**
1. Open n8n UI
2. Check workflow is toggled ON
3. Verify webhook path matches

### Issue: Slow Response Times

**Cause:** Services under load or database slow queries

**Solution:**
```bash
# Check service resource usage
docker stats

# Check database performance
docker-compose -f docker-compose.services.yml exec postgres psql -U postgres -d sbs_integration -c "SELECT * FROM pg_stat_activity;"
```

### Issue: "Unused Respond to Webhook" Warning

**Cause:** Workflow has a Respond to Webhook node that's not connected properly

**Solution:**
1. Open workflow in n8n editor
2. Ensure "Response" node is connected to the execution flow
3. Verify all paths lead to the response node
4. Save and activate workflow

---

## Success Criteria

✅ **Ready for Production when:**
- All 52 tests passing (100% success rate) OR >= 95% with acceptable failures
- Average response time < 2 seconds
- All backend services healthy
- No critical errors in logs
- Monitoring and alerting configured
- Documentation complete

---

## Next Steps After Production Deployment

1. **Monitor for 24-48 hours**
   - Watch for errors
   - Track performance metrics
   - Review all execution logs

2. **Set Up Alerting**
   - Service down alerts
   - High error rate alerts
   - Performance degradation alerts

3. **Implement Rate Limiting**
   - Protect against abuse
   - Ensure fair usage

4. **Regular Backups**
   - Database backups
   - Workflow backups
   - Configuration backups

5. **Capacity Planning**
   - Monitor resource usage
   - Plan for scaling
   - Load testing for peak periods

---

## Contact & Support

**System Administrator:** Hostinger Team  
**N8N Workflow Editor:** https://n8n.brainsait.cloud  
**Production Webhook:** https://n8n.brainsait.cloud/webhook/sbs-claim-submission

**Last Updated:** February 5, 2026
