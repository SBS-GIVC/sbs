#!/bin/bash

###############################################################################
# Production Health Check Script
# Validates all microservices and endpoints
###############################################################################

set -e

echo "🏥 Production Health Check - SBS Integration Engine"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

# Test function
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    
    echo -n "Testing $name... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1 || echo "000")
    
    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $response, expected $expected_code)"
        FAILED=$((FAILED + 1))
    fi
}

echo "📍 Testing Local Endpoints (Docker Internal)"
echo "---------------------------------------------"
test_endpoint "Normalizer Service" "http://localhost:8000/health"
test_endpoint "Signer Service" "http://localhost:8001/health"
test_endpoint "Financial Rules" "http://localhost:8002/health"
test_endpoint "NPHIES Bridge" "http://localhost:8003/health"
test_endpoint "Landing Page" "http://localhost:3000/"

echo ""
echo "🌐 Testing Production Endpoints"
echo "---------------------------------------------"
test_endpoint "Production Landing" "https://brainsait.cloud/"
test_endpoint "Production Health" "https://brainsait.cloud/health"

echo ""
echo "🐳 Docker Container Status"
echo "---------------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "sbs|STATUS"

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED check(s) failed${NC}"
    exit 1
fi
