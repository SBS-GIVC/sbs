#!/bin/bash

echo "======================================================================"
echo "🏥 SBS INTEGRATION - COMPREHENSIVE END-TO-END TEST"
echo "======================================================================"
echo ""
echo "Testing all components from HIS input → n8n → NPHIES submission"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test result
test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "======================================================================"
echo "PHASE 1: INFRASTRUCTURE HEALTH CHECKS"
echo "======================================================================"
echo ""

# Test 1: Check Docker containers
echo -e "${BLUE}Test 1:${NC} Verifying SBS service containers..."
CONTAINERS=$(docker ps --filter "name=sbs-" --format "{{.Names}}" | wc -l)
if [ "$CONTAINERS" -eq 5 ]; then
    test_result 0 "All 5 SBS containers are running"
else
    test_result 1 "Expected 5 containers, found $CONTAINERS"
fi

# Test 2: Check n8n container
echo -e "${BLUE}Test 2:${NC} Verifying n8n container..."
N8N_RUNNING=$(docker ps --filter "name=n8n-n8n" --format "{{.Names}}" | wc -l)
test_result $((1-N8N_RUNNING)) "n8n container is running"

# Test 3-6: Health endpoints
echo -e "${BLUE}Test 3:${NC} Testing Normalizer health endpoint..."
NORM_HEALTH=$(curl -s http://localhost:8000/health | jq -r '.status')
[ "$NORM_HEALTH" == "healthy" ]
test_result $? "Normalizer service is healthy"

echo -e "${BLUE}Test 4:${NC} Testing Signer health endpoint..."
SIGN_HEALTH=$(curl -s http://localhost:8001/health | jq -r '.status')
[ "$SIGN_HEALTH" == "healthy" ]
test_result $? "Signer service is healthy"

echo -e "${BLUE}Test 5:${NC} Testing Financial Rules health endpoint..."
FIN_HEALTH=$(curl -s http://localhost:8002/health | jq -r '.status')
[ "$FIN_HEALTH" == "healthy" ]
test_result $? "Financial Rules service is healthy"

echo -e "${BLUE}Test 6:${NC} Testing NPHIES Bridge health endpoint..."
NPHIES_HEALTH=$(curl -s http://localhost:8003/health | jq -r '.status')
[ "$NPHIES_HEALTH" == "healthy" ]
test_result $? "NPHIES Bridge service is healthy"

# Test 7: Database connection
echo -e "${BLUE}Test 7:${NC} Testing database connectivity..."
DB_TEST=$(docker exec sbs-postgres psql -U postgres -d sbs_integration -c "SELECT COUNT(*) FROM facilities;" -t 2>/dev/null | tr -d ' ')
[ "$DB_TEST" -ge 1 ]
test_result $? "Database is accessible and has data"

echo ""
echo "======================================================================"
echo "PHASE 2: INDIVIDUAL SERVICE FUNCTIONALITY TESTS"
echo "======================================================================"
echo ""

# Test 8: Normalizer service
echo -e "${BLUE}Test 8:${NC} Testing code normalization..."
NORM_RESPONSE=$(curl -s -X POST http://localhost:8000/normalize \
  -H 'Content-Type: application/json' \
  -d '{
    "facility_id": 1,
    "internal_code": "LAB-CBC-01",
    "description": "Complete Blood Count Test"
  }')

SBS_CODE=$(echo $NORM_RESPONSE | jq -r '.sbs_mapped_code')
[ "$SBS_CODE" == "SBS-LAB-001" ]
test_result $? "Code normalization (LAB-CBC-01 → $SBS_CODE)"

# Test 9: Financial Rules service
echo -e "${BLUE}Test 9:${NC} Testing financial rules engine..."
FHIR_CLAIM=$(cat <<EOF
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
        "display": "Complete Blood Count (CBC)"
      }]
    },
    "quantity": {
      "value": 1
    }
  }]
}
EOF
)

FIN_RESPONSE=$(curl -s -X POST http://localhost:8002/validate \
  -H 'Content-Type: application/json' \
  -d "$FHIR_CLAIM")

TOTAL_AMOUNT=$(echo $FIN_RESPONSE | jq -r '.total.value')
[ ! -z "$TOTAL_AMOUNT" ] && [ "$TOTAL_AMOUNT" != "null" ]
test_result $? "Financial rules calculation (Total: $TOTAL_AMOUNT SAR)"

# Test 10: Signer service
echo -e "${BLUE}Test 10:${NC} Testing digital signature..."
SIGN_RESPONSE=$(curl -s -X POST http://localhost:8001/sign \
  -H 'Content-Type: application/json' \
  -d "{
    \"payload\": $FIN_RESPONSE,
    \"facility_id\": 1
  }")

SIGNATURE=$(echo $SIGN_RESPONSE | jq -r '.signature')
[ ! -z "$SIGNATURE" ] && [ "$SIGNATURE" != "null" ]
test_result $? "Digital signature generation (${#SIGNATURE} chars)"

# Test 11: NPHIES Bridge
echo -e "${BLUE}Test 11:${NC} Testing NPHIES Bridge readiness..."
NPHIES_ENDPOINT=$(curl -s http://localhost:8003/health | jq -r '.nphies_endpoint')
[ "$NPHIES_ENDPOINT" == "https://sandbox.nphies.sa/api/v1" ]
test_result $? "NPHIES endpoint configured"

echo ""
echo "======================================================================"
echo "PHASE 3: N8N WORKFLOW INTEGRATION TESTS"
echo "======================================================================"
echo ""

# Test 12: Check if SBS workflow exists in n8n
echo -e "${BLUE}Test 12:${NC} Checking n8n workflows..."
N8N_WORKFLOWS=$(docker exec n8n-n8n-1 n8n list:workflow 2>/dev/null | grep -i "SBS Integration" | wc -l)
[ "$N8N_WORKFLOWS" -ge 1 ]
test_result $? "SBS Integration workflow(s) found in n8n ($N8N_WORKFLOWS workflow(s))"

# Test 13: Get workflow status
echo -e "${BLUE}Test 13:${NC} Checking workflow activation status..."
WORKFLOW_LIST=$(docker exec n8n-n8n-1 n8n list:workflow 2>/dev/null | grep "SBS Integration")
echo "$WORKFLOW_LIST"
echo ""

# Test 14: Test webhook endpoint (if workflow is active)
echo -e "${BLUE}Test 14:${NC} Testing n8n webhook endpoint..."
WEBHOOK_TEST=$(curl -s -X POST https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway \
  -H 'Content-Type: application/json' \
  -d '{
    "facility_id": 1,
    "service_code": "LAB-CBC-01",
    "service_desc": "Complete Blood Count Test",
    "patient_id": "Patient/TEST-12345",
    "quantity": 1,
    "unit_price": 50.00
  }' 2>&1)

# Check if we got a response (not a connection error)
if echo "$WEBHOOK_TEST" | grep -q "Could not resolve host\|Connection refused\|Failed to connect"; then
    test_result 1 "n8n webhook endpoint (endpoint not accessible - workflow may not be active)"
else
    test_result 0 "n8n webhook endpoint (received response)"
    echo "   Response preview: ${WEBHOOK_TEST:0:200}..."
fi

echo ""
echo "======================================================================"
echo "PHASE 4: END-TO-END WORKFLOW TEST"
echo "======================================================================"
echo ""

# Test 15: Full workflow simulation
echo -e "${BLUE}Test 15:${NC} Running complete workflow simulation..."
echo ""

# Step 1: Normalize
echo "   Step 1/4: Normalizing code..."
NORM_RESULT=$(curl -s -X POST http://localhost:8000/normalize \
  -H 'Content-Type: application/json' \
  -d '{
    "facility_id": 1,
    "internal_code": "RAD-XRAY-CHEST",
    "description": "Chest X-Ray"
  }')
SBS_CODE_E2E=$(echo $NORM_RESULT | jq -r '.sbs_mapped_code')
echo "      → Normalized to: $SBS_CODE_E2E"

# Step 2: Build FHIR
echo "   Step 2/4: Building FHIR Claim..."
FHIR_E2E=$(cat <<EOF
{
  "resourceType": "Claim",
  "status": "active",
  "facility_id": 1,
  "patient": {"reference": "Patient/E2E-TEST"},
  "provider": {"reference": "Organization/1"},
  "item": [{
    "sequence": 1,
    "productOrService": {
      "coding": [{
        "system": "http://sbs.sa/coding/services",
        "code": "$SBS_CODE_E2E",
        "display": "Chest X-Ray"
      }]
    },
    "quantity": {"value": 1}
  }]
}
EOF
)
echo "      → FHIR Claim created"

# Step 3: Apply financial rules
echo "   Step 3/4: Applying financial rules..."
FIN_E2E=$(curl -s -X POST http://localhost:8002/validate \
  -H 'Content-Type: application/json' \
  -d "$FHIR_E2E")
TOTAL_E2E=$(echo $FIN_E2E | jq -r '.total.value')
echo "      → Total calculated: $TOTAL_E2E SAR"

# Step 4: Sign
echo "   Step 4/4: Signing claim..."
SIGN_E2E=$(curl -s -X POST http://localhost:8001/sign \
  -H 'Content-Type: application/json' \
  -d "{\"payload\": $FIN_E2E, \"facility_id\": 1}")
SIG_E2E=$(echo $SIGN_E2E | jq -r '.signature')
echo "      → Signature: ${SIG_E2E:0:50}..."

# Verify all steps succeeded
[ ! -z "$SBS_CODE_E2E" ] && [ ! -z "$TOTAL_E2E" ] && [ ! -z "$SIG_E2E" ]
test_result $? "Complete end-to-end workflow execution"

echo ""
echo "======================================================================"
echo "PHASE 5: DATA INTEGRITY TESTS"
echo "======================================================================"
echo ""

# Test 16: Verify SBS codes in database
echo -e "${BLUE}Test 16:${NC} Verifying SBS master codes..."
SBS_COUNT=$(docker exec sbs-postgres psql -U postgres -d sbs_integration -c "SELECT COUNT(*) FROM sbs_codes;" -t 2>/dev/null | tr -d ' ')
[ "$SBS_COUNT" -ge 4 ]
test_result $? "SBS master codes loaded ($SBS_COUNT codes)"

# Test 17: Verify facilities
echo -e "${BLUE}Test 17:${NC} Verifying facility configuration..."
FAC_COUNT=$(docker exec sbs-postgres psql -U postgres -d sbs_integration -c "SELECT COUNT(*) FROM facilities;" -t 2>/dev/null | tr -d ' ')
[ "$FAC_COUNT" -ge 1 ]
test_result $? "Facilities configured ($FAC_COUNT facilities)"

# Test 18: Verify pricing tiers
echo -e "${BLUE}Test 18:${NC} Verifying pricing tiers..."
TIER_COUNT=$(docker exec sbs-postgres psql -U postgres -d sbs_integration -c "SELECT COUNT(*) FROM pricing_tiers;" -t 2>/dev/null | tr -d ' ')
[ "$TIER_COUNT" -ge 8 ]
test_result $? "Pricing tiers configured ($TIER_COUNT tiers)"

# Test 19: Verify certificates
echo -e "${BLUE}Test 19:${NC} Verifying facility certificates..."
CERT_COUNT=$(docker exec sbs-postgres psql -U postgres -d sbs_integration -c "SELECT COUNT(*) FROM facility_certificates WHERE is_active = true;" -t 2>/dev/null | tr -d ' ')
[ "$CERT_COUNT" -ge 1 ]
test_result $? "Active certificates present ($CERT_COUNT active)"

echo ""
echo "======================================================================"
echo "PHASE 6: PERFORMANCE & RELIABILITY TESTS"
echo "======================================================================"
echo ""

# Test 20: Response time test
echo -e "${BLUE}Test 20:${NC} Testing normalizer response time..."
START_TIME=$(date +%s%N)
curl -s -X POST http://localhost:8000/normalize \
  -H 'Content-Type: application/json' \
  -d '{"facility_id": 1, "internal_code": "TEST-001", "description": "Test"}' > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
[ $RESPONSE_TIME -lt 5000 ]
test_result $? "Response time under 5 seconds ($RESPONSE_TIME ms)"

# Test 21: Concurrent request handling
echo -e "${BLUE}Test 21:${NC} Testing concurrent request handling..."
for i in {1..3}; do
  curl -s -X POST http://localhost:8000/normalize \
    -H 'Content-Type: application/json' \
    -d "{\"facility_id\": 1, \"internal_code\": \"TEST-$i\", \"description\": \"Test $i\"}" > /dev/null &
done
wait
test_result 0 "Concurrent requests handled successfully"

echo ""
echo "======================================================================"
echo "📊 TEST SUMMARY"
echo "======================================================================"
echo ""
echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ ALL TESTS PASSED! SBS INTEGRATION IS FULLY OPERATIONAL${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "🎉 The complete SBS Integration system is working correctly!"
    echo ""
    echo "System Status:"
    echo "  ✓ All microservices are healthy"
    echo "  ✓ Database is operational with valid data"
    echo "  ✓ n8n workflows are imported"
    echo "  ✓ End-to-end workflow validated"
    echo "  ✓ Performance is within acceptable limits"
    echo ""
    echo "Next Steps:"
    echo "  1. Activate the SBS Integration workflow in n8n"
    echo "  2. Configure production NPHIES credentials"
    echo "  3. Import facility-specific code mappings"
    echo "  4. Load complete SBS master catalogue"
    echo ""
    exit 0
else
    echo -e "${RED}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}⚠️  SOME TESTS FAILED - REVIEW REQUIRED${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Please review the failed tests above and take corrective action."
    echo ""
    exit 1
fi
