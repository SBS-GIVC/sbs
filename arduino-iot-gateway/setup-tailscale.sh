#!/bin/bash
# =============================================================================
# Arduino IoT Gateway - Tailscale Network Deployment Script
# =============================================================================
# This script sets up the IoT gateway on any machine in the Tailscale network
# to connect to the SBS API server.
#
# Tailscale Network Devices:
#   - fadil369s-macbook-pro (100.111.194.65) - Development Mac
#   - brainsait-pi (100.121.102.61) - Raspberry Pi (IoT Gateway)
#   - brainsait (100.122.153.63) - Linux VPS
#   - srv791040 (100.72.121.28) - Hostinger Production VPS
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GATEWAY_DIR="${HOME}/sbs/arduino-iot-gateway"
ENV_FILE="${GATEWAY_DIR}/config/.env"

# Tailscale network IPs
TS_MAC="100.111.194.65"
TS_PI="100.121.102.61"
TS_VPS_BRAINSAIT="100.122.153.63"
TS_VPS_HOSTINGER="100.72.121.28"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Arduino IoT Gateway - Tailscale Network Setup                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect current machine
CURRENT_IP=$(tailscale ip -4 2>/dev/null || echo "unknown")
echo -e "${BLUE}Current Tailscale IP:${NC} ${CURRENT_IP}"

case "${CURRENT_IP}" in
    "${TS_MAC}")
        MACHINE_NAME="fadil369s-macbook-pro (Dev Mac)"
        DEFAULT_SERIAL="/dev/cu.usbmodem*"
        ;;
    "${TS_PI}")
        MACHINE_NAME="brainsait-pi (Raspberry Pi)"
        DEFAULT_SERIAL="/dev/ttyACM0"
        ;;
    "${TS_VPS_BRAINSAIT}")
        MACHINE_NAME="brainsait (Linux VPS)"
        DEFAULT_SERIAL="/dev/ttyUSB0"
        ;;
    "${TS_VPS_HOSTINGER}")
        MACHINE_NAME="srv791040 (Hostinger VPS)"
        DEFAULT_SERIAL="/dev/ttyUSB0"
        ;;
    *)
        MACHINE_NAME="Unknown Device"
        DEFAULT_SERIAL="/dev/ttyUSB0"
        ;;
esac

echo -e "${BLUE}Machine:${NC} ${MACHINE_NAME}"
echo ""

# Select API target
echo -e "${YELLOW}Select API Target:${NC}"
echo "  1) Production (sbs.brainsait.cloud - HTTPS)"
echo "  2) Local Dev Mac via Tailscale (${TS_MAC}:3000)"
echo "  3) Raspberry Pi via Tailscale (${TS_PI}:3000)"
echo "  4) Brainsait VPS via Tailscale (${TS_VPS_BRAINSAIT}:3000)"
echo "  5) Hostinger VPS via Tailscale (${TS_VPS_HOSTINGER}:3000)"
echo "  6) n8n Workflow (https://n8n.brainsait.cloud)"
echo "  7) Custom URL"
echo ""
read -p "Select target [1-7, default=1]: " TARGET_CHOICE

case "${TARGET_CHOICE}" in
    2)
        API_URL="http://${TS_MAC}:3005/api/v1/iot/events"
        API_NAME="Dev Mac (Tailscale)"
        ;;
    3)
        API_URL="http://${TS_PI}:3000/api/v1/iot/events"
        API_NAME="Raspberry Pi (Tailscale)"
        ;;
    4)
        API_URL="http://${TS_VPS_BRAINSAIT}:3000/api/v1/iot/events"
        API_NAME="Brainsait VPS (Tailscale)"
        ;;
    5)
        API_URL="http://${TS_VPS_HOSTINGER}:3000/api/v1/iot/events"
        API_NAME="Hostinger VPS (Tailscale)"
        ;;
    6)
        API_URL="https://n8n.brainsait.cloud/webhook/iot-events"
        API_NAME="n8n Workflow (Live)"
        ;;
    7)
        read -p "Enter custom API URL: " API_URL
        API_NAME="Custom"
        ;;
    *)
        API_URL="https://sbs.brainsait.cloud/api/v1/iot/events"
        API_NAME="Production (HTTPS)"
        ;;
esac

echo ""
echo -e "${GREEN}Target API:${NC} ${API_NAME}"
echo -e "${GREEN}URL:${NC} ${API_URL}"
echo ""

# Serial port selection
echo -e "${YELLOW}Available Serial Ports:${NC}"
if [[ "$(uname)" == "Darwin" ]]; then
    ls /dev/cu.usb* /dev/tty.usb* 2>/dev/null || echo "No USB serial devices found"
else
    ls /dev/ttyACM* /dev/ttyUSB* 2>/dev/null || echo "No USB serial devices found"
fi
echo ""

read -p "Enter serial port [default: ${DEFAULT_SERIAL}]: " SERIAL_PORT
SERIAL_PORT="${SERIAL_PORT:-${DEFAULT_SERIAL}}"

# Device token
read -p "Enter IoT device token [default: dev_iot_token_12345]: " IOT_TOKEN
IOT_TOKEN="${IOT_TOKEN:-dev_iot_token_12345}"

# Node ID
DEFAULT_NODE_ID="BS-EDGE-$(hostname | tr '[:lower:]' '[:upper:]' | cut -c1-3)"
read -p "Enter Node ID [default: ${DEFAULT_NODE_ID}]: " NODE_ID
NODE_ID="${NODE_ID:-${DEFAULT_NODE_ID}}"

echo ""
echo -e "${YELLOW}Configuration Summary:${NC}"
echo "  Serial Port: ${SERIAL_PORT}"
echo "  API URL: ${API_URL}"
echo "  Node ID: ${NODE_ID}"
echo ""
read -p "Proceed with setup? [Y/n]: " CONFIRM
if [[ "${CONFIRM}" =~ ^[Nn] ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Create gateway directory if needed
mkdir -p "${GATEWAY_DIR}/src" "${GATEWAY_DIR}/config" "${GATEWAY_DIR}/logs"

# Write .env file
cat > "${ENV_FILE}" << EOF
# Arduino IoT Gateway Configuration
# Generated: $(date)
# Machine: ${MACHINE_NAME}
# Tailscale IP: ${CURRENT_IP}

# Serial Connection
SERIAL_PORT=${SERIAL_PORT}
BAUD_RATE=115200

# API Configuration
API_URL=${API_URL}
API_TOKEN=${IOT_TOKEN}

# Device Identity
NODE_ID=${NODE_ID}

# Logging
LOG_LEVEL=INFO
LOG_DIR=${GATEWAY_DIR}/logs

# n8n Webhook (alternative)
# N8N_WEBHOOK_URL=https://n8n.srv791040.hstgr.cloud/webhook/iot-events
EOF

echo -e "${GREEN}✅ Configuration saved to ${ENV_FILE}${NC}"

# Install Python dependencies
echo ""
echo -e "${YELLOW}Installing Python dependencies...${NC}"
cd "${GATEWAY_DIR}"

# Create requirements.txt if not exists
if [[ ! -f "requirements.txt" ]]; then
    cat > requirements.txt << EOF
pyserial>=3.5
requests>=2.28.0
python-dotenv>=1.0.0
EOF
fi

# Install dependencies
pip3 install -r requirements.txt --quiet 2>/dev/null || pip install -r requirements.txt --quiet

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Test API connectivity
echo ""
echo -e "${YELLOW}Testing API connectivity...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "${API_URL%/events}/health" | grep -q "200"; then
    echo -e "${GREEN}✅ API is reachable${NC}"
else
    echo -e "${YELLOW}⚠️  API health check returned non-200 (may still work)${NC}"
fi

# Create systemd service (Linux) or launchd (macOS)
echo ""
if [[ "$(uname)" == "Darwin" ]]; then
    echo -e "${YELLOW}Creating macOS Launch Agent...${NC}"
    PLIST_FILE="${HOME}/Library/LaunchAgents/com.brainsait.iot-gateway.plist"
    
    cat > "${PLIST_FILE}" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.brainsait.iot-gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>${GATEWAY_DIR}/src/serial_gateway.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${GATEWAY_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>${GATEWAY_DIR}/logs/gateway.log</string>
    <key>StandardErrorPath</key>
    <string>${GATEWAY_DIR}/logs/gateway.error.log</string>
</dict>
</plist>
EOF

    echo -e "${GREEN}✅ Launch Agent created: ${PLIST_FILE}${NC}"
    echo ""
    echo "To start the gateway:"
    echo "  launchctl load ${PLIST_FILE}"
    echo "  launchctl start com.brainsait.iot-gateway"
    echo ""
    echo "To stop:"
    echo "  launchctl stop com.brainsait.iot-gateway"
    echo "  launchctl unload ${PLIST_FILE}"
    
else
    echo -e "${YELLOW}Creating systemd service...${NC}"
    SERVICE_FILE="/tmp/iot-gateway.service"
    
    cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=BrainSAIT IoT Gateway
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${GATEWAY_DIR}
ExecStart=/usr/bin/python3 ${GATEWAY_DIR}/src/serial_gateway.py
Restart=always
RestartSec=10
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}✅ Service file created: ${SERVICE_FILE}${NC}"
    echo ""
    echo "To install and start the service (requires sudo):"
    echo "  sudo cp ${SERVICE_FILE} /etc/systemd/system/iot-gateway.service"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable iot-gateway"
    echo "  sudo systemctl start iot-gateway"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                      Setup Complete! 🎉                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Quick start (manual run):"
echo "  cd ${GATEWAY_DIR}"
echo "  python3 src/serial_gateway.py"
echo ""
echo "Monitor logs:"
echo "  tail -f ${GATEWAY_DIR}/logs/gateway.log"
echo ""
