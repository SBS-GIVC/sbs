# ⚡ SBS Integration v11 - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Set Environment Variables

```bash
# In n8n Settings → Environments
SBS_API_KEY=your-generated-key
AUTHORIZED_FACILITIES=FAC001,FAC002,FAC003
SBS_NORMALIZER_URL=http://sbs-normalizer:8000
SBS_FINANCIAL_RULES_URL=http://sbs-financial-rules:8002
SBS_SIGNER_URL=http://sbs-signer:8001
SBS_NPHIES_BRIDGE_URL=http://sbs-nphies-bridge:8003
```

### 2. Add Enhanced Validation Node

Copy `enhanced_validation_node.js` → New Code node after Webhook

### 3. Update FHIR Builder

Copy `enhanced_fhir_builder.js` → Replace existing FHIR builder code

### 4. Add Retry to HTTP Nodes

Copy `http_retry_helper.js` → Replace each HTTP request node code

### 5. Add Error Handler

Copy `error_handler_node.js` → New Code node connected to error outputs

### 6. Test

```bash
./test_v11_workflow.sh
```

---

## 📊 Quick Test

```bash
curl -X POST https://your-n8n.com/webhook/sbs-gateway \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "facility_id": "FAC001",
    "patient_id": "PAT-001",
    "patient_national_id": "1234567890",
    "service_code": "SRV-001",
    "service_desc": "Consultation",
    "unit_price": 150,
    "quantity": 1,
    "encounter_date": "2026-01-14T10:00:00Z",
    "payer_id": "PAYER-001"
  }'
```

**Expected**: `200 OK` with claim ID

---

## 🔍 Verify Success

✅ Test returns 200 OK  
✅ Audit logs appearing in console  
✅ Errors show bilingual messages  
✅ FHIR structure validated  
✅ Retry logic working  

---

## 📚 Full Documentation

- **Complete Guide**: `DEPLOYMENT_GUIDE.md`
- **Detailed README**: `README.md`
- **Test Suite**: `test_v11_workflow.sh`
- **Environment Setup**: `.env.example`

---

## 🆘 Common Issues

**Issue**: "Invalid API key"  
**Fix**: Check `SBS_API_KEY` environment variable

**Issue**: "Facility not authorized"  
**Fix**: Add facility to `AUTHORIZED_FACILITIES`

**Issue**: "Validation failed"  
**Fix**: Check required fields in request body

---

**Need Help?** See `DEPLOYMENT_GUIDE.md` for detailed troubleshooting

**Version**: 11.0 | **Date**: 2026-01-14
