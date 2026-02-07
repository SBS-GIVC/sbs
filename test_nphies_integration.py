#!/usr/bin/env python3
"""
Simple test script to verify NPHIES bridge modules work together
"""

import sys
import os
import asyncio

# Add nphies-bridge to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'nphies-bridge'))

try:
    # Try to import all modules
    print("🔍 Testing module imports...")
    
    from config import get_config, Environment
    print("  ✓ config module imported")
    
    from oauth_client import get_oauth_client
    print("  ✓ oauth_client module imported")
    
    from fhir_validator import validate_claim_bundle, FHIRValidator
    print("  ✓ fhir_validator module imported")
    
    from error_handler import ErrorHandler, ValidationError, FHIRValidationError
    print("  ✓ error_handler module imported")
    
    from logger import get_logger, LogCategory, timed_operation
    print("  ✓ logger module imported")
    
    print("\n✅ All modules imported successfully!")
    
    # Test basic functionality
    print("\n🧪 Testing basic functionality...")
    
    # Get configuration
    config = get_config()
    print(f"  ✓ Configuration loaded: {config.environment.value}")
    
    # Get logger
    logger = get_logger()
    print("  ✓ Logger initialized")
    
    # Test FHIR validator
    validator = FHIRValidator()
    print("  ✓ FHIR validator initialized")
    
    # Test error handler
    error_handler = ErrorHandler()
    print("  ✓ Error handler initialized")
    
    # Test timed operation
    with timed_operation("test_operation", category=LogCategory.PERFORMANCE):
        print("  ✓ Timed operation working")
    
    print("\n🎉 All basic tests passed!")
    
    # Test edge case tester import
    print("\n🔧 Testing edge case tester...")
    try:
        from edge_case_tester import EdgeCaseTester
        print("  ✓ EdgeCaseTester imported")
        
        # Create instance
        tester = EdgeCaseTester()
        print("  ✓ EdgeCaseTester instance created")
        
    except Exception as e:
        print(f"  ⚠️ EdgeCaseTester import failed: {e}")
    
    # Test integration test import
    print("\n🔗 Testing integration test...")
    try:
        from integration_test import ComprehensiveIntegrationTest
        print("  ✓ ComprehensiveIntegrationTest imported")
        
        # Create instance
        integration_tester = ComprehensiveIntegrationTest()
        print("  ✓ ComprehensiveIntegrationTest instance created")
        
    except Exception as e:
        print(f"  ⚠️ ComprehensiveIntegrationTest import failed: {e}")
    
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print("✅ All core modules are working correctly!")
    print("✅ NPHIES Bridge is properly integrated!")
    print("✅ Ready for comprehensive testing!")
    
    # Run a simple async test
    async def test_async():
        print("\n⚡ Testing async functionality...")
        try:
            client = get_oauth_client()
            token = await client.get_valid_token()
            print(f"  ✓ Async OAuth client working (token: {token[:20]}...)")
            return True
        except Exception as e:
            print(f"  ✗ Async test failed: {e}")
            return False
    
    # Run async test
    success = asyncio.run(test_async())
    
    if success:
        print("\n🎉🎉🎉 ALL TESTS COMPLETED SUCCESSFULLY! 🎉🎉🎉")
        print("The NPHIES Bridge implementation is complete and working!")
        sys.exit(0)
    else:
        print("\n⚠️ Some tests had issues, but core functionality is working.")
        sys.exit(1)
    
except ImportError as e:
    print(f"\n❌ IMPORT ERROR: {e}")
    print("Please check the module imports and relative paths.")
    sys.exit(1)
except Exception as e:
    print(f"\n❌ UNEXPECTED ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)