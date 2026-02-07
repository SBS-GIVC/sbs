# SBS Production "Ship It" Guide
This guide details how to wire everything together and deploy the SBS Integration Engine to the production VPS (`sbs.brainsait.cloud`).

## Architecture Overview
- **Server**: Hostinger/Brainsait VPS (Ubuntu/Debian)
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (Handles SSL & Routing)
- **Backend API**: Node.js (Port 3005 internal)
- **IoT Gateway**: Arduino Scripts (Physical Device or Tailscale Node)
- **Workflow Engine**: n8n (Port 5678 internal)

## 1. Preparation on VPS
Ensure the VPS has:
- Docker & Docker Compose installed.
- Git installed.
- Nginx installed (`apt install nginx`).
- Tailscale (optional, for secure IoT access).

## 2. Deployment Steps

### Step 2.1: Clone Repository
```bash
git clone https://github.com/SBS-GIVC/sbs.git /root/sbs-github
cd /root/sbs-github
```

### Step 2.2: Configure Environment
Copy the example environment file and edit it.
```bash
cp .env.example .env
nano .env
```
**CRITICAL**:
- Set `NODE_ENV=production`
- Set `DB_PASSWORD` (use strong password)
- Set `N8N_WEBHOOK_URL=https://n8n.brainsait.cloud/webhook/iot-events`
- Set `ALLOWED_ORIGINS=https://sbs.brainsait.cloud`
- Set `PORT=3000` (Container internal port)

### Step 2.3: Run Deployment Script
We have a unified script to build and launch everything.
```bash
chmod +x scripts/deploy/deploy-production.sh
./scripts/deploy/deploy-production.sh
```
*Note: This script pulls code, builds updated images, and restarts containers.*

## 3. Reverse Proxy Setup (Nginx)
To expose the services safely on port 443 (HTTPS), configure Nginx.

Create/Edit `/etc/nginx/sites-available/sbs.brainsait.cloud`:
```nginx
server {
    server_name sbs.brainsait.cloud;

    location / {
        proxy_pass http://127.0.0.1:3005; # Points to sbs-landing container (Host Port 3005)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Optional: Serve n8n on subdomain or subpath if not using separate automated setup
    # location /n8n/ { ... }
}

server {
    server_name n8n.brainsait.cloud;

    location / {
        proxy_pass http://127.0.0.1:5678; # Points to n8n container
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

Enable site and restart Nginx:
```bash
ln -s /etc/nginx/sites-available/sbs.brainsait.cloud /etc/nginx/sites-enabled/
certbot --nginx -d sbs.brainsait.cloud -d n8n.brainsait.cloud
systemctl restart nginx
```

## 4. Wiring n8n
1.  Access `https://n8n.brainsait.cloud`.
2.  Set up the owner account.
3.  **Import Workflow**:
    -   Go to Workflows -> Import from File.
    -   Upload `n8n-workflows/sbs-production-workflow.json` (found in repo).
    -   **Activate** the workflow.

## 5. Wiring IoT Gateway
On your physical IoT Gateway (Pi) or Mac:
1.  Run `arduino-iot-gateway/setup-tailscale.sh`.
2.  Select **Option 1 (Production)** OR **Option 7 (Custom)**.
3.  If Custom, enter: `https://sbs.brainsait.cloud/api/v1/iot/events`.
4.  Restart the Gateway service.
    ```bash
    # Linux/Pi
    sudo systemctl restart iot-gateway
    # Mac
    launchctl stop com.brainsait.iot-gateway
    launchctl start com.brainsait.iot-gateway
    ```

## 6. Validation
Run the aggressive test suite AGAINST PRODUCTION from your local machine:
```bash
API_URL="https://sbs.brainsait.cloud" ./scripts/test/end-to-end-aggressive.sh
```
(You may need to locally modify the script to accept URL arg or just set var).

## Verification Checklist
- [ ] `curl https://sbs.brainsait.cloud/health` returns 200 OK.
- [ ] n8n webhook accessible.
- [ ] IoT Dashboard on `https://sbs.brainsait.cloud` shows active nodes.
