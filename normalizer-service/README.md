# SBS Normalizer Service

This service exposes the `/normalize` endpoint and integrates with AI mapping services when a deterministic match is missing. The enhanced entry point (`main_enhanced.py`) wires in rate limiting, Prometheus-style metrics, and request IDs.

## Environment configuration

1. Copy `.env.example` to `normalizer-service/.env` and populate the placeholders with secrets loaded from your vault or secret manager.
2. The service uses the following keys:
   * `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` – PostgreSQL connection.
   * `ALLOWED_ORIGINS` or `CORS_ORIGIN` – control which front-ends can call the service.
   * `AI_PROVIDER`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `AI_URL` – determine which AI endpoint is used when `ai_assistant.query_ai_for_mapping` runs.
   * `AI_FALLBACK_ENDPOINT`, `AI_FALLBACK_API_KEY` – optional external endpoint used by `services/normalizer/ai_fallback.py` when local deterministic hints are not enough.
3. Keep `.env` out of version control (the repo `.gitignore` already covers it) and never paste real secrets into commits.

## Enabling AI capabilities

* Set `AI_PROVIDER` to `gemini` or `deepseek` and supply the matching API key (`GEMINI_API_KEY` or `DEEPSEEK_API_KEY`), or point `AI_URL` at a tenant-specific LLM proxy.
* DeepSeek is gated via a feature flag `ENABLE_DEEPSEEK` (default: false). In staging set `ENABLE_DEEPSEEK=true` in your environment or release pipeline to enable the provider for testing before promoting to production.
* When `AI_FALLBACK_ENDPOINT` and `AI_FALLBACK_API_KEY` are present, the `services/normalizer/ai_fallback` module can pretend to call an LLM while falling back to deterministic mappings in tests.
* For best results, pair the AI provider with request tracing, retries (see `utils/retry_circuit.py`), and audit logging of suggestions.

### Secret rotation and storage

* Store `DEEPSEEK_API_KEY` in a central secrets manager (Vault, AWS Secrets Manager, Azure Key Vault, GitHub Actions secrets) and do NOT commit it into source control.
* When a secret is suspected to have leaked, rotate it immediately in the provider console and update the secret in the secrets manager; then purge the old value from git history using `git filter-repo` or the BFG Repo-Cleaner.
* Use CI/CD to inject secrets into runtime environment variables at deployment time rather than baking them into images.

## Running locally

```bash
cd normalizer-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main_enhanced:app --reload --host 0.0.0.0 --port 8000
```

## Testing AI fallback

```bash
pytest services/normalizer/tests/test_ai_fallback.py -q
```

Those tests cover deterministic fallbacks and the mocked AI call path.

## Security best practices

* Pull secrets from a dedicated secrets store instead of embedding them into `.env` files.
* Rotate API keys after a suspected leak and purge them from Git history using `git filter-repo` or the BFG Repo-Cleaner.
* Inject secrets at runtime via environment variables, CI/CD pipeline secrets, or Docker secrets when deploying containers.
