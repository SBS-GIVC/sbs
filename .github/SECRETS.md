# GitHub Secrets Configuration

For CI/CD pipelines to work properly, configure these secrets in your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

## Required Secrets

### Docker Hub
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token (generate at hub.docker.com/settings/security)

### VPS Deployment
- `VPS_HOST` - Your VPS IP address (e.g., 82.25.101.65)
- `VPS_USER` - SSH username (e.g., root)
- `VPS_SSH_KEY` - Private SSH key for VPS access

### Application
- `POSTGRES_PASSWORD` - Database password
- `JWT_SECRET` - JWT signing secret (generate: `openssl rand -hex 32`)
- `N8N_ENCRYPTION_KEY` - n8n encryption key (generate: `openssl rand -hex 32`)

## Optional Secrets
- `DEEPSEEK_API_KEY` - DeepSeek AI API key (primary)
- `DEEPSEEK_MODEL` - DeepSeek model name (optional)
- `GEMINI_API_KEY` - Google Gemini AI API key (legacy/optional)
- `SLACK_WEBHOOK_URL` - Slack notifications webhook

## Environment Variables (in .env)
Create `.env` file in project root with:
```
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
DEEPSEEK_MODEL=${DEEPSEEK_MODEL}
GEMINI_API_KEY=${GEMINI_API_KEY}
```
