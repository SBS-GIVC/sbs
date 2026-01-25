# 📋 n8n Workflow Import Instructions

## Overview
This guide will help you import the SBS Integration Engine workflow into your existing n8n instance.

---

## Prerequisites ✅

All prerequisites are already met:
- ✅ n8n instance running at: `https://n8n.srv791040.hstgr.cloud`
- ✅ SBS services deployed and healthy
- ✅ Services connected to n8n network
- ✅ Database initialized with sample data

---

## Import Steps

### Option 1: Via n8n UI (Recommended)

1. **Access n8n**
   - Open: `https://n8n.srv791040.hstgr.cloud`
   - Login with your credentials

2. **Import Workflow**
   - Click **Workflows** in the left sidebar
   - Click **Add workflow** button (top right)
   - Click the **⋮** menu → **Import from file**
   - Upload: `/root/sbs-integration-engine/n8n-workflows/sbs-workflow-v2.json`
   
3. **Verify Workflow**
   - The workflow should show 7 nodes:
     1. Webhook: HIS Claim
     2. AI Normalizer
     3. Build FHIR
     4. Financial Rules
     5. Digital Signer
     6. NPHIES Submission
     7. Response
   
4. **Activate Workflow**
   - Click the **Active** toggle (top right)
   - The webhook should become active

5. **Get Webhook URL**
   - Click on the **Webhook: HIS Claim** node
   - Copy the **Production URL**
   - It should be: `https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway`

---

### Option 2: Via CLI

If you have access to the server:

```bash
# Copy workflow to n8n's import directory (if it exists)
docker cp /root/sbs-integration-engine/n8n-workflows/sbs-workflow-v2.json n8n-n8n-1:/tmp/

# Then import via UI or n8n CLI tools
```

---

## Testing the Workflow

### Test 1: Manual Test in n8n

1. Open the workflow in n8n
2. Click **Execute Workflow** button
3. Manually trigger the webhook with test data

### Test 2: External Webhook Test

```bash
curl -X POST https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway \
  -H 'Content-Type: application/json' \
  -d '{
    "facility_id": 1,
    "service_code": "LAB-CBC-01",
    "service_desc": "Complete Blood Count Test",
    "patient_id": "Patient/12345"
  }'
```

**Expected Response:**
```json
{
  "transaction_id": "NPHIES-TXN-...",
  "transaction_uuid": "...",
  "status": "submitted_successfully",
  "message": "Claim submitted successfully to NPHIES"
}
```

### Test 3: Different Service Codes

Test with other sample codes:

```bash
# Test 2: Chest X-Ray
curl -X POST https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway \
  -H 'Content-Type: application/json' \
  -d '{
    "facility_id": 1,
    "service_code": "RAD-CXR-01",
    "service_desc": "Chest X-Ray Standard",
    "patient_id": "Patient/67890"
  }'

# Test 3: General Consultation
curl -X POST https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway \
  -H 'Content-Type: application/json' \
  -d '{
    "facility_id": 1,
    "service_code": "CONS-GEN-01",
    "service_desc": "General Consultation - First Visit",
    "patient_id": "Patient/11111"
  }'
```

---

## Workflow Details

### Node Configuration

Each node is pre-configured to connect to the correct SBS service:

| Node | Service | URL |
|------|---------|-----|
| AI Normalizer | Normalizer Service | `http://sbs-normalizer:8000/normalize` |
| Financial Rules | Financial Rules Engine | `http://sbs-financial-rules:8002/validate` |
| Digital Signer | Signer Service | `http://sbs-signer:8001/sign` |
| NPHIES Submission | NPHIES Bridge | `http://sbs-nphies-bridge:8003/submit-claim` |

### Data Flow

```
Webhook (POST) 
  ↓
AI Normalizer (converts internal code → SBS code)
  ↓
Build FHIR (structures data as FHIR Claim)
  ↓
Financial Rules (applies CHI rules, calculates price)
  ↓
Digital Signer (generates RSA signature)
  ↓
NPHIES Submission (submits to NPHIES API)
  ↓
Response (returns result to caller)
```

### Expected Execution Time

- Total: 2-5 seconds
- Normalization: < 1s
- Financial Rules: < 1s
- Signing: < 1s
- NPHIES Mock: < 1s

---

## Troubleshooting

### Issue: Workflow Import Fails

**Solution**: Make sure the JSON file is valid
```bash
cat /root/sbs-integration-engine/n8n-workflows/sbs-workflow-v2.json | jq .
```

### Issue: Services Not Reachable

**Solution**: Verify network connectivity
```bash
docker network inspect n8n_default | grep sbs
```

### Issue: Webhook Returns Error

**Solution**: Check service logs
```bash
docker logs sbs-normalizer --tail 50
docker logs sbs-signer --tail 50
docker logs sbs-financial-rules --tail 50
docker logs sbs-nphies-bridge --tail 50
```

### Issue: Database Connection Error

**Solution**: Check PostgreSQL status
```bash
docker exec sbs-postgres pg_isready
```

---

## Monitoring

### View Workflow Executions

In n8n:
1. Go to **Executions** tab
2. View execution history
3. Click on any execution to see detailed logs

### Check Service Health

```bash
# Quick health check
curl http://localhost:8000/health  # Normalizer
curl http://localhost:8001/health  # Signer
curl http://localhost:8002/health  # Financial Rules
curl http://localhost:8003/health  # NPHIES Bridge
```

---

## Advanced Configuration

### Customize Webhook Path

In n8n, edit the **Webhook: HIS Claim** node:
- Change **Path** from `sbs-gateway` to your preferred path
- Save and reactivate workflow

### Add Authentication

Add an HTTP Request node before the workflow:
- Verify API key or token
- Return 401 if unauthorized

### Error Handling

Add error handling nodes:
- Catch errors from any step
- Log to database
- Send notifications
- Return user-friendly error messages

---

## Next Steps

After successful import:

1. ✅ Workflow imported
2. ✅ Webhook active
3. ⏳ Test with sample data
4. ⏳ Monitor executions
5. ⏳ Add more facilities
6. ⏳ Import real SBS codes
7. ⏳ Configure production settings

---

## Support

For issues or questions:
- Check service logs: `docker logs <container-name>`
- Review n8n execution logs in the UI
- See documentation: `/root/sbs-integration-engine/docs/`

---

**Workflow File**: `sbs-workflow-v2.json`  
**Services**: 4 microservices + PostgreSQL  
**Status**: ✅ Ready for import  

Built for Saudi Arabia's Digital Health Transformation 🇸🇦
