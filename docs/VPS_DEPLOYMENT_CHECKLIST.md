# VPS Deployment Checklist

Use this checklist to ensure a smooth deployment of SBS to your VPS.

## Pre-Deployment Phase

### Infrastructure
- [ ] VPS provisioned (Ubuntu 24.04)
  - [ ] IP: 82.25.101.65
  - [ ] Hostname: srv791040.hstgr.cloud
  - [ ] Resources: 4GB RAM, 2 CPU, 20GB disk minimum
- [ ] SSH access configured
  - [ ] SSH key generated
  - [ ] Public key added to VPS authorized_keys
  - [ ] Test SSH connection: `ssh root@srv791040.hstgr.cloud`
- [ ] Docker installed on VPS
  - [ ] Docker Engine 24.0+
  - [ ] Docker Compose V2

### Domain & DNS
- [ ] Domain registered and configured in Cloudflare
- [ ] Cloudflare account access
- [ ] Cloudflare tunnel created
  - [ ] Tunnel name: `sbs-vps`
  - [ ] DNS route configured: `sbs.brainsait.cloud`
  - [ ] Tunnel token obtained

### Credentials
- [ ] NPHIES API key obtained (or mock mode planned)
- [ ] AI Provider API key obtained
  - [ ] DeepSeek API key (recommended), OR
  - [ ] Gemini API key
- [ ] Strong database password generated
- [ ] SSL/TLS certificates prepared (if using NPHIES signing)

### GitHub Setup
- [ ] Repository cloned/forked
- [ ] GitHub Secrets configured
  - [ ] `VPS_HOST`
  - [ ] `VPS_USER`
  - [ ] `VPS_SSH_KEY`
  - [ ] `VPS_DB_PASSWORD`
  - [ ] `VPS_NPHIES_API_KEY`
  - [ ] `VPS_DEEPSEEK_API_KEY` or `VPS_GEMINI_API_KEY`
  - [ ] `VPS_CLOUDFLARE_TUNNEL_TOKEN`
- [ ] GitHub Variables configured (optional)
  - [ ] `AI_PROVIDER`
  - [ ] `ALLOWED_ORIGINS`
  - [ ] `DEPLOYMENT_URL`

---

## Initial Deployment

### VPS Preparation
- [ ] Connect to VPS: `ssh root@srv791040.hstgr.cloud`
- [ ] Create deployment directory
  ```bash
  sudo mkdir -p /opt/sbs
  sudo chown $USER:$USER /opt/sbs
  ```
- [ ] Clone repository
  ```bash
  cd /opt/sbs
  git clone https://github.com/SBS-GIVC/sbs.git .
  ```

### Configuration
- [ ] Navigate to deployment config
  ```bash
  cd /opt/sbs/deploy/vps
  ```
- [ ] Copy environment template
  ```bash
  cp .env.vps.example .env
  ```
- [ ] Edit environment file with your credentials
  ```bash
  nano .env
  ```
- [ ] Verify required variables are set:
  - [ ] `DB_PASSWORD`
  - [ ] `DEEPSEEK_API_KEY` or `GEMINI_API_KEY`
  - [ ] `NPHIES_API_KEY`
  - [ ] `CLOUDFLARE_TUNNEL_TOKEN`
  - [ ] `ALLOWED_ORIGINS`
- [ ] Create certificates directory (if needed)
  ```bash
  mkdir -p /opt/sbs/certs
  chmod 700 /opt/sbs/certs
  ```
- [ ] Upload certificates (if using NPHIES signing)

### Deployment
- [ ] Run deployment script
  ```bash
  cd /opt/sbs
  ./scripts/deploy-vps.sh
  ```
  OR manually:
  ```bash
  cd /opt/sbs/deploy/vps
  docker compose --profile cloudflare up -d
  ```
- [ ] Wait for services to start (2-3 minutes)
- [ ] Check service status
  ```bash
  docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml ps
  ```

### Verification
- [ ] All containers running
- [ ] Run health checks
  ```bash
  /opt/sbs/scripts/vps/health-check.sh local
  ```
- [ ] Test API endpoint
  ```bash
  curl http://localhost:3000/health
  ```
- [ ] Test via Cloudflare Tunnel
  ```bash
  curl https://sbs.brainsait.cloud/health
  ```
- [ ] Check service status endpoint
  ```bash
  curl https://sbs.brainsait.cloud/api/services/status
  ```
- [ ] Review logs for errors
  ```bash
  docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs
  ```

---

## GitHub Actions Deployment

### First Automated Deployment
- [ ] Navigate to GitHub Actions
- [ ] Select "Deploy to VPS" workflow
- [ ] Click "Run workflow"
- [ ] Select environment: `staging`
- [ ] Leave other defaults
- [ ] Click "Run workflow" button
- [ ] Monitor deployment progress
- [ ] Review deployment summary
- [ ] Verify deployment succeeded

### Post-Deployment Verification
- [ ] SSH to VPS and check status
  ```bash
  ssh root@srv791040.hstgr.cloud
  cd /opt/sbs/deploy/vps
  docker compose ps
  ```
- [ ] Run health checks
  ```bash
  /opt/sbs/scripts/vps/health-check.sh tunnel
  ```
- [ ] Test API endpoints
- [ ] Review logs for any errors

---

## Integration with n8n

### If n8n Already Running on VPS
- [ ] Verify n8n is still running after SBS deployment
  ```bash
  docker ps | grep n8n
  ```
- [ ] Ensure n8n uses different ports
- [ ] Test n8n workflows still function
- [ ] Configure n8n webhooks to use SBS endpoints
  - Landing API: `http://sbs-vps-landing:3000` (internal) or `https://sbs.brainsait.cloud` (external)

### Configure n8n to Use SBS
- [ ] Update n8n workflow HTTP nodes
- [ ] Use internal Docker network names for local calls:
  - `http://sbs-vps-landing:3000`
  - `http://sbs-vps-normalizer:8000`
  - `http://sbs-vps-financial-rules:8002`
  - `http://sbs-vps-signer:8001`
  - `http://sbs-vps-nphies-bridge:8003`
- [ ] OR use external Cloudflare URLs for remote calls

---

## Security Hardening

### Firewall
- [ ] Configure UFW (if not using Cloudflare Tunnel exclusively)
  ```bash
  sudo ufw allow 22/tcp  # SSH only
  sudo ufw enable
  ```
- [ ] Verify no other ports exposed
  ```bash
  sudo netstat -tlnp
  ```

### SSH Hardening
- [ ] Disable password authentication
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Set: PasswordAuthentication no
  sudo systemctl restart sshd
  ```
- [ ] Change SSH port (optional)
- [ ] Setup fail2ban (optional)

### Docker Security
- [ ] Ensure no exposed ports in docker-compose (when using Cloudflare Tunnel)
- [ ] Verify certificates permissions
  ```bash
  ls -la /opt/sbs/certs/
  # Should be 700 for directory, 600 for files
  ```

### Regular Maintenance
- [ ] Setup automatic security updates
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure unattended-upgrades
  ```
- [ ] Schedule database backups (see below)

---

## Operational Setup

### Database Backups
- [ ] Create backup script
  ```bash
  cat > /opt/sbs/scripts/backup-db.sh << 'EOF'
  #!/bin/bash
  BACKUP_DIR="/opt/sbs/backups"
  BACKUP_FILE="${BACKUP_DIR}/sbs_$(date +%Y%m%d_%H%M%S).sql"
  docker exec sbs-vps-postgres pg_dump -U postgres sbs_integration > "${BACKUP_FILE}"
  gzip "${BACKUP_FILE}"
  # Keep only last 7 days
  find ${BACKUP_DIR} -name "sbs_*.sql.gz" -mtime +7 -delete
  EOF
  chmod +x /opt/sbs/scripts/backup-db.sh
  ```
- [ ] Setup daily cron job
  ```bash
  sudo crontab -e
  # Add: 0 2 * * * /opt/sbs/scripts/backup-db.sh
  ```

### Monitoring
- [ ] Setup health check monitoring (external service)
- [ ] Configure log aggregation (optional)
- [ ] Setup alerts for service failures (optional)

### Documentation
- [ ] Document custom configuration
- [ ] Note any deviations from standard setup
- [ ] Update team wiki/docs

---

## Testing & Validation

### Functional Testing
- [ ] Submit a test claim
  ```bash
  curl -X POST https://sbs.brainsait.cloud/api/claim/submit \
    -H "Content-Type: application/json" \
    -d '{"patient": {...}, "services": [...]}'
  ```
- [ ] Verify claim processing workflow
- [ ] Check all service integrations work
- [ ] Test AI normalization (if enabled)
- [ ] Test financial rules application
- [ ] Test signing (if certificates configured)
- [ ] Test NPHIES submission (mock or real)

### Performance Testing
- [ ] Test API response times
- [ ] Verify database performance
- [ ] Check resource usage under load
  ```bash
  docker stats
  ```

### Error Handling
- [ ] Test invalid input handling
- [ ] Verify error logging
- [ ] Check recovery from service failures

---

## Rollback Plan

### Document Current State
- [ ] Note current Git commit
  ```bash
  cd /opt/sbs
  git rev-parse HEAD
  ```
- [ ] Backup current .env file
  ```bash
  cp /opt/sbs/deploy/vps/.env /opt/sbs/backups/.env.backup
  ```
- [ ] Backup database
  ```bash
  /opt/sbs/scripts/backup-db.sh
  ```

### Test Rollback Procedure
- [ ] Document rollback steps
  ```bash
  cd /opt/sbs
  git checkout <previous-commit>
  cd deploy/vps
  docker compose build
  docker compose --profile cloudflare up -d
  ```
- [ ] Verify rollback time (should be < 5 minutes)

---

## Go-Live Checklist

### Final Verification
- [ ] All services healthy
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Database backups working
- [ ] Monitoring configured
- [ ] Documentation complete
- [ ] Team trained on operations

### Communication
- [ ] Notify team of deployment
- [ ] Update status page (if applicable)
- [ ] Share access URLs

### Monitoring
- [ ] Watch logs for 24 hours
- [ ] Monitor resource usage
- [ ] Track error rates
- [ ] Verify backup completion

---

## Troubleshooting Reference

### Service Won't Start
```bash
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs <service>
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml restart <service>
```

### Database Issues
```bash
docker exec sbs-vps-postgres psql -U postgres -c "\l"
```

### Network Issues
```bash
docker network inspect vps_sbs-internal
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml exec landing curl http://normalizer-service:8000/health
```

### Cloudflare Tunnel Issues
```bash
docker compose -f /opt/sbs/deploy/vps/docker-compose.vps.yml logs cloudflared
```

---

## Post-Deployment

### Week 1
- [ ] Daily monitoring of logs and errors
- [ ] Performance tuning if needed
- [ ] Address any issues that arise

### Week 2-4
- [ ] Weekly review of logs
- [ ] Optimize resource allocation
- [ ] Review and update documentation

### Monthly
- [ ] Security updates
- [ ] Backup verification
- [ ] Performance review
- [ ] Cost optimization

---

## Sign-Off

- [ ] Deployment completed successfully
- [ ] All tests passed
- [ ] Documentation updated
- [ ] Team notified
- [ ] Monitoring configured

**Deployed by:** ___________________  
**Date:** ___________________  
**Environment:** Staging / Production  
**Git Commit:** ___________________
