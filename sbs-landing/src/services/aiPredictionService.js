/**
 * AI Prediction Analytics Service
 * Provides predictive analytics for claims, cost optimization, fraud detection, and compliance
 */

const API_BASE_URL = window.SBS_API_URL || window.location.origin;

/**
 * Predict claim approval probability and risk factors
 */
export async function predictClaim(facilityId, patientAge, patientGender, diagnosisCodes, procedureCodes, serviceDate, totalAmount) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/predict-claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_id: facilityId,
        patient_age: patientAge,
        patient_gender: patientGender,
        diagnosis_codes: diagnosisCodes,
        procedure_codes: procedureCodes,
        service_date: serviceDate,
        total_amount: totalAmount
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Claim prediction error:", error);
    return {
      prediction_type: "claim_approval",
      confidence: 0.7,
      risk_score: 30,
      recommendations: ["Unable to analyze claim - please review manually"],
      insights: { error: "Prediction service unavailable" }
    };
  }
}

/**
 * Optimize claim costs and identify savings opportunities
 */
export async function optimizeCost(facilityId, claimItems, patientInfo = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/optimize-cost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_id: facilityId,
        claim_items: claimItems,
        patient_info: patientInfo
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Cost optimization error:", error);
    return {
      total_savings: 0,
      savings_percentage: 0,
      optimized_items: [],
      recommendations: ["Unable to analyze costs - please review manually"]
    };
  }
}

/**
 * Detect potential fraud using pattern analysis
 */
export async function detectFraud(facilityId, claimData, historicalClaims = []) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/detect-fraud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_id: facilityId,
        claim_data: claimData,
        historical_claims: historicalClaims
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Fraud detection error:", error);
    return {
      is_fraudulent: false,
      fraud_score: 0,
      risk_factors: ["Unable to analyze - please review manually"],
      recommendations: ["Manual review recommended"]
    };
  }
}

/**
 * Check claim compliance with CHI and NPHIES regulations
 */
export async function checkCompliance(facilityId, claimData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/check-compliance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_id: facilityId,
        claim_data: claimData
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Compliance check error:", error);
    return {
      is_compliant: false,
      violations: ["Unable to check compliance"],
      warnings: ["Manual compliance review required"],
      suggestions: ["Consult CHI guidelines"]
    };
  }
}

/**
 * Get comprehensive claim analysis
 */
export async function analyzeClaim(facilityId, claimData) {
  try {
    // Run all analyses in parallel
    const [prediction, optimization, fraud, compliance] = await Promise.all([
      predictClaim(
        facilityId,
        claimData.patient_age,
        claimData.patient_gender,
        claimData.diagnosis_codes,
        claimData.procedure_codes,
        claimData.service_date,
        claimData.total_amount
      ),
      optimizeCost(facilityId, claimData.items, claimData.patient_info),
      detectFraud(facilityId, claimData),
      checkCompliance(facilityId, claimData)
    ]);

    // Calculate overall risk score
    const overallRiskScore = Math.max(
      prediction.risk_score,
      fraud.fraud_score,
      compliance.is_compliant ? 0 : 50
    );

    // Generate comprehensive recommendations
    const allRecommendations = [
      ...prediction.recommendations,
      ...optimization.recommendations,
      ...fraud.recommendations,
      ...compliance.suggestions
    ];

    // Determine overall status
    let overallStatus = "APPROVED";
    if (overallRiskScore > 70) {
      overallStatus = "REJECTED";
    } else if (overallRiskScore > 40) {
      overallStatus = "REVIEW_REQUIRED";
    } else if (!compliance.is_compliant) {
      overallStatus = "COMPLIANCE_ISSUE";
    } else if (optimization.savings_percentage > 10) {
      overallStatus = "OPTIMIZATION_AVAILABLE";
    }

    return {
      overall_status: overallStatus,
      overall_risk_score: overallRiskScore,
      prediction,
      optimization,
      fraud,
      compliance,
      recommendations: allRecommendations,
      insights: {
        potential_savings: optimization.total_savings,
        approval_probability: prediction.confidence,
        fraud_risk: fraud.fraud_score,
        compliance_status: compliance.is_compliant ? "COMPLIANT" : "NON_COMPLIANT"
      }
    };
  } catch (error) {
    console.error("Comprehensive claim analysis error:", error);
    return {
      overall_status: "ANALYSIS_FAILED",
      overall_risk_score: 0,
      prediction: {
        prediction_type: "claim_approval",
        confidence: 0.7,
        risk_score: 30,
        recommendations: ["Analysis unavailable"],
        insights: {}
      },
      optimization: {
        total_savings: 0,
        savings_percentage: 0,
        optimized_items: [],
        recommendations: ["Analysis unavailable"]
      },
      fraud: {
        is_fraudulent: false,
        fraud_score: 0,
        risk_factors: ["Analysis unavailable"],
        recommendations: ["Manual review"]
      },
      compliance: {
        is_compliant: false,
        violations: ["Analysis unavailable"],
        warnings: ["Manual review required"],
        suggestions: ["Consult guidelines"]
      },
      recommendations: ["Unable to perform AI analysis - please review manually"],
      insights: {
        error: "AI prediction service unavailable"
      }
    };
  }
}

/**
 * Get facility analytics and trends
 */
export async function getFacilityAnalytics(facilityId, days = 30) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/facility-analytics?facility_id=${facilityId}&days=${days}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Facility analytics error:", error);
    return {
      total_claims: 0,
      approved_claims: 0,
      rejected_claims: 0,
      average_approval_rate: 0,
      total_amount: 0,
      average_amount: 0,
      top_procedures: [],
      trends: []
    };
  }
}

/**
 * Generate claim submission report
 */
export async function generateReport(facilityId, claimData, analysis) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        facility_id: facilityId,
        claim_data: claimData,
        analysis: analysis
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Report generation error:", error);
    return {
      report_id: null,
      summary: "Report generation failed",
      details: "Unable to generate comprehensive report",
      recommendations: ["Manual report preparation required"]
    };
  }
}

// Export all functions
export {
  predictClaim,
  optimizeCost,
  detectFraud,
  checkCompliance,
  analyzeClaim,
  getFacilityAnalytics,
  generateReport
};
