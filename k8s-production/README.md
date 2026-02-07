# SBS Kubernetes Production Deployment

Complete production-ready Kubernetes manifests for Smart Billing System (SBS).

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    brainsait-pi.taile21830.ts.net           │
│                         (Traefik Ingress)                    │
└────────────┬────────────────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
┌────▼─────┐    ┌────▼─────────────────────────────────┐
│ Frontend │    │         API Services                  │
│ (Nginx)  │    │  ┌─────────────┬─────────────┐       │
│          │    │  │ Normalizer  │   Signer    │       │
│ Port 80  │    │  │  (8000)     │   (8001)    │       │
└──────────┘    │  └─────────────┴─────────────┘       │
                │  ┌─────────────┬─────────────┐       │
                │  │ Financial   │   NPHIES    │       │
                │  │  (8002)     │   (8003)    │       │
                │  └─────────────┴─────────────┘       │
                └──────────────┬──────────────────────┘
                               │
                        ┌──────▼──────┐
                        │  PostgreSQL │
                        │ (StatefulSet)│
                        │   20Gi PVC  │
                        └─────────────┘
```

## 📁 Files Overview

| File | Description | Components |
|------|-------------|------------|
| `00-namespace.yaml` | Namespace definition | sbs-prod namespace |
| `01-secrets.yaml` | Secrets template | Database passwords, API keys |
| `02-configmap.yaml` | Configuration | Database config, service URLs |
| `03-postgres.yaml` | PostgreSQL database | StatefulSet + PVC (20Gi) + Service |
| `04-normalizer.yaml` | Normalizer service | Deployment (2 replicas) + Service |
| `05-signer.yaml` | Signer service | Deployment (2 replicas) + Service |
| `06-financial.yaml` | Financial service | Deployment (2 replicas) + Service |
| `07-nphies.yaml` | NPHIES integration | Deployment (2 replicas) + Service |
| `08-frontend.yaml` | React frontend | Deployment + Nginx + Service |
| `09-ingress.yaml` | Traefik ingress | Ingress + Middlewares |
| `deploy-sbs-k8s.sh` | Deployment script | Automated deployment |

## 🚀 Quick Start

### 1. Update Secrets (IMPORTANT!)

```bash
# Edit secrets file
nano 01-secrets.yaml

# Update these values:
# - POSTGRES_PASSWORD
# - DB_PASSWORD
# - API_SECRET_KEY
# - JWT_SECRET
# - NPHIES_API_KEY
# - NPHIES_API_SECRET
# - ENCRYPTION_KEY
```

### 2. Deploy with Script

```bash
# Deploy everything
./deploy-sbs-k8s.sh

# Dry run first (recommended)
./deploy-sbs-k8s.sh --dry-run

# Skip secrets if already deployed
./deploy-sbs-k8s.sh --skip-secrets
```

### 3. Manual Deployment

```bash
# Deploy in order
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-secrets.yaml
kubectl apply -f 02-configmap.yaml
kubectl apply -f 03-postgres.yaml

# Wait for PostgreSQL
kubectl wait --for=condition=ready pod -l app=postgres -n sbs-prod --timeout=300s

# Deploy services
kubectl apply -f 04-normalizer.yaml
kubectl apply -f 05-signer.yaml
kubectl apply -f 06-financial.yaml
kubectl apply -f 07-nphies.yaml
kubectl apply -f 08-frontend.yaml
kubectl apply -f 09-ingress.yaml
```

## ✅ Verify Deployment

```bash
# Check all pods
kubectl get pods -n sbs-prod

# Check services
kubectl get svc -n sbs-prod

# Check ingress
kubectl get ingress -n sbs-prod

# Watch deployment
kubectl get pods -n sbs-prod -w
```

## 🔍 Monitoring & Logs

```bash
# View logs
kubectl logs -f deployment/normalizer -n sbs-prod
kubectl logs -f deployment/signer -n sbs-prod
kubectl logs -f deployment/financial -n sbs-prod
kubectl logs -f deployment/nphies -n sbs-prod
kubectl logs -f deployment/frontend -n sbs-prod
kubectl logs -f postgres-0 -n sbs-prod

# Resource usage
kubectl top pods -n sbs-prod
kubectl top nodes

# Events
kubectl get events -n sbs-prod --sort-by='.lastTimestamp'
```

## 📊 Resource Limits

### Microservices (each)
- **Requests**: 256Mi RAM, 100m CPU
- **Limits**: 1Gi RAM, 500m CPU
- **Replicas**: 2

### PostgreSQL
- **Requests**: 512Mi RAM, 250m CPU
- **Limits**: 2Gi RAM, 1000m CPU
- **Storage**: 20Gi PVC

### Frontend
- **Requests**: 64Mi RAM, 50m CPU
- **Limits**: 256Mi RAM, 200m CPU

## 🔄 Scaling

```bash
# Manual scaling
kubectl scale deployment normalizer -n sbs-prod --replicas=3
kubectl scale deployment signer -n sbs-prod --replicas=3
kubectl scale deployment financial -n sbs-prod --replicas=3
kubectl scale deployment nphies -n sbs-prod --replicas=3

# Auto-scaling (HPA)
kubectl autoscale deployment normalizer -n sbs-prod --cpu-percent=70 --min=2 --max=5
```

## 🔐 Security Features

- **Pod Anti-Affinity**: Spreads replicas across nodes
- **Security Headers**: X-Frame-Options, CSP, HSTS
- **Rate Limiting**: 100 requests/min with burst of 50
- **TLS/SSL**: Automatic certificate management
- **Secrets Management**: Base64 encoded secrets
- **Network Policies**: Restrict pod communication (optional)

## 💾 Backup & Recovery

### Backup Database

```bash
# Create backup
kubectl exec -it postgres-0 -n sbs-prod -- pg_dump -U sbs_user sbs_production > backup.sql

# Copy out
kubectl cp sbs-prod/postgres-0:/backup.sql ./backup-$(date +%Y%m%d).sql
```

### Restore Database

```bash
# Copy backup in
kubectl cp ./backup.sql sbs-prod/postgres-0:/backup.sql

# Restore
kubectl exec -it postgres-0 -n sbs-prod -- psql -U sbs_user sbs_production < /backup.sql
```

## 🔧 Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n sbs-prod

# Check logs
kubectl logs <pod-name> -n sbs-prod --previous

# Common issues:
# - ImagePullBackOff: Image not local (use imagePullPolicy: Never)
# - CrashLoopBackOff: Application error, check logs
# - Pending: Resource constraints or PVC issues
```

### Service Not Accessible

```bash
# Check endpoints
kubectl get endpoints -n sbs-prod

# Test service internally
kubectl run test --rm -it --image=alpine -n sbs-prod -- wget -O- http://normalizer-service:8000/health
```

### Database Issues

```bash
# Check PostgreSQL
kubectl exec -it postgres-0 -n sbs-prod -- psql -U sbs_user -d sbs_production -c "SELECT 1;"

# Check PVC
kubectl get pvc -n sbs-prod
kubectl describe pvc postgres-pvc -n sbs-prod
```

## 🔄 Rolling Updates

```bash
# Update image
kubectl set image deployment/normalizer normalizer=sbs-normalizer:v2 -n sbs-prod

# Check rollout
kubectl rollout status deployment/normalizer -n sbs-prod

# Rollback
kubectl rollout undo deployment/normalizer -n sbs-prod

# History
kubectl rollout history deployment/normalizer -n sbs-prod
```

## 🌐 Access URLs

Once deployed, access at:

- **Main App**: https://brainsait-pi.taile21830.ts.net
- **Normalizer**: https://brainsait-pi.taile21830.ts.net/api/normalizer
- **Signer**: https://brainsait-pi.taile21830.ts.net/api/signer
- **Financial**: https://brainsait-pi.taile21830.ts.net/api/financial
- **NPHIES**: https://brainsait-pi.taile21830.ts.net/api/nphies

## 🧹 Cleanup

```bash
# Delete specific service
kubectl delete -f 04-normalizer.yaml

# Delete everything
kubectl delete namespace sbs-prod

# Or delete all resources
kubectl delete -f .
```

## 📝 Configuration

### ConfigMap Variables

Edit `02-configmap.yaml` to modify:
- Database connection settings
- Service URLs
- Log levels
- Performance tuning
- Feature flags

### Secrets

Edit `01-secrets.yaml` to update:
- Database passwords
- API keys
- JWT secrets
- Encryption keys

## 🎯 Best Practices

1. ✅ Always use secrets for sensitive data
2. ✅ Run dry-run before deploying: `--dry-run`
3. ✅ Monitor resource usage: `kubectl top pods`
4. ✅ Check logs regularly
5. ✅ Backup database regularly
6. ✅ Use rolling updates for zero-downtime
7. ✅ Test in staging before production
8. ✅ Keep images up to date
9. ✅ Enable resource limits
10. ✅ Use health checks

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Traefik Ingress](https://doc.traefik.io/traefik/providers/kubernetes-ingress/)
- [K3s Documentation](https://docs.k3s.io/)
- [PostgreSQL in Kubernetes](https://kubernetes.io/docs/tutorials/stateful-application/postgres/)

## 🆘 Support

For issues:
1. Check pod logs: `kubectl logs -f <pod-name> -n sbs-prod`
2. Check events: `kubectl get events -n sbs-prod`
3. Check resource usage: `kubectl top pods -n sbs-prod`
4. Check ingress: `kubectl describe ingress sbs-ingress -n sbs-prod`

## 📄 License

Proprietary - Brain Sait Technologies
