import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "nphies-bridge"))

from terminology_catalog import NPHIESTerminologyCatalog  # noqa: E402


def _write_csv(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def test_catalog_loads_wrapped_appendix_and_forward_fills_system(tmp_path: Path):
    _write_csv(
        tmp_path / "Appendix=benefit-type-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Code,Display,Display,CodeSystem,",
                "benefit,Benefit,Maximum benefit allowable,http://nphies.sa/terminology/CodeSystem/benefit-type,",
                "deductible,Deductible,Cost to be incurred before benefits are applied,,",
            ]
        ),
    )
    _write_csv(
        tmp_path / "nphies CodeSystems-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Changed,code system,CS Version,name,Title,CS Description,CS Committee,CS OID,CS Copyright,CS Source Resource,code,Display,Definition,Appendix",
                ",http://hl7.org/fhir/fm-status,4.0.1,FinancialResourceStatusCodes,Financial Resource Status Codes,This set of codes includes Status codes.,Financial Management Work Group,fm-status,HL7 International.,codesystem-fm-status.json,active,Active,The instance is currently in-force.,",
                ",,,,,,,,,,cancelled,Cancelled,The instance is withdrawn,,",
            ]
        ),
    )
    _write_csv(
        tmp_path / "nphies ValueSets-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Changed,value set,VS Version,name,Title,VS Definition,VS Committee,VS ID,Restrictions,VS source Resource,CodeSystem  url,CS url validation",
                "TRUE,http://nphies.sa/terminology/ValueSet/benefit-type,1.0.0,BenefitType,Benefit Type,Definition,nphies profiles committee,benefit-type,,,http://nphies.sa/terminology/CodeSystem/benefit-type,http://nphies.sa/terminology/CodeSystem/benefit-type",
            ]
        ),
    )

    catalog = NPHIESTerminologyCatalog(reference_dir=str(tmp_path))
    summary = catalog.summary()

    assert summary["available"] is True
    assert summary["code_system_count"] >= 2
    assert summary["code_count"] >= 4
    assert catalog.lookup("http://nphies.sa/terminology/CodeSystem/benefit-type", "benefit")
    assert catalog.lookup("http://nphies.sa/terminology/CodeSystem/benefit-type", "deductible")
    assert catalog.lookup("http://hl7.org/fhir/fm-status", "active")
    assert catalog.lookup("http://hl7.org/fhir/fm-status", "cancelled")


def test_validate_code_with_valueset_system_constraints(tmp_path: Path):
    _write_csv(
        tmp_path / "Appendix=benefit-category-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Code,Display,Description,CodeSystem,",
                "1,Medical Care,Medical Care.,Code System: http://nphies.sa/terminology/CodeSystem/benefit-category,",
            ]
        ),
    )
    _write_csv(
        tmp_path / "nphies CodeSystems-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Changed,code system,CS Version,name,Title,CS Description,CS Committee,CS OID,CS Copyright,CS Source Resource,code,Display,Definition,Appendix",
                ",http://hl7.org/fhir/fm-status,4.0.1,FinancialResourceStatusCodes,Financial Resource Status Codes,This set of codes includes Status codes.,Financial Management Work Group,fm-status,HL7 International.,codesystem-fm-status.json,active,Active,The instance is currently in-force.,",
            ]
        ),
    )
    _write_csv(
        tmp_path / "nphies ValueSets-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Changed,value set,VS Version,name,Title,VS Definition,VS Committee,VS ID,Restrictions,VS source Resource,CodeSystem  url,CS url validation",
                "TRUE,http://nphies.sa/terminology/ValueSet/benefit-category,1.0.0,BenefitCategory,Benefit Category,Definition,nphies profiles committee,benefit-category,,,http://nphies.sa/terminology/CodeSystem/benefit-category,http://nphies.sa/terminology/CodeSystem/benefit-category",
            ]
        ),
    )

    catalog = NPHIESTerminologyCatalog(reference_dir=str(tmp_path))
    valid = catalog.validate_code(
        system="http://nphies.sa/terminology/CodeSystem/benefit-category",
        code="1",
        value_set="http://nphies.sa/terminology/ValueSet/benefit-category",
    )
    invalid = catalog.validate_code(
        system="http://hl7.org/fhir/fm-status",
        code="active",
        value_set="http://nphies.sa/terminology/ValueSet/benefit-category",
    )

    assert valid["valid"] is True
    assert invalid["valid"] is False
    assert invalid["reason"] == "SYSTEM_NOT_ALLOWED_IN_VALUE_SET"


def test_validate_payload_codings_reports_reference_issues(tmp_path: Path):
    _write_csv(
        tmp_path / "Appendix=adjudication-error-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Code,Display,CodeSystem,,",
                "1,Missing element: [Bundle] within the message,http://nphies.sa/terminology/CodeSystem/adjudication-error,,",
            ]
        ),
    )
    _write_csv(
        tmp_path / "nphies CodeSystems-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Changed,code system,CS Version,name,Title,CS Description,CS Committee,CS OID,CS Copyright,CS Source Resource,code,Display,Definition,Appendix",
            ]
        ),
    )
    _write_csv(
        tmp_path / "nphies ValueSets-Table 1.csv",
        "\n".join(
            [
                "Table 1",
                "Changed,value set,VS Version,name,Title,VS Definition,VS Committee,VS ID,Restrictions,VS source Resource,CodeSystem  url,CS url validation",
            ]
        ),
    )

    catalog = NPHIESTerminologyCatalog(reference_dir=str(tmp_path))
    payload = {
        "resourceType": "Claim",
        "item": [
            {
                "productOrService": {
                    "coding": [
                        {
                            "system": "http://nphies.sa/terminology/CodeSystem/adjudication-error",
                            "code": "999",
                        }
                    ]
                }
            }
        ],
        "diagnosis": [
            {
                "diagnosisCodeableConcept": {
                    "coding": [
                        {
                            "system": "http://nphies.sa/terminology/CodeSystem/unknown-system",
                            "code": "A01",
                        }
                    ]
                }
            }
        ],
    }

    validation = catalog.validate_payload_codings(payload)
    error_codes = {item["code"] for item in validation["errors"]}

    assert validation["is_valid"] is False
    assert "CODE_NOT_IN_CODESYSTEM" in error_codes
    assert "UNKNOWN_NPHIES_CODESYSTEM" in error_codes

