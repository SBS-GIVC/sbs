# AI Capabilities Phased Rollout (One-by-One)

This rollout is designed for incremental production hardening while keeping the system operational.

## Phase 1 (implemented now)

### 1) Pre-submit denial prevention copilot
- Endpoint: `POST /api/ai/pre-submit-denial-copilot`
- Workflow integration: `POST /api/submit-claim`
  - Runs risk scoring before orchestration.
  - Returns exact field-level fixes.
  - Optional gates:
    - `AI_HUMAN_APPROVAL_GATE=true` requires human approval for high-risk claims.
    - `AI_DENIAL_AUTOBLOCK=true` blocks critical-risk claims.

### 2) Re-adjudication autopilot
- Draft endpoint: `POST /api/claims/:claimId/re-adjudication/autopilot`
- Submit endpoint: `POST /api/claims/:claimId/re-adjudication`
- Supports one-click approval via `autoSubmit=true` in autopilot request.

### 3) Multimodal evidence extractor
- Endpoint: `POST /api/ai/evidence/extract`
- Input modes:
  - inline text + lab results
  - multipart file upload (`evidenceFile`)
- Output:
  - structured `supportingInfo`
  - extraction confidence
  - parser/source metadata

### 4) Smart prior-auth composer
- Endpoint: `POST /api/ai/prior-auth/compose`
- Outputs payer-specific narrative, required fields, missing fields, readiness score.

### 5) Workflow AI orchestrator
- Endpoint: `POST /api/ai/workflow/orchestrate`
- Workflow integration: `POST /api/submit-claim`
  - Predicts SLA breach risk.
  - Chooses primary route (`n8n` vs direct SBS) when `AI_ORCHESTRATOR_ACTIVE=true`.

### 6) Continuous QA agent
- Script: `sbs-landing/scripts/continuous-qa-agent.mjs`
- NPM command: `npm run qa:agent`
- Uses Playwright smoke run as base, then generates regression candidates report.

### 7) Facility optimization engine
- Endpoint: `POST /api/ai/facility-optimization`
- Benchmarks denial/rework trends and outputs prioritized operational recommendations.

## Design-in-advance controls (implemented foundation)

### Event-first telemetry
- In-memory event ledger for AI decisions and overrides.
- Endpoint: `GET /api/ai/telemetry/events`

### Human-in-the-loop controls
- Approval logging endpoint: `POST /api/ai/approvals/decision`
- Approval gate support via `AI_HUMAN_APPROVAL_GATE`.

### Unified eval framework
- Endpoint: `GET /api/ai/eval/summary`
- KPI outputs: `denial_rate`, `rework_rate`, `tat_seconds_avg`, `first_pass_acceptance`.

### Versioned AI gateway
- Registry endpoint: `GET /v1/registry` (service: `ai-gateway`)
- Capability endpoint: `POST /v1/capabilities/:capability`
- Route override support: `AI_CAPABILITY_ROUTES_JSON`

### Safety rails
- PHI-conscious handling in copilot paths.
- Payload fingerprinting for traceability.
- Risk/approval thresholds configurable via environment.

## Deploy Steps

### 1) Build/verify
```bash
cd /Users/fadil369/sbs
node --check sbs-landing/server.cjs
node --check ai-gateway/server.js
```

### 2) Start services
```bash
cd /Users/fadil369/sbs/sbs-landing
npm run start

cd /Users/fadil369/sbs/ai-gateway
npm run start
```

### 3) Recommended environment flags
```bash
export AI_DENIAL_AUTOBLOCK=false
export AI_HUMAN_APPROVAL_GATE=true
export AI_ORCHESTRATOR_ACTIVE=true
export AI_DENIAL_REVIEW_THRESHOLD=70
export AI_DENIAL_BLOCK_THRESHOLD=85
```

### 4) Smoke + continuous QA
```bash
cd /Users/fadil369/sbs/sbs-landing
npm run smoke:e2e
npm run qa:agent
```

## Next Phases (planned)

- Phase 2: persist AI telemetry/evals to database; add prompt/version experiment metadata and rollback controls.
- Phase 3: full document OCR + extraction pipeline for Arabic/English clinical docs at scale.
- Phase 4: automated retraining/recalibration loop from adjudication outcomes.
