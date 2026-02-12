# SBS Landing Smoke E2E (Playwright)

This repo includes a Playwright smoke runner that:
- clicks through all in-app views ("pages") from the sidebar
- records browser console/page errors, failed requests, and API response failures
- validates `n8n-workflows/*.json` shape
- optionally pings an n8n webhook (disabled for non-local URLs unless explicitly enabled)

## Prereqs

From `sbs-landing/`:

```bash
npm ci

# Ensure Playwright browsers exist (Chromium is enough for this smoke run)
npx playwright install chromium
```

If downloads are blocked, the smoke script auto-falls back to launching your system-installed Chrome (or Edge). You can also force it:

```bash
E2E_BROWSER_CHANNEL=chrome npm run smoke:e2e
```

## Run (most common)

1) Start backend API (port `3000`) in another terminal:

```bash
cd sbs-landing
npm run start
```

2) Start the frontend (port `3001`) in another terminal:

```bash
cd sbs-landing
npm run dev -- --host 127.0.0.1 --port 3001 --strictPort
```

3) Run the smoke script:

```bash
cd sbs-landing
npm run smoke:e2e
```

Artifacts land under `output/playwright/sbs-landing-smoke/<timestamp>/report.json`.

## One-command frontend start

Starts `vite` automatically (you still need the backend running for API checks unless you skip them):

```bash
cd sbs-landing
npm run smoke:e2e -- --start-frontend
```

## Useful flags / env

```bash
# Use a different frontend origin
E2E_BASE_URL="http://localhost:3001/" npm run smoke:e2e

# Skip backend API smoke checks (frontend-only run)
E2E_SKIP_API=1 npm run smoke:e2e

# Use a different backend API origin
E2E_API_BASE_URL="http://localhost:3000" npm run smoke:e2e

# Enable external n8n webhook ping (defaults to local-only)
E2E_N8N_WEBHOOK_URL="https://n8n.example.com/webhook/sbs-claim-submission" E2E_ALLOW_EXTERNAL=1 npm run smoke:e2e

# Include detail views not reachable from sidebar
E2E_INCLUDE_DETAIL_VIEWS=1 npm run smoke:e2e

# Run headed for local debugging
E2E_HEADLESS=0 npm run smoke:e2e
```

## Manual debugging with the Playwright CLI skill (optional)

If you want an interactive session to inspect selectors and UI state, use the wrapper:

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" open http://localhost:3001 --headed
"$PWCLI" snapshot
```
