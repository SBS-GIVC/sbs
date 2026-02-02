# Pull Request Merge Plan

## Executive Summary
This document outlines the strategy to safely merge all open pull requests in the SBS-GIVC/sbs repository after resolving conflicts and addressing security issues.

## Current Status (as of 2026-02-02)

### Open Pull Requests (11 total)

#### ✅ Clean and Ready to Merge (No Conflicts)
1. **PR #97**: `chore(deps): bump the npm-minor group in /sbs-landing with 2 updates`
   - Status: mergeable, clean
   - Changes: Updates @cloudflare/workers-types and autoprefixer
   - Risk: Low (dependency updates)

2. **PR #96**: `chore(deps): bump pytest-cov from 6.0.0 to 7.0.0 in /tests`
   - Status: mergeable, clean
   - Changes: Updates pytest-cov testing dependency
   - Risk: Low (test dependency update)

3. **PR #95**: `chore(deps): bump playwright from 1.57.0 to 1.58.0 in /tests`
   - Status: mergeable, clean
   - Changes: Updates playwright testing dependency
   - Risk: Low (test dependency update)

4. **PR #94**: `chore(deps): bump pytest-html from 4.1.1 to 4.2.0 in /tests`
   - Status: mergeable, clean
   - Changes: Updates pytest-html testing dependency
   - Risk: Low (test dependency update)

5. **PR #93**: `chore(ci): bump slackapi/slack-github-action from 1.24.0 to 2.1.1`
   - Status: mergeable, clean
   - Changes: Updates GitHub Actions workflow dependency
   - Risk: Low (CI workflow update)

6. **PR #92**: `chore(ci): bump actions/setup-node from 4 to 6`
   - Status: mergeable, clean
   - Changes: Updates GitHub Actions workflow dependency
   - Risk: Low (CI workflow update)

7. **PR #91**: `chore(ci): bump docker/build-push-action from 5 to 6`
   - Status: mergeable, clean
   - Changes: Updates GitHub Actions workflow dependency
   - Risk: Low (CI workflow update)

8. **PR #83**: `Enhance dashboard panorama and copilot resilience`
   - Status: mergeable (needs verification)
   - Changes: Dashboard enhancements
   - Risk: Medium (feature changes)

9. **PR #82**: `chore(deps): bump the pip group across 1 directory with 2 updates`
   - Status: mergeable, clean
   - Changes: Updates Python dependencies
   - Risk: Low (dependency updates)

#### ⚠️ Has Conflicts (Requires Resolution)
10. **PR #98**: `feat(normalizer): DeepSeek gating, CI smoke test, and docs`
    - Status: NOT mergeable (mergeable: false, state: dirty)
    - Changes: 64 files changed (+2568, -13892 lines)
    - Conflicts: Yes (unrelated histories detected)
    - Risk: High (large changeset, merge conflicts)
    - Issue: Branch appears to have diverged significantly from main

#### 🔍 Current PR (This Document)
11. **PR #99**: `[WIP] Fix and resolve conflicts in open pull requests`
    - Status: Work in progress
    - Purpose: Document merge strategy and resolution plan

## Recommended Merge Order

### Phase 1: Low-Risk Dependency Updates (Merge First)
**Rationale**: These are automated dependency updates with minimal risk and no conflicts.

1. PR #97 (npm dependencies - sbs-landing)
2. PR #96 (pytest-cov)
3. PR #95 (playwright)
4. PR #94 (pytest-html)
5. PR #82 (pip dependencies)

**Merge Command** (for each):
```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

### Phase 2: CI/Workflow Updates
**Rationale**: Infrastructure updates that don't affect application code.

6. PR #93 (slack-github-action)
7. PR #92 (setup-node)
8. PR #91 (build-push-action)

**Merge Command** (for each):
```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

### Phase 3: Feature Updates (Requires Testing)
**Rationale**: Functional changes that need verification.

9. PR #83 (dashboard enhancements)
   - **Action**: Review and test dashboard changes before merging
   - **Verification**: Check dashboard functionality works as expected

**Merge Command**:
```bash
gh pr merge 83 --squash --delete-branch
```

### Phase 4: Conflict Resolution & Feature Merge
**Rationale**: PR #98 has conflicts and needs special handling.

10. PR #98 (normalizer DeepSeek integration)
    - **Status**: HAS CONFLICTS - requires manual resolution
    - **Action Required**: See detailed resolution plan below

## PR #98 Conflict Resolution Plan

### Problem Analysis
PR #98 has unrelated histories with main branch, indicating:
- Branch was created from a different base or an old version of main
- 64 files changed with major deletions (13,892 lines removed)
- Possible rebasing issues

### Resolution Options

#### Option A: Rebase and Resolve (Recommended)
```bash
# 1. Fetch latest main
git fetch origin main

# 2. Checkout the PR branch
git checkout feature/normalizer-deepseek-env

# 3. Rebase onto main (will require conflict resolution)
git rebase origin/main

# 4. For each conflict:
#    - Review the conflict markers
#    - Keep the correct version or merge manually
#    - git add <resolved-file>
#    - git rebase --continue

# 5. Force push the rebased branch
git push --force-with-lease origin feature/normalizer-deepseek-env

# 6. Verify PR is now mergeable on GitHub
gh pr view 98

# 7. Merge when clean
gh pr merge 98 --squash --delete-branch
```

#### Option B: Recreate PR (If rebase is too complex)
```bash
# 1. Create new branch from current main
git checkout origin/main
git checkout -b feature/normalizer-deepseek-env-v2

# 2. Cherry-pick only the relevant commits
git cherry-pick <commit-hash-1>
git cherry-pick <commit-hash-2>
# ... for each relevant commit

# 3. Resolve any cherry-pick conflicts
# 4. Push new branch
git push origin feature/normalizer-deepseek-env-v2

# 5. Close old PR #98
gh pr close 98

# 6. Create new PR
gh pr create --base main --head feature/normalizer-deepseek-env-v2 \
  --title "feat(normalizer): DeepSeek gating, CI smoke test, and docs" \
  --body "Re-created PR #98 with conflicts resolved"
```

#### Option C: Merge with --allow-unrelated-histories (Risky)
```bash
# Only use if you understand the implications
git checkout origin/main
git merge feature/normalizer-deepseek-env --allow-unrelated-histories
# Resolve conflicts manually
git commit
git push origin main
```

## Security Considerations

### Pre-Merge Security Checks
Before merging any PR, ensure:

1. **No secrets in code**: Check for API keys, passwords, tokens
2. **Dependency vulnerabilities**: Run `npm audit` and `pip check`
3. **Code scanning**: Review any GitHub security alerts
4. **Permissions**: Verify no overly permissive file/directory changes

### Recommended Security Scan
```bash
# Run before merging each PR
git checkout <pr-branch>

# For Node.js projects
cd sbs-landing && npm audit

# For Python projects
cd tests && pip install safety && safety check

# Check for secrets
git secrets --scan-history || \
  git log -p | grep -iE '(password|secret|key|token|api[-_]?key)' | grep -v 'REDACTED'
```

### Post-Merge Verification
After all PRs are merged:
```bash
# 1. Verify builds pass
npm run build (if applicable)
python -m pytest tests/ (if applicable)

# 2. Check no secrets were introduced
git secrets --scan

# 3. Run security scanners
npm audit
pip check
```

## Rollback Plan

If any merge causes issues:

```bash
# Find the commit before the problematic merge
git log --oneline -10

# Reset to the commit before the merge
git reset --hard <commit-before-merge>

# Force push (only do this if no one else has pulled)
git push --force-with-lease origin main

# Or create a revert commit (safer)
git revert <merge-commit-hash>
git push origin main
```

## Estimated Timeline

- Phase 1 (Dependency updates): 15-20 minutes
- Phase 2 (CI updates): 10-15 minutes
- Phase 3 (Feature update): 20-30 minutes (including testing)
- Phase 4 (Conflict resolution): 1-2 hours (depending on complexity)

**Total Estimated Time**: 2-3 hours

## Final Checklist

- [ ] All dependency updates merged (PRs #97, #96, #95, #94, #82)
- [ ] All CI updates merged (PRs #93, #92, #91)
- [ ] Dashboard enhancement tested and merged (PR #83)
- [ ] PR #98 conflicts resolved
- [ ] PR #98 tested and merged
- [ ] Security scan completed on final main branch
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Deployment verified (if applicable)

## Notes

- Always test in a staging environment before merging to production
- Keep PR branches in sync with main to avoid future conflicts
- Use `--squash` for cleaner history on dependency updates
- Use `--merge` for feature branches to preserve history
- Document any breaking changes in release notes

## Support

For questions or issues during the merge process:
1. Review this document
2. Check GitHub PR conversations for context
3. Consult with team leads for complex conflicts
4. Use `git reflog` if you need to recover from mistakes
