# DeepSeek API Key Rotation & Secrets Management

## Overview
This guide describes best practices for managing, rotating, and securing the DeepSeek API key used by the SBS normalizer service.

## Secrets Storage

### Development
- Store keys in `normalizer-service/.env` (git-ignored)
- Never commit `.env` to version control
- Use `.env.example` as a template

If you use **n8n DeepSeek-direct** workflows, `DEEPSEEK_API_KEY` is also loaded
into the n8n runtime environment (compose env / secrets manager). Rotate it
there as well.

### Staging/Production
Use a dedicated secrets manager:
- **AWS**: AWS Secrets Manager or Systems Manager Parameter Store
- **Azure**: Azure Key Vault
- **GCP**: Google Secret Manager
- **HashiCorp**: Vault
- **GitHub**: Repository Secrets (for CI/CD only)

## Setting Up DeepSeek

### 1. Obtain API Key
1. Sign up at https://platform.deepseek.com/
2. Generate an API key from the dashboard
3. Save it securely (you'll only see it once)

### 2. Configure Environment

#### Staging (DeepSeek enabled by default)
```bash
export ENVIRONMENT=staging
export DEEPSEEK_API_KEY=<YOUR_DEEPSEEK_API_KEY>
export AI_PROVIDER=deepseek  # optional, auto-detected
```

#### Production (Requires explicit opt-in)
```bash
export ENVIRONMENT=production
export DEEPSEEK_API_KEY=<YOUR_DEEPSEEK_API_KEY>
export ENABLE_DEEPSEEK=true  # REQUIRED in production
export AI_PROVIDER=deepseek  # optional
```

### 3. Feature Flag Gating

The normalizer service uses `feature_flags.py` to control AI provider selection:

```python
from normalizer-service.feature_flags import get_ai_provider

provider = get_ai_provider()
# Returns: 'gemini' | 'deepseek' | 'disabled'
```

**Behavior by environment:**
- `development`: Use any provider with available key
- `staging`: DeepSeek enabled if key present (no flag needed)
- `production`: DeepSeek requires `ENABLE_DEEPSEEK=true` + key

## Key Rotation Procedure

### When to Rotate
- Every 90 days (recommended)
- Immediately if key is exposed (committed to git, logs, etc.)
- When team member with access leaves
- After security incident

### Rotation Steps

1. **Generate new key** at DeepSeek platform
2. **Update secrets manager**:
   ```bash
   # AWS example
   aws secretsmanager update-secret \
     --secret-id sbs/normalizer/deepseek-api-key \
    --secret-string "<NEW_DEEPSEEK_API_KEY>"
   
   # Azure example
   az keyvault secret set \
     --vault-name sbs-vault \
     --name deepseek-api-key \
    --value "<NEW_DEEPSEEK_API_KEY>"
   ```
3. **Trigger rolling deployment** to pick up new secret
4. **Verify** health endpoints return healthy
5. **Revoke old key** at DeepSeek platform
6. **Document rotation** in audit log

### Emergency Rotation (Key Leaked)

If a key is leaked:

1. **Immediately revoke** the key at DeepSeek platform
2. **Generate replacement** key
3. **Update all environments** (staging + production)
4. **Force restart** all normalizer service pods/containers
5. **Audit access logs** for unauthorized usage
6. **Notify security team**

## Purging Keys from Git History

If a key was accidentally committed:

### Using git-filter-repo (recommended)
```bash
# Install
pip install git-filter-repo

# Remove all occurrences
git filter-repo --path normalizer-service/.env --invert-paths --force

# Force push (WARNING: destructive)
git push origin --force --all
git push origin --force --tags
```

### Using BFG Repo-Cleaner
```bash
# Download BFG
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Remove .env files
java -jar bfg-1.14.0.jar --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
```

### Notify Team
After purging:
1. Inform all contributors to re-clone the repo
2. Update any CI/CD pipelines pointing to old commits
3. Rotate the leaked key immediately

## CI/CD Integration

### GitHub Actions
The repository uses GitHub Secrets for CI:

```yaml
# .github/workflows/ci-deepseek.yml
env:
  DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
```

To set the secret:
```bash
# Using GitHub CLI
gh secret set DEEPSEEK_API_KEY --body "<YOUR_DEEPSEEK_API_KEY>"

# Or via GitHub UI:
# Repo > Settings > Secrets and variables > Actions > New repository secret
```

### Docker Compose
Never hardcode secrets in `docker-compose.yml`:

```yaml
# WRONG - never do this
environment:
  DEEPSEEK_API_KEY: <YOUR_DEEPSEEK_API_KEY>

# CORRECT - use env_file or external secrets
env_file:
  - normalizer-service/.env  # git-ignored
# OR
environment:
  DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}  # from host environment
```

### Kubernetes
Use Kubernetes Secrets:

```bash
# Create secret
kubectl create secret generic normalizer-secrets \
  --from-literal=deepseek-api-key=<YOUR_DEEPSEEK_API_KEY> \
  --namespace=sbs

# Reference in deployment
# deployment.yaml
env:
  - name: DEEPSEEK_API_KEY
    valueFrom:
      secretKeyRef:
        name: normalizer-secrets
        key: deepseek-api-key
```

## Monitoring & Auditing

### Track AI API Usage
Monitor these metrics:
- `ai_calls_total` - total AI provider requests
- `ai_calls_deepseek` - DeepSeek-specific calls
- `ai_fallback_triggered` - when AI unavailable

### Alert Conditions
Set up alerts for:
- Unusual spike in AI calls (potential key abuse)
- AI provider returning 401/403 (key invalid/revoked)
- Circuit breaker opening on AI calls

### Audit Log
Log AI provider selection at startup:
```
INFO: AI provider configured: deepseek (environment=staging, gated=false)
INFO: AI provider configured: disabled (environment=production, gated=true, ENABLE_DEEPSEEK=false)
```

## Compliance & Data Privacy

### Data Sent to AI Providers
The normalizer sends:
- Internal service codes (e.g., "LAB-001")
- Service descriptions (e.g., "Complete Blood Count")
- Facility ID (anonymized integer)

**NOT sent:**
- Patient names, IDs, or PHI
- Claim amounts or financial data
- Authentication credentials

## Copilot Gateway & Additional Secrets

The SBS Copilot can optionally call an internal gateway (recommended) instead of
calling an external provider directly.

### Normalizer Copilot gateway variables

Set these on **normalizer-service**:

```bash
export AI_COPILOT_URL=http://ai-gateway:8010/chat
export AI_COPILOT_API_KEY=   # optional; if empty, provider key is used when applicable
export AI_COPILOT_TIMEOUT_SECONDS=12
```

### AI Gateway routing (n8n / Cloudflare)

If you run `ai-gateway`, you may store one of the following:

**n8n webhook**
```bash
export AI_GATEWAY_N8N_WEBHOOK_URL=https://<n8n>/webhook/<id>
```

**Cloudflare AI Gateway**
```bash
export CLOUDFLARE_AI_GATEWAY_URL=https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/openai
export CLOUDFLARE_API_TOKEN=<token>
```

These secrets should follow the same rotation standards (90 days recommended).

### Regional Considerations
- DeepSeek may process data outside Saudi Arabia
- Review your data residency requirements
- Consider using a self-hosted LLM if needed

### Compliance Checklist
- [ ] DeepSeek terms of service reviewed and accepted
- [ ] Data processing agreement signed (if required)
- [ ] Privacy impact assessment completed
- [ ] Key rotation schedule documented
- [ ] Incident response plan in place
- [ ] Audit logging enabled and monitored

## Troubleshooting

### AI Provider Not Working
1. Check feature flag: `echo $ENABLE_DEEPSEEK`
2. Verify key present: `echo ${DEEPSEEK_API_KEY:0:8}...` (don't print full key)
3. Test connectivity: `curl -H "Authorization: Bearer $DEEPSEEK_API_KEY" https://api.deepseek.com/health`
4. Check logs for API errors
5. Verify circuit breaker not open

### Switching Providers
To switch from DeepSeek to Gemini:
```bash
# Disable DeepSeek
export ENABLE_DEEPSEEK=false
# OR
export AI_PROVIDER=gemini
export GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>

# Restart service
docker-compose restart normalizer
```

## Support
- **DeepSeek Platform**: https://platform.deepseek.com/
- **SBS Team**: Contact SecOps for secret rotation requests
- **On-call**: Page #normalizer-oncall for production incidents
