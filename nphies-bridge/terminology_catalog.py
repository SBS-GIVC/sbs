"""
Terminology catalog loader for NPHIES Codeable Concept v5 CSV exports.
"""

from __future__ import annotations

import csv
import os
import re
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


def _normalize_header(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _extract_url(value: str) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    match = re.search(r"https?://[^\s,]+", text)
    return match.group(0).strip() if match else ""


def _bool_env(name: str, default: bool = False) -> bool:
    raw = str(os.getenv(name, "")).strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


@dataclass
class CatalogIssue:
    severity: str
    code: str
    description: str
    path: str
    details: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "code": self.code,
            "description": self.description,
            "path": self.path,
            "details": self.details,
        }


class NPHIESTerminologyCatalog:
    def __init__(self, reference_dir: Optional[str] = None):
        self.reference_dir = Path(reference_dir).expanduser() if reference_dir else self._resolve_default_dir()
        self._lock = threading.Lock()
        self._loaded = False
        self._loaded_at: Optional[str] = None
        self._load_error: Optional[str] = None
        self._codes_by_system: Dict[str, Dict[str, Dict[str, str]]] = {}
        self._system_meta: Dict[str, Dict[str, str]] = {}
        self._value_sets: Dict[str, set[str]] = {}
        self._file_summaries: Dict[str, int] = {}
        self._code_count = 0

    def _resolve_default_dir(self) -> Optional[Path]:
        configured = str(os.getenv("NPHIES_REFERENCE_DIR", "")).strip()
        if configured:
            return Path(configured).expanduser()

        repo_candidate = (
            Path(__file__).resolve().parent.parent
            / "data"
            / "reference"
            / "nphies-codes"
            / "Nphies Codeable Concept v5"
        )
        return repo_candidate if repo_candidate.exists() else None

    @property
    def available(self) -> bool:
        self._ensure_loaded()
        return self._loaded and self._load_error is None

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        with self._lock:
            if self._loaded:
                return
            self._load()
            self._loaded = True

    def _load(self) -> None:
        self._codes_by_system = {}
        self._system_meta = {}
        self._value_sets = {}
        self._file_summaries = {}
        self._code_count = 0
        self._load_error = None
        self._loaded_at = datetime.now(timezone.utc).isoformat()

        if not self.reference_dir:
            self._load_error = "NPHIES_REFERENCE_DIR is not configured."
            return

        if not self.reference_dir.exists():
            self._load_error = f"Reference directory not found: {self.reference_dir}"
            return

        try:
            files = sorted(self.reference_dir.glob("*.csv"))
            if not files:
                self._load_error = f"No CSV files found in: {self.reference_dir}"
                return

            for file_path in files:
                name = file_path.name
                if name.startswith("Appendix="):
                    self._parse_appendix(file_path)
                elif name.startswith("nphies CodeSystems"):
                    self._parse_codesystems(file_path)
                elif name.startswith("nphies ValueSets"):
                    self._parse_valuesets(file_path)

            if self._code_count == 0:
                self._load_error = f"No terminology codes were loaded from: {self.reference_dir}"
        except Exception as exc:
            self._load_error = f"Failed to load terminology CSVs: {exc}"

    def _read_table_csv(self, file_path: Path) -> Tuple[List[str], List[List[str]]]:
        with file_path.open("r", encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.reader(handle))
        if not rows:
            return [], []

        header_index = 1 if len(rows[0]) == 1 and _normalize_header(rows[0][0]).startswith("table") else 0
        if header_index >= len(rows):
            return [], []

        header = [str(col or "").strip() for col in rows[header_index]]
        data_rows = rows[header_index + 1 :]
        return header, data_rows

    def _header_index_map(self, header: Iterable[str]) -> Dict[str, int]:
        out: Dict[str, int] = {}
        for idx, col in enumerate(header):
            norm = _normalize_header(col)
            if norm and norm not in out:
                out[norm] = idx
        return out

    def _row_value(self, row: List[str], index: Optional[int]) -> str:
        if index is None:
            return ""
        if index >= len(row):
            return ""
        return str(row[index] or "").strip()

    def _add_code(
        self,
        system: str,
        code: str,
        display: str,
        definition: str,
        source_file: str,
        appendix: str = "",
    ) -> None:
        system = str(system or "").strip()
        code = str(code or "").strip()
        if not system or not code:
            return

        system_bucket = self._codes_by_system.setdefault(system, {})
        existing = system_bucket.get(code)
        if existing:
            if display and not existing.get("display"):
                existing["display"] = display
            if definition and not existing.get("definition"):
                existing["definition"] = definition
            return

        system_bucket[code] = {
            "display": display,
            "definition": definition,
            "source_file": source_file,
            "appendix": appendix,
        }
        self._code_count += 1

    def _parse_appendix(self, file_path: Path) -> None:
        header, rows = self._read_table_csv(file_path)
        index = self._header_index_map(header)

        code_idx = index.get("code")
        if code_idx is None:
            code_idx = index.get("detailed code")

        display_idx = index.get("display")
        if display_idx is None:
            display_idx = index.get("description")
        if display_idx is None:
            display_idx = index.get("descriptions")

        definition_idx = index.get("definition")
        code_system_idx = index.get("codesystem")

        loaded = 0
        current_system = ""
        appendix_name = file_path.name.replace("Appendix=", "").replace("-Table 1.csv", "")
        for row in rows:
            if not any(str(v or "").strip() for v in row):
                continue
            code_system = _extract_url(self._row_value(row, code_system_idx))
            if code_system:
                current_system = code_system

            code = self._row_value(row, code_idx)
            if not code or not current_system:
                continue

            display = self._row_value(row, display_idx)
            definition = self._row_value(row, definition_idx)
            self._add_code(
                system=current_system,
                code=code,
                display=display,
                definition=definition,
                source_file=file_path.name,
                appendix=appendix_name,
            )
            loaded += 1
        self._file_summaries[file_path.name] = loaded

    def _parse_codesystems(self, file_path: Path) -> None:
        header, rows = self._read_table_csv(file_path)
        index = self._header_index_map(header)

        system_idx = index.get("code system")
        code_idx = index.get("code")
        display_idx = index.get("display")
        definition_idx = index.get("definition")
        appendix_idx = index.get("appendix")

        version_idx = index.get("cs version")
        name_idx = index.get("name")
        title_idx = index.get("title")
        description_idx = index.get("cs description")

        loaded = 0
        current_system = ""
        current_meta: Dict[str, str] = {}

        for row in rows:
            if not any(str(v or "").strip() for v in row):
                continue

            system_url = _extract_url(self._row_value(row, system_idx))
            if system_url:
                current_system = system_url
                current_meta = {
                    "version": self._row_value(row, version_idx),
                    "name": self._row_value(row, name_idx),
                    "title": self._row_value(row, title_idx),
                    "description": self._row_value(row, description_idx),
                }
                self._system_meta[current_system] = current_meta

            if not current_system:
                continue

            code = self._row_value(row, code_idx)
            if not code:
                continue

            display = self._row_value(row, display_idx)
            definition = self._row_value(row, definition_idx)
            appendix = self._row_value(row, appendix_idx)
            self._add_code(
                system=current_system,
                code=code,
                display=display,
                definition=definition,
                source_file=file_path.name,
                appendix=appendix,
            )
            loaded += 1
        self._file_summaries[file_path.name] = loaded

    def _parse_valuesets(self, file_path: Path) -> None:
        header, rows = self._read_table_csv(file_path)
        index = self._header_index_map(header)

        value_set_idx = index.get("value set")
        code_system_idx = index.get("codesystem url")
        validation_system_idx = index.get("cs url validation")

        mapped = 0
        current_value_set = ""
        for row in rows:
            if not any(str(v or "").strip() for v in row):
                continue

            value_set_url = _extract_url(self._row_value(row, value_set_idx))
            if value_set_url:
                current_value_set = value_set_url

            if not current_value_set:
                continue

            system_url = _extract_url(self._row_value(row, code_system_idx))
            if not system_url:
                system_url = _extract_url(self._row_value(row, validation_system_idx))

            if not system_url:
                continue

            self._value_sets.setdefault(current_value_set, set()).add(system_url)
            mapped += 1

        self._file_summaries[file_path.name] = mapped

    def summary(self) -> Dict[str, Any]:
        self._ensure_loaded()
        return {
            "available": self.available,
            "reference_dir": str(self.reference_dir) if self.reference_dir else None,
            "loaded_at": self._loaded_at,
            "load_error": self._load_error,
            "code_system_count": len(self._codes_by_system),
            "code_count": self._code_count,
            "value_set_count": len(self._value_sets),
            "source_files": self._file_summaries,
        }

    def list_code_systems(self) -> List[Dict[str, Any]]:
        self._ensure_loaded()
        out = []
        for system, codes in self._codes_by_system.items():
            meta = self._system_meta.get(system, {})
            out.append(
                {
                    "system": system,
                    "code_count": len(codes),
                    "title": meta.get("title"),
                    "name": meta.get("name"),
                    "version": meta.get("version"),
                }
            )
        out.sort(key=lambda item: item["code_count"], reverse=True)
        return out

    def lookup(self, system: str, code: str) -> Optional[Dict[str, Any]]:
        self._ensure_loaded()
        system_map = self._codes_by_system.get(str(system or "").strip())
        if not system_map:
            return None
        entry = system_map.get(str(code or "").strip())
        if not entry:
            return None
        return {
            "system": str(system).strip(),
            "code": str(code).strip(),
            "display": entry.get("display"),
            "definition": entry.get("definition"),
            "source_file": entry.get("source_file"),
            "appendix": entry.get("appendix"),
        }

    def search_codes(self, system: str, query: str = "", limit: int = 50) -> List[Dict[str, Any]]:
        self._ensure_loaded()
        system_map = self._codes_by_system.get(str(system or "").strip(), {})
        needle = str(query or "").strip().lower()
        out: List[Dict[str, Any]] = []
        for code, details in system_map.items():
            display = str(details.get("display") or "")
            if needle and needle not in code.lower() and needle not in display.lower():
                continue
            out.append(
                {
                    "system": str(system).strip(),
                    "code": code,
                    "display": display,
                    "definition": details.get("definition"),
                }
            )
            if len(out) >= max(1, min(int(limit), 500)):
                break
        return out

    def validate_code(self, system: str, code: str, value_set: str = "") -> Dict[str, Any]:
        self._ensure_loaded()
        normalized_system = str(system or "").strip()
        normalized_code = str(code or "").strip()
        normalized_value_set = str(value_set or "").strip()

        if not normalized_system or not normalized_code:
            return {
                "valid": False,
                "reason": "MISSING_SYSTEM_OR_CODE",
                "details": {"system": normalized_system, "code": normalized_code},
            }

        if normalized_system not in self._codes_by_system:
            return {
                "valid": False,
                "reason": "UNKNOWN_CODE_SYSTEM",
                "details": {"system": normalized_system},
            }

        lookup = self.lookup(normalized_system, normalized_code)
        if not lookup:
            return {
                "valid": False,
                "reason": "UNKNOWN_CODE",
                "details": {"system": normalized_system, "code": normalized_code},
            }

        if normalized_value_set:
            allowed_systems = self._value_sets.get(normalized_value_set)
            if allowed_systems and normalized_system not in allowed_systems:
                return {
                    "valid": False,
                    "reason": "SYSTEM_NOT_ALLOWED_IN_VALUE_SET",
                    "details": {
                        "system": normalized_system,
                        "value_set": normalized_value_set,
                        "allowed_systems": sorted(allowed_systems),
                    },
                }

        return {"valid": True, "reason": "OK", "match": lookup}

    def validate_payload_codings(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._ensure_loaded()
        issues: List[CatalogIssue] = []
        checked = 0

        for path, coding in self._iter_codings(payload):
            if not isinstance(coding, dict):
                continue
            system = str(coding.get("system", "")).strip()
            code = str(coding.get("code", "")).strip()
            checked += 1

            if not system:
                issues.append(
                    CatalogIssue(
                        severity="warning",
                        code="MISSING_CODING_SYSTEM",
                        description="Coding entry is missing system URL.",
                        path=path,
                        details={"code": code},
                    )
                )
                continue

            if not code:
                issues.append(
                    CatalogIssue(
                        severity="warning",
                        code="MISSING_CODING_CODE",
                        description="Coding entry is missing code value.",
                        path=path,
                        details={"system": system},
                    )
                )
                continue

            if system in self._codes_by_system:
                if code not in self._codes_by_system[system]:
                    issues.append(
                        CatalogIssue(
                            severity="error",
                            code="CODE_NOT_IN_CODESYSTEM",
                            description=f"Code '{code}' is not present in '{system}'.",
                            path=path,
                            details={"system": system, "code": code},
                        )
                    )
                continue

            if system.startswith("http://nphies.sa/terminology/CodeSystem/"):
                issues.append(
                    CatalogIssue(
                        severity="error",
                        code="UNKNOWN_NPHIES_CODESYSTEM",
                        description=f"Unknown NPHIES code system '{system}'.",
                        path=path,
                        details={"system": system, "code": code},
                    )
                )

        errors = [issue.to_dict() for issue in issues if issue.severity == "error"]
        warnings = [issue.to_dict() for issue in issues if issue.severity == "warning"]
        return {
            "available": self.available,
            "checked_codings": checked,
            "is_valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "summary": {
                "error_count": len(errors),
                "warning_count": len(warnings),
            },
        }

    def _iter_codings(self, node: Any, path: str = "resource") -> Iterable[Tuple[str, Dict[str, Any]]]:
        if isinstance(node, dict):
            for key, value in node.items():
                current_path = f"{path}.{key}" if path else str(key)
                if key == "coding" and isinstance(value, list):
                    for index, coding in enumerate(value):
                        yield f"{current_path}[{index}]", coding
                yield from self._iter_codings(value, current_path)
        elif isinstance(node, list):
            for index, item in enumerate(node):
                yield from self._iter_codings(item, f"{path}[{index}]")


def build_catalog_from_environment() -> Optional[NPHIESTerminologyCatalog]:
    enabled = _bool_env("NPHIES_TERMINOLOGY_ENABLED", True)
    if not enabled:
        return None
    return NPHIESTerminologyCatalog(reference_dir=os.getenv("NPHIES_REFERENCE_DIR", "").strip() or None)

