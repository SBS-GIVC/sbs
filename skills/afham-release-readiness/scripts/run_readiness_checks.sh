#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT_DIR"

echo "[info] AFHAM readiness checks in: $ROOT_DIR"

run_check() {
  local label="$1"
  shift
  echo "\n[check] $label"
  if "$@"; then
    echo "[pass] $label"
  else
    echo "[fail] $label"
    return 1
  fi
}

# Basic repository health checks
run_check "git status available" git status --short
run_check "python import json" python -c "import json; print('ok')"

# Deterministic config integrity checks
run_check "primary docker-compose exists" test -f docker-compose.yml
run_check "production docker-compose exists" test -f docker/docker-compose.production.yml
run_check "validate main n8n workflow JSON" python -m json.tool n8n-workflows/sbs-production-workflow.json >/dev/null
run_check "validate integration n8n workflow JSON" python -m json.tool n8n-workflows/sbs-integration-v5-fixed.json >/dev/null

# Lightweight test target chosen for speed and reliability
if command -v pytest >/dev/null 2>&1; then
  run_check "shared module unit tests" env PYTHONPATH=. pytest -q tests/test_shared_modules.py
else
  echo "[warn] pytest not available; skipping Python unit checks"
fi

echo "\n[info] Completed AFHAM readiness baseline checks"
