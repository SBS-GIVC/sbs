# GitHub Secrets Configuration Guide

This document lists all required and optional secrets/variables for the VPS deployment workflow.

## Setting up Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets and variables

---

## Required Secrets

These secrets **must** be configured for the deployment workflow to function.

### VPS Access

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VPS_HOST` | VPS IP address or hostname | `82.25.101.65` or `srv791040.hstgr.cloud` |
| `VPS_USER` | SSH username for VPS access | `root` or `deploy` |
| `VPS_SSH_KEY` | Private SSH key for authentication | Contents of `~/.ssh/id_rsa` |

**Generating SSH Key:**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy"

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@srv791040.hstgr.cloud

# Copy private key content to GitHub Secret
cat ~/.ssh/id_ed25519
```

### Database

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VPS_DB_PASSWORD` | PostgreSQL database password | Strong random password (min 16 chars) |

**Generating Strong Password:**
```bash
openssl rand -base64 32
```

### NPHIES Integration

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VPS_NPHIES_API_KEY` | NPHIES API credentials | Provided by NPHIES |

### AI Provider

Choose **one** of the following:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VPS_DEEPSEEK_API_KEY` | DeepSeek API key (recommended) | `sk-...` |
| `VPS_GEMINI_API_KEY` | Google Gemini API key (alternative) | `AI...` |

**Getting DeepSeek API Key:**
1. Sign up at https://platform.deepseek.com
2. Create API key in dashboard
3. Copy key to GitHub Secret

### Cloudflare Tunnel

| Secret Name | Description | Example |
|------------|-------------|---------|
| `VPS_CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare Tunnel authentication token | `eyJh...` (long token) |

**Getting Cloudflare Tunnel Token:**
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create sbs-vps

# Get token
cloudflared tunnel token sbs-vps
```

---

## Optional Secrets

These secrets are optional or have sensible defaults.

### Certificates (NPHIES Signing)

| Secret Name | Description | Default |
|------------|-------------|---------|
| `VPS_CERT_PASSWORD` | Certificate password for NPHIES signing | Empty (no password) |

---

## Repository Variables

These are **variables** (not secrets) and can be seen in workflow logs.

### Environment Configuration

| Variable Name | Description | Default | Options |
|--------------|-------------|---------|---------|
| `AI_PROVIDER` | AI provider to use | `deepseek` | `deepseek`, `gemini` |
| `NPHIES_ENV` | NPHIES environment | `sandbox` | `sandbox`, `production` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://sbs.brainsait.cloud` | Comma-separated URLs |
| `CORS_ORIGIN` | CORS origin header | Same as `ALLOWED_ORIGINS` | URL or `*` |
| `DEPLOYMENT_URL` | Deployment URL for GitHub Environment | `https://sbs.brainsait.cloud` | Your domain |

### NPHIES Configuration

| Variable Name | Description | Default |
|--------------|-------------|---------|
| `NPHIES_BASE_URL` | NPHIES API base URL | `https://sandbox.nphies.sa/api/v1` |

For production:
```
NPHIES_BASE_URL=https://api.nphies.sa/api/v1
```

---

## Environment-Specific Configuration

You can configure different values for staging and production environments.

### Setup Environments

1. Go to **Settings** → **Environments**
2. Create two environments:
   - `staging`
   - `production`

### Environment Variables

For each environment, configure:

**Staging:**
```
NPHIES_ENV=sandbox
DEPLOYMENT_URL=https://staging.sbs.brainsait.cloud
```

**Production:**
```
NPHIES_ENV=production
DEPLOYMENT_URL=https://sbs.brainsait.cloud
```

---

## Secrets Summary Table

Quick reference for all secrets:

| Priority | Secret Name | Required | Type |
|----------|------------|----------|------|
| 🔴 Critical | `VPS_HOST` | Yes | Secret |
| 🔴 Critical | `VPS_USER` | Yes | Secret |
| 🔴 Critical | `VPS_SSH_KEY` | Yes | Secret |
| 🔴 Critical | `VPS_DB_PASSWORD` | Yes | Secret |
| 🔴 Critical | `VPS_NPHIES_API_KEY` | Yes | Secret |
| 🔴 Critical | `VPS_DEEPSEEK_API_KEY` or `VPS_GEMINI_API_KEY` | Yes (one) | Secret |
| 🔴 Critical | `VPS_CLOUDFLARE_TUNNEL_TOKEN` | Yes | Secret |
| 🟡 Optional | `VPS_CERT_PASSWORD` | No | Secret |
| 🟢 Variable | `AI_PROVIDER` | No | Variable |
| 🟢 Variable | `NPHIES_ENV` | No | Variable |
| 🟢 Variable | `ALLOWED_ORIGINS` | No | Variable |
| 🟢 Variable | `DEPLOYMENT_URL` | No | Variable |

---

## Security Best Practices

### DO ✅

- ✅ Use strong, randomly generated passwords
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use SSH keys (not passwords) for VPS access
- ✅ Limit SSH key permissions (chmod 600)
- ✅ Use different secrets for staging and production
- ✅ Enable branch protection on `main`
- ✅ Require approval for production deployments

### DON'T ❌

- ❌ Commit secrets to git (use `.gitignore`)
- ❌ Share secrets in chat/email
- ❌ Use weak or default passwords
- ❌ Reuse passwords across services
- ❌ Store secrets in workflow files
- ❌ Use the same SSH key for multiple purposes
- ❌ Disable secret masking in logs

---

## Validation Script

Use this script to verify all required secrets are configured:

```bash
#!/bin/bash
# check-secrets.sh

REQUIRED_SECRETS=(
  "VPS_HOST"
  "VPS_USER"
  "VPS_SSH_KEY"
  "VPS_DB_PASSWORD"
  "VPS_NPHIES_API_KEY"
  "VPS_CLOUDFLARE_TUNNEL_TOKEN"
)

echo "Checking required secrets..."

# This script runs in GitHub Actions with secrets available
for secret in "${REQUIRED_SECRETS[@]}"; do
  if [ -z "${!secret}" ]; then
    echo "❌ Missing: $secret"
  else
    echo "✅ Found: $secret"
  fi
done

# Check AI provider (at least one required)
if [ -z "$VPS_DEEPSEEK_API_KEY" ] && [ -z "$VPS_GEMINI_API_KEY" ]; then
  echo "❌ Missing: VPS_DEEPSEEK_API_KEY or VPS_GEMINI_API_KEY (at least one required)"
else
  echo "✅ Found: AI provider key"
fi
```

---

## Troubleshooting

### "Permission denied (publickey)" Error

**Problem:** GitHub Actions cannot SSH to VPS

**Solution:**
1. Verify SSH key format (should be private key, not public)
2. Ensure public key is in VPS `~/.ssh/authorized_keys`
3. Check VPS SSH configuration allows key authentication
4. Test manually: `ssh -i key.pem user@host`

### "No such file or directory: .env" Error

**Problem:** Environment file not created on VPS

**Solution:**
1. Verify all required secrets are configured
2. Check workflow logs for .env creation step
3. Ensure VPS_DB_PASSWORD and other secrets are set

### Cloudflare Tunnel Not Working

**Problem:** Services not accessible via tunnel

**Solution:**
1. Verify tunnel token is correct
2. Check DNS records in Cloudflare dashboard
3. View cloudflared logs: `docker compose logs cloudflared`
4. Recreate tunnel if needed

### Database Connection Failed

**Problem:** Services cannot connect to database

**Solution:**
1. Verify VPS_DB_PASSWORD matches what's used
2. Check postgres container is running
3. Ensure database initialized: `docker compose logs postgres`

---

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. SSH to VPS and check container logs
3. Verify all secrets are configured correctly
4. Open an issue: https://github.com/SBS-GIVC/sbs/issues

---

## Example: Complete Setup

Here's a complete walkthrough:

```bash
# 1. Generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/sbs-deploy -C "sbs-github-deploy"

# 2. Copy public key to VPS
ssh-copy-id -i ~/.ssh/sbs-deploy.pub root@srv791040.hstgr.cloud

# 3. Generate database password
DB_PASSWORD=$(openssl rand -base64 32)
echo "Save this password: $DB_PASSWORD"

# 4. Setup Cloudflare tunnel
cloudflared tunnel login
cloudflared tunnel create sbs-vps
TUNNEL_ID=$(cloudflared tunnel list | grep sbs-vps | awk '{print $1}')
cloudflared tunnel route dns $TUNNEL_ID sbs.brainsait.cloud
TUNNEL_TOKEN=$(cloudflared tunnel token $TUNNEL_ID)
echo "Save this token: $TUNNEL_TOKEN"

# 5. Add to GitHub Secrets
# - VPS_HOST: srv791040.hstgr.cloud
# - VPS_USER: root
# - VPS_SSH_KEY: [content of ~/.ssh/sbs-deploy]
# - VPS_DB_PASSWORD: [generated password]
# - VPS_CLOUDFLARE_TUNNEL_TOKEN: [generated token]
# - VPS_NPHIES_API_KEY: [from NPHIES]
# - VPS_DEEPSEEK_API_KEY: [from DeepSeek]

# 6. Trigger deployment
# Go to Actions → Deploy to VPS → Run workflow
```

Done! 🚀
