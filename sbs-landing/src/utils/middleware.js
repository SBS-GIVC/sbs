// Middleware Logic - SBS Code Normalization and FHIR Processing
import { callGemini } from '../services/geminiService';
import { APIService } from '../services/apiService';
import sbsCodesData from '../data/sbs_codes.json';

// Official CHI SBS Codes Database (V3.1)
const SBS_OFFICIAL_CODES = sbsCodesData.codes;

// Local mapping database for quick lookups (facility-specific codes to SBS codes)
// This maps internal hospital codes to official SBS codes
const MAPPING_DB = {
  // Laboratory Services
  "LAB_001": { sbs_code: "55707-01-00", desc: "Complete Blood Count (CBC)", fee: 150 },
  "LAB_CBC": { sbs_code: "55707-01-00", desc: "Full blood examination - automated", fee: 150 },
  "LAB_CMP": { sbs_code: "66500-00-00", desc: "Comprehensive Metabolic Panel", fee: 280 },
  "LAB_LIPID": { sbs_code: "66503-00-00", desc: "Lipid Profile Panel", fee: 200 },
  "LAB_HBA1C": { sbs_code: "66512-00-00", desc: "Glycated Haemoglobin (HbA1c)", fee: 120 },
  "LAB_TSH": { sbs_code: "66716-00-00", desc: "Thyroid Stimulating Hormone", fee: 180 },
  "LAB_FT4": { sbs_code: "66719-00-00", desc: "Free Thyroxine (FT4)", fee: 160 },
  "LAB_UA": { sbs_code: "65993-00-00", desc: "Urinalysis", fee: 80 },
  
  // Consultation Services
  "CONS_99": { sbs_code: "10954-01-00", desc: "Consultation - Consultant Physician", fee: 400 },
  "CONS_GP": { sbs_code: "10951-00-00", desc: "General Practice Consultation", fee: 200 },
  "CONS_SPEC": { sbs_code: "10954-00-00", desc: "Specialist Consultation", fee: 350 },
  "CONS_FOLLOWUP": { sbs_code: "10953-00-00", desc: "Follow-up Consultation", fee: 150 },
  
  // Imaging Services
  "RAD_XRAY_CHEST": { sbs_code: "58500-00-00", desc: "X-ray Chest PA", fee: 200 },
  "RAD_CT_HEAD": { sbs_code: "56001-00-00", desc: "CT Scan Head without contrast", fee: 800 },
  "RAD_MRI_BRAIN": { sbs_code: "56401-00-00", desc: "MRI Brain without contrast", fee: 1500 },
  "RAD_US_ABD": { sbs_code: "55036-00-00", desc: "Ultrasound Abdomen Complete", fee: 400 },
  
  // Surgical Procedures
  "SURG_APPY": { sbs_code: "30571-00-00", desc: "Appendectomy - Laparoscopic", fee: 8000 },
  "SURG_CHOLE": { sbs_code: "30443-00-00", desc: "Cholecystectomy - Laparoscopic", fee: 10000 },
  "SURG_HERNIA": { sbs_code: "30609-00-00", desc: "Hernia Repair - Inguinal", fee: 6000 },
  
  // Emergency Services
  "ER_VISIT": { sbs_code: "10960-00-00", desc: "Emergency Department Visit", fee: 500 },
  "ER_TRAUMA": { sbs_code: "10961-00-00", desc: "Emergency Trauma Assessment", fee: 800 },
  
  // Cardiology
  "CARDIO_ECG": { sbs_code: "11700-00-00", desc: "Electrocardiogram (ECG)", fee: 150 },
  "CARDIO_ECHO": { sbs_code: "55113-00-00", desc: "Echocardiography", fee: 600 },
  "CARDIO_HOLTER": { sbs_code: "11709-00-00", desc: "Holter Monitor 24hr", fee: 400 },
  
  // Respiratory
  "RESP_SPIROMETRY": { sbs_code: "11503-00-00", desc: "Spirometry", fee: 200 },
  "RESP_PFT": { sbs_code: "11512-00-00", desc: "Pulmonary Function Test Complete", fee: 450 },
  
  // Dental (using official dental prices)
  "DENTAL_EXAM": { sbs_code: "97011-00-00", desc: "Dental Examination", fee: 100 },
  "DENTAL_CLEANING": { sbs_code: "97112-00-00", desc: "Dental Prophylaxis", fee: 150 },
  "DENTAL_FILLING": { sbs_code: "97215-00-00", desc: "Dental Filling - Composite", fee: 200 },
  "DENTAL_EXTRACT": { sbs_code: "97311-00-00", desc: "Tooth Extraction - Simple", fee: 180 },
  
  // Physiotherapy
  "PT_INIT": { sbs_code: "95550-00-00", desc: "Physiotherapy Initial Assessment", fee: 250 },
  "PT_FOLLOWUP": { sbs_code: "95551-00-00", desc: "Physiotherapy Follow-up", fee: 150 },
  "PT_EXERCISE": { sbs_code: "95560-00-00", desc: "Therapeutic Exercise", fee: 120 },
};

/**
 * Search for SBS code by keyword in official database
 */
export function searchSBSCodes(keyword, limit = 10) {
  const results = [];
  const keywordLower = keyword.toLowerCase();
  
  for (const [code, data] of Object.entries(SBS_OFFICIAL_CODES)) {
    if (
      code.toLowerCase().includes(keywordLower) ||
      data.desc.toLowerCase().includes(keywordLower) ||
      data.category.toLowerCase().includes(keywordLower)
    ) {
      results.push({ code, ...data });
      if (results.length >= limit) break;
    }
  }
  
  return results;
}

/**
 * Get SBS code details from official database
 */
export function getSBSCodeDetails(sbsCode) {
  return SBS_OFFICIAL_CODES[sbsCode] || null;
}

/**
 * Normalize internal hospital codes to SBS codes
 * Uses local DB first, then AI fallback, then backend service
 */
export async function normalizeCode(internalCode, description, lang = 'en') {
  // Check local mapping first
  if (MAPPING_DB[internalCode]) {
    return {
      ...MAPPING_DB[internalCode],
      source: "Local DB",
      confidence: 1.0,
      rationale: lang === 'ar'
        ? "مطابقة مباشرة من قاعدة بيانات المنشأة."
        : "Direct static match from facility database."
    };
  }

  // Try backend normalization service
  try {
    const result = await APIService.normalizeCode(internalCode, description);

    if (result && result.sbs_code) {
      return {
        sbs_code: result.sbs_code,
        desc: result.description || description,
        fee: result.estimated_fee || 300,
        source: "SBS Engine",
        confidence: result.confidence || 0.9,
        rationale: result.rationale || (lang === 'ar'
          ? "تم التعيين من محرك SBS."
          : "Mapped via SBS normalization engine.")
      };
    }
  } catch (backendError) {
    console.warn('Backend normalization failed, trying AI fallback:', backendError);
  }

  // Fallback to AI-based normalization
  try {
    // Sanitize inputs to prevent prompt injection
    const sanitizedCode = internalCode.replace(/[`'"\\]/g, '').substring(0, 50);
    const sanitizedDesc = description.replace(/[`'"\\]/g, '').substring(0, 200);
    
    const aiResponse = await callGemini(
      `Map hospital service to SBS code.
       Code: ${sanitizedCode} | Desc: ${sanitizedDesc} | Lang: ${lang === 'ar' ? 'Arabic' : 'English'}
       Return ONLY JSON: {"code": "SBS-XXX-000", "desc": "Official Name", "confidence": 0.85, "rationale": "Explanation"}`,
      "You are a Senior Saudi Medical Coder. Strict JSON output only."
    );

    if (!aiResponse) throw new Error("Empty AI Response");

    const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
      
      // Validate required fields and types
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON structure');
      }
      
      // Ensure required fields exist and are strings
      if (!parsed.code || typeof parsed.code !== 'string') {
        parsed.code = "SBS-PENDING";
      }
      
      if (!parsed.desc || typeof parsed.desc !== 'string') {
        parsed.desc = description;
      }
      
      // Validate confidence is a number between 0 and 1
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.7;
      }
      
    } catch (jsonError) {
      console.error("JSON parsing failed:", jsonError);
      throw new Error("Invalid AI response format");
    }

    return {
      sbs_code: parsed.code || "SBS-PENDING",
      desc: parsed.desc || description,
      fee: 300,
      source: "Agentic AI ✨",
      confidence: parsed.confidence || 0.7,
      rationale: parsed.rationale || (lang === 'ar'
        ? "تم التعيين بناءً على الوصف السريري."
        : "Assigned based on clinical context.")
    };
  } catch (e) {
    console.error("Normalization Error:", e);
    return {
      sbs_code: "SBS-MISC-99",
      desc: description,
      fee: 0,
      source: "Manual Review Required",
      confidence: 0,
      rationale: "AI engine could not resolve code safely."
    };
  }
}

/**
 * Build FHIR R4 Claim resource and apply financial rules
 */
export function buildFHIRAndApplyRules(items) {
  const accreditationMarkup = 1.15; // 15% Markup for GIVC standard
  const total = items.reduce((acc, curr) => acc + (curr.fee * accreditationMarkup), 0);

  return {
    resourceType: "Claim",
    id: `givc-clm-${Date.now()}`,
    status: "active",
    type: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/claim-type",
        code: "professional"
      }]
    },
    use: "claim",
    patient: {
      reference: "Patient/example"
    },
    created: new Date().toISOString(),
    provider: {
      reference: "Organization/GIVC"
    },
    priority: {
      coding: [{
        code: "normal"
      }]
    },
    items: items.map((it, index) => ({
      sequence: index + 1,
      productOrService: {
        coding: [{
          system: "http://sbs.moh.gov.sa",
          code: it.sbs_code,
          display: it.desc
        }]
      },
      unitPrice: {
        value: it.fee,
        currency: "SAR"
      },
      net: {
        value: Math.round(it.fee * accreditationMarkup),
        currency: "SAR"
      },
      ...it
    })),
    total: {
      value: Math.round(total),
      currency: "SAR"
    }
  };
}
