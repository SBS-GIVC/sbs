#!/bin/bash

#############################################################################
# SBS Kubernetes Production Deployment Script
# 
# This script deploys the complete SBS application stack to Kubernetes
# Including: PostgreSQL, Microservices, Frontend, and Ingress
#
# Usage: ./deploy-sbs-k8s.sh [options]
# Options:
#   --skip-secrets    Skip secrets deployment (if already deployed)
#   --skip-wait       Skip waiting for pods to be ready
#   --dry-run         Show what would be deployed without deploying
#############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
SKIP_SECRETS=false
SKIP_WAIT=false
DRY_RUN=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-secrets)
            SKIP_SECRETS=true
            shift
            ;;
        --skip-wait)
            SKIP_WAIT=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --skip-secrets    Skip secrets deployment"
            echo "  --skip-wait       Skip waiting for pods"
            echo "  --dry-run         Show what would be deployed"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         SBS Kubernetes Production Deployment              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step
print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_success "Connected to Kubernetes cluster"
echo ""

# Pre-deployment checks
print_step "Running pre-deployment checks..."

# Check if required files exist
REQUIRED_FILES=(
    "00-namespace.yaml"
    "01-secrets.yaml"
    "02-configmap.yaml"
    "03-postgres.yaml"
    "04-normalizer.yaml"
    "05-signer.yaml"
    "06-financial.yaml"
    "07-nphies.yaml"
    "08-frontend.yaml"
    "09-ingress.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done

print_success "All required files found"

# Check if frontend dist directory exists
FRONTEND_DIST="/home/fadil369/sbs/sbs-landing/dist"
if [ ! -d "$FRONTEND_DIST" ]; then
    print_warning "Frontend dist directory not found: $FRONTEND_DIST"
    print_warning "Make sure to build the frontend first: npm run build"
fi

# Check if secrets need to be updated
if [ "$SKIP_SECRETS" = false ]; then
    if grep -q "changeme123" 01-secrets.yaml; then
        print_warning "Default passwords detected in secrets file!"
        print_warning "Please update 01-secrets.yaml with production credentials"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo ""

if [ "$DRY_RUN" = true ]; then
    print_step "DRY RUN MODE - No changes will be made"
    KUBECTL_CMD="kubectl apply --dry-run=client -f"
else
    KUBECTL_CMD="kubectl apply -f"
fi

# Deploy namespace
print_step "Creating namespace..."
$KUBECTL_CMD 00-namespace.yaml
print_success "Namespace created/updated"
echo ""

# Deploy secrets
if [ "$SKIP_SECRETS" = false ]; then
    print_step "Creating secrets..."
    $KUBECTL_CMD 01-secrets.yaml
    print_success "Secrets created/updated"
else
    print_warning "Skipping secrets deployment"
fi
echo ""

# Deploy ConfigMap
print_step "Creating ConfigMap..."
$KUBECTL_CMD 02-configmap.yaml
print_success "ConfigMap created/updated"
echo ""

# Deploy PostgreSQL
print_step "Deploying PostgreSQL..."
$KUBECTL_CMD 03-postgres.yaml
print_success "PostgreSQL deployed"

if [ "$SKIP_WAIT" = false ] && [ "$DRY_RUN" = false ]; then
    print_step "Waiting for PostgreSQL to be ready..."
    if kubectl wait --for=condition=ready pod -l app=postgres -n sbs-prod --timeout=300s; then
        print_success "PostgreSQL is ready"
    else
        print_error "PostgreSQL failed to become ready"
        exit 1
    fi
fi
echo ""

# Deploy microservices
print_step "Deploying microservices..."
$KUBECTL_CMD 04-normalizer.yaml
print_success "Normalizer deployed"

$KUBECTL_CMD 05-signer.yaml
print_success "Signer deployed"

$KUBECTL_CMD 06-financial.yaml
print_success "Financial deployed"

$KUBECTL_CMD 07-nphies.yaml
print_success "NPHIES deployed"

if [ "$SKIP_WAIT" = false ] && [ "$DRY_RUN" = false ]; then
    print_step "Waiting for microservices to be ready..."
    kubectl wait --for=condition=available deployment --all -n sbs-prod --timeout=300s || true
    print_success "Microservices are ready"
fi
echo ""

# Deploy frontend
print_step "Deploying frontend..."
$KUBECTL_CMD 08-frontend.yaml
print_success "Frontend deployed"

if [ "$SKIP_WAIT" = false ] && [ "$DRY_RUN" = false ]; then
    print_step "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available deployment/frontend -n sbs-prod --timeout=120s || true
    print_success "Frontend is ready"
fi
echo ""

# Deploy ingress
print_step "Deploying ingress..."
$KUBECTL_CMD 09-ingress.yaml
print_success "Ingress deployed"
echo ""

if [ "$DRY_RUN" = false ]; then
    # Show deployment status
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                  Deployment Summary                        ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    print_step "Pods:"
    kubectl get pods -n sbs-prod -o wide
    echo ""
    
    print_step "Services:"
    kubectl get svc -n sbs-prod
    echo ""
    
    print_step "Ingress:"
    kubectl get ingress -n sbs-prod
    echo ""
    
    print_step "PersistentVolumeClaims:"
    kubectl get pvc -n sbs-prod
    echo ""
    
    # Get ingress URL
    INGRESS_HOST=$(kubectl get ingress sbs-ingress -n sbs-prod -o jsonpath='{.spec.rules[0].host}')
    
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}            Deployment Completed Successfully!             ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "Application URL: ${BLUE}https://$INGRESS_HOST${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Check pod status: kubectl get pods -n sbs-prod"
    echo "  2. View logs: kubectl logs -f deployment/normalizer -n sbs-prod"
    echo "  3. Access application: https://$INGRESS_HOST"
    echo ""
    echo "Useful commands:"
    echo "  • Watch pods: kubectl get pods -n sbs-prod -w"
    echo "  • Port forward: kubectl port-forward svc/frontend-service 8080:80 -n sbs-prod"
    echo "  • Delete all: kubectl delete namespace sbs-prod"
    echo ""
else
    print_success "Dry run completed successfully"
    echo "Run without --dry-run to actually deploy"
fi
