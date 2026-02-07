#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "================================================================================"
echo "                    SBS N8N WORKFLOW - STATUS DASHBOARD"
echo "================================================================================"
echo ""

# Check webhook
echo -e "${CYAN}🌐 WEBHOOK STATUS${NC}"
echo "--------------------------------------------------------------------------------"
WEBHOOK_URL="https://n8n.brainsait.cloud/webhook/sbs-claim-submission"
echo "Production URL: $WEBHOOK_URL"
WEBHOOK_TEST=$(curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{"test":"ping"}' 2>&1)
if echo "$WEBHOOK_TEST" | grep -q "ERROR\|Connection refused"; then
    echo -e "Status: ${RED}✗ OFFLINE${NC}"
else
    echo -e "Status: ${GREEN}✓ ONLINE${NC}"
    echo "Response: ${WEBHOOK_TEST:0:80}..."
fi
echo ""

# Check backend services
echo -e "${CYAN}🔧 BACKEND SERVICES${NC}"
echo "--------------------------------------------------------------------------------"

check_service() {
    local name=$1
    local port=$2
    local url="http://localhost:$port/health"
    
    if curl -s "$url" 2>/dev/null | grep -q "healthy\|ok\|OK"; then
        echo -e "${name} (${port}): ${GREEN}✓ HEALTHY${NC}"
        return 0
    else
        echo -e "${name} (${port}): ${RED}✗ DOWN${NC}"
        return 1
    fi
}

SERVICES_UP=0

if check_service "Normalizer Service      " "8000"; then ((SERVICES_UP++)); fi
if check_service "Signer Service          " "8001"; then ((SERVICES_UP++)); fi
if check_service "Financial Rules Engine  " "8002"; then ((SERVICES_UP++)); fi
if check_service "NPHIES Bridge           " "8003"; then ((SERVICES_UP++)); fi

# Check database
if pg_isready -h localhost -p 5432 -U postgres 2>/dev/null | grep -q "accepting"; then
    echo -e "PostgreSQL Database (5432): ${GREEN}✓ HEALTHY${NC}"
    ((SERVICES_UP++))
else
    if netstat -tlnp 2>/dev/null | grep -q ":5432"; then
        echo -e "PostgreSQL Database (5432): ${YELLOW}⚠ LISTENING${NC}"
        ((SERVICES_UP++))
    else
        echo -e "PostgreSQL Database (5432): ${RED}✗ DOWN${NC}"
    fi
fi

echo ""
echo "Services Running: $SERVICES_UP / 5"
echo ""

# Check latest test results
echo -e "${CYAN}📊 LATEST TEST RESULTS${NC}"
echo "--------------------------------------------------------------------------------"

LATEST_REPORT=$(ls -t sbs_test_report_*.json 2>/dev/null | head -1)

if [ -n "$LATEST_REPORT" ]; then
    REPORT_DATE=$(echo "$LATEST_REPORT" | grep -oP '\d{8}_\d{6}')
    TOTAL=$(cat "$LATEST_REPORT" | jq -r '.test_run.total_tests' 2>/dev/null)
    PASSED=$(cat "$LATEST_REPORT" | jq -r '.test_run.passed' 2>/dev/null)
    FAILED=$(cat "$LATEST_REPORT" | jq -r '.test_run.failed' 2>/dev/null)
    SUCCESS_RATE=$(cat "$LATEST_REPORT" | jq -r '.test_run.success_rate' 2>/dev/null)
    
    echo "Report: $LATEST_REPORT"
    echo "Date: $REPORT_DATE"
    echo "Total Tests: $TOTAL"
    echo -e "Passed: ${GREEN}$PASSED${NC}"
    echo -e "Failed: ${RED}$FAILED${NC}"
    echo "Success Rate: $SUCCESS_RATE"
else
    echo -e "${YELLOW}No test reports found yet${NC}"
    echo "Run: ./test_and_deploy_sbs.sh"
fi

echo ""

# Production readiness
echo -e "${CYAN}🎯 PRODUCTION READINESS${NC}"
echo "--------------------------------------------------------------------------------"

READY="yes"
ISSUES=()

if [ "$SERVICES_UP" -lt 5 ]; then
    READY="no"
    ISSUES+=("Backend services not all running ($SERVICES_UP/5)")
fi

if [ -n "$LATEST_REPORT" ]; then
    SUCCESS_NUM=$(echo "$SUCCESS_RATE" | sed 's/%//' 2>/dev/null)
    if [ -n "$SUCCESS_NUM" ] && (( $(echo "$SUCCESS_NUM < 95" | bc -l 2>/dev/null || echo 0) )); then
        READY="no"
        ISSUES+=("Test success rate below 95% ($SUCCESS_RATE)")
    fi
fi

if echo "$WEBHOOK_TEST" | grep -q "ERROR\|Connection refused"; then
    READY="no"
    ISSUES+=("Webhook not responding")
fi

if [ "$READY" = "yes" ]; then
    echo -e "${GREEN}✅ SYSTEM IS READY FOR PRODUCTION!${NC}"
    echo ""
    echo "Production webhook URL:"
    echo "  $WEBHOOK_URL"
else
    echo -e "${YELLOW}⚠️  SYSTEM NOT READY FOR PRODUCTION${NC}"
    echo ""
    echo "Issues to resolve:"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    echo ""
    echo "Next steps:"
    if [ "$SERVICES_UP" -lt 5 ]; then
        echo "  1. Start backend services: docker-compose -f docker-compose.services.yml up -d"
    fi
    if [ -z "$LATEST_REPORT" ]; then
        echo "  2. Run test suite: ./test_and_deploy_sbs.sh"
    fi
fi

echo ""
echo "================================================================================"
echo ""
echo "Quick Commands:"
echo "  Start services:    docker-compose -f docker-compose.services.yml up -d"
echo "  Stop services:     docker-compose -f docker-compose.services.yml down"
echo "  View logs:         docker-compose -f docker-compose.services.yml logs -f"
echo "  Run full tests:    ./test_and_deploy_sbs.sh"
echo "  Quick test:        ./quick_test_single_claim.sh"
echo "  Check status:      ./check_sbs_status.sh"
echo ""
