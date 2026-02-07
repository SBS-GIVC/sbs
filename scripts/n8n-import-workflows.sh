#!/usr/bin/env sh
set -eu

# Import shipped SBS workflows into a running n8n container.
# Requires: docker compose stack running.

# Workflows are mounted by docker-compose.services.yml to:
#   /home/node/.n8n/workflows/

echo "[n8n-import] importing workflows into n8n container"

docker compose exec -T n8n n8n import:workflow --input /home/node/.n8n/workflows/sbs-ai-chat.json
docker compose exec -T n8n n8n import:workflow --input /home/node/.n8n/workflows/sbs-eligibility.json
docker compose exec -T n8n n8n import:workflow --input /home/node/.n8n/workflows/sbs-complete-pipeline.json

echo "[n8n-import] done. Activate workflows in the n8n UI to enable webhooks."
