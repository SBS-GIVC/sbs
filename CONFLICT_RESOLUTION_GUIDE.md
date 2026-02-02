# Conflict Resolution Guide for PR #98

## Overview
PR #98 (`feat(normalizer): DeepSeek gating, CI smoke test, and docs`) has merge conflicts with the main branch. This guide provides step-by-step instructions to resolve these conflicts.

## Problem Analysis
- **PR Number**: #98
- **Branch**: `feature/normalizer-deepseek-env`
- **Status**: Merge conflicts (unrelated histories)
- **Files Changed**: 64 files
- **Additions**: +2,568 lines
- **Deletions**: -13,892 lines

## Root Cause
The branch appears to have unrelated histories with main, which typically happens when:
1. Branch was created from a different starting point
2. Branch is very outdated compared to main
3. Major refactoring or reorganization occurred

## Resolution Strategy

### Recommended: Option A - Rebase and Resolve

This is the cleanest approach that preserves commit history.

```bash
# Step 1: Ensure you have the latest code
git fetch origin

# Step 2: Checkout the PR branch
git checkout feature/normalizer-deepseek-env

# Step 3: Create a backup branch (safety measure)
git branch feature/normalizer-deepseek-env-backup

# Step 4: Attempt rebase
git rebase origin/main

# If you get "refusing to merge unrelated histories", use:
git rebase origin/main --allow-unrelated-histories
```

### Resolving Conflicts During Rebase

When conflicts occur:

```bash
# Step 1: Check which files have conflicts
git status

# Step 2: For each conflicted file, open it and look for conflict markers:
# <<<<<<< HEAD
# (your changes)
# =======
# (their changes)
# >>>>>>>

# Step 3: Edit the file to resolve conflicts
# - Keep your changes, their changes, or a combination
# - Remove conflict markers
# - Test that the code still works

# Step 4: Mark file as resolved
git add <resolved-file>

# Step 5: Continue rebase
git rebase --continue

# Repeat steps 1-5 until rebase completes
```

### If Rebase Becomes Too Complex

If there are too many conflicts:

```bash
# Abort the rebase
git rebase --abort

# Consider Option B (recreate PR) instead
```

### Option B: Recreate PR from Scratch

If rebasing is too complex, recreate the PR with only the essential changes:

```bash
# Step 1: Get list of changes specific to DeepSeek feature
git checkout feature/normalizer-deepseek-env
git log --oneline --no-merges origin/main..HEAD

# Step 2: Identify the relevant commits (DeepSeek-related only)
# Look for commits like:
# - "feat(normalizer): add DeepSeek gating"
# - "docs: add DeepSeek key rotation guide"

# Step 3: Create new branch from latest main
git checkout origin/main
git checkout -b feature/normalizer-deepseek-env-v2

# Step 4: Cherry-pick only DeepSeek-related commits
git cherry-pick <commit-hash-1>
git cherry-pick <commit-hash-2>
# ... etc

# Step 5: Resolve any cherry-pick conflicts as they occur
# Similar to rebase conflict resolution

# Step 6: Test the changes
npm test  # or appropriate test command

# Step 7: Push the new branch
git push origin feature/normalizer-deepseek-env-v2

# Step 8: Create new PR
gh pr create --base main --head feature/normalizer-deepseek-env-v2 \
  --title "feat(normalizer): DeepSeek gating, CI smoke test, and docs (v2)" \
  --body "Recreated PR #98 with conflicts resolved.

Original PR: #98

## Changes
- Added DeepSeek AI integration with feature flags
- Created CI workflow for DeepSeek smoke tests
- Added security documentation for key rotation
- Implemented AI fallback for offline testing

Closes #98"

# Step 9: Close old PR #98
gh pr close 98 --comment "Closing in favor of #<NEW_PR_NUMBER> which has conflicts resolved"
```

### Option C: Merge with Unrelated Histories (Not Recommended)

Only use this if you understand the implications:

```bash
# Step 1: Checkout main
git checkout main
git pull origin main

# Step 2: Merge with --allow-unrelated-histories
git merge feature/normalizer-deepseek-env --allow-unrelated-histories

# Step 3: Resolve all conflicts
# This will likely be extensive

# Step 4: Test thoroughly
npm test
# Run all validation

# Step 5: Push to main (if you have permissions)
git push origin main
```

## Key Files to Watch For

Based on the PR's file list, pay special attention to:

### New Files (Safe - No Conflicts)
- `.github/workflows/ci-deepseek.yml` - New CI workflow
- `docs/DEEPSEEK_KEY_ROTATION.md` - New documentation
- `services/normalizer/feature_flags.py` - New feature flags module
- `services/normalizer/ai_fallback.py` - New fallback module
- Test files in `services/normalizer/tests/`

### Modified Files (Potential Conflicts)
- `.env.example` - May conflict with other env variable additions
- `docker-compose*.yml` files - May conflict with other service changes
- Documentation files (`ARCHITECTURE.md`, `README.md`, etc.) - May have merge conflicts
- `normalizer-service/` files - Core service changes

## Conflict Resolution Tips

### For Configuration Files (docker-compose.yml, .env.example)
- Usually want to keep BOTH changes (yours and theirs)
- Make sure environment variables are properly formatted
- Verify no duplicate keys

### For Documentation Files
- Merge content from both versions
- Maintain consistent formatting
- Update table of contents if needed

### For Code Files
- Understand the logic of both changes
- Test the merged code
- Look for duplicate imports or functions

## Testing After Resolution

Before finalizing the PR:

```bash
# 1. Install dependencies
cd normalizer-service && npm install

# 2. Run linters
npm run lint  # if configured

# 3. Run unit tests
pytest services/normalizer/tests/test_feature_flags.py -v
pytest services/normalizer/tests/test_ai_fallback.py -v
pytest services/normalizer/tests/test_deepseek_provider.py -v

# 4. Run integration tests
npm test  # or appropriate command

# 5. Build Docker images
docker-compose build normalizer-service

# 6. Start services and test
docker-compose up -d
# Test endpoints
```

## Verification Checklist

Before merging:

- [ ] All conflicts resolved
- [ ] Code compiles/runs without errors
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] No secrets in code
- [ ] Environment variables properly set
- [ ] CI/CD pipeline passes
- [ ] Feature flags work as expected
- [ ] Fallback mechanisms tested
- [ ] Security review completed

## Getting Help

If you encounter issues:

1. **Check the PR conversation**: Review comments on PR #98
2. **Review git logs**: `git log --graph --oneline --all`
3. **Check file history**: `git log --follow <file-path>`
4. **Ask for help**: Tag relevant team members in PR comments

## Rollback Plan

If the merge causes issues after completion:

```bash
# Option 1: Revert the merge commit
git revert <merge-commit-hash> -m 1

# Option 2: Reset to before merge (if no one else has pulled)
git reset --hard <commit-before-merge>
git push --force-with-lease origin main
```

## References

- Original PR: https://github.com/SBS-GIVC/sbs/pull/98
- Git Rebase Guide: https://git-scm.com/book/en/v2/Git-Branching-Rebasing
- Resolving Merge Conflicts: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts

## Summary

**Recommended Path**: Option A (Rebase) or Option B (Recreate)
**Estimated Time**: 1-2 hours
**Complexity**: Medium to High
**Risk Level**: Medium (manageable with proper testing)

Remember: Take your time, test thoroughly, and don't hesitate to ask for help if needed.
