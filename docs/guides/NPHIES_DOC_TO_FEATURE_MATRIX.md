# NPHIES Document-to-Feature Matrix

This matrix maps the reviewed NPHIES reference documents to concrete implementation work in this repository, with a focus on `nphies-bridge` and `sbs-landing`.

## Implemented in this update

| Source document | Key requirement extracted | Implemented change | Where |
|---|---|---|---|
| `IG-NPHIES Implementation Guide V2.7` | Use `Communication` / `CommunicationRequest` for additional information and post-adjudication exchanges | Added bridge endpoint to submit both resource types | `nphies-bridge/main.py` (`POST /submit-communication`) |
| `Claim Re-submission Guide` + `Claims re-submission with supporting information guidance` | Support re-adjudication communication flow linked to existing claim lifecycle | Added landing API route to submit re-adjudication messages and persist events per claim | `sbs-landing/server.cjs`, `sbs-landing/server.js` (`POST /api/claims/:claimId/re-adjudication`) |
| `Transaction Statuses Guideline v1.0` | Keep processing outcomes consistent across transport and adjudication response variants | Normalized bridge submission status mapping (`accepted`/`rejected`/`error`) across real and mock NPHIES responses | `nphies-bridge/main.py` |
| `Transaction Statuses Guideline v1.0` | Avoid ambiguous UI states when status aliases differ (`submitted_successfully`, `accepted`, etc.) | Added/updated status normalization in landing backend workflow handling | `sbs-landing/server.cjs`, `sbs-landing/server.js` |

## Operational impact

- Re-adjudication is now an explicit API flow instead of ad-hoc retry behavior.
- Claim status transitions are more deterministic for downstream UI and automation.
- Bridge behavior is consistent between mock mode and real HTTP responses.

## Suggested next phase (not yet implemented)

| Source document | Suggested enhancement |
|---|---|
| `Claims test cases - V4.0` + `Nphies Testing Guide` | Add automated scenario fixtures (eligibility, prior-auth, claim, communication loop) and assert expected stage/timeline outcomes. |
| `CNHI Transactions Submission Guideline for MDS` | Add schema-level validators for referral-linked claims (`supportingInfo`, `preauthref`, attachment requirements). |
| `nphies Transaction Viewer User Manual` | Add a claim transaction timeline panel in UI, including re-adjudication events and NPHIES transaction UUID links. |
| `nphies Billing Cycle Guidelines V1.4` | Add billing/TAT KPI calculations in analytics endpoints and dashboard cards. |

