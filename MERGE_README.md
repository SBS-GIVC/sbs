# Pull Request Merge & Conflict Resolution - README

## Purpose
This PR provides comprehensive documentation and automated tools to safely merge all open pull requests in the SBS-GIVC/sbs repository after resolving conflicts and addressing security concerns.

## What's Included

### 📋 Documentation
1. **`PR_MERGE_PLAN.md`** - Complete merge strategy and execution plan
   - Lists all 11 open PRs with status
   - Provides recommended merge order
   - Includes security considerations
   - Defines rollback procedures

2. **`CONFLICT_RESOLUTION_GUIDE.md`** - Detailed guide for resolving PR #98 conflicts
   - Step-by-step conflict resolution instructions
   - Multiple resolution strategies
   - Testing procedures
   - Troubleshooting tips

### 🔧 Automated Tools
1. **`merge-prs-safely.sh`** - Automated PR merge script
   - Safely merges PRs in recommended order
   - Checks merge status before proceeding
   - Scans for security issues
   - Supports dry-run mode
   - Provides detailed logging

2. **`security-check.sh`** - Comprehensive security scanner
   - Scans for exposed secrets
   - Checks Node.js dependencies
   - Checks Python dependencies
   - Validates Docker configurations
   - Reviews git history
   - Generates detailed report

## Quick Start

### Prerequisites
```bash
# Install required tools
# GitHub CLI
brew install gh  # macOS
# or see: https://cli.github.com/

# jq (JSON processor)
brew install jq  # macOS
# or: apt-get install jq  # Ubuntu/Debian

# Authenticate with GitHub
gh auth login
```

### Step 1: Run Security Check
```bash
# Run comprehensive security scan
./security-check.sh

# Review the generated report
cat security-report-*.md
```

### Step 2: Test Merge Process (Dry Run)
```bash
# Test without actually merging
./merge-prs-safely.sh --dry-run
```

### Step 3: Execute Merges
```bash
# Run the actual merge process
./merge-prs-safely.sh

# Or merge specific PR
./merge-prs-safely.sh --pr 97
```

### Step 4: Resolve PR #98 Conflicts
```bash
# Follow the detailed guide
cat CONFLICT_RESOLUTION_GUIDE.md

# The automated script will stop at PR #98
# Manually resolve conflicts following the guide
# Then merge PR #98 separately
```

## Current Status

### ✅ Ready to Merge (No Conflicts)
- PR #97: npm dependencies (sbs-landing)
- PR #96: pytest-cov update
- PR #95: playwright update
- PR #94: pytest-html update
- PR #93: slack-github-action update
- PR #92: setup-node update
- PR #91: build-push-action update
- PR #83: dashboard enhancements (needs review)
- PR #82: pip dependencies

### ⚠️ Requires Action
- **PR #98**: Has merge conflicts - requires manual resolution
  - Branch: `feature/normalizer-deepseek-env`
  - Issue: Unrelated histories
  - See: `CONFLICT_RESOLUTION_GUIDE.md`

## Security Findings

### ✅ No Critical Issues Found
- No hardcoded secrets detected
- All npm dependencies are vulnerability-free
- Environment variables properly referenced

### ⚠️ Recommendations
1. Some Docker containers run as root - consider adding USER directives
2. Add HEALTHCHECK directives to Dockerfiles
3. Install `pip-audit` or `safety` for Python dependency checking

## Merge Order & Rationale

### Phase 1: Dependency Updates (Low Risk)
PRs #97, #96, #95, #94, #82
- **Why First**: Automated updates with minimal risk
- **Method**: Squash merge
- **Time**: ~20 minutes

### Phase 2: CI/Workflow Updates (Low Risk)
PRs #93, #92, #91
- **Why Second**: Infrastructure changes, no code impact
- **Method**: Squash merge
- **Time**: ~15 minutes

### Phase 3: Feature Updates (Medium Risk)
PR #83
- **Why Third**: Requires testing and review
- **Method**: Squash or merge (depending on history)
- **Time**: ~30 minutes

### Phase 4: Conflict Resolution (High Complexity)
PR #98
- **Why Last**: Has conflicts, needs manual work
- **Method**: Rebase or recreate
- **Time**: 1-2 hours

## Usage Examples

### Merge All Safe PRs
```bash
# Phases 1-3 (automatic)
./merge-prs-safely.sh
```

### Merge Only Dependencies
```bash
# Merge one at a time
./merge-prs-safely.sh --pr 97
./merge-prs-safely.sh --pr 96
./merge-prs-safely.sh --pr 95
./merge-prs-safely.sh --pr 94
./merge-prs-safely.sh --pr 82
```

### Check PR Status
```bash
# View PR details
gh pr view 98 --repo SBS-GIVC/sbs

# Check merge status
gh pr status --repo SBS-GIVC/sbs
```

### Manual Merge
```bash
# For any PR if automation fails
gh pr merge <PR_NUMBER> --squash --delete-branch --repo SBS-GIVC/sbs
```

## Troubleshooting

### Merge Failed: Conflicts
```bash
# Check PR status
gh pr view <PR_NUMBER>

# View conflicts
gh pr diff <PR_NUMBER>

# Follow conflict resolution guide
cat CONFLICT_RESOLUTION_GUIDE.md
```

### Merge Failed: CI Checks
```bash
# Wait for CI to complete
gh pr checks <PR_NUMBER> --watch

# Or override (if you have permission)
gh pr merge <PR_NUMBER> --admin
```

### Script Errors
```bash
# Check script has execute permission
chmod +x merge-prs-safely.sh
chmod +x security-check.sh

# Check you're authenticated
gh auth status

# Enable debug output
bash -x ./merge-prs-safely.sh
```

## Best Practices

### Before Merging
1. ✅ Run security scan
2. ✅ Review PR changes
3. ✅ Check CI/CD status
4. ✅ Test in staging (if applicable)
5. ✅ Get required approvals

### During Merge
1. ✅ Follow recommended order
2. ✅ Monitor for errors
3. ✅ Don't force push to main
4. ✅ Keep commits atomic

### After Merge
1. ✅ Verify builds pass
2. ✅ Check deployed services
3. ✅ Monitor for issues
4. ✅ Update documentation

## Safety Features

### Dry Run Mode
Test merge process without actually merging:
```bash
./merge-prs-safely.sh --dry-run
```

### Security Scanning
Automatic security checks before each merge:
- Secrets detection
- Dependency vulnerabilities
- File permissions
- Docker security

### Merge Status Validation
Checks before merging:
- PR is open
- No merge conflicts
- CI checks passing
- Mergeable state verified

### Rollback Support
Instructions provided for:
- Reverting merge commits
- Resetting to previous state
- Cherry-picking specific commits

## Support & Resources

### Documentation
- `PR_MERGE_PLAN.md` - Comprehensive merge plan
- `CONFLICT_RESOLUTION_GUIDE.md` - PR #98 specific guide
- GitHub Docs: https://docs.github.com/en/pull-requests

### Tools Used
- [GitHub CLI](https://cli.github.com/) - PR management
- [jq](https://stedolan.github.io/jq/) - JSON processing
- Bash scripting - Automation

### Getting Help
1. Check script output and logs
2. Review documentation files
3. Check PR conversations on GitHub
4. Tag team members for assistance

## Contributing

To improve this process:
1. Update documentation as needed
2. Add error handling to scripts
3. Document edge cases
4. Share lessons learned

## License

Same as parent repository (SBS-GIVC/sbs)

---

**Created by**: GitHub Copilot Agent  
**Date**: 2026-02-02  
**Purpose**: Systematic resolution of open PR conflicts and safe merging

For questions or issues, refer to the documentation files or consult with repository maintainers.
