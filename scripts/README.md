# SBS Scripts

This directory contains consolidated scripts for the SBS Integration Engine.

## 📂 Directory Structure

```
scripts/
├── deploy/       # Deployment and provisioning scripts
├── test/         # Testing and validation scripts
└── maintenance/  # Maintenance and monitoring scripts
```

## 🚀 Deploy Scripts

| Script | Description |
|--------|-------------|
| `deploy-production.sh` | Production deployment script |
| `deploy-sbs-landing.sh` | Frontend deployment script |
| `deploy-ai-prediction.sh` | AI prediction service deployment |
| `deploy_vps.py` | VPS deployment automation |
| `quickstart.sh` | Quick start for local development |
| `add-github-secrets.sh` | GitHub secrets configuration |

## 🧪 Test Scripts

| Script | Description |
|--------|-------------|
| `test_full_workflow.sh` | Full workflow test |
| `test_n8n_integration.sh` | n8n integration tests |
| `test-ai-comprehensive.sh` | AI service tests |
| `quick_test_single_claim.sh` | Single claim quick test |
| `test_integration.py` | Integration test wrapper |
| `test-submit-claim.js` | Frontend submission test |

## 🔧 Maintenance Scripts

| Script | Description |
|--------|-------------|
| `check_sbs_status.sh` | Check all service statuses |
| `production-health-check.sh` | Production health checks |
| `security-check.sh` | Security audit script |

## 📝 Notes

- All scripts should be run from the project root directory
- Ensure proper environment variables are set before running
- Check script permissions with `chmod +x script.sh`
