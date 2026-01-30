# Cloudflare Deployment Status Report

| Service | Type | Status | URL |
|---------|------|--------|-----|
| **Frontend** | Pages | ✅ Deployed | [https://sbs-landing.pages.dev](https://sbs-landing.pages.dev) |
| **API Gateway** | Worker  | ✅ Deployed | [https://sbs-landing-api.brainsait-fadil.workers.dev](https://sbs-landing-api.brainsait-fadil.workers.dev) |
| **Normalizer** | Worker  | ✅ Deployed | [https://sbs-normalizer.brainsait-fadil.workers.dev](https://sbs-normalizer.brainsait-fadil.workers.dev) |
| **Signer** | Worker | ⚠️ Image Pushed | Config pending |
| **Rules Engine** | Worker | ⚠️ Image Pushed | Config pending |
| **NPHIES Bridge** | Worker | ⚠️ Image Pushed | Config pending |

## Integration Testing
A test script has been created at `test_integration.py`.

### ⚠️ DNS Propagation Note
The test script failed with `NameResolutionError`. This is normal for newly created Cloudflare Workers subdomains. 
**Action:** Please wait 5-10 minutes for DNS to propagate, then run:
```bash
source .venv/bin/activate
python3 test_integration.py
```

## Configuration Details
- **Container Registry**: Images tagged `:v1` (amd64) and pushed.
- **Environment**: Virtual Env `.venv` created with dependencies.
- **Microservices**: 
    - `sbs-normalizer` is configured to run as a **Durable Object Container**.
    - `sbs-landing-api` is configured as the Gateway, proxying `/api` requests to internal/external services.
