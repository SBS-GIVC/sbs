// API Service - Integration with SBS Backend
const API_BASE_URL = (() => {
  // Prefer explicitly configured API URL; fall back to relative path for Vite proxy.
  if (window.SBS_API_URL && typeof window.SBS_API_URL === 'string') {
    return window.SBS_API_URL;
  }
  return ''; // Relative path to use Vite proxy
})();

export class APIService {
  /**
   * Submit a signed claim payload to NPHIES Bridge
   */
  static async submitClaim(facilityId, fhirPayload, signature) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/submit-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facility_id: facilityId,
          fhir_payload: fhirPayload,
          signature: signature,
          resource_type: "Claim"
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit claim: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting claim:', error);
      throw error;
    }
  }

  /**
   * Get claim status by Transaction UUID
   */
  static async getClaimStatus(transactionUuid) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/claim-status/${transactionUuid}`);

      if (!response.ok) {
        throw new Error(`Failed to get claim status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting claim status:', error);
      throw error;
    }
  }

  /**
   * Normalize medical codes using SBS engine
   * Payload: { facility_id, internal_code, description }
   */
  static async normalizeCode(internalCode, description, facilityId = 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/normalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          internal_code: internalCode,
          description,
          facility_id: facilityId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to normalize code: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error normalizing code:', error);
      throw error;
    }
  }

  /**
   * Validate claim against Financial Rules Engine
   * Payload: FHIR Claim resource
   */
  static async validateClaim(claimData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimData)
      });

      if (!response.ok) {
        throw new Error(`Failed to validate claim: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating claim:', error);
      throw error;
    }
  }

  /**
   * Sign claim payload using Facility Certificate
   */
  static async signClaim(facilityId, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facility_id: facilityId,
          payload: payload
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to sign claim: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error signing claim:', error);
      throw error;
    }
  }

  /**
   * Health check (Broad check)
   */
  static async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: error.message };
    }
  }
}
