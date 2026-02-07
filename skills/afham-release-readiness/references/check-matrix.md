# Check Matrix

Use this matrix to select targeted checks after running the default readiness script.

## Python services

- Scope: `services/**`, `*-service/**`, `shared/**`, `tests/**`
- Suggested commands:
  - `pytest -q tests/test_shared_modules.py`
  - `pytest -q tests/test_claim_workflow.py`
  - `pytest -q services/normalizer/tests`

## Frontend (`sbs-landing`)

- Scope: `sbs-landing/src/**`, `sbs-landing/public/**`, `sbs-landing/server.*`
- Suggested commands:
  - `npm --prefix sbs-landing ci`
  - `npm --prefix sbs-landing run build`

## Deployment and infra

- Scope: `docker/**`, `deploy/**`, `k8s-production/**`, `scripts/deploy/**`
- Suggested commands:
  - `bash scripts/maintenance/production-health-check.sh` (when env vars exist)
  - `bash k8s-production/verify-deployment.sh` (when kube context is configured)

## Workflow/N8N artifacts

- Scope: `n8n-workflows/**`
- Suggested commands:
  - `python -m json.tool n8n-workflows/sbs-production-workflow.json >/dev/null`
  - `python -m json.tool n8n-workflows/sbs-integration-v5-fixed.json >/dev/null`
