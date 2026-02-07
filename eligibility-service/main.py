"""Eligibility Service (SBS)

A dedicated eligibility microservice intended to be called by the Landing API.

Modes:
- Proxy mode: if ELIGIBILITY_UPSTREAM_URL is set, forward /check requests.
- Local mode: deterministic rules (safe defaults) for dev/offline.

This service is designed to be swapped with a real integration (NPHIES eligibility
or payer-specific endpoints) without changing the Landing UI.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import os
import time

import requests


app = FastAPI(
    title="SBS Eligibility Service",
    version="1.0.0",
    description="Eligibility verification microservice (proxy-capable, safe defaults)",
)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGIN")
allowed_origins = (
    [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
    if allowed_origins_env
    else ["http://localhost:3000", "http://localhost:3001"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials="*" not in allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EligibilityRequest(BaseModel):
    memberId: str = Field(..., min_length=1, max_length=64)
    payerId: Optional[str] = Field(default=None, max_length=64)
    dateOfService: Optional[str] = Field(default=None, max_length=32)
    facilityId: Optional[str] = Field(default=None, max_length=64)
    context: Optional[Dict[str, Any]] = None


class EligibilityResponse(BaseModel):
    success: bool = True
    timestamp: str
    memberId: str
    payerId: Optional[str] = None
    eligible: bool
    plan: str
    benefits: List[str]
    coverage: Dict[str, Any]
    notes: str
    source: str


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "eligibility-service",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "version": "1.0.0",
        "mode": "proxy" if os.getenv("ELIGIBILITY_UPSTREAM_URL") else "local",
    }


@app.post("/check", response_model=EligibilityResponse)
def check(req: EligibilityRequest):
    upstream = (os.getenv("ELIGIBILITY_UPSTREAM_URL") or "").strip()

    if upstream:
        # Support both styles:
        # - service base URL:   https://eligibility.example (we call /check)
        # - full endpoint URL:  https://n8n/webhook/sbs-eligibility-check (call as-is)
        upstream_clean = upstream.rstrip("/")
        if "/webhook/" in upstream_clean or upstream_clean.endswith("/check"):
            url = upstream_clean
        else:
            url = upstream_clean + "/check"
        headers = {"Content-Type": "application/json"}
        api_key = (os.getenv("ELIGIBILITY_UPSTREAM_API_KEY") or "").strip()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        try:
            r = requests.post(url, json=req.model_dump(), headers=headers, timeout=12)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Eligibility upstream error: {e}")

        if not isinstance(data, dict) or "eligible" not in data:
            raise HTTPException(status_code=502, detail="Invalid upstream eligibility response")

        # Normalize into our schema with safe defaults.
        return EligibilityResponse(
            timestamp=str(data.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
            memberId=str(data.get("memberId") or req.memberId),
            payerId=data.get("payerId") or req.payerId,
            eligible=bool(data.get("eligible")),
            plan=str(data.get("plan") or ("GOLD" if data.get("eligible") else "UNKNOWN")),
            benefits=list(data.get("benefits") or []),
            coverage=dict(data.get("coverage") or {}),
            notes=str(data.get("notes") or "Eligibility verified (upstream)"),
            source=str(data.get("source") or "upstream"),
        )

    # Local deterministic behavior (safe, offline)
    eligible = not req.memberId.strip().endswith("0")
    plan = "GOLD" if eligible else "UNKNOWN"
    benefits = ["OP", "IP", "PHARMACY"] if eligible else []
    coverage = {
        "deductibleRemaining": 0 if eligible else None,
        "copay": 0.1 if eligible else None,
        "network": "IN" if eligible else "—",
    }
    notes = (
        "Eligibility verified (local rules)"
        if eligible
        else "Member not eligible (local rule: IDs ending with 0)"
    )

    return EligibilityResponse(
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        memberId=req.memberId,
        payerId=req.payerId,
        eligible=eligible,
        plan=plan,
        benefits=benefits,
        coverage=coverage,
        notes=notes,
        source="local",
    )
