"""Run the workflow simulator against live running services.

This verifies that `tests/workflow_simulator.py` stays aligned with the actual
service contracts (normalize → validate → sign → submit-claim).

Requires:
- Services running on localhost ports (start via scripts/start-local-stack.sh)
- NPHIES bridge in mock mode (ENABLE_MOCK_NPHIES=true)

We execute the simulator as a subprocess to exercise the CLI and keep the test
independent of its internal implementation details.
"""

import subprocess
import sys
import os
from pathlib import Path

import pytest
import requests


def _service_available(url: str) -> bool:
    try:
        return requests.get(url, timeout=1.5).status_code == 200
    except requests.RequestException:
        return False


def test_workflow_simulator_accepted():
    env = os.environ.copy()

    required_health_endpoints = [
        f"{env.get('SBS_NORMALIZER_URL', 'http://localhost:8000')}/health",
        f"{env.get('SBS_FINANCIAL_RULES_URL', 'http://localhost:8002')}/health",
        f"{env.get('SBS_SIGNER_URL', 'http://localhost:8001')}/health",
        f"{env.get('SBS_NPHIES_BRIDGE_URL', 'http://localhost:8003')}/health",
    ]
    unavailable = [url for url in required_health_endpoints if not _service_available(url)]
    if unavailable:
        pytest.skip(f"Skipping live simulator test; required services unavailable: {', '.join(unavailable)}")

    repo_root = Path(__file__).resolve().parents[1]
    simulator_path = repo_root / "tests" / "workflow_simulator.py"
    # Make output deterministic: use mock accepted outcome
    cmd = [
        sys.executable,
        str(simulator_path),
        "--normalizer-url",
        env.get("SBS_NORMALIZER_URL", "http://localhost:8000"),
        "--financial-url",
        env.get("SBS_FINANCIAL_RULES_URL", "http://localhost:8002"),
        "--signer-url",
        env.get("SBS_SIGNER_URL", "http://localhost:8001"),
        "--nphies-url",
        env.get("SBS_NPHIES_BRIDGE_URL", "http://localhost:8003"),
        "--mock-outcome",
        "accepted",
    ]

    proc = subprocess.run(cmd, cwd=str(repo_root), capture_output=True, text=True)
    assert proc.returncode == 0, proc.stdout + "\n" + proc.stderr
