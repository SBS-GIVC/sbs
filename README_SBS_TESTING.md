# SBS N8N Workflow - Comprehensive Testing & Deployment

## 🎯 Mission Accomplished

Created a comprehensive testing infrastructure for the SBS (Saudi Basic Schedule) N8N workflow with **52 automated test scenarios** covering all possible workflow pipelines and edge cases.

---

## 📦 What's Included

### 1. **Comprehensive Test Suite** (`test_sbs_workflow_comprehensive.py`)
- **52 automated test scenarios**
- Real Saudi insurance providers (NPHIES-compliant)
- Realistic pricing and financial calculations
- Performance metrics and detailed reporting

### 2. **Automated Deployment Script** (`test_and_deploy_sbs.sh`)
- One-command testing and deployment
- Automatic service health checks
- Production readiness assessment
- Detailed reporting

### 3. **Quick Test Tools**
- `quick_test_single_claim.sh` - Single claim validation
- `check_sbs_status.sh` - System status dashboard

### 4. **Complete Documentation**
- `SBS_N8N_TESTING_AND_DEPLOYMENT_GUIDE.md` - Full guide
- `SBS_TESTING_COMPLETE_SUMMARY.md` - Executive summary

---

## 🚀 Quick Start

### Option 1: Automated (Recommended)

```bash
cd /home/hostinger
./test_and_deploy_sbs.sh
```

### Option 2: Manual Steps

```bash
# 1. Check system status
./check_sbs_status.sh

# 2. If services are down, start them
docker-compose -f docker-compose.services.yml up -d
sleep 60

# 3. Run comprehensive tests
python3 test_sbs_workflow_comprehensive.py https://n8n.brainsait.cloud/webhook/sbs-claim-submission

# 4. Review results
cat sbs_test_report_*.json | jq '.'
```

### Option 3: Quick Single Test

```bash
./quick_test_single_claim.sh
```

---

## ✅ Current Status

### Webhook URLs

**Production (Always Active):**
```
https://n8n.brainsait.cloud/webhook/sbs-claim-submission
```

**Test (Manual Trigger):**
```
https://n8n.brainsait.cloud/webhook-test/sbs-claim-submission
```

### Backend Services

| Service | Port | Status |
|---------|------|--------|
| Normalizer Service | 8000 | ✅ Running |
| Signer Service | 8001 | ✅ Running |
| Financial Rules Engine | 8002 | ✅ Running |
| NPHIES Bridge | 8003 | ✅ Running |
| PostgreSQL Database | 5432 | ✅ Running |

---

## 📊 Test Coverage

### 52 Comprehensive Test Scenarios

1. **Basic Scenarios (8 tests)**
   - Simple outpatient visit
   - Chronic disease management
   - Emergency surgery
   - High-cost services
   - Bundle packages
   - Pediatric cases
   - Maternity care
   - Surgical packages

2. **Multi-Facility (5 tests)**
   - Tests across 5 different hospitals
   - Various tier markups and accreditation levels

3. **Stress Testing (20 tests)**
   - Rapid concurrent submissions
   - Performance validation

4. **Edge Cases (3 tests)**
   - High quantities
   - Zero patient responsibility
   - Elderly patients

5. **All Payers (5 tests)**
   - BUPA, MedGulf, Tawuniya, ACIG, SAGIA

6. **Service Categories (6 tests)**
   - Lab, Radiology, Consultation, Surgery, Pharmacy, Bundles

7. **Error Handling (3 tests)**
   - Invalid data, codes, dates

8. **Complex Claims (2 tests)**
   - Multiple services
   - Bundle combinations

---

## 🎯 Production Readiness Checklist

### Prerequisites
- [x] Backend services running
- [x] Webhook URL active
- [x] Test suite created
- [x] Documentation complete

### Testing Requirements
- [ ] Run comprehensive test suite
- [ ] Achieve >= 95% success rate
- [ ] Average response time < 2 seconds
- [ ] All critical scenarios passing

### Deployment Steps
- [ ] Review test results
- [ ] Fix any failures
- [ ] Verify all services healthy
- [ ] Update client applications with production URL
- [ ] Monitor for 24-48 hours

---

## 📈 Expected Results

### Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Test Success Rate | >= 95% | 🔄 Pending |
| Avg Response Time | < 2 sec | 🔄 Pending |
| Services Running | 5/5 | ✅ Pass |
| Webhook Active | Yes | ✅ Pass |

---

## 🛠️ Common Commands

```bash
# Check system status
./check_sbs_status.sh

# Start services
docker-compose -f docker-compose.services.yml up -d

# Stop services
docker-compose -f docker-compose.services.yml down

# View logs
docker-compose -f docker-compose.services.yml logs -f

# Run full test suite
./test_and_deploy_sbs.sh

# Quick single test
./quick_test_single_claim.sh

# View test results
cat sbs_test_report_*.json | jq '.test_run'
```

---

## 📚 Documentation Files

| File | Description |
|------|-------------|
| `README_SBS_TESTING.md` | This file - Quick reference |
| `SBS_N8N_TESTING_AND_DEPLOYMENT_GUIDE.md` | Complete guide |
| `SBS_TESTING_COMPLETE_SUMMARY.md` | Executive summary |
| `test_sbs_workflow_comprehensive.py` | Main test suite |
| `test_and_deploy_sbs.sh` | Automated deployment |
| `quick_test_single_claim.sh` | Quick test |
| `check_sbs_status.sh` | Status dashboard |

---

## 🔍 Troubleshooting

### Issue: HTTP 500 Errors
**Solution:** Check if backend services are running
```bash
./check_sbs_status.sh
docker-compose -f docker-compose.services.yml ps
```

### Issue: Slow Response Times
**Solution:** Check service resources
```bash
docker stats
docker-compose -f docker-compose.services.yml logs --tail=100
```

### Issue: Test Failures
**Solution:** Review detailed report
```bash
cat sbs_test_report_*.json | jq '.results[] | select(.success == false)'
```

---

## 🎉 Next Steps

1. **Run the automated test suite:**
   ```bash
   ./test_and_deploy_sbs.sh
   ```

2. **Review the results** and address any failures

3. **Once tests pass (>= 95% success rate):**
   - Update client applications with production URL
   - Monitor execution logs in n8n
   - Set up alerting and monitoring

4. **Production URL for clients:**
   ```
   https://n8n.brainsait.cloud/webhook/sbs-claim-submission
   ```

---

## 📞 Support

**N8N Dashboard:** https://n8n.brainsait.cloud  
**Production Webhook:** https://n8n.brainsait.cloud/webhook/sbs-claim-submission

**Documentation:**
- Full Guide: `SBS_N8N_TESTING_AND_DEPLOYMENT_GUIDE.md`
- Summary: `SBS_TESTING_COMPLETE_SUMMARY.md`

---

**Created:** February 5, 2026  
**Status:** ✅ Testing infrastructure complete and ready  
**Backend Services:** ✅ All running and healthy  
**Next:** Run comprehensive test suite with `./test_and_deploy_sbs.sh`
