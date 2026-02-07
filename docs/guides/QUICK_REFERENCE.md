# 🚀 Quick Reference Guide - SBS Integration Engine

## 📦 Installation (3 Commands)

```bash
cd sbs-integration-engine
cp .env.example .env
./quickstart.sh
```

## 🔧 Configuration (Edit .env)

```bash
# Essential: Add these keys
DEEPSEEK_API_KEY=your_api_key
DB_PASSWORD=secure_password
N8N_PASSWORD=secure_password
```

## 🌐 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Normalizer | http://localhost:8000 | - |
| Signer | http://localhost:8001 | - |
| Financial Rules | http://localhost:8002 | - |
| NPHIES Bridge | http://localhost:8003 | - |
| n8n | http://localhost:5678 | From .env |
| pgAdmin | http://localhost:5050 | From .env |

## 🧪 Quick Tests

### Test 1: Normalize Code
```bash
curl -X POST http://localhost:8000/normalize \
  -H 'Content-Type: application/json' \
  -d '{"facility_id":1,"internal_code":"LAB-CBC-01","description":"CBC Test"}'
```

### Test 2: Generate Certificate
```bash
curl -X POST http://localhost:8001/generate-test-cert?facility_id=1
```

### Test 3: Health Check
```bash
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
```

## 📊 Database Access

```bash
# PostgreSQL CLI
docker exec -it sbs-postgres psql -U postgres -d sbs_integration

# Common queries
SELECT * FROM facilities;
SELECT * FROM sbs_master_catalogue LIMIT 10;
SELECT * FROM v_active_mappings;
```

## 🔍 Troubleshooting

### Check Status
```bash
docker-compose ps
docker-compose logs -f
```

### Restart Services
```bash
docker-compose restart
docker-compose restart normalizer-service
```

### Rebuild
```bash
docker-compose down
docker-compose up -d --build
```

## 📝 n8n Workflow Setup

1. Navigate to http://localhost:5678
2. Login with credentials from .env
3. Workflows → Import from File
4. Select: `n8n-workflows/sbs-full-workflow.json`
5. Activate workflow

## 📚 Documentation Files

- `README.md` - Project overview
- `PROJECT_SUMMARY.md` - Complete implementation summary
- `docs/PRD.md` - Product requirements
- `docs/API.md` - API documentation
- `docs/DEPLOYMENT.md` - Production deployment
- `docs/SECURITY.md` - Security implementation

## 🎯 Key Components

**4 Microservices**:
1. Normalizer (AI-powered code translation)
2. Financial Rules (CHI business rules)
3. Signer (Digital signatures)
4. NPHIES Bridge (NPHIES integration)

**Database**: PostgreSQL with 10 tables
**Orchestration**: n8n workflow engine
**Security**: RSA-2048, SHA-256, mTLS

## ⚡ Production Checklist

- [ ] Edit .env with production values
- [ ] Obtain NPHIES production certificates
- [ ] Load SBS master catalogue
- [ ] Import facility codes
- [ ] Test in sandbox environment
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL/TLS
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Security audit

## 🆘 Emergency Commands

```bash
# Stop everything
docker-compose down

# Remove all data (DANGEROUS)
docker-compose down -v

# View specific service logs
docker-compose logs normalizer-service

# Backup database
docker exec sbs-postgres pg_dump -U postgres sbs_integration > backup.sql

# Restore database
docker exec -i sbs-postgres psql -U postgres sbs_integration < backup.sql
```

## 📞 Support

See documentation in `docs/` directory for detailed guides.
