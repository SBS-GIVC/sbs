#!/bin/bash

# AI Prediction Service Deployment Script
# Deploys the AI Prediction Analytics Service to Docker/Kubernetes

set -e

echo "🚀 AI Prediction Service Deployment"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    # Check for docker compose (v2) or docker-compose (v1)
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Prerequisites check passed"
}

# Build the AI Prediction Service
build_service() {
    print_status "Building AI Prediction Service..."

    cd /home/fadil369/sbs/ai-prediction-service

    # Build Docker image
    docker build -t sbs-ai-prediction:latest .

    if [ $? -eq 0 ]; then
        print_success "AI Prediction Service built successfully"
    else
        print_error "Failed to build AI Prediction Service"
        exit 1
    fi
}

# Deploy using Docker Compose (Development)
deploy_development() {
    print_status "Deploying AI Prediction Service (Development)..."

    cd /home/fadil369/sbs

    # Start the service
    $COMPOSE_CMD up -d ai-prediction-service

    if [ $? -eq 0 ]; then
        print_success "AI Prediction Service deployed successfully"
        print_status "Service available at: http://localhost:8004"
    else
        print_error "Failed to deploy AI Prediction Service"
        exit 1
    fi
}

# Deploy using Docker Compose (Production)
deploy_production() {
    print_status "Deploying AI Prediction Service (Production)..."

    cd /home/fadil369/sbs

    # Check if production docker-compose exists
    if [ ! -f "docker-compose.production.yml" ]; then
        print_error "docker-compose.production.yml not found"
        exit 1
    fi

    # Start the service
    $COMPOSE_CMD -f docker-compose.production.yml up -d ai-prediction-service

    if [ $? -eq 0 ]; then
        print_success "AI Prediction Service deployed successfully"
        print_status "Service available at: http://localhost:8004"
    else
        print_error "Failed to deploy AI Prediction Service"
        exit 1
    fi
}

# Deploy to Kubernetes
deploy_kubernetes() {
    print_status "Deploying AI Prediction Service to Kubernetes..."

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi

    # Check if Kubernetes cluster is accessible
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    cd /home/fadil369/sbs/k8s-production

    # Check if Kubernetes manifest exists
    if [ ! -f "04-ai-prediction.yaml" ]; then
        print_warning "Kubernetes manifest not found. Creating one..."

        # Create Kubernetes manifest
        cat > 04-ai-prediction.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-prediction-service
  namespace: sbs-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-prediction-service
  template:
    metadata:
      labels:
        app: ai-prediction-service
    spec:
      containers:
      - name: ai-prediction-service
        image: sbs-ai-prediction:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8004
        env:
        - name: DB_HOST
          value: "postgres"
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: sbs-config
              key: db.name
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: sbs-secrets
              key: db.user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: sbs-secrets
              key: db.password
        - name: REDIS_HOST
          value: "redis"
        - name: ALLOWED_ORIGINS
          valueFrom:
            configMapKeyRef:
              name: sbs-config
              key: allowed.origins
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8004
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8004
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ai-prediction-service
  namespace: sbs-prod
spec:
  selector:
    app: ai-prediction-service
  ports:
  - port: 8004
    targetPort: 8004
  type: ClusterIP
EOF
    fi

    # Apply Kubernetes manifest
    kubectl apply -f 04-ai-prediction.yaml

    if [ $? -eq 0 ]; then
        print_success "AI Prediction Service deployed to Kubernetes"
        print_status "Check status with: kubectl get pods -n sbs-prod -l app=ai-prediction-service"
    else
        print_error "Failed to deploy AI Prediction Service to Kubernetes"
        exit 1
    fi
}

# Check service health
check_health() {
    print_status "Checking AI Prediction Service health..."

    # Wait for service to be ready
    sleep 5

    # Check health endpoint
    if curl -f http://localhost:8004/health &> /dev/null; then
        print_success "AI Prediction Service is healthy"

        # Get metrics
        print_status "Fetching service metrics..."
        curl -s http://localhost:8004/metrics | jq '.'
    else
        print_error "AI Prediction Service health check failed"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_status "Running AI Prediction Service tests..."

    cd /home/fadil369/sbs

    # Check if test script exists
    if [ ! -f "test-ai-comprehensive.sh" ]; then
        print_warning "Test script not found. Creating one..."

        # Create test script
        cat > test-ai-comprehensive.sh << 'EOF'
#!/bin/bash

echo "🧪 AI Prediction Service Comprehensive Tests"
echo "============================================"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
curl -s http://localhost:8004/health | jq '.'
echo ""

# Test 2: Claim Prediction
echo "Test 2: Claim Prediction"
curl -s -X POST http://localhost:8004/api/ai/predict-claim \
  -H "Content-Type: application/json" \
  -d '{
    "facility_id": 1,
    "patient_age": 45,
    "patient_gender": "M",
    "diagnosis_codes": ["I10", "E11.9"],
    "procedure_codes": ["1101001", "1201001"],
    "service_date": "2026-01-31",
    "total_amount": 5000
  }' | jq '.'
echo ""

# Test 3: Cost Optimization
echo "Test 3: Cost Optimization"
curl -s -X POST http://localhost:8004/api/ai/optimize-cost \
  -H "Content-Type: application/json" \
  -d '{
    "facility_id": 1,
    "claim_items": [
      {"sbs_code": "1101001", "quantity": 1, "description": "CT Scan"},
      {"sbs_code": "1201001", "quantity": 2, "description": "CBC Test"}
    ],
    "patient_info": {"age": 45, "gender": "M"}
  }' | jq '.'
echo ""

# Test 4: Fraud Detection
echo "Test 4: Fraud Detection"
curl -s -X POST http://localhost:8004/api/ai/detect-fraud \
  -H "Content-Type: application/json" \
  -d '{
    "facility_id": 1,
    "claim_data": {
      "total": {"value": 5000, "currency": "SAR"},
      "item": []
    }
  }' | jq '.'
echo ""

# Test 5: Compliance Check
echo "Test 5: Compliance Check"
curl -s -X POST http://localhost:8004/api/ai/check-compliance \
  -H "Content-Type: application/json" \
  -d '{
    "facility_id": 1,
    "claim_data": {
      "resourceType": "Claim",
      "item": [],
      "total": {"value": 5000, "currency": "SAR"}
    }
  }' | jq '.'
echo ""

# Test 6: Metrics
echo "Test 6: Metrics"
curl -s http://localhost:8004/metrics | jq '.'
echo ""

echo "✅ All tests completed!"
EOF

        chmod +x test-ai-comprehensive.sh
    fi

    ./test-ai-comprehensive.sh

    if [ $? -eq 0 ]; then
        print_success "All tests passed"
    else
        print_error "Some tests failed"
        exit 1
    fi
}

# Main deployment flow
main() {
    echo "Select deployment mode:"
    echo "1) Development (docker-compose)"
    echo "2) Production (docker-compose.production.yml)"
    echo "3) Kubernetes"
    echo "4) Build and Test Only"
    echo "5) Exit"
    echo ""
    read -p "Enter choice [1-5]: " choice

    case $choice in
        1)
            check_prerequisites
            build_service
            deploy_development
            check_health
            run_tests
            ;;
        2)
            check_prerequisites
            build_service
            deploy_production
            check_health
            run_tests
            ;;
        3)
            check_prerequisites
            build_service
            deploy_kubernetes
            ;;
        4)
            check_prerequisites
            build_service
            run_tests
            ;;
        5)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac

    print_success "Deployment completed successfully!"
    echo ""
    print_status "Service URLs:"
    print_status "  - Health Check: http://localhost:8004/health"
    print_status "  - Metrics: http://localhost:8004/metrics"
    print_status "  - API Docs: http://localhost:8004/docs"
    echo ""
    print_status "Next steps:"
    print_status "  1. Access the AI Analytics Hub at /ai-analytics"
    print_status "  2. Use the AI Copilot for conversational assistance"
    print_status "  3. Monitor service metrics in Grafana"
}

# Run main function
main
