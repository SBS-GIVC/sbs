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

# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# For production
docker-compose -f docker/docker-compose.production.yml up -d
```

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
