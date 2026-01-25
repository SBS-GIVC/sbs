/**
 * @fileoverview Enhanced FHIR R4 Claim Builder for NPHIES Compliance
 * @version 11.0
 * @medical NPHIES-compliant FHIR R4 resource generation
 */

// ============================================================================
// MEDICAL: INPUT DATA PREPARATION
// ============================================================================

const normalizedData = $input.item.json;
const webhookData = $('Webhook').first().json.body;
const validationData = $('Enhanced Input Validation').first().json.validated_data;
const metadata = $('Enhanced Input Validation').first().json.metadata;

// Generate unique identifiers
const claimId = `CLM-${Date.now()}-${webhookData.facility_id}-${Math.random().toString(36).substr(2, 6)}`;
const timestamp = new Date().toISOString();

// ============================================================================
// MEDICAL: NPHIES-COMPLIANT FHIR R4 CLAIM RESOURCE
// ============================================================================

const fhirClaim = {
  resourceType: "Claim",
  id: claimId,
  
  // MEDICAL: Meta information with NPHIES profile
  meta: {
    profile: [
      "http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/institutional-claim|1.0.0"
    ],
    versionId: "1",
    lastUpdated: timestamp,
    security: [{
      system: "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
      code: "N",
      display: "Normal"
    }]
  },
  
  // MEDICAL: Text summary for human readability
  text: {
    status: "generated",
    div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>Claim for ${webhookData.service_desc || 'medical service'}</p><p>مطالبة بـ ${webhookData.service_desc_ar || 'خدمة طبية'}</p></div>`
  },
  
  // MEDICAL: NPHIES Required Extensions
  extension: [
    {
      url: "http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/extension-episode",
      valueCodeableConcept: {
        coding: [{
          system: "http://nphies.sa/terminology/CodeSystem/episode-type",
          code: webhookData.episode_type || "acute",
          display: webhookData.episode_type === "chronic" ? "Chronic | مزمن" : "Acute | حاد"
        }]
      }
    },
    {
      url: "http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/extension-authorization-offline-date",
      valueDateTime: webhookData.authorization_date || timestamp
    },
    {
      url: "http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/extension-eligibility-offline-date",
      valueDateTime: webhookData.eligibility_date || timestamp
    }
  ],
  
  // MEDICAL: Business identifiers
  identifier: [
    {
      system: `http://brainsait.com/fhir/identifier/claim/${webhookData.facility_id}`,
      value: claimId
    },
    {
      system: "http://nphies.sa/identifier/claim",
      value: webhookData.external_claim_id || claimId
    }
  ],
  
  status: "active",
  
  // MEDICAL: Claim type (institutional, professional, pharmacy)
  type: {
    coding: [{
      system: "http://terminology.hl7.org/CodeSystem/claim-type",
      code: webhookData.claim_type || "institutional",
      display: webhookData.claim_type === "professional" ? "Professional | احترافي" : 
               webhookData.claim_type === "pharmacy" ? "Pharmacy | صيدلية" : "Institutional | مؤسسي"
    }]
  },
  
  // MEDICAL: Claim subtype (inpatient, outpatient, emergency, etc.)
  subType: {
    coding: [{
      system: "http://nphies.sa/terminology/CodeSystem/claim-subtype",
      code: webhookData.claim_subtype || "op",
      display: webhookData.claim_subtype === "ip" ? "Inpatient | داخلي" :
               webhookData.claim_subtype === "emr" ? "Emergency | طوارئ" : "Outpatient | خارجي"
    }]
  },
  
  use: "claim",
  
  // MEDICAL: Patient reference with identifiers
  patient: {
    reference: `Patient/${webhookData.patient_id}`,
    identifier: {
      type: {
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/v2-0203",
          code: webhookData.patient_id_type || "NI",
          display: "National Identifier"
        }]
      },
      system: "http://nphies.sa/identifier/nationalid",
      value: webhookData.patient_national_id || webhookData.patient_id
    },
    display: webhookData.patient_name || "Patient"
  },
  
  billablePeriod: {
    start: webhookData.encounter_date || webhookData.service_date || timestamp,
    end: webhookData.discharge_date || webhookData.encounter_date || timestamp
  },
  
  created: timestamp,
  
  // MEDICAL: Healthcare provider (facility)
  provider: {
    reference: `Organization/${webhookData.facility_id}`,
    identifier: {
      system: "http://nphies.sa/license/provider-license",
      value: webhookData.provider_license || webhookData.facility_id
    },
    display: webhookData.facility_name || `Facility ${webhookData.facility_id}`
  },
  
  // MEDICAL: Enterer (person who entered the claim)
  enterer: {
    reference: `Practitioner/${webhookData.enterer_id || 'SYSTEM'}`,
    display: webhookData.enterer_name || "System Entry"
  },
  
  // MEDICAL: Insurance company (payer)
  insurer: {
    reference: `Organization/${webhookData.payer_id}`,
    identifier: {
      system: "http://nphies.sa/license/payer-license",
      value: webhookData.payer_license || webhookData.payer_id
    },
    display: webhookData.payer_name || "Insurance Company"
  },
  
  // MEDICAL: Priority of processing
  priority: {
    coding: [{
      system: "http://terminology.hl7.org/CodeSystem/processpriority",
      code: webhookData.priority || "normal",
      display: webhookData.priority === "urgent" ? "Urgent | عاجل" : 
               webhookData.priority === "stat" ? "STAT | فوري" : "Normal | عادي"
    }]
  },
  
  // MEDICAL: Prescription reference (if applicable)
  prescription: webhookData.prescription_id ? {
    reference: `MedicationRequest/${webhookData.prescription_id}`
  } : undefined,
  
  // MEDICAL: Related claims (if any)
  related: webhookData.related_claim_id ? [{
    relationship: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/ex-relatedclaimrelationship",
        code: "prior",
        display: "Prior Claim"
      }]
    },
    reference: {
      identifier: {
        system: "http://nphies.sa/identifier/claim",
        value: webhookData.related_claim_id
      }
    }
  }] : undefined,
  
  // MEDICAL: Payee information (who receives payment)
  payee: {
    type: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/payeetype",
        code: "provider",
        display: "Provider | مقدم الخدمة"
      }]
    },
    party: {
      reference: `Organization/${webhookData.facility_id}`
    }
  },
  
  // MEDICAL: Care team (doctors, nurses, etc.)
  careTeam: [{
    sequence: 1,
    provider: {
      reference: `Practitioner/${webhookData.practitioner_id || 'PRACT-UNKNOWN'}`,
      display: webhookData.practitioner_name || "Primary Care Provider"
    },
    role: {
      coding: [{
        system: "http://nphies.sa/terminology/CodeSystem/claim-careteamrole",
        code: "primary",
        display: "Primary Care Provider | مقدم الرعاية الأساسي"
      }]
    },
    qualification: webhookData.practitioner_qualification ? {
      coding: [{
        system: "http://nphies.sa/terminology/CodeSystem/practitioner-role",
        code: webhookData.practitioner_qualification,
        display: webhookData.practitioner_qualification_display
      }]
    } : undefined
  }],
  
  // MEDICAL: Supporting information (clinical notes, attachments, etc.)
  supportingInfo: [
    {
      sequence: 1,
      category: {
        coding: [{
          system: "http://nphies.sa/terminology/CodeSystem/claim-information-category",
          code: "info",
          display: "Information | معلومات"
        }]
      },
      valueString: webhookData.clinical_notes || "Standard medical service"
    }
  ].filter(Boolean),
  
  // MEDICAL: Diagnoses (ICD-10 codes)
  diagnosis: (webhookData.diagnosis_codes || []).map((code, idx) => ({
    sequence: idx + 1,
    diagnosisCodeableConcept: {
      coding: [{
        system: "http://hl7.org/fhir/sid/icd-10",
        code: code,
        display: webhookData.diagnosis_descriptions?.[idx] || ""
      }]
    },
    type: [{
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/ex-diagnosistype",
        code: idx === 0 ? "principal" : idx === 1 ? "admitting" : "secondary",
        display: idx === 0 ? "Principal | رئيسي" : idx === 1 ? "Admitting | عند القبول" : "Secondary | ثانوي"
      }]
    }]
  })),
  
  // MEDICAL: Insurance coverage
  insurance: [{
    sequence: 1,
    focal: true,
    identifier: {
      system: "http://nphies.sa/identifier/policy",
      value: webhookData.policy_number || "POLICY-UNKNOWN"
    },
    coverage: {
      reference: `Coverage/${webhookData.coverage_id || 'COV-UNKNOWN'}`,
      display: webhookData.policy_number || "Insurance Policy"
    }
  }],
  
  // MEDICAL: Claim items (services/procedures billed)
  item: [{
    sequence: 1,
    careTeamSequence: [1],
    diagnosisSequence: webhookData.diagnosis_codes?.length > 0 ? [1] : undefined,
    
    // MEDICAL: Service/procedure code
    productOrService: {
      coding: [{
        system: "http://sbs.sa/coding/services",
        code: normalizedData.sbs_mapped_code || webhookData.service_code,
        display: normalizedData.official_description || webhookData.service_desc
      }],
      text: `${normalizedData.official_description || webhookData.service_desc} | ${normalizedData.arabic_description || webhookData.service_desc_ar || ''}`
    },
    
    // MEDICAL: Service date
    servicedDate: webhookData.service_date || webhookData.encounter_date,
    
    // MEDICAL: Quantity and units
    quantity: {
      value: webhookData.quantity || 1,
      unit: webhookData.unit || "service"
    },
    
    // MEDICAL: Unit price
    unitPrice: {
      value: parseFloat(webhookData.unit_price),
      currency: "SAR"
    },
    
    // MEDICAL: Net amount
    net: {
      value: parseFloat(webhookData.unit_price) * (webhookData.quantity || 1),
      currency: "SAR"
    }
  }],
  
  // MEDICAL: Total claim value
  total: {
    value: parseFloat(webhookData.unit_price) * (webhookData.quantity || 1),
    currency: "SAR"
  }
};

// ============================================================================
// MEDICAL: FHIR RESOURCE VALIDATION
// ============================================================================

const validationErrors = [];

// Required references
if (!fhirClaim.patient?.reference) {
  validationErrors.push({
    field: 'patient.reference',
    error: 'Missing required patient reference'
  });
}

if (!fhirClaim.provider?.reference) {
  validationErrors.push({
    field: 'provider.reference',
    error: 'Missing required provider reference'
  });
}

if (!fhirClaim.insurer?.reference) {
  validationErrors.push({
    field: 'insurer.reference',
    error: 'Missing required insurer reference'
  });
}

// Required claim items
if (!fhirClaim.item || fhirClaim.item.length === 0) {
  validationErrors.push({
    field: 'item',
    error: 'Claim must have at least one item'
  });
}

// Total amount validation
if (!fhirClaim.total?.value || fhirClaim.total.value <= 0) {
  validationErrors.push({
    field: 'total.value',
    error: 'Total claim value must be greater than zero'
  });
}

if (validationErrors.length > 0) {
  // MEDICAL: Audit FHIR validation failure
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'fhir_validation_failed',
    claim_id: claimId,
    facility_id: webhookData.facility_id,
    errors: validationErrors,
    severity: 'HIGH'
  }));
  
  throw new Error(JSON.stringify({
    error_code: 'FHIR_VALIDATION_FAILED',
    message_en: 'FHIR resource validation failed',
    message_ar: 'فشل التحقق من موارد FHIR',
    validation_errors: validationErrors,
    http_status: 500
  }));
}

// ============================================================================
// MEDICAL: SUCCESS AUDIT LOG
// ============================================================================

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'fhir_claim_created',
  claim_id: claimId,
  facility_id: webhookData.facility_id,
  patient_id: webhookData.patient_id,
  service_code: normalizedData.sbs_mapped_code || webhookData.service_code,
  total_amount: fhirClaim.total.value,
  currency: 'SAR',
  severity: 'INFO'
}));

// ============================================================================
// OUTPUT
// ============================================================================

return {
  fhir_claim: fhirClaim,
  metadata: {
    claim_id: claimId,
    generated_at: timestamp,
    facility_id: webhookData.facility_id,
    total_amount: fhirClaim.total.value,
    request_id: metadata.request_id,
    fhir_profile: fhirClaim.meta.profile[0],
    api_version: 'v11.0'
  }
};
