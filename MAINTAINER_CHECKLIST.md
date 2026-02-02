# Maintainer Checklist: PR Merge Execution

## Pre-Execution Checklist

### ☐ Prerequisites Installed
- [ ] GitHub CLI (`gh`) installed and authenticated
  ```bash
  gh auth status
  ```
- [ ] `jq` installed (JSON processor)
  ```bash
  which jq
  ```
- [ ] Git configured correctly
  ```bash
  git config --list | grep user
  ```

### ☐ Documentation Reviewed
- [ ] Read `EXECUTIVE_SUMMARY.md` (5 min)
- [ ] Reviewed `MERGE_README.md` (5 min)
- [ ] Understood `PR_MERGE_PLAN.md` (10 min)
- [ ] Familiar with `CONFLICT_RESOLUTION_GUIDE.md` (for PR #98)

### ☐ Security Check Completed
- [ ] Ran `./security-check.sh`
- [ ] Reviewed security report
- [ ] Confirmed no critical issues
- [ ] Documented any warnings (non-critical)

### ☐ Dry Run Tested
- [ ] Ran `./merge-prs-safely.sh --dry-run`
- [ ] Verified script completes without errors
- [ ] Reviewed what would be merged
- [ ] Confirmed merge order is correct

## Execution Checklist

### Phase 1: Dependency Updates (20 minutes)

**PRs to Merge**: #97, #96, #95, #94, #82

- [ ] Started Phase 1 execution
  ```bash
  # Script handles these automatically
  ./merge-prs-safely.sh
  ```
  
#### Individual PR Verification
- [ ] PR #97 merged: npm-minor group (sbs-landing)
- [ ] PR #96 merged: pytest-cov update
- [ ] PR #95 merged: playwright update
- [ ] PR #94 merged: pytest-html update
- [ ] PR #82 merged: pip group updates

#### Phase 1 Verification
- [ ] All 5 PRs merged successfully
- [ ] No merge conflicts encountered
- [ ] CI/CD checks passing
- [ ] No errors in logs

### Phase 2: CI/Workflow Updates (15 minutes)

**PRs to Merge**: #93, #92, #91

- [ ] Started Phase 2 execution
  ```bash
  # Script continues automatically
  # (if using script - already running from Phase 1)
  ```

#### Individual PR Verification
- [ ] PR #93 merged: slack-github-action update
- [ ] PR #92 merged: setup-node update
- [ ] PR #91 merged: build-push-action update

#### Phase 2 Verification
- [ ] All 3 PRs merged successfully
- [ ] Workflow files updated
- [ ] No syntax errors in workflows
- [ ] Actions running correctly

### Phase 3: Feature Updates (30 minutes)

**PR to Merge**: #83

- [ ] Reviewed PR #83 changes
  ```bash
  gh pr view 83 --repo SBS-GIVC/sbs
  gh pr diff 83 --repo SBS-GIVC/sbs
  ```
- [ ] Tested dashboard changes locally (if possible)
- [ ] Confirmed change is safe to merge
- [ ] Responded "Yes" to script prompt
- [ ] PR #83 merged successfully

#### Phase 3 Verification
- [ ] Dashboard changes deployed
- [ ] Dashboard functionality tested
- [ ] No console errors
- [ ] User experience verified

### Phase 4: Conflict Resolution (1-2 hours)

**PR to Resolve**: #98

- [ ] Opened `CONFLICT_RESOLUTION_GUIDE.md`
- [ ] Selected resolution strategy (recommended: Option A - Rebase)
- [ ] Created backup branch
  ```bash
  git checkout feature/normalizer-deepseek-env
  git branch feature/normalizer-deepseek-env-backup
  ```
- [ ] Started rebase process
  ```bash
  git rebase origin/main --allow-unrelated-histories
  ```

#### Conflict Resolution Process
- [ ] Identified conflicted files
  ```bash
  git status
  ```
- [ ] Resolved each conflict manually
  - [ ] Reviewed conflict markers
  - [ ] Made appropriate choices
  - [ ] Tested changes work
  - [ ] Marked files as resolved
  - [ ] Continued rebase
- [ ] Completed rebase successfully
- [ ] Force pushed rebased branch
  ```bash
  git push --force-with-lease origin feature/normalizer-deepseek-env
  ```

#### PR #98 Testing
- [ ] Installed dependencies
  ```bash
  cd normalizer-service && npm install
  ```
- [ ] Ran unit tests
  ```bash
  pytest services/normalizer/tests/ -v
  ```
- [ ] Ran integration tests
- [ ] Verified feature flags work
- [ ] Tested AI fallback mechanism
- [ ] Checked CI workflow

#### PR #98 Merge
- [ ] Verified PR #98 now shows as mergeable on GitHub
- [ ] Reviewed final changes
- [ ] Merged PR #98
  ```bash
  gh pr merge 98 --squash --delete-branch
  ```

### Phase 5: Post-Merge Verification (15 minutes)

#### Repository Status
- [ ] All 11 PRs merged or closed
- [ ] No open merge conflicts remain
- [ ] Main branch is clean
- [ ] All PR branches deleted

#### Build & Test
- [ ] Full build successful
  ```bash
  # Run appropriate build command
  npm run build  # if applicable
  ```
- [ ] All tests passing
  ```bash
  npm test  # or appropriate test command
  pytest tests/  # for Python tests
  ```
- [ ] No new linting errors
- [ ] No TypeScript/compilation errors

#### Deployment Verification
- [ ] Services deployed successfully
  ```bash
  docker-compose up -d  # if using Docker
  ```
- [ ] Health checks passing
- [ ] API endpoints responding
- [ ] Dashboard accessible
- [ ] Normalizer service working
- [ ] DeepSeek integration functional

#### Security Re-check
- [ ] Ran security scan post-merge
  ```bash
  ./security-check.sh
  ```
- [ ] No new security issues introduced
- [ ] Secrets still properly managed
- [ ] Dependencies still clean

#### Documentation
- [ ] Updated CHANGELOG (if exists)
- [ ] Updated version numbers (if needed)
- [ ] Documented breaking changes (if any)
- [ ] Updated deployment notes

## Post-Execution Checklist

### ☐ Cleanup
- [ ] Removed backup branches (if created)
- [ ] Archived old security reports
- [ ] Cleaned up temporary files
- [ ] Updated local repository
  ```bash
  git fetch --all --prune
  git checkout main
  git pull origin main
  ```

### ☐ Communication
- [ ] Notified team of completed merges
- [ ] Documented any issues encountered
- [ ] Shared lessons learned
- [ ] Updated project board (if used)

### ☐ Monitoring
- [ ] Monitored application for 30 minutes post-deployment
- [ ] Checked error logs
- [ ] Verified no unexpected issues
- [ ] Confirmed metrics are normal

## Troubleshooting Reference

### If Script Fails
```bash
# Check prerequisites
gh auth status
which jq

# Review error message
# Check specific PR status
gh pr view <PR_NUMBER>

# Try individual PR merge
./merge-prs-safely.sh --pr <PR_NUMBER>
```

### If Conflicts Are Too Complex
```bash
# Abort and try Option B (recreate PR)
git rebase --abort
# Follow Option B in CONFLICT_RESOLUTION_GUIDE.md
```

### If Merge Breaks Something
```bash
# Revert immediately
git revert <merge-commit> -m 1
git push origin main

# Or use backup
git checkout <backup-branch>
```

## Success Metrics

- ✅ All 11 PRs processed
- ✅ 0 open conflicts
- ✅ 100% tests passing
- ✅ 0 security issues
- ✅ Services operational
- ✅ Team notified

## Time Tracking

| Phase | Estimated | Actual | Notes |
|-------|-----------|--------|-------|
| Pre-execution | 20 min | _____ | _____ |
| Phase 1 | 20 min | _____ | _____ |
| Phase 2 | 15 min | _____ | _____ |
| Phase 3 | 30 min | _____ | _____ |
| Phase 4 | 1-2 hrs | _____ | _____ |
| Phase 5 | 15 min | _____ | _____ |
| **Total** | **2-3 hrs** | **_____** | _____ |

## Sign-off

Completed by: ________________  
Date: ________________  
Time: ________________  

Verified by: ________________  
Date: ________________  

Notes:
_________________________________
_________________________________
_________________________________

---

**This checklist ensures all steps are completed systematically and safely.**

Save this file and check off items as you complete them.
