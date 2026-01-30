#!/bin/bash
set -e

echo "========================================="
echo "  SBS Enhanced Deployment Script"
echo "  VPS + Cloudflare + Docker + n8n"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    exit 1
fi

echo "📋 Step 1: Stopping existing containers..."
cd /root/sbs-source
docker compose -f docker-compose.yml down 2>/dev/null || true
docker stop sbs-landing sbs-n8n sbs-normalizer sbs-signer sbs-financial-rules sbs-nphies-bridge 2>/dev/null || true

echo ""
echo "🗑️  Step 2: Removing old containers (keeping volumes)..."
docker rm -f sbs-landing sbs-n8n sbs-normalizer sbs-signer sbs-financial-rules sbs-nphies-bridge sbs-simulation 2>/dev/null || true

echo ""
echo "📥 Step 3: Pulling latest images from GitHub Registry..."
docker pull ghcr.io/fadil369/sbs-landing:main
docker pull ghcr.io/fadil369/sbs-normalizer:main
docker pull ghcr.io/fadil369/sbs-signer:main
docker pull ghcr.io/fadil369/sbs-financial-rules:main
docker pull ghcr.io/fadil369/sbs-nphies-bridge:main
docker pull n8nio/n8n:latest

echo ""
echo "🔧 Step 4: Checking environment variables..."
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found. Using defaults."
    echo "   Please create .env file with required variables."
fi

echo ""
echo "🌐 Step 5: Ensuring Traefik network exists..."
docker network inspect n8n_default >/dev/null 2>&1 || docker network create n8n_default

echo ""
echo "🚀 Step 6: Deploying enhanced configuration..."
docker compose -f docker-compose.enhanced.yml up -d

echo ""
echo "⏳ Step 7: Waiting for services to start..."
sleep 15

echo ""
echo "🔍 Step 8: Checking service health..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ Step 9: Testing service endpoints..."
echo ""

# Test internal services
services=("3000:Landing" "8000:Normalizer" "8001:Signer" "8002:Financial-Rules" "8003:NPHIES-Bridge" "5678:n8n")
for service in "${services[@]}"; do
    port="${service%%:*}"
    name="${service##*:}"
    if curl -sf http://localhost:$port/health >/dev/null 2>&1 || curl -sf http://localhost:$port >/dev/null 2>&1; then
        echo "✅ $name (port $port): Healthy"
    else
        echo "⚠️  $name (port $port): Not responding yet"
    fi
done

echo ""
echo "========================================="
echo "  🎉 Deployment Complete!"
echo "========================================="
echo ""
echo "📊 Service URLs:"
echo "  • Landing Page: https://brainsait.cloud"
echo "  • n8n Workflow: https://n8n.brainsait.cloud (after DNS)"
echo "  • Local n8n:    http://localhost:5678"
echo ""
echo "📝 Next Steps:"
echo "  1. Add DNS: n8n.brainsait.cloud → 82.25.101.65"
echo "  2. Wait 5-10 minutes for SSL certificate"
echo "  3. Access n8n at: https://n8n.brainsait.cloud"
echo ""
echo "🔍 View logs:"
echo "  docker compose -f docker-compose.enhanced.yml logs -f"
echo ""
echo "🔄 Restart services:"
echo "  docker compose -f docker-compose.enhanced.yml restart"
echo ""
