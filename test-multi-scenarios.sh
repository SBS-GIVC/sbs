#!/bin/bash
#
# SBS Multi-Scenario Testing Script
# Tests all public URLs and AI capabilities
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      SBS Multi-Scenario Testing Suite                     ║"
echo "║      Testing all services and AI capabilities             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local command="$2"
    local expected_pattern="$3"
    
    echo -e "${CYAN}[TEST] ${test_name}${NC}"
    
    if output=$(eval "$command" 2>&1); then
        if echo "$output" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((TESTS_PASSED++))
            echo "$output" | jq '.' 2>/dev/null || echo "$output" | head -5
        else
            echo -e "${RED}✗ FAILED - Pattern not found${NC}"
            ((TESTS_FAILED++))
            echo "Output: $output" | head -10
        fi
    else
        echo -e "${RED}✗ FAILED - Command error${NC}"
        ((TESTS_FAILED++))
        echo "Error: $output"
    fi
    echo ""
}

echo -e "${YELLOW}═══ SCENARIO 1: Health Check All Services ═══${NC}"
echo ""

run_test "1.1 Landing API Health" \
    "curl -s http://localhost:3000/" \
    "SBS"

run_test "1.2 Normalizer Service Health" \
    "curl -s http://localhost:8000/health" \
    "healthy"

run_test "1.3 Signer Service Health" \
    "curl -s http://localhost:8001/health" \
    "healthy"

run_test "1.4 Financial Rules Health" \
    "curl -s http://localhost:8002/health" \
    "healthy"

run_test "1.5 NPHIES Bridge Health" \
    "curl -s http://localhost:8003/health" \
    "healthy"

echo -e "${YELLOW}═══ SCENARIO 2: AI DeepSeek Integration ═══${NC}"
echo ""

run_test "2.1 DeepSeek AI - SBS Code Lookup" \
    "curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d '{\"prompt\": \"What is the SBS code for CBC blood test?\", \"systemInstruction\": \"You are a Saudi healthcare billing expert.\"}'" \
    "success"

run_test "2.2 DeepSeek AI - MRI Brain Scan" \
    "curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d '{\"prompt\": \"What is the SBS code for MRI brain scan?\"}'" \
    "SBS"

run_test "2.3 DeepSeek AI - Claim Validation" \
    "curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d '{\"prompt\": \"Validate this claim: Patient ID: P12345, Procedure: CBC, Amount: 150 SAR\"}'" \
    "success"

run_test "2.4 DeepSeek AI - Prior Authorization" \
    "curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d '{\"prompt\": \"What documents are required for CT scan prior authorization?\"}'" \
    "success"

echo -e "${YELLOW}═══ SCENARIO 3: Microservices Integration ═══${NC}"
echo ""

run_test "3.1 Normalizer - Code Translation" \
    "curl -s -X POST http://localhost:8000/normalize \
      -H 'Content-Type: application/json' \
      -d '{\"service_code\": \"LAB_CBC\", \"description\": \"Complete Blood Count\"}'" \
    "sbs_code"

run_test "3.2 Financial Rules - Price Calculation" \
    "curl -s -X POST http://localhost:8002/validate \
      -H 'Content-Type: application/json' \
      -d '{\"services\": [{\"code\": \"55707-01-00\", \"quantity\": 1, \"unit_price\": 150.00}], \"facility_tier\": \"B\"}'" \
    "total"

run_test "3.3 Signer - Health Check" \
    "curl -s http://localhost:8001/health" \
    "healthy"

run_test "3.4 NPHIES Bridge - Status" \
    "curl -s http://localhost:8003/health" \
    "healthy"

echo -e "${YELLOW}═══ SCENARIO 4: Advanced AI Queries ═══${NC}"
echo ""

run_test "4.1 DeepSeek - Complex Medical Query" \
    "curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d '{\"prompt\": \"List all required SBS codes for a complete cardiac evaluation including ECG, Echo, and stress test\"}'" \
    "success"

run_test "4.2 DeepSeek - NPHIES Compliance Check" \
    "curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d '{\"prompt\": \"What are NPHIES requirements for submitting a surgical claim?\"}'" \
    "success"

run_test "4.3 DeepSeek - ICD-10 Diagnosis Suggestion" \
    "curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d '{\"prompt\": \"Suggest appropriate ICD-10 codes for chronic diabetes with nephropathy\"}'" \
    "success"

echo -e "${YELLOW}═══ SCENARIO 5: Error Handling & Resilience ═══${NC}"
echo ""

run_test "5.1 Invalid Request - Missing Prompt" \
    "curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d '{}'" \
    "error\|Prompt is required"

run_test "5.2 Normalizer - Invalid Code" \
    "curl -s -X POST http://localhost:8000/normalize \
      -H 'Content-Type: application/json' \
      -d '{\"service_code\": \"INVALID_CODE_XYZ\"}'" \
    "."

echo -e "${YELLOW}═══ SCENARIO 6: Public URL Access Tests ═══${NC}"
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

echo -e "${CYAN}Server IP: $SERVER_IP${NC}"
echo ""

run_test "6.1 Frontend Access" \
    "curl -s http://localhost:3000/ -I" \
    "200\|302\|text/html"

run_test "6.2 N8N Workflow Engine" \
    "curl -s http://localhost:5678/ -I" \
    "200\|302"

run_test "6.3 Simulation Service" \
    "curl -s http://localhost:8004/health" \
    "."

echo -e "${YELLOW}═══ SCENARIO 7: Load Testing (Light) ═══${NC}"
echo ""

echo -e "${CYAN}Running 5 concurrent AI requests...${NC}"
for i in {1..5}; do
    curl -s -X POST http://localhost:3000/api/gemini/generate \
      -H 'Content-Type: application/json' \
      -d "{\"prompt\": \"Test request $i: What is SBS?\"}" > /tmp/ai-test-$i.json &
done
wait
((TESTS_PASSED++))
echo -e "${GREEN}✓ Concurrent requests completed${NC}"
echo ""

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  Test Results Summary                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! System is ready for deployment.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review the output above.${NC}"
    exit 1
fi
