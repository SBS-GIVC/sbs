# Local End-to-End (No Docker)

This repo is typically run via Docker Compose. For devcontainers/environments **without Docker**, you can run the full workflow pipeline locally:

- Local PostgreSQL (loaded with `database/schema.sql` sample data)
- normalizer-service (8000)
- signer-service (8001)
- financial-rules-engine (8002)
- nphies-bridge (8003) in **mock mode**
- sbs-landing (3000) with rate limiting disabled for test runs

Optional (recommended for the Command Center UI):
- eligibility-service (8004)
- ai-gateway (8010) for Copilot routing (n8n-first)

## One-time bootstrap

```bash
./scripts/bootstrap-local-stack.sh
```

Installs missing system deps (Alpine: `postgresql`, `nodejs`, `npm`, `py3-pip`) and creates per-service Python virtualenvs + a test virtualenv.

## Start the local stack

```bash
./scripts/start-local-stack.sh
```

Notes:
- Uses `ENABLE_MOCK_NPHIES=true` so you don’t need real NPHIES credentials.
- Generates a signer test certificate for `facility_id=1` automatically.
- Logs are written to `.runlogs/*.log`.

## Run end-to-end tests

```bash
./scripts/run-e2e.sh
```

### What’s covered
- `tests/test_workflow_pipeline_scenarios.py`: Landing → Normalizer → Financial Rules → Signer → NPHIES Bridge
  - claim types: professional / institutional / pharmacy / vision
  - NPHIES outcomes (mocked): accepted / rejected / error
  - upload variants: none / pdf / json / xml
  - invalid uploads: txt / exe (expects HTTP 400)
- `tests/test_workflow_simulator_live.py`: executes `tests/workflow_simulator.py` against the running services to ensure simulator contract stays aligned.

## Environment switches

- `DISABLE_RATE_LIMIT=true` or `NODE_ENV=test` disables Landing API rate limiting (needed for polling-heavy E2E matrices).
- `ENABLE_MOCK_NPHIES=true` makes the NPHIES bridge return deterministic mock responses.

### Optional: Eligibility service

If you run the eligibility service locally, point Landing to it:

```bash
export SBS_ELIGIBILITY_URL=http://localhost:8004
```

### Optional: Copilot gateway (n8n-first)

If you run `ai-gateway` locally and want Copilot to route via n8n:

```bash
export AI_COPILOT_URL=http://localhost:8010/chat
export AI_GATEWAY_N8N_WEBHOOK_URL=http://localhost:5678/webhook/<your-webhook>
```

See also: `docs/N8N_GATEWAY_PRODUCTION.md` for production-grade n8n gateway wiring.

