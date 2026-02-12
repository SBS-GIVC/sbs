from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class FHIRClaim(BaseModel):
    resourceType: str = "Claim"
    status: str = "active"
    type: Optional[Dict[str, Any]] = None
    patient: Optional[Dict[str, Any]] = None
    provider: Optional[Dict[str, Any]] = None
    facility_id: int
    item: List[Dict[str, Any]]
    total: Optional[Dict[str, Any]] = None

fhir_claim = {
            "resourceType": "Claim",
            "status": "active",
            "type": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/claim-type",
                    "code": "professional"
                }]
            },
            "patient": {"reference": "Patient/12345"},
            "created": "2026-01-17T10:00:00Z",
            "provider": {"reference": "Organization/provider-1"},
            "insurer": {"reference": "Organization/insurer-1"},
            "item": [{
                "sequence": 1,
                "productOrService": {
                    "coding": [{
                        "system": "http://sbs.chi.gov.sa/CodeSystem",
                        "code": "SBS-LAB-001"
                    }]
                },
                "quantity": {"value": 1},
                "unitPrice": {"value": 100, "currency": "SAR"}
            }],
            "extensions": {
                "facility_id": 1
            }
        }

claim_data = fhir_claim
if "facility_id" not in claim_data:
    extensions = claim_data.get("extensions")
    if isinstance(extensions, dict) and "facility_id" in extensions:
        claim_data = {**claim_data, "facility_id": extensions["facility_id"]}

try:
    claim = FHIRClaim(**claim_data)
    print("✓ Success")
except Exception as e:
    print(f"✗ Failed: {e}")
