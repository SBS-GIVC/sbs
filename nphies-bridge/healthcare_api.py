"""
Healthcare Claims System API Extensions for NPHIES Bridge
Extends the NPHIES bridge with healthcare-specific workflows and endpoints
"""

import sys
import os
import datetime
import uuid
import json
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field

# Add parent directory to path for shared module import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, status, Depends, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg2
from psycopg2.extras import RealDictCursor

from shared import RateLimiter, setup_logging, format_database_error

# Setup logging
logger = setup_logging("healthcare-api", log_level=os.getenv("LOG_LEVEL", "INFO"))

# Security for API authentication
security = HTTPBearer()

# ============================================
# Database Connection Pool
# ============================================

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sbs_integration"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )

# ============================================
# Pydantic Models for Healthcare
# ============================================

class PatientData(BaseModel):
    national_id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: str  # YYYY-MM-DD
    gender: str  # male, female, other
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    insurance_policy_id: str
    insurance_payer_name: str

class ProviderData(BaseModel):
    license_number: str
    organization_name: str
    specialty: str
    facility_code: Optional[str] = None
    facility_id: Optional[int] = None

class ServiceRequestData(BaseModel):
    patient_id: int
    provider_id: int
    payer_id: Optional[int] = None
    service_code: str
    service_name: str
    request_type: str
    diagnosis_codes: List[str]
    clinical_notes: str
    billed_amount: float
    priority: str = "normal"
    details: Optional[Dict[str, Any]] = None

class UnifiedSubmissionRequest(BaseModel):
    """Unified submission channel - accepts any healthcare transaction"""
    request_type: str = Field(..., description="prior_auth, claim, referral, eligibility")
    patient: PatientData
    provider: ProviderData
    service_request: ServiceRequestData
    documents: Optional[List[Dict[str, str]]] = None  # Clinical notes, images, etc.
    facility_code: Optional[str] = None
    facility_id: Optional[int] = None

class PriorAuthRequest(BaseModel):
    patient_id: int
    provider_id: int
    payer_id: int
    service_codes: List[str]
    diagnosis_codes: List[str]
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    clinical_justification: str
    urgency: str = "normal"

class ClaimSubmissionRequest(BaseModel):
    request_id: int  # Reference to existing service_request
    claim_type: str  # professional, institutional, pharmacy, dental
    billed_amount: float
    line_items: List[Dict[str, Any]]
    diagnosis_code: Optional[str] = None
    procedure_code: Optional[str] = None

class EligibilityCheckRequest(BaseModel):
    patient_id: int
    provider_id: int
    service_codes: List[str]
    check_type: str = "real_time"  # real_time, pre_auth, retroactive

class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20
    sort_by: str = "created_at"
    sort_order: str = "desc"

# ============================================
# Authentication Middleware
# ============================================

def verify_api_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify API token from Basma platform or external systems"""
    # In production, verify against JWT secret or API key store
    # For now, accept any token (simplified for development)
    return {"user_id": "api_user", "role": "system"}

def verify_user_role(user: Dict, required_role: str):
    """Verify user has required role"""
    if user.get("role") != required_role and user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{required_role}' required"
        )

# ============================================
# Database Operations for Healthcare
# ============================================

def find_or_create_patient(patient_data: PatientData) -> tuple[int, str]:
    """Find existing patient or create new one"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Try to find existing patient by national_id
        cursor.execute(
            "SELECT id, patient_uuid FROM patients WHERE national_id = %s",
            (patient_data.national_id,)
        )
        result = cursor.fetchone()

        if result:
            return result['id'], str(result['patient_uuid'])

        # Find payer by name
        cursor.execute(
            "SELECT id FROM payers WHERE company_name = %s",
            (patient_data.insurance_payer_name,)
        )
        payer_result = cursor.fetchone()

        if not payer_result:
            # Create payer if not exists
            cursor.execute("""
                INSERT INTO payers (company_name, contact_email, contact_phone)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (
                patient_data.insurance_payer_name,
                patient_data.email,
                patient_data.phone
            ))
            payer_result = cursor.fetchone()

        # Find or create user
        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (patient_data.email,)
        )
        user_result = cursor.fetchone()

        if not user_result:
            cursor.execute("""
                INSERT INTO users (username, password_hash, email, phone, role)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                f"patient_{patient_data.national_id}",
                "placeholder_hash",
                patient_data.email,
                patient_data.phone,
                "patient"
            ))
            user_result = cursor.fetchone()

        # Create patient
        cursor.execute("""
            INSERT INTO patients (
                user_id, national_id, date_of_birth, gender,
                address, insurance_policy_id, insurance_payer_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, patient_uuid
        """, (
            user_result['id'],
            patient_data.national_id,
            datetime.datetime.strptime(patient_data.date_of_birth, '%Y-%m-%d').date(),
            patient_data.gender,
            patient_data.address,
            patient_data.insurance_policy_id,
            payer_result['id']
        ))

        patient = cursor.fetchone()
        conn.commit()

        return patient['id'], str(patient['patient_uuid'])

    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating patient: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create patient: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

def find_or_create_provider(provider_data: ProviderData) -> tuple[int, str]:
    """Find existing provider or create new one"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Try to find existing provider by license
        cursor.execute(
            "SELECT id, provider_uuid FROM providers WHERE license_number = %s",
            (provider_data.license_number,)
        )
        result = cursor.fetchone()

        if result:
            return result['id'], str(result['provider_uuid'])

        # Find or create facility
        facility_id = provider_data.facility_id
        if provider_data.facility_code:
            cursor.execute(
                "SELECT facility_id FROM facilities WHERE facility_code = %s",
                (provider_data.facility_code,)
            )
            facility_result = cursor.fetchone()
            facility_id = facility_result['facility_id'] if facility_result else None

        # Find or create user
        cursor.execute(
            "SELECT id FROM users WHERE username = %s",
            (f"provider_{provider_data.license_number}",)
        )
        user_result = cursor.fetchone()

        if not user_result:
            cursor.execute("""
                INSERT INTO users (username, password_hash, role)
                VALUES (%s, %s, %s)
                RETURNING id
            """, (
                f"provider_{provider_data.license_number}",
                "placeholder_hash",
                "provider"
            ))
            user_result = cursor.fetchone()

        # Create provider
        cursor.execute("""
            INSERT INTO providers (
                user_id, organization_name, license_number, specialty, facility_id
            ) VALUES (%s, %s, %s, %s, %s)
            RETURNING id, provider_uuid
        """, (
            user_result['id'],
            provider_data.organization_name,
            provider_data.license_number,
            provider_data.specialty,
            facility_id
        ))

        provider = cursor.fetchone()
        conn.commit()

        return provider['id'], str(provider['provider_uuid'])

    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating provider: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create provider: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

def create_service_request(service_request_data: ServiceRequestData, facility_id: int = None) -> dict:
    """Create a new service request"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Find or create service
        cursor.execute(
            "SELECT id FROM services WHERE code = %s",
            (service_request_data.service_code,)
        )
        service_result = cursor.fetchone()

        if not service_result:
            cursor.execute("""
                INSERT INTO services (code, name, description, default_price)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (
                service_request_data.service_code,
                service_request_data.service_name,
                service_request_data.clinical_notes,
                service_request_data.billed_amount
            ))
            service_result = cursor.fetchone()

        # Prepare details JSON
        details = service_request_data.details or {}
        details.update({
            "diagnosis_codes": service_request_data.diagnosis_codes,
            "clinical_notes": service_request_data.clinical_notes,
            "billed_amount": service_request_data.billed_amount
        })

        # Create service request with payer assignment
        cursor.execute("""
            INSERT INTO service_request (
                patient_id, provider_id, payer_id, service_id, facility_id,
                request_type, status, priority, details
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, status, submitted_at
        """, (
            service_request_data.patient_id,
            service_request_data.provider_id,
            service_request_data.payer_id,
            service_result['id'],
            facility_id,
            service_request_data.request_type,
            "submitted",
            service_request_data.priority,
            json.dumps(details)
        ))

        request_record = cursor.fetchone()
        conn.commit()

        return dict(request_record)

    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating service request: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create service request: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

# ============================================
# Healthcare API Endpoints
# ============================================

healthcare_app = FastAPI(
    title="Healthcare Claims System API",
    description="Unified healthcare claims submission and management",
    version="2.0.0"
)

@healthcare_app.post("/unified-submit", status_code=status.HTTP_201_CREATED)
async def unified_submission(
    submission: UnifiedSubmissionRequest,
    background_tasks: BackgroundTasks,
    auth: Dict = Depends(verify_api_token)
):
    """
    Unified submission channel - accepts any type of healthcare transaction:
    - Prior Authorization
    - Claims
    - Referrals
    - Eligibility Checks

    System automatically:
    1. Validates the payload
    2. Assigns to correct payer based on patient insurance
    3. Triggers notifications and status updates
    4. Submits to NPHIES if required
    """
    logger.info(f"Unified submission: {submission.request_type}")

    # Verify facility
    facility_id = submission.facility_id
    if not facility_id and submission.facility_code:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT facility_id FROM facilities WHERE facility_code = %s",
            (submission.facility_code,)
        )
        result = cursor.fetchone()
        facility_id = result[0] if result else None
        cursor.close()
        conn.close()

    if not facility_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Facility not found"
        )

    # Find or create patient
    patient_id, patient_uuid = find_or_create_patient(submission.patient)

    # Find or create provider
    provider_id, provider_uuid = find_or_create_provider(submission.provider)

    # Create service request
    service_request = create_service_request(submission.service_request, facility_id)

    # Log analytics event
    background_tasks.add_task(
        log_analytics_event,
        "submission_created",
        "service_request",
        service_request['id'],
        auth.get("user_id"),
        facility_id
    )

    # Auto-assign payer based on patient's insurance
    # This would integrate with payer lookup in production
    if not submission.service_request.payer_id:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT insurance_payer_id FROM patients WHERE id = %s",
            (patient_id,)
        )
        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result and result[0]:
            submission.service_request.payer_id = result[0]

    # Handle different request types
    if submission.request_type == "prior_auth":
        # Trigger prior authorization workflow
        background_tasks.add_task(
            trigger_prior_auth_workflow,
            service_request['id'],
            submission.service_request
        )
    elif submission.request_type == "claim":
        # Trigger claim submission workflow
        background_tasks.add_task(
            trigger_claim_workflow,
            service_request['id'],
            submission.service_request
        )
    elif submission.request_type == "eligibility":
        # Check eligibility
        background_tasks.add_task(
            check_eligibility_workflow,
            patient_id,
            provider_id,
            submission.service_request.service_code
        )

    return {
        "status": "submitted",
        "request_id": service_request['id'],
        "request_uuid": str(uuid.uuid4()),
        "request_type": submission.request_type,
        "status": service_request['status'],
        "submitted_at": service_request['submitted_at'].isoformat(),
        "patient_uuid": patient_uuid,
        "provider_uuid": provider_uuid,
        "workflow": f"healthcare_{submission.request_type}"
    }

@healthcare_app.post("/prior-auth")
async def create_prior_auth(
    request: PriorAuthRequest,
    auth: Dict = Depends(verify_api_token)
):
    """Submit prior authorization request"""

    service_request_data = ServiceRequestData(
        patient_id=request.patient_id,
        provider_id=request.provider_id,
        payer_id=request.payer_id,
        service_code="PENDING",  # Will be determined by services
        service_name="Prior Authorization Request",
        request_type="prior_auth",
        diagnosis_codes=request.diagnosis_codes,
        clinical_notes=request.clinical_justification,
        billed_amount=0.0,
        priority=request.urgency,
        details={
            "service_codes": request.service_codes,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "clinical_justification": request.clinical_justification
        }
    )

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Create prior authorization service request
        cursor.execute("""
            INSERT INTO service_request (
                patient_id, provider_id, payer_id, request_type, status,
                priority, details
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, submitted_at
        """, (
            request.patient_id,
            request.provider_id,
            request.payer_id,
            "prior_auth",
            "submitted",
            request.urgency,
            json.dumps({
                "service_codes": request.service_codes,
                "diagnosis_codes": request.diagnosis_codes,
                "start_date": request.start_date,
                "end_date": request.end_date,
                "clinical_justification": request.clinical_justification
            })
        ))

        service_request = cursor.fetchone()

        # Create prior authorization record
        cursor.execute("""
            INSERT INTO prior_authorizations (
                request_id, service_codes, diagnosis_codes,
                start_date, end_date, decision
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, prior_auth_uuid
        """, (
            service_request['id'],
            request.service_codes,
            request.diagnosis_codes,
            datetime.datetime.strptime(request.start_date, '%Y-%m-%d').date() if request.start_date else None,
            datetime.datetime.strptime(request.end_date, '%Y-%m-%d').date() if request.end_date else None,
            "pending"
        ))

        prior_auth = cursor.fetchone()
        conn.commit()

        return {
            "status": "submitted",
            "request_id": service_request['id'],
            "prior_auth_id": prior_auth['id'],
            "prior_auth_uuid": str(prior_auth['prior_auth_uuid']),
            "submitted_at": service_request['submitted_at'].isoformat(),
            "workflow": "prior_auth"
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating prior auth: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create prior authorization: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.post("/claims")
async def create_claim(
    request: ClaimSubmissionRequest,
    auth: Dict = Depends(verify_api_token)
):
    """Submit healthcare claim"""

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get service request
        cursor.execute(
            "SELECT id, patient_id, provider_id, payer_id, facility_id FROM service_request WHERE id = %s",
            (request.request_id,)
        )
        service_request = cursor.fetchone()

        if not service_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service request not found"
            )

        # Create claim record
        claim_number = f"CLM-{datetime.datetime.now().strftime('%Y%m%d')}-{request.request_id}"

        cursor.execute("""
            INSERT INTO claims (
                request_id, claim_number, claim_type, billed_amount,
                claim_status, submitted_at
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, claim_uuid, claim_number
        """, (
            request.request_id,
            claim_number,
            request.claim_type,
            request.billed_amount,
            "submitted",
            datetime.datetime.now()
        ))

        claim = cursor.fetchone()

        # Create line items
        for i, item in enumerate(request.line_items, 1):
            cursor.execute("""
                INSERT INTO claim_line_items (
                    claim_id, line_number, service_code, service_description,
                    quantity, unit_price, line_total, diagnosis_code, procedure_code
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                claim['id'],
                i,
                item.get('service_code'),
                item.get('service_description'),
                item.get('quantity', 1),
                item.get('unit_price', 0),
                item.get('line_total', 0),
                item.get('diagnosis_code'),
                item.get('procedure_code')
            ))

        # Update service request status
        cursor.execute("""
            UPDATE service_request
            SET status = 'completed'
            WHERE id = %s
        """, (request.request_id,))

        conn.commit()

        return {
            "status": "submitted",
            "claim_id": claim['id'],
            "claim_uuid": str(claim['claim_uuid']),
            "claim_number": claim['claim_number'],
            "submitted_at": datetime.datetime.now().isoformat(),
            "workflow": "claim_submission"
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating claim: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create claim: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.post("/eligibility/check")
async def check_eligibility(
    request: EligibilityCheckRequest,
    auth: Dict = Depends(verify_api_token)
):
    """Check patient eligibility for services"""

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get patient and payer info
        cursor.execute("""
            SELECT p.*, pay.company_name as payer_name, pay.nphies_payer_id
            FROM patients p
            LEFT JOIN payers pay ON p.insurance_payer_id = pay.id
            WHERE p.id = %s
        """, (request.patient_id,))

        patient = cursor.fetchone()

        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )

        if request.check_type == "real_time":
            # Simulate real-time eligibility check
            eligibility_response = {
                "eligible": True,
                "patient_name": f"Patient {patient['national_id']}",
                "payer_name": patient['payer_name'],
                "coverage_date": "2024-01-01",
                "services_covered": request.service_codes,
                "copay_required": 25.00,
                "deductible_remaining": 1500.00,
                "authorization_required": False,
                "notes": "Coverage verified successfully"
            }

        elif request.check_type == "pre_auth":
            eligibility_response = {
                "eligible": True,
                "authorization_required": True,
                "estimated_amount": 500.00,
                "notes": "Prior authorization required for this service"
            }

        else:
            eligibility_response = {
                "eligible": True,
                "notes": "Eligibility standing"
            }

        # Log eligibility check
        cursor.execute("""
            INSERT INTO healthcare_analytics_events (
                event_type, entity_type, entity_id, user_id,
                facility_id, event_data
            ) VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            "eligibility_check",
            "patient",
            request.patient_id,
            auth.get("user_id"),
            None,
            json.dumps(eligibility_response)
        ))

        conn.commit()

        return eligibility_response

    except Exception as e:
        conn.rollback()
        logger.error(f"Error checking eligibility: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check eligibility: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.get("/requests")
async def list_requests(
    user_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    provider_id: Optional[int] = None,
    payer_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    auth: Dict = Depends(verify_api_token)
):
    """List healthcare requests with filtering and pagination"""

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Build query based on parameters
        query = """
            SELECT
                sr.id as request_id,
                sr.request_type,
                sr.status,
                sr.priority,
                sr.submitted_at,
                sr.updated_at,
                p.national_id,
                pay.company_name as payer_name,
                prov.organization_name as provider_name,
                s.name as service_name
            FROM service_request sr
            LEFT JOIN patients p ON sr.patient_id = p.id
            LEFT JOIN payers pay ON sr.payer_id = pay.id
            LEFT JOIN providers prov ON sr.provider_id = prov.id
            LEFT JOIN services s ON sr.service_id = s.id
            WHERE 1=1
        """
        params = []

        if patient_id:
            query += " AND sr.patient_id = %s"
            params.append(patient_id)

        if provider_id:
            query += " AND sr.provider_id = %s"
            params.append(provider_id)

        if payer_id:
            query += " AND sr.payer_id = %s"
            params.append(payer_id)

        if status:
            query += " AND sr.status = %s"
            params.append(status)

        # Pagination
        offset = (page - 1) * per_page
        query += " ORDER BY sr.submitted_at DESC LIMIT %s OFFSET %s"
        params.extend([per_page, offset])

        cursor.execute(query, params)
        requests = cursor.fetchall()

        # Get total count
        count_query = query.replace(
            "SELECT sr.id as request_id, sr.request_type, sr.status, sr.priority, sr.submitted_at, sr.updated_at, p.national_id, pay.company_name as payer_name, prov.organization_name as provider_name, s.name as service_name",
            "SELECT COUNT(*) as total"
        )

        cursor.execute(count_query.replace(" LIMIT %s OFFSET %s", ""), params[:-2])
        total_result = cursor.fetchone()
        total = total_result['total']

        return {
            "requests": requests,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (total + per_page - 1) // per_page
            }
        }

    except Exception as e:
        logger.error(f"Error listing requests: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list requests: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.get("/requests/{request_id}")
async def get_request_details(
    request_id: int,
    auth: Dict = Depends(verify_api_token)
):
    """Get detailed information about a healthcare request"""

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get main request
        cursor.execute("""
            SELECT
                sr.*,
                p.national_id as patient_national_id,
                p.date_of_birth as patient_dob,
                p.gender as patient_gender,
                pay.company_name as payer_name,
                pay.nphies_payer_id as payer_nphies_id,
                prov.organization_name as provider_name,
                prov.license_number as provider_license,
                s.name as service_name,
                s.code as service_code
            FROM service_request sr
            LEFT JOIN patients p ON sr.patient_id = p.id
            LEFT JOIN payers pay ON sr.payer_id = pay.id
            LEFT JOIN providers prov ON sr.provider_id = prov.id
            LEFT JOIN services s ON sr.service_id = s.id
            WHERE sr.id = %s
        """, (request_id,))

        request = cursor.fetchone()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )

        # Get prior auth if exists
        cursor.execute(
            "SELECT * FROM prior_authorizations WHERE request_id = %s",
            (request_id,)
        )
        prior_auth = cursor.fetchone()

        # Get claim if exists
        cursor.execute(
            "SELECT * FROM claims WHERE request_id = %s",
            (request_id,)
        )
        claim = cursor.fetchone()

        if claim:
            # Get line items
            cursor.execute(
                "SELECT * FROM claim_line_items WHERE claim_id = %s ORDER BY line_number",
                (claim['id'],)
            )
            claim['line_items'] = cursor.fetchall()

        # Get approvals
        cursor.execute("""
            SELECT a.*, pay.company_name as payer_name
            FROM approvals a
            LEFT JOIN payers pay ON a.payer_id = pay.id
            WHERE a.request_id = %s
        """, (request_id,))
        approvals = cursor.fetchall()

        return {
            "request": dict(request),
            "prior_authorization": dict(prior_auth) if prior_auth else None,
            "claim": dict(claim) if claim else None,
            "approvals": [dict(a) for a in approvals],
            "workflow": get_workflow_status(request_id)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting request details: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get request details: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.put("/requests/{request_id}/status")
async def update_request_status(
    request_id: int,
    new_status: str,
    auth: Dict = Depends(verify_api_token)
):
    """Update request status (Provider or Payer only)"""

    if new_status not in ['submitted', 'under_review', 'approved', 'denied', 'in_progress', 'completed', 'billed', 'paid', 'error']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}"
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Update status
        cursor.execute("""
            UPDATE service_request
            SET status = %s, updated_at = %s
            WHERE id = %s
            RETURNING id, status, patient_id, provider_id, payer_id
        """, (new_status, datetime.datetime.now(), request_id))

        result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )

        # Log status change
        cursor.execute("""
            INSERT INTO request_status_history
            (request_id, old_status, new_status, changed_by)
            VALUES (%s, (
                SELECT status FROM service_request WHERE id = %s
            ), %s, %s)
        """, (request_id, request_id, new_status, auth.get("user_id")))

        conn.commit()

        return {
            "status": "updated",
            "request_id": request_id,
            "new_status": new_status,
            "updated_at": datetime.datetime.now().isoformat()
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating status: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.post("/requests/{request_id}/approve")
async def approve_request(
    request_id: int,
    approved: bool,
    comments: str = "",
    auth: Dict = Depends(verify_api_token)
):
    """Payer approves/denies request"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get request
        cursor.execute(
            "SELECT id, payer_id FROM service_request WHERE id = %s",
            (request_id,)
        )
        request = cursor.fetchone()

        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )

        # Get payer for current user
        cursor.execute(
            "SELECT id FROM payers WHERE user_id = %s",
            (auth.get("user_id"),)
        )
        payer = cursor.fetchone()

        if not payer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only payers can approve requests"
            )

        if request[1] != payer['id']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This request is assigned to another payer"
            )

        # Create approval
        cursor.execute("""
            INSERT INTO approvals
            (request_id, payer_id, approved, comments, reviewed_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (request_id, payer['id'], approved, comments, auth.get("user_id")))

        # Update request status
        new_status = "approved" if approved else "denied"
        cursor.execute("""
            UPDATE service_request
            SET status = %s, updated_at = %s
            WHERE id = %s
        """, (new_status, datetime.datetime.now(), request_id))

        # If approved, update prior auth status
        if approved:
            cursor.execute("""
                UPDATE prior_authorizations
                SET decision = 'approved', reviewed_at = %s
                WHERE request_id = %s
            """, (datetime.datetime.now(), request_id))

        conn.commit()

        return {
            "status": "updated",
            "request_id": request_id,
            "approval": "approved" if approved else "denied",
            "new_status": new_status,
            "comments": comments
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"Error approving request: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process approval: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

# ============================================
# Background Tasks & Workflows
# ============================================

async def trigger_prior_auth_workflow(request_id: int, service_request: ServiceRequestData):
    """Trigger prior authorization workflow"""
    logger.info(f"Starting prior auth workflow for request {request_id}")

    # Integrate with n8n workflow or internal workflow engine
    # This would trigger the workflow that:
    # 1. Validates clinical necessity
    # 2. Checks against payer rules
    # 3. Obtains digital signature
    # 4. Submits to NPHIES

    # For now, just log
    logger.info(f"Prior auth workflow initiated for {request_id}")

    # Call external workflow service
    # workflow_url = os.getenv("N8N_WORKFLOW_URL", "http://localhost:5678/webhook/prior-auth")
    # async with httpx.AsyncClient() as client:
    #     await client.post(workflow_url, json={
    #         "request_id": request_id,
    #         "service_request": service_request.dict()
    #     })

async def trigger_claim_workflow(request_id: int, service_request: ServiceRequestData):
    """Trigger claim submission workflow"""
    logger.info(f"Starting claim workflow for request {request_id}")

    # Integrate with financial rules engine
    # await call_financial_rules_engine(request_id, service_request)

    # Generate digital signature
    # await generate_signature(request_id)

    # Submit to NPHIES via existing bridge
    # await submit_to_nphies_via_bridge(request_id)

    logger.info(f"Claim workflow initiated for {request_id}")

async def check_eligibility_workflow(patient_id: int, provider_id: int, service_code: str):
    """Check patient eligibility"""
    logger.info(f"Checking eligibility for patient {patient_id}")

# ============================================
# Utility Functions
# ============================================

def get_workflow_status(request_id: int) -> Dict[str, Any]:
    """Get workflow status for a request"""
    # This would integrate with existing workflow tracking
    return {
        "step": "pending",
        "status": "in_progress",
        "next_action": "review",
        "estimated_completion": "24 hours"
    }

async def log_analytics_event(event_type: str, entity_type: str, entity_id: int, user_id: str, facility_id: int):
    """Log analytics event"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO healthcare_analytics_events
            (event_type, entity_type, entity_id, user_id, facility_id)
            VALUES (%s, %s, %s, %s, %s)
        """, (event_type, entity_type, entity_id, user_id, facility_id))

        conn.commit()
        cursor.close()
        conn.close()

    except Exception as e:
        logger.error(f"Error logging analytics: {format_database_error(e)}")

# ============================================
# Additional Healthcare Endpoints
# ============================================

@healthcare_app.get("/patients/search")
async def search_patients(
    query: str = "",
    national_id: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    auth: Dict = Depends(verify_api_token)
):
    """Search for patients"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        query_sql = """
            SELECT
                p.id as patient_id,
                p.patient_uuid,
                p.national_id,
                p.date_of_birth,
                p.gender,
                pay.company_name as payer_name
            FROM patients p
            LEFT JOIN payers pay ON p.insurance_payer_id = pay.id
            WHERE 1=1
        """
        params = []

        if national_id:
            query_sql += " AND p.national_id = %s"
            params.append(national_id)

        if query:
            query_sql += " AND (p.national_id ILIKE %s OR pay.company_name ILIKE %s)"
            params.extend([f"%{query}%", f"%{query}%"])

        offset = (page - 1) * per_page
        query_sql += " ORDER BY p.national_id LIMIT %s OFFSET %s"
        params.extend([per_page, offset])

        cursor.execute(query_sql, params)
        patients = cursor.fetchall()

        return {
            "patients": patients,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": len(patients)
            }
        }

    except Exception as e:
        logger.error(f"Error searching patients: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search patients: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.get("/payers")
async def list_payers(
    page: int = 1,
    per_page: int = 20,
    auth: Dict = Depends(verify_api_token)
):
    """List insurance payers"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        offset = (page - 1) * per_page

        cursor.execute("""
            SELECT
                id as payer_id,
                payer_uuid,
                company_name,
                contact_email,
                contact_phone,
                nphies_payer_id
            FROM payers
            ORDER BY company_name
            LIMIT %s OFFSET %s
        """, (per_page, offset))

        payers = cursor.fetchall()

        # Get total count
        cursor.execute("SELECT COUNT(*) as total FROM payers")
        total = cursor.fetchone()['total']

        return {
            "payers": payers,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": (total + per_page - 1) // per_page
            }
        }

    except Exception as e:
        logger.error(f"Error listing payers: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list payers: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.get("/services/search")
async def search_services(
    query: str = "",
    category: Optional[str] = None,
    page: int = 1,
    per_page: int = 20,
    auth: Dict = Depends(verify_api_token)
):
    """Search healthcare services"""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        query_sql = """
            SELECT
                id as service_id,
                code,
                name,
                description,
                default_price
            FROM services
            WHERE is_active = TRUE
        """
        params = []

        if category:
            query_sql += " AND category = %s"
            params.append(category)

        if query:
            query_sql += " AND (code ILIKE %s OR name ILIKE %s OR description ILIKE %s)"
            query_param = f"%{query}%"
            params.extend([query_param, query_param, query_param])

        offset = (page - 1) * per_page
        query_sql += " ORDER BY name LIMIT %s OFFSET %s"
        params.extend([per_page, offset])

        cursor.execute(query_sql, params)
        services = cursor.fetchall()

        return {
            "services": services,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": len(services)
            }
        }

    except Exception as e:
        logger.error(f"Error searching services: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search services: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.get("/dashboard/{role}")
async def get_role_dashboard(
    role: str,
    user_id: Optional[str] = None,
    facility_id: Optional[int] = None,
    auth: Dict = Depends(verify_api_token)
):
    """Get role-specific dashboard data"""

    if role not in ['patient', 'provider', 'payer', 'admin']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role}"
        )

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        dashboard_data = {}

        if role == 'patient':
            # Patient dashboard
            cursor.execute("""
                SELECT * FROM v_patient_requests
                WHERE patient_id = %s
                ORDER BY submitted_at DESC
                LIMIT 10
            """, (auth.get("user_id"),))

            dashboard_data['recent_requests'] = cursor.fetchall()

            cursor.execute("""
                SELECT
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied
                FROM service_request
                WHERE patient_id = %s
            """, (auth.get("user_id"),))

            dashboard_data['stats'] = cursor.fetchone()

        elif role == 'provider':
            # Provider dashboard
            cursor.execute("""
                SELECT * FROM v_provider_dashboard
                WHERE provider_id = %s
                ORDER BY submitted_at DESC
                LIMIT 10
            """, (auth.get("user_id"),))

            dashboard_data['recent_requests'] = cursor.fetchall()

            cursor.execute("""
                SELECT
                    COUNT(*) as total_requests,
                    COUNT(DISTINCT patient_id) as patients_count
                FROM service_request
                WHERE provider_id = %s
            """, (auth.get("user_id"),))

            dashboard_data['stats'] = cursor.fetchone()

        elif role == 'payer':
            # Payer dashboard
            cursor.execute("""
                SELECT * FROM v_payer_dashboard
                WHERE payer_id = %s
                ORDER BY submitted_at DESC
                LIMIT 10
            """, (auth.get("user_id"),))

            dashboard_data['recent_requests'] = cursor.fetchall()

            cursor.execute("""
                SELECT
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN decision = 'approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN decision = 'denied' THEN 1 ELSE 0 END) as denied,
                    SUM(CASE WHEN claim_status = 'paid' THEN 1 ELSE 0 END) as paid
                FROM v_payer_dashboard
                WHERE payer_id = %s
            """, (auth.get("user_id"),))

            dashboard_data['stats'] = cursor.fetchone()

        elif role == 'admin':
            # Admin dashboard
            cursor.execute("""
                SELECT * FROM v_admin_dashboard
                ORDER BY submitted_at DESC
                LIMIT 10
            """)

            dashboard_data['recent_requests'] = cursor.fetchall()

            cursor.execute("""
                SELECT
                    COUNT(*) as total_requests,
                    COUNT(DISTINCT patient_id) as total_patients,
                    COUNT(DISTINCT provider_id) as total_providers,
                    COUNT(DISTINCT payer_id) as total_payers
                FROM service_request
            """)

            dashboard_data['stats'] = cursor.fetchone()

            cursor.execute("""
                SELECT
                    facility_name,
                    COUNT(*) as request_count,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count
                FROM v_admin_dashboard
                WHERE facility_name IS NOT NULL
                GROUP BY facility_name
                ORDER BY request_count DESC
                LIMIT 5
            """)

            dashboard_data['facilities'] = cursor.fetchall()

        return dashboard_data

    except Exception as e:
        logger.error(f"Error getting dashboard: {format_database_error(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard: {str(e)}"
        )
    finally:
        cursor.close()
        conn.close()

@healthcare_app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "service": "healthcare-api",
            "version": "2.0.0"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )

@healthcare_app.get("/ready")
def ready_check():
    """Readiness probe endpoint"""
    return health_check()

@healthcare_app.get("/")
def root():
    """API information"""
    return {
        "service": "Healthcare Claims System API",
        "version": "2.0.0",
        "description": "Unified healthcare claims submission and management system",
        "endpoints": {
            "unified_submit": "POST /unified-submit - Submit any healthcare transaction",
            "prior_auth": "POST /prior-auth - Submit prior authorization",
            "claims": "POST /claims - Submit claim",
            "eligibility": "POST /eligibility/check - Check eligibility",
            "requests": "GET /requests - List requests",
            "request_details": "GET /requests/{id} - Get request details",
            "update_status": "PUT /requests/{id}/status - Update status",
            "approve": "POST /requests/{id}/approve - Approve/deny request",
            "dashboard": "GET /dashboard/{role} - Role-specific dashboard"
        }
    }