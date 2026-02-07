#!/bin/bash
# =============================================================================
# n8n IoT Workflow Deployment Script
# =============================================================================
# Deploys the IoT Event Processing workflow to n8n via CLI or API
# Target: https://n8n.srv791040.hstgr.cloud (Hostinger VPS)
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
N8N_HOST="${N8N_HOST:-https://n8n.brainsait.cloud}"
WORKFLOW_FILE="${1:-$(dirname "$0")/iot-event-processing.json}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║             n8n IoT Workflow Deployment                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if workflow file exists
if [[ ! -f "${WORKFLOW_FILE}" ]]; then
    echo -e "${RED}Error: Workflow file not found: ${WORKFLOW_FILE}${NC}"
    exit 1
fi

echo -e "${BLUE}n8n Host:${NC} ${N8N_HOST}"
echo -e "${BLUE}Workflow:${NC} ${WORKFLOW_FILE}"
echo ""

# Check for n8n CLI
if command -v n8n &> /dev/null; then
    echo -e "${YELLOW}n8n CLI detected. Importing workflow...${NC}"
    n8n import:workflow --input="${WORKFLOW_FILE}"
    echo -e "${GREEN}✅ Workflow imported via CLI${NC}"
else
    echo -e "${YELLOW}n8n CLI not found. Please import manually:${NC}"
    echo ""
    echo "1. Open n8n: ${N8N_HOST}"
    echo "2. Go to: Workflows → Add Workflow → Import from file"
    echo "3. Upload: ${WORKFLOW_FILE}"
    echo "4. Configure credentials:"
    echo "   - PostgreSQL: sbs-postgres-cred"
    echo "   - SMTP (optional): sbs-smtp-cred"
    echo "5. Activate the workflow"
    echo ""
fi

# Generate credential configuration
echo -e "${YELLOW}PostgreSQL Credential Configuration:${NC}"
cat << 'EOF'
{
  "name": "SBS PostgreSQL",
  "type": "postgres",
  "credentials": {
    "host": "localhost",
    "port": 5432,
    "database": "sbs_production",
    "user": "sbs_user",
    "password": "<from environment>",
    "ssl": false
  }
}
EOF

echo ""
echo -e "${YELLOW}Environment Variables to Set in n8n:${NC}"
echo "  NOTIFICATION_WEBHOOK_URL - Slack/Teams webhook for alerts"
echo "  ALERT_EMAIL - Email for critical alerts"
echo ""

# Test webhook endpoint
echo -e "${YELLOW}Testing webhook endpoint...${NC}"
WEBHOOK_URL="${N8N_HOST}/webhook/iot-events"

# Send test event
TEST_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"node":"TEST-DEPLOY","event":"status","data":{"message":"Deployment test"}}' \
    "${WEBHOOK_URL}" 2>/dev/null || echo "000")

if [[ "${TEST_RESULT}" == "200" || "${TEST_RESULT}" == "201" ]]; then
    echo -e "${GREEN}✅ Webhook endpoint is active: ${WEBHOOK_URL}${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook returned ${TEST_RESULT} (workflow may need activation)${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  Deployment Guide Complete                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Workflow Endpoints (after activation):"
echo "  Webhook: POST ${WEBHOOK_URL}"
echo ""
echo "Test with:"
cat << 'EOF'
curl -X POST https://n8n.srv791040.hstgr.cloud/webhook/iot-events \
  -H "Content-Type: application/json" \
  -d '{
    "node": "BS-EDGE-001",
    "event": "telemetry",
    "ts": 1707273645000,
    "data": { "temperature": 25.5, "humidity": 60 }
  }'
EOF
echo ""
