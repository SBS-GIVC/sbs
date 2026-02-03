# VPS Deployment Quick Start

This guide provides a streamlined path to deploy SBS on your VPS.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] VPS running Ubuntu 24.04
- [ ] SSH access to VPS (with sudo privileges)
- [ ] Domain configured in Cloudflare
- [ ] Docker installed on VPS (or follow installation steps below)
- [ ] NPHIES API credentials (production) or use mock mode
- [ ] AI Provider API key (DeepSeek recommended or Gemini)

## 5-Minute Setup

### 1. Install Docker on VPS (if needed)

```bash
# Connect to your VPS
ssh root@srv791040.hstgr.cloud

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verify
docker --version
docker compose version
```

### 2. Clone Repository on VPS

```bash
# Create deployment directory
sudo mkdir -p /opt/sbs
sudo chown $USER:$USER /opt/sbs

# Clone repository
cd /opt/sbs
git clone https://github.com/SBS-GIVC/sbs.git .
```

### 3. Configure Environment

```bash
# Navigate to deployment config
cd /opt/sbs/deploy/vps

# Copy environment template
cp .env.vps.example .env

# Edit with your credentials
nano .env
```

**Minimum required variables:**
```bash
DB_PASSWORD=your_secure_password_here
DEEPSEEK_API_KEY=your_deepseek_api_key
NPHIES_API_KEY=your_nphies_api_key
CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_tunnel_token
ALLOWED_ORIGINS=https://sbs.brainsait.cloud
```

### 4. Setup Cloudflare Tunnel

On your **local machine** (where you have `wrangler` or `cloudflared` authenticated):

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create sbs-vps

# Configure DNS
cloudflared tunnel route dns sbs-vps sbs.brainsait.cloud

# Get token
cloudflared tunnel token sbs-vps
# Copy this token to your .env file on VPS
```

### 5. Deploy Services

```bash
# On VPS
cd /opt/sbs

# Run deployment script
./scripts/deploy-vps.sh

# Or manually:
cd deploy/vps
docker compose --profile cloudflare up -d
```

### 6. Verify Deployment

```bash
# Check service status
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml ps

# Run health checks
/opt/sbs/scripts/vps/health-check.sh local

# Check logs
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs -f
```

### 7. Access Application

Visit: **https://sbs.brainsait.cloud/health**

You should see:
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T12:00:00.000Z",
  "services": {
    "normalizer": "healthy",
    "financial": "healthy",
    "signer": "healthy",
    "nphies": "healthy"
  }
}
```

## GitHub Actions Automated Deployment

### 1. Configure GitHub Secrets

In your GitHub repository, add these secrets:

**Required Secrets:**
- `VPS_HOST` → `82.25.101.65` (or `srv791040.hstgr.cloud`)
- `VPS_USER` → `root` (or your SSH user)
- `VPS_SSH_KEY` → Your private SSH key (the full content)
- `VPS_DB_PASSWORD` → Database password
- `VPS_NPHIES_API_KEY` → NPHIES API credentials
- `VPS_DEEPSEEK_API_KEY` → DeepSeek API key
- `VPS_CLOUDFLARE_TUNNEL_TOKEN` → Cloudflare tunnel token

**Optional Variables (in Repository Variables):**
- `AI_PROVIDER` → `deepseek` (default)
- `ALLOWED_ORIGINS` → `https://sbs.brainsait.cloud`
- `NPHIES_ENV` → `sandbox` or `production`
- `DEPLOYMENT_URL` → `https://sbs.brainsait.cloud`

### 2. Trigger Deployment

**Manual Deployment:**
1. Go to GitHub Actions
2. Select "Deploy to VPS" workflow
3. Click "Run workflow"
4. Choose environment (staging/production)
5. Click "Run workflow"

**Automatic Deployment:**
- Push to `main` branch automatically triggers staging deployment

### 3. Monitor Deployment

View the deployment progress in GitHub Actions. The workflow will:
1. ✅ Checkout code
2. ✅ Package deployment files
3. ✅ Upload to VPS via SSH
4. ✅ Configure environment
5. ✅ Deploy services with Docker Compose
6. ✅ Run health checks
7. ✅ Generate deployment summary

## Common Tasks

### View Logs
```bash
cd /opt/sbs/deploy/vps
docker compose logs -f
```

### Restart Services
```bash
cd /opt/sbs/deploy/vps
docker compose restart
```

### Update to Latest Version
```bash
cd /opt/sbs
git pull origin main
./scripts/deploy-vps.sh
```

### Backup Database
```bash
docker exec sbs-vps-postgres pg_dump -U postgres sbs_integration > /opt/sbs/backups/backup_$(date +%Y%m%d).sql
gzip /opt/sbs/backups/backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
gunzip -c /opt/sbs/backups/backup_20260203.sql.gz | \
  docker exec -i sbs-vps-postgres psql -U postgres -d sbs_integration
```

### Check Resource Usage
```bash
docker stats
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs <service-name>

# Restart specific service
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml restart <service-name>
```

### Cloudflare Tunnel Not Working
```bash
# Check tunnel logs
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs cloudflared

# Restart tunnel
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml restart cloudflared
```

### Database Connection Issues
```bash
# Verify database is running
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml ps postgres

# Test connection
docker exec sbs-vps-postgres psql -U postgres -c "\l"
```

### High Memory Usage
```bash
# Check what's using resources
docker stats --no-stream

# Restart heavy service
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml restart <service-name>
```

## Security Checklist

- [ ] Strong database password configured
- [ ] SSH key-based authentication (no password auth)
- [ ] Firewall configured (only SSH port open, or none with Cloudflare Tunnel)
- [ ] Certificates stored securely (chmod 600)
- [ ] `.env` file not committed to git
- [ ] Regular database backups scheduled
- [ ] CORS origins properly configured
- [ ] Docker images regularly updated

## Next Steps

- **Production Checklist**: See `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Security Audit**: See `SECURITY_AUDIT_SUMMARY.md`
- **Integration**: Configure n8n workflows to use deployed services
- **Monitoring**: Set up log aggregation and alerting
- **Backup Strategy**: Automate database backups with cron

## Support

For detailed documentation, see:
- **VPS Deployment Guide**: `deploy/vps/README.md`
- **Production Guide**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Repository Issues**: https://github.com/SBS-GIVC/sbs/issues
