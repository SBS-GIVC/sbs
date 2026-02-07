#!/bin/bash
#
# Add GitHub Repository Secrets using GitHub API
# Repository: Fadil369/sbs
# This script adds environment variables as encrypted secrets
#

set -e

REPO_OWNER="Fadil369"
REPO_NAME="sbs"
API_BASE="https://api.github.com"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   GitHub Repository Secrets Configuration        ║${NC}"
echo -e "${BLUE}║   Repository: ${REPO_OWNER}/${REPO_NAME}                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Check if gh is authenticated
if ! gh auth status > /dev/null 2>&1; then
    echo -e "${YELLOW}GitHub CLI not authenticated. Authenticating...${NC}"
    echo ""
    echo "Please follow the authentication prompts:"
    gh auth login -h github.com -p ssh -w
    echo ""
fi

echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"
echo ""

# Function to add a secret
add_secret() {
    local secret_name="$1"
    local secret_value="$2"
    
    echo -e "${YELLOW}Adding secret: ${secret_name}${NC}"
    
    # Add secret using gh CLI
    if echo "$secret_value" | gh secret set "$secret_name" --repo="${REPO_OWNER}/${REPO_NAME}" 2>&1; then
        echo -e "${GREEN}  ✓ ${secret_name} added successfully${NC}"
    else
        echo -e "${RED}  ✗ Failed to add ${secret_name}${NC}"
    fi
}

# Read from .env file
ENV_FILE="/root/sbs-github/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}✗ .env file not found at $ENV_FILE${NC}"
    exit 1
fi

echo -e "${BLUE}Reading configuration from .env file...${NC}"
echo ""

# Source the .env file
source "$ENV_FILE"

# Add critical production secrets
echo -e "${YELLOW}[1/9] Adding DeepSeek AI Configuration...${NC}"
add_secret "DEEPSEEK_API_KEY" "$DEEPSEEK_API_KEY"
add_secret "DEEPSEEK_MODEL" "$DEEPSEEK_MODEL"
echo ""

echo -e "${YELLOW}[2/9] Adding Database Configuration...${NC}"
add_secret "DB_NAME" "$DB_NAME"
add_secret "DB_USER" "$DB_USER"
add_secret "DB_PASSWORD" "$DB_PASSWORD"
echo ""

echo -e "${YELLOW}[3/9] Adding N8N Configuration...${NC}"
add_secret "N8N_USER" "$N8N_USER"
add_secret "N8N_PASSWORD" "$N8N_PASSWORD"
add_secret "N8N_ENCRYPTION_KEY" "$N8N_ENCRYPTION_KEY"
echo ""

echo -e "${YELLOW}[4/9] Adding Domain Configuration...${NC}"
add_secret "ALLOWED_ORIGINS" "$ALLOWED_ORIGINS"
add_secret "NODE_ENV" "$NODE_ENV"
echo ""

echo -e "${YELLOW}[5/9] Adding NPHIES Configuration...${NC}"
add_secret "NPHIES_ENV" "$NPHIES_ENV"
add_secret "NPHIES_BASE_URL" "$NPHIES_BASE_URL"
if [ ! -z "$NPHIES_API_KEY" ] && [ "$NPHIES_API_KEY" != "REPLACE_WITH_YOUR_NPHIES_API_KEY" ]; then
    add_secret "NPHIES_API_KEY" "$NPHIES_API_KEY"
else
    echo -e "${YELLOW}  ⚠ NPHIES_API_KEY not configured - skipping${NC}"
fi
echo ""

echo -e "${YELLOW}[6/9] Adding Gemini AI (Legacy)...${NC}"
if [ ! -z "$GEMINI_API_KEY" ]; then
    add_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
    add_secret "GEMINI_MODEL" "$GEMINI_MODEL"
else
    echo -e "${YELLOW}  ⚠ GEMINI_API_KEY not configured - skipping${NC}"
fi
echo ""

echo -e "${YELLOW}[7/9] Adding Security Configuration...${NC}"
add_secret "ENABLE_DIRECT_SBS" "$ENABLE_DIRECT_SBS"
echo ""

echo -e "${YELLOW}[8/9] Adding PgAdmin Configuration...${NC}"
if [ ! -z "$PGADMIN_PASSWORD" ]; then
    add_secret "PGADMIN_EMAIL" "$PGADMIN_EMAIL"
    add_secret "PGADMIN_PASSWORD" "$PGADMIN_PASSWORD"
else
    echo -e "${YELLOW}  ⚠ PGADMIN credentials not configured - skipping${NC}"
fi
echo ""

echo -e "${YELLOW}[9/9] Adding Certificate Configuration...${NC}"
if [ ! -z "$CERT_PASSWORD" ]; then
    add_secret "CERT_PASSWORD" "$CERT_PASSWORD"
else
    echo -e "${YELLOW}  ⚠ CERT_PASSWORD not set - skipping${NC}"
fi
echo ""

# Display summary
echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Secrets Configuration Summary         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Secrets have been added to GitHub repository${NC}"
echo ""
echo "View secrets at: https://github.com/${REPO_OWNER}/${REPO_NAME}/settings/secrets/actions"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Verify secrets in GitHub repository settings"
echo "  2. Update GitHub Actions workflows to use these secrets"
echo "  3. Configure GitHub Actions deployment workflows"
echo "  4. Test CI/CD pipeline"
echo ""
echo -e "${BLUE}Secrets are encrypted and only accessible to GitHub Actions${NC}"
echo ""
