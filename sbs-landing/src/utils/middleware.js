// Middleware Logic - SBS Code Normalization and FHIR Processing
import { callGemini } from '../services/geminiService';
import { APIService } from '../services/apiService';

// Local mapping database for quick lookups
const MAPPING_DB = {
  "LAB_001": { sbs_code: "SBS-LAB-102", desc: "Complete Blood Count (CBC)", fee: 150 },
  "CONS_99": { sbs_code: "SBS-OP-500", desc: "Consultation - Consultant Physician", fee: 400 },
};

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
    const aiResponse = await callGemini(
      `Map hospital service to SBS code.
       Code: ${internalCode} | Desc: ${description} | Lang: ${lang === 'ar' ? 'Arabic' : 'English'}
       Return ONLY JSON: {"code": "SBS-XXX-000", "desc": "Official Name", "confidence": 0.85, "rationale": "Explanation"}`,
      "You are a Senior Saudi Medical Coder. Strict JSON output only."
    );

    if (!aiResponse) throw new Error("Empty AI Response");

    const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

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
