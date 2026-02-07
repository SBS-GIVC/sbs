# Docker Compose Files

This directory contains various Docker Compose configurations for different environments.

## 📂 Files

| File | Description | Usage |
|------|-------------|-------|
| `docker-compose.yml` (root) | Main development configuration | Default for local dev |
| `docker-compose.enhanced.yml` | Enhanced with monitoring | Full stack + monitoring |
| `docker-compose.prod.yml` | Production configuration | Optimized for production |
| `docker-compose.production.yml` | Full production setup | Complete prod environment |
| `docker-compose.services.yml` | Core services only | Microservices only |

## 🚀 Usage

### Development (from project root)
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker/docker-compose.production.yml up -d
```

### Enhanced with Monitoring
```bash
docker-compose -f docker/docker-compose.enhanced.yml up -d
```

### Services Only
```bash
docker-compose -f docker/docker-compose.services.yml up -d
```

## 📋 Service Overview

All configurations include:
- **normalizer-service** (8000) - AI code normalization
- **signer-service** (8001) - Digital signing
- **financial-rules-engine** (8002) - Financial rules
- **nphies-bridge** (8003) - NPHIES integration
- **sbs-landing** (3000/3001) - Web UI and API

Enhanced configurations add:
- **postgres** - Database
- **redis** - Caching
- **n8n** - Workflow orchestration
- **prometheus/grafana** - Monitoring
