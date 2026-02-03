"""End-to-end workflow pipeline scenarios (Landing → services).

This suite is meant to be run with the docker-compose stack up.
It validates the full workflow stages and final statuses using the
NPHIES bridge mock mode (ENABLE_MOCK_NPHIES=true).

Run:
  docker-compose up -d
  python -m pytest tests/test_workflow_pipeline_scenarios.py -v

Notes:
- Signer requires a facility certificate; we generate a sandbox cert via
  signer-service /generate-test-cert.
- Landing supports `mockOutcome` form field which is forwarded to the
  NPHIES bridge when mock mode is enabled.
"""

import time
import os
import io
import pytest
import requests

LANDING = os.getenv("SBS_BASE_URL", "http://localhost:3000")
SIGNER = os.getenv("SBS_SIGNER_URL", "http://localhost:8001")


VALID_UPLOADS = [
    ("none", None),
    (
        "pdf",
        ("claim.pdf", b"%PDF-1.4\n% SBS test pdf\n", "application/pdf"),
    ),
    (
        "json",
        ("claim.json", b"{\"claimData\": \"test\"}", "application/json"),
    ),
    (
        "xml",
        ("claim.xml", b"<?xml version='1.0'?><claim>test</claim>", "application/xml"),
    ),
]


INVALID_UPLOADS = [
    ("txt", ("claim.txt", b"not allowed", "text/plain")),
    ("exe", ("claim.exe", b"MZ...", "application/octet-stream")),
]


def wait_for(url: str, timeout_s: int = 60) -> None:
    deadline = time.time() + timeout_s
    last_err = None
    while time.time() < deadline:
        try:
            r = requests.get(url, timeout=3)
            if r.status_code == 200:
                return
        except Exception as e:  # noqa: BLE001
            last_err = e
        time.sleep(1)
    raise AssertionError(f"Service not ready: {url} ({last_err})")


@pytest.fixture(scope="session", autouse=True)
def ensure_stack_ready():
    # Landing + signer must be reachable for this scenario suite.
    wait_for(f"{LANDING}/health", timeout_s=90)
    wait_for(f"{SIGNER}/health", timeout_s=90)

    # Ensure a signing cert exists for facility 1 (idempotent upsert)
    resp = requests.post(f"{SIGNER}/generate-test-cert", params={"facility_id": 1}, timeout=20)
    assert resp.status_code in (200, 201)


def poll_claim_status(claim_id: str, timeout_s: int = 60):
    deadline = time.time() + timeout_s
    last = None
    while time.time() < deadline:
        r = requests.get(f"{LANDING}/api/claim-status/{claim_id}", timeout=10)
        assert r.status_code == 200
        last = r.json()
        if last.get("isComplete"):
            return last
        time.sleep(2)
    raise AssertionError(f"Claim did not complete within timeout. Last: {last}")


@pytest.mark.parametrize("claim_type", ["professional", "institutional", "pharmacy", "vision"])
@pytest.mark.parametrize("mock_outcome, expected_status", [("accepted", "accepted"), ("rejected", "rejected"), ("error", "error")])
@pytest.mark.parametrize("upload_kind, upload_spec", VALID_UPLOADS)
def test_pipeline_scenarios(claim_type, mock_outcome, expected_status, upload_kind, upload_spec):
    files = None
    if upload_spec is not None:
        filename, content, content_type = upload_spec
        files = {"claimFile": (filename, io.BytesIO(content), content_type)}

    resp = requests.post(
        f"{LANDING}/api/submit-claim",
        data={
            "patientName": f"E2E {claim_type} ({upload_kind})",
            "patientId": "1012345678",
            "claimType": claim_type,
            "userEmail": "e2e@example.com",
            "mockOutcome": mock_outcome,
        },
        files=files,
        timeout=30,
    )

    assert resp.status_code == 200
    payload = resp.json()
    assert payload.get("success") is True
    claim_id = payload.get("claimId")
    assert claim_id and claim_id.startswith("CLM-")

    # Wait for async workflow to finish
    final = poll_claim_status(claim_id, timeout_s=90)
    assert final.get("status") == expected_status

    # Sanity: stages should reflect completion/failure
    stages = final.get("stages") or {}
    assert "normalization" in stages
    assert "financialRules" in stages
    assert "signing" in stages
    assert "nphiesSubmission" in stages


@pytest.mark.parametrize("claim_type", ["professional", "institutional", "pharmacy", "vision"])
@pytest.mark.parametrize("upload_kind, upload_spec", INVALID_UPLOADS)
def test_pipeline_rejects_invalid_upload_types(claim_type, upload_kind, upload_spec):
    filename, content, content_type = upload_spec
    files = {"claimFile": (filename, io.BytesIO(content), content_type)}

    resp = requests.post(
        f"{LANDING}/api/submit-claim",
        data={
            "patientName": f"E2E invalid upload {claim_type} ({upload_kind})",
            "patientId": "1012345678",
            "claimType": claim_type,
            "userEmail": "e2e@example.com",
        },
        files=files,
        timeout=30,
    )

    assert resp.status_code == 400
    body = resp.json()
    assert body.get("success") is False
    assert "Invalid file type" in (body.get("error") or "")
