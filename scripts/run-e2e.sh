#!/usr/bin/env sh
set -eu

# Runs end-to-end tests against a running local stack.
# Assumes services are already running (use scripts/start-local-stack.sh).

# First-time setup:
#   ./scripts/bootstrap-local-stack.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/tests/.venv/bin/python"

if [ ! -x "$PY" ]; then
  echo "ERROR: tests venv not found at $PY" >&2
  echo "Create it with: python -m venv tests/.venv && tests/.venv/bin/python -m pip install -r tests/requirements.txt" >&2
  exit 1
fi

# Quick readiness checks
# Required services for E2E suite
required_urls="http://localhost:3000/health http://localhost:8000/health http://localhost:8001/health http://localhost:8002/health http://localhost:8003/health"

# Optional services (only enforced when explicitly configured)
optional_urls=""
if [ "${SBS_ELIGIBILITY_URL:-}" != "" ]; then
  # If user configured eligibility URL, require it.
  optional_urls="$optional_urls http://localhost:8004/health"
fi
if [ "${AI_COPILOT_URL:-}" != "" ] || [ "${AI_GATEWAY_N8N_WEBHOOK_URL:-}" != "" ] || [ "${CLOUDFLARE_AI_GATEWAY_URL:-}" != "" ]; then
  # If user configured an AI gateway, require it.
  optional_urls="$optional_urls http://localhost:8010/health"
fi

for url in $required_urls $optional_urls; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)
  if [ "$code" != "200" ]; then
    echo "ERROR: $url not ready (HTTP $code)" >&2
    exit 1
  fi
done

# Run the E2E matrix + simulator live check
cd "$ROOT"
exec "$PY" -m pytest \
  tests/test_workflow_pipeline_scenarios.py \
  tests/test_workflow_simulator_live.py \
  -v
