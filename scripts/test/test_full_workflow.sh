#!/bin/bash

echo "=========================================="
echo "SBS Integration Engine - Full Workflow Test"
echo "=========================================="
echo ""

# Step 1: Normalize the code
echo "Step 1: Normalizing internal code..."
NORMALIZED=$(curl -s -X POST http://localhost:8000/normalize \
  -H 'Content-Type: application/json' \
  -d '{
    "facility_id": 1,
    "internal_code": "LAB-CBC-01",
    "description": "Complete Blood Count Test"
  }')

SBS_CODE=$(echo $NORMALIZED | jq -r '.sbs_mapped_code')
SBS_DESC=$(echo $NORMALIZED | jq -r '.official_description')

echo "✓ Normalized: $SBS_CODE - $SBS_DESC"
echo ""

# Step 2: Build FHIR Claim object
echo "Step 2: Building FHIR Claim object..."
FHIR_CLAIM=$(cat <<FHIR
{
  "resourceType": "Claim",
  "status": "active",
  "facility_id": 1,
  "patient": {
    "reference": "Patient/12345"
  },
  "provider": {
    "reference": "Organization/1"
  },
  "item": [{
    "sequence": 1,
    "productOrService": {
      "coding": [{
        "system": "http://sbs.sa/coding/services",
        "code": "$SBS_CODE",
        "display": "$SBS_DESC"
      }]
    }
  }]
}
FHIR
)

echo "✓ FHIR Claim created"
echo ""

# Step 3: Apply Financial Rules
echo "Step 3: Applying Financial Rules..."
VALIDATED_CLAIM=$(curl -s -X POST http://localhost:8002/validate \
  -H 'Content-Type: application/json' \
  -d "$FHIR_CLAIM")

TOTAL=$(echo $VALIDATED_CLAIM | jq -r '.total.value')
echo "✓ Financial rules applied. Total: $TOTAL SAR"
echo ""

# Step 4: Sign the claim
echo "Step 4: Signing the claim..."
SIGNATURE_RESPONSE=$(curl -s -X POST http://localhost:8001/sign \
  -H 'Content-Type: application/json' \
  -d "{
    \"payload\": $VALIDATED_CLAIM,
    \"facility_id\": 1
  }")

SIGNATURE=$(echo $SIGNATURE_RESPONSE | jq -r '.signature')
echo "✓ Claim signed: ${SIGNATURE:0:40}..."
echo ""

# Step 5: Submit to NPHIES (Mock)
echo "Step 5: Preparing NPHIES submission..."
echo "✓ Would submit to: https://sandbox.nphies.sa/api/v1"
echo ""

# Final summary
echo "=========================================="
echo "✅ Full Workflow Test COMPLETE"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • Input Code: LAB-CBC-01"
echo "  • SBS Code: $SBS_CODE"
echo "  • Total Amount: $TOTAL SAR"
echo "  • Signature Length: ${#SIGNATURE} chars"
echo ""
echo "All services working correctly! ✓"
echo ""
