# Kubernetes Production Deployment - Quick Reference

## 📦 What Was Created

### Core Manifests (10 files)
1. **00-namespace.yaml** - sbs-prod namespace with labels
2. **01-secrets.yaml** - Secrets template (passwords, API keys)
3. **02-configmap.yaml** - ConfigMap (DB config, service URLs)
4. **03-postgres.yaml** - PostgreSQL StatefulSet + 20Gi PVC
5. **04-normalizer.yaml** - Normalizer deployment + service (2 replicas)
6. **05-signer.yaml** - Signer deployment + service (2 replicas)
7. **06-financial.yaml** - Financial deployment + service (2 replicas)
8. **07-nphies.yaml** - NPHIES deployment + service (2 replicas)
9. **08-frontend.yaml** - Frontend Nginx + service
10. **09-ingress.yaml** - Traefik ingress + middlewares

### Additional Files
- **deploy-sbs-k8s.sh** - Automated deployment script
- **README.md** - Comprehensive documentation

## ⚡ Quick Deploy

```bash
cd /home/fadil369/sbs/k8s-production

# 1. Update secrets FIRST!
nano 01-secrets.yaml

# 2. Deploy (dry-run recommended)
./deploy-sbs-k8s.sh --dry-run
./deploy-sbs-k8s.sh

# 3. Monitor
kubectl get pods -n sbs-prod -w
```

## 🎯 Key Features

### Production-Ready
✅ Health checks (liveness + readiness probes)
✅ Resource limits (requests + limits)
✅ Rolling updates (zero downtime)
✅ Pod anti-affinity (spread across nodes)
✅ Security headers + rate limiting
✅ Horizontal scaling ready
✅ Persistent storage (20Gi for PostgreSQL)

### Configuration
- **imagePullPolicy: Never** - Uses local images
- **2 replicas** per microservice
- **hostPath** for frontend dist: `/home/fadil369/sbs/sbs-landing/dist`
- **Domain**: brainsait-pi.taile21830.ts.net

### Resource Allocation
| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---------|------------|-----------|----------------|--------------|
| Normalizer | 100m | 500m | 256Mi | 1Gi |
| Signer | 100m | 500m | 256Mi | 1Gi |
| Financial | 100m | 500m | 256Mi | 1Gi |
| NPHIES | 100m | 500m | 256Mi | 1Gi |
| PostgreSQL | 250m | 1000m | 512Mi | 2Gi |
| Frontend | 50m | 200m | 64Mi | 256Mi |

## 🔒 Security Configuration

### Secrets Required (Update before deployment!)
```yaml
POSTGRES_PASSWORD: "changeme123"  # ⚠️ CHANGE THIS
DB_PASSWORD: "changeme123"        # ⚠️ CHANGE THIS
API_SECRET_KEY: "your-secret-key" # ⚠️ CHANGE THIS
JWT_SECRET: "your-jwt-secret"     # ⚠️ CHANGE THIS
NPHIES_API_KEY: "your-key"        # ⚠️ CHANGE THIS
NPHIES_API_SECRET: "your-secret"  # ⚠️ CHANGE THIS
ENCRYPTION_KEY: "32-char-key"     # ⚠️ CHANGE THIS
```

### Security Features
- TLS/SSL termination at ingress
- Security headers (X-Frame-Options, CSP, HSTS)
- Rate limiting (100 req/min, burst 50)
- CORS configuration
- Pod security policies

## 🌐 Service Architecture

```
Frontend (80) → Nginx → React App (hostPath)
    ↓
Ingress (Traefik)
    ↓
API Services:
├── /api/normalizer → normalizer-service:8000
├── /api/signer → signer-service:8001
├── /api/financial → financial-service:8002
└── /api/nphies → nphies-service:8003
    ↓
All services → postgres-service:5432
```

## 🔍 Health Checks

Each service includes:
- **Liveness Probe**: `/health` endpoint
  - Initial delay: 30s
  - Period: 10s
  - Timeout: 5s
  
- **Readiness Probe**: `/ready` endpoint
  - Initial delay: 10s
  - Period: 5s
  - Timeout: 3s

## 📊 Monitoring Commands

```bash
# Pod status
kubectl get pods -n sbs-prod

# Services
kubectl get svc -n sbs-prod

# Ingress
kubectl get ingress -n sbs-prod

# Logs (follow)
kubectl logs -f deployment/normalizer -n sbs-prod

# Resource usage
kubectl top pods -n sbs-prod

# Events
kubectl get events -n sbs-prod --sort-by='.lastTimestamp'
```

## 🔄 Common Operations

### Scale Services
```bash
kubectl scale deployment normalizer -n sbs-prod --replicas=3
```

### Update Image
```bash
kubectl set image deployment/normalizer normalizer=sbs-normalizer:v2 -n sbs-prod
```

### Restart Service
```bash
kubectl rollout restart deployment/normalizer -n sbs-prod
```

### Rollback
```bash
kubectl rollout undo deployment/normalizer -n sbs-prod
```

### Port Forward (local testing)
```bash
kubectl port-forward svc/frontend-service 8080:80 -n sbs-prod
```

## 🗄️ Database Operations

### Backup
```bash
kubectl exec -it postgres-0 -n sbs-prod -- pg_dump -U sbs_user sbs_production > backup.sql
```

### Restore
```bash
kubectl cp backup.sql sbs-prod/postgres-0:/backup.sql
kubectl exec -it postgres-0 -n sbs-prod -- psql -U sbs_user sbs_production < /backup.sql
```

### Access PostgreSQL
```bash
kubectl exec -it postgres-0 -n sbs-prod -- psql -U sbs_user -d sbs_production
```

## 🧹 Cleanup

```bash
# Delete everything
kubectl delete namespace sbs-prod

# Or delete selectively
kubectl delete -f 04-normalizer.yaml
kubectl delete -f 05-signer.yaml
# etc...
```

## ⚠️ Pre-Deployment Checklist

- [ ] Update all secrets in `01-secrets.yaml`
- [ ] Build Docker images locally
- [ ] Verify frontend dist exists: `/home/fadil369/sbs/sbs-landing/dist`
- [ ] Ensure K3s/K8s cluster is running
- [ ] Verify kubectl access: `kubectl cluster-info`
- [ ] Check available resources: `kubectl top nodes`
- [ ] Review ConfigMap settings in `02-configmap.yaml`

## 🚀 Deployment Order

The script deploys in this order:
1. Namespace
2. Secrets
3. ConfigMap
4. PostgreSQL (waits for ready)
5. Microservices (normalizer, signer, financial, nphies)
6. Frontend
7. Ingress

## 📱 Access Points

After deployment:
- **Main Application**: https://brainsait-pi.taile21830.ts.net
- **API Endpoints**: https://brainsait-pi.taile21830.ts.net/api/*

## 🆘 Troubleshooting

### Pod stuck in ImagePullBackOff
```bash
# Images must be local with imagePullPolicy: Never
docker images | grep sbs
```

### Pod stuck in CrashLoopBackOff
```bash
kubectl logs <pod-name> -n sbs-prod
kubectl describe pod <pod-name> -n sbs-prod
```

### Service not accessible
```bash
kubectl get endpoints -n sbs-prod
kubectl describe svc <service-name> -n sbs-prod
```

### Database connection failed
```bash
kubectl logs postgres-0 -n sbs-prod
kubectl exec -it postgres-0 -n sbs-prod -- psql -U sbs_user -d sbs_production -c "SELECT 1;"
```

## 📚 Documentation

See `README.md` for comprehensive documentation including:
- Architecture details
- Security best practices
- Advanced scaling strategies
- Network policies
- Maintenance procedures
- Additional resources

---
**Created**: January 2025  
**Location**: `/home/fadil369/sbs/k8s-production/`  
**Status**: Production Ready ✅
