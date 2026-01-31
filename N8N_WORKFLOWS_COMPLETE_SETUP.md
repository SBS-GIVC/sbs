# 🔄 n8n Workflows Complete Setup Guide

**Generated**: January 16, 2026  
**For**: SBS Integration Engine  
**Domain**: brainsait.cloud

---

## 📋 Overview

This guide will help you set up the complete n8n workflow that:
1. Receives claims from the landing page
2. Processes through all 4 SBS microservices
3. Submits to NPHIES
4. Returns status to the user

**Total Setup Time**: 15-20 minutes

---

## 🚀 Quick Start (3 Steps)

### Step 1: Access n8n Dashboard

```bash
# Your n8n instance
https://n8n.srv791040.hstgr.cloud
```

**Login**: Use your n8n credentials from `/docker/n8n/.env`

### Step 2: Import Workflow

1. Click **"Workflows"** → **"Add Workflow"** → **"Import from File"**
2. Upload: `/root/sbs-landing/n8n-workflow-sbs-complete.json`
3. Click **"Save"**
4. Click **"Activate"** (toggle switch in top-right)

### Step 3: Get Webhook URL

1. Click on **"Webhook - Claim Submission"** node
2. Copy the **Production URL** (looks like):
   ```
   https://n8n.srv791040.hstgr.cloud/webhook/sbs-claim-submission
   ```
3. Update your backend `.env` file:
   ```bash
   cd /root/sbs-landing
   nano .env
   # Update N8N_WEBHOOK_URL with the URL from above
   # Save and exit
   docker compose restart
   ```

**Done!** 🎉

---

## 📊 Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Landing Page Form                        │
│                 https://brainsait.cloud                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST /api/submit-claim
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend API (Express.js)                     │
│                sbs-landing:3000                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ POST to webhook
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                n8n Workflow Orchestrator                    │
│         https://n8n.srv791040.hstgr.cloud                   │
│                                                             │
│  1. Webhook Trigger                                         │
│  2. Validate Input                                          │
│  3. ──► Normalizer Service (8000)                          │
│  4. ──► Financial Rules (8002)                             │
│  5. ──► Digital Signer (8001)                              │
│  6. ──► NPHIES Bridge (8003)                               │
│  7. Format Response                                         │
│  8. Return to Webhook                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ Response
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 User Sees Result                            │
│           "Claim submitted successfully!"                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Detailed Setup Instructions

### Manual Workflow Creation (If Import Doesn't Work)

#### 1. Create New Workflow

Go to n8n dashboard → **"Add Workflow"** → Name: **"SBS Claim Processing"**

#### 2. Add Nodes (Drag from Left Panel)

**Node 1: Webhook Trigger**
```
Type: Webhook
HTTP Method: POST
Path: sbs-claim-submission
Response Mode: "Using 'Respond to Webhook' Node"
```

**Node 2: Function - Validate Input**
```
Type: Function
Code:
const body = $input.item.json.body;

return {
  json: {
    claimId: `CLM-${Date.now()}`,
    timestamp: new Date().toISOString(),
    patientName: body.patientName,
    patientId: body.patientId,
    memberId: body.memberId || body.patientId,
    claimType: body.claimType || 'professional',
    userEmail: body.userEmail,
    procedures: body.procedures || [],
    diagnoses: body.diagnoses || [],
    status: 'received'
  }
};
```

**Node 3: HTTP Request - Normalizer**
```
Type: HTTP Request
Method: POST
URL: http://sbs-normalizer:8000/normalize
Body: JSON
Body Parameters: {{ $json }}
Timeout: 30000
```

**Node 4: HTTP Request - Financial Rules**
```
Type: HTTP Request
Method: POST
URL: http://sbs-financial-rules:8002/validate
Body: JSON
Body Parameters: {{ $json }}
Timeout: 30000
```

**Node 5: HTTP Request - Signer**
```
Type: HTTP Request
Method: POST
URL: http://sbs-signer:8001/sign
Body: JSON
Body Parameters: {{ $json }}
Timeout: 30000
```

**Node 6: HTTP Request - NPHIES Bridge**
```
Type: HTTP Request
Method: POST
URL: http://sbs-nphies-bridge:8003/submit
Body: JSON
Body Parameters: {{ $json }}
Timeout: 60000
```

**Node 7: Function - Format Response**
```
Type: Function
Code:
const result = $input.item.json;

return {
  json: {
    success: true,
    claimId: result.claimId || result.claim_id,
    message: 'Claim submitted successfully to NPHIES',
    nphiesResponse: result.nphiesResponse || result,
    timestamp: new Date().toISOString()
  }
};
```

**Node 8: Respond to Webhook**
```
Type: Respond to Webhook
Response: JSON
Response Body: {{ $json }}
```

#### 3. Connect Nodes

Connect in this order:
```
Webhook → Validate → Normalizer → Financial → Signer → NPHIES → Format → Respond
```

#### 4. Add Error Handling (Optional but Recommended)

Add an **IF node** after NPHIES to check for errors, and route to error handler.

#### 5. Activate Workflow

Click the toggle switch in top-right to **Activate** the workflow.

---

## 🧪 Testing the Workflow

### From n8n Dashboard (Internal Test)

1. Click **"Execute Workflow"**
2. Click on **Webhook node**
3. Click **"Listen for Test Event"**
4. Send test data:

```bash
curl -X POST https://n8n.srv791040.hstgr.cloud/webhook-test/sbs-claim-submission \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "patientName": "Ahmed Hassan",
      "patientId": "1234567890",
      "memberId": "MEM123456",
      "claimType": "professional",
      "userEmail": "test@example.com"
    }
  }'
```

**Expected**: Workflow executes through all nodes, returns success.

### From Landing Page (End-to-End Test)

After DNS propagates:

```bash
curl -X POST https://brainsait.cloud/api/submit-claim \
  -F "patientName=Fatima Al-Saudi" \
  -F "patientId=2109876543" \
  -F "memberId=MEM789" \
  -F "claimType=professional" \
  -F "userEmail=fatima@example.com"
```

**Expected**: 
```json
{
  "success": true,
  "message": "Claim submitted successfully",
  "claimId": "CLM-1234567890",
  "workflowExecutionId": "..."
}
```

### From Web Browser

1. Open https://brainsait.cloud
2. Fill out the claim form
3. Click **"Submit Claim"**
4. See success message
5. Check n8n dashboard → **Executions** → See your workflow run

---

## 📊 Monitoring & Debugging

### View Workflow Executions

```
n8n Dashboard → Executions (left sidebar)
```

You'll see:
- ✅ Success executions (green)
- ❌ Failed executions (red)
- ⏱️ Execution time
- 📊 Data flow between nodes

### Check Individual Node Output

1. Click on any execution
2. Click on any node
3. See the **Input** and **Output** data

### Common Issues

#### Issue: Webhook not triggering

**Check**:
- Is workflow activated? (toggle switch on)
- Is webhook URL correct in backend .env?
- Restart backend: `docker compose restart sbs-landing`

#### Issue: Service timeout

**Check**:
```bash
# Are all services healthy?
docker ps --filter "name=sbs-" --format "table {{.Names}}\t{{.Status}}"

# Test service directly
curl http://localhost:8000/health
```

#### Issue: NPHIES submission fails

**Check**:
- Are NPHIES certificates configured?
- Is test/production mode correct?
- Check NPHIES Bridge logs: `docker logs sbs-nphies-bridge`

---

## 🔒 Security Considerations

### Webhook Security

Add authentication to webhook (optional):

1. In n8n webhook node, add **Header Auth**:
   ```
   Header Name: X-Webhook-Secret
   Header Value: your-secret-key-here
   ```

2. Update backend to send this header:
   ```javascript
   headers: {
     'X-Webhook-Secret': process.env.WEBHOOK_SECRET
   }
   ```

### Data Privacy

- n8n stores execution data (including patient info)
- Set execution retention in n8n settings
- Consider encrypting sensitive fields

---

## 📈 Advanced: Multiple Workflows

### Workflow 1: Claim Submission (Primary)
✅ Already created above

### Workflow 2: Claim Status Check

**Trigger**: Webhook `/webhook/sbs-claim-status`
**Flow**: 
1. Webhook with `claimId`
2. Query PostgreSQL for status
3. Return current status

### Workflow 3: Batch Processing

**Trigger**: Schedule (daily at 2 AM)
**Flow**:
1. Fetch pending claims from DB
2. Process each through pipeline
3. Send summary email

### Workflow 4: Error Retry

**Trigger**: Schedule (every 30 min)
**Flow**:
1. Find failed claims
2. Retry submission
3. Update status

---

## 📦 Workflow Files Created

```
/root/sbs-landing/
└── n8n-workflow-sbs-complete.json     (Complete workflow)

/root/sbs-source/n8n-workflows/
├── sbs-workflow-v8-final.json         (Legacy workflow)
└── ...                                 (Other versions)

/root/brainsait-sbs-v11/
└── workflow-sbs-integration-v11.json  (v11 workflow)
```

**Recommendation**: Use the new `n8n-workflow-sbs-complete.json` (most up-to-date).

---

## ✅ Verification Checklist

After setup, verify:

- [ ] n8n workflow imported and activated
- [ ] Webhook URL copied to backend .env
- [ ] Backend restarted
- [ ] Test claim submitted successfully
- [ ] Workflow execution visible in n8n dashboard
- [ ] All 4 services called (check execution logs)
- [ ] Success response received
- [ ] No errors in any service logs

---

## 🎓 Next Steps

### Immediate (Required)
1. ✅ Import workflow to n8n
2. ✅ Update backend webhook URL
3. ✅ Test end-to-end

### Short-term (1 week)
- Add claim status checking workflow
- Set up error notifications (email/SMS)
- Configure workflow monitoring

### Medium-term (1 month)
- Add batch processing workflow
- Implement retry logic for failures
- Set up performance analytics

---

## 📞 Quick Commands

```bash
# View workflow file
cat /root/sbs-landing/n8n-workflow-sbs-complete.json | jq

# Update webhook URL in backend
nano /root/sbs-landing/.env
# Change: N8N_WEBHOOK_URL=https://n8n.srv791040.hstgr.cloud/webhook/sbs-claim-submission

# Restart backend
cd /root/sbs-landing && docker compose restart

# Test submission
curl -X POST https://brainsait.cloud/api/submit-claim \
  -F "patientName=Test" \
  -F "patientId=123" \
  -F "claimType=professional" \
  -F "userEmail=test@example.com"

# Check n8n logs
docker logs n8n-n8n-1 -f
```

---

**Status**: ✅ Workflow created and ready to import  
**File**: `/root/sbs-landing/n8n-workflow-sbs-complete.json`  
**Next**: Import to n8n dashboard and activate  

**Powered by BrainSAIT برينسايت**  
**Author**: Dr. Mohamed El Fadil
