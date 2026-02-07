#!/bin/bash
# Quick single claim test

WEBHOOK_URL="${1:-https://n8n.brainsait.cloud/webhook/sbs-claim-submission}"

echo "Testing single claim submission to: $WEBHOOK_URL"
echo ""

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "claimHeader": {
      "claimId": "CLM-QUICK-TEST-001",
      "claimType": "Professional",
      "submissionDate": "2026-02-05",
      "claimStatus": "submitted",
      "facilityId": 1,
      "facilityName": "King Fahad Medical City"
    },
    "patientInfo": {
      "patientName": "Quick Test Patient",
      "patientId": "TEST123456",
      "patientIqama": "TEST123456",
      "patientAge": 35,
      "patientGender": "M",
      "dateOfBirth": "1990-01-01"
    },
    "memberInfo": {
      "memberId": "MEM-TEST-001",
      "memberName": "Quick Test Patient",
      "memberRelation": "self",
      "groupId": "GRP-TEST",
      "planId": "PLAN-TEST"
    },
    "payerInfo": {
      "payerId": "NPHIES-BUPA-001",
      "payerName": "BUPA Arabia",
      "payerType": "commercial"
    },
    "claimItems": [
      {
        "itemSequence": 1,
        "serviceCode": "SBS-CONS-001",
        "serviceDescription": "General Medical Consultation",
        "category": "Consultation",
        "unitPrice": 200.00,
        "quantity": 1,
        "netPrice": 200.00,
        "bundleCode": null,
        "notes": "Quick test consultation"
      }
    ],
    "financialInfo": {
      "totalNetPrice": 200.00,
      "facilityTierMarkup": 1.15,
      "totalGrossPrice": 230.00,
      "allowedAmount": 218.50,
      "patientResponsibility": 21.85,
      "insurancePays": 196.65,
      "currency": "SAR"
    },
    "documentInfo": {
      "documentId": "DOC-QUICK-TEST-001",
      "documentType": "invoice",
      "documentDate": "2026-02-05",
      "attachments": []
    },
    "providerInfo": {
      "providerId": "FAC-KFMC",
      "providerName": "King Fahad Medical City",
      "providerType": "tertiary",
      "accreditationTier": 1,
      "licenseNumber": "CHI-RYD-001",
      "nphiesPayerId": "NPHIES-BUPA-001"
    },
    "contactInfo": {
      "submitterEmail": "test@hospital.sa",
      "submitterPhone": "+966-11-0000000",
      "submitterName": "Quick Test System",
      "submitterRole": "Test Automation"
    },
    "metadata": {
      "submissionTimestamp": "'$(date -Iseconds)'",
      "sourceSystem": "Quick-Test-v1.0",
      "claimVersion": "1.0",
      "processingMode": "online",
      "retryCount": 0,
      "remarks": "Quick single claim test"
    }
  }' | jq '.' 2>/dev/null || echo "Response received (not JSON)"

echo ""
echo "Test complete!"
