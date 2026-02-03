# SBS VPS Deployment Guide

This guide covers deploying the SBS Integration Engine to a VPS server using Docker Compose and Cloudflare Tunnel.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Cloudflare Tunnel Setup](#cloudflare-tunnel-setup)
- [Deployment](#deployment)
- [Day-2 Operations](#day-2-operations)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements
- Ubuntu 24.04 (or similar Linux distribution)
- Docker Engine 24.0+ and Docker Compose V2
- Minimum 4GB RAM, 2 CPU cores, 20GB disk space
- SSH access with sudo privileges

### External Services
- Cloudflare account with domain configured
- NPHIES API credentials (for production)
- AI Provider API key (Gemini or DeepSeek)
- SSL/TLS certificates for NPHIES signing (if applicable)

---

## Initial Setup

### 1. Install Docker (if not present)

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 2. Create Deployment Directory

```bash
# Create application directory
sudo mkdir -p /opt/sbs
sudo chown $USER:$USER /opt/sbs
cd /opt/sbs

# Clone repository (or use deployment script)
git clone https://github.com/SBS-GIVC/sbs.git .
cd deploy/vps
```

### 3. Configure Environment Variables

```bash
# Copy environment template
cp .env.vps.example .env

# Edit with your credentials
nano .env
```

**Critical variables to set:**
- `DB_PASSWORD` - Strong PostgreSQL password
- `DEEPSEEK_API_KEY` or `GEMINI_API_KEY` - AI provider credentials
- `NPHIES_API_KEY` - NPHIES integration credentials
- `ALLOWED_ORIGINS` - Your frontend domain(s)
- `CLOUDFLARE_TUNNEL_TOKEN` - Cloudflare tunnel token (see below)

### 4. Prepare Certificates

If using NPHIES digital signatures:

```bash
# Create certificates directory
mkdir -p /opt/sbs/certs
chmod 700 /opt/sbs/certs

# Copy your certificates
# scp your-cert.pem user@srv791040.hstgr.cloud:/opt/sbs/certs/
# scp your-key.pem user@srv791040.hstgr.cloud:/opt/sbs/certs/
```

### 5. Initialize Database Schema

```bash
# The database schema will be automatically initialized on first run
# Schema is located at: ../../database/schema.sql
```

---

## Cloudflare Tunnel Setup

Cloudflare Tunnel provides secure exposure without opening inbound firewall ports.

### 1. Install cloudflared CLI (on your local machine)

```bash
# Download and install
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login to Cloudflare
cloudflared tunnel login
```

### 2. Create Tunnel

```bash
# Create a new tunnel
cloudflared tunnel create sbs-vps

# Note the Tunnel ID from output
```

### 3. Configure DNS Routes

```bash
# Route your domain through the tunnel
cloudflared tunnel route dns sbs-vps sbs.brainsait.cloud

# Optional: route subdomains for individual services
# cloudflared tunnel route dns sbs-vps normalizer.brainsait.cloud
# cloudflared tunnel route dns sbs-vps api.brainsait.cloud
```

### 4. Get Tunnel Token

```bash
# Get the tunnel token
cloudflared tunnel token sbs-vps
```

Copy the token and add it to your `.env` file:
```bash
CLOUDFLARE_TUNNEL_TOKEN=eyJh...your-token-here
```

### 5. Create Tunnel Configuration (Alternative Method)

If you prefer using a config file instead of token:

Create `/opt/sbs/cloudflared-config.yml`:
```yaml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: sbs.brainsait.cloud
    service: http://sbs-vps-landing:3000
  - hostname: normalizer.brainsait.cloud
    service: http://sbs-vps-normalizer:8000
  - service: http_status:404
```

---

## Deployment

### Using Docker Compose Directly

```bash
cd /opt/sbs/deploy/vps

# Start with Cloudflare Tunnel
docker compose --profile cloudflare up -d

# Or if using Traefik (requires traefik network to exist)
docker compose --profile traefik up -d

# Check status
docker compose ps
```

### Using Deployment Script

```bash
cd /opt/sbs
./scripts/deploy-vps.sh
```

### Verify Deployment

```bash
# Check all services are running
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml ps

# Check logs
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs -f

# Run health checks
/opt/sbs/scripts/vps/health-check.sh
```

### Access the Application

- **Main API**: https://sbs.brainsait.cloud/health
- **Services Status**: https://sbs.brainsait.cloud/api/services/status

---

## Day-2 Operations

### Update Services

```bash
cd /opt/sbs/deploy/vps

# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Alternative: use deployment script
cd /opt/sbs
git pull origin main
./scripts/deploy-vps.sh
```

### View Logs

```bash
# All services
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs -f

# Specific service
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs -f sbs-vps-landing

# Last 100 lines
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs --tail=100
```

### Database Backup

```bash
# Create backup directory
mkdir -p /opt/sbs/backups

# Backup database
docker exec sbs-vps-postgres pg_dump -U postgres sbs_integration > /opt/sbs/backups/sbs_$(date +%Y%m%d_%H%M%S).sql

# Compress backup
gzip /opt/sbs/backups/sbs_$(date +%Y%m%d_%H%M%S).sql
```

### Database Restore

```bash
# Restore from backup
gunzip -c /opt/sbs/backups/sbs_20260203_120000.sql.gz | \
  docker exec -i sbs-vps-postgres psql -U postgres -d sbs_integration
```

### Rollback

```bash
cd /opt/sbs

# Checkout previous version
git checkout <previous-commit-or-tag>

# Rebuild and restart
cd deploy/vps
docker compose build
docker compose up -d
```

### Monitor Resource Usage

```bash
# System resources
docker stats

# Disk usage
docker system df
du -sh /opt/sbs/*

# Database size
docker exec sbs-vps-postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('sbs_integration'));"
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (CAREFUL!)
docker volume prune

# Remove old logs
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs --tail=0 > /dev/null
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs <service-name>

# Check service health
docker inspect sbs-vps-<service-name> | grep -A 10 Health

# Restart service
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml restart <service-name>
```

### Database Connection Issues

```bash
# Test database connectivity
docker exec sbs-vps-postgres psql -U postgres -c "\l"

# Check if services can reach database
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml exec normalizer-service \
  python -c "import psycopg2; psycopg2.connect('host=postgres dbname=sbs_integration user=postgres password=...')"
```

### Cloudflare Tunnel Issues

```bash
# Check tunnel status
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs cloudflared

# Verify tunnel is connected (on local machine)
cloudflared tunnel info sbs-vps

# Restart tunnel
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml restart cloudflared
```

### High CPU/Memory Usage

```bash
# Identify resource hog
docker stats --no-stream

# Restart specific service
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml restart <service-name>

# Add resource limits to docker-compose.vps.yml if needed
```

### SSL/Certificate Errors

```bash
# Verify certificates exist
ls -la /opt/sbs/certs/

# Check certificate permissions
chmod 600 /opt/sbs/certs/*.pem
chmod 600 /opt/sbs/certs/*.key

# Test certificate loading in signer service
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs signer-service | grep -i cert
```

### Network Issues

```bash
# List networks
docker network ls

# Inspect SBS network
docker network inspect vps_sbs-internal

# Test service-to-service connectivity
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml exec landing \
  curl http://normalizer-service:8000/health
```

---

## Security Considerations

1. **Firewall**: Since using Cloudflare Tunnel, all inbound ports can remain closed except SSH
2. **SSH Hardening**: Use SSH keys, disable password auth, change default port
3. **Environment Variables**: Never commit `.env` files; use secrets management in production
4. **Database**: Strong password, regular backups, encrypted backups at rest
5. **Certificates**: Secure file permissions (600), rotate regularly
6. **Updates**: Keep Docker, OS, and application images up to date
7. **Monitoring**: Set up log aggregation and alerting for production

---

## Integration with Existing n8n

The SBS stack runs as a separate Docker Compose project and won't interfere with existing n8n:

- Different container names (`sbs-vps-*` prefix)
- Separate Docker network (`sbs-internal`)
- Different ports (if exposing locally)
- Can optionally share external Traefik network if needed

To allow n8n workflows to call SBS services:
1. Add n8n to the `sbs-internal` network, or
2. Expose SBS services through Cloudflare Tunnel and call via public URLs

---

## GitHub Actions Integration

See [GitHub Actions Deployment Workflow](../../.github/workflows/deploy-vps.yml) for automated deployments.

Configure these GitHub Secrets:
- `VPS_HOST` - Server IP or hostname
- `VPS_USER` - SSH user
- `VPS_SSH_KEY` - Private SSH key
- `VPS_DB_PASSWORD` - Database password
- `VPS_NPHIES_API_KEY` - NPHIES credentials
- `VPS_DEEPSEEK_API_KEY` - AI provider key
- `VPS_CLOUDFLARE_TUNNEL_TOKEN` - Tunnel token

---

## Support & Resources

- **Documentation**: `/docs` directory in repository
- **Issues**: https://github.com/SBS-GIVC/sbs/issues
- **Production Guide**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Security Audit**: `SECURITY_AUDIT_SUMMARY.md`
