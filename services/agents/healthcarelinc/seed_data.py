"""
Seed Data for Healthcare System
Creates demo users, services, and test data
"""

import sys
import os
from datetime import date, datetime

# Import models
from models import (
    Base, HealthcareUser, HealthcarePatient, HealthcareProvider,
    HealthcarePayer, HealthcareService, UserRole
)
from auth import get_password_hash
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Database configuration
DATABASE_URL = f"postgresql://{os.getenv('DB_USER', 'postgres')}:{os.getenv('DB_PASSWORD', 'password')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'sbs_integration')}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def seed_database():
    """Seed the database with initial data"""
    db = SessionLocal()
    
    try:
        print("🌱 Starting database seeding...")
        
        # Check if data already exists
        if db.query(HealthcareUser).count() > 0:
            print("⚠️  Data already exists. Skipping seed.")
            return
        
        # 1. Create Admin User
        print("Creating admin user...")
        admin_user = HealthcareUser(
            username="admin",
            email="admin@brainsait.cloud",
            password_hash=get_password_hash("admin123"),
            role=UserRole.ADMIN,
            full_name="System Administrator",
            phone="+966501234567"
        )
        db.add(admin_user)
        db.flush()
        
        # 2. Create Payer (Insurance Company)
        print("Creating payer (insurance company)...")
        payer_user = HealthcareUser(
            username="insureco",
            email="admin@insureco.sa",
            password_hash=get_password_hash("payer123"),
            role=UserRole.PAYER,
            full_name="InsureCo Arabia",
            phone="+966112345678"
        )
        db.add(payer_user)
        db.flush()
        
        payer = HealthcarePayer(
            user_id=payer_user.id,
            payer_identifier="PAY-001",
            company_name="InsureCo Arabia",
            license_number="INS-2024-001",
            contact_email="claims@insureco.sa",
            contact_phone="+966112345678",
            address_line="King Fahd Road, Al Olaya District",
            city="Riyadh",
            country="SA"
        )
        db.add(payer)
        db.flush()
        
        # 3. Create Provider (Hospital)
        print("Creating provider (hospital)...")
        provider_user = HealthcareUser(
            username="cityhospital",
            email="admin@cityhospital.sa",
            password_hash=get_password_hash("provider123"),
            role=UserRole.PROVIDER,
            full_name="City Hospital Riyadh",
            phone="+966114567890"
        )
        db.add(provider_user)
        db.flush()
        
        provider = HealthcareProvider(
            user_id=provider_user.id,
            provider_identifier="PROV-001",
            organization_name="City Hospital Riyadh",
            license_number="HOSP-2024-001",
            specialty="Multi-Specialty Hospital",
            address_line="King Abdullah Road, Al Malaz",
            city="Riyadh",
            postal_code="11564",
            country="SA",
            contact_email="info@cityhospital.sa",
            contact_phone="+966114567890",
            fhir_type="prov"
        )
        db.add(provider)
        db.flush()
        
        # 4. Create Patient
        print("Creating patient...")
        patient_user = HealthcareUser(
            username="ahmed_ali",
            email="ahmed.ali@example.sa",
            password_hash=get_password_hash("patient123"),
            role=UserRole.PATIENT,
            full_name="Ahmed Ali Mohammed",
            phone="+966505551234"
        )
        db.add(patient_user)
        db.flush()
        
        patient = HealthcarePatient(
            user_id=patient_user.id,
            patient_identifier="PAT-001",
            date_of_birth=date(1985, 5, 20),
            gender="male",
            nationality="SA",
            marital_status="married",
            address_line="Al Malqa District",
            city="Riyadh",
            postal_code="13521",
            country="SA",
            insurance_policy_id="POL-2024-12345",
            insurance_payer_id=payer.id,
            insurance_expiry=date(2025, 12, 31)
        )
        db.add(patient)
        db.flush()
        
        # 5. Create Healthcare Services
        print("Creating healthcare services...")
        services = [
            {
                "code": "99213",
                "code_system": "CPT",
                "name": "Office Visit - Level 3",
                "description": "Established patient office visit, moderate complexity",
                "category": "Consultation",
                "default_price": 250.00,
                "requires_preauth": False
            },
            {
                "code": "93000",
                "code_system": "CPT",
                "name": "Electrocardiogram (ECG)",
                "description": "12-lead ECG with interpretation",
                "category": "Diagnostic",
                "default_price": 350.00,
                "requires_preauth": False
            },
            {
                "code": "73562",
                "code_system": "CPT",
                "name": "X-Ray Knee (2 views)",
                "description": "Radiologic examination of knee",
                "category": "Imaging",
                "default_price": 450.00,
                "requires_preauth": True
            },
            {
                "code": "80053",
                "code_system": "CPT",
                "name": "Comprehensive Metabolic Panel",
                "description": "Blood test for metabolic assessment",
                "category": "Laboratory",
                "default_price": 180.00,
                "requires_preauth": False
            },
            {
                "code": "J0690",
                "code_system": "CPT",
                "name": "Cefazolin Injection",
                "description": "Antibiotic injection, 500mg",
                "category": "Medication",
                "default_price": 75.00,
                "requires_preauth": False
            },
            {
                "code": "99285",
                "code_system": "CPT",
                "name": "Emergency Department Visit - Level 5",
                "description": "High severity emergency department visit",
                "category": "Emergency",
                "default_price": 1200.00,
                "requires_preauth": False
            },
            {
                "code": "45378",
                "code_system": "CPT",
                "name": "Diagnostic Colonoscopy",
                "description": "Colonoscopy with biopsy",
                "category": "Procedure",
                "default_price": 2500.00,
                "requires_preauth": True
            },
            {
                "code": "70450",
                "code_system": "CPT",
                "name": "CT Scan Head/Brain",
                "description": "Computed tomography of head without contrast",
                "category": "Imaging",
                "default_price": 1800.00,
                "requires_preauth": True
            }
        ]
        
        for service_data in services:
            service = HealthcareService(**service_data)
            db.add(service)
        
        db.commit()
        
        print("✅ Database seeding completed successfully!")
        print("\n" + "="*60)
        print("DEMO CREDENTIALS")
        print("="*60)
        print("\n👤 Admin User:")
        print("   Username: admin")
        print("   Password: admin123")
        print("\n🏥 Provider (City Hospital):")
        print("   Username: cityhospital")
        print("   Password: provider123")
        print("\n💰 Payer (InsureCo):")
        print("   Username: insureco")
        print("   Password: payer123")
        print("\n🧑‍⚕️ Patient (Ahmed Ali):")
        print("   Username: ahmed_ali")
        print("   Password: patient123")
        print("\n" + "="*60)
        print(f"📊 Created {len(services)} healthcare services")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"❌ Error seeding database: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
