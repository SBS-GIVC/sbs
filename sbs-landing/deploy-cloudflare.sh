#!/bin/bash
# Cloudflare Deployment Script for SBS App
# Domain: brainsait.cloud

set -e

echo "🚀 Starting Cloudflare Deployment for SBS App"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="brainsait.cloud"
API_SUBDOMAIN="api.${DOMAIN}"
N8N_SUBDOMAIN="n8n.${DOMAIN}"
PROJECT_DIR="/root/sbs-source/sbs-landing"

cd "$PROJECT_DIR"

echo -e "\n${BLUE}Step 1: Checking Prerequisites${NC}"
echo "--------------------------------"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}Installing Cloudflare Wrangler CLI...${NC}"
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Cloudflare:${NC}"
    wrangler login
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

echo -e "\n${BLUE}Step 2: Building Frontend${NC}"
echo "--------------------------------"
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"

echo -e "\n${BLUE}Step 3: Deploying to Cloudflare Pages${NC}"
echo "--------------------------------"
# Deploy frontend to Cloudflare Pages
wrangler pages deploy dist \
  --project-name=sbs-landing-frontend \
  --branch=main \
  --commit-message="Deploy SBS Landing - $(date '+%Y-%m-%d %H:%M:%S')"

echo -e "${GREEN}✓ Frontend deployed to Cloudflare Pages${NC}"

echo -e "\n${BLUE}Step 4: Setting up Custom Domain${NC}"
echo "--------------------------------"
echo -e "${YELLOW}Manual step required:${NC}"
echo "1. Go to Cloudflare Dashboard > Pages > sbs-landing-frontend > Custom domains"
echo "2. Add custom domain: ${DOMAIN}"
echo "3. Add custom domain: www.${DOMAIN}"
echo "4. Cloudflare will automatically provision SSL certificates"
echo ""
echo "DNS Records to configure:"
echo "  - CNAME ${DOMAIN} -> sbs-landing-frontend.pages.dev"
echo "  - CNAME www -> sbs-landing-frontend.pages.dev"
echo ""
read -p "Press Enter once DNS is configured..."

echo -e "\n${BLUE}Step 5: Deploying API Worker${NC}"
echo "--------------------------------"
# Deploy API worker
wrangler deploy --config wrangler.toml --env production

echo -e "${GREEN}✓ API Worker deployed${NC}"

echo -e "\n${BLUE}Step 6: Setting up API Domain${NC}"
echo "--------------------------------"
echo "Configure DNS for API:"
echo "  - CNAME ${API_SUBDOMAIN} -> sbs-api-worker.workers.dev"

echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo "============================================="
echo -e "${BLUE}Access your app at:${NC}"
echo "  Frontend: https://${DOMAIN}"
echo "  API:      https://${API_SUBDOMAIN}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure DNS records in Cloudflare"
echo "2. Verify SSL certificates are active"
echo "3. Test all endpoints"
echo "4. Set up monitoring and analytics"
echo ""
echo -e "${BLUE}Cloudflare Dashboard:${NC} https://dash.cloudflare.com"
