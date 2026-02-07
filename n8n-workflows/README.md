# n8n Workflows

This directory contains the n8n workflows used by the SBS Integration Engine.

## 🚀 Workflows

### 1. SBS Claim Processing Workflow (Production)
- **File**: `sbs-production-workflow.json`
- **Description**: The main production workflow for processing HIS claims.
- **Trigger**: Webhook (`POST /sbs-claim-submission`)
- **Steps**:
  1. **Webhook**: Receives claim data from HIS
  2. **AI Normalizer**: Normalizes codes using AI service
  3. **Build FHIR**: Constructs standard FHIR payload
  4. **Financial Rules**: Validates against CHI rules
  5. **Digital Signer**: Signs the payload
  6. **NPHIES Submission**: Submits to NPHIES bridge

### 2. IoT Event Processing
- **File**: `iot-event-processing.json`
- **Description**: Processes IoT events from the gateway.

## 📥 Import Instructions

### Automatic Import
The workflow is automatically imported when starting the containers via Docker Compose.

### Manual Import
1. Open n8n Dashboard (http://localhost:5678)
2. Go to **Workflows** > **Import**
3. Select `sbs-production-workflow.json`

## 🛠️ Development

To edit the workflow:
1. Make changes in the n8n UI
2. Export the workflow as JSON
3. Save it to `n8n-workflows/sbs-production-workflow.json`
4. Commit the changes
