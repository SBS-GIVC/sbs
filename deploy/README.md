# SBS Deployment

This directory contains deployment configurations for the SBS Integration Engine.

## Available Deployments

### VPS Deployment (`vps/`)

Production-ready deployment for VPS servers using Docker Compose and Cloudflare Tunnel.

**Best for:**
- Single VPS deployments
- Self-hosted installations
- Integration with existing infrastructure (e.g., n8n on same server)

**Features:**
- Complete Docker Compose setup
- Cloudflare Tunnel for secure exposure (no open ports)
- Optional Traefik integration
- Automated database backups
- Health monitoring scripts
- GitHub Actions CI/CD workflow

**Quick Start:**
```bash
cd deploy/vps
cp .env.vps.example .env
# Edit .env with your credentials
docker compose --profile cloudflare up -d
```

**Documentation:**
- [VPS Deployment Guide](vps/README.md) - Comprehensive deployment documentation
- [Quick Start Guide](../docs/VPS_QUICK_START.md) - 5-minute deployment walkthrough
- [GitHub Secrets Guide](../docs/GITHUB_SECRETS_GUIDE.md) - CI/CD configuration
- [Deployment Checklist](../docs/VPS_DEPLOYMENT_CHECKLIST.md) - Step-by-step validation

---

## Deployment Comparison

| Feature | VPS Deployment |
|---------|----------------|
| **Infrastructure** | Single VPS, Docker Compose |
| **Scaling** | Vertical (upgrade VPS) |
| **Complexity** | Low |
| **Cost** | Fixed (VPS cost) |
| **Maintenance** | Manual updates via SSH or GitHub Actions |
| **Exposure** | Cloudflare Tunnel (secure, no open ports) |
| **Database** | PostgreSQL container with persistent volume |
| **Backup** | Automated script + cron |
| **Monitoring** | Built-in health checks |
| **CI/CD** | GitHub Actions workflow included |

---

## Architecture

### VPS Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTPS (Cloudflare Tunnel)
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                          │
│              (DDoS Protection, SSL, Caching)                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ Encrypted Tunnel
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                    VPS (srv791040.hstgr.cloud)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Cloudflare Tunnel Container               │   │
│  └────────┬────────────────────────────────────────────┘   │
│           │ Internal Network (sbs-internal)                 │
│  ┌────────▼────────────────────────────────────────────┐   │
│  │         SBS Landing (Orchestration API)             │   │
│  │              Port 3000 (internal)                    │   │
│  └────┬──────┬──────┬──────┬──────────────────────────┘   │
│       │      │      │      │                                │
│  ┌────▼──┐┌──▼───┐┌▼────┐┌▼──────┐                        │
│  │Norm- ││Fin- ││Sign││NPHIES│                        │
│  │alizer││ancial││er  ││Bridge│                        │
│  │8000  ││8002  ││8001││8003  │                        │
│  └──┬───┘└──┬───┘└┬───┘└┬─────┘                        │
│     │       │     │     │                                   │
│  ┌──▼───────▼─────▼─────▼────────────────────────────┐   │
│  │            PostgreSQL Database                      │   │
│  │              Port 5432 (internal)                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          Existing n8n Installation                  │   │
│  │          (Separate compose project)                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Cloudflare Tunnel** - Eliminates need for open ports, provides DDoS protection and SSL
2. **Internal Docker Network** - Services communicate internally without external exposure
3. **Separate Compose Project** - Won't interfere with existing n8n installation
4. **Persistent Volumes** - Database and uploads survive container restarts
5. **Health Checks** - Automated monitoring of all services
6. **Profile-based Services** - Optional Cloudflare Tunnel or Traefik via Docker Compose profiles

---

## Deployment Workflow

### Manual Deployment

1. **Prepare VPS**
   ```bash
   ssh root@srv791040.hstgr.cloud
   sudo mkdir -p /opt/sbs
   sudo chown $USER:$USER /opt/sbs
   ```

2. **Clone and Configure**
   ```bash
   cd /opt/sbs
   git clone https://github.com/SBS-GIVC/sbs.git .
   cd deploy/vps
   cp .env.vps.example .env
   nano .env  # Configure credentials
   ```

3. **Deploy**
   ```bash
   cd /opt/sbs
   ./scripts/deploy-vps.sh
   ```

### Automated Deployment (GitHub Actions)

1. **Configure GitHub Secrets** (one-time setup)
   - See [GitHub Secrets Guide](../docs/GITHUB_SECRETS_GUIDE.md)

2. **Trigger Deployment**
   - Go to GitHub Actions → "Deploy to VPS" → Run workflow
   - Select environment (staging/production)
   - Deploy!

3. **Monitor**
   - View deployment progress in Actions tab
   - Check deployment summary
   - Verify health endpoints

---

## Service URLs

After deployment, services are accessible at:

- **Main API**: https://sbs.brainsait.cloud
- **Health Check**: https://sbs.brainsait.cloud/health
- **Service Status**: https://sbs.brainsait.cloud/api/services/status

Internal Docker network URLs (for n8n integration):
- **Landing**: http://sbs-vps-landing:3000
- **Normalizer**: http://sbs-vps-normalizer:8000
- **Financial Rules**: http://sbs-vps-financial-rules:8002
- **Signer**: http://sbs-vps-signer:8001
- **NPHIES Bridge**: http://sbs-vps-nphies-bridge:8003

---

## Common Operations

### Update Services
```bash
cd /opt/sbs
git pull origin main
./scripts/deploy-vps.sh
```

### View Logs
```bash
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs -f
```

### Restart Service
```bash
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml restart <service-name>
```

### Backup Database
```bash
docker exec sbs-vps-postgres pg_dump -U postgres sbs_integration > /opt/sbs/backups/backup.sql
gzip /opt/sbs/backups/backup.sql
```

### Health Check
```bash
/opt/sbs/scripts/vps/health-check.sh local  # Check locally
/opt/sbs/scripts/vps/health-check.sh tunnel  # Check via Cloudflare
```

---

## Security Considerations

### VPS Deployment Security

✅ **Implemented:**
- Cloudflare Tunnel (no open inbound ports)
- Internal Docker network isolation
- Environment variables for secrets
- Certificate storage with restricted permissions
- CORS origin restrictions
- Health check endpoints

⚠️ **Required Configuration:**
- Strong database password
- SSH key authentication (disable password auth)
- Firewall configuration (only SSH if needed)
- Regular security updates
- Certificate rotation
- Secret rotation policy

📚 **Best Practices:**
- Use GitHub Secrets for CI/CD credentials
- Never commit `.env` files
- Enable GitHub branch protection
- Require reviews for production deployments
- Monitor logs for security events
- Setup automated backups

---

## Troubleshooting

### Quick Diagnostics

```bash
# Check all services
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml ps

# Check specific service logs
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs <service>

# Check Docker resources
docker stats

# Test internal connectivity
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml exec landing \
  curl http://normalizer-service:8000/health
```

### Common Issues

**Service won't start:**
- Check logs for error messages
- Verify environment variables are set
- Ensure database is healthy

**Can't access via Cloudflare:**
- Check cloudflared logs
- Verify tunnel token is correct
- Ensure DNS is configured

**Database connection errors:**
- Check postgres container is running
- Verify DB_PASSWORD matches in .env
- Check database initialization logs

See [VPS Deployment Guide](vps/README.md#troubleshooting) for detailed troubleshooting steps.

---

## Support

- **Documentation**: See `docs/` directory
- **Issues**: https://github.com/SBS-GIVC/sbs/issues
- **Deployment Help**: See deployment guides in this directory

---

## Future Deployment Options

Potential future deployments to consider:

- **Kubernetes (k8s/)** - For multi-node, auto-scaling deployments
- **Docker Swarm** - For simpler multi-node setups
- **Cloud Platforms** - AWS ECS, Azure Container Apps, GCP Cloud Run
- **Serverless** - For cost-optimized, pay-per-use deployments

Contributions welcome!
