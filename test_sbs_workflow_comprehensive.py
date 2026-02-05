#!/usr/bin/env python3
"""
Comprehensive SBS Workflow Testing Suite
=========================================
Aggressively tests all possible workflow scenarios and pipelines end-to-end
"""

import json
import requests
import time
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import random

# Embedded data generator
class SimpleSBSDataGenerator:
    SBS_SERVICES = {
        'SBS-LAB-001': {'desc_en': 'Complete Blood Count (CBC)', 'category': 'Lab', 'base_price': 50.00},
        'SBS-LAB-002': {'desc_en': 'Comprehensive Metabolic Panel', 'category': 'Lab', 'base_price': 120.00},
        'SBS-LAB-003': {'desc_en': 'Lipid Profile', 'category': 'Lab', 'base_price': 80.00},
        'SBS-RAD-001': {'desc_en': 'Chest X-Ray', 'category': 'Radiology', 'base_price': 150.00},
        'SBS-RAD-002': {'desc_en': 'MRI Brain', 'category': 'Radiology', 'base_price': 1500.00},
        'SBS-RAD-003': {'desc_en': 'CT Abdomen', 'category': 'Radiology', 'base_price': 1200.00},
        'SBS-RAD-004': {'desc_en': 'Ultrasound Abdomen', 'category': 'Radiology', 'base_price': 300.00},
        'SBS-RAD-005': {'desc_en': 'Mammography', 'category': 'Radiology', 'base_price': 400.00},
        'SBS-CONS-001': {'desc_en': 'General Medical Consultation', 'category': 'Consultation', 'base_price': 200.00},
        'SBS-CONS-002': {'desc_en': 'Specialist Consultation', 'category': 'Consultation', 'base_price': 350.00},
        'SBS-CONS-003': {'desc_en': 'Emergency Consultation', 'category': 'Consultation', 'base_price': 500.00},
        'SBS-CONS-004': {'desc_en': 'Follow-up Consultation', 'category': 'Consultation', 'base_price': 150.00},
        'SBS-SURG-001': {'desc_en': 'Appendectomy', 'category': 'Surgery', 'base_price': 5000.00},
        'SBS-SURG-002': {'desc_en': 'Cholecystectomy', 'category': 'Surgery', 'base_price': 7000.00},
        'SBS-PHARM-001': {'desc_en': 'Antibiotic Dispensing', 'category': 'Pharmacy', 'base_price': 45.00},
        'SBS-PHARM-002': {'desc_en': 'Chronic Medication', 'category': 'Pharmacy', 'base_price': 120.00},
        'BUNDLE-CHECKUP-001': {'desc_en': 'Basic Health Checkup', 'category': 'Bundle', 'base_price': 280.00},
        'BUNDLE-SURGICAL-001': {'desc_en': 'Surgical Package', 'category': 'Bundle', 'base_price': 5500.00},
        'INVALID-CODE-001': {'desc_en': 'Invalid Service', 'category': 'Test', 'base_price': 99.00}
    }
    
    HEALTHCARE_FACILITIES = [
        {'id': 1, 'code': 'FAC-KFMC', 'name': 'King Fahad Medical City', 'markup_rate': 1.15, 'chi_license': 'CHI-RYD-001', 'type': 'tertiary', 'accreditation_tier': 1},
        {'id': 2, 'code': 'FAC-KFSH', 'name': 'King Faisal Specialist Hospital', 'markup_rate': 1.20, 'chi_license': 'CHI-RYD-002', 'type': 'specialized', 'accreditation_tier': 1},
        {'id': 3, 'code': 'FAC-MOUWASAT', 'name': 'Al Mouwasat Hospital', 'markup_rate': 1.10, 'chi_license': 'CHI-DMM-001', 'type': 'secondary', 'accreditation_tier': 3},
        {'id': 4, 'code': 'FAC-SAUDI_GERMAN', 'name': 'Saudi German Hospital', 'markup_rate': 1.12, 'chi_license': 'CHI-JED-001', 'type': 'private', 'accreditation_tier': 2},
        {'id': 5, 'code': 'FAC-DR_SULEIMAN', 'name': 'Dr. Suleiman Al Habib Hospital', 'markup_rate': 1.12, 'chi_license': 'CHI-RYD-003', 'type': 'private', 'accreditation_tier': 2}
    ]
    
    INSURANCE_PROVIDERS = [
        {'id': 'PAYER-BUPA', 'name': 'BUPA Arabia', 'nphies_id': 'NPHIES-BUPA-001', 'type': 'commercial'},
        {'id': 'PAYER-MEDGULF', 'name': 'MedGulf Insurance', 'nphies_id': 'NPHIES-MEDGULF-001', 'type': 'commercial'},
        {'id': 'PAYER-TAWUNIYA', 'name': 'Tawuniya', 'nphies_id': 'NPHIES-TAWUNIYA-001', 'type': 'cooperative'},
        {'id': 'PAYER-ACIG', 'name': 'ACIG Insurance', 'nphies_id': 'NPHIES-ACIG-001', 'type': 'commercial'},
        {'id': 'PAYER-SAGIA', 'name': 'SAGIA Insurance', 'nphies_id': 'NPHIES-SAGIA-001', 'type': 'commercial'}
    ]

class SBSWorkflowTester:
    """Comprehensive tester for SBS n8n workflow"""
    
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
        self.data_generator = SimpleSBSDataGenerator()
        self.test_results = []
        self.success_count = 0
        self.failure_count = 0
        
    def log(self, message: str, level: str = "INFO"):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
    
    def send_claim(self, claim_data: Dict[str, Any], test_name: str) -> Dict[str, Any]:
        """Send claim to webhook and capture response"""
        self.log(f"Testing: {test_name}", "TEST")
        
        try:
            start_time = time.time()
            response = requests.post(
                self.webhook_url,
                json=claim_data,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            elapsed_time = time.time() - start_time
            
            result = {
                "test_name": test_name,
                "claim_id": claim_data.get("claimHeader", {}).get("claimId", "N/A"),
                "status_code": response.status_code,
                "response_time": round(elapsed_time, 2),
                "response_body": None,
                "success": False,
                "error": None,
                "timestamp": datetime.now().isoformat()
            }
            
            try:
                result["response_body"] = response.json()
            except:
                result["response_body"] = response.text[:500]
            
            if 200 <= response.status_code < 300:
                result["success"] = True
                self.success_count += 1
                self.log(f"✓ PASSED - Status: {response.status_code}, Time: {elapsed_time:.2f}s", "SUCCESS")
            else:
                self.failure_count += 1
                result["error"] = f"HTTP {response.status_code}"
                self.log(f"✗ FAILED - Status: {response.status_code}", "ERROR")
            
            self.test_results.append(result)
            return result
            
        except requests.exceptions.Timeout:
            self.failure_count += 1
            result = {
                "test_name": test_name,
                "claim_id": claim_data.get("claimHeader", {}).get("claimId", "N/A"),
                "success": False,
                "error": "Request timeout after 30s",
                "timestamp": datetime.now().isoformat()
            }
            self.test_results.append(result)
            self.log(f"✗ FAILED - Timeout", "ERROR")
            return result
            
        except Exception as e:
            self.failure_count += 1
            result = {
                "test_name": test_name,
                "claim_id": claim_data.get("claimHeader", {}).get("claimId", "N/A"),
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.test_results.append(result)
            self.log(f"✗ FAILED - {str(e)}", "ERROR")
            return result
    
    def test_scenario_01_simple_outpatient(self):
        """Test 1: Simple outpatient visit"""
        claim = self._generate_claim(
            scenario_name="Simple Outpatient Visit",
            services=["SBS-CONS-001", "SBS-LAB-001"],
            facility_id=1,
            payer_id="PAYER-BUPA"
        )
        return self.send_claim(claim, "01_Simple_Outpatient_Visit")
    
    def test_scenario_02_chronic_disease(self):
        """Test 2: Chronic disease management"""
        claim = self._generate_claim(
            scenario_name="Chronic Disease Management",
            services=["SBS-CONS-002", "SBS-LAB-002", "SBS-LAB-003", "SBS-PHARM-002"],
            facility_id=2,
            payer_id="PAYER-MEDGULF"
        )
        return self.send_claim(claim, "02_Chronic_Disease_Management")
    
    def test_scenario_03_emergency(self):
        """Test 3: Emergency case with surgery"""
        claim = self._generate_claim(
            scenario_name="Emergency Case",
            services=["SBS-CONS-003", "SBS-LAB-001", "SBS-RAD-003", "SBS-SURG-001"],
            facility_id=1,
            payer_id="PAYER-ACIG"
        )
        return self.send_claim(claim, "03_Emergency_Surgery")
    
    def test_scenario_04_high_cost(self):
        """Test 4: High-cost claim with multiple services"""
        claim = self._generate_claim(
            scenario_name="High-Cost Claim",
            services=["SBS-RAD-002", "SBS-RAD-003", "SBS-CONS-002", "SBS-LAB-002"],
            facility_id=2,
            payer_id="PAYER-TAWUNIYA"
        )
        return self.send_claim(claim, "04_High_Cost_Multiple_Services")
    
    def test_scenario_05_bundle_services(self):
        """Test 5: Bundle services"""
        claim = self._generate_claim(
            scenario_name="Bundle Health Checkup",
            services=["BUNDLE-CHECKUP-001", "SBS-RAD-005"],
            facility_id=3,
            payer_id="PAYER-BUPA"
        )
        return self.send_claim(claim, "05_Bundle_Services")
    
    def test_scenario_06_pediatric(self):
        """Test 6: Pediatric case"""
        claim = self._generate_claim(
            scenario_name="Pediatric Case",
            services=["SBS-CONS-001", "SBS-LAB-001", "SBS-PHARM-001"],
            facility_id=4,
            payer_id="PAYER-MEDGULF",
            patient_age=7
        )
        return self.send_claim(claim, "06_Pediatric_Case")
    
    def test_scenario_07_maternity(self):
        """Test 7: Maternity care"""
        claim = self._generate_claim(
            scenario_name="Maternity Care",
            services=["SBS-CONS-002", "SBS-RAD-004", "SBS-LAB-001"],
            facility_id=5,
            payer_id="PAYER-ACIG",
            patient_gender="F"
        )
        return self.send_claim(claim, "07_Maternity_Care")
    
    def test_scenario_08_surgical_package(self):
        """Test 8: Surgical package bundle"""
        claim = self._generate_claim(
            scenario_name="Surgical Package",
            services=["BUNDLE-SURGICAL-001", "SBS-CONS-002"],
            facility_id=1,
            payer_id="PAYER-TAWUNIYA"
        )
        return self.send_claim(claim, "08_Surgical_Package_Bundle")
    
    def test_scenario_09_multiple_facilities(self):
        """Test 9: Same patient, different facilities"""
        for i, facility_id in enumerate([1, 2, 3, 4, 5]):
            claim = self._generate_claim(
                scenario_name=f"Multi-Facility Test {i+1}",
                services=["SBS-CONS-001", "SBS-LAB-001"],
                facility_id=facility_id,
                payer_id="PAYER-BUPA",
                patient_id="SAME-PATIENT-001"
            )
            self.send_claim(claim, f"09_Multi_Facility_{i+1}")
            time.sleep(0.5)
    
    def test_scenario_10_stress_test(self):
        """Test 10: Stress test - rapid submissions"""
        self.log("Starting stress test - 20 rapid submissions", "INFO")
        for i in range(20):
            claim = self._generate_claim(
                scenario_name=f"Stress Test {i+1}",
                services=["SBS-CONS-001"],
                facility_id=random.randint(1, 5),
                payer_id=random.choice(["PAYER-BUPA", "PAYER-MEDGULF", "PAYER-TAWUNIYA"])
            )
            self.send_claim(claim, f"10_Stress_Test_{i+1:02d}")
            time.sleep(0.1)  # 100ms between requests
    
    def test_scenario_11_edge_cases(self):
        """Test 11: Edge cases"""
        
        # Very high quantity
        claim = self._generate_claim(
            scenario_name="High Quantity Edge Case",
            services=["SBS-LAB-001"],
            facility_id=1,
            payer_id="PAYER-BUPA",
            quantity_multiplier=100
        )
        self.send_claim(claim, "11_Edge_High_Quantity")
        
        # Zero patient responsibility
        claim = self._generate_claim(
            scenario_name="Zero Patient Responsibility",
            services=["SBS-CONS-001"],
            facility_id=2,
            payer_id="PAYER-ACIG",
            patient_responsibility=0
        )
        self.send_claim(claim, "11_Edge_Zero_Patient_Responsibility")
        
        # Very old patient
        claim = self._generate_claim(
            scenario_name="Elderly Patient",
            services=["SBS-CONS-002", "SBS-LAB-002"],
            facility_id=3,
            payer_id="PAYER-MEDGULF",
            patient_age=95
        )
        self.send_claim(claim, "11_Edge_Elderly_Patient")
    
    def test_scenario_12_all_payers(self):
        """Test 12: Test all insurance providers"""
        payers = ["PAYER-BUPA", "PAYER-MEDGULF", "PAYER-TAWUNIYA", "PAYER-ACIG", "PAYER-SAGIA"]
        
        for payer in payers:
            claim = self._generate_claim(
                scenario_name=f"Payer Test - {payer}",
                services=["SBS-CONS-001", "SBS-LAB-001"],
                facility_id=1,
                payer_id=payer
            )
            self.send_claim(claim, f"12_All_Payers_{payer}")
            time.sleep(0.5)
    
    def test_scenario_13_all_service_categories(self):
        """Test 13: Test all service categories"""
        categories = {
            "Lab": ["SBS-LAB-001", "SBS-LAB-002"],
            "Radiology": ["SBS-RAD-001", "SBS-RAD-002"],
            "Consultation": ["SBS-CONS-001", "SBS-CONS-002"],
            "Surgery": ["SBS-SURG-001"],
            "Pharmacy": ["SBS-PHARM-001"],
            "Bundle": ["BUNDLE-CHECKUP-001"]
        }
        
        for category, services in categories.items():
            claim = self._generate_claim(
                scenario_name=f"Category Test - {category}",
                services=services[:1],  # Use first service
                facility_id=1,
                payer_id="PAYER-BUPA"
            )
            self.send_claim(claim, f"13_Category_{category}")
            time.sleep(0.5)
    
    def test_scenario_14_error_handling(self):
        """Test 14: Error handling and validation"""
        
        # Missing required fields
        incomplete_claim = {"claimHeader": {"claimId": "INCOMPLETE-001"}}
        self.send_claim(incomplete_claim, "14_Error_Incomplete_Data")
        
        # Invalid service codes
        claim = self._generate_claim(
            scenario_name="Invalid Service Codes",
            services=["INVALID-CODE-001"],
            facility_id=1,
            payer_id="PAYER-BUPA"
        )
        self.send_claim(claim, "14_Error_Invalid_Service_Code")
        
        # Future date
        claim = self._generate_claim(
            scenario_name="Future Date",
            services=["SBS-CONS-001"],
            facility_id=1,
            payer_id="PAYER-BUPA"
        )
        claim["claimHeader"]["submissionDate"] = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        self.send_claim(claim, "14_Error_Future_Date")
    
    def test_scenario_15_complex_claims(self):
        """Test 15: Complex claims with many items"""
        
        # 10 different services
        claim = self._generate_claim(
            scenario_name="Complex Claim - 10 Services",
            services=[
                "SBS-CONS-002", "SBS-LAB-001", "SBS-LAB-002", "SBS-LAB-003",
                "SBS-RAD-001", "SBS-RAD-004", "SBS-PHARM-001", "SBS-PHARM-002",
                "SBS-SURG-002", "SBS-CONS-004"
            ],
            facility_id=2,
            payer_id="PAYER-ACIG"
        )
        self.send_claim(claim, "15_Complex_10_Services")
        
        # Bundle + multiple individual services
        claim = self._generate_claim(
            scenario_name="Complex Claim - Bundle + Individual",
            services=[
                "BUNDLE-CHECKUP-001", "SBS-RAD-002", "SBS-PHARM-002", "SBS-CONS-002"
            ],
            facility_id=1,
            payer_id="PAYER-BUPA"
        )
        self.send_claim(claim, "15_Complex_Bundle_Plus_Individual")
    
    def _generate_claim(
        self,
        scenario_name: str,
        services: List[str],
        facility_id: int,
        payer_id: str,
        patient_id: Optional[str] = None,
        patient_age: int = 35,
        patient_gender: str = "M",
        quantity_multiplier: int = 1,
        patient_responsibility: Optional[float] = None
    ) -> Dict[str, Any]:
        """Generate a claim with specified parameters"""
        
        # Get facility and payer data
        facility = next(f for f in self.data_generator.HEALTHCARE_FACILITIES if f["id"] == facility_id)
        payer = next(p for p in self.data_generator.INSURANCE_PROVIDERS if p["id"] == payer_id)
        
        # Generate unique IDs
        claim_id = f"CLM-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        if not patient_id:
            patient_id = f"PAT-{random.randint(100000, 999999)}"
        
        # Calculate financial data
        total_net = 0
        claim_items = []
        
        for idx, service_code in enumerate(services, 1):
            service = self.data_generator.SBS_SERVICES.get(service_code, {})
            base_price = service.get("base_price", 100.0)
            quantity = quantity_multiplier
            net_price = base_price * quantity
            total_net += net_price
            
            claim_items.append({
                "itemSequence": idx,
                "serviceCode": service_code,
                "serviceDescription": service.get("desc_en", "Unknown Service"),
                "category": service.get("category", "General"),
                "unitPrice": base_price,
                "quantity": quantity,
                "netPrice": net_price,
                "bundleCode": None,
                "notes": f"Test service for {scenario_name}"
            })
        
        total_gross = total_net * facility["markup_rate"]
        allowed_amount = total_gross * 0.95  # 95% allowed
        
        if patient_responsibility is None:
            patient_responsibility = allowed_amount * 0.10  # 10% co-pay
        
        insurance_pays = allowed_amount - patient_responsibility
        
        # Build claim
        claim = {
            "claimHeader": {
                "claimId": claim_id,
                "claimType": "Professional",
                "submissionDate": datetime.now().strftime("%Y-%m-%d"),
                "claimStatus": "submitted",
                "facilityId": facility_id,
                "facilityName": facility["name"]
            },
            "patientInfo": {
                "patientName": f"Test Patient {patient_id}",
                "patientId": patient_id,
                "patientIqama": patient_id,
                "patientAge": patient_age,
                "patientGender": patient_gender,
                "dateOfBirth": (datetime.now() - timedelta(days=365*patient_age)).strftime("%Y-%m-%d")
            },
            "memberInfo": {
                "memberId": f"MEM-{patient_id}",
                "memberName": f"Test Patient {patient_id}",
                "memberRelation": "self",
                "groupId": f"GRP-{facility['code']}",
                "planId": f"PLAN-{payer_id}"
            },
            "payerInfo": {
                "payerId": payer["nphies_id"],
                "payerName": payer["name"],
                "payerType": payer["type"]
            },
            "claimItems": claim_items,
            "financialInfo": {
                "totalNetPrice": round(total_net, 2),
                "facilityTierMarkup": facility["markup_rate"],
                "totalGrossPrice": round(total_gross, 2),
                "allowedAmount": round(allowed_amount, 2),
                "patientResponsibility": round(patient_responsibility, 2),
                "insurancePays": round(insurance_pays, 2),
                "currency": "SAR"
            },
            "documentInfo": {
                "documentId": f"DOC-{claim_id}",
                "documentType": "invoice",
                "documentDate": datetime.now().strftime("%Y-%m-%d"),
                "attachments": []
            },
            "providerInfo": {
                "providerId": facility["code"],
                "providerName": facility["name"],
                "providerType": facility["type"],
                "accreditationTier": facility["accreditation_tier"],
                "licenseNumber": facility["chi_license"],
                "nphiesPayerId": payer["nphies_id"]
            },
            "contactInfo": {
                "submitterEmail": "test@sbs-testing.com",
                "submitterPhone": "+966-11-0000000",
                "submitterName": "Automated Test System",
                "submitterRole": "Test Automation"
            },
            "metadata": {
                "submissionTimestamp": datetime.now().isoformat(),
                "sourceSystem": "SBS-Test-Suite-v1.0",
                "claimVersion": "1.0",
                "processingMode": "online",
                "retryCount": 0,
                "remarks": f"Automated test: {scenario_name}"
            }
        }
        
        return claim
    
    def run_all_tests(self):
        """Run all test scenarios"""
        self.log("=" * 80, "INFO")
        self.log("SBS WORKFLOW COMPREHENSIVE TESTING SUITE", "INFO")
        self.log(f"Webhook URL: {self.webhook_url}", "INFO")
        self.log("=" * 80, "INFO")
        
        test_methods = [
            self.test_scenario_01_simple_outpatient,
            self.test_scenario_02_chronic_disease,
            self.test_scenario_03_emergency,
            self.test_scenario_04_high_cost,
            self.test_scenario_05_bundle_services,
            self.test_scenario_06_pediatric,
            self.test_scenario_07_maternity,
            self.test_scenario_08_surgical_package,
            self.test_scenario_09_multiple_facilities,
            self.test_scenario_10_stress_test,
            self.test_scenario_11_edge_cases,
            self.test_scenario_12_all_payers,
            self.test_scenario_13_all_service_categories,
            self.test_scenario_14_error_handling,
            self.test_scenario_15_complex_claims
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log(f"Test method failed: {test_method.__name__} - {str(e)}", "ERROR")
            time.sleep(1)  # Pause between test groups
        
        self.print_summary()
        self.save_report()
    
    def print_summary(self):
        """Print test summary"""
        self.log("=" * 80, "INFO")
        self.log("TEST SUMMARY", "INFO")
        self.log("=" * 80, "INFO")
        self.log(f"Total Tests: {len(self.test_results)}", "INFO")
        self.log(f"Passed: {self.success_count}", "SUCCESS")
        self.log(f"Failed: {self.failure_count}", "ERROR")
        
        success_rate = (self.success_count / len(self.test_results) * 100) if self.test_results else 0
        self.log(f"Success Rate: {success_rate:.1f}%", "INFO")
        
        # Response time stats
        response_times = [r["response_time"] for r in self.test_results if "response_time" in r]
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            min_time = min(response_times)
            max_time = max(response_times)
            self.log(f"Avg Response Time: {avg_time:.2f}s", "INFO")
            self.log(f"Min Response Time: {min_time:.2f}s", "INFO")
            self.log(f"Max Response Time: {max_time:.2f}s", "INFO")
        
        self.log("=" * 80, "INFO")
        
        # Show failed tests
        if self.failure_count > 0:
            self.log("FAILED TESTS:", "ERROR")
            for result in self.test_results:
                if not result["success"]:
                    self.log(f"  - {result['test_name']}: {result.get('error', 'Unknown error')}", "ERROR")
    
    def save_report(self):
        """Save detailed test report"""
        report_file = f"sbs_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report = {
            "test_run": {
                "timestamp": datetime.now().isoformat(),
                "webhook_url": self.webhook_url,
                "total_tests": len(self.test_results),
                "passed": self.success_count,
                "failed": self.failure_count,
                "success_rate": f"{(self.success_count / len(self.test_results) * 100) if self.test_results else 0:.1f}%"
            },
            "results": self.test_results
        }
        
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.log(f"Detailed report saved to: {report_file}", "INFO")
        return report_file


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 test_sbs_workflow_comprehensive.py <webhook_url>")
        print("Example: python3 test_sbs_workflow_comprehensive.py https://n8n.brainsait.cloud/webhook-test/sbs-claim-submission")
        sys.exit(1)
    
    webhook_url = sys.argv[1]
    tester = SBSWorkflowTester(webhook_url)
    tester.run_all_tests()


if __name__ == "__main__":
    main()
