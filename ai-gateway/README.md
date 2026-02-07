# SBS AI Gateway

A small gateway service that provides a stable internal endpoint for the Normalizer Copilot to call.

## Endpoint

- `POST /chat`
- `GET /health`

## Why this exists

- Normalizer-service can remain **gated + safe-by-default**.
- This gateway can be deployed behind your existing **IoT gateway**, **n8n automation**, or **Cloudflare AI Gateway**.

## Configuration

### Option A — n8n webhook (recommended)
Set:
- `N8N_WEBHOOK_URL=https://<your-n8n>/webhook/<id>`

Your n8n workflow should return either:
- `{ "reply": "..." }`

or OpenAI-like:
- `{ "choices": [{ "message": { "content": "..." } }] }`

### Option B — Cloudflare AI Gateway (OpenAI-compatible)
Set:
- `CLOUDFLARE_AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/openai`
- `CLOUDFLARE_API_TOKEN=<token>`

The gateway calls `${CLOUDFLARE_AI_GATEWAY_URL}/chat/completions`.

## Wiring

### Normalizer-service
Set:
- `AI_COPILOT_URL=http://ai-gateway:8010/chat`

If you enabled `AI_GATEWAY_SHARED_SECRET` on the gateway, set:

```bash
export AI_COPILOT_API_KEY=<same-token>
```

Normalizer will send `Authorization: Bearer <AI_COPILOT_API_KEY>`.

### Landing
No change required if Landing proxies to normalizer copilot (default behavior).

## Safety

- Redacts obvious secret patterns
- Truncates long replies
- Avoids logging raw content by default
