// API Service - Integration with SBS Backend
const API_BASE_URL = (() => {
  // Prefer explicitly configured API URL; fall back to localhost for development.
  if (window.SBS_API_URL && typeof window.SBS_API_URL === 'string') {
    return window.SBS_API_URL;
  }

  const fallbackUrl = 'http://localhost:3000';
  console.warn(
    '[APIService] window.SBS_API_URL is not set; falling back to',
    fallbackUrl
  );
  return fallbackUrl;
})();
export class APIService {
  /**
   * Submit a claim to the SBS pipeline
   */
  static async submitClaim(claimData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/submit-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimData)
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
   * Get claim status by ID
   */
  static async getClaimStatus(claimId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/claim-status/${claimId}`);

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
   * Health check
   */
  static async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: error.message };
    }
  }
}
