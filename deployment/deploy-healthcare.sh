#!/bin/bash
# Healthcare Claims System Deployment Script
# Deploys the integrated healthcare claims system with NPHIES bridge

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment configuration
ENVIRONMENT=${1:-development}
VERSION=${2:-2.0.0}
NAMESPACE="healthcare-system"
K8S_DEPLOYMENT_FILE="deployment/healthcare-k8s-deployment.yaml"

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}  Healthcare Claims System Deployment Script  ${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}Checking prerequisites...${NC}"

    # Check kubectl
    if command -v kubectl &> /dev/null; then
        print_status "kubectl is installed"
    else
        print_error "kubectl is not installed. Please install it first."
        exit 1
    fi

    # Check if kubectl can connect to cluster
    if kubectl cluster-info &> /dev/null; then
        print_status "kubectl can connect to cluster"
    else
        print_error "kubectl cannot connect to cluster. Please check your configuration."
        exit 1
    fi

    # Check if environment file exists
    if [ -f ".env" ]; then
        print_status "Environment file exists"
        source .env
    else
        print_warning ".env file not found. Using default values."
    fi
}

# Function to create namespace
create_namespace() {
    echo -e "\n${BLUE}Creating namespace $NAMESPACE...${NC}"

    if kubectl get namespace $NAMESPACE &> /dev/null; then
        print_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace $NAMESPACE
        print_status "Namespace $NAMESPACE created"
    fi
}

# Function to create secrets
create_secrets() {
    echo -e "\n${BLUE}Creating secrets...${NC}"

    # Database credentials
    if [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
        kubectl create secret generic db-credentials \
            --from-literal=username=$DB_USER \
            --from-literal=password=$DB_PASSWORD \
            --namespace=$NAMESPACE \
            --dry-run=client -o yaml | kubectl apply -f -
        print_status "Database credentials secret created"
    else
        print_warning "Database credentials not found in .env"
    fi

    # NPHIES API key
    if [ -n "$NPHIES_API_KEY" ]; then
        kubectl create secret generic nphies-secrets \
            --from-literal=api_key=$NPHIES_API_KEY \
            --namespace=$NAMESPACE \
            --dry-run=client -o yaml | kubectl apply -f -
        print_status "NPHIES API key secret created"
    else
        print_warning "NPHIES_API_KEY not found in .env"
    fi

    # AI service keys
    if [ -n "$ANTHROPIC_API_KEY" ]; then
        kubectl create secret generic ai-secrets \
            --from-literal=anthropic_api_key=$ANTHROPIC_API_KEY \
            --from-literal=openai_api_key=${OPENAI_API_KEY:-} \
            --namespace=$NAMESPACE \
            --dry-run=client -o yaml | kubectl apply -f -
        print_status "AI service secrets created"
    fi
}

# Function to deploy via kubectl
deploy_via_kubectl() {
    echo -e "\n${BLUE}Deploying via kubectl...${NC}"

    if [ -f "$K8S_DEPLOYMENT_FILE" ]; then
        echo "Applying deployment file: $K8S_DEPLOYMENT_FILE"

        # First, create the namespace if it doesn't exist
        kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

        # Apply the deployment
        kubectl apply -f $K8S_DEPLOYMENT_FILE --namespace=$NAMESPACE

        print_status "Healthcare system deployed successfully"
    else
        print_error "Deployment file $K8S_DEPLOYMENT_FILE not found"
        exit 1
    fi
}

# Function to verify deployment
verify_deployment() {
    echo -e "\n${BLUE}Verifying deployment...${NC}"

    # Wait for pods to be ready
    echo "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod \
        --selector=app=nphies-bridge \
        --namespace=$NAMESPACE \
        --timeout=300s

    print_status "NPHIES Bridge pods are ready"

    # Check service endpoints
    echo "Checking service endpoints..."
    kubectl get services -n $NAMESPACE

    # Check deployment status
    echo "Deployment status:"
    kubectl get deployments -n $NAMESPACE

    print_status "Deployment verification complete"
}

# Function to deploy development environment (docker-compose)
deploy_development() {
    echo -e "\n${BLUE}Deploying development environment...${NC}"

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
        print_error "Docker/Docker Compose not found. Please install it first."
        exit 1
    fi

    # Load environment variables
    if [ -f ".env" ]; then
        source .env
    else
        print_warning ".env file not found. Using default values."
    fi

    # Create necessary directories
    mkdir -p certificates

    # Start services
    echo "Starting Docker Compose services..."
    docker-compose up -d postgres redis nphies-bridge

    print_status "Development environment started"

    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 10

    # Check service health
    echo "Checking service health..."
    curl -f http://localhost:8003/health || echo "NPHIES Bridge not ready yet"

    curl -f http://localhost:5432 || echo "PostgreSQL not ready yet"
}

# Function to run database migrations
run_migrations() {
    echo -e "\n${BLUE}Running database migrations...${NC}"

    if [ "$ENVIRONMENT" == "development" ]; then
        # Development: use docker-compose
        echo "Applying schema to container..."
        docker exec -i sbs-postgres psql -U $DB_USER -d $DB_NAME < database/schema.sql
    else
        # Production: use kubectl
        echo "Applying schema via kubectl..."
        kubectl run postgres-client --namespace=$NAMESPACE --rm -i --restart=Never -- \
            psql -h postgres.postgres.svc.cluster.local -U $DB_USER -d $DB_NAME < database/schema.sql
    fi

    print_status "Database schema applied"
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "\n${BLUE}Deploying frontend...${NC}"

    if [ "$ENVIRONMENT" == "development" ]; then
        echo "Starting frontend in development mode..."
        cd sbs-landing
        npm install
        npm run build
        cd ..
        print_status "Frontend built successfully"
    else
        # In Kubernetes, frontend is part of the main app
        print_warning "Frontend deployment handled via main deployment"
    fi
}

# Function to deploy n8n workflows
deploy_n8n_workflows() {
    echo -e "\n${BLUE}Deploying n8n workflows...${NC}"

    if [ "$ENVIRONMENT" == "development" ]; then
        # n8n in docker-compose will load workflows automatically
        print_status "n8n workflows loaded automatically in development"
    else
        # Production: ensure workflows are loaded
        echo "Checking n8n workflows..."
        # This would typically be done via n8n API or file sync
        print_warning "n8n workflows should be managed separately in production"
    fi
}

# Function to run tests
run_tests() {
    echo -e "\n${BLUE}Running tests...${NC}"

    echo "Running healthcare claims integration tests..."
    python -m pytest tests/test_healthcare_claims_integration.py -v --tb=short

    echo "Running NPHIES bridge tests..."
    python -m pytest tests/test_claim_workflow.py -v --tb=short

    print_status "Tests completed"
}

# Function to create deployment report
create_report() {
    echo -e "\n${BLUE}Creating deployment report...${NC}"

    REPORT_FILE="deployment/reports/healthcare-deployment-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p deployment/reports

    cat > $REPORT_FILE << EOF
# Healthcare Claims System Deployment Report

## Deployment Summary

- **Environment**: $ENVIRONMENT
- **Version**: $VERSION
- **Date**: $(date)
- **Namespace**: $NAMESPACE

## Deployed Components

### Services
- NPHIES Bridge (Port 8003)
- Healthcare API (via NPHIES Bridge)
- PostgreSQL Database
- Redis Cache
- n8n Workflow Engine
- Frontend UI

### Database Tables Added
- Patients
- Providers
- Payers
- Services
- ServiceRequest
- PriorAuthorizations
- Claims
- Approvals
- RequestStatusHistory

### API Endpoints Added
- /unified-healthcare-submit
- /healthcare/prior-auth
- /healthcare/eligibility/check
- /healthcare/requests
- /healthcare/dashboard/{role}
- /healthcare/analytics/dashboard
- /terminology/* validation endpoints

## Configuration

### Environment Variables
- DB_NAME: $DB_NAME
- NPHIES_BASE_URL: $NPHIES_BASE_URL
- ALLOWED_ORIGINS: $ALLOWED_ORIGINS

### AI Services
- Anthropic Claude API: $(if [ -n "$ANTHROPIC_API_KEY" ]; then echo "Configured"; else echo "Not configured"; fi)
- OpenAI API: $(if [ -n "$OPENAI_API_KEY" ]; then echo "Configured"; else echo "Not configured"; fi)

## Status

`$(if [ $ENVIRONMENT == "development" ]; then echo "✅ Development deployment completed"; else echo "⚠️ Production deployment requires additional configuration"; fi)`

## Next Steps

1. Configure SSL certificates for production
2. Set up monitoring and alerting
3. Configure backup strategy
4. Set up CI/CD pipeline
5. Configure n8n workflows

## Troubleshooting

If issues occur, check:
1. Pod logs: kubectl logs -n $NAMESPACE <pod-name>
2. Service endpoints: kubectl get services -n $NAMESPACE
3. Database connectivity
4. NPHIES API credentials

---

Deployment completed: $(date)

EOF

    print_status "Deployment report saved to $REPORT_FILE"
    cat $REPORT_FILE
}

# Main deployment function
main() {
    echo -e "${BLUE}Starting Healthcare Claims System Deployment${NC}"

    # Check prerequisites
    check_prerequisites

    # Run tests before deployment
    read -p "Run tests before deployment? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_tests
    fi

    # Create namespace
    create_namespace

    # Create secrets
    create_secrets

    # Deploy based on environment
    if [ "$ENVIRONMENT" == "development" ]; then
        deploy_development
        run_migrations
        deploy_n8n_workflows
    elif [ "$ENVIRONMENT" == "staging" ]; then
        deploy_via_kubectl
        run_migrations
        deploy_n8n_workflows
    elif [ "$ENVIRONMENT" == "production" ]; then
        deploy_via_kubectl
        run_migrations
        deploy_n8n_workflows
    else
        print_error "Unknown environment: $ENVIRONMENT"
        exit 1
    fi

    # Deploy frontend
    deploy_frontend

    # Run integration tests
    echo -e "\n${BLUE}Running integration tests...${NC}"
    if [ -f "tests/test_healthcare_claims_integration.py" ]; then
        python -m pytest tests/test_healthcare_claims_integration.py::TestHealthcareAPIIntegration::test_health_check -v
    fi

    # Verify deployment
    if [ "$ENVIRONMENT" != "development" ]; then
        verify_development
    fi

    # Create deployment report
    create_report

    echo -e "\n${GREEN}=================================================${NC}"
    echo -e "${GREEN}  Healthcare Claims System Deployment Complete!  ${NC}"
    echo -e "${GREEN}=================================================${NC}"
    echo ""
    echo "Deployment Summary:"
    echo "- Environment: $ENVIRONMENT"
    echo "- Namespace: $NAMESPACE"
    echo "- Version: $VERSION"
    echo ""

    if [ "$ENVIRONMENT" == "development" ]; then
        echo "Access URLs:"
        echo "- NPHIES Bridge: http://localhost:8003"
        echo "- SBS Landing: http://localhost:3000"
        echo "- n8n Dashboard: http://localhost:5678"
        echo "- pgAdmin: http://localhost:5050"
    else
        echo "Kubernetes Namespace: $NAMESPACE"
        echo "Use: kubectl get all -n $NAMESPACE"
    fi

    echo ""
    echo "Next steps:"
    echo "1. Configure environment-specific settings"
    echo "2. Set up monitoring and logging"
    echo "3. Configure backup strategy"
    echo "4. Run load testing if needed"
    echo ""
}

# Error handling
trap 'echo -e "\n${RED}Deployment failed at line $LINENO${NC}"; exit 1' ERR

# Run main function
main "$@"

# Success message
echo -e "${GREEN}Healthcare Claims System deployment completed successfully!${NC}"