# Saudi Billing System (SBS) Integration Guide

## Overview

This document summarizes the official Saudi Billing System (SBS) data sources, code structures, and integration guidelines for the SBS Healthcare Integration Gateway.

---

## 📚 Official Data Sources

### 1. Council of Health Insurance (CHI)
**Website**: https://chi.gov.sa

The CHI is the primary regulatory body for the Saudi Billing System. Key resources:

| Resource | URL | Description |
|----------|-----|-------------|
| SBS V3 Electronic Code List | `chi.gov.sa/Rules/DocLib2/SBS_V3_Electronic Code List 3.1.xlsx` | Complete list of 20,403 SBS codes |
| SBS V3 Coding Standards | `chi.gov.sa/Rules/DocLib2/Saudi Billing System V3.0_Coding Standards.pdf` | Official coding guidelines |
| SBS V3 Mapping Procedures | `chi.gov.sa/Rules/DocLib2/SBS V3.0 Mapping Procedures.pdf` | Mapping methodology |
| SBS to SNOMED Map | `chi.gov.sa/Rules/DocLib2/SBS_V3_to SNOMED Map.xlsx` | Mapping to SNOMED CT |
| SBS to ACHI Map | `chi.gov.sa/Rules/DocLib2/SBS_V3_to ACHI 10th Edition Map.xlsx` | Mapping to Australian ACHI |
| Dental Pricelist | `chi.gov.sa/Rules/DocLib2/Dental Services Pricelist for Government sector.xlsx` | Official dental pricing |
| SBS Implementation Guide | `chi.gov.sa/Rules/DocLib2/SBS_V3_Information Systems Implementation.pdf` | Technical implementation |

### 2. NPHIES Platform
**Website**: https://nphies.sa

NPHIES (National Platform for Health and Insurance Exchange Services) is the national claims exchange platform.

**Key Features:**
- Claims Management (المطالبات)
- Prior Authorization (الموافقات المسبقة)
- Eligibility Verification (أهلية العلاج)
- Insurance Management (إدارة التأمين)
- Fraud Detection (إدارة الاحتيال)

**Contact:**
- Phone: 920033808
- Email: support@nphies.sa
- CHI Coding: chi-ardrg@chi.gov.sa

---

## 📊 SBS Code Structure

### Code Format
SBS codes follow the format: `NNNNN-NN-NN`

**Example:** `30571-00-00`
- **30571**: Base procedure code
- **00**: First modifier/variant
- **00**: Second modifier/extension

### Code Categories

| Chapter | Category | Description |
|---------|----------|-------------|
| 01 | Nervous System | Procedures on brain, spine, nerves |
| 02 | Endocrine System | Thyroid, pituitary, adrenal procedures |
| 03 | Eye and Adnexa | Ophthalmology procedures |
| 04 | Ear and Mastoid | ENT procedures |
| 05 | Nose, Mouth, Pharynx | Oral and nasal procedures |
| 06 | Dental Services | Complete dental catalogue |
| 07 | Respiratory System | Lung, bronchial procedures |
| 08 | Cardiovascular System | Heart, vascular procedures |
| 09 | Blood/Blood-forming Organs | Hematology procedures |
| 10 | Digestive System | GI procedures |
| 11 | Urinary System | Nephrology, urology |
| 12 | Male Genital Organs | Andrology procedures |
| 13 | Female Genital Organs | Gynecology procedures |
| 14 | Musculoskeletal System | Orthopedic procedures |
| 15 | Dermatological/Plastic | Skin, cosmetic procedures |
| 16 | Breast | Mastology procedures |
| 17 | Radiation Oncology | Cancer treatment |
| 18 | Non-invasive/Cognitive | Consultations, assessments |
| 19 | Imaging Services | Radiology, ultrasound |
| 20 | Allied Health | PT, OT, SLP, etc. |
| 21 | Laboratory | Pathology, biochemistry |
| 22 | Pharmacy | Medication services |
| 23 | Obstetric | Pregnancy, delivery |

---

## 💰 Pricing Structure

### Facility Tiers
CHI mandates pricing based on facility accreditation tier:

| Tier | Description | Markup % |
|------|-------------|----------|
| A | Premium/Tertiary Centers | +20% |
| B | Standard Hospitals | +10% |
| C | Primary Care Centers | Base |
| D | Clinics/Outpatient | -5% |

### Bundle Pricing
Certain procedures qualify for bundled pricing:
- Knee Replacement Bundle
- Cardiac Catheterization Bundle
- CABG Bundle
- Maternity Package

---

## 🔗 Integration Points

### NPHIES API Integration

```
Base URL (Sandbox): https://sandbox.nphies.sa/api/v1
Base URL (Production): https://nphies.sa/api/v1
```

**Key Endpoints:**
- `/eligibility` - Check patient coverage
- `/prior-auth` - Submit prior authorization
- `/claims` - Submit claims
- `/claims/{id}/status` - Check claim status

### Required Headers
```
Authorization: Bearer {token}
Content-Type: application/fhir+json
X-Request-ID: {uuid}
```

### FHIR R4 Resources Used
- `Claim` - Claims submission
- `ClaimResponse` - Claim adjudication response
- `Coverage` - Insurance coverage
- `Patient` - Patient demographics
- `Practitioner` - Provider information
- `Organization` - Facility information

---

## 📁 Downloaded Files

The following official files have been downloaded and processed:

```
database/official_sbs/
├── SBS_V3_Electronic_Code_List.xlsx   (2.3 MB) - 20,403 codes
├── SBS_V3_to_SNOMED_Map.xlsx          (1.4 MB) - SNOMED mappings
├── SBS_V3_to_ACHI_Map.xlsx            (1.0 MB) - 9,943 ACHI mappings  
├── SBS_V2_to_V3_Map.xlsx              (1.0 MB) - Version migration
├── Dental_Services_Pricelist.xlsx      (93 KB) - 713 dental services
├── SBS_V3_Coding_Standards.pdf        (2.5 MB) - Coding guidelines
├── SBS_V3_Mapping_Procedures.pdf      (1.8 MB) - Mapping procedures
├── SBS_V3_Implementation.pdf          (1.1 MB) - Tech implementation
└── processed/
    ├── sbs_codes_raw.json             (12.6 MB) - All raw data
    ├── sbs_catalogue.json             (6.0 MB)  - Normalized catalogue
    ├── sbs_achi_map.json              (7.6 MB)  - ACHI mappings
    ├── dental_pricelist.json          (364 KB)  - Dental prices
    └── sbs_categories.json            (392 KB)  - Category index
```

---

## 🏥 Sample SBS Codes (Common Procedures)

### Consultations
| Code | Description | Typical Fee (SAR) |
|------|-------------|-------------------|
| 10951-00-00 | General Practice Consultation | 200 |
| 10953-00-00 | Follow-up Consultation | 150 |
| 10954-00-00 | Specialist Consultation | 350 |
| 10954-01-00 | Consultant Physician | 400 |
| 10960-00-00 | Emergency Department Visit | 500 |

### Laboratory
| Code | Description | Typical Fee (SAR) |
|------|-------------|-------------------|
| 55707-01-00 | Complete Blood Count (CBC) | 150 |
| 66500-00-00 | Comprehensive Metabolic Panel | 280 |
| 66512-00-00 | HbA1c | 120 |
| 66716-00-00 | TSH | 180 |

### Imaging
| Code | Description | Typical Fee (SAR) |
|------|-------------|-------------------|
| 58500-00-00 | X-ray Chest | 200 |
| 56001-00-00 | CT Head without contrast | 800 |
| 56401-00-00 | MRI Brain without contrast | 1,500 |
| 55036-00-00 | Ultrasound Abdomen | 400 |

### Surgical
| Code | Description | Typical Fee (SAR) |
|------|-------------|-------------------|
| 30571-00-00 | Appendectomy - Laparoscopic | 8,000 |
| 30443-00-00 | Cholecystectomy - Laparoscopic | 10,000 |
| 30609-00-00 | Hernia Repair - Inguinal | 6,000 |

---

## ⚠️ Common Issues & Solutions

### 1. Code Not Found
**Issue**: Internal hospital code doesn't map to SBS
**Solution**: Use AI-assisted mapping with confidence thresholds

### 2. Prior Authorization Required
**Issue**: Claim rejected due to missing PA
**Solution**: Check SBS code for `requires_prior_auth` flag

### 3. Bundle Conflicts
**Issue**: Individual services billed when bundle should apply
**Solution**: Implement bundle detection algorithm

### 4. Pricing Discrepancies
**Issue**: Claimed amount differs from allowed amount
**Solution**: Apply facility tier markup correctly

### 5. Diagnosis Missing
**Issue**: Procedure requires supporting diagnosis
**Solution**: Check `requires_diagnosis` flag, prompt for ICD-10

---

## 📋 Integration Checklist

- [x] Downloaded official SBS V3 code list
- [x] Processed and normalized to JSON format
- [x] Created PostgreSQL schema for production
- [x] Integrated 500 codes into frontend for demo
- [x] Updated middleware with real SBS codes
- [x] Created facility-to-SBS mapping database
- [ ] Import full 20,403 codes to production database
- [ ] Implement NPHIES API integration
- [ ] Add prior authorization workflow
- [ ] Implement bundle pricing logic
- [ ] Add eligibility verification
- [ ] Complete SNOMED/ACHI cross-mapping

---

## 📞 Support Contacts

| Entity | Contact | Purpose |
|--------|---------|---------|
| CHI Coding Support | chi-ardrg@chi.gov.sa | SBS coding questions |
| CHI General | info@chi.gov.sa | General inquiries |
| NPHIES Support | support@nphies.sa | Platform technical support |
| NPHIES Phone | 920033808 | Hotline |

---

*Last Updated: January 30, 2026*
*SBS Version: 3.1*
*Document Version: 1.0*
