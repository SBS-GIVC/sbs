# SBS Integration Engine – AI Coding Agent Guide

## Big picture
- Microservices pipeline: Landing API (Node) → Normalizer (FastAPI) → Financial Rules → Signer → NPHIES Bridge.
- Services/ports: normalizer 8000, signer 8001, financial-rules 8002, nphies-bridge 8003, landing 3000, n8n 5678.
- Orchestration and claim tracking live in `sbs-landing/server.js`; in-memory `claimStore` is dev-only.

## Key patterns (repo-specific)
- Normalizer uses DB pooling + rate limiting + request IDs in `normalizer-service/main_enhanced.py`.
- AI provider gating in `normalizer-service/feature_flags.py`: DeepSeek default in staging when key set; production requires `ENABLE_DEEPSEEK=true`.
- AI fallback is deterministic when no endpoint configured (`services/normalizer/ai_fallback.py`).
- NPHIES bridge retries with exponential backoff + logs transactions (`nphies-bridge/main.py`).
- Signer uses PKCS#1 v1.5 + SHA-256 and validates certificate paths (`signer-service/main.py`).
- Financial rules apply bundles + facility tier markups (`financial-rules-engine/main.py`).

## Local workflows
- Start stack: `docker-compose up -d` (see `docker-compose.yml` / `docker-compose.services.yml`).
- Health checks: `curl http://localhost:8000/health` and landing `/api/services/status`.
- Python integration test: `python -m pytest tests/test_claim_workflow.py -v`.
- DeepSeek CI smoke tests: `.github/workflows/ci-deepseek.yml` (requires `DEEPSEEK_API_KEY`).

## Conventions & gotchas
- CORS is explicit via `ALLOWED_ORIGINS`/`CORS_ORIGIN`; no wildcards in production.
- Use `.env` files; never commit secrets.
- FHIR payloads follow Claim resource structure; see `tests/test_claim_workflow.py`.
- Use `utils/retry_circuit.py` for retry/circuit breaker behavior when adding external calls.

## Reference files
- `sbs-landing/server.js`
- `normalizer-service/main_enhanced.py`
- `normalizer-service/feature_flags.py` / `services/normalizer/ai_fallback.py`
- `financial-rules-engine/main.py`, `signer-service/main.py`, `nphies-bridge/main.py`
