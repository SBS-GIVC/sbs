const crypto = require('crypto');

const DEFAULT_AI_POLICY = {
  lowRiskThreshold: 45,
  reviewThreshold: 70,
  blockThreshold: 85,
  requireHumanApprovalAtOrAbove: 70
};

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function fingerprintPayload(payload) {
  const normalized = JSON.stringify(payload || {});
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function extractByRegex(text, regex, normalize = (v) => v) {
  const hits = [];
  if (!text) return hits;
  let match = regex.exec(text);
  while (match) {
    hits.push(normalize(match[0]));
    match = regex.exec(text);
  }
  return uniq(hits);
}

function toSupportingInfoEntry(sequence, category, code, valueString, confidence, sourceType) {
  return {
    sequence,
    category: { text: category },
    code: { text: code },
    valueString,
    extension: [
      {
        url: 'https://sbs.sa/fhir/StructureDefinition/ai-confidence',
        valueDecimal: Number(confidence.toFixed(3))
      },
      {
        url: 'https://sbs.sa/fhir/StructureDefinition/ai-source-type',
        valueString: sourceType
      }
    ]
  };
}

function normalizeLabResults(rawLabResults) {
  const labResults = toArray(rawLabResults);
  return labResults
    .map((entry) => {
      if (typeof entry === 'string') {
        const normalized = entry.trim();
        return normalized ? { text: normalized } : null;
      }
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const name = String(entry.name || entry.test || entry.code || '').trim();
      const value = String(entry.value ?? '').trim();
      const unit = String(entry.unit || '').trim();
      const range = String(entry.referenceRange || entry.range || '').trim();
      if (!name && !value) return null;
      return {
        text: `${name}${name && value ? ': ' : ''}${value}${unit ? ` ${unit}` : ''}${range ? ` (range ${range})` : ''}`.trim()
      };
    })
    .filter(Boolean);
}

function extractEvidenceFromContent(input = {}) {
  const evidenceText = String(input.evidenceText || input.text || '').trim();
  const sourceType = String(input.sourceType || 'text').trim().toLowerCase() || 'text';
  const sourceName = String(input.sourceName || '').trim();
  const labEntries = normalizeLabResults(input.labResults || input.lab_results);

  const diagnosisCodes = extractByRegex(
    evidenceText,
    /\b[A-TV-Z][0-9][0-9](?:\.[A-Z0-9]{1,4})?\b/g,
    (value) => value.toUpperCase()
  );
  const procedureCodes = extractByRegex(
    evidenceText,
    /\b\d{5}-\d{2}-\d{2}\b/g,
    (value) => value
  );

  const labPattern = /([A-Za-z][A-Za-z0-9\s\-\/]{1,40})\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z/%µ]+)?/g;
  const parsedLabs = [];
  let labMatch = labPattern.exec(evidenceText);
  while (labMatch) {
    const name = labMatch[1].trim();
    const value = labMatch[2].trim();
    const unit = (labMatch[3] || '').trim();
    parsedLabs.push({
      text: `${name}: ${value}${unit ? ` ${unit}` : ''}`
    });
    labMatch = labPattern.exec(evidenceText);
  }

  const combinedLabs = uniq([...labEntries.map((entry) => entry.text), ...parsedLabs.map((entry) => entry.text)]);

  const sourceConfidence = {
    text: 0.84,
    json: 0.9,
    xml: 0.86,
    pdf: 0.76,
    image_ocr: 0.68
  };
  const baseConfidence = sourceConfidence[sourceType] || 0.72;
  const evidenceCoverage = clamp01(
    (diagnosisCodes.length > 0 ? 0.35 : 0) +
    (procedureCodes.length > 0 ? 0.35 : 0) +
    (combinedLabs.length > 0 ? 0.3 : 0)
  );
  const confidenceScore = clamp01(baseConfidence * 0.65 + evidenceCoverage * 0.35);

  let sequence = 1;
  const supportingInfo = [];
  for (const diagnosisCode of diagnosisCodes) {
    supportingInfo.push(
      toSupportingInfoEntry(sequence++, 'diagnosis-evidence', 'diagnosis-code', diagnosisCode, confidenceScore, sourceType)
    );
  }
  for (const procedureCode of procedureCodes) {
    supportingInfo.push(
      toSupportingInfoEntry(sequence++, 'procedure-evidence', 'procedure-code', procedureCode, confidenceScore, sourceType)
    );
  }
  for (const labText of combinedLabs) {
    supportingInfo.push(
      toSupportingInfoEntry(sequence++, 'laboratory-evidence', 'lab-result', labText, confidenceScore, sourceType)
    );
  }

  const warnings = [];
  if (!evidenceText && combinedLabs.length === 0) {
    warnings.push('No extractable evidence text provided.');
  }
  if (!diagnosisCodes.length) {
    warnings.push('No diagnosis code detected in evidence.');
  }
  if (!procedureCodes.length) {
    warnings.push('No SBS procedure code detected in evidence.');
  }

  return {
    capability: 'multimodal_evidence_extractor',
    version: 'v1',
    source: {
      type: sourceType,
      name: sourceName || null
    },
    extracted: {
      diagnosisCodes,
      procedureCodes,
      labResults: combinedLabs
    },
    supportingInfo,
    confidence: {
      score: Number(confidenceScore.toFixed(3)),
      sourceConfidence: Number(baseConfidence.toFixed(3)),
      evidenceCoverage: Number(evidenceCoverage.toFixed(3))
    },
    warnings
  };
}

function assessPreSubmitDenial(input = {}, policy = DEFAULT_AI_POLICY) {
  const claimType = String(input.claimType || input.claim_type || '').trim().toLowerCase();
  const diagnosisCodes = uniq(toArray(input.diagnosisCodes || input.diagnosis_codes).map((code) => String(code).toUpperCase()));
  const procedureCodes = uniq(toArray(input.procedureCodes || input.procedure_codes));
  const totalAmount = Math.max(0, toNumber(input.totalAmount || input.total_amount || input.amount, 0));
  const memberId = String(input.memberId || input.member_id || input.patientId || input.patient_id || '').trim();
  const mappingConfidence = clamp01(input.mappingConfidence ?? input.mapping_confidence ?? 0.65);
  const priorRejections = Math.max(0, Math.floor(toNumber(input.priorRejections || input.prior_rejections, 0)));
  const evidenceConfidence = clamp01(input.evidenceConfidence ?? input.evidence_confidence ?? 0.45);
  const attachmentCount = Math.max(0, Math.floor(toNumber(input.attachmentCount || input.attachment_count, 0)));

  const missingRequiredFields = [];
  if (!memberId) missingRequiredFields.push('memberId');
  if (!claimType) missingRequiredFields.push('claimType');
  if (!diagnosisCodes.length) missingRequiredFields.push('diagnosisCodes');
  if (!procedureCodes.length) missingRequiredFields.push('procedureCodes');
  if (totalAmount <= 0) missingRequiredFields.push('totalAmount');

  const missingDataRisk = clamp01(missingRequiredFields.length / 5);
  const amountRisk = clamp01(totalAmount / 25000);
  const complexityRisk = clamp01((diagnosisCodes.length + procedureCodes.length) / 12);
  const mismatchRisk = clamp01(
    procedureCodes.length > 0 && diagnosisCodes.length > 0
      ? Math.max(0, (procedureCodes.length / diagnosisCodes.length) - 2) / 4
      : 0.7
  );
  const mappingRisk = clamp01(1 - mappingConfidence);
  const priorDenialRisk = clamp01(priorRejections / 4);
  const evidenceRisk = clamp01(1 - evidenceConfidence + (attachmentCount === 0 ? 0.15 : 0));

  const weightedRisk = clamp01(
    (missingDataRisk * 0.25) +
    (amountRisk * 0.16) +
    (complexityRisk * 0.12) +
    (mismatchRisk * 0.14) +
    (mappingRisk * 0.14) +
    (priorDenialRisk * 0.1) +
    (evidenceRisk * 0.09)
  );
  const riskScore = Math.round(weightedRisk * 100);
  const confidence = clamp01(0.88 - (missingDataRisk * 0.18) - (mismatchRisk * 0.12));

  const factors = [
    { id: 'missing_data', label: 'Required Data Completeness', score: Math.round(missingDataRisk * 100), impact: missingDataRisk > 0.5 ? 'high' : 'medium' },
    { id: 'amount', label: 'Claim Amount Risk', score: Math.round(amountRisk * 100), impact: amountRisk > 0.7 ? 'high' : 'low' },
    { id: 'complexity', label: 'Code Complexity', score: Math.round(complexityRisk * 100), impact: complexityRisk > 0.65 ? 'high' : 'medium' },
    { id: 'code_mismatch', label: 'Diagnosis/Procedure Mismatch', score: Math.round(mismatchRisk * 100), impact: mismatchRisk > 0.6 ? 'high' : 'medium' },
    { id: 'mapping', label: 'Normalization Confidence', score: Math.round(mappingRisk * 100), impact: mappingRisk > 0.55 ? 'high' : 'medium' },
    { id: 'prior_denials', label: 'Historical Denial Pattern', score: Math.round(priorDenialRisk * 100), impact: priorDenialRisk > 0.5 ? 'high' : 'low' },
    { id: 'evidence', label: 'Supporting Evidence Strength', score: Math.round(evidenceRisk * 100), impact: evidenceRisk > 0.55 ? 'high' : 'medium' }
  ];

  const suggestedFixes = [];
  if (!memberId) {
    suggestedFixes.push({
      priority: 'P0',
      fieldPath: 'memberId',
      action: 'Provide a valid member identifier from eligibility verification output.',
      why: 'Claims without member identifiers are commonly rejected at intake validation.'
    });
  }
  if (!diagnosisCodes.length) {
    suggestedFixes.push({
      priority: 'P0',
      fieldPath: 'diagnosisCodes',
      action: 'Add at least one diagnosis code tied to the billed procedure.',
      why: 'Medical necessity validation requires diagnosis evidence.'
    });
  }
  if (!procedureCodes.length) {
    suggestedFixes.push({
      priority: 'P0',
      fieldPath: 'procedureCodes',
      action: 'Attach one or more SBS/NPHIES-compatible procedure codes.',
      why: 'Claims with missing procedure codes cannot be adjudicated.'
    });
  }
  if (mappingRisk > 0.5) {
    suggestedFixes.push({
      priority: 'P1',
      fieldPath: 'normalization.mappingConfidence',
      action: 'Review normalization mapping and confirm official SBS code alignment.',
      why: 'Low mapping confidence increases code validation rejection risk.'
    });
  }
  if (evidenceRisk > 0.55) {
    suggestedFixes.push({
      priority: 'P1',
      fieldPath: 'supportingInfo',
      action: 'Attach structured clinical evidence (labs, findings, notes) to strengthen adjudication.',
      why: 'Weak supporting evidence raises rejection and rework probability.'
    });
  }
  if (totalAmount > 18000) {
    suggestedFixes.push({
      priority: 'P2',
      fieldPath: 'financial.narrative',
      action: 'Add a concise cost narrative explaining quantity, pricing, and medical necessity.',
      why: 'High-value claims require stronger payer justification.'
    });
  }

  let band = 'low';
  if (riskScore >= policy.blockThreshold) band = 'critical';
  else if (riskScore >= policy.reviewThreshold) band = 'high';
  else if (riskScore >= policy.lowRiskThreshold) band = 'medium';

  const recommendedAction = riskScore >= policy.blockThreshold
    ? 'block'
    : (riskScore >= policy.reviewThreshold ? 'review' : 'allow');

  return {
    capability: 'pre_submit_denial_prevention_copilot',
    version: 'v1',
    risk: {
      score: riskScore,
      band
    },
    confidence: Number(confidence.toFixed(3)),
    decision: {
      recommendedAction,
      requiresHumanApproval: riskScore >= policy.requireHumanApprovalAtOrAbove,
      approvalReason: recommendedAction === 'allow'
        ? 'Risk is within configured threshold.'
        : 'Risk exceeds configured autonomous acceptance threshold.'
    },
    factors,
    missingRequiredFields,
    suggestedFixes,
    summary: recommendedAction === 'allow'
      ? 'Claim is suitable for direct submission with routine monitoring.'
      : 'Claim should be corrected/reviewed before NPHIES submission.',
    payloadFingerprint: fingerprintPayload({
      claimType,
      diagnosisCodes,
      procedureCodes,
      totalAmount,
      memberIdPresent: Boolean(memberId),
      mappingConfidence,
      priorRejections,
      evidenceConfidence,
      attachmentCount
    })
  };
}

function buildReAdjudicationAutopilotDraft(input = {}) {
  const claimId = String(input.claimId || input.claim_id || '').trim();
  const rejectionReasons = uniq(toArray(input.rejectionReasons || input.rejection_reasons).map((item) => String(item)));
  const resourceTypePreference = String(input.resourceType || input.resource_type || 'CommunicationRequest').trim();
  const evidenceExtraction = input.evidenceExtraction || {};
  const evidenceSupportingInfo = Array.isArray(evidenceExtraction.supportingInfo) ? evidenceExtraction.supportingInfo : [];
  const evidenceDiagnosis = uniq(toArray(evidenceExtraction?.extracted?.diagnosisCodes));
  const evidenceProcedures = uniq(toArray(evidenceExtraction?.extracted?.procedureCodes));
  const additionalNotes = String(input.notes || input.additional_notes || '').trim();
  const reasonCode = String(input.reasonCode || input.reason_code || 're-adjudication').trim() || 're-adjudication';

  const evidenceDeltas = [];
  if (evidenceDiagnosis.length) {
    evidenceDeltas.push(`Added diagnosis evidence codes: ${evidenceDiagnosis.join(', ')}`);
  }
  if (evidenceProcedures.length) {
    evidenceDeltas.push(`Added procedure evidence codes: ${evidenceProcedures.join(', ')}`);
  }
  if (evidenceSupportingInfo.length) {
    evidenceDeltas.push(`Attached ${evidenceSupportingInfo.length} structured supportingInfo entries.`);
  }
  if (additionalNotes) {
    evidenceDeltas.push(`Clinician notes included: ${additionalNotes}`);
  }

  const rejectionSummary = rejectionReasons.length
    ? `Previous adjudication reasons: ${rejectionReasons.join('; ')}.`
    : 'Previous adjudication reasons were not explicitly provided.';

  const draftMessage = [
    `Requesting re-adjudication for claim ${claimId || '[claim-id]'}.`,
    rejectionSummary,
    evidenceDeltas.length
      ? `Submitted corrections/evidence updates: ${evidenceDeltas.join(' ')}`
      : 'No evidence deltas provided; attach supporting documentation before approval.'
  ].join(' ');

  const basePayload = {
    reasonCode: [{ text: reasonCode }],
    payload: [{ contentString: draftMessage }]
  };
  const communicationPayload = {
    resourceType: 'Communication',
    status: 'completed',
    sent: new Date().toISOString(),
    ...basePayload
  };
  const communicationRequestPayload = {
    resourceType: 'CommunicationRequest',
    status: 'active',
    authoredOn: new Date().toISOString(),
    ...basePayload
  };

  const recommendedResourceType = resourceTypePreference === 'Communication'
    ? 'Communication'
    : 'CommunicationRequest';

  return {
    capability: 're_adjudication_autopilot',
    version: 'v1',
    claimId: claimId || null,
    reasonCode,
    draftMessage,
    evidenceDeltas,
    approvalChecklist: [
      'Confirm claimId and rejection reasons are correct.',
      'Verify evidence deltas match actual submitted documents.',
      'Ensure no PHI beyond required claim context is present in free text.'
    ],
    payloads: {
      Communication: communicationPayload,
      CommunicationRequest: communicationRequestPayload
    },
    recommendedResourceType,
    recommendedPayload: recommendedResourceType === 'Communication'
      ? communicationPayload
      : communicationRequestPayload
  };
}

function composePriorAuthNarrative(input = {}) {
  const payerType = String(input.payerType || input.payer_type || 'default').trim().toLowerCase();
  const payerName = String(input.payerName || input.payer_name || 'payer').trim();
  const memberId = String(input.memberId || input.member_id || '').trim();
  const diagnosisCodes = uniq(toArray(input.diagnosisCodes || input.diagnosis_codes).map((code) => String(code).toUpperCase()));
  const procedureCodes = uniq(toArray(input.procedureCodes || input.procedure_codes));
  const clinicalSummary = String(input.clinicalSummary || input.clinical_summary || '').trim();

  const payerSpecificFields = {
    default: ['memberId', 'providerId', 'diagnosisCodes', 'procedureCodes', 'clinicalJustification'],
    government: ['memberId', 'nationalId', 'referralId', 'diagnosisCodes', 'procedureCodes', 'clinicalJustification'],
    private: ['memberId', 'policyNumber', 'coveragePlan', 'diagnosisCodes', 'procedureCodes', 'clinicalJustification']
  };

  const requiredFields = payerSpecificFields[payerType] || payerSpecificFields.default;

  const narrative = [
    `Prior-authorization request for ${payerName}.`,
    memberId ? `Member ID: ${memberId}.` : 'Member ID: [missing].',
    diagnosisCodes.length ? `Diagnoses: ${diagnosisCodes.join(', ')}.` : 'Diagnoses: [missing].',
    procedureCodes.length ? `Requested procedures: ${procedureCodes.join(', ')}.` : 'Requested procedures: [missing].',
    clinicalSummary
      ? `Clinical justification: ${clinicalSummary}`
      : 'Clinical justification: [Add concise medical-necessity narrative tied to diagnosis/procedure].'
  ].join(' ');

  const readinessScore = Math.round(
    clamp01(
      (memberId ? 0.2 : 0) +
      (diagnosisCodes.length ? 0.25 : 0) +
      (procedureCodes.length ? 0.25 : 0) +
      (clinicalSummary ? 0.3 : 0)
    ) * 100
  );

  return {
    capability: 'smart_prior_auth_composer',
    version: 'v1',
    payer: {
      type: payerType,
      name: payerName
    },
    readinessScore,
    narrative,
    requiredFields,
    missingFields: requiredFields.filter((field) => {
      if (field === 'memberId') return !memberId;
      if (field === 'diagnosisCodes') return !diagnosisCodes.length;
      if (field === 'procedureCodes') return !procedureCodes.length;
      if (field === 'clinicalJustification') return !clinicalSummary;
      return false;
    }),
    recommendations: [
      'Reference payer policy criteria explicitly in the clinical justification.',
      'Keep procedure count tightly aligned with diagnosis list to reduce medical review friction.',
      'Attach supporting diagnostics for high-cost or high-complexity procedures.'
    ]
  };
}

function predictWorkflowSlaRouting(input = {}) {
  const currentStage = String(input.currentStage || input.current_stage || 'validation').trim();
  const stageDurations = input.stageDurations || input.stage_durations || {};
  const serviceHealth = input.serviceHealth || input.service_health || {};
  const n8nQueueDepth = Math.max(0, Math.floor(toNumber(input.n8nQueueDepth || input.n8n_queue_depth, 0)));
  const claimComplexity = clamp01(input.claimComplexity ?? input.claim_complexity ?? 0.4);

  const stageSlaSeconds = {
    validation: 30,
    normalization: 45,
    financialRules: 45,
    signing: 30,
    nphiesSubmission: 60
  };

  const stageDurationSeconds = toNumber(stageDurations[currentStage], 0);
  const stageBreachRatio = clamp01(stageDurationSeconds / (stageSlaSeconds[currentStage] || 45));
  const unhealthyServices = Object.entries(serviceHealth)
    .filter(([, value]) => String(value).toLowerCase() !== 'healthy')
    .map(([key]) => key);
  const serviceRisk = clamp01(unhealthyServices.length / 4);
  const queueRisk = clamp01(n8nQueueDepth / 50);

  const breachProbability = clamp01(
    (stageBreachRatio * 0.38) +
    (serviceRisk * 0.28) +
    (queueRisk * 0.16) +
    (claimComplexity * 0.18)
  );

  const route = (breachProbability >= 0.72 || unhealthyServices.includes('n8n'))
    ? 'direct_sbs_primary'
    : 'n8n_primary';

  return {
    capability: 'workflow_ai_orchestrator',
    version: 'v1',
    currentStage,
    sla: {
      stageDurationSeconds,
      stageSlaSeconds: stageSlaSeconds[currentStage] || null,
      breachProbability: Number(breachProbability.toFixed(3))
    },
    decision: {
      route,
      fallbackSequence: route === 'direct_sbs_primary'
        ? ['direct_sbs', 'n8n']
        : ['n8n', 'direct_sbs'],
      unhealthyServices
    },
    recommendations: route === 'direct_sbs_primary'
      ? ['Route directly to SBS microservices for this request.', 'Keep n8n as async secondary pathway.']
      : ['Continue with n8n orchestration.', 'Monitor stage latency and switch if breach probability rises.']
  };
}

function recommendFacilityOptimization(input = {}) {
  const facilityId = Number(input.facilityId || input.facility_id || 1);
  const claims = Array.isArray(input.claims) ? input.claims : [];

  const terminalClaims = claims.filter((claim) => ['accepted', 'completed', 'rejected', 'failed', 'error'].includes(String(claim.status || '').toLowerCase()));
  const deniedClaims = terminalClaims.filter((claim) => ['rejected', 'failed', 'error'].includes(String(claim.status || '').toLowerCase()));
  const reworkedClaims = claims.filter((claim) => Array.isArray(claim.reAdjudication) && claim.reAdjudication.length > 0);

  const denialRate = terminalClaims.length ? deniedClaims.length / terminalClaims.length : 0;
  const reworkRate = claims.length ? reworkedClaims.length / claims.length : 0;
  const benchmarkDenial = 0.14;
  const benchmarkRework = 0.09;

  const recommendations = [];
  if (denialRate > benchmarkDenial) {
    recommendations.push({
      priority: 'P0',
      area: 'coding_quality',
      action: 'Introduce mandatory pre-submit denial copilot review for high-risk claims.',
      expectedImpact: 'Lower denial rate by catching coding/completeness defects before submission.'
    });
  }
  if (reworkRate > benchmarkRework) {
    recommendations.push({
      priority: 'P1',
      area: 'evidence_quality',
      action: 'Require structured supportingInfo extraction for claims above configured amount threshold.',
      expectedImpact: 'Reduce re-adjudication workload and improve first-pass acceptance.'
    });
  }
  recommendations.push({
    priority: 'P2',
    area: 'operations',
    action: 'Track stage-level SLA breaches and auto-reroute to direct SBS when orchestration risk is high.',
    expectedImpact: 'Lower turnaround time variability across facilities.'
  });

  return {
    capability: 'facility_optimization_engine',
    version: 'v1',
    facilityId,
    metrics: {
      claimCount: claims.length,
      terminalClaimCount: terminalClaims.length,
      denialRate: Number((denialRate * 100).toFixed(2)),
      reworkRate: Number((reworkRate * 100).toFixed(2)),
      benchmarkDenialRate: Number((benchmarkDenial * 100).toFixed(2)),
      benchmarkReworkRate: Number((benchmarkRework * 100).toFixed(2))
    },
    recommendations
  };
}

function summarizeEvaluationKpis(input = {}) {
  const claims = Array.isArray(input.claims) ? input.claims : [];
  const telemetryEvents = Array.isArray(input.telemetryEvents) ? input.telemetryEvents : [];

  const terminal = claims.filter((claim) => ['accepted', 'completed', 'rejected', 'failed', 'error'].includes(String(claim.status || '').toLowerCase()));
  const denied = terminal.filter((claim) => ['rejected', 'failed', 'error'].includes(String(claim.status || '').toLowerCase()));
  const firstPassAccepted = terminal.filter((claim) => {
    const status = String(claim.status || '').toLowerCase();
    return (status === 'accepted' || status === 'completed') && (!Array.isArray(claim.reAdjudication) || claim.reAdjudication.length === 0);
  });
  const reworked = claims.filter((claim) => Array.isArray(claim.reAdjudication) && claim.reAdjudication.length > 0);

  const tatValues = terminal
    .map((claim) => {
      const start = new Date(claim.createdAt || claim.created_at || 0).getTime();
      const end = new Date(claim.lastUpdate || claim.updatedAt || claim.last_update || 0).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
      return (end - start) / 1000;
    })
    .filter((value) => Number.isFinite(value));
  const averageTat = tatValues.length
    ? tatValues.reduce((sum, value) => sum + value, 0) / tatValues.length
    : 0;

  return {
    capability: 'unified_eval_framework',
    version: 'v1',
    kpis: {
      denial_rate: terminal.length ? Number((denied.length / terminal.length).toFixed(4)) : 0,
      rework_rate: claims.length ? Number((reworked.length / claims.length).toFixed(4)) : 0,
      tat_seconds_avg: Number(averageTat.toFixed(2)),
      first_pass_acceptance: terminal.length ? Number((firstPassAccepted.length / terminal.length).toFixed(4)) : 0
    },
    telemetry: {
      event_count: telemetryEvents.length,
      capability_event_breakdown: telemetryEvents.reduce((acc, event) => {
        const key = String(event.capability || event.eventType || 'unknown');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    }
  };
}

module.exports = {
  DEFAULT_AI_POLICY,
  assessPreSubmitDenial,
  buildReAdjudicationAutopilotDraft,
  composePriorAuthNarrative,
  extractEvidenceFromContent,
  fingerprintPayload,
  predictWorkflowSlaRouting,
  recommendFacilityOptimization,
  summarizeEvaluationKpis
};
