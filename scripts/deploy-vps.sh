#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# SBS VPS Deployment Script
# ============================================================================
# This script deploys the SBS Integration Engine to a VPS server
# Usage: ./scripts/deploy-vps.sh [environment]
#   environment: staging | production (default: staging)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY_DIR="${REPO_ROOT}/deploy/vps"

# Default values
ENVIRONMENT="${1:-staging}"
DEPLOY_PATH="/opt/sbs"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.vps.yml"
PROFILE="${CLOUDFLARE_PROFILE:-cloudflare}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose V2 is not installed. Please install Docker Compose V2."
        exit 1
    fi
}

check_env_file() {
    if [[ ! -f "${DEPLOY_DIR}/.env" ]]; then
        log_error "Environment file not found: ${DEPLOY_DIR}/.env"
        log_info "Please copy .env.vps.example to .env and configure it:"
        log_info "  cp ${DEPLOY_DIR}/.env.vps.example ${DEPLOY_DIR}/.env"
        log_info "  nano ${DEPLOY_DIR}/.env"
        exit 1
    fi
}

validate_deployment() {
    log_info "Validating deployment configuration..."
    
    # Check if required directories exist
    if [[ ! -d "${DEPLOY_DIR}" ]]; then
        log_error "Deployment directory not found: ${DEPLOY_DIR}"
        exit 1
    fi
    
    # Check if compose file exists
    if [[ ! -f "${COMPOSE_FILE}" ]]; then
        log_error "Docker Compose file not found: ${COMPOSE_FILE}"
        exit 1
    fi
    
    # Validate compose file syntax
    if ! docker compose -f "${COMPOSE_FILE}" config > /dev/null 2>&1; then
        log_error "Invalid Docker Compose configuration"
        exit 1
    fi
    
    log_success "Deployment configuration is valid"
}

create_required_directories() {
    log_info "Creating required directories..."
    
    # Create certificates directory if it doesn't exist
    if [[ ! -d "${DEPLOY_PATH}/certs" ]]; then
        mkdir -p "${DEPLOY_PATH}/certs"
        chmod 700 "${DEPLOY_PATH}/certs"
        log_info "Created certificates directory: ${DEPLOY_PATH}/certs"
    fi
    
    # Create backups directory
    if [[ ! -d "${DEPLOY_PATH}/backups" ]]; then
        mkdir -p "${DEPLOY_PATH}/backups"
        log_info "Created backups directory: ${DEPLOY_PATH}/backups"
    fi
}

backup_database() {
    log_info "Creating database backup..."
    
    BACKUP_DIR="${DEPLOY_PATH}/backups"
    BACKUP_FILE="${BACKUP_DIR}/sbs_$(date +%Y%m%d_%H%M%S).sql"
    
    # Check if postgres container is running
    if docker ps --format '{{.Names}}' | grep -q "sbs-vps-postgres"; then
        docker exec sbs-vps-postgres pg_dump -U postgres sbs_integration > "${BACKUP_FILE}" 2>/dev/null || true
        
        if [[ -f "${BACKUP_FILE}" ]]; then
            gzip "${BACKUP_FILE}"
            log_success "Database backup created: ${BACKUP_FILE}.gz"
        else
            log_warning "Database backup skipped (database may be empty or not running)"
        fi
    else
        log_warning "Database container not running, skipping backup"
    fi
}

deploy_services() {
    log_info "Deploying SBS services..."
    
    cd "${DEPLOY_DIR}"
    
    # Pull latest images (if using registry)
    log_info "Building Docker images..."
    docker compose -f "${COMPOSE_FILE}" build
    
    # Start services with selected profile
    log_info "Starting services with profile: ${PROFILE}"
    docker compose -f "${COMPOSE_FILE}" --profile "${PROFILE}" up -d
    
    log_success "Services deployed successfully"
}

wait_for_health() {
    log_info "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        attempt=$((attempt + 1))
        
        # Check if all services are healthy
        local unhealthy_count=$(docker compose -f "${COMPOSE_FILE}" ps --format json 2>/dev/null | \
            jq -r 'select(.Health != "" and .Health != "healthy") | .Name' | wc -l)
        
        if [[ $unhealthy_count -eq 0 ]]; then
            log_success "All services are healthy"
            return 0
        fi
        
        log_info "Waiting for services to be healthy... (attempt ${attempt}/${max_attempts})"
        sleep 10
    done
    
    log_warning "Some services may not be healthy yet. Check logs with:"
    log_warning "  docker compose -f ${COMPOSE_FILE} logs"
    return 1
}

show_status() {
    log_info "Service Status:"
    echo ""
    docker compose -f "${COMPOSE_FILE}" ps
    echo ""
    
    log_info "Access URLs:"
    echo "  Landing API:    https://sbs.brainsait.cloud/health"
    echo "  Status Check:   https://sbs.brainsait.cloud/api/services/status"
    echo ""
    
    log_info "Useful commands:"
    echo "  View logs:      docker compose -f ${COMPOSE_FILE} logs -f"
    echo "  Restart:        docker compose -f ${COMPOSE_FILE} restart"
    echo "  Stop:           docker compose -f ${COMPOSE_FILE} down"
    echo "  Health check:   ${SCRIPT_DIR}/vps/health-check.sh"
}

# ============================================================================
# Main Deployment Flow
# ============================================================================

main() {
    log_info "SBS VPS Deployment Script"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Repository: ${REPO_ROOT}"
    echo ""
    
    # Pre-deployment checks
    check_docker
    check_env_file
    validate_deployment
    
    # Create required directories
    create_required_directories
    
    # Backup existing database if any
    backup_database
    
    # Deploy services
    deploy_services
    
    # Wait for services to be healthy
    wait_for_health || true
    
    # Show deployment status
    echo ""
    log_success "Deployment completed!"
    echo ""
    show_status
}

# Run main function
main "$@"
