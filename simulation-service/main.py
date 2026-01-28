"""
SBS Claim Workflow Simulation Service
Provides test data generation and mock responses for testing the complete claim workflow
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import random
import uuid
from enum import Enum
import httpx
import os
import asyncio


app = FastAPI(
    title="SBS Simulation Service",
    description="Generate test claims and simulate workflow responses. Can act as an orchestrator calling real services.",
    version="1.1.0"
)

# Service URLs
NORMALIZER_URL = os.getenv("NORMALIZER_URL", "http://localhost:8000")
SIGNER_URL = os.getenv("SIGNER_URL", "http://localhost:8001")
RULES_ENGINE_URL = os.getenv("RULES_ENGINE_URL", "http://localhost:8002")
NPHIES_BRIDGE_URL = os.getenv("NPHIES_BRIDGE_URL", "http://localhost:8003")


# CORS - Restrict to allowed origins from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
)


class ClaimType(str, Enum):
    PROFESSIONAL = "professional"
    INSTITUTIONAL = "institutional"
    PHARMACY = "pharmacy"
    VISION = "vision"


class ScenarioType(str, Enum):
    SUCCESS = "success"
    NORMALIZATION_FAILED = "normalization_failed"
    BUNDLE_APPLIED = "bundle_applied"
    HIGH_VALUE_CLAIM = "high_value_claim"
    MULTI_SERVICE = "multi_service"
    REQUIRES_PREAUTH = "requires_preauth"
    VALIDATION_ERROR = "validation_error"
    NPHIES_REJECTED = "nphies_rejected"


# Sample data for realistic test claims
SAUDI_NAMES = [
    "Ahmed Al-Rashid", "Mohammed Al-Qahtani", "Abdullah Al-Ghamdi",
    "Khalid Al-Otaibi", "Fahad Al-Mutairi", "Sultan Al-Dosari",
    "Nora Al-Harbi", "Sara Al-Zahrani", "Fatima Al-Shehri",
    "Lama Al-Maliki", "Reem Al-Mansour", "Huda Al-Khalifa"
]

PAYER_IDS = [
    "PAYER-NCCI-001",  # NCCI (National Company for Cooperative Insurance)
    "PAYER-BUPA-001",  # Bupa Arabia
    "PAYER-TAWUNIYA-001",  # Tawuniya
    "PAYER-MEDGULF-001",  # MedGulf
    "PAYER-ALRAJHI-001",  # Al Rajhi Takaful
]

PROVIDER_IDS = [
    "PROV-KFMC-001",  # King Fahad Medical City
    "PROV-KFH-001",   # King Faisal Hospital
    "PROV-ALNOOR-001",  # Al Noor Clinic
    "PROV-DALLAH-001",  # Dallah Hospital
]

# Comprehensive service catalog with SBS codes
SERVICE_CATALOG = {
    "professional": [
        {
            "internal_code": "CONS-GEN-001",
            "sbs_code": "SBS-CONS-001",
            "description_en": "General Medical Consultation",
            "description_ar": "استشارة طبية عامة",
            "standard_price": 200.00,
            "category": "Consultation"
        },
        {
            "internal_code": "CONS-SPEC-001",
            "sbs_code": "SBS-CONS-002",
            "description_en": "Specialist Consultation",
            "description_ar": "استشارة تخصصية",
            "standard_price": 350.00,
            "category": "Consultation"
        },
        {
            "internal_code": "LAB-CBC-001",
            "sbs_code": "SBS-LAB-001",
            "description_en": "Complete Blood Count (CBC)",
            "description_ar": "تحليل صورة دم كاملة",
            "standard_price": 50.00,
            "category": "Laboratory"
        },
        {
            "internal_code": "LAB-LIPID-001",
            "sbs_code": "SBS-LAB-002",
            "description_en": "Lipid Profile",
            "description_ar": "تحليل دهون",
            "standard_price": 80.00,
            "category": "Laboratory"
        },
        {
            "internal_code": "RAD-CXR-001",
            "sbs_code": "SBS-RAD-001",
            "description_en": "Chest X-Ray",
            "description_ar": "أشعة سينية للصدر",
            "standard_price": 150.00,
            "category": "Radiology"
        },
    ],
    "institutional": [
        {
            "internal_code": "SURG-APPEND-001",
            "sbs_code": "SBS-SURG-001",
            "description_en": "Appendectomy",
            "description_ar": "استئصال الزائدة الدودية",
            "standard_price": 5000.00,
            "category": "Surgery",
            "requires_preauth": True
        },
        {
            "internal_code": "ADMIT-GEN-001",
            "sbs_code": "SBS-ADMIT-001",
            "description_en": "General Ward Admission (per day)",
            "description_ar": "إقامة في جناح عام (يوميا)",
            "standard_price": 800.00,
            "category": "Accommodation"
        },
        {
            "internal_code": "ICU-DAY-001",
            "sbs_code": "SBS-ICU-001",
            "description_en": "ICU Admission (per day)",
            "description_ar": "إقامة في العناية المركزة (يوميا)",
            "standard_price": 2500.00,
            "category": "Accommodation"
        },
    ],
    "pharmacy": [
        {
            "internal_code": "DRUG-ANTIBIOTIC-001",
            "sbs_code": "SBS-DRUG-001",
            "description_en": "Amoxicillin 500mg (10 tablets)",
            "description_ar": "أموكسيسيلين 500 ملغ (10 حبة)",
            "standard_price": 45.00,
            "category": "Antibiotics"
        },
        {
            "internal_code": "DRUG-PAIN-001",
            "sbs_code": "SBS-DRUG-002",
            "description_en": "Paracetamol 500mg (20 tablets)",
            "description_ar": "باراسيتامول 500 ملغ (20 حبة)",
            "standard_price": 15.00,
            "category": "Analgesics"
        },
    ],
    "vision": [
        {
            "internal_code": "EYE-EXAM-001",
            "sbs_code": "SBS-EYE-001",
            "description_en": "Comprehensive Eye Examination",
            "description_ar": "فحص عيون شامل",
            "standard_price": 120.00,
            "category": "Examination"
        },
        {
            "internal_code": "GLASSES-001",
            "sbs_code": "SBS-GLASSES-001",
            "description_en": "Prescription Glasses (Single Vision)",
            "description_ar": "نظارات طبية (عدسة واحدة)",
            "standard_price": 450.00,
            "category": "Optical"
        },
    ]
}

# Service bundles
BUNDLES = [
    {
        "bundle_code": "BUNDLE-CHECKUP-001",
        "bundle_name": "Basic Health Checkup Package",
        "services": ["SBS-CONS-001", "SBS-LAB-001", "SBS-LAB-002"],
        "total_price": 280.00,  # Discounted from 330
        "savings": 50.00
    },
    {
        "bundle_code": "BUNDLE-APPEND-001",
        "bundle_name": "Appendectomy Package",
        "services": ["SBS-SURG-001", "SBS-ADMIT-001", "SBS-LAB-001"],
        "total_price": 5500.00,  # Discounted from 5850
        "savings": 350.00
    },
]

# Diagnosis codes for realistic claims
DIAGNOSIS_CODES = [
    {"code": "J06.9", "display": "Acute upper respiratory infection, unspecified"},
    {"code": "K35.80", "display": "Acute appendicitis, unspecified"},
    {"code": "E11.9", "display": "Type 2 diabetes mellitus without complications"},
    {"code": "I10", "display": "Essential (primary) hypertension"},
    {"code": "H52.1", "display": "Myopia"},
]


class TestClaimRequest(BaseModel):
    claim_type: Optional[ClaimType] = ClaimType.PROFESSIONAL
    scenario: Optional[ScenarioType] = ScenarioType.SUCCESS
    num_services: Optional[int] = Field(default=1, ge=1, le=10)
    include_file: Optional[bool] = False


class TestClaimResponse(BaseModel):
    claim_data: Dict[str, Any]
    expected_outcome: Dict[str, Any]
    test_instructions: List[str]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "simulation-service",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/generate-test-claim", response_model=TestClaimResponse)
async def generate_test_claim(request: TestClaimRequest):
    """
    Generate a realistic test claim based on specified parameters
    """
    claim_type = request.claim_type.value
    scenario = request.scenario

    # Select random patient
    patient_name = random.choice(SAUDI_NAMES)
    patient_id_suffix = str(uuid.uuid4().int % 10**9).zfill(9)
    patient_id = f"1{patient_id_suffix}"  # Saudi ID format

    # Select services based on claim type and scenario
    available_services = SERVICE_CATALOG.get(claim_type, [])
    if not available_services:
        raise HTTPException(status_code=400, detail=f"No services available for claim type: {claim_type}")

    # Determine services based on scenario
    if scenario == ScenarioType.MULTI_SERVICE:
        num_services = min(request.num_services, len(available_services))
        selected_services = random.sample(available_services, num_services)
    elif scenario == ScenarioType.BUNDLE_APPLIED:
        # Select bundle services
        bundle = random.choice(BUNDLES)
        selected_services = [s for s in available_services if s["sbs_code"] in bundle["services"]]
        if not selected_services:
            selected_services = random.sample(available_services, min(3, len(available_services)))
    elif scenario == ScenarioType.HIGH_VALUE_CLAIM:
        # Select high-value services
        selected_services = sorted(available_services, key=lambda x: x["standard_price"], reverse=True)[:request.num_services]
    elif scenario == ScenarioType.REQUIRES_PREAUTH:
        # Select services requiring pre-authorization
        preauth_services = [s for s in available_services if s.get("requires_preauth", False)]
        if preauth_services:
            selected_services = preauth_services[:1]
        else:
            selected_services = [available_services[0]]
    else:
        selected_services = random.sample(available_services, min(request.num_services, len(available_services)))

    # Build claim data
    claim_data = {
        "patientName": patient_name,
        "patientId": patient_id,
        "memberId": f"MEM-{patient_id[-6:]}",
        "payerId": random.choice(PAYER_IDS),
        "providerId": random.choice(PROVIDER_IDS),
        "claimType": claim_type,
        "userEmail": f"test.user.{random.randint(1000, 9999)}@example.com",
        "services": selected_services,
        "diagnosis": random.choice(DIAGNOSIS_CODES),
        "serviceDate": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
    }

    # Calculate expected outcome
    total_price = sum(s["standard_price"] for s in selected_services)
    facility_tier = random.randint(1, 8)
    markup_pct = facility_tier * 10  # Simplified markup calculation
    final_price = total_price * (1 + markup_pct / 100)

    # Determine bundle application
    bundle_info = None
    if scenario == ScenarioType.BUNDLE_APPLIED:
        for bundle in BUNDLES:
            service_codes = [s["sbs_code"] for s in selected_services]
            if all(code in service_codes for code in bundle["services"][:len(service_codes)]):
                bundle_info = bundle
                final_price = bundle["total_price"] * (1 + markup_pct / 100)
                break

    expected_outcome = {
        "workflow_stage": "completed" if scenario != ScenarioType.NORMALIZATION_FAILED else "normalization_failed",
        "normalization": {
            "status": "success" if scenario != ScenarioType.NORMALIZATION_FAILED else "failed",
            "mapped_codes": [{"internal": s["internal_code"], "sbs": s["sbs_code"]} for s in selected_services]
        },
        "bundling": {
            "bundle_applied": bundle_info is not None,
            "bundle_info": bundle_info
        },
        "financial_rules": {
            "base_price": round(total_price, 2),
            "facility_tier": facility_tier,
            "markup_pct": markup_pct,
            "final_price": round(final_price, 2)
        },
        "nphies_submission": {
            "status": "accepted" if scenario not in [ScenarioType.NPHIES_REJECTED, ScenarioType.VALIDATION_ERROR] else "rejected",
            "rejection_reason": "Invalid claim structure" if scenario == ScenarioType.VALIDATION_ERROR else None
        }
    }

    # Generate test instructions
    test_instructions = [
        f"1. Submit this test claim via the /api/submit-claim endpoint",
        f"2. Expected claim type: {claim_type}",
        f"3. Number of services: {len(selected_services)}",
        f"4. Expected workflow outcome: {expected_outcome['workflow_stage']}",
    ]

    if bundle_info:
        test_instructions.append(f"5. Bundle should be applied: {bundle_info['bundle_name']}")
        test_instructions.append(f"6. Expected savings: {bundle_info['savings']} SAR")

    if scenario == ScenarioType.REQUIRES_PREAUTH:
        test_instructions.append("5. This claim requires pre-authorization - expect validation warning")

    if scenario == ScenarioType.NPHIES_REJECTED:
        test_instructions.append("5. NPHIES will reject this claim - test error handling")

    return TestClaimResponse(
        claim_data=claim_data,
        expected_outcome=expected_outcome,
        test_instructions=test_instructions
    )


@app.get("/service-catalog")
async def get_service_catalog():
    """
    Get complete service catalog for all claim types
    """
    return {
        "success": True,
        "catalog": SERVICE_CATALOG,
        "total_services": sum(len(services) for services in SERVICE_CATALOG.values()),
        "claim_types": list(SERVICE_CATALOG.keys())
    }


@app.get("/bundles")
async def get_bundles():
    """
    Get available service bundles
    """
    return {
        "success": True,
        "bundles": BUNDLES,
        "total_bundles": len(BUNDLES)
    }


@app.post("/simulate-workflow/{stage}")
async def simulate_workflow_stage(stage: str, payload: Dict[str, Any], use_real_services: bool = True):
    """
    Simulate a specific workflow stage response
    """
    stage_simulators = {
        "normalization": simulate_normalization,
        "financial_rules": simulate_financial_rules,
        "signing": simulate_signing,
        "nphies_submission": simulate_nphies_submission
    }

    if stage not in stage_simulators:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage. Must be one of: {', '.join(stage_simulators.keys())}"
        )

    return await stage_simulators[stage](payload, use_real_services)


async def simulate_normalization(payload: Dict[str, Any], use_real_services: bool = False) -> Dict[str, Any]:
    """Simulate normalization service response"""
    internal_code = payload.get("internal_code", "UNKNOWN")
    description = payload.get("description", "Unknown Description")
    facility_id = payload.get("facility_id", 1)

    if use_real_services:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{NORMALIZER_URL}/normalize", 
                    json={
                        "facility_id": facility_id,
                        "internal_code": internal_code,
                        "description": description
                    },
                    timeout=5.0
                )
                if response.status_code == 200:
                    return response.json()
                print(f"Normalizer service returned {response.status_code}")
        except Exception as e:
            print(f"Failed to call real normalizer service: {e}")
            # Fallback to simulation

    # Find matching service
    for services in SERVICE_CATALOG.values():
        for service in services:
            if service["internal_code"] == internal_code:
                return {
                    "sbs_mapped_code": service["sbs_code"],
                    "official_description": service["description_en"],
                    "confidence": 1.0,
                    "mapping_source": "manual",
                    "description_en": service["description_en"],
                    "description_ar": service["description_ar"],
                    "request_id": str(uuid.uuid4()),
                    "processing_time_ms": random.uniform(40, 100)
                }

    # Not found - simulate low confidence AI match
    return {
        "sbs_mapped_code": "SBS-UNKNOWN-001",
        "official_description": "Unknown Service Code",
        "confidence": 0.3,
        "mapping_source": "ai",
        "description_en": f"AI suggestion for {internal_code}",
        "description_ar": "رمز غير معروف",
        "request_id": str(uuid.uuid4()),
        "processing_time_ms": random.uniform(150, 300),
        "warning": "Low confidence - manual review recommended"
    }


async def simulate_financial_rules(payload: Dict[str, Any], use_real_services: bool = False) -> Dict[str, Any]:
    """Simulate financial rules engine response"""
    facility_id = payload.get("facility_id", 1)
    
    if use_real_services:
        try:
            # Adapt payload to FHIR Claim for the rules engine
            # Assuming payload is close to a FHIR claim or has parts of it
            # If payload is just items, we wrap it.
            claim_payload = payload
            if "resourceType" not in payload:
                 claim_payload = {
                    "resourceType": "Claim",
                    "status": "active",
                    "facility_id": facility_id,
                    "item": payload.get("item", [])
                 }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{RULES_ENGINE_URL}/validate", 
                    json=claim_payload, 
                    timeout=5.0
                )
                if response.status_code == 200:
                    return response.json()
                print(f"Financial Rules service returned {response.status_code}")
        except Exception as e:
            print(f"Failed to call real financial rules service: {e}")
    items = payload.get("item", [])

    facility_tier = random.randint(1, 8)
    markup_pct = facility_tier * 10

    processed_items = []
    total = 0.0

    for idx, item in enumerate(items):
        base_price = random.uniform(50, 500)
        final_price = base_price * (1 + markup_pct / 100)
        total += final_price

        processed_items.append({
            "sequence": idx + 1,
            "productOrService": item.get("productOrService", {}),
            "unitPrice": {"value": round(base_price, 2), "currency": "SAR"},
            "net": {"value": round(final_price, 2), "currency": "SAR"},
            "extensions": {
                "base_price": round(base_price, 2),
                "markup_applied": markup_pct,
                "facility_tier": facility_tier
            }
        })

    return {
        "resourceType": "Claim",
        "status": "active",
        "item": processed_items,
        "total": {"value": round(total, 2), "currency": "SAR"},
        "extensions": {
            "facility_id": facility_id,
            "facility_tier": facility_tier,
            "markup_percentage": markup_pct,
            "bundle_applied": False
        }
    }


async def simulate_signing(payload: Dict[str, Any], use_real_services: bool = False) -> Dict[str, Any]:
    """Simulate signing service response"""
    if use_real_services:
        try:
            facility_id = payload.get("facility_id", 1)
            # The payload to sign might be the entire payload passed, or a field inside it
            fhir_payload = payload.get("fhir_payload", payload)
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{SIGNER_URL}/sign", 
                    json={
                        "facility_id": facility_id,
                        "payload": fhir_payload
                    },
                    timeout=5.0
                )
                if response.status_code == 200:
                    return response.json()
                print(f"Signer service returned {response.status_code}")
        except Exception as e:
            print(f"Failed to call real signer service: {e}")
    return {
        "signature": f"SIM-SIGNATURE-{uuid.uuid4().hex[:32]}",
        "algorithm": "SHA256withRSA",
        "timestamp": datetime.utcnow().isoformat(),
        "certificate_serial": f"SIM-CERT-{random.randint(100000, 999999)}"
    }


async def simulate_nphies_submission(payload: Dict[str, Any], use_real_services: bool = False) -> Dict[str, Any]:
    """Simulate NPHIES submission response"""
    if use_real_services:
        try:
            facility_id = payload.get("facility_id", 1)
            fhir_payload = payload.get("fhir_payload", {})
            signature = payload.get("signature", "debug-signature")

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{NPHIES_BRIDGE_URL}/submit-claim", 
                    json={
                        "facility_id": facility_id,
                        "fhir_payload": fhir_payload,
                        "signature": signature,
                        "resource_type": "Claim"
                    },
                    timeout=30.0
                )
                if response.status_code == 200:
                    return response.json()
                print(f"NPHIES Bridge returned {response.status_code}: {response.text}")
        except Exception as e:
             print(f"Failed to call real NPHIES bridge: {e}")
    success = random.random() > 0.1  # 90% success rate

    if success:
        return {
            "transaction_id": f"NPHIES-{uuid.uuid4()}",
            "transaction_uuid": str(uuid.uuid4()),
            "status": "submitted_successfully",
            "nphies_response": {
                "outcome": "complete",
                "disposition": "Claim received and accepted for processing",
                "preAuthRef": f"PREAUTH-{random.randint(100000, 999999)}"
            },
            "http_status": 200,
            "message": "Claim submitted successfully to NPHIES"
        }
    else:
        return {
            "transaction_id": "N/A",
            "transaction_uuid": str(uuid.uuid4()),
            "status": "rejected",
            "http_status": 400,
            "message": "Claim rejected by NPHIES: Invalid claim structure",
            "nphies_response": {
                "outcome": "error",
                "disposition": "Claim validation failed",
                "issue": [
                    {
                        "severity": "error",
                        "code": "structure",
                        "details": {"text": "Missing required field: patient.identifier"}
                    }
                ]
            }
        }


@app.get("/scenarios")
async def get_scenarios():
    """
    Get list of available test scenarios
    """
    return {
        "success": True,
        "scenarios": [
            {
                "code": "success",
                "name": "Successful Claim",
                "description": "Complete workflow from upload to NPHIES acceptance"
            },
            {
                "code": "normalization_failed",
                "name": "Normalization Failed",
                "description": "Claim with codes that cannot be normalized"
            },
            {
                "code": "bundle_applied",
                "name": "Bundle Applied",
                "description": "Multiple services that form a bundle with savings"
            },
            {
                "code": "high_value_claim",
                "name": "High Value Claim",
                "description": "Claim with high-value services requiring special approval"
            },
            {
                "code": "multi_service",
                "name": "Multi-Service Claim",
                "description": "Claim with multiple services and procedures"
            },
            {
                "code": "requires_preauth",
                "name": "Requires Pre-Authorization",
                "description": "Service requiring prior authorization"
            },
            {
                "code": "validation_error",
                "name": "Validation Error",
                "description": "Claim with validation issues"
            },
            {
                "code": "nphies_rejected",
                "name": "NPHIES Rejection",
                "description": "Claim rejected by NPHIES platform"
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
