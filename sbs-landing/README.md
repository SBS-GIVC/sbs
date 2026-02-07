# 🏥 SBS Integration Engine - Backend

**Saudi Billing System (SBS) Integration Engine** - A production-ready Express.js backend API with n8n workflow automation for processing health insurance claims through the NPHIES (National Platform for Health Insurance Exchange System).

## ✨ Features

- ✅ **RESTful API** - Express.js backend with comprehensive endpoints
- ✅ **n8n Workflow Integration** - Automated claim processing pipeline
- ✅ **CORS Support** - Configured for GitHub Pages frontend
- ✅ **File Upload Handling** - Multer for document uploads (10MB limit)
- ✅ **Claim Tracking** - Real-time workflow status monitoring
- ✅ **Error Handling** - Comprehensive error responses and logging
- ✅ **Rate Limiting** - API rate limiting with express-rate-limit
- ✅ **Security** - Helmet.js headers, CORS, input validation
- ✅ **Production Ready** - Environment-based configuration, logging
- ✅ **User-Centric Timeline** - Workflow timeline updates for tracking
- ✅ **Workflow Hooks** - Optional webhooks for lifecycle events

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0+
- npm 9.0+
- Docker (optional, for containerized deployment)

### Installation

```bash
# Clone repository
git clone https://github.com/Fadil369/sbs.git
cd sbs/sbs-landing

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
nano .env

# Start development server
npm run dev

# Or start production server
npm start
```

### Using Docker

```bash
# Build Docker image
docker build -t sbs-landing .

# Run container
docker run -p 5000:5000 --env-file .env sbs-landing
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f sbs-api

# Stop all services
docker-compose down
```

## 📁 Project Structure

                        ```
                        sbs-landing/
                        ├── public/                    # Frontend files
                        │   ├── index.html            # Landing page
                        │   ├── landing.js            # Frontend JavaScript
                        │   ├── config.js             # Environment configuration
                        │   └── api-client.js         # API client with retry logic
                        ├── node_modules/             # Dependencies
                        ├── server.js                 # Express backend server
                        ├── package.json              # Dependencies and scripts
                        ├── .env.example              # Environment variables template
                        ├── Dockerfile                # Docker configuration
                        ├── docker-compose.yml        # Docker Compose configuration
                        ├── README.md                 # This file
                        ├── deploy.sh                 # Deployment script
                        ├── test-submit-claim.js      # API testing script
                        └── n8n-workflow-sbs-complete.json  # n8n workflow definition
                        ```

                        ## 🔌 API Endpoints

                        ### Health Check
                        ```bash
                        GET /health

                        # Response
                        {
                          "status": "healthy",
                          "timestamp": "2026-01-18T01:48:41Z",
                          "version": "1.0.0",
                          "environment": "development"
                        }
                        ```

                        ### Submit Claim
                        ```bash
                        POST /api/submit-claim
                        Content-Type: multipart/form-data

                        Request:
                        - patientName: string (required)
                        - patientId: string (required)
                        - memberId: string (optional)
                        - payerId: string (optional)
                        - claimType: string (required) - professional|institutional|pharmacy|vision
                        - userEmail: string (required)
                        - claimFile: file (optional) - PDF, DOC, XLS, JSON, XML (max 10MB)

                        # Response
                        {
                          "success": true,
                          "claimId": "CLM20260118001",
                          "status": "validation_pending",
                          "message": "Claim received and queued for processing"
                        }
                        ```

                        ### Get Claim Status
                        ```bash
                        GET /api/claim-status/:claimId

                        # Response
                        {
                          "success": true,
                          "claimId": "CLM20260118001",
                          "status": "in_progress",
                          "progress": 40,
                          "stages": {
                            "received": { "status": "completed", "timestamp": "..." },
                            "validation": { "status": "in_progress", "timestamp": "..." },
                            "normalization": { "status": "pending", "timestamp": null },
                            "signing": { "status": "pending", "timestamp": null },
                            "nphies_submission": { "status": "pending", "timestamp": null }
                          }
                        }
                        ```

## ⚙️ Configuration

### n8n Gateway (Eligibility + Copilot)

This repo supports an **n8n-first gateway** setup for Eligibility and Copilot.
See: `docs/N8N_GATEWAY_PRODUCTION.md`.

### Environment Variables

Copy `.env.example` to `.env` and update:

```env
# Server
PORT=5000
NODE_ENV=development

# CORS (preferred)
ALLOWED_ORIGINS=http://localhost:3000,https://fadil369.github.io

# Backwards compatibility
CORS_ORIGIN=http://localhost:3000,https://fadil369.github.io

# Uploads
UPLOAD_DIR=/tmp/sbs-uploads
MAX_FILE_SIZE=10485760

# Microservices
SBS_NORMALIZER_URL=http://localhost:8000
SBS_FINANCIAL_RULES_URL=http://localhost:8002
SBS_SIGNER_URL=http://localhost:8001
SBS_NPHIES_BRIDGE_URL=http://localhost:8003

# Eligibility (optional real service)
# If set, Landing proxies POST /api/eligibility/check to ${SBS_ELIGIBILITY_URL}/check
SBS_ELIGIBILITY_URL=http://localhost:8004

# Copilot wiring
# auto (default): proxy to ${SBS_INTERNAL_COPILOT_URL} or ${SBS_NORMALIZER_URL}/copilot/chat, else deterministic fallback
# deterministic: always use deterministic fallback
SBS_COPILOT_MODE=auto
SBS_INTERNAL_COPILOT_URL=

# n8n
N8N_BASE_URL=http://localhost:5678
N8N_WORKFLOW_ID=sbs-claim-processing

# Workflow hooks
ENABLE_STAGE_HOOKS=false
SBS_STAGE_HOOK_URL=

# Logging
LOG_LEVEL=debug
```

See `.env.example` for complete configuration options.

## 🧪 Testing

### Using npm script

```bash
npm test
```

### Using curl

```bash
# Health check
curl http://localhost:5000/health

# Submit test claim
curl -X POST http://localhost:5000/api/submit-claim \
  -F "patientName=Test Patient" \
  -F "patientId=1234567890" \
  -F "claimType=professional" \
  -F "userEmail=test@example.com"
```

### Using the test script

```bash
node test-submit-claim.js
```

## 📊 Development Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
npm run build      # Build (no-op for Node.js)
```

## 🔒 Security Features

- ✅ **CORS** - Configured for specific origins
- ✅ **Helmet.js** - Security headers
- ✅ **Rate Limiting** - 100 requests per 15 minutes
- ✅ **Input Validation** - Form data validation
- ✅ **File Upload Limits** - 10MB max file size
- ✅ **Environment Secrets** - Sensitive data in `.env`

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Docker Production

```bash
docker build -t sbs-landing:1.0.0 .
docker run -d -p 5000:5000 --env-file .env sbs-landing:1.0.0
```

### With Docker Compose

```bash
docker-compose -f docker-compose.yml up -d
```

## 📚 Documentation

- [Complete Integration Setup Guide](../INTEGRATION_SETUP_GUIDE.md)
- [Frontend Configuration](public/config.js)
- [API Client](public/api-client.js)
- [n8n Workflow](n8n-workflow-sbs-complete.json)

## 🐛 Troubleshooting

### Port 5000 already in use

```bash
lsof -i :5000
kill -9 <PID>
```

### CORS errors

- Check `ALLOWED_ORIGINS` in `.env`
- Ensure frontend URL is in the list

### File upload errors

- Check file size (max 10MB)
- Check file type (PDF, DOC, XLS, JSON, XML)
- Check `UPLOAD_DIR` permissions

### n8n connection issues

- Verify `N8N_BASE_URL` in `.env`
- Check n8n is running
- Verify network connectivity

## 📝 Logs

Development:

```bash
npm run dev
```

Production:

```bash
LOG_LEVEL=debug npm start
```

View Docker logs:

```bash
docker-compose logs -f sbs-api
```

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/name`
2. Make changes
3. Lint: `npm run lint`
4. Format: `npm run format`
5. Commit: `git commit -m "feat: description"`
6. Push: `git push origin feature/name`
7. Create Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Author

**Dr. Mohamed El Fadil**
BrainSAIT | Healthcare Technology

## 📞 Support

- 📖 [GitHub Issues](https://github.com/Fadil369/sbs/issues)
- 💬 [GitHub Discussions](https://github.com/Fadil369/sbs/discussions)
- 📧 Email: contact@brainsait.com

---

**Last Updated:** January 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
