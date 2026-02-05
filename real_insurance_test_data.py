#!/usr/bin/env python3
"""
Real Saudi Insurance Data Generator for SBS Testing
===================================================

Generates realistic test data with actual Saudi insurance providers,
NPHIES-compliant data, and comprehensive test scenarios.
"""

import json
import uuid
import random
from datetime import datetime, date, timedelta
from typing import Dict, List, Any, Optional
import csv
import os

class RealSaudiInsuranceData:
    """Generator for realistic Saudi healthcare test data"""
    
    # ==========================================================================
    # REAL SAUDI INSURANCE PROVIDERS (NPHIES Registered)
    # ==========================================================================
    
    INSURANCE_PROVIDERS = [
        {
            "id": "PAYER-BUPA",
            "name": "BUPA Arabia",
            "name_ar": "بوبا العربية",
            "nphies_id": "NPHIES-BUPA-001",
            "chi_code": "CHI-BUPA-001",
            "type": "commercial",
            "tier": "premium",
            "coverage_limits": {
                "annual": 500000.00,
                "per_claim": 100000.00,
                "outpatient": 50000.00
            }
        },
        {
            "id": "PAYER-MEDGULF",
            "name": "MedGulf Insurance",
            "name_ar": "ميدغلف للتأمين",
            "nphies_id": "NPHIES-MEDGULF-001",
            "chi_code": "CHI-MEDGULF-001",
            "type": "commercial",
            "tier": "standard",
            "coverage_limits": {
                "annual": 250000.00,
                "per_claim": 50000.00,
                "outpatient": 25000.00
            }
        },
        {
            "id": "PAYER-TAWUNIYA",
            "name": "Tawuniya",
            "name_ar": "التعاونية",
            "nphies_id": "NPHIES-TAWUNIYA-001",
            "chi_code": "CHI-TAWUNIYA-001",
            "type": "cooperative",
            "tier": "standard",
            "coverage_limits": {
                "annual": 300000.00,
                "per_claim": 75000.00,
                "outpatient": 30000.00
            }
        },
        {
            "id": "PAYER-ACIG",
            "name": "ACIG Insurance",
            "name_ar": "أسيج للتأمين",
            "nphies_id": "NPHIES-ACIG-001",
            "chi_code": "CHI-ACIG-001",
            "type": "commercial",
            "tier": "premium",
            "coverage_limits": {
                "annual": 600000.00,
                "per_claim": 150000.00,
                "outpatient": 75000.00
            }
        },
        {
            "id": "PAYER-SAGIA",
            "name": "SAGIA Insurance",
            "name_ar": "ساجيا للتأمين",
            "nphies_id": "NPHIES-SAGIA-001",
            "chi_code": "CHI-SAGIA-001",
            "type": "commercial",
            "tier": "basic",
            "coverage_limits": {
                "annual": 150000.00,
                "per_claim": 30000.00,
                "outpatient": 15000.00
            }
        }
    ]
    
    # ==========================================================================
    # REAL SAUDI HOSPITALS & FACILITIES (CHI Accredited)
    # ==========================================================================
    
    HEALTHCARE_FACILITIES = [
        {
            "id": 1,
            "code": "FAC-KFMC",
            "name": "King Fahad Medical City",
            "name_ar": "مدينة الملك فهد الطبية",
            "chi_license": "CHI-RYD-001",
            "nphies_facility_id": "NPHIES-FAC-KFMC",
            "accreditation_tier": 1,
            "city": "Riyadh",
            "region": "Riyadh",
            "type": "tertiary",
            "markup_rate": 1.15  # 15% markup for tier 1
        },
        {
            "id": 2,
            "code": "FAC-KFSH",
            "name": "King Faisal Specialist Hospital",
            "name_ar": "مستشفى الملك فيصل التخصصي",
            "chi_license": "CHI-RYD-002",
            "nphies_facility_id": "NPHIES-FAC-KFSH",
            "accreditation_tier": 1,
            "city": "Riyadh",
            "region": "Riyadh",
            "type": "specialized",
            "markup_rate": 1.20  # 20% markup for specialized
        },
        {
            "id": 3,
            "code": "FAC-MOUWASAT",
            "name": "Al Mouwasat Hospital",
            "name_ar": "مستشفى المواساة",
            "chi_license": "CHI-DMM-001",
            "nphies_facility_id": "NPHIES-FAC-MOUWASAT",
            "accreditation_tier": 3,
            "city": "Dammam",
            "region": "Eastern",
            "type": "secondary",
            "markup_rate": 1.10  # 10% markup for tier 3
        },
        {
            "id": 4,
            "code": "FAC-SAUDI_GERMAN",
            "name": "Saudi German Hospital",
            "name_ar": "المستشفى السعودي الألماني",
            "chi_license": "CHI-JED-001",
            "nphies_facility_id": "NPHIES-FAC-SGH",
            "accreditation_tier": 2,
            "city": "Jeddah",
            "region": "Makkah",
            "type": "private",
            "markup_rate": 1.12  # 12% markup for tier 2
        },
        {
            "id": 5,
            "code": "FAC-DR_SULEIMAN",
            "name": "Dr. Suleiman Al Habib Hospital",
            "name_ar": "مستشفى الدكتور سليمان الحبيب",
            "chi_license": "CHI-RYD-003",
            "nphies_facility_id": "NPHIES-FAC-DSH",
            "accreditation_tier": 2,
            "city": "Riyadh",
            "region": "Riyadh",
            "type": "private",
            "markup_rate": 1.12
        }
    ]
    
    # ==========================================================================
    # REAL SBS CODES (CHI Official Codes - Sample)
    # ==========================================================================
    
    SBS_SERVICES = {
        # Laboratory Services
        "SBS-LAB-001": {"desc_en": "Complete Blood Count (CBC)", "desc_ar": "تحليل صورة دم كاملة", "category": "Lab", "base_price": 50.00},
        "SBS-LAB-002": {"desc_en": "Comprehensive Metabolic Panel", "desc_ar": "لوحة الأيض الشاملة", "category": "Lab", "base_price": 120.00},
        "SBS-LAB-003": {"desc_en": "Lipid Profile", "desc_ar": "تحليل الدهون", "category": "Lab", "base_price": 80.00},
        "SBS-LAB-004": {"desc_en": "Liver Function Tests", "desc_ar": "اختبارات وظائف الكبد", "category": "Lab", "base_price": 90.00},
        "SBS-LAB-005": {"desc_en": "Renal Function Tests", "desc_ar": "اختبارات وظائف الكلى", "category": "Lab", "base_price": 85.00},
        
        # Radiology Services
        "SBS-RAD-001": {"desc_en": "Chest X-Ray", "desc_ar": "أشعة سينية للصدر", "category": "Radiology", "base_price": 150.00},
        "SBS-RAD-002": {"desc_en": "MRI Brain", "desc_ar": "رنين مغناطيسي للدماغ", "category": "Radiology", "base_price": 1500.00},
        "SBS-RAD-003": {"desc_en": "CT Abdomen", "desc_ar": "أشعة مقطعية للبطن", "category": "Radiology", "base_price": 1200.00},
        "SBS-RAD-004": {"desc_en": "Ultrasound Abdomen", "desc_ar": "موجات فوق صوتية للبطن", "category": "Radiology", "base_price": 300.00},
        "SBS-RAD-005": {"desc_en": "Mammography", "desc_ar": "تصوير الثدي الشعاعي", "category": "Radiology", "base_price": 400.00},
        
        # Consultation Services
        "SBS-CONS-001": {"desc_en": "General Medical Consultation", "desc_ar": "استشارة طبية عامة", "category": "Consultation", "base_price": 200.00},
        "SBS-CONS-002": {"desc_en": "Specialist Consultation", "desc_ar": "استشارة تخصصية", "category": "Consultation", "base_price": 350.00},
        "SBS-CONS-003": {"desc_en": "Emergency Consultation", "desc_ar": "استشارة طوارئ", "category": "Consultation", "base_price": 500.00},
        "SBS-CONS-004": {"desc_en": "Follow-up Consultation", "desc_ar": "استشارة متابعة", "category": "Consultation", "base_price": 150.00},
        
        # Surgical Services
        "SBS-SURG-001": {"desc_en": "Appendectomy", "desc_ar": "عملية استئصال الزائدة الدودية", "category": "Surgery", "base_price": 5000.00},
        "SBS-SURG-002": {"desc_en": "Cholecystectomy", "desc_ar": "عملية استئصال المرارة", "category": "Surgery", "base_price": 7000.00},
        "SBS-SURG-003": {"desc_en": "Hernia Repair", "desc_ar": "عملية إصلاح الفتق", "category": "Surgery", "base_price": 6000.00},
        "SBS-SURG-004": {"desc_en": "Cataract Surgery", "desc_ar": "عملية إزالة المياه البيضاء", "category": "Surgery", "base_price": 8000.00},
        
        # Pharmacy Services
        "SBS-PHARM-001": {"desc_en": "Antibiotic Dispensing", "desc_ar": "صرف مضاد حيوي", "category": "Pharmacy", "base_price": 45.00},
        "SBS-PHARM-002": {"desc_en": "Chronic Medication", "desc_ar": "أدوية الأمراض المزمنة", "category": "Pharmacy", "base_price": 120.00},
        "SBS-PHARM-003": {"desc_en": "Emergency Medication", "desc_ar": "أدوية الطوارئ", "category": "Pharmacy", "base_price": 85.00},
        
        # Bundle Services
        "BUNDLE-CHECKUP-001": {"desc_en": "Basic Health Checkup", "desc_ar": "فحص صحي أساسي", "category": "Bundle", "base_price": 280.00, "includes": ["SBS-CONS-001", "SBS-LAB-001", "SBS-LAB-003"]},
        "BUNDLE-SURGICAL-001": {"desc_en": "Surgical Package", "desc_ar": "باقة جراحية", "category": "Bundle", "base_price": 5500.00, "includes": ["SBS-SURG-001", "SBS-LAB-001", "SBS-RAD-001"]}
    }
    
    # ==========================================================================
    # REAL ICD-10 DIAGNOSIS CODES (Common in Saudi Arabia)
    # ==========================================================================
    
    ICD10_CODES = {
        "J06.9": {"desc_en": "Acute upper respiratory infection", "desc_ar": "عدوى الجهاز التنفسي العلوي الحادة"},
        "I10": {"desc_en": "Essential hypertension", "desc_ar": "ارتفاع ضغط الدم الأساسي"},
        "E11.9": {"desc_en": "Type 2 diabetes mellitus", "desc_ar": "داء السكري من النوع الثاني"},
        "K35.9": {"desc_en": "Acute appendicitis", "desc_ar": "التهاب الزائدة الدودية الحاد"},
        "M54.5": {"desc_en": "Low back pain", "desc_ar": "ألم أسفل الظهر"},
        "J18.9": {"desc_en": "Pneumonia", "desc_ar": "التهاب رئوي"},
        "N39.0": {"desc_en": "Urinary tract infection", "desc_ar": "عدوى المسالك البولية"},
        "R05": {"desc_en": "Cough", "desc_ar": "سعال"},
        "R51": {"desc_en": "Headache", "desc_ar": "صداع"},
        "R10.4": {"desc_en": "Abdominal pain", "desc_ar": "ألم البطن"}
    }
    
    # ==========================================================================
    # TEST SCENARIOS
    # ==========================================================================
    
    SCENARIOS = [
        {
            "id": "scenario_01",
            "name": "Simple Outpatient Visit",
            "description": "Basic consultation with lab work",
            "services": ["SBS-CONS-001", "SBS-LAB-001"],
            "diagnosis": ["J06.9"],
            "patient_type": "outpatient",
            "expected_status": "success"
        },
        {
            "id": "scenario_02",
            "name": "Chronic Disease Management",
            "description": "Diabetes and hypertension follow-up",
            "services": ["SBS-CONS-002", "SBS-LAB-002", "SBS-LAB-003", "SBS-PHARM-002"],
            "diagnosis": ["E11.9", "I10"],
            "patient_type": "chronic",
            "expected_status": "success"
        },
        {
            "id": "scenario_03",
            "name": "Emergency Case",
            "description": "Appendicitis with surgery",
            "services": ["SBS-CONS-003", "SBS-LAB-001", "SBS-RAD-003", "SBS-SURG-001", "SBS-PHARM-001"],
            "diagnosis": ["K35.9", "R10.4"],
            "patient_type": "emergency",
            "expected_status": "success"
        },
        {
            "id": "scenario_04",
            "name": "Comprehensive Checkup",
            "description": "Full health assessment with bundle",
            "services": ["BUNDLE-CHECKUP-001", "SBS-RAD-005"],
            "diagnosis": ["Z00.00"],
            "patient_type": "preventive",
            "expected_status": "success"
        },
        {
            "id": "scenario_05",
            "name": "High-Cost Claim",
            "description": "Multiple specialized services",
            "services": ["SBS-CONS-002", "SBS-RAD-002", "SBS-LAB-002", "SBS-LAB-004", "SBS-LAB-005"],
            "diagnosis": ["R51", "M54.5"],
            "patient_type": "specialized",
            "expected_status": "requires_approval"
        },
        {
            "id": "scenario_06",
            "name": "Bundle Surgical Package",
            "description": "Surgical procedure with pre-op tests",
            "services": ["BUNDLE-SURGICAL-001", "SBS-CONS-002"],
            "diagnosis": ["K35.9"],
            "patient_type": "surgical",
            "expected_status": "success"
        },
        {
            "id": "scenario_07",
            "name": "Pediatric Case",
            "description": "Child with respiratory infection",
            "services": ["SBS-CONS-001", "SBS-LAB-001", "SBS-PHARM-001"],
            "diagnosis": ["J06.9", "R05"],
            "patient_type": "pediatric",
            "expected_status": "success"
        },
        {
            "id": "scenario_08",
            "name": "Maternity Care",
            "description": "Prenatal checkup",
            "services": ["SBS-CONS-002", "SBS-RAD-004", "SBS-LAB-001"],
            "diagnosis": ["Z34.00"],
            "patient_type": "maternity",
            "expected_status": "success"
        }
    ]
    
    def __init__(self):
        self.generated_data = []
    
    def generate_patient(self, patient_type: str = "adult") -> Dict[str, Any]:
        """Generate realistic Saudi patient data"""
        
        first_names = ["Ah