#!/bin/bash
#
# SBS Production Deployment Script for sbs.brainsait.cloud
# Author: BrainSAIT DevOps
# Date: 2026-01-31
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   SBS Production Deployment - sbs.brainsait.cloud       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
DOMAIN="sbs.brainsait.cloud"
PROJECT_DIR="/root/sbs-github"
ENV_FILE="$PROJECT_DIR/.env"
COMPOSE_FILE="docker-compose.yml"

# Step 1: Verify prerequisites
echo -e "${YELLOW}[1/8] Verifying prerequisites...${NC}"
cd $PROJECT_DIR || exit 1

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}✗ .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env with production values before continuing${NC}"
    exit 1
fi

# Check required environment variables
required_vars=("DB_PASSWORD" "DEEPSEEK_API_KEY" "N8N_PASSWORD" "N8N_ENCRYPTION_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=.\\+" "$ENV_FILE"; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo -e "${RED}✗ Missing required environment variables:${NC}"
    printf '  %s\n' "${missing_vars[@]}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites verified${NC}"

# Step 2: Update ALLOWED_ORIGINS with production domain
echo -e "${YELLOW}[2/8] Configuring production domain...${NC}"
sed -i "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://${DOMAIN}|" "$ENV_FILE"
sed -i "s|NODE_ENV=.*|NODE_ENV=production|" "$ENV_FILE"
echo -e "${GREEN}✓ Domain configured: $DOMAIN${NC}"

# Step 3: Pull latest code
echo -e "${YELLOW}[3/8] Pulling latest code from GitHub...${NC}"
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"

# Step 4: Build Docker images
echo -e "${YELLOW}[4/8] Building Docker images...${NC}"
docker compose build --no-cache
echo -e "${GREEN}✓ Images built${NC}"

# Step 5: Stop existing containers (if any)
echo -e "${YELLOW}[5/8] Stopping existing containers...${NC}"
docker compose down || true
echo -e "${GREEN}✓ Old containers stopped${NC}"

# Step 6: Start production deployment
echo -e "${YELLOW}[6/8] Starting production deployment...${NC}"
docker compose up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Step 7: Wait for services to be healthy
echo -e "${YELLOW}[7/8] Waiting for services to be healthy (60s)...${NC}"
sleep 10

# Check service health
services=("postgres" "normalizer" "financial-rules" "signer" "nphies-bridge" "landing" "n8n")
all_healthy=true

for service in "${services[@]}"; do
    container="sbs-${service}"
    if docker ps --filter "name=${container}" --filter "health=healthy" | grep -q "${container}"; then
        echo -e "${GREEN}  ✓ ${container} is healthy${NC}"
    else
        status=$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "unknown")
        echo -e "${YELLOW}  ⚠ ${container} status: ${status}${NC}"
        all_healthy=false
    fi
done

# Step 8: Display deployment status
echo -e "${YELLOW}[8/8] Deployment Status${NC}"
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Deployment Summary                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Domain:        https://${DOMAIN}"
echo -e "  Frontend:      https://${DOMAIN}"
echo -e "  API Gateway:   https://${DOMAIN}/api"
echo -e "  AI Copilot:    https://${DOMAIN}/ai-hub"
echo -e "  n8n Workflow:  http://localhost:5678"
echo ""
echo -e "${BLUE}Services Status:${NC}"
docker compose ps
echo ""

# Display next steps
echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 Next Steps                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  1. Configure DNS: Point ${DOMAIN} to this server IP"
echo -e "  2. Setup SSL: Install Let's Encrypt certificate"
echo -e "  3. Configure reverse proxy (Nginx/Traefik)"
echo -e "  4. Test API endpoints: curl https://${DOMAIN}/api/health"
echo -e "  5. Import n8n workflows: http://localhost:5678"
echo -e "  6. Test claim submission workflow"
echo ""

if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}✓ All services are healthy!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some services need attention. Check logs:${NC}"
    echo -e "  docker compose logs -f <service-name>"
    exit 0
fi
