#!/bin/bash

# merge-prs-safely.sh
# Script to safely merge open pull requests in order
# with conflict detection and security checks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO="SBS-GIVC/sbs"
DRY_RUN="${DRY_RUN:-false}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed. Install from: https://cli.github.com/"
        exit 1
    fi
    
    if ! gh auth status &> /dev/null; then
        log_error "Not authenticated with GitHub CLI. Run: gh auth login"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Install it to continue."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Check PR status
check_pr_status() {
    local pr_number=$1
    log_info "Checking PR #$pr_number status..."
    
    local pr_data=$(gh pr view $pr_number --json mergeable,mergeStateStatus,state,title --repo $REPO)
    local mergeable=$(echo "$pr_data" | jq -r '.mergeable')
    local state=$(echo "$pr_data" | jq -r '.state')
    local title=$(echo "$pr_data" | jq -r '.title')
    
    log_info "PR #$pr_number: $title"
    log_info "  State: $state"
    log_info "  Mergeable: $mergeable"
    
    if [ "$state" != "OPEN" ]; then
        log_warning "PR #$pr_number is not open (state: $state)"
        return 1
    fi
    
    if [ "$mergeable" != "MERGEABLE" ]; then
        log_error "PR #$pr_number has merge conflicts or checks failing"
        return 1
    fi
    
    return 0
}

# Security scan for a PR
security_scan_pr() {
    local pr_number=$1
    log_info "Running security scan for PR #$pr_number..."
    
    # Check for secrets in PR diff
    gh pr diff $pr_number --repo $REPO | grep -iE '(password|secret|api[_-]?key|token)\s*[:=]' && {
        log_error "Potential secrets found in PR #$pr_number diff!"
        return 1
    } || {
        log_success "No obvious secrets found in PR #$pr_number"
    }
    
    return 0
}

# Merge a single PR
merge_pr() {
    local pr_number=$1
    local merge_method="${2:-squash}"  # Default to squash
    
    log_info "Preparing to merge PR #$pr_number using $merge_method method..."
    
    # Check status first
    if ! check_pr_status $pr_number; then
        log_error "PR #$pr_number is not ready to merge"
        return 1
    fi
    
    # Run security scan
    if ! security_scan_pr $pr_number; then
        log_error "Security scan failed for PR #$pr_number"
        return 1
    fi
    
    # Dry run mode
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY RUN] Would merge PR #$pr_number"
        return 0
    fi
    
    # Actually merge
    log_info "Merging PR #$pr_number..."
    if gh pr merge $pr_number --$merge_method --delete-branch --repo $REPO; then
        log_success "Successfully merged PR #$pr_number"
        return 0
    else
        log_error "Failed to merge PR #$pr_number"
        return 1
    fi
}

# Merge PRs in batch
merge_pr_batch() {
    local description=$1
    shift
    local prs=("$@")
    
    log_info "=== $description ==="
    
    for pr in "${prs[@]}"; do
        if ! merge_pr $pr; then
            log_error "Failed to merge PR #$pr. Stopping batch."
            return 1
        fi
        sleep 2  # Brief pause between merges
    done
    
    log_success "Completed: $description"
    return 0
}

# Main merge workflow
main() {
    log_info "Starting safe PR merge process for $REPO"
    log_info "Dry run mode: $DRY_RUN"
    echo ""
    
    check_prerequisites
    echo ""
    
    # Phase 1: Dependency updates (low risk)
    log_info "========================================="
    log_info "PHASE 1: Dependency Updates"
    log_info "========================================="
    PHASE1_PRS=(97 96 95 94 82)
    
    if ! merge_pr_batch "Phase 1: Dependency Updates" "${PHASE1_PRS[@]}"; then
        log_error "Phase 1 failed. Please resolve issues and restart."
        exit 1
    fi
    echo ""
    
    # Phase 2: CI/Workflow updates
    log_info "========================================="
    log_info "PHASE 2: CI/Workflow Updates"
    log_info "========================================="
    PHASE2_PRS=(93 92 91)
    
    if ! merge_pr_batch "Phase 2: CI/Workflow Updates" "${PHASE2_PRS[@]}"; then
        log_error "Phase 2 failed. Please resolve issues and restart."
        exit 1
    fi
    echo ""
    
    # Phase 3: Feature updates (needs review)
    log_info "========================================="
    log_info "PHASE 3: Feature Updates"
    log_info "========================================="
    log_warning "PR #83 (Dashboard enhancements) requires manual review before merge"
    read -p "Have you reviewed PR #83? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if ! merge_pr 83; then
            log_error "Failed to merge PR #83"
            exit 1
        fi
    else
        log_warning "Skipping PR #83. Please review and merge manually."
    fi
    echo ""
    
    # Phase 4: PR #98 - special handling required
    log_info "========================================="
    log_info "PHASE 4: Conflict Resolution (PR #98)"
    log_info "========================================="
    log_warning "PR #98 has merge conflicts and requires manual resolution"
    log_info "Please follow the conflict resolution guide in PR_MERGE_PLAN.md"
    log_info "After resolving conflicts, run:"
    log_info "  ./merge-prs-safely.sh --pr 98"
    echo ""
    
    log_success "========================================="
    log_success "Merge process completed!"
    log_success "========================================="
    log_info "Next steps:"
    log_info "  1. Resolve conflicts in PR #98"
    log_info "  2. Run security scan: ./security-check.sh"
    log_info "  3. Verify deployment"
}

# Handle command line arguments
if [ "$1" = "--pr" ] && [ -n "$2" ]; then
    # Merge specific PR
    merge_pr $2
elif [ "$1" = "--dry-run" ]; then
    # Dry run mode
    DRY_RUN=true
    main
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --pr <NUMBER>     Merge a specific PR"
    echo "  --dry-run         Run without actually merging"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DRY_RUN=true      Enable dry run mode"
    echo ""
    echo "Examples:"
    echo "  $0                      # Run full merge workflow"
    echo "  $0 --dry-run           # Test without merging"
    echo "  $0 --pr 97             # Merge only PR #97"
    echo "  DRY_RUN=true $0        # Dry run via environment variable"
else
    main
fi
