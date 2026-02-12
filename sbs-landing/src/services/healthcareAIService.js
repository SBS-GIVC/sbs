/**
 * Healthcare AI Service
 * AI-powered claim validation, denial prevention, and prediction capabilities
 */

import { healthcareApiService } from './healthcareApiService';
import { aiAssistantService } from './aiAssistantService';
import { aiPredictionService } from './aiPredictionService';

class HealthcareAIService {
    /**
     * AI-powered claim validation and scoring
     */
    async validateClaimSynchronously(claimData) {
        // Get real-time AI validation from the backend
        const validation = await healthcareApiService.validateClaim(claimData);

        // Additional AI analysis using prediction service
        const prediction = await aiPredictionService.predictClaimOutcome(claimData);

        // Combine validation results
        const combinedValidation = {
            ...validation,
            prediction: prediction,
            aiConfidence: 1 - validation.risk_score,
            recommendedActions: [
                ...(validation.recommended_actions || []),
                ...(prediction.suggestions || [])
            ],
            denialProbability: validation.risk_score,
            validationTimestamp: new Date().toISOString()
        };

        return combinedValidation;
    }

    /**
     * AI-powered denial prevention analysis
     */
    async analyzeDenialRisk(claimData) {
        const analysis = await aiPredictionService.analyzeClaimWinFactors(claimData);

        // Generate clinical notes review
        const clinicalReview = await this.reviewClinicalNotes(claimData.clinical_notes || '');

        return {
            denialRiskScore: analysis.riskScore || 0.15,
            riskFactors: analysis.riskFactors || [],
            strengthFactors: analysis.strengthFactors || [],
            recommendedActions: [
                ...(analysis.recommendations || []),
                ...(clinicalReview.recommendedActions || [])
            ],
            clinicalFeedback: clinicalReview.feedback || '',
            validityScore: analysis.validityScore || 0.85
        };
    }

    /**
     * AI review of clinical notes/coding
     */
    async reviewClinicalNotes(notes) {
        if (!notes || !aiAssistantService) {
            return { feedback: '', recommendedActions: [] };
        }

        try {
            const prompt = `Review the following clinical notes for healthcare claim accuracy and completeness:

Clinical Notes:
${notes}

Please evaluate:
1. Completeness of clinical information
2. Clarity of diagnosis
3. Specificity of procedure descriptions
4. Medical necessity justification
5. Appropriate coding opportunities

Provide:
- A brief assessment (1-2 sentences)
- 3-5 specific recommendations for improvement
- Any red flags that might cause denial

Format your response in JSON:
{
  "assessment": "...",
  "recommendations": ["...", "...", "..."],
  "redFlags": ["...", "..."],
  "completeness_score": 0.0-1.0
}`;

            const response = await aiAssistantService.generateResponse(prompt);
            const parsed = JSON.parse(response);

            return {
                feedback: parsed.assessment,
                recommendedActions: parsed.recommendations || [],
                redFlags: parsed.redFlags || [],
                completenessScore: parsed.completeness_score || 0.5
            };

        } catch (error) {
            console.error('AI review error:', error);
            return {
                feedback: 'Unable to analyze clinical notes at this time',
                recommendedActions: ['Verify all required fields are present'],
                redFlags: [],
                completenessScore: 0.5
            };
        }
    }

    /**
     * AI-powered diagnosis code validation
     */
    async validateDiagnosisCodes(diagnosisCodes, clinicalNotes = '') {
        const validationResults = [];

        for (const code of diagnosisCodes) {
            try {
                // Check if code exists in terminology
                const terminologyValidation = await healthcareApiService.validateTerminology(
                    'http://hl7.org/fhir/sid/icd-10',
                    code
                );

                if (!terminologyValidation.is_valid) {
                    validationResults.push({
                        code: code,
                        isValid: false,
                        reason: terminologyValidation.reason || 'Invalid code',
                        alternatives: terminologyValidation.suggestions || []
                    });
                } else {
                    // AI analysis of code appropriateness
                    const appropriateness = await this.analyzeCodeAppropriateness(code, clinicalNotes);

                    validationResults.push({
                        code: code,
                        isValid: true,
                        description: terminologyValidation.description,
                        appropriatenessScore: appropriateness.score,
                        notes: appropriateness.notes,
                        concerns: appropriateness.concerns
                    });
                }
            } catch (error) {
                validationResults.push({
                    code: code,
                    isValid: false,
                    reason: 'Validation error: ' + error.message,
                    alternatives: []
                });
            }
        }

        return validationResults;
    }

    /**
     * AI analysis of code appropriateness
     */
    async analyzeCodeAppropriateness(code, clinicalNotes) {
        if (!aiAssistantService || !clinicalNotes) {
            return {
                score: 0.7,
                notes: 'Insufficient clinical information for full analysis',
                concerns: []
            };
        }

        try {
            const prompt = `Analyze the appropriateness of the ICD-10 code ${code} based on the following clinical notes:

Clinical Notes: ${clinicalNotes}

Evaluate:
1. Medical necessity (0-1)
2. Clinical support in notes (0-1)
3. Specificity of the code (0-1)
4. Common coding errors

Provide in JSON:
{
  "score": 0.0-1.0,
  "notes": "...",
  "concerns": ["...", "..."]
}`;

            const response = await aiAssistantService.generateResponse(prompt);
            return JSON.parse(response);
        } catch (error) {
            return { score: 0.7, notes: 'Could not analyze', concerns: [] };
        }
    }

    /**
     * AI-powered prior authorization prediction
     */
    async predictPriorAuthOutcome(priorAuthData) {
        const prediction = await aiPredictionService.predictPriorAuthOutcome(priorAuthData);

        // Analyze clinical justification
        const justificationAnalysis = await this.analyzeJustification(priorAuthData.clinical_justification);

        return {
            approvalProbability: prediction.approvalProbability || 0.6,
            estimatedDuration: prediction.estimatedDuration || '3-5 business days',
            confidence: prediction.confidence || 0.75,
            clinicalStrength: justificationAnalysis.strength,
            improvementSuggestions: [
                ...(prediction.suggestions || []),
                ...(justificationAnalysis.suggestions || [])
            ],
            documentationNeeded: this.identifyDocumentationNeeds(priorAuthData)
        };
    }

    /**
     * Analyze clinical justification
     */
    async analyzeJustification(justification) {
        if (!justification || !aiAssistantService) {
            return { strength: 0.5, suggestions: ['Add detailed clinical justification'] };
        }

        try {
            const prompt = `Analyze the clinical justification for prior authorization:

Justification: ${justification}

Evaluate:
1. Strength of medical necessity (0-1)
2. Clinical detail level (0-1)
3. Evidence quality (0-1)

Provide:
- Overall strength score (weighted average)
- 3-5 suggestions for improvement

Format:
{
  "strength": 0.0-1.0,
  "suggestions": ["...", "...", "..."]
}`;

            const response = await aiAssistantService.generateResponse(prompt);
            return JSON.parse(response);
        } catch (error) {
            return { strength: 0.5, suggestions: [] };
        }
    }

    /**
     * Identify missing documentation
     */
    identifyDocumentationNeeds(requestData) {
        const needs = [];

        if (!requestData.diagnosis_codes || requestData.diagnosis_codes.length === 0) {
            needs.push('Diagnosis codes');
        }

        if (!requestData.clinical_justification || requestData.clinical_justification.length < 50) {
            needs.push('Detailed clinical justification');
        }

        if (!requestData.start_date || !requestData.end_date) {
            needs.push('Treatment dates');
        }

        return needs;
    }

    /**
     * AI-powered claim coding system
     */
    async suggestCPTCodes(clinicalNotes, diagnosisCodes) {
        if (!aiAssistantService || !clinicalNotes) {
            return { codes: [], confidence: 0.5, notes: 'Insufficient clinical information' };
        }

        try {
            const prompt = `Based on the following clinical notes and diagnosis codes, suggest appropriate CPT codes:

Clinical Notes: ${clinicalNotes}
Diagnosis Codes: ${diagnosisCodes.join(', ')}

Please provide:
1. 2-5 most appropriate CPT codes with descriptions
2. Confidence level for each (0-1)
3. Brief reasoning for each suggestion

Format in JSON:
{
  "codes": [
    {
      "code": "99213",
      "description": "...",
      "confidence": 0.85,
      "reasoning": "..."
    },
    ...
  ],
  "notes": "..."
}`;

            const response = await aiAssistantService.generateResponse(prompt);
            return JSON.parse(response);
        } catch (error) {
            return { codes: [], confidence: 0.5, notes: 'Could not generate suggestions' };
        }
    }

    /**
     * AI-powered payer-specific rules analysis
     */
    async analyzePayerRules(claimData, payerId) {
        const rules = await aiPredictionService.getCustomRules(payerId, claimData);

        // Analyze compliance with payer requirements
        let complianceScore = 0;
        const violations = [];

        if (!rules) {
            return { complianceScore: 1, violations: [], suggestions: [] };
        }

        rules.forEach(rule => {
            if (this.checkRuleCompliance(claimData, rule)) {
                complianceScore += rule.weight || 0.1;
            } else {
                violations.push({
                    rule: rule.name,
                    requirement: rule.requirement,
                    severity: rule.severity
                });
            }
        });

        // Normalize score (0-1)
        complianceScore = Math.min(1, complianceScore / rules.length);

        // Generate suggestions based on violations
        const suggestions = violations
            .filter(v => v.severity === 'high')
            .map(v => `Address ${v.rule} to comply with ${v.requirement}`);

        return {
            complianceScore,
            violations,
            suggestions,
            rulesAnalyzed: rules.length
        };
    }

    /**
     * Check rule compliance
     */
    checkRuleCompliance(claimData, rule) {
        // Simple rule checking logic
        switch (rule.type) {
            case 'field_required':
                return claimData.hasOwnProperty(rule.field) && claimData[rule.field];
            case 'value_range':
                return claimData[rule.field] >= rule.min && claimData[rule.field] <= rule.max;
            case 'pattern_match':
                return new RegExp(rule.pattern).test(claimData[rule.field]);
            default:
                return true;
        }
    }

    /**
     * Batch claim analysis for reporting
     */
    async analyzeClaimBatch(claims) {
        const results = [];
        let totalRiskScore = 0;
        let totalDenialProbability = 0;

        for (const claim of claims) {
            const analysis = await this.analyzeDenialRisk(claim);
            results.push({
                claimId: claim.id || claim.claim_uuid,
                riskScore: analysis.denialRiskScore,
                recommendedActions: analysis.recommendedActions,
                clinicalFeedback: analysis.clinicalFeedback
            });

            totalRiskScore += analysis.denialRiskScore;
            totalDenialProbability += analysis.delityProbability || analysis.denialRiskScore;
        }

        const averageRiskScore = totalRiskScore / claims.length;
        const averageDenialProbability = totalDenialProbability / claims.length;

        // Generate batch insights
        const insights = {
            overallRisk: averageRiskScore,
            denialProbability: averageDenialProbability,
            highRiskCount: results.filter(r => r.riskScore > 0.7).length,
            mediumRiskCount: results.filter(r => r.riskScore > 0.3 && r.riskScore <= 0.7).length,
            lowRiskCount: results.filter(r => r.riskScore <= 0.3).length
        };

        // Common recommendations
        const commonRecommendations = this.findCommonRecommendations(results);

        return {
            results,
            insights,
            commonRecommendations
        };
    }

    /**
     * Find common recommendations across claims
     */
    findCommonRecommendations(analysisResults) {
        const recommendationCounts = {};

        analysisResults.forEach(result => {
            result.recommendedActions?.forEach(action => {
                recommendationCounts[action] = (recommendationCounts[action] || 0) + 1;
            });
        });

        // Sort by frequency
        const sorted = Object.entries(recommendationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([action, count]) => ({
                action,
                count,
                percentage: ((count / analysisResults.length) * 100).toFixed(0)
            }));

        return sorted;
    }
}

// Create default instance
export const healthcareAIService = new HealthcareAIService();

// Also export for default import
export default healthcareAIService;