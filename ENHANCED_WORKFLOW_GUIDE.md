# Enhanced Claim Workflow Guide

## 🚀 Overview

This guide documents the comprehensive enhancements made to the SBS Integration Engine to improve the complete claim processing workflow from upload to NPHIES submission.

## ✨ New Features

### 1. **Enhanced Claim Submission Form**

A rich, interactive form that supports multi-service claims with real-time validation.

#### Features:
- ✅ Multi-service claim support
- ✅ Real-time validation with helpful error messages
- ✅ Service catalog integration with auto-population
- ✅ Diagnosis code selection (ICD-10)
- ✅ Automatic price calculation
- ✅ Preview modal before submission
- ✅ Test data generation for quick testing

#### Usage:
```javascript
// Access the enhanced form at:
http://localhost:3000/enhanced-workflow.html

// Or integrate into your page:
<div id="enhancedClaimFormContainer"></div>
<script src="/enhanced-claim-form.js"></script>
<script>
  const claimForm = new EnhancedClaimForm();
  await claimForm.init();
</script>
```

### 2. **Simulation Service**

A comprehensive test data generator for simulating various claim scenarios.

#### Features:
- 📋 Realistic test claim generation
- 🎭 Multiple scenario support (success, failure, bundles, etc.)
- 📚 Complete service catalog
- 💰 Bundle definitions with savings
- 🏥 Multi-facility support

#### API Endpoints:

```bash
# Get service catalog
GET /service-catalog

# Get available bundles
GET /bundles

# Get test scenarios
GET /scenarios

# Generate test claim
POST /generate-test-claim
{
  "claim_type": "professional",
  "scenario": "success",
  "num_services": 2
}
```

#### Docker Service:
```yaml
simulation-service:
  build: ./simulation-service
  ports:
    - "8004:8004"
```

### 3. **Enhanced Workflow Tracker**

Visual real-time tracking of claim processing through all stages.

#### Features:
- 📊 Visual progress bar
- 🎯 Stage-by-stage status indicators
- ⏱️ Real-time updates (polling every 3 seconds)
- 📝 Detailed activity timeline
- ❌ Error details and troubleshooting
- 📄 NPHIES response display

#### Usage:
```javascript
<div id="workflowTrackerContainer"></div>
<script src="/workflow-tracker.js"></script>
<script>
  const tracker = new WorkflowTracker('CLM-ABCDE123-XYZ456');
  await tracker.init();
</script>
```

### 4. **Multi-Service Claim Processing**

Enhanced backend support for processing claims with multiple services.

#### Features:
- 🔄 Batch normalization of all services
- 💰 Automatic bundle detection
- 📊 Detailed pricing breakdown
- ✅ Individual service confidence scoring
- 🎯 FHIR-compliant claim structure

#### API Endpoint:
```bash
POST /api/submit-claim-enhanced
Content-Type: application/json

{
  "patientName": "Ahmed Al-Rashid",
  "patientId": "1234567890",
  "memberId": "MEM-123456",
  "payerId": "PAYER-NCCI-001",
  "providerId": "PROV-KFMC-001",
  "claimType": "professional",
  "userEmail": "patient@example.com",
  "diagnosisCode": "J06.9",
  "diagnosisDisplay": "Acute upper respiratory infection",
  "services": [
    {
      "internalCode": "CONS-GEN-001",
      "description": "General Medical Consultation",
      "quantity": 1,
      "unitPrice": 200.00,
      "serviceDate": "2024-01-18"
    },
    {
      "internalCode": "LAB-CBC-001",
      "description": "Complete Blood Count",
      "quantity": 1,
      "unitPrice": 50.00,
      "serviceDate": "2024-01-18"
    }
  ],
  "totalAmount": 250.00
}
```

## 📋 Complete Workflow Steps

### Stage 1: Claim Upload (**Enhanced**)
- Multi-service input with individual details
- Diagnosis code selection
- Real-time validation
- Preview before submission
- Test data generation option

### Stage 2: Validation (**Enhanced**)
- Comprehensive field validation
- Saudi ID format verification
- Email format validation
- Service-level validation
- Business rule checks

### Stage 3: Normalization (**Enhanced**)
- Batch processing of multiple services
- Confidence scoring for each service
- AI fallback for unknown codes
- Average confidence calculation
- Detailed error messages

### Stage 4: Bundle Detection (**New**)
- Automatic bundle identification
- Savings calculation
- Bundle composition display
- Override option
- Price comparison

### Stage 5: Financial Rules (**Enhanced**)
- Facility tier identification
- Markup calculation
- Bundle pricing application
- Coverage limit validation
- Detailed breakdown

### Stage 6: Digital Signing
- RSA SHA-256 signing
- Certificate management
- Signature verification
- Timestamp recording

### Stage 7: NPHIES Submission (**Enhanced**)
- Retry logic (3 attempts)
- Exponential backoff
- Transaction logging
- Response parsing
- Error handling

## 🎯 Test Scenarios

The simulation service provides 8 pre-configured scenarios:

| Scenario | Code | Description |
|----------|------|-------------|
| ✅ Success | `success` | Complete successful workflow |
| ❌ Normalization Failed | `normalization_failed` | Code not found in mapping |
| 💰 Bundle Applied | `bundle_applied` | Multiple services form a bundle |
| 💵 High Value | `high_value_claim` | High-value services requiring approval |
| 📋 Multi-Service | `multi_service` | Multiple services and procedures |
| 🔒 Requires Pre-Auth | `requires_preauth` | Service needs prior authorization |
| ⚠️ Validation Error | `validation_error` | Invalid claim structure |
| 🚫 NPHIES Rejected | `nphies_rejected` | Rejected by NPHIES |

### Example: Generate Bundle Test Claim

```bash
curl -X POST http://localhost:8004/generate-test-claim \
  -H "Content-Type: application/json" \
  -d '{
    "claim_type": "professional",
    "scenario": "bundle_applied",
    "num_services": 3
  }'
```

## 📊 Service Catalog

### Professional Claims
- General Consultation (SBS-CONS-001) - 200 SAR
- Specialist Consultation (SBS-CONS-002) - 350 SAR
- CBC Test (SBS-LAB-001) - 50 SAR
- Lipid Profile (SBS-LAB-002) - 80 SAR
- Chest X-Ray (SBS-RAD-001) - 150 SAR

### Institutional Claims
- Appendectomy (SBS-SURG-001) - 5,000 SAR
- General Ward (SBS-ADMIT-001) - 800 SAR/day
- ICU (SBS-ICU-001) - 2,500 SAR/day

### Pharmacy Claims
- Amoxicillin 500mg (SBS-DRUG-001) - 45 SAR
- Paracetamol 500mg (SBS-DRUG-002) - 15 SAR

### Vision Claims
- Eye Examination (SBS-EYE-001) - 120 SAR
- Prescription Glasses (SBS-GLASSES-001) - 450 SAR

## 💰 Service Bundles

### Basic Health Checkup (BUNDLE-CHECKUP-001)
- Services: Consultation + CBC + Lipid Profile
- Regular Price: 330 SAR
- Bundle Price: 280 SAR
- **Savings: 50 SAR**

### Appendectomy Package (BUNDLE-APPEND-001)
- Services: Surgery + Ward Admission + CBC
- Regular Price: 5,850 SAR
- Bundle Price: 5,500 SAR
- **Savings: 350 SAR**

## 🔧 Environment Variables

Add to your `.env` file:

```bash
# Simulation Service
SBS_SIMULATION_URL=http://simulation-service:8004

# Enhanced Features
ENABLE_ENHANCED_WORKFLOW=true
ENABLE_BUNDLE_DETECTION=true
ENABLE_MULTI_SERVICE=true
```

## 🚀 Quick Start

### 1. Start All Services
```bash
docker-compose up -d
```

### 2. Access Enhanced Workflow
```
http://localhost:3000/enhanced-workflow.html
```

### 3. Generate Test Claim
Click "Generate Test Data" button in the form

### 4. Fill in Details
- Review auto-populated data
- Add/remove services as needed
- Select diagnosis code

### 5. Preview & Submit
- Click "Review & Submit"
- Verify all details
- Confirm submission

### 6. Track Progress
- Automatic redirect to tracking page
- Real-time status updates
- Detailed stage information

## 📈 Performance Metrics

### Average Processing Times:
- Upload & Validation: < 50ms
- Normalization (per service): 45-200ms
- Bundle Detection: 100-150ms
- Financial Rules: 100-150ms
- Signing: 200-300ms
- NPHIES Submission: 5-10 seconds

### Total End-to-End: 6-10 seconds

## 🎨 UI Components

### Enhanced Claim Form
- **Location**: `/sbs-landing/public/enhanced-claim-form.js`
- **Class**: `EnhancedClaimForm`
- **Methods**:
  - `init()` - Initialize form
  - `addService()` - Add service row
  - `removeService(id)` - Remove service
  - `validateForm()` - Validate all fields
  - `submitClaim()` - Submit claim
  - `generateTestClaim()` - Generate test data

### Workflow Tracker
- **Location**: `/sbs-landing/public/workflow-tracker.js`
- **Class**: `WorkflowTracker`
- **Methods**:
  - `init()` - Initialize tracker
  - `fetchStatus()` - Get current status
  - `startPolling()` - Start auto-refresh
  - `stopPolling()` - Stop auto-refresh
  - `updateDisplay()` - Refresh UI

## 🔗 API Endpoints

### Simulation Service (Port 8004)
```
GET  /health                       - Health check
GET  /service-catalog              - Get all services
GET  /bundles                      - Get service bundles
GET  /scenarios                    - Get test scenarios
POST /generate-test-claim          - Generate test claim
POST /simulate-workflow/{stage}    - Simulate stage response
```

### Backend API (Port 3000)
```
POST /api/submit-claim-enhanced    - Submit enhanced claim
GET  /api/simulation/service-catalog  - Proxy to simulation service
GET  /api/simulation/bundles       - Get bundles
GET  /api/simulation/scenarios     - Get scenarios
POST /api/simulation/generate-test-claim - Generate test
```

## 🐛 Troubleshooting

### Simulation Service Not Available
```bash
# Check if service is running
docker-compose ps simulation-service

# View logs
docker-compose logs simulation-service

# Restart service
docker-compose restart simulation-service
```

### Form Not Loading
1. Check browser console for errors
2. Verify all JS files are loaded
3. Check API base URL configuration
4. Ensure services are running

### Test Data Not Generating
1. Verify simulation service is running (port 8004)
2. Check network tab for failed requests
3. Review simulation service logs
4. Try manual API call with curl

## 📚 Additional Resources

### Documentation
- [Main README](./README.md)
- [API Documentation](./docs/API.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

### Code Examples
- [Sample Claims](./examples/sample-claims.json)
- [Integration Tests](./tests/integration/)

## 🎯 Next Steps

### Recommended Enhancements:
1. ⚡ WebSocket support for real-time updates (instead of polling)
2. 📱 Mobile-responsive enhancements
3. 🌐 Full Arabic language support
4. 📊 Analytics dashboard
5. 🔔 Email/SMS notifications
6. 📄 PDF receipt generation
7. 🔄 Bulk claim upload
8. 🗂️ Claim templates library

## 📞 Support

For issues or questions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/sbs/issues)
- Documentation: [Wiki](https://github.com/your-repo/sbs/wiki)
- Email: support@sbs-integration.com

---

**Version**: 2.0.0
**Last Updated**: January 2024
**Maintained by**: SBS Integration Team
