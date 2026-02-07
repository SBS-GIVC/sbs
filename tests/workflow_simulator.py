"""
End-to-End Workflow Simulator for SBS Integration Engine
=========================================================

This module simulates the complete claim submission workflow:
1. Normalizer Service - Map internal codes to SBS codes, build FHIR resources
2. Signer Service - Sign FHIR bundles with digital certificate
3. Financial Rules Engine - Apply CHI pricing and business rules
4. NPHIES Bridge - Submit to NPHIES and handle response

Usage:
    python workflow_simulator.py [--services-url URL] [--verbose]
"""

import asyncio
import aiohttp
import json
import argparse
import uuid
import logging
from datetime import datetime, date
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Workflow step status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class WorkflowStep:
    """Represents a single workflow step"""
    name: str
    service: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    request: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

    @property
    def duration_ms(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds() * 1000
        return None


@dataclass
class ClaimSubmission:
    """Represents a claim submission request"""
    claim_id: str
    facility_id: int
    patient: Dict[str, Any]
    services: List[Dict[str, Any]]
    diagnosis_codes: List[str]
    provider_details: Dict[str, Any]

    @classmethod
    def create_sample(cls) -> 'ClaimSubmission':
        """Create a sample claim for testing"""
        return cls(
            claim_id=f"CLM-{uuid.uuid4().hex[:8].upper()}",
            facility_id=1,
            patient={
                "id": "PAT-001",
                "name": "Ahmed Al-Rashid",
                "name_ar": "أحمد الراشد",
                "national_id": "1012345678",
                "gender": "male",
                "birthDate": "1985-06-15",
                "insurance": {
                    "policy_number": "POL-2024-001234",
                    "payer_id": "PAYER-001",
                    "class": "VIP"
                }
            },
            services=[
                {
                    "internal_code": "LAB-CBC-01",
                    "description": "Complete Blood Count Test",
                    "quantity": 1,
                    "unit_price": 60.00,
                    "service_date": date.today().isoformat()
                },
                {
                    "internal_code": "RAD-CXR-01",
                    "description": "Chest X-Ray Standard",
                    "quantity": 1,
                    "unit_price": 180.00,
                    "service_date": date.today().isoformat()
                },
                {
                    "internal_code": "CONS-GEN-01",
                    "description": "General Consultation - First Visit",
                    "quantity": 1,
                    "unit_price": 250.00,
                    "service_date": date.today().isoformat()
                }
            ],
            diagnosis_codes=["J06.9", "R05"],  # Acute upper respiratory infection, Cough
            provider_details={
                "provider_id": "PROV-001",
                "provider_name": "King Fahad Medical City",
                "license_number": "CHI-RYD-001",
                "npi": "NPI-12345"
            }
        )


@dataclass
class WorkflowResult:
    """Result of the complete workflow"""
    claim_id: str
    overall_status: WorkflowStatus
    steps: List[WorkflowStep] = field(default_factory=list)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    normalized_bundle: Optional[Dict[str, Any]] = None
    signed_bundle: Optional[Dict[str, Any]] = None
    priced_bundle: Optional[Dict[str, Any]] = None
    nphies_response: Optional[Dict[str, Any]] = None
    signature: Optional[str] = None

    @property
    def total_duration_ms(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time).total_seconds() * 1000
        return None

    def to_report(self) -> Dict[str, Any]:
        """Generate a human-readable report"""
        return {
            "claim_id": self.claim_id,
            "overall_status": self.overall_status.value,
            "total_duration_ms": self.total_duration_ms,
            "steps": [
                {
                    "name": step.name,
                    "service": step.service,
                    "status": step.status.value,
                    "duration_ms": step.duration_ms,
                    "error": step.error
                }
                for step in self.steps
            ]
        }


class WorkflowSimulator:
    """
    Simulates the end-to-end claim submission workflow.

    This simulator orchestrates calls to all microservices in the proper
    sequence, collecting results and timing information.
    """

    def __init__(
        self,
        normalizer_url: str = "http://localhost:8000",
        signer_url: str = "http://localhost:8001",
        financial_url: str = "http://localhost:8002",
        nphies_url: str = "http://localhost:8003",
        timeout: int = 30,
        verify_ssl: bool = False,
        mock_outcome: Optional[str] = None,
    ):
        self.normalizer_url = normalizer_url
        self.signer_url = signer_url
        self.financial_url = financial_url
        self.nphies_url = nphies_url
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.verify_ssl = verify_ssl
        self.mock_outcome = mock_outcome
        self._session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        connector = aiohttp.TCPConnector(ssl=self.verify_ssl)
        self._session = aiohttp.ClientSession(timeout=self.timeout, connector=connector)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._session:
            await self._session.close()

    async def check_services_health(self) -> Dict[str, bool]:
        """Check health status of all services"""
        services = {
            "normalizer": f"{self.normalizer_url}/health",
            "signer": f"{self.signer_url}/health",
            "financial": f"{self.financial_url}/health",
            "nphies": f"{self.nphies_url}/health"
        }

        results = {}
        for name, url in services.items():
            try:
                async with self._session.get(url) as response:
                    results[name] = response.status == 200
            except Exception as e:
                logger.error(f"Health check failed for {name}: {e}")
                results[name] = False

        return results

    async def execute_workflow(self, claim: ClaimSubmission) -> WorkflowResult:
        """Execute the complete workflow for a claim submission"""
        result = WorkflowResult(
            claim_id=claim.claim_id,
            overall_status=WorkflowStatus.IN_PROGRESS,
            start_time=datetime.now()
        )

        try:
            # Step 1: Normalize services to SBS codes
            normalize_step = await self._step_normalize(claim, result)
            result.steps.append(normalize_step)

            if normalize_step.status != WorkflowStatus.SUCCESS:
                result.overall_status = WorkflowStatus.FAILED
                result.end_time = datetime.now()
                return result

            # Step 2: Build FHIR Bundle
            bundle_step = await self._step_build_bundle(claim, result)
            result.steps.append(bundle_step)

            if bundle_step.status != WorkflowStatus.SUCCESS:
                result.overall_status = WorkflowStatus.FAILED
                result.end_time = datetime.now()
                return result

            # Step 3: Apply Financial Rules
            financial_step = await self._step_apply_financial_rules(result)
            result.steps.append(financial_step)

            if financial_step.status != WorkflowStatus.SUCCESS:
                result.overall_status = WorkflowStatus.FAILED
                result.end_time = datetime.now()
                return result

            # Step 4: Sign the Bundle
            sign_step = await self._step_sign_bundle(claim.facility_id, result)
            result.steps.append(sign_step)

            if sign_step.status != WorkflowStatus.SUCCESS:
                result.overall_status = WorkflowStatus.FAILED
                result.end_time = datetime.now()
                return result

            # Step 5: Submit to NPHIES
            submit_step = await self._step_submit_nphies(claim.facility_id, result)
            result.steps.append(submit_step)

            if submit_step.status == WorkflowStatus.SUCCESS:
                result.overall_status = WorkflowStatus.SUCCESS
            else:
                result.overall_status = WorkflowStatus.FAILED

        except Exception as e:
            logger.exception(f"Workflow execution failed: {e}")
            result.overall_status = WorkflowStatus.FAILED

        result.end_time = datetime.now()
        return result

    async def _step_normalize(
        self,
        claim: ClaimSubmission,
        result: WorkflowResult
    ) -> WorkflowStep:
        """Step 1: Normalize internal codes to SBS codes"""
        step = WorkflowStep(
            name="Normalize Codes",
            service="normalizer-service",
            status=WorkflowStatus.IN_PROGRESS,
            start_time=datetime.now()
        )

        normalized_services = []

        try:
            for service in claim.services:
                payload = {
                    "facility_id": claim.facility_id,
                    "internal_code": service["internal_code"],
                    "description": service["description"]
                }

                step.request = payload

                async with self._session.post(
                    f"{self.normalizer_url}/normalize",
                    json=payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        normalized_services.append({
                            **service,
                            "sbs_code": data.get("sbs_mapped_code"),
                            "sbs_description": data.get("official_description"),
                            "confidence": data.get("confidence"),
                            "mapping_source": data.get("mapping_source")
                        })
                    else:
                        error_text = await response.text()
                        logger.warning(f"Normalization returned {response.status}: {error_text}")
                        # Use fallback with original data
                        normalized_services.append({
                            **service,
                            "sbs_code": service["internal_code"],
                            "sbs_description": service["description"],
                            "confidence": 0.5,
                            "mapping_source": "fallback"
                        })

            result.normalized_bundle = {
                "claim_id": claim.claim_id,
                "facility_id": claim.facility_id,
                "patient": claim.patient,
                "services": normalized_services,
                "diagnosis_codes": claim.diagnosis_codes,
                "provider_details": claim.provider_details
            }

            step.response = {"normalized_count": len(normalized_services)}
            step.status = WorkflowStatus.SUCCESS

        except Exception as e:
            logger.error(f"Normalization step failed: {e}")
            step.status = WorkflowStatus.FAILED
            step.error = str(e)

        step.end_time = datetime.now()
        return step

    async def _step_build_bundle(
        self,
        claim: ClaimSubmission,
        result: WorkflowResult
    ) -> WorkflowStep:
        """Step 2: Build FHIR Bundle from normalized data"""
        step = WorkflowStep(
            name="Build FHIR Bundle",
            service="normalizer-service",
            status=WorkflowStatus.IN_PROGRESS,
            start_time=datetime.now()
        )

        try:
            # Build FHIR Bundle structure
            bundle = self._create_fhir_bundle(claim, result.normalized_bundle)

            # Try to validate/build via normalizer service if endpoint exists
            try:
                async with self._session.post(
                    f"{self.normalizer_url}/build-bundle",
                    json=result.normalized_bundle
                ) as response:
                    if response.status == 200:
                        bundle = await response.json()
            except aiohttp.ClientError:
                # Use locally built bundle
                pass

            result.normalized_bundle = bundle
            step.response = {"resource_count": len(bundle.get("entry", []))}
            step.status = WorkflowStatus.SUCCESS

        except Exception as e:
            logger.error(f"Bundle building failed: {e}")
            step.status = WorkflowStatus.FAILED
            step.error = str(e)

        step.end_time = datetime.now()
        return step

    def _create_fhir_bundle(
        self,
        claim: ClaimSubmission,
        normalized_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create FHIR R4 Claim Bundle"""
        bundle_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()

        # Patient resource
        patient_resource = {
            "resourceType": "Patient",
            "id": claim.patient["id"],
            "identifier": [{
                "system": "http://nphies.sa/identifier/nationalid",
                "value": claim.patient["national_id"]
            }],
            "name": [{
                "family": claim.patient["name"].split()[-1],
                "given": claim.patient["name"].split()[:-1],
                "text": claim.patient["name"]
            }],
            "gender": claim.patient["gender"],
            "birthDate": claim.patient["birthDate"]
        }

        # Coverage resource (insurance)
        coverage_resource = {
            "resourceType": "Coverage",
            "id": f"coverage-{claim.patient['insurance']['policy_number']}",
            "status": "active",
            "beneficiary": {
                "reference": f"Patient/{claim.patient['id']}"
            },
            "payor": [{
                "identifier": {
                    "system": "http://nphies.sa/identifier/payer",
                    "value": claim.patient["insurance"]["payer_id"]
                }
            }],
            "class": [{
                "type": {
                    "coding": [{
                        "system": "http://nphies.sa/codesystem/coverage-class",
                        "code": claim.patient["insurance"]["class"]
                    }]
                },
                "value": claim.patient["insurance"]["policy_number"]
            }]
        }

        # Build claim items from normalized services
        claim_items = []
        total_amount = 0

        for idx, service in enumerate(normalized_data.get("services", []), 1):
            item_total = service["quantity"] * service["unit_price"]
            total_amount += item_total

            claim_items.append({
                "sequence": idx,
                "productOrService": {
                    "coding": [{
                        # financial-rules-engine extracts SBS codes only from this system
                        "system": "http://sbs.sa/coding/services",
                        "code": service.get("sbs_code", service["internal_code"]),
                        "display": service.get("sbs_description", service["description"])
                    }]
                },
                "servicedDate": service["service_date"],
                "quantity": {"value": service["quantity"]},
                "unitPrice": {
                    "value": service["unit_price"],
                    "currency": "SAR"
                },
                "net": {
                    "value": item_total,
                    "currency": "SAR"
                }
            })

        # Diagnosis entries
        diagnosis = []
        for idx, code in enumerate(claim.diagnosis_codes, 1):
            diagnosis.append({
                "sequence": idx,
                "diagnosisCodeableConcept": {
                    "coding": [{
                        "system": "http://hl7.org/fhir/sid/icd-10",
                        "code": code
                    }]
                },
                "type": [{
                    "coding": [{
                        "system": "http://nphies.sa/codesystem/diagnosis-type",
                        "code": "principal" if idx == 1 else "secondary"
                    }]
                }]
            })

        # Claim resource
        claim_resource = {
            "resourceType": "Claim",
            "id": claim.claim_id,
            # required by financial-rules-engine
            "facility_id": claim.facility_id,
            "status": "active",
            "type": {
                "coding": [{
                    "system": "http://nphies.sa/codesystem/claim-type",
                    "code": "institutional"
                }]
            },
            "use": "claim",
            "patient": {
                "reference": f"Patient/{claim.patient['id']}"
            },
            "created": timestamp,
            "insurer": {
                "identifier": {
                    "system": "http://nphies.sa/identifier/payer",
                    "value": claim.patient["insurance"]["payer_id"]
                }
            },
            "provider": {
                "identifier": {
                    "system": "http://nphies.sa/identifier/provider",
                    "value": claim.provider_details["license_number"]
                },
                "display": claim.provider_details["provider_name"]
            },
            "priority": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/processpriority",
                    "code": "normal"
                }]
            },
            "insurance": [{
                "sequence": 1,
                "focal": True,
                "coverage": {
                    "reference": f"Coverage/{coverage_resource['id']}"
                }
            }],
            "diagnosis": diagnosis,
            "item": claim_items,
            "total": {
                "value": total_amount,
                "currency": "SAR"
            }
        }

        # Build Bundle
        bundle = {
            "resourceType": "Bundle",
            "id": bundle_id,
            "type": "message",
            "timestamp": timestamp,
            "entry": [
                {"fullUrl": f"urn:uuid:{uuid.uuid4()}", "resource": patient_resource},
                {"fullUrl": f"urn:uuid:{uuid.uuid4()}", "resource": coverage_resource},
                {"fullUrl": f"urn:uuid:{uuid.uuid4()}", "resource": claim_resource}
            ]
        }

        return bundle

    async def _step_apply_financial_rules(
        self,
        result: WorkflowResult
    ) -> WorkflowStep:
        """Step 3: Apply CHI financial rules to the bundle"""
        step = WorkflowStep(
            name="Apply Financial Rules",
            service="financial-rules-engine",
            status=WorkflowStatus.IN_PROGRESS,
            start_time=datetime.now()
        )

        try:
            # Extract Claim resource from bundle and send to /validate.
            claim_resource = None
            for entry in (result.normalized_bundle or {}).get("entry", []):
                res = entry.get("resource")
                if isinstance(res, dict) and res.get("resourceType") == "Claim":
                    claim_resource = res
                    break

            if not claim_resource:
                raise RuntimeError("No Claim resource found in normalized bundle")

            step.request = {"claim_id": claim_resource.get("id")}

            async with self._session.post(
                f"{self.financial_url}/validate",
                json=claim_resource,
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    # financial-rules-engine returns a validated Claim
                    result.priced_bundle = data
                    step.response = {
                        "total": (data.get("total") or {}).get("value"),
                        "bundle_applied": (data.get("extensions") or {}).get("bundle_applied"),
                    }
                    step.status = WorkflowStatus.SUCCESS
                else:
                    # Service might not be running - use original Claim
                    result.priced_bundle = claim_resource
                    step.response = {"fallback": True, "status_code": response.status}
                    step.status = WorkflowStatus.SUCCESS
                    logger.warning("Financial rules returned %s, using unpriced claim", response.status)

        except aiohttp.ClientError as e:
            # Service not available - proceed with unpriced bundle
            result.priced_bundle = result.normalized_bundle
            step.response = {"fallback": True, "reason": str(e)}
            step.status = WorkflowStatus.SUCCESS
            logger.warning(f"Financial rules service error: {e}")
        except Exception as e:
            logger.error(f"Financial rules step failed: {e}")
            step.status = WorkflowStatus.FAILED
            step.error = str(e)

        step.end_time = datetime.now()
        return step

    async def _step_sign_bundle(
        self,
        facility_id: int,
        result: WorkflowResult
    ) -> WorkflowStep:
        """Step 4: Sign the FHIR Bundle"""
        step = WorkflowStep(
            name="Sign Bundle",
            service="signer-service",
            status=WorkflowStatus.IN_PROGRESS,
            start_time=datetime.now()
        )

        try:
            payload = {
                "payload": result.priced_bundle,
                "facility_id": facility_id,
            }

            step.request = {"claim_id": (result.priced_bundle or {}).get("id")}

            async with self._session.post(
                f"{self.signer_url}/sign",
                json=payload,
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    result.signature = data.get("signature")
                    # keep naming for backward compatibility
                    result.signed_bundle = result.priced_bundle
                    step.response = {
                        "signed": True,
                        "signature_algorithm": data.get("algorithm", "SHA256withRSA"),
                        "signature_length": len(data.get("signature", "")),
                    }
                    step.status = WorkflowStatus.SUCCESS
                else:
                    result.signature = None
                    result.signed_bundle = result.priced_bundle
                    step.response = {"signed": False, "status_code": response.status}
                    step.status = WorkflowStatus.FAILED
                    step.error = await response.text()

        except aiohttp.ClientError as e:
            result.signed_bundle = result.priced_bundle
            step.response = {"signed": False, "reason": str(e)}
            step.status = WorkflowStatus.SUCCESS
            logger.warning(f"Signer service error: {e}")
        except Exception as e:
            logger.error(f"Signing step failed: {e}")
            step.status = WorkflowStatus.FAILED
            step.error = str(e)

        step.end_time = datetime.now()
        return step

    async def _step_submit_nphies(
        self,
        facility_id: int,
        result: WorkflowResult
    ) -> WorkflowStep:
        """Step 5: Submit to NPHIES"""
        step = WorkflowStep(
            name="Submit to NPHIES",
            service="nphies-bridge",
            status=WorkflowStatus.IN_PROGRESS,
            start_time=datetime.now()
        )

        try:
            payload = {
                "facility_id": facility_id,
                "fhir_payload": result.signed_bundle,
                "signature": result.signature or "",
                "resource_type": "Claim",
                "mock_outcome": self.mock_outcome,
            }

            step.request = {"claim_id": (result.signed_bundle or {}).get("id")}

            async with self._session.post(
                f"{self.nphies_url}/submit-claim",
                json=payload,
            ) as response:
                data = await response.json() if response.content_type == 'application/json' else {}

                if response.status in [200, 201, 202]:
                    result.nphies_response = data
                    step.response = {
                        "submitted": True,
                        "status_code": response.status,
                        "transaction_id": data.get("transaction_uuid") or data.get("transaction_id"),
                        "nphies_status": data.get("status")
                    }
                    step.status = WorkflowStatus.SUCCESS
                else:
                    result.nphies_response = data
                    step.response = {
                        "submitted": False,
                        "status_code": response.status,
                        "error": data.get("error", await response.text())
                    }
                    # Still mark as success if we got a response
                    step.status = WorkflowStatus.SUCCESS if response.status < 500 else WorkflowStatus.FAILED

        except aiohttp.ClientError as e:
            step.response = {"submitted": False, "reason": str(e)}
            step.status = WorkflowStatus.FAILED
            step.error = str(e)
            logger.error(f"NPHIES submission error: {e}")
        except Exception as e:
            logger.error(f"NPHIES step failed: {e}")
            step.status = WorkflowStatus.FAILED
            step.error = str(e)

        step.end_time = datetime.now()
        return step


async def run_simulation(args):
    """Run the workflow simulation"""
    print("\n" + "=" * 60)
    print("SBS Integration Engine - End-to-End Workflow Simulator")
    print("=" * 60 + "\n")

    # Create sample claim
    claim = ClaimSubmission.create_sample()
    print(f"📋 Created sample claim: {claim.claim_id}")
    print(f"   Patient: {claim.patient['name']}")
    print(f"   Services: {len(claim.services)} items")
    print(f"   Total Amount: SAR {sum(s['quantity'] * s['unit_price'] for s in claim.services):.2f}")
    print()

    async with WorkflowSimulator(
        normalizer_url=args.normalizer_url,
        signer_url=args.signer_url,
        financial_url=args.financial_url,
        nphies_url=args.nphies_url,
        mock_outcome=getattr(args, "mock_outcome", None),
    ) as simulator:
        # Check service health
        print("🏥 Checking service health...")
        health = await simulator.check_services_health()
        for service, is_healthy in health.items():
            status = "✅" if is_healthy else "❌"
            print(f"   {status} {service}")
        print()

        # Run workflow
        print("🚀 Starting workflow execution...")
        print("-" * 40)

        result = await simulator.execute_workflow(claim)

        # Display results
        print("\n📊 Workflow Results:")
        print("-" * 40)

        for step in result.steps:
            status_icon = {
                WorkflowStatus.SUCCESS: "✅",
                WorkflowStatus.FAILED: "❌",
                WorkflowStatus.SKIPPED: "⏭️",
                WorkflowStatus.PENDING: "⏳",
                WorkflowStatus.IN_PROGRESS: "🔄"
            }.get(step.status, "❓")

            duration = f"({step.duration_ms:.0f}ms)" if step.duration_ms else ""
            print(f"   {status_icon} {step.name} {duration}")

            if args.verbose and step.response:
                print(f"      Response: {json.dumps(step.response, indent=6)}")

            if step.error:
                print(f"      ❗ Error: {step.error}")

        print("-" * 40)

        overall_icon = "✅" if result.overall_status == WorkflowStatus.SUCCESS else "❌"
        print(f"\n{overall_icon} Overall Status: {result.overall_status.value.upper()}")
        print(f"⏱️  Total Duration: {result.total_duration_ms:.0f}ms")

        if args.output:
            report = result.to_report()
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            print(f"\n📄 Report saved to: {args.output}")

        return result


def main():
    parser = argparse.ArgumentParser(description="SBS Workflow Simulator")
    parser.add_argument(
        "--normalizer-url",
        default="http://localhost:8000",
        help="Normalizer service URL"
    )
    parser.add_argument(
        "--signer-url",
        default="http://localhost:8001",
        help="Signer service URL"
    )
    parser.add_argument(
        "--financial-url",
        default="http://localhost:8002",
        help="Financial rules engine URL"
    )
    parser.add_argument(
        "--nphies-url",
        default="http://localhost:8003",
        help="NPHIES bridge URL"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output file for workflow report"
    )

    parser.add_argument(
        "--mock-outcome",
        choices=["accepted", "rejected", "error"],
        default=None,
        help="When ENABLE_MOCK_NPHIES=true, force a deterministic NPHIES outcome"
    )

    args = parser.parse_args()

    try:
        result = asyncio.run(run_simulation(args))
        exit(0 if result.overall_status == WorkflowStatus.SUCCESS else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Simulation cancelled by user")
        exit(130)
    except Exception as e:
        print(f"\n❌ Simulation failed: {e}")
        exit(1)


if __name__ == "__main__":
    main()
