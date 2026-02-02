#!/bin/bash

# security-check.sh
# Comprehensive security check for the repository
# Checks for secrets, vulnerabilities, and security best practices

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_FILE="${SCRIPT_DIR}/security-report-$(date +%Y%m%d-%H%M%S).md"

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

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# Security Audit Report
Generated: $(date)
Repository: SBS-GIVC/sbs

## Summary
This report contains findings from automated security checks.

---

EOF
}

# Check for secrets in codebase
check_secrets() {
    log_info "Checking for exposed secrets..."
    
    echo "## Secrets Check" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Patterns to search for
    local patterns=(
        'password\s*[:=]'
        'api[_-]?key\s*[:=]'
        'secret\s*[:=]'
        'token\s*[:=]'
        'aws[_-]?access'
        'private[_-]?key'
        'client[_-]?secret'
        'DEEPSEEK_API_KEY\s*=\s*[^{$]'
    )
    
    local found_secrets=false
    
    for pattern in "${patterns[@]}"; do
        log_info "  Searching for pattern: $pattern"
        local matches=$(git grep -iE "$pattern" -- ':!*.md' ':!security-check.sh' ':!.env.example' 2>/dev/null || true)
        
        if [ -n "$matches" ]; then
            found_secrets=true
            log_error "  Found potential secrets matching: $pattern"
            echo "### ⚠️ Pattern: \`$pattern\`" >> "$REPORT_FILE"
            echo "\`\`\`" >> "$REPORT_FILE"
            echo "$matches" >> "$REPORT_FILE"
            echo "\`\`\`" >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
        fi
    done
    
    if [ "$found_secrets" = false ]; then
        log_success "No obvious secrets found in codebase"
        echo "✅ No obvious secrets found in codebase" >> "$REPORT_FILE"
    else
        log_error "Potential secrets found! Review $REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check Node.js dependencies
check_npm_dependencies() {
    log_info "Checking Node.js dependencies for vulnerabilities..."
    
    echo "## Node.js Dependencies" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    local found_npm=false
    
    # Check all package.json files
    for pkg in $(find . -name "package.json" -not -path "*/node_modules/*"); do
        found_npm=true
        local dir=$(dirname "$pkg")
        log_info "  Checking $pkg..."
        
        echo "### Directory: \`$dir\`" >> "$REPORT_FILE"
        
        if [ -f "$dir/package-lock.json" ] || [ -f "$dir/yarn.lock" ]; then
            (cd "$dir" && npm audit --json 2>/dev/null || true) | tee -a "$REPORT_FILE" || {
                log_warning "  npm audit failed for $dir"
                echo "⚠️ npm audit failed" >> "$REPORT_FILE"
            }
        else
            log_warning "  No lock file found in $dir - skipping"
            echo "⚠️ No lock file found - cannot audit" >> "$REPORT_FILE"
        fi
        
        echo "" >> "$REPORT_FILE"
    done
    
    if [ "$found_npm" = false ]; then
        log_info "No Node.js projects found"
        echo "ℹ️ No Node.js projects found" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check Python dependencies
check_python_dependencies() {
    log_info "Checking Python dependencies for vulnerabilities..."
    
    echo "## Python Dependencies" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    local found_python=false
    
    # Check all requirements files
    for req in $(find . -name "requirements*.txt" -not -path "*/venv/*"); do
        found_python=true
        log_info "  Checking $req..."
        
        echo "### File: \`$req\`" >> "$REPORT_FILE"
        
        # Try using pip-audit if available
        if command -v pip-audit &> /dev/null; then
            pip-audit -r "$req" 2>&1 | tee -a "$REPORT_FILE" || {
                log_warning "  pip-audit check failed for $req"
            }
        # Fallback to safety if available
        elif command -v safety &> /dev/null; then
            safety check -r "$req" 2>&1 | tee -a "$REPORT_FILE" || {
                log_warning "  safety check failed for $req"
            }
        else
            log_warning "  No Python security tools found (install pip-audit or safety)"
            echo "⚠️ No Python security tools available" >> "$REPORT_FILE"
        fi
        
        echo "" >> "$REPORT_FILE"
    done
    
    if [ "$found_python" = false ]; then
        log_info "No Python requirements files found"
        echo "ℹ️ No Python requirements files found" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check for insecure file permissions
check_file_permissions() {
    log_info "Checking file permissions..."
    
    echo "## File Permissions" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Find world-writable files
    local writable=$(find . -type f -perm -002 -not -path "*/.git/*" -not -path "*/node_modules/*" 2>/dev/null || true)
    
    if [ -n "$writable" ]; then
        log_warning "Found world-writable files:"
        echo "### ⚠️ World-Writable Files" >> "$REPORT_FILE"
        echo "\`\`\`" >> "$REPORT_FILE"
        echo "$writable" >> "$REPORT_FILE"
        echo "\`\`\`" >> "$REPORT_FILE"
    else
        log_success "No world-writable files found"
        echo "✅ No world-writable files found" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check Docker configurations
check_docker_security() {
    log_info "Checking Docker security..."
    
    echo "## Docker Security" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    local found_docker=false
    
    for dockerfile in $(find . -name "Dockerfile*" -not -path "*/node_modules/*"); do
        found_docker=true
        log_info "  Checking $dockerfile..."
        
        echo "### File: \`$dockerfile\`" >> "$REPORT_FILE"
        
        # Check for running as root
        if ! grep -q "USER" "$dockerfile"; then
            log_warning "  No USER directive found - likely running as root"
            echo "⚠️ No USER directive - container may run as root" >> "$REPORT_FILE"
        else
            log_success "  USER directive found"
            echo "✅ USER directive found" >> "$REPORT_FILE"
        fi
        
        # Check for HEALTHCHECK
        if ! grep -q "HEALTHCHECK" "$dockerfile"; then
            log_warning "  No HEALTHCHECK directive found"
            echo "ℹ️ No HEALTHCHECK directive" >> "$REPORT_FILE"
        fi
        
        echo "" >> "$REPORT_FILE"
    done
    
    if [ "$found_docker" = false ]; then
        log_info "No Dockerfiles found"
        echo "ℹ️ No Dockerfiles found" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Check git history for secrets
check_git_history() {
    log_info "Checking recent git history for secrets (last 50 commits)..."
    
    echo "## Git History Check" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    local patterns='password|secret|api[_-]?key|token|private[_-]?key'
    local found=$(git log -50 -p | grep -iE "$patterns" | grep -v "REDACTED" | head -20 || true)
    
    if [ -n "$found" ]; then
        log_warning "Found potential secrets in recent git history"
        echo "### ⚠️ Potential Secrets in History" >> "$REPORT_FILE"
        echo "\`\`\`" >> "$REPORT_FILE"
        echo "$found" >> "$REPORT_FILE"
        echo "\`\`\`" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "**Note**: This may include false positives. Review carefully." >> "$REPORT_FILE"
    else
        log_success "No obvious secrets in recent git history"
        echo "✅ No obvious secrets in recent git history" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Generate summary
generate_summary() {
    echo "## Recommendations" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "1. Review all warnings in this report" >> "$REPORT_FILE"
    echo "2. Remove any exposed secrets and rotate them immediately" >> "$REPORT_FILE"
    echo "3. Update dependencies with known vulnerabilities" >> "$REPORT_FILE"
    echo "4. Ensure sensitive files are in \`.gitignore\`" >> "$REPORT_FILE"
    echo "5. Use environment variables for all secrets" >> "$REPORT_FILE"
    echo "6. Enable GitHub secret scanning if not already enabled" >> "$REPORT_FILE"
    echo "7. Consider using tools like \`git-secrets\` or \`trufflehog\`" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    echo "Report generated by: security-check.sh" >> "$REPORT_FILE"
}

# Main execution
main() {
    log_info "Starting comprehensive security check..."
    echo ""
    
    init_report
    
    check_secrets
    check_npm_dependencies
    check_python_dependencies
    check_file_permissions
    check_docker_security
    check_git_history
    generate_summary
    
    echo ""
    log_success "Security check completed!"
    log_info "Report saved to: $REPORT_FILE"
    echo ""
    log_info "Please review the report and address any findings before merging PRs."
}

main "$@"
