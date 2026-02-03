#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# SBS VPS Health Check Script
# ============================================================================
# Checks health of all SBS services running on VPS
# Usage: ./scripts/vps/health-check.sh [mode]
#   mode: local | tunnel (default: local)
#     local  - Check via internal Docker network
#     tunnel - Check via Cloudflare Tunnel (public URL)

MODE="${1:-local}"
COMPOSE_FILE="${COMPOSE_FILE:-/home/runner/work/sbs/sbs/deploy/vps/docker-compose.vps.yml}"

# Service endpoints for local (Docker network) access
LANDING_URL="http://localhost:3000"
NORMALIZER_URL="http://localhost:8000"
FINANCIAL_URL="http://localhost:8002"
SIGNER_URL="http://localhost:8001"
NPHIES_URL="http://localhost:8003"

# Override with tunnel URLs if in tunnel mode
if [[ "${MODE}" == "tunnel" ]]; then
    BASE_DOMAIN="${BASE_DOMAIN:-sbs.brainsait.cloud}"
    LANDING_URL="https://${BASE_DOMAIN}"
    NORMALIZER_URL="https://normalizer.${BASE_DOMAIN}"
    FINANCIAL_URL="https://financial.${BASE_DOMAIN}"
    SIGNER_URL="https://signer.${BASE_DOMAIN}"
    NPHIES_URL="https://nphies.${BASE_DOMAIN}"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

check_service() {
    local name=$1
    local url=$2
    local timeout=${3:-5}
    
    if curl -sf --max-time "${timeout}" "${url}/health" > /dev/null 2>&1; then
        log_success "${name} is healthy (${url})"
        return 0
    else
        log_error "${name} is unhealthy or unreachable (${url})"
        return 1
    fi
}

check_docker_container() {
    local container_name=$1
    
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        local status=$(docker inspect --format='{{.State.Status}}' "${container_name}" 2>/dev/null || echo "unknown")
        local health=$(docker inspect --format='{{.State.Health.Status}}' "${container_name}" 2>/dev/null || echo "none")
        
        if [[ "${status}" == "running" ]]; then
            if [[ "${health}" == "healthy" ]] || [[ "${health}" == "none" ]]; then
                log_success "Container ${container_name} is running"
                return 0
            else
                log_error "Container ${container_name} is running but health=${health}"
                return 1
            fi
        else
            log_error "Container ${container_name} has status=${status}"
            return 1
        fi
    else
        log_error "Container ${container_name} not found"
        return 1
    fi
}

# ============================================================================
# Health Checks
# ============================================================================

main() {
    log_info "SBS VPS Health Check"
    log_info "Mode: ${MODE}"
    echo ""
    
    local failed=0
    
    # Check Docker containers (if running locally)
    if [[ "${MODE}" == "local" ]]; then
        log_info "Checking Docker containers..."
        check_docker_container "sbs-vps-postgres" || ((failed++))
        check_docker_container "sbs-vps-normalizer" || ((failed++))
        check_docker_container "sbs-vps-financial-rules" || ((failed++))
        check_docker_container "sbs-vps-signer" || ((failed++))
        check_docker_container "sbs-vps-nphies-bridge" || ((failed++))
        check_docker_container "sbs-vps-landing" || ((failed++))
        echo ""
    fi
    
    # Check service health endpoints
    log_info "Checking service health endpoints..."
    check_service "Landing API" "${LANDING_URL}" 10 || ((failed++))
    check_service "Normalizer Service" "${NORMALIZER_URL}" || ((failed++))
    check_service "Financial Rules Engine" "${FINANCIAL_URL}" || ((failed++))
    check_service "Signer Service" "${SIGNER_URL}" || ((failed++))
    check_service "NPHIES Bridge" "${NPHIES_URL}" || ((failed++))
    echo ""
    
    # Summary
    if [[ ${failed} -eq 0 ]]; then
        log_success "All health checks passed!"
        exit 0
    else
        log_error "${failed} health check(s) failed"
        echo ""
        log_info "Troubleshooting steps:"
        echo "  1. Check container logs: docker compose -f ${COMPOSE_FILE} logs <service>"
        echo "  2. Check service status: docker compose -f ${COMPOSE_FILE} ps"
        echo "  3. Restart unhealthy services: docker compose -f ${COMPOSE_FILE} restart <service>"
        exit 1
    fi
}

# Run main function
main "$@"
