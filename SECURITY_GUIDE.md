# 🔒 SBS Security Guide

## ⚠️ Critical Security Notice

**NEVER commit sensitive credentials to the repository!** All API keys, passwords, and certificates must be managed through secure channels.

---

## 🔑 Secrets Management

### Environment Variables

All sensitive data must be stored in environment variables, never hardcoded in source code.

#### Required Environment Variables

```bash
# Database
DB_NAME=sbs_production
DB_USER=sbs_user
DB_PASSWORD=<GENERATE_STRONG_PASSWORD>

# API Keys
DEEPSEEK_API_KEY=<YOUR_DEEPSEEK_API_KEY>
NPHIES_API_KEY=<YOUR_NPHIES_API_KEY>
NPHIES_API_SECRET=<YOUR_NPHIES_SECRET>

# n8n Workflow Engine
N8N_PASSWORD=<GENERATE_STRONG_PASSWORD>
N8N_ENCRYPTION_KEY=<GENERATE_32_BYTE_BASE64_KEY>

# Monitoring
GRAFANA_PASSWORD=<GENERATE_STRONG_PASSWORD>
REDIS_COMMANDER_PASSWORD=<GENERATE_STRONG_PASSWORD>

# Application
ALLOWED_ORIGINS=https://sbs.brainsait.cloud
NODE_ENV=production
```

#### Generate Secure Credentials

```bash
# Database password (32 characters, alphanumeric + special)
openssl rand -base64 32

# N8N encryption key (32-byte base64)
openssl rand -base64 32

# JWT secret (64 characters)
openssl rand -hex 32
```

---

## 🛡️ Deployment Security

### Production Deployment

1. **Never use default passwords in production**
   - All services must use strong, randomly generated passwords
   - Rotate passwords regularly (every 90 days minimum)

2. **Use GitHub Secrets for CI/CD**
   ```bash
   # Add secrets via GitHub web interface:
   # Settings → Secrets and variables → Actions → New repository secret
   ```

3. **Kubernetes Secrets**
   ```bash
   # Create secrets directly in cluster, never commit to repository
   kubectl create secret generic sbs-secrets \
     --from-literal=db-password=<PASSWORD> \
     --from-literal=api-key=<API_KEY> \
     -n sbs-prod
   ```

4. **VPS Deployment**
   ```bash
   # Always use environment variables
   export VPS_HOSTNAME="your-vps-ip"
   export VPS_PASSWORD="your-secure-password"
   python deploy_vps.py
   ```

---

## 🔍 Security Scanning

### Pre-commit Hooks (Recommended)

Install git-secrets to prevent committing sensitive data:

```bash
# Install git-secrets
brew install git-secrets  # macOS
apt-get install git-secrets  # Ubuntu

# Configure for repository
cd /path/to/sbs
git secrets --install
git secrets --register-aws
git secrets --add 'sk-[0-9a-zA-Z]{32,}'  # API keys
git secrets --add '[pP]assword\s*[:=]\s*["\'][^"\']{8,}'  # Passwords
```

### Automated Security Scanning

The CI/CD pipeline includes:
- **Bandit**: Python security linter
- **Safety**: Python dependency vulnerability scanner
- **npm audit**: Node.js dependency vulnerability scanner
- **CodeQL**: Advanced code security analysis

---

## 🚨 Security Incident Response

### If Credentials Are Exposed

1. **Immediate Actions:**
   ```bash
   # 1. Rotate ALL exposed credentials immediately
   # 2. Revoke exposed API keys from provider dashboard
   # 3. Change all affected passwords
   # 4. Review git history for exposure timeline
   ```

2. **Clean Git History:**
   ```bash
   # Use BFG Repo-Cleaner to remove sensitive data
   git clone --mirror https://github.com/SBS-GIVC/sbs.git
   java -jar bfg.jar --replace-text passwords.txt sbs.git
   cd sbs.git
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

3. **Notify Team:**
   - Document incident in security log
   - Update credentials in all environments
   - Verify no unauthorized access occurred

---

## 📋 Security Checklist

### Before Every Deployment

- [ ] All environment variables set correctly
- [ ] No hardcoded credentials in code
- [ ] `.env` file is in `.gitignore`
- [ ] Security scans passed (Bandit, Safety, npm audit)
- [ ] Dependencies up to date
- [ ] TLS/SSL certificates valid
- [ ] CORS origins properly configured
- [ ] Rate limiting enabled
- [ ] Logging configured for audit trail

### Monthly Security Review

- [ ] Rotate database passwords
- [ ] Review API key usage and permissions
- [ ] Update dependencies (security patches)
- [ ] Review access logs for anomalies
- [ ] Backup encryption keys securely
- [ ] Test disaster recovery procedures

---

## 🔐 Best Practices

### Code Security

1. **Input Validation**
   - Validate all user inputs
   - Use Pydantic models for type safety
   - Sanitize data before database operations

2. **Error Handling**
   - Never expose sensitive info in error messages
   - Log errors securely with context
   - Implement proper exception handling

3. **Authentication & Authorization**
   - Use strong JWT secrets
   - Implement role-based access control (RBAC)
   - Session timeout after inactivity

4. **Data Protection**
   - Encrypt sensitive data at rest
   - Use TLS 1.2+ for data in transit
   - Implement PDPL compliance for PII

### Infrastructure Security

1. **Network Security**
   - Use private networks for inter-service communication
   - Implement firewall rules
   - Restrict database access to internal services only

2. **Container Security**
   - Use official base images
   - Scan Docker images for vulnerabilities
   - Run containers as non-root user
   - Keep images updated

3. **Monitoring & Alerting**
   - Monitor for suspicious activity
   - Set up alerts for failed authentication attempts
   - Track API rate limiting violations
   - Regular security audit logs

---

## 📞 Security Contacts

For security issues, contact:
- **Email**: security@sbs-integration.sa
- **Response Time**: Critical issues within 4 hours

**Do not disclose security vulnerabilities publicly.**

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Saudi PDPL Compliance](https://pdpl.gov.sa/)
- [NPHIES Security Guidelines](https://nphies.sa/security)

---

**Last Updated**: 2026-02-06  
**Version**: 1.0
