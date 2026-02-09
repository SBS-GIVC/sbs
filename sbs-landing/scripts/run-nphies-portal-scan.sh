#!/usr/bin/env bash
set -euo pipefail

IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.58.2-jammy}"
WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"
ARTIFACT_DIR="$WORKDIR/artifacts/nphies-portal"
RUN_TIMEOUT="${NPHIES_RUN_TIMEOUT_SEC:-300}"
NPHIES_PROXY_URL="${NPHIES_PROXY_URL:-}"

read -r -p "National/Iqama ID for Nafath: " NAFATH_NATIONAL_ID
read -r -p "NPHIES email (optional legacy flow): " NPHIES_EMAIL
NPHIES_PASSWORD=""
if [ -n "$NPHIES_EMAIL" ]; then
  read -r -s -p "NPHIES password (optional): " NPHIES_PASSWORD
  echo
fi
read -r -p "OTP (optional, if portal asks for it): " NPHIES_OTP

export NPHIES_EMAIL NPHIES_PASSWORD NPHIES_OTP NAFATH_NATIONAL_ID

mkdir -p "$ARTIFACT_DIR"
rm -f "$ARTIFACT_DIR"/summary.json "$ARTIFACT_DIR"/links.json "$ARTIFACT_DIR"/form-hints.json "$ARTIFACT_DIR"/01-landing.png "$ARTIFACT_DIR"/02-after-login-attempt.png || true

echo "Preflight network check (container -> NPHIES endpoints)..."
set +e
docker run --rm \
  -e HTTPS_PROXY \
  -e HTTP_PROXY \
  -e NO_PROXY \
  -e NPHIES_PROXY_URL \
  -v "$WORKDIR":/work \
  -w /work \
  "$IMAGE" \
  /bin/bash -lc 'set -e; \
    echo -n "portal DNS: "; getent hosts portal.nphies.sa | head -n 1 || echo "unresolved"; \
    echo -n "sso DNS: "; getent hosts sso.nphies.sa | head -n 1 || echo "unresolved"; \
    echo -n "sso HTTPS: "; (curl -I -m 12 -sS https://sso.nphies.sa/auth/ | head -n 1) || echo "unreachable"'
set -e
echo

set +e
docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e NPHIES_EMAIL \
  -e NPHIES_PASSWORD \
  -e NPHIES_OTP \
  -e NAFATH_NATIONAL_ID \
  -e NPHIES_AUTH_MODE="${NPHIES_AUTH_MODE:-nafath}" \
  -e NPHIES_PROXY_URL \
  -e HTTPS_PROXY \
  -e HTTP_PROXY \
  -e NO_PROXY \
  -e NPHIES_ARTIFACT_DIR=artifacts/nphies-portal \
  -e NAFATH_APPROVAL_WAIT_MS="${NAFATH_APPROVAL_WAIT_MS:-180000}" \
  -e NPHIES_LOGIN_NAV_TIMEOUT_MS="${NPHIES_LOGIN_NAV_TIMEOUT_MS:-7000}" \
  -e NPHIES_LOGIN_NAV_POST_WAIT_MS="${NPHIES_LOGIN_NAV_POST_WAIT_MS:-800}" \
  -e NPHIES_TIMEOUT_MS="${NPHIES_TIMEOUT_MS:-35000}" \
  -e NPHIES_EXTRA_WAIT_MS="${NPHIES_EXTRA_WAIT_MS:-3000}" \
  -v "$WORKDIR":/work \
  -w /work \
  "$IMAGE" \
  /bin/bash -lc "timeout ${RUN_TIMEOUT}s npm run nphies:scan"
SCAN_EXIT=$?
set -e

echo
if [ "$SCAN_EXIT" -eq 124 ]; then
  echo "Scan timed out after ${RUN_TIMEOUT}s before completion."
elif [ "$SCAN_EXIT" -ne 0 ]; then
  echo "Scan exited with code: $SCAN_EXIT"
fi

if [ -f "$ARTIFACT_DIR/summary.json" ]; then
  echo "Artifacts written to: $ARTIFACT_DIR"
  python3 - <<'PY'
import json
from pathlib import Path
p = Path("artifacts/nphies-portal/summary.json")
j = json.loads(p.read_text())
print("Summary snapshot:")
print(" - startedAt:", j.get("startedAt"))
print(" - finishedAt:", j.get("finishedAt"))
print(" - loginAttempted:", j.get("loginAttempted"))
print(" - loginLikelySuccessful:", j.get("loginLikelySuccessful"))
print(" - currentUrl:", j.get("currentUrl"))
notes = j.get("notes") or []
if notes:
    print(" - notes:")
    for n in notes:
        print("   *", n)
PY
else
  echo "No summary.json generated. Check network reachability to portal/SSO and retry."
fi
