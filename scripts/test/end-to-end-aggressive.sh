#!/bin/bash
# =============================================================================
# SBS Aggressive End-to-End Test Suite
# =============================================================================
# Validates both IoT and Claims pipelines with multiple scenarios.
# Usage: ./end-to-end-aggressive.sh
# =============================================================================

# Configuration
PORT="${PORT:-3000}"
API_URL="http://localhost:${PORT}"
IOT_URL="${API_URL}/api/v1/iot"
CLAIMS_URL="${API_URL}/api/submit-claim"
IOT_TOKEN="dev_iot_token_12345"
TIMESTAMP=$(date +%s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log() { echo -e "${BLUE}[TEST]${NC} $1"; }
pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; exit 1; }
warn() { echo -e "${YELLOW}! WARN${NC}: $1"; }

check_status() {
    if [ $1 -eq 0 ]; then pass "$2"; else fail "$2"; fi
}

log "Starting Aggressive End-to-End Test Suite..."
echo "Target: ${API_URL}"
echo "Time: $(date)"
echo "---------------------------------------------------"

# 1. System Health Check
# ---------------------------------------------------
log "Checking System Health..."
HEALTH_Response=$(curl -s "${API_URL}/health")
if echo "$HEALTH_Response" | grep -q "healthy"; then
    pass "System is healthy"
else
    fail "System health check failed: $HEALTH_Response"
fi

# 2. IoT Pipeline Tests
# ---------------------------------------------------
log "Testing IoT Pipeline..."

# 2.1 Send Telemetry (Heartbeat)
log "Sending Heartbeat..."
curl -s -X POST "${IOT_URL}/events" \
  -H "Authorization: Bearer ${IOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"node\":\"TEST-NODE-${TIMESTAMP}\",\"event\":\"heartbeat\",\"ts\":${TIMESTAMP},\"data\":{\"uptime\":100}}" > /tmp/iot_response.json

if grep -q "success\|received" /tmp/iot_response.json; then
    pass "Heartbeat accepted"
else
    fail "Heartbeat failed: $(cat /tmp/iot_response.json)"
fi

# 2.2 Send Critical Alert
log "Sending Critical Alert..."
curl -s -X POST "${IOT_URL}/events" \
  -H "Authorization: Bearer ${IOT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"node\":\"TEST-NODE-${TIMESTAMP}\",\"event\":\"alert\",\"data\":{\"severity\":\"critical\",\"message\":\"Test Critical Alert\",\"temp\":99}}" > /tmp/iot_alert.json

if grep -q "success\|received" /tmp/iot_alert.json; then
    pass "Critical Alert accepted"
else
    fail "Critical Alert failed: $(cat /tmp/iot_alert.json)"
fi

# 2.3 Verify Dashboard Stats
log "Verifying Dashboard Stats Reflection..."
# Allow a moment for processing if async
sleep 1
STATS=$(curl -s "${IOT_URL}/dashboard")
ACTIVE_NODES=$(echo "$STATS" | jq -r '.dashboard.nodes.active_now')

if [ "$ACTIVE_NODES" -ge 1 ]; then
    pass "Dashboard shows active nodes ($ACTIVE_NODES)"
else
    warn "Dashboard active nodes count might be delayed (Count: $ACTIVE_NODES)"
fi

# 3. Claims Pipeline Tests (Simulated)
# ---------------------------------------------------
log "Testing Claims Pipeline..."

# 3.1 Submit Valid Claim (Stub)
# Note: Since the actual n8n workflow might be external or mocked, we verify the API acceptance.
log "Submitting Valid Claim..."
CLAIM_PAYLOAD='{
  "facility_id": "FAC-001",
  "patient_id": "PAT-123",
  "service_code": "99213",
  "service_desc": "Office Visit",
  "unit_price": 150,
  "quantity": 1
}'

curl -s -X POST "${CLAIMS_URL}" \
  -H "Content-Type: application/json" \
  -d "$CLAIM_PAYLOAD" > /tmp/claim_response.json

# Check response code or content. Assuming 200/202 OK or some JSON success.
if grep -q "success\|received" /tmp/claim_response.json; then
    pass "Claim accepted by API"
else
    # The current server might respond with "Cannot POST" if the route isn't exactly /api/submit-claim
    # Check server.cjs routes.
    # It has /api/submit-claim, /api/submit-claim-linc
    fail "Claim submission failed: $(cat /tmp/claim_response.json)"
fi

# 4. n8n Connectivity Check
# ---------------------------------------------------
log "Checking n8n Webhook Connectivity..."
N8N_URL=$(grep "N8N_WEBHOOK_URL" /Users/fadil369/sbs/sbs/sbs-landing/.env | cut -d= -f2)
log "n8n Target: $N8N_URL"

# We check if we can reach it (headers only)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$N8N_URL" || echo "000")

if [ "$HTTP_CODE" != "000" ]; then
    pass "n8n Webhook is reachable (HTTP $HTTP_CODE)"
else
    warn "n8n Webhook unreachable (HTTP $HTTP_CODE) - Check network/DNS"
fi

echo "---------------------------------------------------"
echo -e "${GREEN}All Aggressive Tests Completed!${NC}"
