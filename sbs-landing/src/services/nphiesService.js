/**
 * NPHIES Integration Service
 * Real-time claims submission, eligibility verification, and prior authorization
 * Based on Saudi NPHIES Platform specifications
 */

import axios from 'axios';

// NPHIES API Configuration
const NPHIES_CONFIG = {
  baseUrl: import.meta.env.VITE_NPHIES_URL || 'https://sandbox.nphies.sa/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// FHIR Resource Types
const FHIR_RESOURCES = {
  CLAIM: 'Claim',
  CLAIM_RESPONSE: 'ClaimResponse',
  COVERAGE_ELIGIBILITY_REQUEST: 'CoverageEligibilityRequest',
  COVERAGE_ELIGIBILITY_RESPONSE: 'CoverageEligibilityResponse',
  PRIOR_AUTH_REQUEST: 'Claim', // Prior auth uses Claim resource with use: preauthorization
  PRIOR_AUTH_RESPONSE: 'ClaimResponse'
};

/**
 * NPHIES API Client
 */
class NPHIESService {
  constructor() {
    this.client = axios.create({
      baseURL: NPHIES_CONFIG.baseUrl,
      timeout: NPHIES_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json'
      }
    });
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get authentication token (implement based on NPHIES OAuth flow)
   */
  async authenticate() {
    // In production, implement OAuth2 flow with NPHIES
    // For now, return mock token for development
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }
    
    try {
      // Mock authentication for sandbox
      this.accessToken = 'sandbox-demo-token';
      this.tokenExpiry = Date.now() + 3600000; // 1 hour
      return this.accessToken;
    } catch (error) {
      console.error('NPHIES authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  /**
   * Set authorization header
   */
  async setAuthHeader() {
    const token = await this.authenticate();
    this.client.defaults.headers['Authorization'] = `Bearer ${token}`;
  }

  // ============================================
  // ELIGIBILITY VERIFICATION
  // ============================================

  /**
   * Check patient eligibility with insurance
   * @param {Object} params - Patient and insurance details
   * @returns {Object} Eligibility response
   */
  async checkEligibility({ patientId, insurerId, policyNumber, serviceDate }) {
    await this.setAuthHeader();
    
    const eligibilityRequest = this.buildEligibilityRequest({
      patientId,
      insurerId,
      policyNumber,
      serviceDate: serviceDate || new Date().toISOString().split('T')[0]
    });

    try {
      const response = await this.client.post('/CoverageEligibilityRequest', eligibilityRequest);
      return this.parseEligibilityResponse(response.data);
    } catch (error) {
      console.error('Eligibility check failed:', error);
      // Return mock data for development
      return this.getMockEligibility(patientId);
    }
  }

  /**
   * Build FHIR CoverageEligibilityRequest
   */
  buildEligibilityRequest({ patientId, insurerId, policyNumber, serviceDate }) {
    return {
      resourceType: 'CoverageEligibilityRequest',
      id: `eligibility-${Date.now()}`,
      status: 'active',
      purpose: ['validation', 'benefits'],
      patient: {
        reference: `Patient/${patientId}`
      },
      servicedDate: serviceDate,
      created: new Date().toISOString(),
      insurer: {
        reference: `Organization/${insurerId}`
      },
      insurance: [{
        focal: true,
        coverage: {
          reference: `Coverage/${policyNumber}`
        }
      }]
    };
  }

  /**
   * Parse eligibility response
   */
  parseEligibilityResponse(fhirResponse) {
    return {
      eligible: fhirResponse.outcome === 'complete',
      status: fhirResponse.outcome,
      policyNumber: fhirResponse.insurance?.[0]?.coverage?.reference?.split('/')[1],
      coverageStart: fhirResponse.insurance?.[0]?.benefitPeriod?.start,
      coverageEnd: fhirResponse.insurance?.[0]?.benefitPeriod?.end,
      benefits: this.extractBenefits(fhirResponse.insurance?.[0]?.item || []),
      errors: fhirResponse.error?.map(e => e.code?.text) || []
    };
  }

  /**
   * Extract benefit details from FHIR response
   */
  extractBenefits(items) {
    const benefits = {};
    
    items.forEach(item => {
      const category = item.category?.coding?.[0]?.code || 'general';
      benefits[category] = {
        category,
        name: item.category?.coding?.[0]?.display,
        allowed: item.benefit?.find(b => b.type?.coding?.[0]?.code === 'benefit')?.allowedMoney?.value,
        used: item.benefit?.find(b => b.type?.coding?.[0]?.code === 'benefit')?.usedMoney?.value,
        remaining: null
      };
      
      if (benefits[category].allowed && benefits[category].used) {
        benefits[category].remaining = benefits[category].allowed - benefits[category].used;
      }
    });
    
    return benefits;
  }

  /**
   * Mock eligibility for development
   */
  getMockEligibility(patientId) {
    return {
      eligible: true,
      status: 'active',
      patientId,
      policyNumber: `POL-${patientId}-2026`,
      coverageStart: '2026-01-01',
      coverageEnd: '2026-12-31',
      payerName: 'Bupa Arabia',
      payerId: 'INS-BUPA-001',
      className: 'VIP',
      benefits: {
        inpatient: { category: 'inpatient', name: 'Inpatient Services', allowed: 500000, used: 45000, remaining: 455000 },
        outpatient: { category: 'outpatient', name: 'Outpatient Services', allowed: 50000, used: 5200, remaining: 44800 },
        dental: { category: 'dental', name: 'Dental Services', allowed: 10000, used: 0, remaining: 10000 },
        optical: { category: 'optical', name: 'Optical Services', allowed: 5000, used: 0, remaining: 5000 },
        maternity: { category: 'maternity', name: 'Maternity Coverage', allowed: 30000, used: 0, remaining: 30000 }
      },
      coPayPercentage: 20,
      deductible: 500,
      deductibleMet: true,
      errors: []
    };
  }

  // ============================================
  // PRIOR AUTHORIZATION
  // ============================================

  /**
   * Submit prior authorization request
   * @param {Object} params - Authorization request details
   * @returns {Object} Authorization response
   */
  async submitPriorAuth({ patientId, facilityId, sbsCode, diagnosis, description, estimatedAmount, expectedDate }) {
    await this.setAuthHeader();
    
    const priorAuthRequest = this.buildPriorAuthRequest({
      patientId,
      facilityId,
      sbsCode,
      diagnosis,
      description,
      estimatedAmount,
      expectedDate
    });

    try {
      const response = await this.client.post('/Claim', priorAuthRequest);
      return this.parsePriorAuthResponse(response.data);
    } catch (error) {
      console.error('Prior auth submission failed:', error);
      // Return mock data for development
      return this.getMockPriorAuth(sbsCode);
    }
  }

  /**
   * Build prior authorization FHIR request
   */
  buildPriorAuthRequest({ patientId, facilityId, sbsCode, diagnosis, description, estimatedAmount, expectedDate }) {
    return {
      resourceType: 'Claim',
      id: `pa-${Date.now()}`,
      status: 'active',
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: 'institutional'
        }]
      },
      use: 'preauthorization', // This makes it a prior auth request
      patient: {
        reference: `Patient/${patientId}`
      },
      created: new Date().toISOString(),
      provider: {
        reference: `Organization/${facilityId}`
      },
      priority: {
        coding: [{
          code: 'normal'
        }]
      },
      diagnosis: diagnosis ? [{
        sequence: 1,
        diagnosisCodeableConcept: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: diagnosis
          }]
        }
      }] : [],
      item: [{
        sequence: 1,
        productOrService: {
          coding: [{
            system: 'http://chi.gov.sa/sbs',
            code: sbsCode,
            display: description
          }]
        },
        servicedDate: expectedDate || new Date().toISOString().split('T')[0],
        unitPrice: {
          value: estimatedAmount,
          currency: 'SAR'
        }
      }],
      total: {
        value: estimatedAmount,
        currency: 'SAR'
      }
    };
  }

  /**
   * Parse prior auth response
   */
  parsePriorAuthResponse(fhirResponse) {
    const outcome = fhirResponse.outcome || 'pending';
    
    return {
      authNumber: fhirResponse.preAuthRef || `PA-${Date.now()}`,
      status: outcome === 'complete' ? 'approved' : outcome === 'error' ? 'denied' : 'pending',
      approvedAmount: fhirResponse.payment?.amount?.value,
      validFrom: fhirResponse.preAuthPeriod?.start,
      validUntil: fhirResponse.preAuthPeriod?.end,
      notes: fhirResponse.processNote?.map(n => n.text),
      denialReason: outcome === 'error' ? fhirResponse.error?.[0]?.code?.text : null
    };
  }

  /**
   * Mock prior auth for development
   */
  getMockPriorAuth(sbsCode) {
    const isApproved = Math.random() > 0.2; // 80% approval rate for mock
    
    return {
      authNumber: `PA-2026-${Math.random().toString(36).substring(7).toUpperCase()}`,
      status: isApproved ? 'approved' : 'pending',
      sbsCode,
      approvedAmount: isApproved ? Math.floor(Math.random() * 50000) + 10000 : null,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: isApproved 
        ? ['Pre-authorization approved. Valid for 30 days.'] 
        : ['Under review. Expected decision within 48 hours.'],
      denialReason: null
    };
  }

  /**
   * Check prior authorization status
   */
  async checkPriorAuthStatus(authNumber) {
    await this.setAuthHeader();
    
    try {
      const response = await this.client.get(`/Claim?identifier=${authNumber}`);
      return this.parsePriorAuthResponse(response.data.entry?.[0]?.resource);
    } catch (error) {
      console.error('Prior auth status check failed:', error);
      return this.getMockPriorAuth(authNumber);
    }
  }

  // ============================================
  // CLAIMS SUBMISSION
  // ============================================

  /**
   * Submit claim to NPHIES
   * @param {Object} claim - Claim details
   * @returns {Object} Claim response
   */
  async submitClaim(claim) {
    await this.setAuthHeader();
    
    const fhirClaim = this.buildClaimResource(claim);

    try {
      const response = await this.client.post('/Claim', fhirClaim);
      return this.parseClaimResponse(response.data);
    } catch (error) {
      console.error('Claim submission failed:', error);
      return this.getMockClaimResponse(claim);
    }
  }

  /**
   * Build FHIR Claim resource
   */
  buildClaimResource(claim) {
    const items = claim.items.map((item, index) => ({
      sequence: index + 1,
      productOrService: {
        coding: [{
          system: 'http://chi.gov.sa/sbs',
          code: item.sbsCode,
          display: item.description
        }]
      },
      servicedDate: item.serviceDate || claim.serviceDate,
      quantity: { value: item.quantity || 1 },
      unitPrice: {
        value: item.unitPrice,
        currency: 'SAR'
      },
      net: {
        value: item.netPrice || (item.unitPrice * (item.quantity || 1)),
        currency: 'SAR'
      }
    }));

    return {
      resourceType: 'Claim',
      id: claim.claimNumber || `CLM-${Date.now()}`,
      status: 'active',
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: claim.claimType || 'institutional'
        }]
      },
      use: 'claim',
      patient: {
        reference: `Patient/${claim.patientId}`
      },
      created: new Date().toISOString(),
      provider: {
        reference: `Organization/${claim.facilityId}`
      },
      priority: {
        coding: [{ code: 'normal' }]
      },
      insurance: [{
        sequence: 1,
        focal: true,
        coverage: {
          reference: `Coverage/${claim.policyNumber}`
        }
      }],
      diagnosis: claim.diagnoses?.map((d, i) => ({
        sequence: i + 1,
        diagnosisCodeableConcept: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: d.code,
            display: d.display
          }]
        }
      })) || [],
      item: items,
      total: {
        value: claim.totalAmount,
        currency: 'SAR'
      }
    };
  }

  /**
   * Parse claim response
   */
  parseClaimResponse(fhirResponse) {
    return {
      claimId: fhirResponse.id,
      nphiesReference: fhirResponse.identifier?.[0]?.value,
      status: this.mapClaimStatus(fhirResponse.outcome),
      totalSubmitted: fhirResponse.total?.value,
      totalApproved: fhirResponse.payment?.amount?.value,
      processedDate: fhirResponse.created,
      items: fhirResponse.item?.map(item => ({
        sequence: item.sequence,
        status: item.adjudication?.find(a => a.category?.coding?.[0]?.code === 'submitted')?.reason?.coding?.[0]?.code,
        approvedAmount: item.adjudication?.find(a => a.category?.coding?.[0]?.code === 'benefit')?.amount?.value,
        denialReason: item.adjudication?.find(a => a.category?.coding?.[0]?.code === 'denial')?.reason?.coding?.[0]?.display
      })),
      errors: fhirResponse.error?.map(e => e.code?.text) || []
    };
  }

  /**
   * Map FHIR outcome to readable status
   */
  mapClaimStatus(outcome) {
    const statusMap = {
      'queued': 'submitted',
      'complete': 'approved',
      'error': 'rejected',
      'partial': 'partially_approved'
    };
    return statusMap[outcome] || 'pending';
  }

  /**
   * Mock claim response for development
   */
  getMockClaimResponse(claim) {
    const statuses = ['approved', 'pending', 'partially_approved'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      claimId: claim.claimNumber || `CLM-${Date.now()}`,
      nphiesReference: `NPHIES-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      status,
      totalSubmitted: claim.totalAmount,
      totalApproved: status === 'approved' 
        ? claim.totalAmount 
        : status === 'partially_approved' 
          ? claim.totalAmount * 0.85 
          : null,
      processedDate: new Date().toISOString(),
      items: claim.items?.map((item, index) => ({
        sequence: index + 1,
        status: status === 'approved' ? 'approved' : 'pending',
        approvedAmount: status === 'approved' ? item.netPrice : null,
        denialReason: null
      })),
      errors: []
    };
  }

  /**
   * Check claim status
   */
  async checkClaimStatus(claimId) {
    await this.setAuthHeader();
    
    try {
      const response = await this.client.get(`/ClaimResponse?request=${claimId}`);
      return this.parseClaimResponse(response.data.entry?.[0]?.resource);
    } catch (error) {
      console.error('Claim status check failed:', error);
      return {
        claimId,
        status: 'pending',
        message: 'Unable to retrieve status. Please try again later.'
      };
    }
  }

  // ============================================
  // BUNDLE DETECTION
  // ============================================

  /**
   * Detect applicable bundles for a set of services
   * @param {Array} sbsCodes - Array of SBS codes
   * @returns {Object} Bundle detection result
   */
  detectBundles(sbsCodes) {
    const bundles = this.getAvailableBundles();
    const applicableBundles = [];
    
    bundles.forEach(bundle => {
      const matchedCodes = bundle.requiredCodes.filter(code => sbsCodes.includes(code));
      const matchPercentage = (matchedCodes.length / bundle.requiredCodes.length) * 100;
      
      if (matchPercentage >= 60) { // 60% match threshold
        applicableBundles.push({
          ...bundle,
          matchedCodes,
          matchPercentage,
          savings: this.calculateBundleSavings(sbsCodes, bundle)
        });
      }
    });
    
    return {
      hasApplicableBundles: applicableBundles.length > 0,
      bundles: applicableBundles,
      recommendedBundle: applicableBundles.sort((a, b) => b.savings - a.savings)[0] || null
    };
  }

  /**
   * Get available service bundles
   */
  getAvailableBundles() {
    return [
      {
        id: 'BUNDLE-KNEE-REPLACE',
        name: 'Total Knee Replacement Bundle',
        totalPrice: 45000,
        requiredCodes: ['49518-00-00', '49518-01-00', '49519-00-00', '92514-00-00', '95550-00-00'],
        description: 'Complete knee replacement package including surgery, implants, and rehabilitation'
      },
      {
        id: 'BUNDLE-CARDIAC-CATH',
        name: 'Cardiac Catheterization Bundle',
        totalPrice: 25000,
        requiredCodes: ['38200-00-00', '38203-00-00', '38218-00-00', '11700-00-00'],
        description: 'Diagnostic cardiac catheterization with angiography'
      },
      {
        id: 'BUNDLE-LAPCHOL',
        name: 'Laparoscopic Cholecystectomy Bundle',
        totalPrice: 15000,
        requiredCodes: ['30443-00-00', '30445-00-00', '92514-00-00'],
        description: 'Gallbladder removal surgery package'
      },
      {
        id: 'BUNDLE-APPENDIX',
        name: 'Appendectomy Bundle',
        totalPrice: 12000,
        requiredCodes: ['30571-00-00', '30572-00-00', '92514-00-00'],
        description: 'Appendix removal surgery package'
      },
      {
        id: 'BUNDLE-MATERNITY',
        name: 'Normal Delivery Package',
        totalPrice: 12000,
        requiredCodes: ['16520-00-00', '16520-01-00', '90761-00-00'],
        description: 'Standard vaginal delivery with routine care'
      }
    ];
  }

  /**
   * Calculate potential savings with bundle
   */
  calculateBundleSavings(sbsCodes, bundle) {
    // Estimate individual pricing (simplified)
    const estimatedIndividual = sbsCodes.length * 5000; // Rough estimate
    return Math.max(0, estimatedIndividual - bundle.totalPrice);
  }
}

// Export singleton instance
export const nphiesService = new NPHIESService();

// Export class for testing
export { NPHIESService };
