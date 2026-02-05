# SBS Landing and App Enhancement Implementation Guide

## Overview
This guide provides step-by-step instructions to implement all recommendations from the SBS audit analysis. The enhancements address security, performance, monitoring, and routing issues.

## Current State Assessment
Based on the audit, the following issues were identified:

### Critical Issues (Priority 1)
1. ❌ Missing `/sbs` routing - `https://brainsait.cloud/sbs` serves landing page instead of redirecting to SBS app
2. ❌ SSL certificate permission issues for `ai.brainsait.cloud`
3. ⚠️ Missing security headers (HSTS, CSP, etc.)

### Important Issues (Priority 2)
1. ⚠️ No rate limiting implementation
2. ⚠️ No comprehensive monitoring
3. ⚠️ No automated backup system

## Implementation Files Created

### 1. Enhancement Scripts
- `/home/hostinger/complete_sbs_enhancement.sh` - Complete implementation script
- `/home/hostinger/verify_current_state.sh` - Verification script
- `/home/hostinger/nginx_enhanced_config.conf` - Enhanced nginx configuration template

### 2. Monitoring & Backup
- `/home/hostinger/monitor_services.sh` - Service monitoring script
- `/home/hostinger/backup_procedure.md` - Backup documentation

## Step-by-Step Implementation

### Step 1: Verify Current State
```bash
# Run verification script
bash /home/hostinger/verify_current_state.sh
```

This will show:
- Current `/sbs` routing status
- Service accessibility
- Security headers status
- SSL certificate issues

### Step 2: Implement All Enhancements (Recommended)
```bash
# Run the complete enhancement script (requires sudo)
sudo bash /home/hostinger/complete_sbs_enhancement.sh
```

**What this script does:**
1. Creates backups of all configurations
2. Fixes SSL certificate permissions
3. Adds rate limiting to nginx
4. Implements `/sbs` and `/demo` routing
5. Adds enhanced security headers (HSTS, CSP, etc.)
6. Adds sensitive file blocking
7. Configures log rotation (30 days retention)
8. Creates monitoring script
9. Creates backup documentation

### Step 3: Manual Implementation (Alternative)

If you prefer manual implementation, follow these steps:

#### 3.1 Fix SSL Certificate Permissions
```bash
sudo chmod 644 /etc/letsencrypt/live/ai.brainsait.cloud/fullchain.pem
sudo chmod 644 /etc/letsencrypt/live/ai.brainsait.cloud/privkey.pem
```

#### 3.2 Add Rate Limiting to nginx.conf
Edit `/etc/nginx/nginx.conf` and add to the `http {` block:
```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;
```

#### 3.3 Update brainsait.cloud Configuration
Edit `/etc/nginx/sites-available/brainsait.cloud`:

**Add before `location / {` block:**
```nginx
    # Enhanced security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://brainsait.cloud https://sbs.brainsait.cloud;" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
    add_header X-Permitted-Cross-Domain-Policies "none" always;

    # Route /sbs -> SBS subdomain
    location ~ ^/sbs(/.*)?$ {
        return 302 https://sbs.brainsait.cloud$1;
    }

    # Route /demo -> SBS (optional)
    location ~ ^/demo(/.*)?$ {
        return 302 https://sbs.brainsait.cloud$1;
    }
```

**Update `location / {` block:**
```nginx
    location / {
        try_files $uri $uri/ /index.html;
        # Apply general rate limiting
        limit_req zone=general burst=20 nodelay;
    }
```

**Update `location /api/` block:**
```nginx
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Apply stricter rate limiting to API
        limit_req zone=api burst=5 nodelay;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
```

**Add at the end of server block (before closing `}`):**
```nginx
    # Block sensitive files
    location ~ /\.(?!well-known) {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ /\.ht {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Security: Disable unnecessary methods
    if ($request_method !~ ^(GET|HEAD|POST)$) {
        return 405;
    }
```

#### 3.4 Test and Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Set Up Monitoring

#### 4.1 Make Monitoring Script Executable
```bash
chmod +x /home/hostinger/monitor_services.sh
```

#### 4.2 Schedule Monitoring (Add to crontab)
```bash
# Edit crontab
crontab -e

# Add this line for every 5 minutes monitoring
*/5 * * * * /home/hostinger/monitor_services.sh
```

#### 4.3 Configure Log Rotation
The enhancement script automatically creates log rotation configuration. Verify:
```bash
cat /etc/logrotate.d/brainsait-cloud
```

### Step 5: Set Up Backups

#### 5.1 Create Backup Script
Create `/home/hostinger/backup_config.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backup/brainsait_$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Nginx configuration
cp -r /etc/nginx "$BACKUP_DIR/"

# SSL certificates
cp -r /etc/letsencrypt "$BACKUP_DIR/"

# Web content
cp -r /var/www/brainsait-cloud "$BACKUP_DIR/"

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"

# Cleanup old backups (keep 7 days)
find /backup -name "brainsait_*.tar.gz" -mtime +7 -delete
```

#### 5.2 Schedule Daily Backups
```bash
# Add to crontab
0 2 * * * /home/hostinger/backup_config.sh
```

## Verification

### After Implementation, Verify:
1. **Routing**: `https://brainsait.cloud/sbs` should redirect (302) to `https://sbs.brainsait.cloud`
2. **Security Headers**: Check with:
   ```bash
   curl -I https://brainsait.cloud | grep -i "strict-transport-security\|content-security-policy"
   ```
3. **All Services**: Run verification script again:
   ```bash
   bash /home/hostinger/verify_current_state.sh
   ```

## Expected Results

### After Successful Implementation:
- ✅ `/sbs` routing working correctly
- ✅ All security headers present (HSTS, CSP, etc.)
- ✅ Rate limiting active (10 requests/sec for API, 100 for general)
- ✅ Sensitive files blocked
- ✅ Log rotation configured (30 days retention)
- ✅ Monitoring script running every 5 minutes
- ✅ Backup system in place

## Troubleshooting

### Common Issues:

#### 1. Nginx Configuration Test Fails
```bash
# Check error details
sudo nginx -t

# Common fix for SSL permissions
sudo chmod 644 /etc/letsencrypt/live/*/privkey.pem
```

#### 2. /sbs Route Not Working
- Check if the route was added: `grep "location ~ ^/sbs" /etc/nginx/sites-available/brainsait.cloud`
- Ensure it's placed before `location / {` block
- Check nginx error logs: `sudo tail -f /var/log/nginx/brainsait.cloud.error.log`

#### 3. Security Headers Missing
- Verify configuration syntax
- Check for typos in header names
- Ensure headers are in the correct server block

#### 4. Rate Limiting Not Working
- Verify rate limiting zones are in `nginx.conf` http context
- Check zone names match (`api` and `general`)
- Test with multiple rapid requests

## Maintenance

### Regular Tasks:
1. **Monitor logs**: Check `/var/log/brainsait-monitor.log` daily
2. **Check backups**: Verify backups are created and not corrupted
3. **Update certificates**: Let's Encrypt auto-renews, but verify monthly
4. **Review security**: Regular security audits and header updates

### Monthly Checklist:
- [ ] Verify all services are accessible
- [ ] Check SSL certificate expiration
- [ ] Review monitoring logs for patterns
- [ ] Test backup restoration
- [ ] Update security headers as needed

## Support

For issues or questions:
1. Check nginx error logs: `/var/log/nginx/brainsait.cloud.error.log`
2. Review monitoring logs: `/var/log/brainsait-monitor.log`
3. Verify configuration with: `bash /home/hostinger/verify_current_state.sh`

## Conclusion

This implementation addresses all critical issues identified in the audit and provides a robust, secure, and maintainable infrastructure for the SBS landing page and application. The enhancements follow industry best practices for security, performance, and reliability.

**Implementation Time**: ~15-30 minutes
**Downtime**: Minimal (nginx reload only)
**Risk Level**: Low (backups created, reversible changes)