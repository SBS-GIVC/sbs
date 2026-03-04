"""
InterSystems IRIS for Health — Shared FHIR R4 REST Client
Used by all SBS microservices to read/write FHIR resources in IRIS.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration (resolved from environment at import time)
# ---------------------------------------------------------------------------
IRIS_FHIR_BASE_URL: str = os.getenv(
    "IRIS_FHIR_BASE_URL",
    f"http://{os.getenv('IRIS_HOST', 'iris')}:{os.getenv('IRIS_PORT', '52773')}/fhir/r4",
)
IRIS_USERNAME: str = os.getenv("IRIS_USERNAME", "SuperUser")
IRIS_PASSWORD: str = os.getenv("IRIS_PASSWORD", "SYS")
IRIS_TIMEOUT: float = float(os.getenv("IRIS_TIMEOUT_S", "10"))


# ---------------------------------------------------------------------------
# Low-level HTTP helpers
# ---------------------------------------------------------------------------

def _auth() -> httpx.BasicAuth:
    return httpx.BasicAuth(IRIS_USERNAME, IRIS_PASSWORD)


def _headers() -> Dict[str, str]:
    return {
        "Content-Type": "application/fhir+json",
        "Accept": "application/fhir+json",
    }


# ---------------------------------------------------------------------------
# FHIR CRUD operations
# ---------------------------------------------------------------------------

def fhir_get(resource_type: str, resource_id: str) -> Optional[Dict[str, Any]]:
    """Read a FHIR resource by type and ID.  Returns None if not found."""
    url = f"{IRIS_FHIR_BASE_URL}/{resource_type}/{resource_id}"
    try:
        resp = httpx.get(url, auth=_auth(), headers=_headers(), timeout=IRIS_TIMEOUT)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.error("IRIS GET %s/%s failed: %s", resource_type, resource_id, exc)
        raise


def fhir_search(resource_type: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
    """Search FHIR resources. Returns list of matching resource dicts."""
    url = f"{IRIS_FHIR_BASE_URL}/{resource_type}"
    try:
        resp = httpx.get(
            url, params=params, auth=_auth(), headers=_headers(), timeout=IRIS_TIMEOUT
        )
        resp.raise_for_status()
        bundle = resp.json()
        return [e["resource"] for e in bundle.get("entry", [])]
    except httpx.HTTPError as exc:
        logger.error("IRIS SEARCH %s params=%s failed: %s", resource_type, params, exc)
        raise


def fhir_create(resource: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new FHIR resource (POST). Returns the created resource."""
    resource_type = resource.get("resourceType", "")
    url = f"{IRIS_FHIR_BASE_URL}/{resource_type}"
    try:
        resp = httpx.post(
            url, json=resource, auth=_auth(), headers=_headers(), timeout=IRIS_TIMEOUT
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.error("IRIS CREATE %s failed: %s", resource_type, exc)
        raise


def fhir_upsert(resource: Dict[str, Any], conditional_url: str) -> Dict[str, Any]:
    """
    Conditional PUT — create or update based on a search parameter.
    conditional_url example: "Patient?identifier=NID|1234567890"
    """
    resource_type = resource.get("resourceType", "")
    url = f"{IRIS_FHIR_BASE_URL}/{conditional_url}"
    try:
        resp = httpx.put(
            url, json=resource, auth=_auth(), headers=_headers(), timeout=IRIS_TIMEOUT
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.error("IRIS UPSERT %s cond=%s failed: %s", resource_type, conditional_url, exc)
        raise


def fhir_transaction(bundle: Dict[str, Any]) -> Dict[str, Any]:
    """Submit a FHIR transaction Bundle to IRIS."""
    try:
        resp = httpx.post(
            IRIS_FHIR_BASE_URL,
            json=bundle,
            auth=_auth(),
            headers=_headers(),
            timeout=IRIS_TIMEOUT * 3,  # bundles may be slower
        )
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.error("IRIS TRANSACTION failed: %s", exc)
        raise


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

def iris_health() -> Dict[str, Any]:
    """Check IRIS FHIR server reachability via metadata endpoint."""
    url = f"{IRIS_FHIR_BASE_URL}/metadata"
    try:
        resp = httpx.get(
            url, auth=_auth(), headers={"Accept": "application/fhir+json"},
            timeout=IRIS_TIMEOUT,
        )
        return {
            "reachable": resp.status_code == 200,
            "status_code": resp.status_code,
            "fhir_version": resp.json().get("fhirVersion") if resp.status_code == 200 else None,
        }
    except Exception as exc:
        return {"reachable": False, "error": str(exc)}


# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------

def build_patient_resource(
    national_id: str,
    first_name: str,
    last_name: str,
    dob: str,
    gender: str,
    phone: Optional[str] = None,
    email: Optional[str] = None,
) -> Dict[str, Any]:
    """Build a minimal FHIR R4 Patient resource (Saudi NID identifier)."""
    resource: Dict[str, Any] = {
        "resourceType": "Patient",
        "identifier": [
            {
                "system": "http://nphies.sa/identifier/nationalid",
                "value": national_id,
            }
        ],
        "name": [{"family": last_name, "given": [first_name]}],
        "gender": gender,
        "birthDate": dob,
    }
    telecom: List[Dict[str, Any]] = []
    if phone:
        telecom.append({"system": "phone", "value": phone, "use": "mobile"})
    if email:
        telecom.append({"system": "email", "value": email})
    if telecom:
        resource["telecom"] = telecom
    return resource


def sync_patient_to_iris(patient_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Upsert a Patient to IRIS using NID as the conditional identifier.
    Returns the stored resource or None on non-fatal error.
    """
    try:
        resource = build_patient_resource(
            national_id=patient_data["national_id"],
            first_name=patient_data.get("first_name", ""),
            last_name=patient_data.get("last_name", ""),
            dob=patient_data.get("date_of_birth", ""),
            gender=patient_data.get("gender", "unknown"),
            phone=patient_data.get("phone"),
            email=patient_data.get("email"),
        )
        result = fhir_upsert(
            resource,
            f"Patient?identifier=http://nphies.sa/identifier/nationalid|{patient_data['national_id']}",
        )
        logger.info("Synced Patient NID=%s to IRIS (id=%s)", patient_data["national_id"], result.get("id"))
        return result
    except Exception as exc:
        logger.warning("Non-fatal: could not sync Patient to IRIS: %s", exc)
        return None
