"""
NPHIES Bridge Package
FHIR validation, error handling, logging, and integration with Saudi NPHIES platform
"""

__version__ = "1.0.0"
__author__ = "BrainSAIT"
__description__ = "NPHIES Bridge for Saudi healthcare integration"

# Export main components
from .config import get_config, Environment, ConfigManager, NPHIESConfig
from .oauth_client import OAuth2Client, get_oauth_client, TokenInfo
from .fhir_validator import FHIRValidator, validate_claim_bundle, ValidationResult
from .error_handler import ErrorHandler, ErrorContext, ValidationError, FHIRValidationError
from .logger import get_logger, LogCategory, timed_operation
from .edge_case_tester import EdgeCaseTester
from .integration_test import ComprehensiveIntegrationTest, run_comprehensive_test_suite
