#!/usr/bin/env sh
set -eu

# Starts the SBS stack locally (no Docker) using per-service virtualenvs.
# Logs are written to .runlogs/*.log

# First-time setup:
#   ./scripts/bootstrap-local-stack.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGDIR="$ROOT/.runlogs"
PGDATA="$ROOT/.pgdata"

mkdir -p "$LOGDIR"

echo "[start-local-stack] repo: $ROOT"

# -----------------------------------------------------------------------------
# 1) PostgreSQL (local)
# -----------------------------------------------------------------------------
if ! command -v postgres >/dev/null 2>&1; then
  echo "ERROR: postgres not installed. On Alpine: sudo apk add postgresql postgresql-client" >&2
  exit 1
fi

mkdir -p "$PGDATA"
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "[postgres] initdb -> $PGDATA"
  initdb -D "$PGDATA" -A trust -U postgres >/dev/null
fi

# Postgres needs a socket/lock dir on Alpine
sudo mkdir -p /run/postgresql
sudo chown "$(id -un)":"$(id -gn)" /run/postgresql

# Start (idempotent)
if ! pgrep -a postgres | grep -q "$PGDATA"; then
  echo "[postgres] starting"
  nohup postgres -D "$PGDATA" -p 5432 -c listen_addresses=127.0.0.1 -c unix_socket_directories=/run/postgresql > "$ROOT/.pg.log" 2>&1 &
  sleep 1
fi

# Create DB + load schema
psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE sbs_integration;" >/dev/null 2>&1 || true
psql -h 127.0.0.1 -U postgres -d sbs_integration -f "$ROOT/database/schema.sql" >/dev/null 2>&1 || true

# -----------------------------------------------------------------------------
# 2) Services
# -----------------------------------------------------------------------------
# Stop any previous instances
pkill -f "uvicorn .*--port 8000" 2>/dev/null || true
pkill -f "uvicorn .*--port 8001" 2>/dev/null || true
pkill -f "uvicorn .*--port 8002" 2>/dev/null || true
pkill -f "uvicorn .*--port 8003" 2>/dev/null || true
pkill -f "node server\.js" 2>/dev/null || true
sleep 1

echo "[services] starting normalizer (8000)"
(
  cd "$ROOT/normalizer-service"
  PYTHONPATH="$ROOT" DB_HOST=127.0.0.1 DB_NAME=sbs_integration DB_USER=postgres DB_PASSWORD='' \
    nohup ./.venv/bin/uvicorn main_enhanced:app --host 0.0.0.0 --port 8000 > "$LOGDIR/normalizer.log" 2>&1 &
)

echo "[services] starting signer (8001)"
(
  cd "$ROOT/signer-service"
  DB_HOST=127.0.0.1 DB_NAME=sbs_integration DB_USER=postgres DB_PASSWORD='' CERT_BASE_PATH="$ROOT/certs" NPHIES_ENV=sandbox \
    nohup ./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 > "$LOGDIR/signer.log" 2>&1 &
)

echo "[services] starting financial rules (8002)"
(
  cd "$ROOT/financial-rules-engine"
  DB_HOST=127.0.0.1 DB_NAME=sbs_integration DB_USER=postgres DB_PASSWORD='' \
    nohup ./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8002 > "$LOGDIR/financial.log" 2>&1 &
)

echo "[services] starting nphies bridge (8003, mock)"
(
  cd "$ROOT/nphies-bridge"
  DB_HOST=127.0.0.1 DB_NAME=sbs_integration DB_USER=postgres DB_PASSWORD='' ENABLE_MOCK_NPHIES=true NPHIES_API_KEY='' \
    nohup ./.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8003 > "$LOGDIR/nphies.log" 2>&1 &
)

echo "[services] starting landing (3000, no rate-limit)"
(
  cd "$ROOT/sbs-landing"
  PORT=3000 NODE_ENV=test DISABLE_RATE_LIMIT=true ENABLE_MOCK_PROCESSING=false \
    SBS_NORMALIZER_URL=http://localhost:8000 \
    SBS_FINANCIAL_RULES_URL=http://localhost:8002 \
    SBS_SIGNER_URL=http://localhost:8001 \
    SBS_NPHIES_BRIDGE_URL=http://localhost:8003 \
    nohup node server.js > "$LOGDIR/landing.log" 2>&1 &
)

sleep 2

# Ensure signer has a cert for facility 1 (idempotent)
curl -sS -X POST "http://localhost:8001/generate-test-cert?facility_id=1" >/dev/null || true

echo "[start-local-stack] listening ports:"
netstat -tlnp 2>/dev/null | grep -E ':(3000|8000|8001|8002|8003)\\b' || true

echo "[start-local-stack] OK"
