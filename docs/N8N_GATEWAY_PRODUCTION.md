# n8n Gateway Productionization (Eligibility + Copilot)

This guide describes a production-grade way to run **n8n as the orchestration gateway** for:

- **Eligibility** checks (Landing → eligibility-service → n8n webhook)
- **Copilot** chat (Landing → normalizer-service copilot → ai-gateway → n8n webhook)

The design goals are:
- deterministic/safe fallback at every hop
- no secrets in git
- controlled ingress (Tailscale / reverse proxy / Cloudflare)
- clear environment variable wiring

---

## Architecture

### Eligibility
1. UI calls `POST /api/eligibility/check` (Landing)
2. Landing proxies to `SBS_ELIGIBILITY_URL/check`
3. eligibility-service either:
   - local rules (offline) OR
   - forwards to n8n webhook (`ELIGIBILITY_UPSTREAM_URL`)

### Copilot
1. UI calls `POST /api/copilot/chat` (Landing)
2. Landing injects **sanitized claim telemetry** into the context and proxies to `normalizer-service /copilot/chat`
3. normalizer-service either:
   - deterministic reply (offline) OR
   - forwards to `AI_COPILOT_URL` (ai-gateway)
4. ai-gateway routes to n8n webhook (`AI_GATEWAY_N8N_WEBHOOK_URL`) and returns `{reply}`

---

## Security baseline (recommended)

### 1) Put n8n behind a private network
Recommended order:
- **Tailscale** for private admin + webhook access
- Optional reverse proxy (Caddy/Nginx) for TLS termination

### 2) Require a token for ai-gateway
If you expose ai-gateway beyond localhost, set:

```bash
AI_GATEWAY_SHARED_SECRET=<random-long-token>
AI_COPILOT_API_KEY=<same-token>
```

Normalizer will send `Authorization: Bearer <AI_COPILOT_API_KEY>`.

### 3) Lock down n8n webhooks
Options:
- keep n8n webhooks only on the internal docker network
- OR protect the webhook endpoints using:
  - n8n auth mechanisms
  - or a reverse proxy ACL
  - or Tailscale ACLs

---

## Workflows provided in this repo

These are shipped as JSON exports (import into n8n):

- `sbs-landing/n8n-workflow-ai-copilot-gateway.json`
  - webhook: `POST /webhook/sbs-ai-chat`
  - returns: `{ reply, provider, model, timestamp }`

- `sbs-landing/n8n-workflow-eligibility-gateway.json`
  - webhook: `POST /webhook/sbs-eligibility-check`
  - returns: `{ eligible, plan, benefits, coverage, notes, source }`

- `sbs-landing/n8n-workflow-sbs-complete.json`
  - end-to-end pipeline template

### Importing workflows into n8n

n8n does **not** automatically activate JSON files mounted into the container.
Import them once, then activate.

If you’re running via docker compose:

```bash
docker compose exec -T n8n n8n import:workflow --input /home/node/.n8n/workflows/sbs-ai-chat.json
docker compose exec -T n8n n8n import:workflow --input /home/node/.n8n/workflows/sbs-eligibility.json
docker compose exec -T n8n n8n import:workflow --input /home/node/.n8n/workflows/sbs-complete-pipeline.json
```

Then in the n8n UI, **activate** the workflows so webhooks respond.

---

## Environment wiring (copy/paste)

### Landing
```bash
export SBS_ELIGIBILITY_URL=http://eligibility-service:8004
export SBS_COPILOT_MODE=auto
# export SBS_INTERNAL_COPILOT_URL=http://normalizer-service:8000/copilot/chat  # optional override
```

### eligibility-service → n8n
Point eligibility-service to the webhook URL:

```bash
export ELIGIBILITY_UPSTREAM_URL=http://n8n:5678/webhook/sbs-eligibility-check
# optional:
export ELIGIBILITY_UPSTREAM_API_KEY=
```

### normalizer-service → ai-gateway → n8n
```bash
export AI_COPILOT_URL=http://ai-gateway:8010/chat
export AI_COPILOT_TIMEOUT_SECONDS=12

# If you enable token protection on ai-gateway
export AI_COPILOT_API_KEY=<same-as-AI_GATEWAY_SHARED_SECRET>
```

### ai-gateway → n8n
```bash
export AI_GATEWAY_N8N_WEBHOOK_URL=http://n8n:5678/webhook/sbs-ai-chat

# optional: protect ai-gateway
export AI_GATEWAY_SHARED_SECRET=<random-long-token>
```

---

## DeepSeek direct (n8n workflow)

The shipped workflow `sbs-landing/n8n-workflow-ai-copilot-gateway.json` can call
DeepSeek directly (OpenAI-compatible) when `DEEPSEEK_API_KEY` is present in the
**n8n container environment**.

Set (via compose env or secrets manager):

```bash
export DEEPSEEK_API_KEY=<YOUR_DEEPSEEK_API_KEY>
export DEEPSEEK_MODEL=deepseek-chat
export DEEPSEEK_BASE_URL=https://api.deepseek.com
export ENVIRONMENT=production
export ENABLE_DEEPSEEK=true
```

If the key is missing, the workflow automatically falls back to deterministic
responses using the provided telemetry.

## Operational guidance

### Health checks
- Landing: `GET /health`
- Eligibility: `GET http://<host>:8004/health`
- ai-gateway: `GET http://<host>:8010/health`
- n8n: `GET http://<host>:5678/`

### Observability
- Copilot requests include a `context.telemetry` object when claimId is known.
- Claim analyzer: `GET /api/claims/:claimId/analyzer` provides risk signals and recommendations.

### Deployment tips
- Prefer running n8n with persistent volume and backups.
- Use a secrets manager (Vault/Cloudflare Secrets/AWS/GCP/Azure).
- Rotate:
  - provider keys (DeepSeek/Gemini)
  - `AI_GATEWAY_SHARED_SECRET`
  - any n8n webhook tokens

---

## Next step (recommended)

Tell me which provider you want n8n to call for Copilot (DeepSeek via Cloudflare, or direct internal proxy), and I’ll generate an n8n workflow that:
- calls the model
- applies redaction + guardrails
- returns a consistent `{reply}` format
- logs minimal metadata (no PHI)
