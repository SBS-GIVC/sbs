# SBS Eligibility Service

A dedicated eligibility microservice intended to be called by the Landing API.

## Endpoints

- `GET /health`
- `POST /check`

### Request
```json
{
  "memberId": "1051234567",
  "payerId": "PAYER_X",
  "dateOfService": "2026-02-07",
  "facilityId": "1",
  "context": {"claimId": "CLM-..."}
}
```

### Modes

#### Local (default)
No configuration required. Uses deterministic local rules for dev/offline.

#### Proxy mode (real integration)
Set:
- `ELIGIBILITY_UPSTREAM_URL=https://your-eligibility-gateway`
  - Can be either a base URL (we call `/check`) or a full endpoint URL (e.g. an n8n webhook URL)
- optional `ELIGIBILITY_UPSTREAM_API_KEY=...`

The service will forward `/check` to `${ELIGIBILITY_UPSTREAM_URL}/check`.

## Compose
Expose on port `8004` and configure Landing:
- `SBS_ELIGIBILITY_URL=http://eligibility-service:8004`
