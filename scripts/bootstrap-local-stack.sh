#!/usr/bin/env sh
set -eu

# Bootstraps local prerequisites for running the SBS stack without Docker.
# Intended for Alpine-based devcontainers.
#
# What it does:
# - Installs system packages (postgresql, nodejs, npm) if missing
# - Creates per-service Python venvs and installs pinned requirements
# - Installs Landing (Node) dependencies
# - Creates tests venv and installs test requirements

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

apk_install() {
  if need_cmd sudo; then
    sudo apk add --no-cache "$@"
  else
    apk add --no-cache "$@"
  fi
}

echo "[bootstrap] repo: $ROOT"

echo "[bootstrap] installing system deps (if missing)"
if ! need_cmd psql; then
  apk_install postgresql postgresql-client postgresql-contrib
fi
if ! need_cmd node; then
  apk_install nodejs npm
fi
if ! need_cmd python; then
  echo "ERROR: python not found" >&2
  exit 1
fi
if ! need_cmd pip3; then
  apk_install py3-pip
fi

echo "[bootstrap] creating Python venvs"
python -m venv "$ROOT/normalizer-service/.venv" || true
"$ROOT/normalizer-service/.venv/bin/python" -m pip install -U pip >/dev/null
"$ROOT/normalizer-service/.venv/bin/python" -m pip install -r "$ROOT/normalizer-service/requirements.txt" >/dev/null

python -m venv "$ROOT/signer-service/.venv" || true
"$ROOT/signer-service/.venv/bin/python" -m pip install -U pip >/dev/null
"$ROOT/signer-service/.venv/bin/python" -m pip install -r "$ROOT/signer-service/requirements.txt" >/dev/null

python -m venv "$ROOT/financial-rules-engine/.venv" || true
"$ROOT/financial-rules-engine/.venv/bin/python" -m pip install -U pip >/dev/null
"$ROOT/financial-rules-engine/.venv/bin/python" -m pip install -r "$ROOT/financial-rules-engine/requirements.txt" >/dev/null

python -m venv "$ROOT/nphies-bridge/.venv" || true
"$ROOT/nphies-bridge/.venv/bin/python" -m pip install -U pip >/dev/null
"$ROOT/nphies-bridge/.venv/bin/python" -m pip install -r "$ROOT/nphies-bridge/requirements.txt" >/dev/null

python -m venv "$ROOT/tests/.venv" || true
"$ROOT/tests/.venv/bin/python" -m pip install -U pip >/dev/null
"$ROOT/tests/.venv/bin/python" -m pip install -r "$ROOT/tests/requirements.txt" >/dev/null

echo "[bootstrap] installing Landing dependencies"
cd "$ROOT/sbs-landing"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[bootstrap] done"
