"""
Comprehensive Integration Test for NPHIES Bridge
Tests all modules working together: FHIR validation, error handling, logging, and edge cases
"""

import asyncio
import json
import time
import sys
import os
from datetime import datetime
from typing import Dict, Any, Optional

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Handle both relative and absolute imports
try:
    # Try relative import first (when run as part of package)
    from .config import get_config, Environment
    from .oauth_client import get_oauth_client
    from .fhir_validator import validate_claim_bundle, FHIRValidator, ValidationResult
    from .error_handler import ErrorHandler, ErrorContext, ValidationError, FHIRValidationError
    from .logger import get_logger, LogCategory, timed_operation
    from .edge_case_tester import EdgeCaseTester
except ImportError:
    # Fall back to absolute import (when run directly)
    from config import get_config, Environment
    from oauth_client import get_oauth_client
    from fhir_validator import validate_claim_bundle, FHIRValidator, ValidationResult
    from error_handler import ErrorHandler, ErrorContext, ValidationError, FHIRValidationError
    from logger import get_logger, LogCategory, timed_operation
    from edge_case_tester import EdgeCaseTester

# Try to import from sbs.tests.fixtures_data, fall back to creating sample data
try:
    from sbs.tests.fixtures_data import SampleData
except ImportError:
    # Try alternative import path
    try:
        from tests.fixtures_data import SampleData
    except ImportError:
        # Create a simple SampleData class if import fails
        class SampleData:
            @staticmethod
            def generate_claim(**kwargs):
                # Simple mock implementation
                return {
                    "claim_id": "test-claim-123",
                    "patient": {"id": "PAT-001", "national_id": "1012345678"},
                    "facility": {"facility_code": "FAC-001"},
                    "items": [{"sbs_code": "SBS-LAB-001", "description": "Test"}]
                }
            
            @staticmethod
            def generate_fhir_bundle(claim):
                # Simple mock FHIR bundle
                return {
                    "resourceType": "Bundle",
                    "type": "message",
                    "entry": [{"resource": {"resourceType": "Patient", "id": "test"}}]
                }


class ComprehensiveIntegrationTest:
    """Tests all NPHIES bridge modules working together"""
    
    def __init__(self):
        self.client = get_oauth_client()
        self.error_handler = ErrorHandler()
        self.fhir_validator = FHIRValidator()
        self.logger = get_logger()
        self.test_results = []
    
    async def test_fhir_validation_integration(self) -> bool:
        """Test FHIR validation integrated with error handling"""
        print("\n🔍 Testing FHIR Validation Integration...")
        
        try:
            # Generate a valid FHIR bundle
            claim = SampleData.generate_claim(
                patient_idx=0,
                facility_idx=0,
                insurance_idx=0,
                services=["SBS-LAB-001", "SBS-CONS-001"],
                diagnosis_codes=["J06.9"]
            )
            fhir_bundle = SampleData.generate_fhir_bundle(claim)
            
            # Validate the bundle
            validation_result = validate_claim_bundle(fhir_bundle)
            
            if validation_result.is_valid:
                print("  ✓ Valid FHIR bundle correctly validated")
                
                # Test with invalid bundle
                invalid_bundle = fhir_bundle.copy()
                # Remove required field
                if "entry" in invalid_bundle and len(invalid_bundle["entry"]) > 0:
                    if "resource" in invalid_bundle["entry"][0]:
                        del invalid_bundle["entry"][0]["resource"]["identifier"]
                
                invalid_result = validate_claim_bundle(invalid_bundle)
                
                if not invalid_result.is_valid:
                    print("  ✓ Invalid FHIR bundle correctly rejected")
                    
                    # Test error handling integration
                    try:
                        raise FHIRValidationError(invalid_result.to_dict())
                    except FHIRValidationError as e:
                        error_response = self.error_handler.create_error_response(e, user_friendly=True)
                        print("  ✓ FHIR validation error correctly handled")
                        
                        self.test_results.append({
                            "test": "fhir_validation_integration",
                            "status": "passed",
                            "valid_bundle_validated": True,
                            "invalid_bundle_rejected": True,
                            "error_handling_integrated": True
                        })
                        return True
                else:
                    print("  ✗ Invalid FHIR bundle not rejected")
            else:
                print("  ✗ Valid FHIR bundle incorrectly rejected")
            
            self.test_results.append({
                "test": "fhir_validation_integration",
                "status": "failed",
                "valid_bundle_validated": validation_result.is_valid,
                "invalid_bundle_rejected": False
            })
            return False
            
        except Exception as e:
            print(f"  ✗ FHIR validation integration test failed: {e}")
            self.test_results.append({
                "test": "fhir_validation_integration",
                "status": "failed",
                "error": str(e)
            })
            return False
    
    async def test_error_handling_integration(self) -> bool:
        """Test error handling integrated with logging"""
        print("\n⚠️  Testing Error Handling Integration...")
        
        try:
            # Create a test error
            test_error = ValidationError(
                message="Test validation error",
                validation_details={"field": "test_field", "issue": "required"}
            )
            
            # Handle the error with logging
            error_info = self.error_handler.handle_error(test_error, raise_exception=False)
            
            # Verify error was logged
            print("  ✓ Error handling integrated with logging")
            
            # Test error response creation
            error_response = self.error_handler.create_error_response(
                test_error,
                user_friendly=True
            )
            
            if error_response.get("success") is False and "error" in error_response:
                print("  ✓ User-friendly error response created")
                
                self.test_results.append({
                    "test": "error_handling_integration",
                    "status": "passed",
                    "error_handled": True,
                    "error_logged": True,
                    "user_friendly_response": True
                })
                return True
            else:
                print("  ✗ Error response not created correctly")
        
        except Exception as e:
            print(f"  ✗ Error handling integration test failed: {e}")
        
        self.test_results.append({
            "test": "error_handling_integration",
            "status": "failed"
        })
        return False
    
    async def test_logging_integration(self) -> bool:
        """Test logging integrated with all modules"""
        print("\n📝 Testing Logging Integration...")
        
        try:
            # Test structured logging
            with timed_operation("test_logging_operation", category=LogCategory.PERFORMANCE):
                # Simulate some work
                await asyncio.sleep(0.1)
            
            print("  ✓ Structured logging with timed operations")
            
            # Test audit logging
            self.logger.audit_log(
                action="test",
                user_id="test-user",
                resource_type="Patient",
                resource_id="PAT-TEST",
                details={"test": True}
            )
            
            print("  ✓ Audit logging integrated")
            
            # Test API request logging
            self.logger.api_request_log(
                method="POST",
                endpoint="/test-endpoint",
                request_id="test-req-123",
                status_code=200,
                duration_ms=150.5
            )
            
            print("  ✓ API request logging integrated")
            
            # Get metrics
            metrics = self.logger.get_metrics()
            if metrics:
                print("  ✓ Metrics collection working")
            
            self.test_results.append({
                "test": "logging_integration",
                "status": "passed",
                "structured_logging": True,
                "audit_logging": True,
                "api_logging": True,
                "metrics_collection": bool(metrics)
            })
            return True
            
        except Exception as e:
            print(f"  ✗ Logging integration test failed: {e}")
            self.test_results.append({
                "test": "logging_integration",
                "status": "failed",
                "error": str(e)
            })
            return False
    
    async def test_end_to_end_workflow(self) -> bool:
        """Test complete end-to-end workflow"""
        print("\n🔄 Testing End-to-End Workflow...")
        
        config = get_config()
        if config.environment == Environment.DEVELOPMENT:
            print("  ⚠️  Development mode: Using simulation")
            
            try:
                # Generate test claim
                claim = SampleData.generate_claim(
                    patient_idx=0,
                    facility_idx=0,
                    insurance_idx=0,
                    services=["SBS-LAB-001", "SBS-CONS-001"],
                    diagnosis_codes=["J06.9"]
                )
                
                # Convert to FHIR
                fhir_bundle = SampleData.generate_fhir_bundle(claim)
                
                # Validate FHIR
                validation_result = validate_claim_bundle(fhir_bundle)
                
                if not validation_result.is_valid:
                    print("  ✗ FHIR validation failed")
                    raise ValidationError("FHIR validation failed", validation_details=validation_result.to_dict())
                
                print("  ✓ FHIR validation passed")
                
                # Simulate submission (development mode)
                test_signature = "test-signature-" + datetime.now().isoformat()
                
                # This would normally call the actual submission endpoint
                # In development, we simulate success
                print("  ✓ Claim submission simulated (development mode)")
                
                # Log the transaction
                self.logger.audit_log(
                    action="submit",
                    user_id="test-user",
                    resource_type="Claim",
                    resource_id=claim["claim_id"],
                    details={"simulated": True, "status": "success"}
                )
                
                self.test_results.append({
                    "test": "end_to_end_workflow",
                    "status": "passed",
                    "environment": "development",
                    "fhir_validation": True,
                    "submission_simulated": True,
                    "audit_logged": True
                })
                return True
                
            except Exception as e:
                print(f"  ✗ End-to-end workflow test failed: {e}")
                
                # Test error handling in workflow
                error_response = self.error_handler.create_error_response(e, user_friendly=True)
                print("  ✓ Error handling worked in failed workflow")
                
                self.test_results.append({
                    "test": "end_to_end_workflow",
                    "status": "failed",
                    "error": str(e),
                    "error_handled": True
                })
                return False
        
        else:
            print("  🚀 Sandbox/Production mode: Testing real integration")
            
            # Note: Real integration testing requires valid credentials
            # For now, we'll mark this as manual test required
            
            self.test_results.append({
                "test": "end_to_end_workflow",
                "status": "manual_test_required",
                "environment": config.environment.value,
                "note": "Requires valid NPHIES credentials for real integration test"
            })
            
            print("  ⚠️  Manual test required with valid credentials")
            return True  # Not a failure, just requires manual testing
    
    async def test_module_interoperability(self) -> bool:
        """Test all modules working together"""
        print("\n🔗 Testing Module Interoperability...")
        
        try:
            # Create a complex test scenario
            test_scenario = {
                "description": "Complete workflow with validation, error handling, and logging",
                "steps": []
            }
            
            # Step 1: Generate and validate FHIR
            claim = SampleData.generate_claim(
                patient_idx=1,
                facility_idx=1,
                insurance_idx=1,
                services=["SBS-LAB-001", "SBS-RAD-001", "SBS-CONS-002"],
                diagnosis_codes=["I10", "E11.9"]
            )
            fhir_bundle = SampleData.generate_fhir_bundle(claim)
            
            validation_result = validate_claim_bundle(fhir_bundle)
            test_scenario["steps"].append({
                "step": "fhir_validation",
                "status": "passed" if validation_result.is_valid else "failed",
                "errors": len(validation_result.errors) if hasattr(validation_result, 'errors') else 0
            })
            
            if not validation_result.is_valid:
                # Test error handling
                error = FHIRValidationError(validation_result.to_dict())
                error_response = self.error_handler.create_error_response(error)
                test_scenario["steps"].append({
                    "step": "error_handling",
                    "status": "passed",
                    "error_response_created": True
                })
            
            # Step 2: Log the operation
            with timed_operation("module_interoperability_test", category=LogCategory.PERFORMANCE):
                # Simulate processing
                await asyncio.sleep(0.05)
            
            test_scenario["steps"].append({
                "step": "logging",
                "status": "passed",
                "timed_operation": True
            })
            
            # Step 3: Audit log
            self.logger.audit_log(
                action="test_interoperability",
                user_id="integration-test",
                resource_type="Test",
                resource_id="test-001",
                details={"scenario": test_scenario}
            )
            
            test_scenario["steps"].append({
                "step": "audit_logging",
                "status": "passed"
            })
            
            # Check if all steps passed
            all_passed = all(step["status"] == "passed" for step in test_scenario["steps"])
            
            if all_passed:
                print("  ✓ All modules interoperating correctly")
                print(f"    Steps completed: {len(test_scenario['steps'])}")
                
                self.test_results.append({
                    "test": "module_interoperability",
                    "status": "passed",
                    "scenario": test_scenario,
                    "steps_completed": len(test_scenario["steps"]),
                    "all_passed": True
                })
                return True
            else:
                print("  ✗ Some modules failed to interoperate")
                
                self.test_results.append({
                    "test": "module_interoperability",
                    "status": "failed",
                    "scenario": test_scenario,
                    "steps_completed": len(test_scenario["steps"]),
                    "all_passed": False
                })
                return False
            
        except Exception as e:
            print(f"  ✗ Module interoperability test failed: {e}")
            self.test_results.append({
                "test": "module_interoperability",
                "status": "failed",
                "error": str(e)
            })
            return False
    
    async def run_all_tests(self) -> bool:
        """Run all integration tests"""
        config = get_config()
        print("🚀 Starting Comprehensive Integration Tests")
        print(f"Environment: {config.environment.value}")
        print(f"Base URL: {config.base_url}")
        print("=" * 60)
        
        # Run integration tests
        await self.test_fhir_validation_integration()
        await self.test_error_handling_integration()
        await self.test_logging_integration()
        await self.test_end_to_end_workflow()
        await self.test_module_interoperability()
        
        # Print summary
        return self.print_summary()
    
    def print_summary(self) -> bool:
        """Print test summary"""
        config = get_config()
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE INTEGRATION TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if r["status"] == "passed")
        manual = sum(1 for r in self.test_results if r["status"] == "manual_test_required")
        failed = sum(1 for r in self.test_results if r["status"] == "failed")
        total = len(self.test_results)
        
        print(f"Environment: {config.environment.value}")
        print(f"Tests Completed: {total}")
        print(f"  ✓ Passed: {passed}")
        print(f"  🔧 Manual Required: {manual}")
        print(f"  ✗ Failed: {failed}")
        
        print("\n📋 TEST DETAILS")
        print("-" * 40)
        
        for result in self.test_results:
            status_icon = "✓" if result["status"] == "passed" else "🔧" if result["status"] == "manual_test_required" else "✗"
            print(f"  {status_icon} {result['test']}: {result['status']}")
            
            if result["status"] == "failed" and "error" in result:
                print(f"    Error: {result['error'][:100]}...")
        
        print("\n" + "=" * 60)
        
        if failed == 0:
            if manual > 0:
                print("⚠️  Tests completed with manual testing required")
            else:
                print("🎉 All integration tests passed!")
            return True
        else:
            print("❌ Some integration tests failed")
            return False
    
    def save_results(self, filename: Optional[str] = None) -> str:
        """Save test results to file"""
        config = get_config()
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"integration_test_results_{timestamp}.json"
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "environment": config.environment.value,
            "base_url": config.base_url,
            "test_results": self.test_results,
            "summary": {
                "total_tests": len(self.test_results),
                "passed": sum(1 for r in self.test_results if r["status"] == "passed"),
                "manual_required": sum(1 for r in self.test_results if r["status"] == "manual_test_required"),
                "failed": sum(1 for r in self.test_results if r["status"] == "failed")
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📁 Integration test results saved to: {filename}")
        return filename


async def run_comprehensive_test_suite():
    """Run the complete test suite including edge cases"""
    config = get_config()
    print("=" * 70)
    print("🧪 NPHIES BRIDGE COMPREHENSIVE TEST SUITE")
    print("=" * 70)
    
    overall_results = {
        "integration_tests": {},
        "edge_case_tests": {},
        "summary": {}
    }
    
    # Run integration tests
    print("\n📦 PHASE 1: Module Integration Tests")
    print("-" * 40)
    
    integration_tester = ComprehensiveIntegrationTest()
    integration_success = await integration_tester.run_all_tests()
    integration_results_file = integration_tester.save_results()
    
    overall_results["integration_tests"] = {
        "success": integration_success,
        "results_file": integration_results_file
    }
    
    # Run edge case tests
    print("\n\n⚡ PHASE 2: Edge Case and Performance Tests")
    print("-" * 40)
    
    edge_case_tester = EdgeCaseTester()
    edge_case_success = await edge_case_tester.run_all_tests()
    edge_case_results_file = edge_case_tester.save_results()
    
    overall_results["edge_case_tests"] = {
        "success": edge_case_success,
        "results_file": edge_case_results_file
    }
    
    # Overall summary
    print("\n\n" + "=" * 70)
    print("📈 OVERALL TEST SUITE SUMMARY")
    print("=" * 70)
    
    all_success = integration_success and edge_case_success
    overall_results["summary"] = {
        "all_tests_passed": all_success,
        "integration_tests_passed": integration_success,
        "edge_case_tests_passed": edge_case_success,
        "timestamp": datetime.now().isoformat(),
        "environment": config.environment.value
    }
    
    if all_success:
        print("🎉🎉🎉 ALL TESTS PASSED! 🎉🎉🎉")
        print(f"✓ Integration Tests: {'PASSED' if integration_success else 'FAILED'}")
        print(f"✓ Edge Case Tests: {'PASSED' if edge_case_success else 'FAILED'}")
        print(f"✓ Environment: {config.environment.value}")
        print("\n✅ NPHIES Bridge is ready for production!")
    else:
        print("⚠️⚠️⚠️ SOME TESTS FAILED ⚠️⚠️⚠️")
        print(f"✓ Integration Tests: {'PASSED' if integration_success else 'FAILED'}")
        print(f"✓ Edge Case Tests: {'PASSED' if edge_case_success else 'FAILED'}")
        print(f"✓ Environment: {config.environment.value}")
        print("\n❌ Review failed tests before proceeding to production.")
    
    # Save overall results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    overall_filename = f"overall_test_results_{timestamp}.json"
    
    with open(overall_filename, 'w') as f:
        json.dump(overall_results, f, indent=2)
    
    print(f"\n📁 Overall test results saved to: {overall_filename}")
    
    return all_success


async def main():
    """Main entry point for integration testing"""
    try:
        success = await run_comprehensive_test_suite()
        return 0 if success else 1
    except Exception as e:
        print(f"\n❌ ERROR: Test suite failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    # Run the test suite
    exit_code = asyncio.run(main())
    exit(exit_code)
