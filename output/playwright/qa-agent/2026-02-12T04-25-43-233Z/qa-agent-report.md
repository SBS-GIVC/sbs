# Continuous QA Agent Report

- Run ID: `2026-02-12T04-25-43-233Z`
- Smoke report: `/Users/fadil369/sbs/output/playwright/sbs-landing-smoke/2026-02-12T04-25-43-620Z/report.json`
- Overall passed: `false`
- Failed views: `0`
- API failures: `6`
- Request failures: `0`
- Console errors: `8`
- Page errors: `2`

## Regression Candidates
- [P1] API failure regression: GET http://localhost:3001/api/claims?limit=50&page=1: Replay GET http://localhost:3001/api/claims?limit=50&page=1 in API smoke and assert status < 400.
- [P1] API failure regression: GET http://localhost:3001/api/claims?limit=50&page=1: Replay GET http://localhost:3001/api/claims?limit=50&page=1 in API smoke and assert status < 400.
- [P1] API failure regression: GET http://localhost:3000/api/sbs/codes/all: Replay GET http://localhost:3000/api/sbs/codes/all in API smoke and assert status < 400.
- [P1] API failure regression: GET http://localhost:3000/api/sbs/codes?limit=200&offset=0: Replay GET http://localhost:3000/api/sbs/codes?limit=200&offset=0 in API smoke and assert status < 400.
- [P1] API failure regression: GET http://localhost:3000/api/ai/facility-analytics?facility_id=1&days=30: Replay GET http://localhost:3000/api/ai/facility-analytics?facility_id=1&days=30 in API smoke and assert status < 400.
- [P1] API failure regression: GET http://localhost:3000/api/ai/facility-analytics?facility_id=1&days=30: Replay GET http://localhost:3000/api/ai/facility-analytics?facility_id=1&days=30 in API smoke and assert status < 400.