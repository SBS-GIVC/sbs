#!/bin/bash

# SBS Integration Engine - Quick Start Script
# This script sets up the development environment

set -e

echo "=========================================="
echo "SBS Integration Engine - Quick Start"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your credentials before continuing."
    echo "   Required: GEMINI_API_KEY, DB_PASSWORD, N8N_PASSWORD"
    echo ""
    read -p "Press enter when you've configured .env file..."
fi

echo "✅ Environment file found"
echo ""

# Create certificates directory
echo "📁 Creating certificates directory..."
mkdir -p certs
chmod 700 certs

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check service health
echo ""
echo "🔍 Checking service health..."
echo ""

services=("normalizer-service:8000" "signer-service:8001" "financial-rules-engine:8002" "nphies-bridge:8003")
all_healthy=true

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ $name is healthy (port $port)"
    else
        echo "❌ $name is not responding (port $port)"
        all_healthy=false
    fi
done

echo ""

if [ "$all_healthy" = true ]; then
    echo "=========================================="
    echo "✅ All services are running!"
    echo "=========================================="
    echo ""
    echo "Service URLs:"
    echo "  • Normalizer Service:     http://localhost:8000"
    echo "  • Signer Service:         http://localhost:8001"
    echo "  • Financial Rules Engine: http://localhost:8002"
    echo "  • NPHIES Bridge:          http://localhost:8003"
    echo "  • n8n Workflow:           http://localhost:5678"
    echo "  • pgAdmin (optional):     http://localhost:5050"
    echo ""
    echo "Next Steps:"
    echo "  1. Generate test certificate:"
    echo "     curl -X POST http://localhost:8001/generate-test-cert?facility_id=1"
    echo ""
    echo "  2. Access n8n and import workflow:"
    echo "     - Navigate to http://localhost:5678"
    echo "     - Import: n8n-workflows/sbs-full-workflow.json"
    echo ""
    echo "  3. Test the integration:"
    echo "     curl -X POST http://localhost:8000/normalize \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"facility_id\":1,\"internal_code\":\"LAB-CBC-01\",\"description\":\"CBC Test\"}'"
    echo ""
    echo "Documentation: ./docs/"
    echo "Logs: docker-compose logs -f"
    echo ""
else
    echo "=========================================="
    echo "⚠️  Some services failed to start"
    echo "=========================================="
    echo ""
    echo "Check logs with: docker-compose logs"
    echo ""
    exit 1
fi
