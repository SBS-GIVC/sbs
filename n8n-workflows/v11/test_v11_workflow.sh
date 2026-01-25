#!/bin/bash

# ==============================================================================
# SBS Integration v11 - Comprehensive Test Suite
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WEBHOOK_URL="${WEBHOOK_URL:-https://n8n.srv791040.hstgr.cloud/webhook/sbs-gateway}"
API_KEY="${SBS_API_KEY:-test-api-key}"
VERBOSE="${VERBOSE:-false}"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST $TOTAL_TESTS: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ PASSED: $1${NC}"
    ((PASSED_TESTS++))
}

print_failure() {
    echo -e "${RED}✗ FAILED: $1${NC}"
    ((FAILED_TESTS++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

make_request() {
    local payload="$1"
    local expected_status="$2"
    local description="$3"
    
    ((TOTAL_TESTS++))
    print_test "$description"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d "$payload")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$VERBOSE" = "true" ]; then
        echo "Response body: $body"
        echo "HTTP code: $http_code"
    fi
    
    if [ "$http_code" = "$expected_status" ]; then
        print_success "$description (HTTP $http_code)"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 0
    else
        print_failure "$description (Expected $expected_status, got $http_code)"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 1
    fi
}

# ==============================================================================
# Test Suite
# ==============================================================================

print_header "SBS Integration v11 Test Suite"
echo "Webhook URL: $WEBHOOK_URL"
echo "Start time: $(date)"
echo ""

# ------------------------------------------------------------------------------
# Test Category 1: Authentication Tests
# ------------------------------------------------------------------------------

print_header "Category 1: Authentication & Authorization"

# Test 1.1: Valid API Key
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "patient_national_id": "1234567890",
  "service_code": "SRV-001",
  "service_desc": "Consultation",
  "unit_price": 150.00,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "200" "Valid API key authentication"

# Test 1.2: Missing API Key
API_KEY="" make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345"
}' "401" "Missing API key"

# Test 1.3: Invalid API Key
API_KEY="wrong-key" make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345"
}' "401" "Invalid API key"

# Test 1.4: Unauthorized Facility
make_request '{
  "facility_id": "UNAUTHORIZED",
  "patient_id": "PAT-12345",
  "service_code": "SRV-001",
  "service_desc": "Test",
  "unit_price": 100,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "403" "Unauthorized facility"

# ------------------------------------------------------------------------------
# Test Category 2: Validation Tests
# ------------------------------------------------------------------------------

print_header "Category 2: Input Validation"

# Test 2.1: Missing required field (patient_id)
make_request '{
  "facility_id": "FAC001",
  "service_code": "SRV-001",
  "service_desc": "Test",
  "unit_price": 100,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "400" "Missing required field: patient_id"

# Test 2.2: Invalid price (negative)
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "service_code": "SRV-001",
  "service_desc": "Test",
  "unit_price": -100,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "400" "Invalid price (negative)"

# Test 2.3: Invalid quantity (zero)
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "service_code": "SRV-001",
  "service_desc": "Test",
  "unit_price": 100,
  "quantity": 0,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "400" "Invalid quantity (zero)"

# Test 2.4: Invalid National ID format
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "patient_national_id": "123",
  "service_code": "SRV-001",
  "service_desc": "Test",
  "unit_price": 100,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "400" "Invalid Saudi National ID format"

# Test 2.5: Future encounter date
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "service_code": "SRV-001",
  "service_desc": "Test",
  "unit_price": 100,
  "quantity": 1,
  "encounter_date": "2099-01-01T10:00:00Z",
  "payer_id": "PAYER-001"
}' "400" "Future encounter date"

# ------------------------------------------------------------------------------
# Test Category 3: Business Rules
# ------------------------------------------------------------------------------

print_header "Category 3: Business Rule Validation"

# Test 3.1: Excessive price
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "service_code": "SRV-001",
  "service_desc": "Test",
  "unit_price": 2000000,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "400" "Price exceeds limit (1M SAR)"

# Test 3.2: Excessive quantity
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "service_code": "SRV-001",
  "service_desc": "Test",
  "unit_price": 100,
  "quantity": 2000,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "400" "Quantity exceeds limit (1000)"

# Test 3.3: High value claim (warning, should pass)
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "service_code": "SRV-001",
  "service_desc": "High value procedure",
  "unit_price": 60000,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "200" "High value claim (with warning)"

# ------------------------------------------------------------------------------
# Test Category 4: Valid Scenarios
# ------------------------------------------------------------------------------

print_header "Category 4: Valid Claim Submissions"

# Test 4.1: Basic consultation
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-12345",
  "patient_national_id": "1234567890",
  "service_code": "CONSULT-001",
  "service_desc": "General Consultation",
  "unit_price": 150.00,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "200" "Basic consultation claim"

# Test 4.2: Multi-quantity claim
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-67890",
  "patient_national_id": "2987654321",
  "service_code": "LAB-001",
  "service_desc": "Blood Test",
  "unit_price": 50.00,
  "quantity": 5,
  "encounter_date": "2026-01-14T09:00:00Z",
  "payer_id": "PAYER-002"
}' "200" "Multi-quantity lab test claim"

# Test 4.3: Emergency service
make_request '{
  "facility_id": "FAC002",
  "patient_id": "PAT-EMR-001",
  "patient_national_id": "1111111111",
  "service_code": "EMRG-001",
  "service_desc": "Emergency Room Visit",
  "claim_subtype": "emr",
  "priority": "urgent",
  "unit_price": 500.00,
  "quantity": 1,
  "encounter_date": "2026-01-14T02:00:00Z",
  "payer_id": "PAYER-001"
}' "200" "Emergency service claim"

# Test 4.4: Inpatient claim with diagnosis
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-IP-001",
  "patient_national_id": "1555555555",
  "service_code": "IP-SURGERY-001",
  "service_desc": "Appendectomy",
  "claim_type": "institutional",
  "claim_subtype": "ip",
  "unit_price": 15000.00,
  "quantity": 1,
  "encounter_date": "2026-01-13T08:00:00Z",
  "discharge_date": "2026-01-14T14:00:00Z",
  "diagnosis_codes": ["K35.8", "K35.80"],
  "diagnosis_descriptions": ["Acute appendicitis", "Unspecified acute appendicitis"],
  "payer_id": "PAYER-003"
}' "200" "Inpatient surgery with diagnosis"

# ------------------------------------------------------------------------------
# Test Category 5: Edge Cases
# ------------------------------------------------------------------------------

print_header "Category 5: Edge Cases"

# Test 5.1: Minimum valid price
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-MIN",
  "service_code": "MIN-001",
  "service_desc": "Minimum service",
  "unit_price": 0.01,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "200" "Minimum valid price (0.01 SAR)"

# Test 5.2: Maximum allowed price
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-MAX",
  "service_code": "MAX-001",
  "service_desc": "Maximum service",
  "unit_price": 999999,
  "quantity": 1,
  "encounter_date": "2026-01-14T10:00:00Z",
  "payer_id": "PAYER-001"
}' "200" "Maximum allowed price (999,999 SAR)"

# Test 5.3: Old but valid encounter date
make_request '{
  "facility_id": "FAC001",
  "patient_id": "PAT-OLD",
  "service_code": "OLD-001",
  "service_desc": "Old encounter",
  "unit_price": 100,
  "quantity": 1,
  "encounter_date": "2025-02-01T10:00:00Z",
  "payer_id": "PAYER-001"
}' "200" "Old but valid encounter (within 1 year)"

# ==============================================================================
# Test Summary
# ==============================================================================

print_header "Test Summary"

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}\n"
    exit 0
else
    success_rate=$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    echo -e "\n${YELLOW}Success Rate: ${success_rate}%${NC}\n"
    exit 1
fi
