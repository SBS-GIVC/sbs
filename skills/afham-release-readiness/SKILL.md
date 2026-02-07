---
name: afham-release-readiness
description: Perform release-readiness checks for the AFHAM repository. Use when preparing a branch for merge or deployment, validating test health, checking deployment artifacts, summarizing risk, and producing a go/no-go recommendation with evidence.
---

# AFHAM Release Readiness

Execute this workflow to evaluate whether a branch is safe to release.

## 1) Establish scope

1. Confirm target branch, baseline commit, and release objective.
2. Identify changed files and map them to affected services.
3. Identify required verification depth:
   - **Fast**: lint/smoke/unit subset
   - **Standard**: representative unit + integration checks
   - **Full**: full regression + deploy verification

## 2) Run deterministic checks first

Run the helper script before ad-hoc commands:

```bash
bash skills/afham-release-readiness/scripts/run_readiness_checks.sh
```

The script performs environment sanity checks and a default battery of repo checks.

## 3) Expand checks by touched areas

After the default script, run additional focused checks for modified areas:

- `sbs-landing/*`: run frontend build/test commands if dependencies are available.
- `services/*`, `*-service/*`, `shared/*`: run targeted `pytest` suites.
- `docker/*`, `deploy/*`, `k8s-production/*`: run config validation and deployment verification scripts.

Use the matrix in `references/check-matrix.md` to pick commands.

## 4) Produce release verdict

Summarize in this order:

1. **What changed** (service-level impact)
2. **What was validated** (commands + pass/fail)
3. **What was not validated** (constraints)
4. **Risk level** (low/medium/high)
5. **Recommendation** (`GO`, `GO with caveats`, or `NO-GO`)

## 5) If blocked

If tooling or dependencies are missing:

1. State exactly which command failed and why.
2. Propose the minimum follow-up command to unblock.
3. Continue with all remaining checks that do not require the missing dependency.
