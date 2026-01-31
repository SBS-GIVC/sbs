"""
AI Prediction Analytics Service
Provides predictive analytics for claims, cost optimization, and fraud detection
Port: 8004
"""

from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from decimal import Decimal
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import time
from datetime import datetime, timedelta
import json
import hashlib
from collections import deque
from threading import Lock
import numpy as np

load_dotenv()

app = FastAPI(
    title="SBS AI Prediction Analytics Service",
    description="AI-powered predictive analytics for healthcare claims, cost optimization, and fraud detection",
    version="1.0.0"
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)

# Rate limiter
class RateLimiter:
    def __init__(self, max_requests: int = 100, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = {}
        self.lock = Lock()

    def is_allowed(self, identifier: str) -> bool:
        with self.lock:
            now = time.time()
            if identifier not in self.requests:
                self.requests[identifier] = deque()
            while self.requests[identifier] and self.requests[identifier][0] < now - self.time_window:
                self.requests[identifier].popleft()
            if len(self.requests[identifier]) < self.max_requests:
                self.requests[identifier].append(now)
                return True
            return False

rate_limiter = RateLimiter(max_requests=100, time_window=60)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    if request.url.path in ["/health", "/"]:
        return await call_next(request)
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        return JSONResponse(
            status_code=429,
            content={"error": "Rate limit exceeded", "retry_after_seconds": 60}
        )
    return await call_next(request)


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sbs_integration"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )


class ClaimPredictionRequest(BaseModel):
    facility_id: int = Field(..., description="Facility identifier")
    patient_age: Optional[int] = Field(None, description="Patient age")
    patient_gender: Optional[str] = Field(None, description="Patient gender (M/F)")
    diagnosis_codes: List[str] = Field(..., description="ICD-10 diagnosis codes")
    procedure_codes: List[str] = Field(..., description="SBS procedure codes")
    service_date: Optional[str] = Field(None, description="Service date (YYYY-MM-DD)")
    total_amount: Optional[float] = Field(None, description="Claim total amount")


class CostOptimizationRequest(BaseModel):
    facility_id: int = Field(..., description="Facility identifier")
    claim_items: List[Dict[str, Any]] = Field(..., description="Claim items with codes and quantities")
    patient_info: Optional[Dict[str, Any]] = Field(None, description="Patient information")


class FraudDetectionRequest(BaseModel):
    facility_id: int = Field(..., description="Facility identifier")
    claim_data: Dict[str, Any] = Field(..., description="Complete claim data")
    historical_claims: Optional[List[Dict[str, Any]]] = Field(None, description="Recent claims from same facility")


class ComplianceCheckRequest(BaseModel):
    facility_id: int = Field(..., description="Facility identifier")
    claim_data: Dict[str, Any] = Field(..., description="Claim data to validate")


class PredictionResponse(BaseModel):
    prediction_type: str
    confidence: float
    risk_score: float
    recommendations: List[str]
    insights: Dict[str, Any]


class OptimizationResponse(BaseModel):
    total_savings: float
    savings_percentage: float
    optimized_items: List[Dict[str, Any]]
    recommendations: List[str]


class FraudResponse(BaseModel):
    is_fraudulent: bool
    fraud_score: float
    risk_factors: List[str]
    recommendations: List[str]


class ComplianceResponse(BaseModel):
    is_compliant: bool
    violations: List[str]
    warnings: List[str]
    suggestions: List[str]


def get_facility_tier(facility_id: int) -> Optional[Dict]:
    """Get facility accreditation tier"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        query = """
        SELECT
            f.facility_id,
            f.accreditation_tier,
            ptr.markup_pct,
            ptr.tier_description
        FROM facilities f
        JOIN pricing_tier_rules ptr ON f.accreditation_tier = ptr.tier_level
        WHERE f.facility_id = %s AND f.is_active = TRUE
        """

        cursor.execute(query, (facility_id,))
        result = cursor.fetchone()

        cursor.close()
        conn.close()

        return dict(result) if result else None

    except Exception as e:
        print(f"Error fetching facility tier: {e}")
        return None


def get_sbs_standard_price(sbs_code: str) -> Optional[Decimal]:
    """Get standard price for SBS code"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute(
            "SELECT standard_price FROM sbs_master_catalogue WHERE sbs_id = %s AND is_active = TRUE",
            (sbs_code,)
        )

        result = cursor.fetchone()

        cursor.close()
        conn.close()

        return Decimal(result['standard_price']) if result and result['standard_price'] else None

    except Exception as e:
        print(f"Error fetching SBS price: {e}")
        return None


def get_claim_history(facility_id: int, days: int = 90) -> List[Dict]:
    """Get historical claims for pattern analysis"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cutoff_date = datetime.now() - timedelta(days=days)

        query = """
        SELECT
            transaction_uuid,
            facility_id,
            request_type,
            status,
            http_status_code,
            submission_timestamp,
            response_payload
        FROM nphies_transactions
        WHERE facility_id = %s
          AND submission_timestamp >= %s
          AND status IN ('accepted', 'rejected')
        ORDER BY submission_timestamp DESC
        LIMIT 100
        """

        cursor.execute(query, (facility_id, cutoff_date))
        results = cursor.fetchall()

        cursor.close()
        conn.close()

        return [dict(row) for row in results]

    except Exception as e:
        print(f"Error fetching claim history: {e}")
        return []


def calculate_claim_pattern_score(claim_data: Dict, history: List[Dict]) -> float:
    """Calculate pattern deviation score (0-100, higher = more anomalous)"""
    if not history:
        return 0.0

    # Extract patterns from history
    historical_amounts = []
    historical_codes = []

    for claim in history:
        if claim.get('response_payload'):
            try:
                payload = json.loads(claim['response_payload'])
                if 'total' in payload:
                    historical_amounts.append(payload['total'].get('value', 0))
            except:
                pass

    # Calculate amount anomaly
    claim_amount = claim_data.get('total', {}).get('value', 0)
    if historical_amounts:
        avg_amount = np.mean(historical_amounts)
        std_amount = np.std(historical_amounts) if len(historical_amounts) > 1 else avg_amount * 0.2

        if std_amount > 0:
            z_score = abs(claim_amount - avg_amount) / std_amount
            amount_anomaly = min(z_score * 10, 50)  # Cap at 50
        else:
            amount_anomaly = 0
    else:
        amount_anomaly = 0

    # Check for unusual code patterns
    items = claim_data.get('item', [])
    code_count = len(items)

    # High number of items is suspicious
    item_anomaly = min(code_count * 5, 30)

    # Check for duplicate codes
    codes = []
    for item in items:
        if 'productOrService' in item and 'coding' in item['productOrService']:
            for coding in item['productOrService']['coding']:
                if coding.get('system') == 'http://sbs.sa/coding/services':
                    codes.append(coding['code'])

    unique_codes = len(set(codes))
    if codes and unique_codes < len(codes):
        duplicate_anomaly = min((len(codes) - unique_codes) * 10, 20)
    else:
        duplicate_anomaly = 0

    # Total anomaly score
    total_score = amount_anomaly + item_anomaly + duplicate_anomaly

    return min(total_score, 100)


@app.get("/")
def root():
    return {
        "service": "SBS AI Prediction Analytics Service",
        "version": "1.0.0",
        "status": "active",
        "features": [
            "Claim Prediction Analytics",
            "Cost Optimization",
            "Fraud Detection",
            "Compliance Checking"
        ]
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


@app.post("/predict-claim", response_model=PredictionResponse)
async def predict_claim(request: ClaimPredictionRequest):
    """
    Predict claim approval probability and risk factors
    Uses historical patterns and facility data
    """
    try:
        # Get facility tier
        facility_info = get_facility_tier(request.facility_id)
        if not facility_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Facility {request.facility_id} not found"
            )

        # Get historical claims for pattern analysis
        history = get_claim_history(request.facility_id, days=90)

        # Calculate risk factors
        risk_factors = []
        confidence_factors = []

        # Check for common rejection reasons
        if not request.diagnosis_codes:
            risk_factors.append("Missing diagnosis codes")
            confidence_factors.append(0.3)

        if not request.procedure_codes:
            risk_factors.append("Missing procedure codes")
            confidence_factors.append(0.3)

        # Check facility tier (higher tier = better approval rate)
        tier = facility_info.get('accreditation_tier', 'basic')
        if tier == 'basic':
            risk_factors.append("Basic accreditation tier (lower approval rate)")
            confidence_factors.append(0.4)
        elif tier == 'premium':
            confidence_factors.append(0.9)  # Premium tier has better approval
        else:
            confidence_factors.append(0.7)

        # Check for unusual patterns
        if request.total_amount and request.total_amount > 10000:
            risk_factors.append("High claim amount (>10,000 SAR)")
            confidence_factors.append(0.5)

        # Calculate approval probability
        base_probability = 0.85  # Base approval rate

        # Adjust based on risk factors
        risk_penalty = len(risk_factors) * 0.1
        approval_probability = max(0.1, base_probability - risk_penalty)

        # Adjust based on confidence factors
        confidence_bonus = sum(confidence_factors) / len(confidence_factors) if confidence_factors else 0.5
        approval_probability = min(0.95, approval_probability + (confidence_bonus * 0.1))

        # Generate recommendations
        recommendations = []
        if "Missing diagnosis codes" in risk_factors:
            recommendations.append("Add relevant ICD-10 diagnosis codes to support medical necessity")
        if "Missing procedure codes" in risk_factors:
            recommendations.append("Include specific SBS procedure codes for all services")
        if "High claim amount (>10,000 SAR)" in risk_factors:
            recommendations.append("Consider splitting large claims or adding detailed justification")
        if "Basic accreditation tier" in risk_factors:
            recommendations.append("Consider facility accreditation upgrade for better approval rates")

        if not recommendations:
            recommendations.append("Claim appears well-structured. Proceed with submission.")

        # Calculate risk score (0-100, higher = more risk)
        risk_score = (1 - approval_probability) * 100

        return PredictionResponse(
            prediction_type="claim_approval",
            confidence=approval_probability,
            risk_score=risk_score,
            recommendations=recommendations,
            insights={
                "facility_tier": tier,
                "historical_approval_rate": len([h for h in history if h.get('status') == 'accepted']) / len(history) if history else 0.75,
                "risk_factors_count": len(risk_factors),
                "estimated_processing_time": "24-48 hours" if approval_probability > 0.7 else "48-72 hours"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )


@app.post("/optimize-cost", response_model=OptimizationResponse)
async def optimize_cost(request: CostOptimizationRequest):
    """
    Suggest cost optimization opportunities for claims
    Identifies bundle opportunities and alternative procedures
    """
    try:
        # Get facility tier
        facility_info = get_facility_tier(request.facility_id)
        if not facility_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Facility {request.facility_id} not found"
            )

        markup_pct = float(facility_info.get('markup_pct', 0))

        # Analyze claim items
        optimized_items = []
        total_original = 0
        total_optimized = 0
        recommendations = []

        for item in request.claim_items:
            sbs_code = item.get('sbs_code')
            quantity = item.get('quantity', 1)

            if not sbs_code:
                continue

            # Get standard price
            base_price = get_sbs_standard_price(sbs_code)
            if not base_price:
                continue

            # Calculate original price with markup
            original_price = float(base_price) * (1 + markup_pct / 100)
            total_original += original_price * quantity

            # Check for optimization opportunities
            optimized_price = original_price
            item_recommendations = []

            # Check for bundle opportunities
            if sbs_code.startswith('110'):  # Radiology codes
                # Suggest alternative if applicable
                if sbs_code == '1101001':
                    item_recommendations.append("Consider CT scan (1101002) if clinically appropriate - 15% cost reduction")
                    optimized_price *= 0.85
                elif sbs_code == '1101002':
                    item_recommendations.append("Consider MRI (1101003) for better soft tissue visualization")

            elif sbs_code.startswith('120'):  # Laboratory codes
                # Bundle suggestion
                if sbs_code == '1201001':  # CBC
                    item_recommendations.append("Consider comprehensive metabolic panel bundle (1201005) - 20% savings")
                    optimized_price *= 0.80

            elif sbs_code.startswith('130'):  # Surgery codes
                # Anesthesia bundle suggestion
                if sbs_code == '1301001':  # Minor surgery
                    item_recommendations.append("Consider anesthesia bundle (1301002) - 10% savings")
                    optimized_price *= 0.90

            # Check for quantity optimization
            if quantity > 1:
                item_recommendations.append(f"Review quantity ({quantity}) - may be redundant")

            # Add to optimized items
            optimized_items.append({
                "sbs_code": sbs_code,
                "original_price": round(original_price, 2),
                "optimized_price": round(optimized_price, 2),
                "quantity": quantity,
                "savings_per_unit": round(original_price - optimized_price, 2),
                "recommendations": item_recommendations
            })

            total_optimized += optimized_price * quantity

            if item_recommendations:
                recommendations.extend(item_recommendations)

        # Calculate total savings
        total_savings = total_original - total_optimized
        savings_percentage = (total_savings / total_original * 100) if total_original > 0 else 0

        # Add general recommendations
        if savings_percentage > 10:
            recommendations.append(f"Potential savings of {savings_percentage:.1f}% identified")

        if len(request.claim_items) > 5:
            recommendations.append("Consider claim bundling for additional savings")

        if not recommendations:
            recommendations.append("No immediate optimization opportunities found")

        return OptimizationResponse(
            total_savings=round(total_savings, 2),
            savings_percentage=round(savings_percentage, 1),
            optimized_items=optimized_items,
            recommendations=recommendations
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization error: {str(e)}"
        )


@app.post("/detect-fraud", response_model=FraudResponse)
async def detect_fraud(request: FraudDetectionRequest):
    """
    Detect potential fraud using pattern analysis and anomaly detection
    """
    try:
        # Get historical claims for comparison
        history = get_claim_history(request.facility_id, days=30)

        # Calculate fraud indicators
        fraud_indicators = []
        fraud_score = 0

        # 1. Pattern deviation analysis
        pattern_score = calculate_claim_pattern_score(request.claim_data, history)
        if pattern_score > 50:
            fraud_indicators.append(f"High pattern deviation score: {pattern_score:.1f}")
            fraud_score += pattern_score * 0.3

        # 2. Check for unusual code combinations
        items = request.claim_data.get('item', [])
        codes = []

        for item in items:
            if 'productOrService' in item and 'coding' in item['productOrService']:
                for coding in item['productOrService']['coding']:
                    if coding.get('system') == 'http://sbs.sa/coding/services':
                        codes.append(coding['code'])

        # Check for suspicious combinations
        suspicious_combos = [
            ['1101001', '1101002'],  # Multiple imaging studies
            ['1301001', '1301002'],  # Multiple surgeries
            ['1201001', '1201002'],  # Multiple lab tests
        ]

        for combo in suspicious_combos:
            if all(code in codes for code in combo):
                fraud_indicators.append(f"Suspicious code combination: {', '.join(combo)}")
                fraud_score += 15

        # 3. Check for duplicate codes
        if len(codes) != len(set(codes)):
            fraud_indicators.append("Duplicate procedure codes detected")
            fraud_score += 20

        # 4. Check claim amount
        total_amount = request.claim_data.get('total', {}).get('value', 0)
        if total_amount > 50000:
            fraud_indicators.append(f"Unusually high claim amount: {total_amount} SAR")
            fraud_score += 25

        # 5. Check for rapid sequential claims
        if history:
            recent_claims = [h for h in history if h.get('submission_timestamp')]
            if len(recent_claims) >= 3:
                # Check if claims are too close together
                timestamps = [h['submission_timestamp'] for h in recent_claims[:3]]
                if len(timestamps) >= 2:
                    time_diffs = [(timestamps[i] - timestamps[i+1]).total_seconds()
                                  for i in range(len(timestamps)-1)]
                    if any(diff < 3600 for diff in time_diffs):  # Less than 1 hour
                        fraud_indicators.append("Rapid sequential claims detected")
                        fraud_score += 20

        # 6. Check for unusual patient patterns
        patient_id = request.claim_data.get('patient', {}).get('id')
        if patient_id:
            # Count claims for this patient in last 30 days
            patient_claims = [h for h in history if patient_id in str(h.get('response_payload', ''))]
            if len(patient_claims) > 5:
                fraud_indicators.append(f"High claim frequency for patient: {len(patient_claims)} claims")
                fraud_score += 15

        # Normalize fraud score to 0-100
        fraud_score = min(fraud_score, 100)

        # Determine if fraudulent
        is_fraudulent = fraud_score > 60

        # Generate recommendations
        recommendations = []
        if is_fraudulent:
            recommendations.append("Flag for manual review by fraud investigation team")
            recommendations.append("Request additional documentation from facility")
            recommendations.append("Consider temporary hold on facility submissions")
        elif fraud_score > 30:
            recommendations.append("Enhanced review recommended")
            recommendations.append("Verify claim details with facility")
        else:
            recommendations.append("Claim appears legitimate")

        return FraudResponse(
            is_fraudulent=is_fraudulent,
            fraud_score=fraud_score,
            risk_factors=fraud_indicators,
            recommendations=recommendations
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fraud detection error: {str(e)}"
        )


@app.post("/check-compliance", response_model=ComplianceResponse)
async def check_compliance(request: ComplianceCheckRequest):
    """
    Check claim compliance with CHI and NPHIES regulations
    """
    try:
        violations = []
        warnings = []
        suggestions = []

        # Extract claim data
        items = request.claim_data.get('item', [])
        total = request.claim_data.get('total', {}).get('value', 0)

        # 1. Check for required fields
        if not items:
            violations.append("Claim must contain at least one item")

        # 2. Validate SBS codes
        for idx, item in enumerate(items):
            if 'productOrService' not in item:
                warnings.append(f"Item {idx+1}: Missing productOrService field")
                continue

            coding = item['productOrService'].get('coding', [])
            if not coding:
                warnings.append(f"Item {idx+1}: No coding information")
                continue

            sbs_code = None
            for c in coding:
                if c.get('system') == 'http://sbs.sa/coding/services':
                    sbs_code = c.get('code')
                    break

            if not sbs_code:
                warnings.append(f"Item {idx+1}: No SBS code found")
                continue

            # Check if SBS code exists in master catalogue
            price = get_sbs_standard_price(sbs_code)
            if not price:
                violations.append(f"Item {idx+1}: Invalid SBS code {sbs_code}")

        # 3. Check for required documentation
        if not request.claim_data.get('patient'):
            warnings.append("Patient information missing")

        if not request.claim_data.get('provider'):
            warnings.append("Provider information missing")

        # 4. Check for unusual quantities
        for idx, item in enumerate(items):
            quantity = item.get('quantity', 1)
            if quantity > 10:
                warnings.append(f"Item {idx+1}: Unusually high quantity ({quantity})")
                suggestions.append(f"Review quantity for item {idx+1}")

        # 5. Check total amount合理性
        if total > 100000:
            warnings.append(f"High total amount: {total} SAR")
            suggestions.append("Consider splitting claim or adding detailed justification")

        # 6. Check for missing diagnosis codes
        diagnosis_present = False
        for item in items:
            if 'diagnosisSequence' in item or 'supportingInfo' in item:
                diagnosis_present = True
                break

        if not diagnosis_present:
            warnings.append("No diagnosis codes found - may affect approval")
            suggestions.append("Add ICD-10 diagnosis codes to support medical necessity")

        # 7. Check for prior authorization requirements
        high_cost_codes = ['1301001', '1301002', '1101003']  # Surgery and advanced imaging
        for item in items:
            if 'productOrService' in item:
                coding = item['productOrService'].get('coding', [])
                for c in coding:
                    if c.get('system') == 'http://sbs.sa/coding/services' and c.get('code') in high_cost_codes:
                        warnings.append(f"Item {c.get('code')}: May require prior authorization")
                        suggestions.append(f"Verify prior authorization for {c.get('code')}")

        # Determine compliance status
        is_compliant = len(violations) == 0

        # Generate suggestions
        if not is_compliant:
            suggestions.append("Address all violations before submission")

        if warnings and not violations:
            suggestions.append("Review warnings but claim may proceed")

        if not suggestions:
            suggestions.append("Claim appears compliant with regulations")

        return ComplianceResponse(
            is_compliant=is_compliant,
            violations=violations,
            warnings=warnings,
            suggestions=suggestions
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compliance check error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
