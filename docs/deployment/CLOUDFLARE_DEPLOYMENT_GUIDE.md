# Cloudflare Configuration Guide for brainsait.cloud

## Overview
This guide will help you deploy the SBS application to Cloudflare infrastructure using Pages, Workers, and custom domains.

## Architecture
```
brainsait.cloud (Cloudflare Pages)
├── Frontend: React SPA
├── API: api.brainsait.cloud (Cloudflare Workers)
└── Backend Services: (Cloudflare Containers/Workers)
    ├── sbs-normalizer.brainsait.cloud
    ├── sbs-signer.brainsait.cloud
    ├── sbs-financial.brainsait.cloud
    └── sbs-nphies.brainsait.cloud
```

## Prerequisites

1. **Cloudflare Account** with active zone for `brainsait.cloud`
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **Domain DNS** managed by Cloudflare

## Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

## Step 2: Configure DNS Records

Login to Cloudflare Dashboard and add these DNS records:

| Type  | Name              | Content                           | Proxy Status |
|-------|-------------------|-----------------------------------|--------------|
| CNAME | @                 | sbs-landing-frontend.pages.dev    | Proxied      |
| CNAME | www               | sbs-landing-frontend.pages.dev    | Proxied      |
| CNAME | api               | sbs-api-worker.workers.dev        | Proxied      |
| CNAME | n8n               | [your-n8n-host]                   | Proxied      |
| CNAME | sbs-normalizer    | sbs-normalizer-worker.workers.dev | Proxied      |
| CNAME | sbs-signer        | sbs-signer-worker.workers.dev     | Proxied      |
| CNAME | sbs-financial     | sbs-financial-worker.workers.dev  | Proxied      |
| CNAME | sbs-nphies        | sbs-nphies-worker.workers.dev     | Proxied      |

## Step 3: Deploy Frontend to Cloudflare Pages

```bash
cd /root/sbs-source/sbs-landing

# Build the frontend
npm install
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist \
  --project-name=sbs-landing-frontend \
  --branch=main
```

### Alternative: Connect GitHub Repository

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project"
3. Connect to GitHub repository: `fadil369/sbs`
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `sbs-landing`
   - Environment variables:
     - `NODE_ENV=production`
     - `VITE_API_URL=https://api.brainsait.cloud`

## Step 4: Deploy API Worker

```bash
# Deploy the API Worker
wrangler deploy --config wrangler.toml --env production
```

## Step 5: Configure Custom Domains

### In Cloudflare Dashboard:

1. **Pages > sbs-landing-frontend > Custom domains**
   - Add: `brainsait.cloud`
   - Add: `www.brainsait.cloud`

2. **Workers & Pages > sbs-api-worker > Triggers**
   - Add custom domain: `api.brainsait.cloud`

## Step 6: Update Environment Variables

### Frontend (.env)
```bash
VITE_API_URL=https://api.brainsait.cloud
VITE_N8N_WEBHOOK_URL=https://n8n.brainsait.cloud/webhook/sbs-claim-submission
NODE_ENV=production
```

### API Worker (wrangler.toml)
```toml
[env.production.vars]
NODE_ENV = "production"
NORMALIZER_URL = "https://sbs-normalizer.brainsait.cloud"
SIGNER_URL = "https://sbs-signer.brainsait.cloud"
FINANCIAL_RULES_URL = "https://sbs-financial.brainsait.cloud"
NPHIES_BRIDGE_URL = "https://sbs-nphies.brainsait.cloud"
ALLOWED_ORIGINS = "https://brainsait.cloud,https://www.brainsait.cloud"
```

## Step 7: Deploy Backend Services

Each microservice needs to be deployed as a separate Worker:

```bash
# Example for normalizer service
cd /root/sbs-source/sbs/normalizer-service
wrangler deploy --name sbs-normalizer --env production
```

## Step 8: Configure SSL/TLS

Cloudflare automatically provisions SSL certificates for:
- brainsait.cloud
- www.brainsait.cloud
- api.brainsait.cloud
- *.brainsait.cloud (if using Universal SSL)

### Verify SSL:
```bash
curl -I https://brainsait.cloud
curl -I https://api.brainsait.cloud
```

## Step 9: Set Up CORS

Update API Worker to allow frontend domain:

```javascript
// In server.cjs
const allowedOrigins = [
  'https://brainsait.cloud',
  'https://www.brainsait.cloud'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

## Step 10: Test Deployment

```bash
# Test frontend
curl https://brainsait.cloud

# Test API
curl https://api.brainsait.cloud/health

# Test with browser
open https://brainsait.cloud
```

## Automated Deployment Script

Use the provided script:
```bash
cd /root/sbs-source/sbs-landing
./deploy-cloudflare.sh
```

## Monitoring & Analytics

1. **Cloudflare Analytics**: Dashboard > Analytics
2. **Worker Metrics**: Workers & Pages > sbs-api-worker > Metrics
3. **Pages Analytics**: Pages > sbs-landing-frontend > Analytics

## Troubleshooting

### Issue: 502 Bad Gateway
- Check Worker deployment status
- Verify environment variables
- Check Worker logs: `wrangler tail --env production`

### Issue: CORS Errors
- Verify ALLOWED_ORIGINS in wrangler.toml
- Check API Worker CORS headers
- Ensure domain is proxied through Cloudflare

### Issue: SSL Certificate Not Provisioned
- Wait 5-10 minutes after adding custom domain
- Verify DNS records are proxied (orange cloud)
- Check SSL/TLS mode: Should be "Full" or "Full (strict)"

## Rollback

To rollback to previous version:
```bash
# For Pages
wrangler pages deployment list --project-name=sbs-landing-frontend
wrangler pages deployment rollback <deployment-id>

# For Workers
wrangler rollback --env production
```

## Cost Estimate

Cloudflare Free Tier includes:
- Pages: Unlimited bandwidth
- Workers: 100,000 requests/day
- DNS: Unlimited queries
- SSL: Free Universal SSL

For production, consider:
- Workers Paid: $5/month (10M requests)
- Pages Pro: $20/month (Unlimited builds)

## Next Steps

1. Set up CI/CD with GitHub Actions
2. Configure rate limiting
3. Enable Web Application Firewall (WAF)
4. Set up monitoring and alerts
5. Configure caching rules
6. Enable DDoS protection

## Support

- Cloudflare Docs: https://developers.cloudflare.com
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
- Community: https://community.cloudflare.com
