#!/bin/bash

# Enhanced Workflow Test Script
# Tests the complete claim processing workflow with enhancements

set -e

echo "🚀 SBS Enhanced Workflow Test Suite"
echo "===================================="
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
SIMULATION_URL="${SIMULATION_URL:-http://localhost:8004}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper function to run tests
run_test() {
  local test_name="$1"
  local test_command="$2"

  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  echo -e "${BLUE}[TEST $TESTS_TOTAL]${NC} $test_name"

  if eval "$test_command"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo ""
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo ""
    return 1
  fi
}

# Test 1: Check Simulation Service Health
test_simulation_health() {
  echo "  → Checking simulation service..."
  response=$(curl -s -o /dev/null -w "%{http_code}" $SIMULATION_URL/health)
  if [ "$response" == "200" ]; then
    echo "  → Simulation service is healthy"
    return 0
  else
    echo "  → Simulation service returned status: $response"
    return 1
  fi
}

# Test 2: Get Service Catalog
test_service_catalog() {
  echo "  → Fetching service catalog..."
  response=$(curl -s $SIMULATION_URL/service-catalog)

  # Check if response contains expected data
  if echo "$response" | grep -q "success"; then
    total_services=$(echo "$response" | grep -o '"total_services":[0-9]*' | grep -o '[0-9]*')
    echo "  → Found $total_services services in catalog"
    return 0
  else
    echo "  → Failed to fetch service catalog"
    return 1
  fi
}

# Test 3: Get Bundles
test_bundles() {
  echo "  → Fetching service bundles..."
  response=$(curl -s $SIMULATION_URL/bundles)

  if echo "$response" | grep -q "success"; then
    total_bundles=$(echo "$response" | grep -o '"total_bundles":[0-9]*' | grep -o '[0-9]*')
    echo "  → Found $total_bundles bundles"
    return 0
  else
    echo "  → Failed to fetch bundles"
    return 1
  fi
}

# Test 4: Generate Test Claim
test_generate_claim() {
  echo "  → Generating test claim..."
  response=$(curl -s -X POST $SIMULATION_URL/generate-test-claim \
    -H "Content-Type: application/json" \
    -d '{
      "claim_type": "professional",
      "scenario": "success",
      "num_services": 2
    }')

  if echo "$response" | grep -q "claim_data"; then
    patient_name=$(echo "$response" | grep -o '"patientName":"[^"]*"' | cut -d'"' -f4)
    services_count=$(echo "$response" | grep -o '"services":\[[^]]*\]' | grep -o '{' | wc -l)
    echo "  → Generated claim for: $patient_name"
    echo "  → Services count: $services_count"
    return 0
  else
    echo "  → Failed to generate test claim"
    return 1
  fi
}

# Test 5: Test All Scenarios
test_all_scenarios() {
  echo "  → Testing all scenarios..."
  scenarios=("success" "bundle_applied" "multi_service" "high_value_claim")

  for scenario in "${scenarios[@]}"; do
    echo "    • Testing scenario: $scenario"
    response=$(curl -s -X POST $SIMULATION_URL/generate-test-claim \
      -H "Content-Type: application/json" \
      -d "{\"claim_type\": \"professional\", \"scenario\": \"$scenario\", \"num_services\": 2}")

    if ! echo "$response" | grep -q "claim_data"; then
      echo "    ✗ Failed for scenario: $scenario"
      return 1
    fi
  done

  echo "  → All scenarios working"
  return 0
}

# Test 6: Backend API - Service Catalog Proxy
test_backend_catalog_proxy() {
  echo "  → Testing backend catalog proxy..."
  response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/simulation/service-catalog)

  if [ "$response" == "200" ]; then
    echo "  → Backend proxy is working"
    return 0
  else
    echo "  → Backend proxy returned status: $response"
    return 1
  fi
}

# Test 7: Backend API - Generate Test Claim via Proxy
test_backend_generate_proxy() {
  echo "  → Testing backend test generation proxy..."
  response=$(curl -s -X POST $BASE_URL/api/simulation/generate-test-claim \
    -H "Content-Type: application/json" \
    -d '{"claim_type": "professional", "scenario": "success", "num_services": 1}')

  if echo "$response" | grep -q "claim_data"; then
    echo "  → Backend proxy working correctly"
    return 0
  else
    echo "  → Backend proxy failed"
    return 1
  fi
}

# Test 8: Submit Enhanced Claim (Integration Test)
test_submit_enhanced_claim() {
  echo "  → Submitting enhanced claim..."

  # First, generate test data
  test_data=$(curl -s -X POST $SIMULATION_URL/generate-test-claim \
    -H "Content-Type: application/json" \
    -d '{"claim_type": "professional", "scenario": "success", "num_services": 2}')

  # Extract claim data
  patient_name=$(echo "$test_data" | grep -o '"patientName":"[^"]*"' | cut -d'"' -f4)
  patient_id=$(echo "$test_data" | grep -o '"patientId":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$patient_name" ] || [ -z "$patient_id" ]; then
    echo "  → Failed to extract test data"
    return 1
  fi

  echo "  → Submitting claim for: $patient_name"

  # Submit the enhanced claim
  response=$(curl -s -X POST $BASE_URL/api/submit-claim-enhanced \
    -H "Content-Type: application/json" \
    -d "{
      \"patientName\": \"$patient_name\",
      \"patientId\": \"$patient_id\",
      \"memberId\": \"MEM-123456\",
      \"payerId\": \"PAYER-NCCI-001\",
      \"providerId\": \"PROV-KFMC-001\",
      \"claimType\": \"professional\",
      \"userEmail\": \"test@example.com\",
      \"diagnosisCode\": \"J06.9\",
      \"diagnosisDisplay\": \"Acute upper respiratory infection\",
      \"services\": [
        {
          \"internalCode\": \"CONS-GEN-001\",
          \"description\": \"General Medical Consultation\",
          \"quantity\": 1,
          \"unitPrice\": 200.00,
          \"serviceDate\": \"2024-01-18\"
        }
      ],
      \"totalAmount\": 200.00
    }")

  if echo "$response" | grep -q "success.*true"; then
    claim_id=$(echo "$response" | grep -o '"claimId":"[^"]*"' | cut -d'"' -f4)
    echo "  → Claim submitted successfully!"
    echo "  → Claim ID: $claim_id"

    # Wait a bit for processing
    echo "  → Waiting for initial processing..."
    sleep 2

    # Check claim status
    status_response=$(curl -s $BASE_URL/api/claim-status/$claim_id)
    if echo "$status_response" | grep -q "success.*true"; then
      echo "  → Claim status retrieved successfully"
      return 0
    else
      echo "  → Failed to retrieve claim status"
      return 1
    fi
  else
    echo "  → Failed to submit claim"
    echo "  → Response: $response"
    return 1
  fi
}

# Main test execution
echo ""
echo "Running Enhanced Workflow Tests..."
echo ""

run_test "Simulation Service Health Check" "test_simulation_health"
run_test "Service Catalog Retrieval" "test_service_catalog"
run_test "Bundle Definitions Retrieval" "test_bundles"
run_test "Test Claim Generation" "test_generate_claim"
run_test "All Scenario Testing" "test_all_scenarios"
run_test "Backend Catalog Proxy" "test_backend_catalog_proxy"
run_test "Backend Generation Proxy" "test_backend_generate_proxy"

# Only run integration test if all previous tests passed
if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${YELLOW}Note: Integration test disabled by default (requires all services running)${NC}"
  echo -e "${YELLOW}To enable, set ENABLE_INTEGRATION_TEST=1${NC}"
  echo ""

  if [ "${ENABLE_INTEGRATION_TEST}" == "1" ]; then
    run_test "Enhanced Claim Submission (Integration)" "test_submit_enhanced_claim"
  fi
fi

# Summary
echo "===================================="
echo "Test Results:"
echo "===================================="
echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
echo -e "Passed:      ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:      ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
