#!/bin/bash

# SBS Landing Page Deployment Script
# Deploys the landing page to brainsait.cloud with Traefik integration

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║      🚀 SBS Landing Page - Deployment to brainsait.cloud            ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify prerequisites
echo "📋 Step 1: Verifying prerequisites..."
echo ""

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! docker network ls | grep -q "n8n_default"; then
    echo "❌ n8n network not found. Creating..."
    docker network create n8n_default
fi

if ! docker network ls | grep -q "sbs-source_default"; then
    echo "❌ SBS network not found. Creating..."
    docker network create sbs-source_default
fi

echo "✅ Prerequisites verified"
echo ""

# Step 2: Build the Docker image
echo "📦 Step 2: Building Docker image..."
echo ""
cd /root/sbs-landing
docker build -t sbs-landing:latest .
echo "✅ Docker image built successfully"
echo ""

# Step 3: Deploy with Docker Compose
echo "🚢 Step 3: Deploying to production..."
echo ""
docker compose down 2>/dev/null || true
docker compose up -d
echo "✅ Service deployed"
echo ""

# Step 4: Wait for service to be healthy
echo "⏳ Step 4: Waiting for service to be healthy..."
echo ""
sleep 10

for i in {1..30}; do
    if docker ps --filter "name=sbs-landing" --filter "health=healthy" | grep -q sbs-landing; then
        echo "✅ Service is healthy!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Step 5: Verify deployment
echo ""
echo "🔍 Step 5: Verifying deployment..."
echo ""

# Check if container is running
if ! docker ps | grep -q sbs-landing; then
    echo "❌ Container is not running!"
    docker logs sbs-landing --tail 50
    exit 1
fi

# Test health endpoint
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Step 6: Display status
echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                                                                      ║"
echo "║              ✅ DEPLOYMENT SUCCESSFUL                                ║"
echo "║                                                                      ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Deployment Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Main Domain:          https://brainsait.cloud"
echo "🔗 Alternative:          https://www.brainsait.cloud"
echo "📡 API Endpoint:         https://brainsait.cloud/api/submit-claim"
echo "💚 Health Check:         https://brainsait.cloud/health"
echo "📊 Metrics:              https://brainsait.cloud/api/metrics"
echo ""
echo "🔧 Backend Services:"
echo "  • Normalizer:          http://localhost:8000"
echo "  • Signer:              http://localhost:8001"
echo "  • Financial Rules:     http://localhost:8002"
echo "  • NPHIES Bridge:       http://localhost:8003"
echo "  • n8n Webhook:         https://n8n.srv791040.hstgr.cloud/webhook/sbs-claim-submission"
echo ""
echo "🐳 Container Status:"
docker ps --filter "name=sbs-landing" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "📝 View logs: docker logs sbs-landing -f"
echo "🔄 Restart: docker compose restart"
echo "🛑 Stop: docker compose down"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Your SBS Landing Page is now live at https://brainsait.cloud"
echo ""
