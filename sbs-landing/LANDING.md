# BrainSAIT Landing Experience Guide

This document defines how the two public surfaces should work together:

- https://brainsait.cloud -> corporate product narrative and trust-first brand experience.
- https://sbs.brainsait.cloud -> operational SBS application and workflow command center.

## UX Principles

1. Single-message hero: emphasize outcomes (faster adjudication, reduced denials, NPHIES compliance).
2. Dual-domain clarity: users should understand where to learn vs where to execute workflows.
3. Fast action paths: one-click launch into app, one-click claim submission, one-click docs.
4. Trust + compliance: always show CHI/NPHIES alignment and secure-by-design messaging.

## Implemented Enhancements

- Simplified `public/index.html` to remove duplicate static navigation and allow `landing.js` to own rendering.
- Added a dedicated domain handoff section in `public/landing.js` for:
  - `brainsait.cloud` (brand + strategy)
  - `sbs.brainsait.cloud` (execution + operations)
- Updated documentation CTA to point to `#features` to avoid dead links.
- Added `rel="noopener noreferrer"` on external links for security hardening.
- Updated runtime API resolution in root `index.html` so production hosts use `https://api.brainsait.cloud` automatically.

## Next Recommendations

- Add Lighthouse budget targets (Performance > 90, Accessibility > 95).
- Add synthetic monitoring journeys for claim submit modal + app launch CTA.
- Add multilingual content QA checklist for EN/AR parity.
