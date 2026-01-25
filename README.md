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
