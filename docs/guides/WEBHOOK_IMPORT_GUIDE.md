# 🎯 Quick Guide: Import & Test SBS Workflow in n8n

## Current Status
- ❌ Workflow not yet imported into n8n
- ✅ All SBS services are running and healthy
- ✅ Services connected to n8n network
- ⏳ Waiting for workflow import

---

## Option 1: Import via n8n UI (Recommended)

### Step 1: Access n8n
Open: https://n8n.srv791040.hstgr.cloud

### Step 2: Import Workflow
1. Click **"Workflows"** in left sidebar
2. Click **"Add workflow"** (top right)
3. Click **"⋮"** menu → **"Import from file"**
4. Upload: `/root/sbs-integration-engine/n8n-workflows/sbs-workflow-v2.json`

### Step 3: Test in Test Mode
After importing:
1. Click **"Execute Workflow"** button in the workflow canvas
2. This activates the test webhook temporarily
3. Run this test:

```bash
curl -X POST "https://n8n.srv791040.hstgr.cloud/webhook-test/sbs-gateway" \
  -H "Content-Type: application/json" \
  -d '{
    "facility_id": 1,
    "service_code": "LAB-CBC-01",
    "service_desc": "Complete Blood Count Test",
    "patient_id": "Patient/12345"
  }'
```

### Step 4: Activate for Production
1. Toggle **"Active"** switch (top right)
2. The webhook becomes permanent
3. URL changes to: `https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway`

---

## Option 2: Import via n8n CLI (Alternative)

If you have n8n CLI access:

```bash
# Copy workflow into n8n container
docker cp /root/sbs-integration-engine/n8n-workflows/sbs-workflow-v2.json n8n-n8n-1:/tmp/

# Import via n8n CLI (if available)
docker exec n8n-n8n-1 n8n import:workflow --input=/tmp/sbs-workflow-v2.json
```

---

## Option 3: Manual Paste (Quick Method)

1. Go to n8n: https://n8n.srv791040.hstgr.cloud
2. Create **New Workflow**
3. Click **"⋮"** menu → **"Import from URL or String"**
4. Copy entire contents of this file:
   `/root/sbs-integration-engine/n8n-workflows/sbs-workflow-v2.json`
5. Paste into the text area
6. Click **Import**

To copy the JSON:
```bash
cat /root/sbs-integration-engine/n8n-workflows/sbs-workflow-v2.json
```

---

## Testing After Import

### Test Mode (Temporary)
URL: `https://n8n.srv791040.hstgr.cloud/webhook-test/sbs-gateway`

**Note**: Test mode requires clicking "Execute Workflow" button first!

```bash
curl -X POST "https://n8n.srv791040.hstgr.cloud/webhook-test/sbs-gateway" \
  -H "Content-Type: application/json" \
  -d '{
    "facility_id": 1,
    "service_code": "LAB-CBC-01",
    "service_desc": "Complete Blood Count Test",
    "patient_id": "Patient/12345"
  }'
```

### Production Mode (After Activation)
URL: `https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway`

```bash
curl -X POST "https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway" \
  -H "Content-Type: application/json" \
  -d '{
    "facility_id": 1,
    "service_code": "LAB-CBC-01",
    "service_desc": "Complete Blood Count Test",
    "patient_id": "Patient/12345"
  }'
```

---

## Expected Response

```json
{
  "transaction_id": "NPHIES-TXN-xxx",
  "transaction_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "status": "submitted_successfully",
  "nphies_response": {
    "id": "NPHIES-TXN-xxx",
    "resourceType": "ClaimResponse",
    ...
  },
  "http_status": 201,
  "message": "Claim submitted successfully to NPHIES"
}
```

---

## Troubleshooting

### Error: "webhook is not registered"
**Cause**: Workflow not imported or not activated
**Solution**: Follow import steps above

### Error: "Execute workflow first"
**Cause**: Using test webhook without executing workflow first
**Solution**: Click "Execute Workflow" button in n8n canvas, then try again within 2 minutes

### Error: Connection refused
**Cause**: Services might be down
**Solution**: 
```bash
docker ps | grep sbs-
# Restart if needed:
cd /root/sbs-integration-engine
docker compose -f docker-compose.services.yml restart
```

### Services Not Responding
Check health:
```bash
curl http://localhost:8000/health  # Normalizer
curl http://localhost:8001/health  # Signer
curl http://localhost:8002/health  # Financial Rules
curl http://localhost:8003/health  # NPHIES Bridge
```

---

## Quick Verification

After importing, verify the workflow has these nodes:
1. ✅ Webhook: HIS Claim
2. ✅ AI Normalizer
3. ✅ Build FHIR
4. ✅ Financial Rules
5. ✅ Digital Signer
6. ✅ NPHIES Submission
7. ✅ Response

All nodes should show service URLs starting with `http://sbs-*`

---

## Support Files

- Workflow JSON: `/root/sbs-integration-engine/n8n-workflows/sbs-workflow-v2.json`
- Full Instructions: `/root/sbs-integration-engine/n8n-workflows/IMPORT_INSTRUCTIONS.md`
- Deployment Status: `/root/sbs-integration-engine/DEPLOYMENT_STATUS.md`

---

**Status**: Ready for import! All backend services are running and waiting. 🚀
