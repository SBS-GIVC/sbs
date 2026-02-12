"""
HealthcareLinc Agent - Unified Healthcare Workflow Management
Port: 4004

Provides FHIR-compliant healthcare management with unified submission,
role-based access control, and integration with existing SBS infrastructure.
"""

from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from sqlalchemy import create_engine, and_, or_
from sqlalchemy.orm import Session, sessionmaker
from datetime import datetime, date
import uuid
import httpx
import logging
import os
import sys

# Add parent directory for shared imports
sys.path.append(os.path.join(os.path.dirname(__file__), "../../.."))
from shared.middleware.brainsait_oid import BrainSAITOIDMiddleware, get_service_oid

from models import (
    Base, HealthcareUser, HealthcarePatient, HealthcareProvider,
    HealthcarePayer, HealthcareService, HealthcareRequest,
    HealthcareApproval, HealthcareClaim, UserRole, RequestType, RequestStatus
)
from auth import (
    get_current_user, TokenData, LoginRequest, LoginResponse,
    authenticate_user, create_access_token, create_user_response,
    get_password_hash, require_provider, require_payer,
    require_any_authenticated, require_admin
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(
    title="HealthcareLinc Agent",
    description="Unified Healthcare Workflow Management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add BrainSAIT OID middleware
app.add_middleware(
    BrainSAITOIDMiddleware,
    service_name="HealthcareLinc",
    service_oid=get_service_oid("healthcarelinc")
)

# Service URLs
MASTERLINC_URL = os.getenv("MASTERLINC_URL", "http://masterlinc-bridge:4000")
NPHIES_BRIDGE_URL = os.getenv("NPHIES_BRIDGE_URL", "http://nphies-bridge:8003")
AUTHLINC_URL = os.getenv("AUTHLINC_URL", "http://authlinc-agent:4002")
CLAIMLINC_URL = os.getenv("CLAIMLINC_URL", "http://claimlinc-agent:4001")

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# PYDANTIC MODELS FOR API
# ============================================================================

class UnifiedSubmissionRequest(BaseModel):
    """Unified submission for all healthcare transactions"""
    request_type: str = Field(..., description="Type: prior_auth, claim, referral, eligibility")
    patient_id: int = Field(..., description="Patient ID")
    service_code: str = Field(..., description="Service code (CPT, ICD, etc.)")
    service_date: Optional[date] = Field(None, description="Date of service")
    diagnosis_codes: Optional[List[str]] = Field(default=[], description="ICD-10 diagnosis codes")
    clinical_notes: Optional[str] = Field(None, description="Clinical notes")
    estimated_cost: Optional[float] = Field(None, description="Estimated cost")
    priority: Optional[str] = Field("normal", description="Priority: normal, urgent, stat")
    details: Optional[Dict[str, Any]] = Field(default={}, description="Additional details")


class ApprovalRequest(BaseModel):
    """Payer approval/denial request"""
    approved: bool = Field(..., description="Approval decision")
    comments: Optional[str] = Field(None, description="Comments")
    approved_amount: Optional[float] = Field(None, description="Approved amount")
    conditions: Optional[Dict[str, Any]] = Field(default={}, description="Approval conditions")


class StatusUpdateRequest(BaseModel):
    """Update request status"""
    new_status: str = Field(..., description="New status")
    notes: Optional[str] = Field(None, description="Update notes")


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token"""
    user = authenticate_user(db, request.username, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create JWT token
    access_token = create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
            "role": user.role.value
        }
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=create_user_response(user)
    )


@app.get("/auth/me")
async def get_current_user_info(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    user = db.query(HealthcareUser).filter(HealthcareUser.id == current_user.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return create_user_response(user)


# ============================================================================
# UNIFIED SUBMISSION API (Healthcare.md Implementation)
# ============================================================================

@app.post("/api/submit")
async def unified_submit(
    submission: UnifiedSubmissionRequest,
    background_tasks: BackgroundTasks,
    current_user: TokenData = Depends(require_provider),
    db: Session = Depends(get_db)
):
    """
    Unified submission endpoint for all healthcare transactions
    
    This is the heart of the NHIES system - single channel for:
    - Prior authorization requests
    - Claims
    - Referrals
    - Eligibility checks
    
    Automatically routes to appropriate services based on request type.
    """
    try:
        logger.info(f"Unified submission received: type={submission.request_type}, provider={current_user.user_id}")
        
        # Validate request type
        try:
            request_type = RequestType(submission.request_type)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid request_type. Must be one of: {[t.value for t in RequestType]}"
            )
        
        # Get provider profile
        provider = db.query(HealthcareProvider).filter(
            HealthcareProvider.user_id == current_user.user_id
        ).first()
        
        if not provider:
            raise HTTPException(status_code=404, detail="Provider profile not found")
        
        # Get patient
        patient = db.query(HealthcarePatient).filter(
            HealthcarePatient.id == submission.patient_id
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get service
        service = db.query(HealthcareService).filter(
            HealthcareService.code == submission.service_code,
            HealthcareService.is_active == True
        ).first()
        
        if not service:
            raise HTTPException(status_code=404, detail=f"Service code '{submission.service_code}' not found")
        
        # Auto-assign payer from patient's insurance
        payer_id = patient.insurance_payer_id
        
        # Create service request
        request_uuid = str(uuid.uuid4())
        new_request = HealthcareRequest(
            request_uuid=request_uuid,
            request_type=request_type,
            patient_id=patient.id,
            provider_id=provider.id,
            payer_id=payer_id,
            service_id=service.id,
            service_date=submission.service_date or date.today(),
            diagnosis_codes=submission.diagnosis_codes,
            clinical_notes=submission.clinical_notes,
            estimated_cost=submission.estimated_cost or service.default_price,
            priority=submission.priority or "normal",
            status=RequestStatus.SUBMITTED
        )
        
        db.add(new_request)
        db.flush()
        
        # If request type is claim, create claim record
        if request_type == RequestType.CLAIM:
            claim = HealthcareClaim(
                request_id=new_request.id,
                claim_number=f"CLM-{new_request.id:08d}",
                billed_amount=submission.details.get("billed_amount", service.default_price)
            )
            db.add(claim)
        
        db.commit()
        db.refresh(new_request)
        
        # Background processing: Route to appropriate agent
        background_tasks.add_task(
            process_request_workflow,
            request_id=new_request.id,
            request_type=request_type.value,
            request_uuid=request_uuid
        )
        
        logger.info(f"Request created successfully: ID={new_request.id}, UUID={request_uuid}")
        
        return {
            "success": True,
            "message": "Request submitted successfully",
            "request_id": new_request.id,
            "request_uuid": request_uuid,
            "status": new_request.status.value,
            "assigned_payer": payer_id,
            "estimated_cost": new_request.estimated_cost
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unified submission failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")


async def process_request_workflow(request_id: int, request_type: str, request_uuid: str):
    """
    Background task to process request through appropriate workflow
    
    Routes intelligently based on request type:
    - prior_auth → AuthLinc → NPHIES eligibility
    - claim → ClaimLinc → Full pipeline
    - referral → ComplianceLinc → Provider validation
    """
    try:
        logger.info(f"Processing workflow for request {request_uuid}, type={request_type}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            if request_type == "prior_auth":
                # Route to AuthLinc for eligibility check
                response = await client.post(
                    f"{AUTHLINC_URL}/check_eligibility",
                    json={"request_id": request_id, "request_uuid": request_uuid}
                )
                logger.info(f"AuthLinc response: {response.status_code}")
            
            elif request_type == "claim":
                # Route to ClaimLinc for full claim processing
                response = await client.post(
                    f"{CLAIMLINC_URL}/process_claim",
                    json={"request_id": request_id, "request_uuid": request_uuid}
                )
                logger.info(f"ClaimLinc response: {response.status_code}")
            
            elif request_type == "eligibility":
                # Direct eligibility check via NPHIES
                response = await client.post(
                    f"{NPHIES_BRIDGE_URL}/check-eligibility",
                    json={"request_uuid": request_uuid}
                )
                logger.info(f"NPHIES response: {response.status_code}")
    
    except httpx.HTTPError as e:
        logger.error(f"Workflow processing failed for {request_uuid}: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in workflow: {str(e)}")


# ============================================================================
# REQUEST MANAGEMENT
# ============================================================================

@app.get("/api/requests")
async def list_requests(
    status: Optional[str] = None,
    request_type: Optional[str] = None,
    limit: int = 50,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List requests with role-based filtering
    
    - Patients see their own requests
    - Providers see their submitted requests
    - Payers see requests assigned to them
    - Admins see all requests
    """
    query = db.query(HealthcareRequest)
    
    # Role-based filtering
    if current_user.role == UserRole.PATIENT.value:
        patient = db.query(HealthcarePatient).filter(
            HealthcarePatient.user_id == current_user.user_id
        ).first()
        if patient:
            query = query.filter(HealthcareRequest.patient_id == patient.id)
    
    elif current_user.role == UserRole.PROVIDER.value:
        provider = db.query(HealthcareProvider).filter(
            HealthcareProvider.user_id == current_user.user_id
        ).first()
        if provider:
            query = query.filter(HealthcareRequest.provider_id == provider.id)
    
    elif current_user.role == UserRole.PAYER.value:
        payer = db.query(HealthcarePayer).filter(
            HealthcarePayer.user_id == current_user.user_id
        ).first()
        if payer:
            query = query.filter(HealthcareRequest.payer_id == payer.id)
    
    # Additional filters
    if status:
        query = query.filter(HealthcareRequest.status == status)
    if request_type:
        query = query.filter(HealthcareRequest.request_type == request_type)
    
    # Order and limit
    requests = query.order_by(HealthcareRequest.submitted_at.desc()).limit(limit).all()
    
    return [
        {
            "id": req.id,
            "request_uuid": req.request_uuid,
            "type": req.request_type.value,
            "status": req.status.value,
            "patient_id": req.patient_id,
            "provider_id": req.provider_id,
            "service_code": req.service.code if req.service else None,
            "service_name": req.service.name if req.service else None,
            "estimated_cost": req.estimated_cost,
            "submitted_at": req.submitted_at.isoformat() if req.submitted_at else None
        }
        for req in requests
    ]


@app.get("/api/requests/{request_id}")
async def get_request_detail(
    request_id: int,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed request information"""
    request_obj = db.query(HealthcareRequest).filter(
        HealthcareRequest.id == request_id
    ).first()
    
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Authorization check
    is_authorized = False
    if current_user.role == UserRole.ADMIN.value:
        is_authorized = True
    elif current_user.role == UserRole.PATIENT.value:
        patient = db.query(HealthcarePatient).filter(
            HealthcarePatient.user_id == current_user.user_id
        ).first()
        is_authorized = patient and request_obj.patient_id == patient.id
    elif current_user.role == UserRole.PROVIDER.value:
        provider = db.query(HealthcareProvider).filter(
            HealthcareProvider.user_id == current_user.user_id
        ).first()
        is_authorized = provider and request_obj.provider_id == provider.id
    elif current_user.role == UserRole.PAYER.value:
        payer = db.query(HealthcarePayer).filter(
            HealthcarePayer.user_id == current_user.user_id
        ).first()
        is_authorized = payer and request_obj.payer_id == payer.id
    
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "id": request_obj.id,
        "request_uuid": request_obj.request_uuid,
        "type": request_obj.request_type.value,
        "status": request_obj.status.value,
        "patient": {
            "id": request_obj.patient.id,
            "name": request_obj.patient.user.full_name
        } if request_obj.patient else None,
        "provider": {
            "id": request_obj.provider.id,
            "name": request_obj.provider.organization_name
        } if request_obj.provider else None,
        "service": {
            "code": request_obj.service.code,
            "name": request_obj.service.name,
            "price": request_obj.service.default_price
        } if request_obj.service else None,
        "diagnosis_codes": request_obj.diagnosis_codes,
        "clinical_notes": request_obj.clinical_notes,
        "estimated_cost": request_obj.estimated_cost,
        "approved_amount": request_obj.approved_amount,
        "submitted_at": request_obj.submitted_at.isoformat() if request_obj.submitted_at else None,
        "updated_at": request_obj.updated_at.isoformat() if request_obj.updated_at else None
    }


@app.put("/api/requests/{request_id}/status")
async def update_request_status(
    request_id: int,
    update: StatusUpdateRequest,
    current_user: TokenData = Depends(require_provider),
    db: Session = Depends(get_db)
):
    """Update request status (provider only)"""
    request_obj = db.query(HealthcareRequest).filter(
        HealthcareRequest.id == request_id
    ).first()
    
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check ownership
    provider = db.query(HealthcareProvider).filter(
        HealthcareProvider.user_id == current_user.user_id
    ).first()
    
    if not provider or request_obj.provider_id != provider.id:
        raise HTTPException(status_code=403, detail="Not your request")
    
    # Validate status
    try:
        new_status = RequestStatus(update.new_status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {[s.value for s in RequestStatus]}"
        )
    
    request_obj.status = new_status
    db.commit()
    
    return {"success": True, "message": "Status updated", "new_status": new_status.value}


@app.post("/api/requests/{request_id}/approve")
async def approve_request(
    request_id: int,
    approval: ApprovalRequest,
    current_user: TokenData = Depends(require_payer),
    db: Session = Depends(get_db)
):
    """Approve or deny a request (payer only)"""
    request_obj = db.query(HealthcareRequest).filter(
        HealthcareRequest.id == request_id
    ).first()
    
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get payer
    payer = db.query(HealthcarePayer).filter(
        HealthcarePayer.user_id == current_user.user_id
    ).first()
    
    if not payer or request_obj.payer_id != payer.id:
        raise HTTPException(status_code=403, detail="Request not assigned to your organization")
    
    # Create approval record
    approval_record = HealthcareApproval(
        request_id=request_obj.id,
        payer_id=payer.id,
        approved=approval.approved,
        comments=approval.comments,
        approved_amount=approval.approved_amount,
        conditions=approval.conditions
    )
    
    # Update request status
    request_obj.status = RequestStatus.APPROVED if approval.approved else RequestStatus.DENIED
    request_obj.approved_amount = approval.approved_amount
    request_obj.reviewed_at = datetime.utcnow()
    
    if approval.approved:
        request_obj.approved_at = datetime.utcnow()
    
    db.add(approval_record)
    db.commit()
    
    return {
        "success": True,
        "message": "Approved" if approval.approved else "Denied",
        "request_status": request_obj.status.value,
        "approved_amount": request_obj.approved_amount
    }


# ============================================================================
# DASHBOARD APIS
# ============================================================================

@app.get("/api/dashboard/{role}")
async def get_dashboard_data(
    role: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get role-specific dashboard data"""
    if current_user.role != role and current_user.role != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Access denied")
    
    dashboard_data = {
        "role": role,
        "stats": {},
        "recent_activity": []
    }
    
    if role == UserRole.PROVIDER.value:
        provider = db.query(HealthcareProvider).filter(
            HealthcareProvider.user_id == current_user.user_id
        ).first()
        
        if provider:
            total_requests = db.query(HealthcareRequest).filter(
                HealthcareRequest.provider_id == provider.id
            ).count()
            
            pending_requests = db.query(HealthcareRequest).filter(
                and_(
                    HealthcareRequest.provider_id == provider.id,
                    HealthcareRequest.status == RequestStatus.SUBMITTED
                )
            ).count()
            
            dashboard_data["stats"] = {
                "total_requests": total_requests,
                "pending": pending_requests
            }
    
    elif role == UserRole.PAYER.value:
        payer = db.query(HealthcarePayer).filter(
            HealthcarePayer.user_id == current_user.user_id
        ).first()
        
        if payer:
            pending_approvals = db.query(HealthcareRequest).filter(
                and_(
                    HealthcareRequest.payer_id == payer.id,
                    HealthcareRequest.status == RequestStatus.SUBMITTED
                )
            ).count()
            
            dashboard_data["stats"] = {
                "pending_approvals": pending_approvals
            }
    
    return dashboard_data


# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "HealthcareLinc Agent",
        "version": "1.0.0",
        "capabilities": [
            "unified_submission",
            "role_based_access",
            "fhir_compliant",
            "workflow_orchestration"
        ]
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "HealthcareLinc Agent",
        "description": "Unified Healthcare Workflow Management",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth/login",
            "submit": "/api/submit",
            "requests": "/api/requests",
            "dashboard": "/api/dashboard/{role}",
            "docs": "/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "4004"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=True
    )
