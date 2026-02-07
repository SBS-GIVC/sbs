#!/bin/bash

#############################################################################
# SBS Kubernetes Deployment Verification Script
# 
# This script validates the Kubernetes deployment of SBS
#############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="sbs-prod"
SUCCESS_COUNT=0
FAIL_COUNT=0

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         SBS Kubernetes Deployment Verification            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

check() {
    local description="$1"
    local command="$2"
    
    echo -n "Checking $description... "
    if eval "$command" &> /dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((SUCCESS_COUNT++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAIL_COUNT++))
        return 1
    fi
}

print_header

# Check cluster connectivity
echo -e "${BLUE}▶ Cluster Connectivity${NC}"
check "kubectl access" "kubectl cluster-info"
check "namespace exists" "kubectl get namespace $NAMESPACE"
echo ""

# Check secrets and configmap
echo -e "${BLUE}▶ Configuration${NC}"
check "secrets exist" "kubectl get secret sbs-secrets -n $NAMESPACE"
check "configmap exists" "kubectl get configmap sbs-config -n $NAMESPACE"
echo ""

# Check storage
echo -e "${BLUE}▶ Storage${NC}"
check "PVC exists" "kubectl get pvc postgres-pvc -n $NAMESPACE"
check "PVC is bound" "kubectl get pvc postgres-pvc -n $NAMESPACE -o jsonpath='{.status.phase}' | grep -q Bound"
echo ""

# Check PostgreSQL
echo -e "${BLUE}▶ Database${NC}"
check "postgres statefulset" "kubectl get statefulset postgres -n $NAMESPACE"
check "postgres service" "kubectl get service postgres-service -n $NAMESPACE"
check "postgres pod running" "kubectl get pod postgres-0 -n $NAMESPACE -o jsonpath='{.status.phase}' | grep -q Running"
echo ""

# Check microservices
echo -e "${BLUE}▶ Microservices${NC}"
for service in normalizer signer financial nphies; do
    check "$service deployment" "kubectl get deployment $service -n $NAMESPACE"
    check "$service service" "kubectl get service ${service}-service -n $NAMESPACE"
    check "$service pods ready" "kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -q -E '[1-9]'"
done
echo ""

# Check frontend
echo -e "${BLUE}▶ Frontend${NC}"
check "frontend deployment" "kubectl get deployment frontend -n $NAMESPACE"
check "frontend service" "kubectl get service frontend-service -n $NAMESPACE"
check "frontend pod running" "kubectl get deployment frontend -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -q -E '[1-9]'"
echo ""

# Check ingress
echo -e "${BLUE}▶ Ingress${NC}"
check "ingress exists" "kubectl get ingress sbs-ingress -n $NAMESPACE"
check "ingress has host" "kubectl get ingress sbs-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}' | grep -q brainsait-pi"
echo ""

# Detailed status
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Detailed Status                         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}Pods:${NC}"
kubectl get pods -n $NAMESPACE -o wide
echo ""

echo -e "${GREEN}Services:${NC}"
kubectl get svc -n $NAMESPACE
echo ""

echo -e "${GREEN}Ingress:${NC}"
kubectl get ingress -n $NAMESPACE
echo ""

echo -e "${GREEN}PVC:${NC}"
kubectl get pvc -n $NAMESPACE
echo ""

# Resource usage (if metrics available)
if kubectl top pods -n $NAMESPACE &> /dev/null; then
    echo -e "${GREEN}Resource Usage:${NC}"
    kubectl top pods -n $NAMESPACE
    echo ""
fi

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                      Summary                              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Successful checks: ${GREEN}$SUCCESS_COUNT${NC}"
echo -e "Failed checks: ${RED}$FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Deployment is healthy.${NC}"
    echo ""
    INGRESS_HOST=$(kubectl get ingress sbs-ingress -n $NAMESPACE -o jsonpath='{.spec.rules[0].host}' 2>/dev/null || echo "N/A")
    echo -e "Access your application at: ${BLUE}https://$INGRESS_HOST${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some checks failed. Please review the deployment.${NC}"
    echo ""
    echo "Troubleshooting commands:"
    echo "  • View logs: kubectl logs -f deployment/normalizer -n $NAMESPACE"
    echo "  • Describe pod: kubectl describe pod <pod-name> -n $NAMESPACE"
    echo "  • Events: kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp'"
    exit 1
fi
