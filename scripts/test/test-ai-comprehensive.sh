#!/bin/bash

echo "🧪 Comprehensive AI Tools Test"
echo "======================================"
echo ""

# Test 1: DeepSeek AI - SBS Code Lookup
echo "1️⃣ Testing DeepSeek AI - SBS Code Lookup..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/gemini/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the SBS code for MRI scan of the brain?", "systemInstruction": "You are a Saudi healthcare billing expert."}')
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
MODEL=$(echo "$RESPONSE" | jq -r '.model')
TEXT=$(echo "$RESPONSE" | jq -r '.text' | head -c 150)

if [ "$SUCCESS" = "true" ] && [ "$MODEL" = "deepseek-chat" ]; then
    echo "   ✅ PASS - DeepSeek responding: $TEXT..."
else
    echo "   ❌ FAIL - Expected deepseek-chat, got: $MODEL"
fi
echo ""

# Test 2: AI Claim Validation
echo "2️⃣ Testing AI - Claim Validation..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/gemini/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Validate this claim: CBC blood test, ICD-10: Z00.00, Amount: 150 SAR"}')
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    echo "   ✅ PASS - AI validation working"
else
    echo "   ❌ FAIL"
fi
echo ""

# Test 3: AI Diagnosis Suggestion
echo "3️⃣ Testing AI - Diagnosis Suggestion..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/gemini/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Suggest ICD-10 codes for chest pain"}')
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
if [ "$SUCCESS" = "true" ]; then
    echo "   ✅ PASS - AI diagnosis suggestion working"
else
    echo "   ❌ FAIL"
fi
echo ""

# Test 4: Redis Integration
echo "4️⃣ Testing Redis Cache..."
REDIS_PONG=$(docker exec sbs-redis redis-cli ping)
if [ "$REDIS_PONG" = "PONG" ]; then
    echo "   ✅ PASS - Redis responding"
else
    echo "   ❌ FAIL - Redis not responding"
fi
echo ""

# Test 5: Normalizer Service with Redis
echo "5️⃣ Testing Normalizer Service (with Redis cache)..."
RESPONSE=$(curl -s http://localhost:8000/health)
STATUS=$(echo "$RESPONSE" | jq -r '.status')
if [ "$STATUS" = "healthy" ]; then
    echo "   ✅ PASS - Normalizer healthy"
else
    echo "   ❌ FAIL - Normalizer unhealthy"
fi
echo ""

# Test 6: Frontend Accessibility
echo "6️⃣ Testing Frontend on port 3000..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ PASS - Frontend accessible"
else
    echo "   ❌ FAIL - Got HTTP $HTTP_CODE"
fi
echo ""

# Test 7: Grafana Dashboard
echo "7️⃣ Testing Grafana Dashboard..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/login)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ PASS - Grafana accessible"
else
    echo "   ❌ FAIL - Got HTTP $HTTP_CODE"
fi
echo ""

# Test 8: Redis Commander UI
echo "8️⃣ Testing Redis Commander UI..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/)
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ PASS - Redis Commander accessible"
else
    echo "   ❌ FAIL - Got HTTP $HTTP_CODE"
fi
echo ""

echo "======================================"
echo "✨ Comprehensive AI Tools Test Complete"
