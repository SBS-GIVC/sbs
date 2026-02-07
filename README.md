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

| Service | Port | Description |
|---------|------|-------------|
| **Normalizer Service** | 8000 | AI-powered translation of hospital codes to SBS codes |
| **Signer Service** | 8001 | Digital certificates and SHA-256/RSA signing |
| **Financial Rules Engine** | 8002 | CHI-mandated business rules and pricing |
| **NPHIES Bridge** | 8003 | NPHIES platform communication and logging |
| **SBS Landing** | 3000/3001 | Web UI and REST API |

### Orchestration

- **n8n Workflow Engine**: Orchestrates end-to-end claim submission pipeline

## 📁 Project Structure

```
sbs/
├── normalizer-service/      # AI-powered code normalization
├── financial-rules-engine/  # CHI business rules
├── signer-service/          # Digital signing & certificates
├── nphies-bridge/           # NPHIES API integration
├── ai-prediction-service/   # AI prediction service
├── sbs-landing/             # Web UI & Landing API
├── services/                # Supporting microservices
│   ├── agents/              # AI agents (AuthLinc, ClaimLinc, ComplianceLinc)
│   └── masterlinc-bridge/   # MasterLinc integration
├── database/                # Schema and migrations
├── docker/                  # Docker Compose configurations
├── docs/                    # 📚 All documentation
│   ├── architecture/        # System architecture
│   ├── deployment/          # Deployment guides
│   ├── api/                 # API documentation
│   ├── testing/             # Testing guides
│   ├── security/            # Security docs
│   ├── guides/              # Development guides
│   └── reports/             # Audit reports
├── scripts/                 # 🔧 All scripts
│   ├── deploy/              # Deployment scripts
│   ├── test/                # Test scripts
│   └── maintenance/         # Maintenance scripts
├── n8n-workflows/           # n8n workflow definitions
├── k8s-production/          # Kubernetes manifests
├── tests/                   # Test suite
└── docker-compose.yml       # Main orchestration
```

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
cd sbs

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start the full stack (recommended)
docker compose -f docker/docker-compose.services.yml up -d

# Check service health
docker compose -f docker/docker-compose.services.yml ps
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

## ✅ End-to-End workflow testing (API pipeline)

### Option A: Docker Compose (recommended)

```bash
docker-compose up -d
python -m pytest tests/test_claim_workflow.py -v
```

### Option B: No Docker (Alpine/devcontainers)

If Docker isn’t available, you can run Postgres + all services locally and execute
the full workflow scenario matrix (claim types × mock NPHIES outcomes × file upload variants).

```bash
# one-time setup (installs postgres/node, creates venvs, installs deps)
./scripts/bootstrap-local-stack.sh

# start Postgres + all services
./scripts/start-local-stack.sh

# run E2E matrix tests + workflow simulator live check
./scripts/run-e2e.sh
```

Details: `docs/LOCAL_E2E.md`.

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

## 🧪 Testing

```bash
# Run quick test
./scripts/test/quick_test_single_claim.sh

# Run full integration tests
pytest tests/

# Run n8n workflow tests
./scripts/test/test_n8n_integration.sh
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

## 📚 Documentation

See [docs/README.md](docs/README.md) for the complete documentation index.

**Key Documents:**
- [Architecture Overview](docs/architecture/ARCHITECTURE.md)
- [API Reference](docs/api/API.md)
- [Deployment Guide](docs/deployment/DEPLOYMENT.md)
- [Security Guide](docs/security/SECURITY.md)
- [Getting Started](docs/guides/START_HERE.md)

## 🔧 Scripts

See [scripts/README.md](scripts/README.md) for available scripts.

**Quick Commands:**
```bash
# Deploy
./scripts/deploy/quickstart.sh          # Local development
./scripts/deploy/deploy-production.sh   # Production

# Test
./scripts/test/quick_test_single_claim.sh
./scripts/test/test_full_workflow.sh

# Maintenance
./scripts/maintenance/check_sbs_status.sh
./scripts/maintenance/production-health-check.sh
```

## 📄 License

Proprietary - All rights reserved

## 📞 Support

For technical support, contact: support@brainsait.cloud

---

**Production URL:** https://sbs.brainsait.cloud
