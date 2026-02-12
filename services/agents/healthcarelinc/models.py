"""
FHIR-Compliant Healthcare Data Models
SQLAlchemy models for healthcare entities
"""

from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime, Date,
    ForeignKey, JSON, Text, Enum as SQLEnum
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    """User roles in the healthcare system"""
    PATIENT = "patient"
    PROVIDER = "provider"
    PAYER = "payer"
    ADMIN = "admin"


class RequestType(str, enum.Enum):
    """Types of healthcare service requests"""
    PRIOR_AUTH = "prior_auth"
    CLAIM = "claim"
    REFERRAL = "referral"
    ELIGIBILITY = "eligibility"


class RequestStatus(str, enum.Enum):
    """Status of healthcare requests"""
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    DENIED = "denied"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BILLED = "billed"
    PAID = "paid"
    CANCELLED = "cancelled"


class HealthcareUser(Base):
    """Multi-role user management"""
    __tablename__ = 'healthcare_users'

    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, index=True)
    full_name = Column(String(200))
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    patient_profile = relationship(
        "HealthcarePatient",
        back_populates="user",
        uselist=False
    )
    provider_profile = relationship(
        "HealthcareProvider",
        back_populates="user",
        uselist=False
    )
    payer_profile = relationship(
        "HealthcarePayer",
        back_populates="user",
        uselist=False
    )


class HealthcarePatient(Base):
    """Patient profiles with FHIR extensions"""
    __tablename__ = 'healthcare_patients'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('healthcare_users.id'), unique=True)
    
    # FHIR Patient resource fields
    patient_identifier = Column(String(50), unique=True, index=True)
    date_of_birth = Column(Date)
    gender = Column(String(10))  # male, female, other, unknown
    nationality = Column(String(50))
    marital_status = Column(String(20))
    
    # Contact information
    address_line = Column(Text)
    city = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(50), default="SA")
    
    # Insurance information
    insurance_policy_id = Column(String(100))
    insurance_payer_id = Column(Integer, ForeignKey('healthcare_payers.id'))
    insurance_expiry = Column(Date)
    
    # FHIR extensions (stored as JSON)
    fhir_extensions = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("HealthcareUser", back_populates="patient_profile")
    insurance_payer = relationship("HealthcarePayer")
    service_requests = relationship("HealthcareRequest", back_populates="patient")


class HealthcareProvider(Base):
    """Healthcare provider organizations"""
    __tablename__ = 'healthcare_providers'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('healthcare_users.id'), unique=True)
    
    # Provider information
    provider_identifier = Column(String(50), unique=True, index=True)
    organization_name = Column(String(200), nullable=False)
    license_number = Column(String(100))
    specialty = Column(String(100))
    
    # Contact information
    address_line = Column(Text)
    city = Column(String(100))
    postal_code = Column(String(20))
    country = Column(String(50), default="SA")
    contact_email = Column(String(120))
    contact_phone = Column(String(20))
    
    # FHIR Organization resource fields
    fhir_type = Column(String(50))  # prov, dept, team, govt, ins, etc.
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("HealthcareUser", back_populates="provider_profile")
    service_requests = relationship("HealthcareRequest", back_populates="provider")


class HealthcarePayer(Base):
    """Insurance companies / payers"""
    __tablename__ = 'healthcare_payers'

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('healthcare_users.id'), unique=True)
    
    # Payer information
    payer_identifier = Column(String(50), unique=True, index=True)
    company_name = Column(String(200), nullable=False)
    license_number = Column(String(100))
    
    # Contact information
    contact_email = Column(String(120))
    contact_phone = Column(String(20))
    address_line = Column(Text)
    city = Column(String(100))
    country = Column(String(50), default="SA")
    
    # Business information
    is_active = Column(Boolean, default=True)
    supported_services = Column(JSON)  # List of service codes they cover
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("HealthcareUser", back_populates="payer_profile")
    service_requests = relationship("HealthcareRequest", back_populates="payer")
    approvals = relationship("HealthcareApproval", back_populates="payer")


class HealthcareService(Base):
    """Service catalog (CPT, ICD codes, procedures)"""
    __tablename__ = 'healthcare_services'

    id = Column(Integer, primary_key=True)
    
    # Service identification
    code = Column(String(50), unique=True, nullable=False, index=True)
    code_system = Column(String(100))  # CPT, ICD-10, SNOMED, etc.
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # diagnostic, therapeutic, etc.
    
    # Pricing
    default_price = Column(Float)
    currency = Column(String(10), default="SAR")
    
    # FHIR CodeableConcept
    fhir_coding = Column(JSON)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    requires_preauth = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    service_requests = relationship("HealthcareRequest", back_populates="service")


class HealthcareRequest(Base):
    """Unified service requests (prior auth, claims, referrals)"""
    __tablename__ = 'healthcare_requests'

    id = Column(Integer, primary_key=True)
    request_uuid = Column(String(36), unique=True, nullable=False, index=True)
    
    # Request type and status
    request_type = Column(SQLEnum(RequestType), nullable=False, index=True)
    status = Column(SQLEnum(RequestStatus), default=RequestStatus.SUBMITTED, index=True)
    
    # Stakeholders
    patient_id = Column(Integer, ForeignKey('healthcare_patients.id'), nullable=False)
    provider_id = Column(Integer, ForeignKey('healthcare_providers.id'), nullable=False)
    payer_id = Column(Integer, ForeignKey('healthcare_payers.id'))
    
    # Service information
    service_id = Column(Integer, ForeignKey('healthcare_services.id'))
    service_date = Column(Date)
    
    # FHIR Claim/ServiceRequest resource
    fhir_resource = Column(JSON)  # Complete FHIR resource
    
    # Additional details
    diagnosis_codes = Column(JSON)  # Array of ICD-10 codes
    procedure_codes = Column(JSON)  # Array of CPT codes
    clinical_notes = Column(Text)
    priority = Column(String(20), default="normal")  # routine, urgent, stat
    
    # Financial
    estimated_cost = Column(Float)
    approved_amount = Column(Float)
    
    # Integration tracking
    nphies_transaction_id = Column(String(100))
    masterlinc_workflow_id = Column(String(100))
    
    # Timestamps
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)
    reviewed_at = Column(DateTime)
    approved_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patient = relationship("HealthcarePatient", back_populates="service_requests")
    provider = relationship("HealthcareProvider", back_populates="service_requests")
    payer = relationship("HealthcarePayer", back_populates="service_requests")
    service = relationship("HealthcareService", back_populates="service_requests")
    approvals = relationship("HealthcareApproval", back_populates="request")
    claim = relationship("HealthcareClaim", back_populates="request", uselist=False)


class HealthcareApproval(Base):
    """Payer approvals/denials"""
    __tablename__ = 'healthcare_approvals'

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey('healthcare_requests.id'), nullable=False)
    payer_id = Column(Integer, ForeignKey('healthcare_payers.id'), nullable=False)
    
    # Approval decision
    approved = Column(Boolean, nullable=False)
    approval_code = Column(String(100))
    
    # Details
    comments = Column(Text)
    conditions = Column(JSON)  # Any conditions for approval
    approved_amount = Column(Float)
    
    # Reviewer information
    reviewer_name = Column(String(200))
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    request = relationship("HealthcareRequest", back_populates="approvals")
    payer = relationship("HealthcarePayer", back_populates="approvals")


class HealthcareClaim(Base):
    """Claim records (financial)"""
    __tablename__ = 'healthcare_claims'

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey('healthcare_requests.id'), unique=True)
    claim_number = Column(String(100), unique=True, index=True)
    
    # Financial amounts
    billed_amount = Column(Float, nullable=False)
    approved_amount = Column(Float)
    paid_amount = Column(Float)
    patient_responsibility = Column(Float)
    
    # Claim details
    claim_status = Column(String(50), default="submitted")
    denial_reason = Column(Text)
    
    # Payment information
    payment_reference = Column(String(100))
    payment_date = Column(Date)
    
    # Timestamps
    submitted_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    paid_at = Column(DateTime)
    
    # Relationship
    request = relationship("HealthcareRequest", back_populates="claim")
