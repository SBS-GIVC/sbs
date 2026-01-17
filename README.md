# Saudi Billing System (SBS) Integration Engine

A microservices-based middleware solution for seamless integration between Hospital Information Systems (HIS) and Saudi Arabia's NPHIES platform.

## 🎯 Strategic Objectives

- **Unified Language**: Transform proprietary hospital codes to national SBS codes
- **Reduced Rejections**: Eliminate ambiguity in medical billing through standardization
- **Enhanced Transparency**: Provide clear visibility for patients, providers, and regulators
- **National Interoperability**: Enable seamless data exchange via NPHIES

## 🏗️ Architecture Overview

This solution implements a decoupled, microservices-based architecture with the following components:

### Core Services

1. **Normalizer Service** (AI-Powered)
   - Translates internal hospital codes to official SBS codes
   - Uses local mapping database + Gemini AI for dynamic lookup
   - Port: 8000

2. **Financial Rules Engine**
   - Applies CHI-mandated business rules
   - Calculates bundles, validates coverage, applies pricing tiers
   - Port: 8002

3. **Security & Signer Service**
   - Manages digital certificates and payload signing
   - Implements SHA-256 hashing with RSA signing
   - Port: 8001

4. **NPHIES Bridge**
   - Handles all communications with NPHIES platform
   - Implements retry logic and transaction logging
   - Port: 8003

### Orchestration

- **n8n Workflow Engine**: Orchestrates end-to-end claim submission pipeline

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.9+ (for local development)
- Node.js 16+ (for local development)
- PostgreSQL 14+
- NPHIES credentials and certificates

### Deployment

```bash
# Clone the repository
git clone <repository-url>
cd sbs-integration-engine

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start all services
docker-compose up -d

# Check service health
docker-compose ps
```

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env` file based on `.env.example`:

#### CORS Configuration (Security Critical)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend domains | `http://localhost:3001,http://localhost:3000` | Yes (Production) |

**Example:**
```bash
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3001
```

> ⚠️ **Security Warning**: Do NOT use `origin: true` or wildcards (`*`) in production as this creates a security vulnerability by allowing any origin to make requests to your API.

#### API Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for the Landing API server | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `ENABLE_DIRECT_SBS` | Enable fallback to direct SBS services | `true` |

#### Database Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL database host | `postgres` |
| `DB_PORT` | PostgreSQL database port | `5432` |
| `DB_NAME` | Database name | `sbs_integration` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | - |

#### NPHIES Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NPHIES_ENV` | NPHIES environment (`sandbox` or `production`) | `sandbox` |
| `NPHIES_BASE_URL` | NPHIES API base URL | `https://sandbox.nphies.sa/api/v1` |
| `NPHIES_API_KEY` | NPHIES API credentials | - |
| `NPHIES_TIMEOUT` | API timeout in seconds | `30` |
| `NPHIES_MAX_RETRIES` | Maximum retry attempts | `3` |
| `CERT_BASE_PATH` | Path to NPHIES certificates | `/certs` |

#### Service URLs

| Variable | Description | Default |
|----------|-------------|---------|
| `SBS_NORMALIZER_URL` | Normalizer service URL | `http://localhost:8000` |
| `SBS_SIGNER_URL` | Signer service URL | `http://localhost:8001` |
| `SBS_FINANCIAL_RULES_URL` | Financial Rules service URL | `http://localhost:8002` |
| `SBS_NPHIES_BRIDGE_URL` | NPHIES Bridge service URL | `http://localhost:8003` |
| `N8N_WEBHOOK_URL` | n8n workflow webhook URL | - |

#### AI Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini AI API key for Normalizer | - |

### Production Deployment Checklist

- [ ] Set `ALLOWED_ORIGINS` to trusted domains only (e.g., `https://yourdomain.com`)
- [ ] Use HTTPS for all external communication
- [ ] Set `NODE_ENV=production`
- [ ] Enable mTLS with NPHIES (`NPHIES_ENV=production`)
- [ ] Configure strong database passwords
- [ ] Verify all certificate paths are correct
- [ ] Configure logging for PII protection
- [ ] Review all security headers
- [ ] Test health endpoints after deployment

## 🧩 Devcontainer (Local Development)

This repository includes a devcontainer configuration that boots the core SBS
services and the landing API for a unified local environment.

1. Open the repo in VS Code.
2. Select "Reopen in Container".
3. Services will be available on:
   - `http://localhost:3000` (Landing API + static UI)
   - `http://localhost:8000` (Normalizer)
   - `http://localhost:8001` (Signer)
   - `http://localhost:8002` (Financial Rules)
   - `http://localhost:8003` (NPHIES Bridge)
   - `http://localhost:5678` (n8n)

## 🌐 GitHub Pages Frontend

The landing UI can be deployed as a static site using GitHub Pages.
The workflow publishes `sbs-landing/public`.

1. Enable GitHub Pages for the repository.
2. Set a repository variable `PAGES_API_BASE_URL` to the backend API base URL
   (example: `https://brainsait.cloud`).
3. Push changes to `main` to trigger deployment.

The frontend reads `window.SBS_API_BASE_URL` from `sbs-landing/public/config.js`.
If the variable is empty, it will default to the same origin.

### CORS Configuration for GitHub Pages

For GitHub Pages frontend to communicate with your API:

1. **Set `ALLOWED_ORIGINS`** to include your GitHub Pages domain:
   ```bash
   ALLOWED_ORIGINS=https://yourusername.github.io,http://localhost:3001
   ```

2. **For custom domains**, include both the GitHub Pages URL and your custom domain:
   ```bash
   ALLOWED_ORIGINS=https://yourusername.github.io,https://your-custom-domain.com,http://localhost:3001
   ```

3. **Restart services** after updating environment variables:
   ```bash
   docker-compose restart
   ```

> 💡 **Tip**: If you encounter CORS errors, check the browser console for the blocked origin and add it to `ALLOWED_ORIGINS`.

## 📊 Database Schema

- `sbs_master_catalogue`: Official CHI SBS codes
- `facility_internal_codes`: Hospital-specific codes
- `sbs_normalization_map`: Core mapping engine
- `pricing_tier_rules`: Financial compliance rules

See `/database/schema.sql` for complete schema.

## 🔒 Security & Compliance

- **mTLS**: Mutual authentication with NPHIES
- **Digital Signatures**: SHA-256 + RSA signing for all payloads
- **PDPL Compliance**: Encrypted logging for PII protection
- **FHIR R4**: Strict adherence to HL7 FHIR Release 4 standard

### API Security Features

- **CORS Protection**: Environment-configurable origin whitelist prevents cross-origin attacks
- **Rate Limiting**: 100 requests per 15 minutes per IP address
- **Error Handling**: All endpoints return proper JSON error responses
- **Input Validation**: Strict JSON parsing with error handling to prevent DoS attacks
- **Security Headers**: Helmet.js with strict Content Security Policy
- **File Validation**: Only allowed file types (PDF, DOC, XLS, JSON, XML, Images)
- **Logging**: Structured logging without exposing sensitive data
- **Request Tracking**: Debug middleware logs method, path, and headers for incident analysis

### Common Security Issues & Solutions

| Issue | Symptoms | Solution |
|-------|----------|----------|
| CORS Errors | "Access to XMLHttpRequest has been blocked by CORS policy" | Verify `ALLOWED_ORIGINS` environment variable includes your frontend domain |
| Invalid JSON | "Invalid JSON format" on form submission | Ensure request `Content-Type` is `application/json` |
| Certificate Errors | mTLS authentication failures | Check certificate paths and NPHIES credentials in `.env` |
| Rate Limiting | HTTP 429 responses | Wait 15 minutes or increase rate limit in production |

## 🧪 Testing

```bash
# Sandbox Environment (Development)
export NPHIES_ENV=sandbox
docker-compose -f docker-compose.sandbox.yml up

# Run integration tests
pytest tests/integration/

# Production Environment
export NPHIES_ENV=production
docker-compose up -d
```

## 📁 Project Structure

```
sbs-integration-engine/
├── normalizer-service/       # AI-powered code normalization
├── financial-rules-engine/   # CHI business rules
├── signer-service/           # Digital signing & certificates
├── nphies-bridge/            # NPHIES API integration
├── database/                 # Schema and migrations
├── n8n-workflows/            # Workflow templates
├── docker/                   # Docker configurations
├── docs/                     # Documentation
└── docker-compose.yml        # Orchestration
```

## 🛠️ API Endpoints

### Normalizer Service
- `POST /normalize` - Convert internal code to SBS code

### Financial Rules Engine
- `POST /validate` - Apply financial rules to claim

### Signer Service
- `POST /sign` - Generate digital signature

### NPHIES Bridge
- `POST /submit-claim` - Submit claim to NPHIES

## 🐛 Troubleshooting

### CORS Errors

**Error**: `Access to XMLHttpRequest has been blocked by CORS policy`

**Causes & Solutions**:
1. **Missing origin in whitelist**: Add your frontend domain to `ALLOWED_ORIGINS` in `.env`
2. **Protocol mismatch**: Ensure both `http://` and `https://` versions are included if needed
3. **Port mismatch**: Include the port number if your frontend runs on a non-standard port

```bash
# Example fix
ALLOWED_ORIGINS=https://your-frontend.com,http://localhost:3001,http://localhost:3000
docker-compose restart
```

### 405 Method Not Allowed

**Error**: `405 Method Not Allowed` on POST requests

**Solutions**:
1. Verify the endpoint exists and is correctly spelled
2. Check that CORS preflight (OPTIONS) requests are being handled
3. Ensure the HTTP method matches the endpoint configuration

### Invalid JSON Format

**Error**: `Invalid JSON format` on form submission

**Solutions**:
1. Ensure request `Content-Type` header is set to `application/json`
2. Validate JSON payload structure before sending
3. Check for trailing commas or invalid characters in JSON

### Service Connection Failures

**Error**: `ECONNREFUSED` or service timeout errors

**Solutions**:
1. Verify all services are running: `docker-compose ps`
2. Check service URLs in `.env` match the actual service addresses
3. Ensure services are on the same Docker network
4. Check individual service health: `curl http://localhost:8000/health`

### Certificate Errors

**Error**: mTLS or certificate validation failures

**Solutions**:
1. Verify certificate paths in `.env` (`CERT_BASE_PATH`)
2. Check certificate permissions: `chmod 600 /certs/*/private_key.pem`
3. Ensure certificates are not expired
4. Verify certificate matches the registered facility in NPHIES

### Database Connection Issues

**Error**: Database connection refused or authentication failed

**Solutions**:
1. Verify database credentials in `.env`
2. Check PostgreSQL is running: `docker-compose logs postgres`
3. Test connection: `docker exec -it sbs-postgres psql -U postgres -d sbs_integration`

## 📚 Documentation

- [PRD](docs/PRD.md) - Product Requirements Document
- [API Reference](docs/API.md) - Complete API documentation
- [Security Guide](docs/SECURITY.md) - Security implementation details
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For technical support, contact: support@sbs-integration.sa
