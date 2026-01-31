# SBS Kubernetes Production Deployment - Complete Package

## 📦 Package Contents

This directory contains production-ready Kubernetes manifests and tooling for deploying the Smart Billing System (SBS).

### 📋 Core Kubernetes Manifests (10 files)

```
00-namespace.yaml       247 bytes    Namespace: sbs-prod with labels
01-secrets.yaml         1.2 KB       Secrets template (⚠️ UPDATE FIRST!)
02-configmap.yaml       1.2 KB       ConfigMap: DB config, service URLs
03-postgres.yaml        3.1 KB       PostgreSQL StatefulSet + 20Gi PVC
04-normalizer.yaml      3.8 KB       Normalizer: Deployment + Service
05-signer.yaml          3.9 KB       Signer: Deployment + Service
06-financial.yaml       3.8 KB       Financial: Deployment + Service
07-nphies.yaml          4.2 KB       NPHIES: Deployment + Service
08-frontend.yaml        6.0 KB       Frontend: Nginx + React + ConfigMap
09-ingress.yaml         3.5 KB       Traefik Ingress + 4 Middlewares
```

### 🔧 Scripts (2 files)

```
deploy-sbs-k8s.sh       8.4 KB       Automated deployment with validation
verify-deployment.sh    5.6 KB       Post-deployment verification
```

### 📚 Documentation (2 files)

```
README.md               9.3 KB       Complete documentation
QUICK_START.md          6.4 KB       Quick reference guide
```

## 🚀 Getting Started

### Step 1: Update Secrets (CRITICAL!)

```bash
nano 01-secrets.yaml
```

Replace these values:
- `POSTGRES_PASSWORD`: Database password
- `DB_PASSWORD`: Application database password
- `API_SECRET_KEY`: API authentication key
- `JWT_SECRET`: JWT signing secret
- `NPHIES_API_KEY`: NPHIES API key
- `NPHIES_API_SECRET`: NPHIES API secret
- `ENCRYPTION_KEY`: Data encryption key (32 chars)

### Step 2: Deploy

**Option A: Automated (Recommended)**
```bash
./deploy-sbs-k8s.sh --dry-run    # Test first
./deploy-sbs-k8s.sh              # Deploy
```

**Option B: Manual**
```bash
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-secrets.yaml
kubectl apply -f 02-configmap.yaml
kubectl apply -f 03-postgres.yaml
kubectl wait --for=condition=ready pod -l app=postgres -n sbs-prod --timeout=300s
kubectl apply -f 04-normalizer.yaml
kubectl apply -f 05-signer.yaml
kubectl apply -f 06-financial.yaml
kubectl apply -f 07-nphies.yaml
kubectl apply -f 08-frontend.yaml
kubectl apply -f 09-ingress.yaml
```

### Step 3: Verify

```bash
./verify-deployment.sh
```

## 📊 Architecture

### Service Map
```
Internet
    ↓
Traefik Ingress (brainsait-pi.taile21830.ts.net)
    ↓
┌───────────────────────────────────────┐
│                                       │
│  Frontend (80) ←→ Nginx ←→ React      │
│                                       │
│  /api/normalizer ←→ normalizer:8000   │
│  /api/signer     ←→ signer:8001       │
│  /api/financial  ←→ financial:8002    │
│  /api/nphies     ←→ nphies:8003       │
│                                       │
└───────────────┬───────────────────────┘
                ↓
        PostgreSQL:5432
        (20Gi Persistent)
```

### Deployment Topology
```
sbs-prod namespace
├── StatefulSet
│   └── postgres (1 replica)
│       └── PVC: postgres-pvc (20Gi)
├── Deployments
│   ├── normalizer (2 replicas)
│   ├── signer (2 replicas)
│   ├── financial (2 replicas)
│   ├── nphies (2 replicas)
│   └── frontend (1 replica)
├── Services
│   ├── postgres-service (ClusterIP, headless)
│   ├── normalizer-service (ClusterIP)
│   ├── signer-service (ClusterIP)
│   ├── financial-service (ClusterIP)
│   ├── nphies-service (ClusterIP)
│   └── frontend-service (ClusterIP)
└── Ingress
    └── sbs-ingress (Traefik)
```

## 💡 Key Features

### Production Ready
- ✅ **Health Checks**: Liveness & readiness probes
- ✅ **Resource Limits**: CPU/Memory requests and limits
- ✅ **High Availability**: Multiple replicas with anti-affinity
- ✅ **Persistent Storage**: StatefulSet with PVC
- ✅ **Zero Downtime**: Rolling update strategy
- ✅ **Security**: Headers, rate limiting, TLS ready
- ✅ **Scalability**: HPA ready, easy scaling

### Configuration
- **Namespace**: `sbs-prod`
- **Domain**: `brainsait-pi.taile21830.ts.net`
- **Image Pull**: `Never` (local images)
- **Replicas**: 2 per microservice
- **Storage**: 20Gi for PostgreSQL
- **Frontend**: hostPath to `/home/fadil369/sbs/sbs-landing/dist`

## 📈 Resource Requirements

### Minimum Cluster Resources
- **CPU**: 1.15 cores (requested), 4.5 cores (limit)
- **RAM**: 2.8 GB (requested), 10.25 GB (limit)
- **Storage**: 20 GB for PostgreSQL

### Per-Service Resources
| Service | CPU Request | CPU Limit | RAM Request | RAM Limit |
|---------|-------------|-----------|-------------|-----------|
| Normalizer (×2) | 200m | 1000m | 512Mi | 2Gi |
| Signer (×2) | 200m | 1000m | 512Mi | 2Gi |
| Financial (×2) | 200m | 1000m | 512Mi | 2Gi |
| NPHIES (×2) | 200m | 1000m | 512Mi | 2Gi |
| PostgreSQL | 250m | 1000m | 512Mi | 2Gi |
| Frontend | 50m | 200m | 64Mi | 256Mi |

## 🔒 Security Features

### Network Security
- TLS/SSL termination at ingress
- Rate limiting: 100 req/min, burst 50
- CORS configuration
- Security headers (X-Frame-Options, CSP, HSTS)

### Application Security
- Secrets management (base64 encoded)
- Pod security contexts
- Resource isolation
- Network policies ready

### Compliance
- Audit logging enabled
- Encryption in transit
- Access control via RBAC
- Pod anti-affinity

## 🔍 Monitoring & Operations

### View Status
```bash
kubectl get all -n sbs-prod
kubectl get pods -n sbs-prod -w
kubectl top pods -n sbs-prod
```

### View Logs
```bash
kubectl logs -f deployment/normalizer -n sbs-prod
kubectl logs -f postgres-0 -n sbs-prod
```

### Debug Issues
```bash
kubectl describe pod <pod-name> -n sbs-prod
kubectl get events -n sbs-prod --sort-by='.lastTimestamp'
```

### Scale Services
```bash
kubectl scale deployment normalizer -n sbs-prod --replicas=3
```

### Update Services
```bash
kubectl rollout restart deployment/normalizer -n sbs-prod
kubectl rollout status deployment/normalizer -n sbs-prod
```

## 🌐 Access Points

After successful deployment:

- **Main Application**: https://brainsait-pi.taile21830.ts.net
- **Normalizer API**: https://brainsait-pi.taile21830.ts.net/api/normalizer
- **Signer API**: https://brainsait-pi.taile21830.ts.net/api/signer
- **Financial API**: https://brainsait-pi.taile21830.ts.net/api/financial
- **NPHIES API**: https://brainsait-pi.taile21830.ts.net/api/nphies

## 🆘 Troubleshooting

### Common Issues

**Pods in ImagePullBackOff**
- Cause: Images not built locally
- Fix: Build all images with `imagePullPolicy: Never`

**Pods in CrashLoopBackOff**
- Cause: Application error or missing dependencies
- Fix: Check logs with `kubectl logs <pod-name> -n sbs-prod`

**Service Not Accessible**
- Cause: Service selector mismatch or pod not ready
- Fix: Check endpoints with `kubectl get endpoints -n sbs-prod`

**Database Connection Failed**
- Cause: PostgreSQL not ready or incorrect credentials
- Fix: Check postgres logs and verify secrets

### Support Resources
- `README.md` - Full documentation
- `QUICK_START.md` - Quick reference
- `./verify-deployment.sh` - Automated verification

## 📝 Pre-Deployment Checklist

- [ ] Update all secrets in `01-secrets.yaml`
- [ ] Build all Docker images locally
- [ ] Build frontend: `cd /home/fadil369/sbs/sbs-landing && npm run build`
- [ ] Verify K8s cluster: `kubectl cluster-info`
- [ ] Check node resources: `kubectl top nodes`
- [ ] Review ConfigMap: `02-configmap.yaml`
- [ ] Ensure Traefik is installed
- [ ] Test with dry-run: `./deploy-sbs-k8s.sh --dry-run`

## 🔄 Maintenance

### Backup Database
```bash
kubectl exec -it postgres-0 -n sbs-prod -- pg_dump -U sbs_user sbs_production > backup.sql
```

### Restore Database
```bash
kubectl cp backup.sql sbs-prod/postgres-0:/backup.sql
kubectl exec -it postgres-0 -n sbs-prod -- psql -U sbs_user sbs_production < /backup.sql
```

### Update Configuration
```bash
kubectl edit configmap sbs-config -n sbs-prod
kubectl rollout restart deployment -n sbs-prod
```

### Clean Uninstall
```bash
kubectl delete namespace sbs-prod
```

## 📚 Additional Documentation

- **README.md** - Comprehensive guide with architecture, troubleshooting, best practices
- **QUICK_START.md** - Quick reference for common operations
- **01-secrets.yaml** - Inline documentation for secrets
- **08-frontend.yaml** - Nginx configuration with comments

## 📄 Version Information

- **Created**: January 2025
- **Kubernetes Version**: Compatible with K3s 1.25+ and K8s 1.24+
- **Status**: Production Ready ✅
- **Organization**: Brain Sait Technologies

## 🎯 Quick Commands Summary

```bash
# Deploy
./deploy-sbs-k8s.sh

# Verify
./verify-deployment.sh

# Monitor
kubectl get pods -n sbs-prod -w

# Logs
kubectl logs -f deployment/normalizer -n sbs-prod

# Scale
kubectl scale deployment normalizer -n sbs-prod --replicas=3

# Delete
kubectl delete namespace sbs-prod
```

---

**For detailed instructions, see `README.md`**  
**For quick reference, see `QUICK_START.md`**
