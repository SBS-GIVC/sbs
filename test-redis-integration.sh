#!/bin/bash
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Testing Redis Integration & New Tools                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test Redis
echo "=== TEST 1: Redis Health Check ==="
docker exec sbs-redis redis-cli ping
echo ""

# Test Redis set/get
echo "=== TEST 2: Redis SET/GET Test ==="
docker exec sbs-redis redis-cli SET test_key "SBS_Redis_Working"
docker exec sbs-redis redis-cli GET test_key
echo ""

# Test Frontend (AI Tools)
echo "=== TEST 3: Frontend AI Tools (Port 3000) ==="
curl -s http://localhost:3000/ | grep -o "<title>.*</title>" | head -1
echo ""

# Test DeepSeek AI
echo "=== TEST 4: DeepSeek AI API ==="
curl -s -X POST http://localhost:3000/api/gemini/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Test Redis caching"}' | jq -r '.success, .model' | head -2
echo ""

# Test Grafana
echo "=== TEST 5: Grafana Dashboard ==="
curl -s -I http://localhost:3001/ | grep "HTTP\|Location" | head -2
echo ""

# Test Redis Commander
echo "=== TEST 6: Redis Commander UI ==="
curl -s -I http://localhost:8081/ | grep "HTTP" | head -1
echo ""

# Test Prometheus
echo "=== TEST 7: Prometheus Metrics ==="
curl -s http://localhost:9090/-/healthy
echo ""

# Redis Stats
echo "=== TEST 8: Redis Statistics ==="
docker exec sbs-redis redis-cli INFO stats | grep total_commands_processed
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              All Tests Complete                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
