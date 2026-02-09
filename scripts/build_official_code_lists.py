#!/usr/bin/env python3
"""
Build clean official terminology assets for sbs-landing without external dependencies.

Inputs:
  - database/official_sbs/processed/sbs_achi_map.json
  - database/official_sbs/processed/dental_pricelist.json
  - database/official_sbs/SBS_V3_to_SNOMED_Map.xlsx

Outputs:
  - sbs-landing/data/official_achi_map.json
  - sbs-landing/data/official_dental_pricelist.json
  - sbs-landing/data/official_snomed_map.json
"""

from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "database" / "official_sbs"
PROCESSED_DIR = SRC_DIR / "processed"
OUT_DIR = ROOT / "sbs-landing" / "data"

SBS_CODE_RE = re.compile(r"^\d{5}-\d{2}-\d{2}$")
SNOMED_CODE_RE = re.compile(r"^\d{6,18}$")

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
REL_NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}


def clean_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)
    text = str(value).replace("\xa0", " ").strip()
    return re.sub(r"\s+", " ", text)


def parse_price(value: object) -> float:
    text = clean_text(value)
    if not text:
        return 0.0
    text = text.replace(",", "")
    try:
        return round(float(text), 2)
    except ValueError:
        return 0.0


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def dedupe(rows: list[dict], key_fields: tuple[str, ...]) -> list[dict]:
    seen = set()
    out = []
    for row in rows:
        key = tuple(clean_text(row.get(field, "")) for field in key_fields)
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def build_achi_map() -> dict:
    src = load_json(PROCESSED_DIR / "sbs_achi_map.json")
    rows = []
    for row in src.get("mappings", []):
        sbs_code = clean_text(row.get("SBS Code hyphenated"))
        achi_code = clean_text(row.get("ACHI Code"))
        if not SBS_CODE_RE.fullmatch(sbs_code):
            continue
        if not achi_code:
            continue
        rows.append(
            {
                "sbs_code": sbs_code,
                "achi_code": achi_code,
                "sbs_long_description": clean_text(row.get("Long Description")),
                "achi_description": clean_text(row.get("ACHI Description")),
                "sbs_chapter": clean_text(row.get("SBS Chapter Desription")),
                "achi_chapter": clean_text(row.get("ACHI Chapter Description")),
                "equivalence_sbs_to_achi": clean_text(row.get("Equivalence of SBS to ACHI")),
                "equivalence_achi_to_sbs": clean_text(row.get("Equivalence of ACHI to SBS")),
            }
        )
    rows = dedupe(rows, ("sbs_code", "achi_code"))
    return {
        "source": "CHI SBS V3 to ACHI map",
        "generated_by": "build_official_code_lists.py",
        "total": len(rows),
        "mappings": rows,
    }


def build_dental_pricelist() -> dict:
    src = load_json(PROCESSED_DIR / "dental_pricelist.json")
    services = []
    for row in src.get("services", []):
        sbs_code = clean_text(row.get("column_3"))
        if not SBS_CODE_RE.fullmatch(sbs_code):
            continue
        services.append(
            {
                "sbs_code": sbs_code,
                "sbs_numeric_code": clean_text(row.get("column_2")),
                "admitted_type": clean_text(row.get("Dental Services Pricelist for Government sector (Article 11)")),
                "short_description": clean_text(row.get("column_4")),
                "long_description": clean_text(row.get("column_5")),
                "block_code": clean_text(row.get("column_6")),
                "block_description": clean_text(row.get("column_7")),
                "chapter_code": clean_text(row.get("column_8")),
                "chapter_description": clean_text(row.get("column_9")),
                "specialty": clean_text(row.get("column_10")),
                "price_sar": parse_price(row.get("column_11")),
            }
        )
    services = dedupe(services, ("sbs_code", "specialty", "admitted_type"))
    return {
        "source": "CHI Dental Services Pricelist (Gov sector)",
        "generated_by": "build_official_code_lists.py",
        "total": len(services),
        "services": services,
    }


def _load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    out = []
    for si in root.findall(".//a:si", NS):
        out.append("".join((node.text or "") for node in si.findall(".//a:t", NS)))
    return out


def _cell_ref_col(cell_ref: str) -> str:
    col = []
    for char in cell_ref:
        if char.isalpha():
            col.append(char)
        else:
            break
    return "".join(col)


def _cell_value(cell: ET.Element, shared: list[str]) -> str:
    cell_type = cell.get("t")
    value_node = cell.find("a:v", NS)
    if cell_type == "s" and value_node is not None:
        idx = int(value_node.text)
        if 0 <= idx < len(shared):
            return clean_text(shared[idx])
        return ""
    if cell_type == "inlineStr":
        return clean_text("".join(node.text or "" for node in cell.findall(".//a:t", NS)))
    if value_node is not None:
        return clean_text(value_node.text)
    return ""


def _get_sheet_path(zf: zipfile.ZipFile, sheet_name: str) -> str:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        rel.get("Id"): rel.get("Target")
        for rel in rels.findall("r:Relationship", REL_NS)
    }
    for sheet in workbook.findall(".//a:sheets/a:sheet", NS):
        if sheet.get("name") != sheet_name:
            continue
        rel_id = sheet.get(f"{{{NS['r']}}}id")
        target = rel_map.get(rel_id, "")
        if not target:
            break
        return "xl/" + target.lstrip("/")
    raise RuntimeError(f"Sheet {sheet_name!r} not found")


def build_snomed_map_from_xlsx() -> dict:
    workbook_path = SRC_DIR / "SBS_V3_to_SNOMED_Map.xlsx"
    with zipfile.ZipFile(workbook_path) as zf:
        shared = _load_shared_strings(zf)
        sheet_path = _get_sheet_path(zf, "MAP")
        root = ET.fromstring(zf.read(sheet_path))
        rows = root.findall(".//a:sheetData/a:row", NS)

        if not rows:
            return {
                "source": "CHI SBS V3 to SNOMED map",
                "generated_by": "build_official_code_lists.py",
                "total": 0,
                "mappings": [],
            }

        header_map = {}
        for cell in rows[0].findall("a:c", NS):
            header_map[_cell_ref_col(cell.get("r", ""))] = _cell_value(cell, shared)

        snomed_columns = [
            col
            for col, title in header_map.items()
            if title.startswith("SNOMED")
            and "Content descriptions" not in title
        ]

        mappings = []
        for row in rows[1:]:
            row_values = {}
            for cell in row.findall("a:c", NS):
                col = _cell_ref_col(cell.get("r", ""))
                if not col:
                    continue
                row_values[col] = _cell_value(cell, shared)

            sbs_code = clean_text(row_values.get("U", ""))
            if not SBS_CODE_RE.fullmatch(sbs_code):
                continue

            sbs_short = clean_text(row_values.get("V", ""))
            sbs_long = clean_text(row_values.get("W", ""))
            eq_snomed_to_sbs = clean_text(row_values.get("S", ""))
            eq_sbs_to_snomed = clean_text(row_values.get("T", ""))
            rule = clean_text(row_values.get("R", ""))

            unique_codes = {}
            for col in snomed_columns:
                snomed_code = clean_text(row_values.get(col, ""))
                if not SNOMED_CODE_RE.fullmatch(snomed_code):
                    continue
                field_name = clean_text(header_map.get(col, "SNOMED"))
                unique_codes[snomed_code] = field_name

            for snomed_code, field_name in unique_codes.items():
                mappings.append(
                    {
                        "sbs_code": sbs_code,
                        "sbs_short_description": sbs_short,
                        "sbs_long_description": sbs_long,
                        "snomed_code": snomed_code,
                        "snomed_field": field_name,
                        "equivalence_snomed_to_sbs": eq_snomed_to_sbs,
                        "equivalence_sbs_to_snomed": eq_sbs_to_snomed,
                        "map_rule": rule,
                    }
                )

    mappings = dedupe(mappings, ("sbs_code", "snomed_code", "snomed_field"))
    return {
        "source": "CHI SBS V3 to SNOMED map",
        "generated_by": "build_official_code_lists.py",
        "total": len(mappings),
        "mappings": mappings,
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    achi = build_achi_map()
    write_json(OUT_DIR / "official_achi_map.json", achi)
    print(f"Built ACHI map: {achi['total']}")

    dental = build_dental_pricelist()
    write_json(OUT_DIR / "official_dental_pricelist.json", dental)
    print(f"Built dental pricelist: {dental['total']}")

    snomed = build_snomed_map_from_xlsx()
    write_json(OUT_DIR / "official_snomed_map.json", snomed)
    print(f"Built SNOMED map: {snomed['total']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
