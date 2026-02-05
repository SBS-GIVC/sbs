#!/usr/bin/env bash
set -euo pipefail

SRC_HTML="/home/hostinger/index.html"
DEST_DIR="/var/www/brainsait-cloud"
DEST_HTML="$DEST_DIR/index.html"

if [[ ! -f "$SRC_HTML" ]]; then
  echo "Source landing not found: $SRC_HTML" >&2
  exit 1
fi

if [[ ! -d "$DEST_DIR" ]]; then
  echo "Destination dir not found: $DEST_DIR" >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="${DEST_HTML}.bak.${TS}"

echo "[1/4] Backing up current landing (if present)..."
if sudo test -f "$DEST_HTML"; then
  sudo cp -a "$DEST_HTML" "$BACKUP"
  echo "  Backup: $BACKUP"
else
  echo "  No existing $DEST_HTML to backup"
fi

echo "[2/4] Deploying story landing to $DEST_HTML ..."
sudo cp -a "$SRC_HTML" "$DEST_HTML"
sudo chown root:root "$DEST_HTML"
sudo chmod 0644 "$DEST_HTML"

echo "[3/4] Validating nginx config..."
sudo nginx -t

echo "[4/4] Reloading nginx..."
sudo systemctl reload nginx

echo "Done."
echo "Next: test https://brainsait.cloud and https://brainsait.cloud/sbs"
