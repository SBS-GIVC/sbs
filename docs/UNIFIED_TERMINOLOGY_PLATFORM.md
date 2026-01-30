# 🏥 Unified Healthcare Terminology Platform

## Executive Summary

This document outlines the comprehensive architecture for integrating all major healthcare coding systems into a single, unified platform. The goal is to create the **most complete healthcare terminology solution for the Saudi Arabian market** with global interoperability.

---

## 🎯 Objectives

1. **Unified Code Browser** - Single interface for all coding systems
2. **Cross-System Mapping** - Automatic translation between code systems
3. **FHIR-Native Architecture** - Built on HL7 FHIR R4 standards
4. **AI-Powered Assistance** - Smart code suggestions and validation
5. **NPHIES Integration** - Full compliance with Saudi healthcare requirements

---

## 📊 Complete Code Systems Integration

### Tier 1: Core Required Systems (Saudi Arabia)

| System | Description | Count | Source | Priority |
|--------|-------------|-------|--------|----------|
| **SBS V3.1** | Saudi Billing System | 10,466 | CHI Official | ✅ DONE |
| **ICD-10-AM** | Diagnosis Codes (Australian Mod) | ~17,000 | CHI/WHO | 🔴 HIGH |
| **ACHI** | Australian Classification of Health Interventions | ~6,000 | IHPA | 🔴 HIGH |
| **SNOMED CT** | Clinical Terminology | 360,000+ | SNOMED Int'l | 🔴 HIGH |
| **DRG** | Diagnosis Related Groups | ~800 | CMS/CHI | 🔴 HIGH |

### Tier 2: International Standards

| System | Description | Count | Source | Priority |
|--------|-------------|-------|--------|----------|
| **ICD-11** | Latest WHO Classification | 17,000+ | WHO API | 🟡 MEDIUM |
| **LOINC** | Laboratory Observations | 100,000+ | Regenstrief | 🟡 MEDIUM |
| **RxNorm** | Medication Codes | 120,000+ | NLM/NIH | 🟡 MEDIUM |
| **CPT** | Procedure Codes (US) | ~10,000 | AMA | 🟡 MEDIUM |
| **HCPCS** | Healthcare Common Procedure | 7,000+ | CMS | 🟡 MEDIUM |

### Tier 3: Extended Terminologies

| System | Description | Count | Source | Priority |
|--------|-------------|-------|--------|----------|
| **NDC** | National Drug Codes | 200,000+ | FDA | 🟢 LOW |
| **ICD-O-3** | Oncology Classification | 2,500+ | WHO | 🟢 LOW |
| **ICF** | Functioning, Disability | 1,400+ | WHO | 🟢 LOW |
| **ATC** | Anatomical Therapeutic Chemical | 6,000+ | WHO | 🟢 LOW |
| **GMDN** | Medical Device Nomenclature | 22,000+ | GMDN Agency | 🟢 LOW |

---

## 🏗️ System Architecture

### FHIR-Native Terminology Server

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIFIED TERMINOLOGY PLATFORM                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │   SBS V3    │  │  ICD-10-AM  │  │  SNOMED CT  │  │    DRG     │ │
│  │   10,466    │  │   17,000+   │  │   360,000+  │  │    800+    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │               │         │
│         ▼                ▼                ▼               ▼         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              FHIR TERMINOLOGY SERVICE (R4)                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │   │
│  │  │CodeSystem│ │ ValueSet │ │ConceptMap│ │NamingSystem  │    │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │   │
│  │                                                              │   │
│  │  Operations: $lookup $validate-code $expand $translate      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│  ┌───────────────────────────▼──────────────────────────────────┐  │
│  │                    AI MAPPING ENGINE                          │  │
│  │  • Cross-system code translation                             │  │
│  │  • Fuzzy matching with confidence scores                     │  │
│  │  • Auto-suggestions based on context                         │  │
│  │  • Bundle detection and optimization                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────────────────▼──────────────────────────────────┐  │
│  │                    NPHIES INTEGRATION                         │  │
│  │  Eligibility │ Claims │ Prior Auth │ Remittance              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Integration Sources & APIs

### 1. WHO ICD-11 API (Official)
- **Endpoint**: `https://id.who.int/icd/entity`
- **Features**: 
  - REST API with OAuth2
  - 2025 release with additional languages
  - Embeddable Classification Tool (ECT)
  - Local deployment options (Docker, Windows, Linux)
- **Documentation**: https://icd.who.int/icdapi
- **License**: Open (more permissive as of 2024)

### 2. SNOMED CT Terminology Servers
- **Snowstorm** (Official): https://github.com/IHTSDO/snowstorm
  - Java/Elasticsearch based
  - Full FHIR support
  - Public sandbox: `https://snowstorm.ihtsdotools.org/fhir`
- **Hermes** (Lightweight): https://github.com/wardle/hermes
  - Clojure/Lucene based
  - High performance
  - Apache 2.0 License
- **Ontoserver** (Commercial): https://ontoserver.csiro.au
  - Full FHIR Terminology Service
  - Evaluation available

### 3. LOINC APIs
- **FHIR Terminology Service**: https://loinc.org/kb/api/fhir
- **Search API**: https://loinc.org/kb/api/search-api
- **Download API**: https://loinc.org/kb/api/download
- **Current Version**: 2.81

### 4. RxNorm (NLM)
- **REST API**: https://rxnav.nlm.nih.gov/REST
- **Features**: Drug interactions, NDC to RxNorm mapping
- **Free** for all users

### 5. DRG Grouper
- **CMS MS-DRG**: Official Medicare DRG tables
- **APR-DRG**: All Patient Refined (3M)
- **AR-DRG**: Australian Refined (IHPA)

---

## 📁 Database Schema Design

### Core Tables

```sql
-- Master terminology systems registry
CREATE TABLE terminology_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    uri VARCHAR(500) NOT NULL,  -- FHIR canonical URL
    version VARCHAR(50),
    publisher VARCHAR(255),
    license_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP,
    code_count INTEGER,
    metadata JSONB
);

-- Unified code catalogue (all systems)
CREATE TABLE unified_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_id UUID REFERENCES terminology_systems(id),
    code VARCHAR(100) NOT NULL,
    display_en VARCHAR(1000),
    display_ar VARCHAR(1000),
    definition TEXT,
    parent_code VARCHAR(100),
    hierarchy_level INTEGER,
    is_active BOOLEAN DEFAULT true,
    properties JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(system_id, code)
);

-- Cross-system mappings (ConceptMap)
CREATE TABLE code_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system_id UUID REFERENCES terminology_systems(id),
    source_code VARCHAR(100) NOT NULL,
    target_system_id UUID REFERENCES terminology_systems(id),
    target_code VARCHAR(100) NOT NULL,
    equivalence VARCHAR(50), -- equivalent, wider, narrower, related
    mapping_source VARCHAR(100), -- official, ai_generated, manual
    confidence DECIMAL(3,2), -- 0.00 to 1.00
    is_verified BOOLEAN DEFAULT false,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- DRG grouping rules
CREATE TABLE drg_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drg_code VARCHAR(20) NOT NULL,
    drg_version VARCHAR(20),
    name VARCHAR(255),
    mdc_code VARCHAR(10), -- Major Diagnostic Category
    type VARCHAR(50), -- medical, surgical, other
    weight DECIMAL(10,4),
    avg_los DECIMAL(5,2), -- Average Length of Stay
    relative_weight DECIMAL(10,4),
    rules JSONB, -- Grouper logic rules
    UNIQUE(drg_code, drg_version)
);

-- ValueSets for contextual filtering
CREATE TABLE value_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active',
    purpose TEXT,
    compose JSONB, -- FHIR ValueSet.compose structure
    expansion JSONB, -- Cached expansion
    expansion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_unified_codes_system ON unified_codes(system_id);
CREATE INDEX idx_unified_codes_code ON unified_codes(code);
CREATE INDEX idx_unified_codes_display ON unified_codes USING gin(to_tsvector('english', display_en));
CREATE INDEX idx_code_mappings_source ON code_mappings(source_system_id, source_code);
CREATE INDEX idx_code_mappings_target ON code_mappings(target_system_id, target_code);
```

---

## 🔄 FHIR Terminology Operations

### 1. $lookup - Get Code Details
```http
GET /CodeSystem/sbs-v3/$lookup?code=40803-00-00

Response:
{
  "resourceType": "Parameters",
  "parameter": [
    { "name": "display", "valueString": "Intracranial stereotactic localisation" },
    { "name": "system", "valueUri": "http://chi.gov.sa/sbs" },
    { "name": "version", "valueString": "3.1" }
  ]
}
```

### 2. $validate-code - Check if Code Exists
```http
POST /ValueSet/allowed-procedures/$validate-code
{
  "code": "40803-00-00",
  "system": "http://chi.gov.sa/sbs"
}
```

### 3. $translate - Cross-System Mapping
```http
POST /ConceptMap/$translate
{
  "code": "K35.80",
  "system": "http://hl7.org/fhir/sid/icd-10",
  "target": "http://snomed.info/sct"
}
```

### 4. $expand - Get ValueSet Codes
```http
GET /ValueSet/surgical-procedures/$expand?filter=appendectomy
```

---

## 🤖 AI-Powered Features

### 1. Smart Code Search
- Natural language to code translation
- Medical abbreviation expansion
- Synonym recognition
- Arabic/English bilingual search

### 2. Cross-System Mapping
- AI-generated mappings with confidence scores
- Learn from verified mappings
- Suggest alternatives when exact match unavailable

### 3. DRG Prediction
- Predict DRG from diagnosis and procedure codes
- Suggest missing diagnoses to improve reimbursement
- Detect CC/MCC opportunities

### 4. Claim Optimization
- Bundle detection across code systems
- Prior authorization prediction
- Denial risk assessment

---

## 📦 Data Sources & Downloads

### Official Data Files

| System | Format | Download URL | Update Freq |
|--------|--------|--------------|-------------|
| ICD-10-AM | XML/TXT | IHPA Portal | Annual |
| ICD-11 | API/JSON | WHO API | Quarterly |
| SNOMED CT | RF2 | IHTSDO Member Portal | Bi-annual |
| LOINC | CSV/SQL | loinc.org/downloads | Bi-annual |
| RxNorm | RRF | NLM UTS | Weekly |
| DRG | Excel | CMS/IHPA | Annual |
| SBS V3.1 | Excel | CHI Portal | As released |

### Licensing Requirements

| System | License Type | Cost | Notes |
|--------|-------------|------|-------|
| SBS | Open | Free | Saudi official standard |
| ICD-10/11 | CC BY-ND IGO | Free | WHO copyright |
| SNOMED CT | Affiliate | Free* | Requires membership |
| LOINC | Free | Free | Attribution required |
| RxNorm | UMLS | Free | Registration required |
| CPT | Commercial | $$$ | AMA license required |

*Saudi Arabia is a SNOMED CT member country

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up FHIR Terminology Server (HAPI FHIR)
- [ ] Import SBS V3.1 as CodeSystem (✅ DONE)
- [ ] Import ICD-10-AM codes
- [ ] Create basic cross-mapping tables
- [ ] Build unified code browser UI

### Phase 2: Core Integration (Week 3-4)
- [ ] Deploy Snowstorm for SNOMED CT
- [ ] Integrate WHO ICD-11 API
- [ ] Import LOINC laboratory codes
- [ ] Implement $lookup, $validate-code, $expand
- [ ] Build ConceptMap for SBS↔ICD mappings

### Phase 3: DRG & Bundling (Week 5-6)
- [ ] Import DRG grouper logic
- [ ] Create DRG prediction engine
- [ ] Build bundle detection across systems
- [ ] Integrate with claims workflow

### Phase 4: AI Enhancement (Week 7-8)
- [ ] Train AI mapping model on verified mappings
- [ ] Implement natural language code search
- [ ] Add DRG optimization suggestions
- [ ] Deploy denial risk prediction

### Phase 5: Production (Week 9-10)
- [ ] Performance optimization
- [ ] Security audit
- [ ] NPHIES certification
- [ ] Documentation and training

---

## 📐 API Design

### Unified Code Search
```typescript
interface UnifiedSearchRequest {
  query: string;
  systems?: string[];  // Filter by code systems
  limit?: number;
  language?: 'en' | 'ar';
  context?: 'diagnosis' | 'procedure' | 'lab' | 'medication';
}

interface UnifiedSearchResult {
  code: string;
  system: string;
  display: string;
  displayAr?: string;
  score: number;
  mappings?: Array<{
    system: string;
    code: string;
    display: string;
    equivalence: string;
    confidence: number;
  }>;
}
```

### Cross-System Translation
```typescript
interface TranslateRequest {
  code: string;
  sourceSystem: string;
  targetSystem: string;
  includeAlternatives?: boolean;
}

interface TranslateResponse {
  primary?: TranslatedCode;
  alternatives?: TranslatedCode[];
  confidence: number;
  source: 'official' | 'ai' | 'inferred';
}
```

---

## 🎨 UI/UX Design

### Unified Code Browser Features
1. **Multi-System Search** - Search across all systems simultaneously
2. **System Filters** - Toggle visibility of code systems
3. **Cross-Reference View** - See equivalent codes in other systems
4. **Hierarchy Navigator** - Browse code trees
5. **Favorites & History** - Quick access to frequent codes
6. **Arabic/English Toggle** - Full bilingual support
7. **Export Options** - CSV, FHIR Bundle, PDF

### Visual Indicators
- 🔵 Official mapping
- 🟣 AI-suggested mapping
- 🟢 High confidence (>90%)
- 🟡 Medium confidence (70-90%)
- 🔴 Low confidence (<70%)

---

## 📊 Metrics & KPIs

| Metric | Target | Description |
|--------|--------|-------------|
| Code Coverage | 100% | All SBS codes mapped to at least one standard |
| Mapping Accuracy | >95% | Verified correct mappings |
| Search Latency | <200ms | P95 response time |
| API Uptime | 99.9% | Service availability |
| User Adoption | 80% | Coders using unified browser |

---

## 🔒 Security & Compliance

- **HIPAA Compliant** - No PHI in terminology service
- **SOC 2 Type II** - Security controls
- **NPHIES Certified** - Saudi requirements
- **Audit Logging** - All code lookups tracked
- **Role-Based Access** - Granular permissions

---

## 📚 References

1. HL7 FHIR Terminology Service: https://www.hl7.org/fhir/terminology-service.html
2. WHO ICD-11 API: https://icd.who.int/icdapi
3. SNOMED Snowstorm: https://github.com/IHTSDO/snowstorm
4. LOINC Knowledge Base: https://loinc.org/kb
5. CMS DRG Resources: https://www.cms.gov/medicare/payment/prospective-payment-systems/acute-inpatient-pps
6. Saudi CHI Portal: https://chi.gov.sa

---

*Document Version: 1.0 | Last Updated: January 30, 2026*
