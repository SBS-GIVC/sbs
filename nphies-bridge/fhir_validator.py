"""
FHIR Validator for NPHIES Bridge
Validates FHIR resources against NPHIES specifications and Saudi healthcare standards
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from datetime import datetime
import re

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """Validation severity levels"""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ValidationResult:
    """Result of FHIR validation"""
    
    def __init__(self, resource_type: str, resource_id: str = None):
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.errors: List[Dict[str, Any]] = []
        self.warnings: List[Dict[str, Any]] = []
        self.info: List[Dict[str, Any]] = []
        self.is_valid = True
    
    def add_issue(self, severity: ValidationSeverity, code: str, description: str, 
                  path: str = None, details: Dict[str, Any] = None):
        """Add a validation issue"""
        issue = {
            "code": code,
            "description": description,
            "path": path,
            "details": details or {}
        }
        
        if severity == ValidationSeverity.ERROR:
            self.errors.append(issue)
            self.is_valid = False
        elif severity == ValidationSeverity.WARNING:
            self.warnings.append(issue)
        else:
            self.info.append(issue)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "info": self.info,
            "summary": {
                "error_count": len(self.errors),
                "warning_count": len(self.warnings),
                "info_count": len(self.info)
            }
        }
    
    def __str__(self) -> str:
        """String representation"""
        status = "✓ VALID" if self.is_valid else "✗ INVALID"
        return f"{status} {self.resource_type} ({self.resource_id or 'unknown'}) - {len(self.errors)} errors, {len(self.warnings)} warnings"


class FHIRValidator:
    """Validates FHIR resources against NPHIES specifications"""
    
    # NPHIES-specific requirements
    NPHIES_REQUIRED_EXTENSIONS = {
        "Patient": [
            "http://nphies.sa/extension/patient/national-id",
            "http://nphies.sa/extension/patient/insurance-number"
        ],
        "Coverage": [
            "http://nphies.sa/extension/coverage/policy-type",
            "http://nphies.sa/extension/coverage/benefit-period"
        ],
        "Claim": [
            "http://nphies.sa/extension/claim/facility-code",
            "http://nphies.sa/extension/claim/chi-license"
        ]
    }
    
    # Saudi-specific coding systems
    SAUDI_CODING_SYSTEMS = {
        "national_id": "http://nphies.sa/identifier/nationalid",
        "chi_license": "http://nphies.sa/identifier/chi-license",
        "payer_id": "http://nphies.sa/identifier/payer",
        "sbs_codes": "http://nphies.sa/codesystem/sbs",
        "coverage_class": "http://nphies.sa/codesystem/coverage-class",
        "organization_type": "http://nphies.sa/codesystem/organization-type",
        "diagnosis_type": "http://nphies.sa/codesystem/diagnosis-type",
        "claim_type": "http://nphies.sa/codesystem/claim-type"
    }
    
    # Required fields for each resource type
    REQUIRED_FIELDS = {
        "Patient": ["identifier", "name", "gender", "birthDate"],
        "Coverage": ["status", "beneficiary", "payor", "class"],
        "Organization": ["identifier", "name", "type"],
        "Claim": ["status", "type", "use", "patient", "created", "insurer", "provider", "insurance", "item", "total"]
    }
    
    def __init__(self, fhir_version: str = "R4"):
        self.fhir_version = fhir_version
        self.validators = {
            "Patient": self.validate_patient,
            "Coverage": self.validate_coverage,
            "Organization": self.validate_organization,
            "Claim": self.validate_claim,
            "Bundle": self.validate_bundle
        }
    
    def validate_resource(self, resource: Dict[str, Any]) -> ValidationResult:
        """Validate a FHIR resource"""
        resource_type = resource.get("resourceType")
        resource_id = resource.get("id")
        
        if not resource_type:
            result = ValidationResult("Unknown", resource_id)
            result.add_issue(
                ValidationSeverity.ERROR,
                "MISSING_RESOURCE_TYPE",
                "FHIR resource must have a resourceType field"
            )
            return result
        
        result = ValidationResult(resource_type, resource_id)
        
        # Check if we have a validator for this resource type
        if resource_type in self.validators:
            self.validators[resource_type](resource, result)
        else:
            result.add_issue(
                ValidationSeverity.WARNING,
                "UNSUPPORTED_RESOURCE_TYPE",
                f"No specific validator for resource type: {resource_type}"
            )
        
        # Apply general FHIR validation
        self.validate_general_fhir(resource, result)
        
        return result
    
    def validate_bundle(self, bundle: Dict[str, Any], result: ValidationResult):
        """Validate a FHIR Bundle"""
        # Check required fields
        if "type" not in bundle:
            result.add_issue(
                ValidationSeverity.ERROR,
                "MISSING_BUNDLE_TYPE",
                "Bundle must have a type field"
            )
        
        if "entry" not in bundle:
            result.add_issue(
                ValidationSeverity.ERROR,
                "MISSING_BUNDLE_ENTRIES",
                "Bundle must have entries"
            )
            return
        
        # Validate each entry in the bundle
        entries = bundle.get("entry", [])
        for i, entry in enumerate(entries):
            if "resource" not in entry:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    "MISSING_ENTRY_RESOURCE",
                    f"Bundle entry {i} is missing resource",
                    path=f"entry[{i}]"
                )
                continue
            
            # Validate the resource
            resource_result = self.validate_resource(entry["resource"])
            
            # Add issues from resource validation
            for error in resource_result.errors:
                error["path"] = f"entry[{i}].resource.{error.get('path', '')}"
                result.errors.append(error)
            
            for warning in resource_result.warnings:
                warning["path"] = f"entry[{i}].resource.{warning.get('path', '')}"
                result.warnings.append(warning)
            
            for info in resource_result.info:
                info["path"] = f"entry[{i}].resource.{info.get('path', '')}"
                result.info.append(info)
            
            if not resource_result.is_valid:
                result.is_valid = False
        
        # Check for required resources in claim submission bundle
        if bundle.get("type") == "message":
            resource_types = [e.get("resource", {}).get("resourceType") for e in entries]
            
            required_types = ["Patient", "Coverage", "Organization", "Claim"]
            for req_type in required_types:
                if req_type not in resource_types:
                    result.add_issue(
                        ValidationSeverity.ERROR,
                        "MISSING_REQUIRED_RESOURCE",
                        f"Claim submission bundle missing required resource: {req_type}"
                    )
    
    def validate_patient(self, patient: Dict[str, Any], result: ValidationResult):
        """Validate Patient resource"""
        # Check required fields
        self.check_required_fields("Patient", patient, result)
        
        # Validate identifier
        identifiers = patient.get("identifier", [])
        if not identifiers:
            result.add_issue(
                ValidationSeverity.ERROR,
                "MISSING_IDENTIFIER",
                "Patient must have at least one identifier",
                path="identifier"
            )
        else:
            # Check for Saudi National ID
            national_id_found = False
            for i, identifier in enumerate(identifiers):
                system = identifier.get("system", "")
                value = identifier.get("value", "")
                
                if system == self.SAUDI_CODING_SYSTEMS["national_id"]:
                    national_id_found = True
                    # Validate Saudi National ID format (10 digits)
                    if not re.match(r'^\d{10}$', str(value)):
                        result.add_issue(
                            ValidationSeverity.ERROR,
                            "INVALID_NATIONAL_ID_FORMAT",
                            f"Saudi National ID must be 10 digits, got: {value}",
                            path=f"identifier[{i}].value",
                            details={"value": value}
                        )
            
            if not national_id_found:
                result.add_issue(
                    ValidationSeverity.WARNING,
                    "MISSING_SAUDI_NATIONAL_ID",
                    "Patient missing Saudi National ID identifier",
                    path="identifier"
                )
        
        # Validate name
        names = patient.get("name", [])
        if not names:
            result.add_issue(
                ValidationSeverity.WARNING,
                "MISSING_NAME",
                "Patient should have at least one name",
                path="name"
            )
        
        # Validate gender
        gender = patient.get("gender", "").lower()
        valid_genders = ["male", "female", "other", "unknown"]
        if gender and gender not in valid_genders:
            result.add_issue(
                ValidationSeverity.WARNING,
                "INVALID_GENDER",
                f"Gender should be one of {valid_genders}, got: {gender}",
                path="gender",
                details={"value": gender}
            )
        
        # Validate birth date
        birth_date = patient.get("birthDate")
        if birth_date:
            try:
                datetime.fromisoformat(birth_date.replace('Z', '+00:00'))
            except ValueError:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    "INVALID_DATE_FORMAT",
                    f"Birth date must be in ISO 8601 format, got: {birth_date}",
                    path="birthDate",
                    details={"value": birth_date}
                )
    
    def validate_coverage(self, coverage: Dict[str, Any], result: ValidationResult):
        """Validate Coverage resource"""
        # Check required fields
        self.check_required_fields("Coverage", coverage, result)
        
        # Validate status
        status = coverage.get("status", "").lower()
        valid_statuses = ["active", "cancelled", "draft", "entered-in-error"]
        if status not in valid_statuses:
            result.add_issue(
                ValidationSeverity.ERROR,
                "INVALID_COVERAGE_STATUS",
                f"Coverage status must be one of {valid_statuses}, got: {status}",
                path="status",
                details={"value": status}
            )
        
        # Validate beneficiary reference
        beneficiary = coverage.get("beneficiary", {})
        if not beneficiary.get("reference", "").startswith("Patient/"):
            result.add_issue(
                ValidationSeverity.ERROR,
                "INVALID_BENEFICIARY_REFERENCE",
                "Coverage beneficiary must reference a Patient resource",
                path="beneficiary.reference",
                details={"value": beneficiary.get("reference")}
            )
        
        # Validate payor
        payors = coverage.get("payor", [])
        if not payors:
            result.add_issue(
                ValidationSeverity.ERROR,
                "MISSING_PAYOR",
                "Coverage must have at least one payor",
                path="payor"
            )
        else:
            for i, payor in enumerate(payors):
                identifier = payor.get("identifier", {})
                system = identifier.get("system", "")
                
                if system != self.SAUDI_CODING_SYSTEMS["payer_id"]:
                    result.add_issue(
                        ValidationSeverity.WARNING,
                        "NON_STANDARD_PAYOR_IDENTIFIER",
                        f"Payor identifier should use Saudi payer system, got: {system}",
                        path=f"payor[{i}].identifier.system",
                        details={"system": system}
                    )
        
        # Validate class (insurance class)
        classes = coverage.get("class", [])
        if not classes:
            result.add_issue(
                ValidationSeverity.WARNING,
                "MISSING_COVERAGE_CLASS",
                "Coverage should have class information",
                path="class"
            )
        else:
            for i, class_info in enumerate(classes):
                coding = class_info.get("type", {}).get("coding", [])
                if coding:
                    system = coding[0].get("system", "")
                    if system != self.SAUDI_CODING_SYSTEMS["coverage_class"]:
                        result.add_issue(
                            ValidationSeverity.WARNING,
                            "NON_STANDARD_COVERAGE_CLASS",
                            f"Coverage class should use Saudi coverage class system, got: {system}",
                            path=f"class[{i}].type.coding[0].system",
                            details={"system": system}
                        )
    
    def validate_organization(self, organization: Dict[str, Any], result: ValidationResult):
        """Validate Organization resource"""
        # Check required fields
        self.check_required_fields("Organization", organization, result)
        
        # Validate identifier (CHI License)
        identifiers = organization.get("identifier", [])
        chi_license_found = False
        
        for i, identifier in enumerate(identifiers):
            system = identifier.get("system", "")
            value = identifier.get("value", "")
            
            if system == self.SAUDI_CODING_SYSTEMS["chi_license"]:
                chi_license_found = True
                # Validate CHI license format (CHI-XXX-XXX)
                if not re.match(r'^CHI-[A-Z]{3}-\d{3}$', str(value)):
                    result.add_issue(
                        ValidationSeverity.WARNING,
                        "INVALID_CHI_LICENSE_FORMAT",
                        f"CHI license should follow format CHI-XXX-XXX, got: {value}",
                        path=f"identifier[{i}].value",
                        details={"value": value}
                    )
        
        if not chi_license_found:
            result.add_issue(
                ValidationSeverity.WARNING,
                "MISSING_CHI_LICENSE",
                "Organization should have CHI license identifier",
                path="identifier"
            )
        
        # Validate organization type
        org_types = organization.get("type", [])
        if org_types:
            coding = org_types[0].get("coding", [])
            if coding:
                system = coding[0].get("system", "")
                if system != self.SAUDI_CODING_SYSTEMS["organization_type"]:
                    result.add_issue(
                        ValidationSeverity.WARNING,
                        "NON_STANDARD_ORG_TYPE",
                        f"Organization type should use Saudi organization type system, got: {system}",
                        path="type[0].coding[0].system",
                        details={"system": system}
                    )
    
    def validate_claim(self, claim: Dict[str, Any], result: ValidationResult):
        """Validate Claim resource"""
        # Check required fields
        self.check_required_fields("Claim", claim, result)
        
        # Validate claim type
        claim_type = claim.get("type", {}).get("coding", [])
        if claim_type:
            system = claim_type[0].get("system", "")
            if system != self.SAUDI_CODING_SYSTEMS["claim_type"]:
                result.add_issue(
                    ValidationSeverity.WARNING,
                    "NON_STANDARD_CLAIM_TYPE",
                    f"Claim type should use Saudi claim type system, got: {system}",
                    path="type.coding[0].system",
                    details={"system": system}
                )
        
        # Validate patient reference
        patient_ref = claim.get("patient", {}).get("reference", "")
        if not patient_ref.startswith("Patient/"):
            result.add_issue(
                ValidationSeverity.ERROR,
                "INVALID_PATIENT_REFERENCE",
                "Claim patient must reference a Patient resource",
                path="patient.reference",
                details={"value": patient_ref}
            )
        
        # Validate provider reference
        provider_ref = claim.get("provider", {}).get("reference", "")
        if not provider_ref.startswith("Organization/"):
            result.add_issue(
                ValidationSeverity.ERROR,
                "INVALID_PROVIDER_REFERENCE",
                "Claim provider must reference an Organization resource",
                path="provider.reference",
                details={"value": provider_ref}
            )
        
        # Validate insurance
        insurance_list = claim.get("insurance", [])
        if not insurance_list:
            result.add_issue(
                ValidationSeverity.ERROR,
                "MISSING_INSURANCE",
                "Claim must have at least one insurance entry",
                path="insurance"
            )
        else:
            for i, insurance in enumerate(insurance_list):
                coverage_ref = insurance.get("coverage", {}).get("reference", "")
                if not coverage_ref.startswith("Coverage/"):
                    result.add_issue(
                        ValidationSeverity.ERROR,
                        "INVALID_COVERAGE_REFERENCE",
                        f"Insurance coverage must reference a Coverage resource, got: {coverage_ref}",
                        path=f"insurance[{i}].coverage.reference",
                        details={"value": coverage_ref}
                    )
        
        # Validate diagnosis
        diagnosis_list = claim.get("diagnosis", [])
        if not diagnosis_list:
            result.add_issue(
                ValidationSeverity.WARNING,
                "MISSING_DIAGNOSIS",
                "Claim should have at least one diagnosis",
                path="diagnosis"
            )
        else:
            for i, diagnosis in enumerate(diagnosis_list):
                # Check diagnosis coding
                coding_list = diagnosis.get("diagnosisCodeableConcept", {}).get("coding", [])
                if not coding_list:
                    result.add_issue(
                        ValidationSeverity.WARNING,
                        "MISSING_DIAGNOSIS_CODING",
                        f"Diagnosis {i+1} should have coding",
                        path=f"diagnosis[{i}].diagnosisCodeableConcept.coding"
                    )
                else:
                    # Check for ICD-10 coding system
                    icd10_found = False
                    for j, coding in enumerate(coding_list):
                        system = coding.get("system", "")
                        if "icd-10" in system.lower():
                            icd10_found = True
                            # Validate ICD-10 code format
                            code = coding.get("code", "")
                            if not re.match(r'^[A-Z]\d{2}(\.\d{1,4})?$', code):
                                result.add_issue(
                                    ValidationSeverity.WARNING,
                                    "INVALID_ICD10_FORMAT",
                                    f"ICD-10 code should follow format A00.0, got: {code}",
                                    path=f"diagnosis[{i}].diagnosisCodeableConcept.coding[{j}].code",
                                    details={"code": code}
                                )
                    
                    if not icd10_found:
                        result.add_issue(
                            ValidationSeverity.WARNING,
                            "MISSING_ICD10_CODING",
                            f"Diagnosis {i+1} should have ICD-10 coding",
                            path=f"diagnosis[{i}].diagnosisCodeableConcept.coding"
                        )
        
        # Validate items
        items = claim.get("item", [])
        if not items:
            result.add_issue(
                ValidationSeverity.ERROR,
                "MISSING_ITEMS",
                "Claim must have at least one item",
                path="item"
            )
        else:
            for i, item in enumerate(items):
                # Check SBS coding
                coding_list = item.get("productOrService", {}).get("coding", [])
                sbs_found = False
                
                for j, coding in enumerate(coding_list):
                    system = coding.get("system", "")
                    if system == self.SAUDI_CODING_SYSTEMS["sbs_codes"]:
                        sbs_found = True
                        # Validate SBS code format (SBS-XXX-XXX)
                        code = coding.get("code", "")
                        if not re.match(r'^SBS-[A-Z]{3}-\d{3}$', code):
                            result.add_issue(
                                ValidationSeverity.WARNING,
                                "INVALID_SBS_CODE_FORMAT",
                                f"SBS code should follow format SBS-XXX-XXX, got: {code}",
                                path=f"item[{i}].productOrService.coding[{j}].code",
                                details={"code": code}
                            )
                
                if not sbs_found:
                    result.add_issue(
                        ValidationSeverity.WARNING,
                        "MISSING_SBS_CODING",
                        f"Item {i+1} should have SBS coding",
                        path=f"item[{i}].productOrService.coding"
                    )
                
                # Validate quantity
                quantity = item.get("quantity", {}).get("value")
                if quantity is None or quantity <= 0:
                    result.add_issue(
                        ValidationSeverity.ERROR,
                        "INVALID_QUANTITY",
                        f"Item {i+1} must have positive quantity",
                        path=f"item[{i}].quantity.value",
                        details={"value": quantity}
                    )
                
                # Validate unit price
                unit_price = item.get("unitPrice", {}).get("value")
                if unit_price is None or unit_price < 0:
                    result.add_issue(
                        ValidationSeverity.ERROR,
                        "INVALID_UNIT_PRICE",
                        f"Item {i+1} must have non-negative unit price",
                        path=f"item[{i}].unitPrice.value",
                        details={"value": unit_price}
                    )
        
        # Validate total amount
        total = claim.get("total", {})
        total_value = total.get("value")
        total_currency = total.get("currency", "")
        
        if total_value is None:
            result.add_issue(
                ValidationSeverity.ERROR,
                "MISSING_TOTAL_AMOUNT",
                "Claim must have total amount",
                path="total.value"
            )
        elif total_value < 0:
            result.add_issue(
                ValidationSeverity.ERROR,
                "INVALID_TOTAL_AMOUNT",
                f"Total amount must be non-negative, got: {total_value}",
                path="total.value",
                details={"value": total_value}
            )
        
        if total_currency != "SAR":
            result.add_issue(
                ValidationSeverity.WARNING,
                "NON_SAUDI_CURRENCY",
                f"Currency should be SAR for Saudi claims, got: {total_currency}",
                path="total.currency",
                details={"currency": total_currency}
            )
    
    def validate_general_fhir(self, resource: Dict[str, Any], result: ValidationResult):
        """Apply general FHIR validation rules"""
        resource_type = result.resource_type
        
        # Check for required fields
        self.check_required_fields(resource_type, resource, result)
        
        # Validate resource ID format
        resource_id = resource.get("id")
        if resource_id:
            # FHIR IDs should be alphanumeric with hyphens
            if not re.match(r'^[A-Za-z0-9\-\.]{1,64}$', resource_id):
                result.add_issue(
                    ValidationSeverity.WARNING,
                    "INVALID_RESOURCE_ID",
                    f"Resource ID should be alphanumeric with hyphens, got: {resource_id}",
                    path="id",
                    details={"id": resource_id}
                )
        
        # Validate meta field if present
        meta = resource.get("meta")
        if meta:
            last_updated = meta.get("lastUpdated")
            if last_updated:
                try:
                    datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                except ValueError:
                    result.add_issue(
                        ValidationSeverity.WARNING,
                        "INVALID_LAST_UPDATED",
                        f"lastUpdated must be in ISO 8601 format, got: {last_updated}",
                        path="meta.lastUpdated",
                        details={"value": last_updated}
                    )
    
    def check_required_fields(self, resource_type: str, resource: Dict[str, Any], result: ValidationResult):
        """Check required fields for a resource type"""
        required_fields = self.REQUIRED_FIELDS.get(resource_type, [])
        
        for field in required_fields:
            if field not in resource:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    "MISSING_REQUIRED_FIELD",
                    f"{resource_type} must have field: {field}",
                    path=field
                )
    
    def validate_bundle_complete(self, bundle: Dict[str, Any]) -> ValidationResult:
        """Validate complete bundle for NPHIES submission"""
        result = self.validate_resource(bundle)
        
        if bundle.get("resourceType") != "Bundle":
            result.add_issue(
                ValidationSeverity.ERROR,
                "INVALID_RESOURCE_TYPE",
                "Expected Bundle resource"
            )
            return result
        
        if bundle.get("type") != "message":
            result.add_issue(
                ValidationSeverity.WARNING,
                "NON_MESSAGE_BUNDLE",
                "NPHIES submission should use Bundle type 'message'",
                path="type"
            )
        
        return result
    
    def validate_claim_submission(self, bundle: Dict[str, Any]) -> ValidationResult:
        """Validate complete claim submission bundle"""
        result = self.validate_bundle_complete(bundle)
        
        if not result.is_valid:
            return result
        
        # Check for specific NPHIES requirements
        entries = bundle.get("entry", [])
        
        # Count resource types
        resource_counts = {}
        for entry in entries:
            resource = entry.get("resource", {})
            resource_type = resource.get("resourceType")
            if resource_type:
                resource_counts[resource_type] = resource_counts.get(resource_type, 0) + 1
        
        # Ensure we have exactly one of each required resource
        required_resources = ["Patient", "Coverage", "Organization", "Claim"]
        for req_type in required_resources:
            count = resource_counts.get(req_type, 0)
            if count == 0:
                result.add_issue(
                    ValidationSeverity.ERROR,
                    "MISSING_REQUIRED_RESOURCE",
                    f"Claim submission requires exactly one {req_type} resource"
                )
            elif count > 1:
                result.add_issue(
                    ValidationSeverity.WARNING,
                    "MULTIPLE_RESOURCES",
                    f"Claim submission has {count} {req_type} resources, expected 1"
                )
        
        return result


# Utility functions for easy validation
def validate_fhir_resource(resource: Dict[str, Any]) -> ValidationResult:
    """Convenience function to validate a FHIR resource"""
    validator = FHIRValidator()
    return validator.validate_resource(resource)


def validate_claim_bundle(bundle: Dict[str, Any]) -> ValidationResult:
    """Convenience function to validate a claim submission bundle"""
    validator = FHIRValidator()
    return validator.validate_claim_submission(bundle)


def print_validation_result(result: ValidationResult):
    """Print validation result in a readable format"""
    print(str(result))
    
    if result.errors:
        print("\n❌ ERRORS:")
        for error in result.errors:
            print(f"  • {error['code']}: {error['description']}")
            if error.get('path'):
                print(f"    Path: {error['path']}")
            if error.get('details'):
                print(f"    Details: {error['details']}")
    
    if result.warnings:
        print("\n⚠️  WARNINGS:")
        for warning in result.warnings:
            print(f"  • {warning['code']}: {warning['description']}")
            if warning.get('path'):
                print(f"    Path: {warning['path']}")
    
    if result.info:
        print("\nℹ️  INFO:")
        for info in result.info:
            print(f"  • {info['code']}: {info['description']}")


# Test the validator
if __name__ == "__main__":
    import json
    
    # Load sample FHIR bundle
    sample_bundle = {
        "resourceType": "Bundle",
        "type": "message",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "PAT-001",
                    "identifier": [
                        {
                            "system": "http://nphies.sa/identifier/nationalid",
                            "value": "1012345678"
                        }
                    ],
                    "name": [{"text": "Ahmed Al-Rashid"}],
                    "gender": "male",
                    "birthDate": "1985-06-15"
                }
            }
        ]
    }
    
    print("🧪 Testing FHIR Validator")
    print("=" * 50)
    
    # Test individual resource validation
    patient = sample_bundle["entry"][0]["resource"]
    result = validate_fhir_resource(patient)
    print_validation_result(result)
    
    print("\n" + "=" * 50)
    
    # Test bundle validation
    bundle_result = validate_claim_bundle(sample_bundle)
    print_validation_result(bundle_result)
    
    print("\n" + "=" * 50)
    print("✅ FHIR Validator test completed")
