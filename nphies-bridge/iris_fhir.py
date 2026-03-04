"""
IRIS for Health — FHIR bridge for the NPHIES Bridge service.

Converts NPHIES claim payloads into FHIR R4 Claim / ClaimResponse resources
and persists them in InterSystems IRIS for Health.

All functions are non-blocking with respect to the NPHIES submission itself —
IRIS errors are logged as warnings so NPHIES operations are never disrupted.
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

# Add parent path for shared module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.iris_client import fhir_create, fhir_upsert, iris_health, sync_patient_to_iris

logger = logging.getLogger(__name__)

IRIS_ENABLED: bool = os.getenv("IRIS_ENABLED", "true").lower() == "true"

# ---------------------------------------------------------------------------
# FHIR resource builders
# ---------------------------------------------------------------------------

def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_fhir_claim(
    submission_payload: Dict[str, Any],
    transaction_uuid: str,
    provider_nphies_id: str,
    payer_nphies_id: str,
) -> Dict[str, Any]:
    """
    Build a FHIR R4 Claim resource from an NPHIES submission payload.
    The original FHIR bundle may already contain a Claim entry — we extract
    and annotate it, or construct a minimal one from the envelope.
    """
    bundle = submission_payload.get("payload", submission_payload)

    # If the payload IS already a FHIR Bundle with a Claim entry, extract it
    if isinstance(bundle, dict) and bundle.get("resourceType") == "Bundle":
        for entry in bundle.get("entry", []):
            resource = entry.get("resource", {})
            if resource.get("resourceType") == "Claim":
                resource.setdefault("id", transaction_uuid)
                resource.setdefault("meta", {})["source"] = "nphies-bridge"
                return resource

    # Fallback: build minimal Claim from envelope data
    return {
        "resourceType": "Claim",
        "id": transaction_uuid,
        "meta": {"lastUpdated": _now_utc(), "source": "nphies-bridge"},
        "status": "active",
        "type": {
            "coding": [
                {"system": "http://terminology.hl7.org/CodeSystem/claim-type", "code": "professional"}
            ]
        },
        "use": "claim",
        "patient": {"reference": f"Patient/{submission_payload.get('patient_id', 'unknown')}"},
        "created": _now_utc(),
        "insurer": {
            "identifier": {
                "system": "http://nphies.sa/identifier/payer-license",
                "value": payer_nphies_id,
            }
        },
        "provider": {
            "identifier": {
                "system": "http://nphies.sa/identifier/provider-license",
                "value": provider_nphies_id,
            }
        },
        "priority": {"coding": [{"code": "normal"}]},
        "insurance": [
            {
                "sequence": 1,
                "focal": True,
                "coverage": {"reference": f"Coverage/{submission_payload.get('coverage_id', 'unknown')}"},
            }
        ],
    }


def build_fhir_claim_response(
    transaction_uuid: str,
    claim_reference: str,
    nphies_response: Optional[Dict[str, Any]],
    status: str,
    http_status_code: int,
) -> Dict[str, Any]:
    """Build a FHIR R4 ClaimResponse from an NPHIES API response."""
    outcome = "complete" if status == "approved" else (
        "error" if status == "rejected" else "partial"
    )
    resource: Dict[str, Any] = {
        "resourceType": "ClaimResponse",
        "id": f"cr-{transaction_uuid}",
        "meta": {"lastUpdated": _now_utc(), "source": "nphies-bridge"},
        "status": "active",
        "type": {
            "coding": [
                {"system": "http://terminology.hl7.org/CodeSystem/claim-type", "code": "professional"}
            ]
        },
        "use": "claim",
        "created": _now_utc(),
        "request": {"reference": f"Claim/{transaction_uuid}"},
        "outcome": outcome,
    }

    # Embed raw NPHIES response if present
    if nphies_response:
        resource["extension"] = [
            {
                "url": "http://nphies.sa/extension/nphies-response",
                "valueString": str(nphies_response),
            }
        ]
    return resource


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def store_claim_in_iris(
    submission_payload: Dict[str, Any],
    transaction_uuid: str,
    provider_nphies_id: str = "unknown",
    payer_nphies_id: str = "unknown",
) -> Optional[str]:
    """
    Store the submitted claim as a FHIR Claim resource in IRIS.
    Returns the IRIS resource ID or None on failure.
    """
    if not IRIS_ENABLED:
        return None
    try:
        claim = build_fhir_claim(
            submission_payload, transaction_uuid, provider_nphies_id, payer_nphies_id
        )
        result = fhir_upsert(claim, f"Claim?identifier=urn:uuid|{transaction_uuid}")
        iris_id = result.get("id", transaction_uuid)
        logger.info("Stored Claim %s in IRIS (id=%s)", transaction_uuid, iris_id)
        return iris_id
    except Exception as exc:
        logger.warning("Non-fatal: could not store Claim in IRIS: %s", exc)
        return None


def store_claim_response_in_iris(
    transaction_uuid: str,
    nphies_response: Optional[Dict[str, Any]],
    status: str,
    http_status_code: int,
) -> Optional[str]:
    """
    Store the NPHIES response as a FHIR ClaimResponse resource in IRIS.
    Returns the IRIS resource ID or None on failure.
    """
    if not IRIS_ENABLED:
        return None
    try:
        cr = build_fhir_claim_response(
            transaction_uuid,
            f"Claim/{transaction_uuid}",
            nphies_response,
            status,
            http_status_code,
        )
        result = fhir_create(cr)
        iris_id = result.get("id")
        logger.info("Stored ClaimResponse for %s in IRIS (id=%s)", transaction_uuid, iris_id)
        return iris_id
    except Exception as exc:
        logger.warning("Non-fatal: could not store ClaimResponse in IRIS: %s", exc)
        return None


def get_iris_health() -> Dict[str, Any]:
    """Return IRIS connectivity status for health-check endpoints."""
    if not IRIS_ENABLED:
        return {"enabled": False}
    try:
        status = iris_health()
        return {"enabled": True, **status}
    except Exception as exc:
        return {"enabled": True, "reachable": False, "error": str(exc)}
