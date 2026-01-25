# SBS Integration v11 - Enhanced Architecture

## 🎯 Overview

This directory contains the enhanced v11 components for the SBS Integration workflow with:

- ✅ Enhanced security and authentication
- ✅ Comprehensive input validation
- ✅ NPHIES-compliant FHIR R4 structures
- ✅ Retry logic with exponential backoff
- ✅ Circuit breaker pattern
- ✅ Bilingual error messages (Arabic/English)
- ✅ HIPAA-compliant audit logging

## 📁 Files

### Core Components

1. **enhanced_validation_node.js**
   - API key authentication
   - Facility authorization
   - Comprehensive input validation
   - Saudi National ID validation
   - Business rule validations
   - Bilingual error messages

2. **enhanced_fhir_builder.js**
   - NPHIES-compliant FHIR R4 Claim resource
   - Complete metadata and extensions
   - Full diagnosis and procedure support
   - FHIR resource validation
   - Audit logging

3. **http_retry_helper.js**
   - Exponential backoff retry logic
   - Automatic retry on transient failures
   - Skip retry on 4xx errors
   - Comprehensive logging

4. **circuit_breaker.js**
   - Prevent cascading failures
   - Automatic service recovery
   - State management (CLOSED/OPEN/HALF_OPEN)
   - Configurable thresholds

5. **error_handler_node.js**
   - Centralized error handling
   - Error categorization
   - Bilingual error responses
   - Audit logging

## 🚀 Quick Start

### 1. Prerequisites

Set these environment variables in n8n:

```bash
# Authentication
SBS_API_KEY=your-secret-api-key
AUTHORIZED_FACILITIES=FAC001,FAC002,FAC003

# Service URLs
SBS_NORMALIZER_URL=http://sbs-normalizer:8000
SBS_FINANCIAL_RULES_URL=http://sbs-financial-rules:8002
SBS_SIGNER_URL=http://sbs-signer:8001
SBS_NPHIES_BRIDGE_URL=http://sbs-nphies-bridge:8003

# Optional: Monitoring
ERROR_NOTIFICATION_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK
```

### 2. Implementation Steps

#### Step 1: Add Enhanced Validation Node

1. Open your n8n workflow
2. Add a new **Code** node after the Webhook
3. Name it: "Enhanced Input Validation"
4. Copy content from `enhanced_validation_node.js`
5. Connect: Webhook → Enhanced Input Validation → AI Normalizer

#### Step 2: Update FHIR Builder

1. Locate the existing "Build FHIR" node
2. Replace code with content from `enhanced_fhir_builder.js`
3. Verify connections are maintained

#### Step 3: Add Retry Logic to HTTP Nodes

For each HTTP node (AI Normalizer, Financial Rules, etc.):

1. Replace the HTTP request code with content from `http_retry_helper.js`
2. Update the URL and endpoint as needed
3. Set appropriate retry count (default: 3)

#### Step 4: Add Circuit Breaker (Optional but Recommended)

1. For critical services, use `circuit_breaker.js` instead of basic retry
2. Configure threshold and timeout values
3. Monitor circuit breaker states in logs

#### Step 5: Add Error Handler

1. Add a new **Code** node
2. Name it: "Error Handler"
3. Copy content from `error_handler_node.js`
4. Connect all error outputs to this node

### 3. Testing

#### Test Valid Request:

```bash
curl -X POST https://your-n8n-instance/webhook/sbs-gateway \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
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

#### Test Invalid Input:

```bash
curl -X POST https://your-n8n-instance/webhook/sbs-gateway \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "facility_id": "FAC001",
    "service_code": "SRV-001"
  }'
```

Expected: Validation error with bilingual messages

#### Test Unauthorized Access:

```bash
curl -X POST https://your-n8n-instance/webhook/sbs-gateway \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{ ... }'
```

Expected: 401 Unauthorized error

## 📊 Monitoring

### Key Metrics

Track these metrics from audit logs:

1. **Authentication**
   - `authentication_failed` events
   - `unauthorized_facility_access` events

2. **Validation**
   - `validation_success` vs `validation_failed` ratio
   - Common validation error codes

3. **Processing**
   - `fhir_claim_created` count
   - `claim_processing_error` count by category

4. **Network**
   - `http_request_attempt` and success rate
   - `http_all_retries_failed` events

5. **Circuit Breaker**
   - `circuit_breaker_opened` events
   - Time in OPEN state

### Log Query Examples

```bash
# Count validation failures by error code
grep "validation_failed" logs.json | jq '.errors[]' | sort | uniq -c

# Find all circuit breaker openings
grep "circuit_breaker_opened" logs.json | jq '{service, timestamp, failure_count}'

# Calculate success rate
total=$(grep "validation_" logs.json | wc -l)
success=$(grep "validation_success" logs.json | wc -l)
echo "Success rate: $(echo "scale=2; $success * 100 / $total" | bc)%"
```

## 🔧 Customization

### Adjust Validation Rules

Edit `enhanced_validation_node.js`:

```javascript
// Change price limit
if (price > 1000000) { // <- Adjust this value
  validationErrors.push({ ... });
}

// Add custom business rules
if (body.service_code === 'SPECIAL' && body.unit_price < 100) {
  validationErrors.push({
    error_code: 'CUSTOM_RULE',
    message_en: 'Special service requires minimum price of 100 SAR',
    message_ar: 'الخدمة الخاصة تتطلب سعر أدنى 100 ريال'
  });
}
```

### Adjust Retry Configuration

Edit `http_retry_helper.js`:

```javascript
// Change max retries
const result = await makeHttpRequestWithRetry(
  url,
  'POST',
  data,
  5  // <- Increase from 3 to 5
);

// Change timeout
timeout: 60000  // <- Change from 30s to 60s
```

### Adjust Circuit Breaker Settings

Edit `circuit_breaker.js`:

```javascript
const breaker = new CircuitBreaker(
  'ServiceName',
  10,     // <- Failure threshold (default: 5)
  120000  // <- Timeout in ms (default: 60000)
);
```

## 🐛 Troubleshooting

### Issue: API Key Not Working

**Check:**
- Environment variable `SBS_API_KEY` is set in n8n
- Header name is exactly `x-api-key` (case-insensitive)
- No extra spaces in the key value

### Issue: Facility Not Authorized

**Check:**
- Facility ID is in `AUTHORIZED_FACILITIES` list
- Comma-separated, no spaces
- Exact match (case-sensitive)

### Issue: FHIR Validation Failing

**Check:**
- All required fields present in webhook data
- Patient reference format
- Provider reference format
- Total amount > 0

### Issue: Circuit Breaker Always Open

**Check:**
- Service is actually running and healthy
- Network connectivity
- Reduce failure threshold temporarily
- Check service logs for errors

## 📚 Resources

- [NPHIES FHIR Guide](http://nphies.sa/fhir/)
- [n8n Documentation](https://docs.n8n.io/)
- [FHIR R4 Specification](https://hl7.org/fhir/R4/)

## 📝 Changelog

### v11.0 (2026-01-14)

- ✅ Added enhanced input validation
- ✅ Added NPHIES-compliant FHIR builder
- ✅ Implemented retry logic
- ✅ Added circuit breaker pattern
- ✅ Bilingual error messages
- ✅ Comprehensive audit logging
- ✅ API key authentication
- ✅ Facility authorization

## 🤝 Support

For issues or questions:
- GitHub Issues: [BrainSAIT SBS Integration](https://github.com/brainsait/sbs-integration)
- Email: devops@brainsait.com
- Documentation: https://docs.brainsait.com/sbs-integration

---

**Version**: 11.0  
**Last Updated**: 2026-01-14  
**Author**: BrainSAIT DevOps Team
