#!/bin/bash

###############################################################################
# SBS N8N Workflow - Comprehensive Testing & Deployment Script
# This script orchestrates the complete testing and deployment process
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Banner
echo "================================================================================"
echo "          SBS N8N WORKFLOW - COMPREHENSIVE TESTING & DEPLOYMENT"
echo "================================================================================"
echo ""

# Step 1: Check prerequisites
log_info "Step 1: Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed!"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    log_error "Python 3 is not installed!"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    log_error "curl is not installed!"
    exit 1
fi

if [ ! -f ".env" ]; then
    log_error ".env file not found! Please create it from .env.example"
    exit 1
fi

log_success "All prerequisites met!"
echo ""

# Step 2: Check if services are already running
log_info "Step 2: Checking existing services..."

NORMALIZER_RUNNING=$(curl -s http://localhost:8000/health 2>/dev/null | grep -c "healthy" || echo "0")
SIGNER_RUNNING=$(curl -s http://localhost:8001/health 2>/dev/null | grep -c "healthy" || echo "0")
FINANCIAL_RUNNING=$(curl -s http://localhost:8002/health 2>/dev/null | grep -c "healthy" || echo "0")
NPHIES_RUNNING=$(curl -s http://localhost:8003/health 2>/dev/null | grep -c "healthy" || echo "0")

if [ "$NORMALIZER_RUNNING" = "1" ] && [ "$SIGNER_RUNNING" = "1" ] && [ "$FINANCIAL_RUNNING" = "1" ] && [ "$NPHIES_RUNNING" = "1" ]; then
    log_success "All backend services are already running and healthy!"
    SERVICES_STARTED="yes"
else
    log_warning "Backend services are not running. Starting them now..."
    SERVICES_STARTED="no"
fi

echo ""

# Step 3: Start backend services if needed
if [ "$SERVICES_STARTED" = "no" ]; then
    log_info "Step 3: Starting backend services..."
    
    log_info "Starting Docker Compose services..."
    docker-compose -f docker-compose.services.yml up -d
    
    log_info "Waiting 60 seconds for services to initialize..."
    sleep 60
    
    log_info "Checking service health..."
    
    # Check each service
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        log_success "✓ Normalizer Service (8000) - HEALTHY"
    else
        log_error "✗ Normalizer Service (8000) - UNHEALTHY"
    fi
    
    if curl -s http://localhost:8001/health | grep -q "healthy"; then
        log_success "✓ Signer Service (8001) - HEALTHY"
    else
        log_error "✗ Signer Service (8001) - UNHEALTHY"
    fi
    
    if curl -s http://localhost:8002/health | grep -q "healthy"; then
        log_success "✓ Financial Rules Engine (8002) - HEALTHY"
    else
        log_error "✗ Financial Rules Engine (8002) - UNHEALTHY"
    fi
    
    if curl -s http://localhost:8003/health | grep -q "healthy"; then
        log_success "✓ NPHIES Bridge (8003) - HEALTHY"
    else
        log_error "✗ NPHIES Bridge (8003) - UNHEALTHY"
    fi
    
    echo ""
else
    log_info "Step 3: Skipping service startup (already running)"
    echo ""
fi

# Step 4: Test webhook connectivity
log_info "Step 4: Testing webhook connectivity..."

WEBHOOK_URL="https://n8n.brainsait.cloud/webhook/sbs-claim-submission"

log_info "Testing: $WEBHOOK_URL"
WEBHOOK_RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{"test":"ping"}' || echo "ERROR")

if echo "$WEBHOOK_RESPONSE" | grep -q "ERROR"; then
    log_error "Webhook is not responding!"
    exit 1
else
    log_success "Webhook is responding!"
    log_info "Response: ${WEBHOOK_RESPONSE:0:100}..."
fi

echo ""

# Step 5: Run comprehensive test suite
log_info "Step 5: Running comprehensive test suite..."
echo ""
log_info "This will run 52 different test scenarios covering:"
log_info "  - Basic scenarios (8 tests)"
log_info "  - Multi-facility testing (5 tests)"
log_info "  - Stress testing (20 tests)"
log_info "  - Edge cases (3 tests)"
log_info "  - All payers (5 tests)"
log_info "  - All service categories (6 tests)"
log_info "  - Error handling (3 tests)"
log_info "  - Complex claims (2 tests)"
echo ""

read -p "Press ENTER to start the test suite, or CTRL+C to cancel..."

log_info "Starting test execution..."
python3 test_sbs_workflow_comprehensive.py "$WEBHOOK_URL"

echo ""

# Step 6: Analyze results
log_info "Step 6: Analyzing test results..."

LATEST_REPORT=$(ls -t sbs_test_report_*.json 2>/dev/null | head -1)

if [ -z "$LATEST_REPORT" ]; then
    log_error "No test report found!"
    exit 1
fi

log_info "Report file: $LATEST_REPORT"
echo ""

# Extract key metrics
TOTAL_TESTS=$(cat "$LATEST_REPORT" | jq -r '.test_run.total_tests')
PASSED=$(cat "$LATEST_REPORT" | jq -r '.test_run.passed')
FAILED=$(cat "$LATEST_REPORT" | jq -r '.test_run.failed')
SUCCESS_RATE=$(cat "$LATEST_REPORT" | jq -r '.test_run.success_rate')

echo "================================================================================"
echo "                           TEST RESULTS SUMMARY"
echo "================================================================================"
echo ""
echo "Total Tests:    $TOTAL_TESTS"
echo "Passed:         $PASSED"
echo "Failed:         $FAILED"
echo "Success Rate:   $SUCCESS_RATE"
echo ""

# Calculate average response time
AVG_RESPONSE_TIME=$(cat "$LATEST_REPORT" | jq -r '[.results[] | select(.response_time != null) | .response_time] | add / length')
echo "Average Response Time: ${AVG_RESPONSE_TIME}s"
echo ""

# Show failed tests if any
if [ "$FAILED" != "0" ]; then
    log_warning "Failed Tests:"
    cat "$LATEST_REPORT" | jq -r '.results[] | select(.success == false) | "  - " + .test_name + ": " + (.error // "Unknown error")'
    echo ""
fi

echo "================================================================================"
echo ""

# Step 7: Production readiness decision
log_info "Step 7: Production Readiness Assessment..."
echo ""

SUCCESS_RATE_NUM=$(echo "$SUCCESS_RATE" | sed 's/%//')
AVG_TIME_NUM=$(echo "$AVG_RESPONSE_TIME" | bc)

READY_FOR_PRODUCTION="yes"

if (( $(echo "$SUCCESS_RATE_NUM < 95" | bc -l) )); then
    log_warning "Success rate is below 95% threshold"
    READY_FOR_PRODUCTION="no"
fi

if (( $(echo "$AVG_TIME_NUM > 5" | bc -l) )); then
    log_warning "Average response time is above 5s threshold"
    READY_FOR_PRODUCTION="no"
fi

if [ "$READY_FOR_PRODUCTION" = "yes" ]; then
    log_success "✅ SYSTEM IS READY FOR PRODUCTION!"
    echo ""
    echo "================================================================================"
    echo "                           PRODUCTION INFORMATION"
    echo "================================================================================"
    echo ""
    echo "Production Webhook URL:"
    echo "  $WEBHOOK_URL"
    echo ""
    echo "Backend Services:"
    echo "  ✓ Normalizer Service:        http://localhost:8000"
    echo "  ✓ Signer Service:            http://localhost:8001"
    echo "  ✓ Financial Rules Engine:    http://localhost:8002"
    echo "  ✓ NPHIES Bridge:             http://localhost:8003"
    echo "  ✓ PostgreSQL Database:       localhost:5432"
    echo ""
    echo "N8N Dashboard:"
    echo "  https://n8n.brainsait.cloud"
    echo ""
    echo "================================================================================"
    echo ""
    log_success "You can now use the production webhook URL in your applications!"
else
    log_error "⚠️  SYSTEM IS NOT READY FOR PRODUCTION"
    echo ""
    log_error "Please review the failed tests and fix issues before proceeding."
    echo ""
    log_info "Troubleshooting steps:"
    echo "  1. Review test report: $LATEST_REPORT"
    echo "  2. Check service logs: docker-compose -f docker-compose.services.yml logs"
    echo "  3. Verify n8n workflow configuration"
    echo "  4. Check database connectivity"
    echo ""
fi

# Step 8: Cleanup options
echo ""
log_info "Step 8: Next Actions"
echo ""
echo "Available commands:"
echo "  View logs:          docker-compose -f docker-compose.services.yml logs -f"
echo "  Stop services:      docker-compose -f docker-compose.services.yml down"
echo "  Restart services:   docker-compose -f docker-compose.services.yml restart"
echo "  View test report:   cat $LATEST_REPORT | jq '.'"
echo "  Re-run tests:       python3 test_sbs_workflow_comprehensive.py $WEBHOOK_URL"
echo ""

log_success "Testing and deployment process complete!"
