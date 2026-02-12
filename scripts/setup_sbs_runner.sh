#!/usr/bin/env bash
set -euo pipefail

# Setup a GitHub Actions self-hosted runner for SBS-GIVC/sbs
# Requires: curl, tar, python3

GH_OWNER="${GH_OWNER:-SBS-GIVC}"
GH_REPO="${GH_REPO:-sbs}"
API_VERSION="${API_VERSION:-2022-11-28}"
RUNNER_NAME="${RUNNER_NAME:-brainsait-pi}"
RUNNER_LABELS="${RUNNER_LABELS:-brainsait-pi,arm64}"
WORKDIR="${WORKDIR:-$HOME/actions-runner}"
WORK_FOLDER_NAME="${WORK_FOLDER_NAME:-_work}"
RUNNER_ARCH="${RUNNER_ARCH:-linux-arm64}"
START_RUNNER="${START_RUNNER:-0}"

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "ERROR: GH_TOKEN is required. Export a GitHub token with repo/admin access." >&2
  exit 1
fi

mkdir -p "${WORKDIR}"
cd "${WORKDIR}"

get_registration_token() {
  curl -sSL -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "X-GitHub-Api-Version: ${API_VERSION}" \
    "https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/actions/runners/registration-token" \
    | python3 - <<'PY'
import json,sys
try:
    data=json.load(sys.stdin)
    print(data["token"])
except Exception as e:
    sys.stderr.write(f"Failed to parse token: {e}\n")
    sys.exit(1)
PY
}

get_download_url() {
  curl -sSL \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "X-GitHub-Api-Version: ${API_VERSION}" \
    "https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/actions/runners/downloads" \
    | python3 - <<'PY'
import json,sys,os
arch=os.environ.get("RUNNER_ARCH","linux-arm64")
try:
    data=json.load(sys.stdin)
    matches=[d for d in data if d.get("os")=="linux" and arch in d.get("architecture",""+arch)]
    if not matches:
        # fallback: match on filename
        matches=[d for d in data if arch in d.get("filename","")]
    if not matches:
        raise SystemExit(f"No runner download found for arch: {arch}")
    print(matches[0]["download_url"])
except Exception as e:
    sys.stderr.write(f"Failed to find download URL: {e}\n")
    sys.exit(1)
PY
}

REG_TOKEN=$(get_registration_token)
DOWNLOAD_URL=$(get_download_url)
ARCHIVE_NAME=$(basename "${DOWNLOAD_URL}")

echo "Downloading runner: ${ARCHIVE_NAME}"
curl -L -o "${ARCHIVE_NAME}" "${DOWNLOAD_URL}"

if [[ -d "${WORKDIR}/bin" ]]; then
  echo "Runner already extracted in ${WORKDIR}. Skipping extraction."
else
  tar xzf "${ARCHIVE_NAME}"
fi

echo "Configuring runner..."
./config.sh \
  --url "https://github.com/${GH_OWNER}/${GH_REPO}" \
  --token "${REG_TOKEN}" \
  --name "${RUNNER_NAME}" \
  --labels "${RUNNER_LABELS}" \
  --work "${WORK_FOLDER_NAME}"

echo "Runner configured."
if [[ "${START_RUNNER}" == "1" ]]; then
  echo "Starting runner..."
  ./run.sh
else
  echo "To start the runner: cd ${WORKDIR} && ./run.sh"
fi
