# Production Deployment Guide

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04+ / RHEL 8+ / Amazon Linux 2
- **CPU**: Minimum 4 cores (8+ recommended)
- **RAM**: Minimum 8GB (16GB+ recommended)
- **Storage**: 100GB+ SSD
- **Network**: Static IP with open ports 80, 443

### Software Requirements

- Docker 24.0+
- Docker Compose 2.0+
- PostgreSQL 14+ (if not using containerized)
- SSL/TLS certificates for HTTPS

---

## Step 1: Server Preparation

### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git curl
```

### 1.2 Configure Docker

```bash
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

### 1.3 Clone Repository

```bash
git clone <repository-url>
cd sbs-integration-engine
```

---

## Step 2: Environment Configuration

### 2.1 Create Production Environment File

```bash
cp .env.example .env
nano .env
```

### 2.2 Configure Critical Variables

```env
# Database - Use strong passwords
DB_PASSWORD=<generate-strong-password>

# DeepSeek AI (primary) + Gemini (legacy optional)
DEEPSEEK_API_KEY=<your-actual-api-key>
DEEPSEEK_MODEL=deepseek-chat
GEMINI_API_KEY=<your-actual-api-key>

# NPHIES Production
NPHIES_ENV=production
NPHIES_BASE_URL=https://nphies.sa/api/v1
NPHIES_API_KEY=<your-production-api-key>

# n8n Security
N8N_USER=<admin-username>
N8N_PASSWORD=<strong-password>
```

**Security Note**: Never commit `.env` to version control.

---

## Step 3: Certificate Setup

### 3.1 Obtain NPHIES Certificates

1. Generate CSR on the server:
```bash
mkdir -p certs
cd certs
openssl req -new -newkey rsa:2048 -nodes \
  -keyout facility_1_private.key \
  -out facility_1.csr \
  -subj "/C=SA/ST=Riyadh/L=Riyadh/O=<Hospital-Name>/CN=<domain>"
```

2. Submit CSR to NPHIES Developer Portal
3. Download signed certificate bundle
4. Place certificates in `certs/` directory

### 3.2 Certificate Structure

```
certs/
├── facility_1/
│   ├── private_key.pem      # Private key
│   ├── certificate.pem      # Signed certificate
│   └── ca_bundle.pem        # CA chain
└── facility_2/
    └── ...
```

### 3.3 Update Database

```sql
INSERT INTO facility_certificates 
(facility_id, cert_type, serial_number, private_key_path, public_cert_path, 
 valid_from, valid_until, is_active)
VALUES 
(1, 'signing', '<serial-from-cert>', 
 'facility_1/private_key.pem', 
 'facility_1/certificate.pem',
 '2024-01-01', '2025-01-01', TRUE);
```

---

## Step 4: Database Initialization

### 4.1 Initialize Schema

```bash
# Start only PostgreSQL
docker-compose up -d postgres

# Wait for database to be ready
sleep 10

# Schema is auto-loaded via init script
# Verify:
docker exec -it sbs-postgres psql -U postgres -d sbs_integration -c "\dt"
```

### 4.2 Load SBS Master Catalogue

```bash
# Download latest SBS codes from CHI
# Import into database
psql -h localhost -U postgres -d sbs_integration -f sbs_master_catalogue.sql
```

---

## Step 5: Deploy Services

### 5.1 Build and Start All Services

```bash
docker-compose build
docker-compose up -d
```

### 5.2 Verify Service Health

```bash
# Check all containers are running
docker-compose ps

# Test health endpoints
curl http://localhost:8000/health  # Normalizer
curl http://localhost:8001/health  # Signer
curl http://localhost:8002/health  # Financial Rules
curl http://localhost:8003/health  # NPHIES Bridge
```

---

## Step 6: Configure n8n Workflow

### 6.1 Access n8n UI

Navigate to: `http://<server-ip>:5678`

Login with credentials from `.env`

### 6.2 Import Workflow

1. Click "Workflows" → "Import from File"
2. Select `n8n-workflows/sbs-full-workflow.json`
3. Activate the workflow

### 6.3 Get Webhook URL

The webhook URL will be: `http://<server-ip>:5678/webhook/nphies-gateway`

---

## Step 7: Configure Reverse Proxy (Nginx)

### 7.1 Install Nginx

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 7.2 Create Configuration

```nginx
# /etc/nginx/sites-available/sbs-integration

upstream normalizer {
    server localhost:8000;
}

upstream signer {
    server localhost:8001;
}

upstream financial_rules {
    server localhost:8002;
}

upstream nphies_bridge {
    server localhost:8003;
}

upstream n8n {
    server localhost:5678;
}

server {
    listen 80;
    server_name api.sbs-integration.sa;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.sbs-integration.sa;

    ssl_certificate /etc/letsencrypt/live/api.sbs-integration.sa/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sbs-integration.sa/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API endpoints
    location /api/normalize {
        proxy_pass http://normalizer;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/sign {
        proxy_pass http://signer;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/validate {
        proxy_pass http://financial_rules;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/submit {
        proxy_pass http://nphies_bridge;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # n8n webhook
    location /webhook {
        proxy_pass http://n8n;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 7.3 Enable and Test

```bash
sudo ln -s /etc/nginx/sites-available/sbs-integration /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.sbs-integration.sa
```

---

## Step 8: Monitoring & Logging

### 8.1 View Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f normalizer-service
```

### 8.2 Set Up Log Rotation

```bash
# Configure Docker log rotation
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

---

## Step 9: Backup Strategy

### 9.1 Database Backup

```bash
# Daily backup script
cat > /usr/local/bin/backup-sbs-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/backups/sbs-integration
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker exec sbs-postgres pg_dump -U postgres sbs_integration | \
  gzip > $BACKUP_DIR/sbs_backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "sbs_backup_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-sbs-db.sh
```

### 9.2 Schedule with Cron

```bash
sudo crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-sbs-db.sh
```

---

## Step 10: Security Hardening

### 10.1 Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 10.2 Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 10.3 Regular Updates

```bash
# Create update script
cat > /usr/local/bin/update-sbs.sh << 'EOF'
#!/bin/bash
cd /opt/sbs-integration-engine
git pull
docker-compose pull
docker-compose up -d --build
EOF

chmod +x /usr/local/bin/update-sbs.sh
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>

# Rebuild if needed
docker-compose up -d --build <service-name>
```

### Database Connection Issues

```bash
# Test connection
docker exec -it sbs-postgres psql -U postgres -d sbs_integration

# Check connection string in .env
# Verify network connectivity
docker network inspect sbs-integration-engine_sbs-network
```

### Certificate Errors

```bash
# Verify certificate in signer service
docker exec -it sbs-signer ls -la /certs

# Test certificate loading
curl -X GET http://localhost:8001/verify-certificate/1
```

---

## Health Checks

Regular health check script:

```bash
#!/bin/bash
SERVICES=("8000" "8001" "8002" "8003")
for port in "${SERVICES[@]}"; do
  echo "Checking port $port..."
  curl -f http://localhost:$port/health || echo "FAILED"
done
```

---

## Support & Maintenance

- **Monitoring**: Implement Prometheus + Grafana for metrics
- **Alerts**: Configure alerts for service failures
- **Updates**: Apply security patches monthly
- **Audit**: Review transaction logs weekly
