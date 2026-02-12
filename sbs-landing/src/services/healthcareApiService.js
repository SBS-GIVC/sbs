/**
 * Healthcare API Service
 * Manages all healthcare claims, prior authorizations, and eligibility operations
 */

import axios from 'axios';
import { apiConfig } from '../config/api.config';

const healthcareApi = axios.create({
    baseURL: apiConfig.endpoints.healthcare.baseUrl || 'http://localhost:8003',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for auth and logging
healthcareApi.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return config;
    },
    (error) => {
        console.error('Healthcare API Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
healthcareApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const { status, data } = error.response;
            console.error(`Healthcare API Error ${status}:`, data);

            if (status === 401) {
                // Token expired or invalid
                localStorage.removeItem('auth_token');
                window.location.href = '/login';
            } else if (status === 429) {
                // Rate limit
                throw new Error('Rate limit exceeded. Please try again later.');
            } else if (status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(data?.error || data?.detail || 'An error occurred');
            }
        } else {
            throw new Error('Network error. Please check your connection.');
        }
        return Promise.reject(error);
    }
);

class HealthcareApiService {
    /**
     * Submit a new healthcare claim
     */
    async submitClaim(claimData) {
        const response = await healthcareApi.post('/unified-healthcare-submit', {
            submission_type: 'claim',
            ...claimData
        });
        return response.data;
    }

    /**
     * Submit prior authorization request
     */
    async submitPriorAuth(priorAuthData) {
        const response = await healthcareApi.post('/healthcare/prior-auth', priorAuthData);
        return response.data;
    }

    /**
     * Check patient eligibility
     */
    async checkEligibility(eligibilityData) {
        const response = await healthcareApi.post('/healthcare/eligibility/check', eligibilityData);
        return response.data;
    }

    /**
     * Get claims with filters and pagination
     */
    async getClaims(filters = {}) {
        const params = new URLSearchParams();

        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);
        if (filters.type) params.append('type', filters.type);
        if (filters.page) params.append('page', filters.page);
        if (filters.perPage) params.append('per_page', filters.perPage);

        const response = await healthcareApi.get(`/healthcare/requests?${params.toString()}`);
        return {
            data: response.data.requests,
            pagination: response.data.pagination
        };
    }

    /**
     * Get single claim details
     */
    async getClaimDetails(claimId) {
        const response = await healthcareApi.get(`/healthcare/requests/${claimId}`);
        return response.data;
    }

    /**
     * Update claim status
     */
    async updateClaimStatus(claimId, newStatus) {
        const response = await healthcareApi.put(`/healthcare/requests/${claimId}/status`, null, {
            params: { new_status: newStatus }
        });
        return response.data;
    }

    /**
     * Approve or deny a request
     */
    async approveRequest(requestId, approved, comments = '') {
        const response = await healthcareApi.post(`/healthcare/requests/${requestId}/approve`, {
            approved,
            comments
        });
        return response.data;
    }

    /**
     * Search patients
     */
    async searchPatients(query, national_id = null, page = 1, perPage = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString()
        });

        if (query) params.append('query', query);
        if (national_id) params.append('national_id', national_id);

        const response = await healthcareApi.get(`/healthcare/patients/search?${params.toString()}`);
        return response.data;
    }

    /**
     * Get available payers
     */
    async getPayers(page = 1, perPage = 50) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString()
        });

        const response = await healthcareApi.get(`/healthcare/payers?${params.toString()}`);
        return response.data;
    }

    /**
     * Search services
     */
    async searchServices(query = '', category = null, page = 1, perPage = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString()
        });

        if (query) params.append('query', query);
        if (category) params.append('category', category);

        const response = await healthcareApi.get(`/healthcare/services/search?${params.toString()}`);
        return response.data;
    }

    /**
     * Get dashboard data for specific role
     */
    async getDashboard(role, facilityId = null) {
        const params = new URLSearchParams();

        if (facilityId) params.append('facility_id', facilityId);

        const response = await healthcareApi.get(`/healthcare/dashboard/${role}?${params.toString()}`);
        return response.data;
    }

    /**
     * Get healthcare analytics
     */
    async getAnalytics(facilityId = null) {
        const params = new URLSearchParams();

        if (facilityId) params.append('facility_id', facilityId);

        const response = await healthcareApi.get(`/healthcare/analytics/dashboard?${params.toString()}`);
        return response.data;
    }

    /**
     * Pre-submission validation
     */
    async validateClaim(claimPayload) {
        const response = await healthcareApi.post('/healthcare/pre-submission-validation', {
            claim_payload: claimPayload
        });
        return response.data;
    }

    /**
     * Retry failed claim
     */
    async retryClaim(claimId) {
        const response = await healthcareApi.post(`/healthcare/claim-workflow/${claimId}/retry`);
        return response.data;
    }

    /**
     * Get NPHIES transaction status
     */
    async getTransactionStatus(transactionUuid) {
        const response = await healthcareApi.get(`/transaction/${transactionUuid}`);
        return response.data;
    }

    /**
     * Get facility transactions
     */
    async getFacilityTransactions(facilityId, limit = 50) {
        const response = await healthcareApi.get(`/facility/${facilityId}/transactions?limit=${limit}`);
        return response.data;
    }

    /**
     * Unified submission (handles NPHIES + local claims)
     */
    async unifiedSubmit(submission) {
        const response = await healthcareApi.post('/unified-healthcare-submit', submission);
        return response.data;
    }

    /**
     * Validate terminology codes
     */
    async validateTerminology(system, code, valueSet = null) {
        const response = await healthcareApi.post('/terminology/validate-code', {
            system,
            code,
            value_set: valueSet
        });
        return response.data;
    }

    /**
     * Validate FHIR payload
     */
    async validateFhirPayload(payload) {
        const response = await healthcareApi.post('/terminology/validate-payload', {
            fhir_payload: payload
        });
        return response.data;
    }

    /**
     * Search terminology codes
     */
    async searchTerminology(system, query, limit = 50) {
        const params = new URLSearchParams({
            system,
            q: query,
            limit: limit.toString()
        });

        const response = await healthcareApi.get(`/terminology/codes?${params.toString()}`);
        return response.data;
    }

    /**
     * Get terminology code systems
     */
    async getCodeSystems(limit = 250) {
        const response = await healthcareApi.get(`/terminology/codesystems?limit=${limit}`);
        return response.data;
    }

    /**
     * Submit FHIR Claim directly to NPHIES
     */
    async submitToNphies(fhirPayload, signature, facilityId, mockOutcome = null) {
        const response = await healthcareApi.post('/submit-claim', {
            facility_id: facilityId,
            fhir_payload: fhirPayload,
            signature: signature,
            mock_outcome: mockOutcome
        });
        return response.data;
    }

    /**
     * Submit pre-authorization to NPHIES
     */
    async submitPreauthToNphies(fhirPayload, signature, facilityId, mockOutcome = null) {
        const response = await healthcareApi.post('/submit-preauth', {
            facility_id: facilityId,
            fhir_payload: fhirPayload,
            signature: signature,
            mock_outcome: mockOutcome
        });
        return response.data;
    }

    /**
     * Initialize API token
     */
    async initApiToken(token) {
        const response = await healthcareApi.post('/auth/token', { token });
        return response.data;
    }

    /**
     * Get health status
     */
    async getHealthStatus() {
        const response = await healthcareApi.get('/health');
        return response.data;
    }
}

// Create default instance
export const healthcareApiService = new HealthcareApiService();

// Also export for default import
export default healthcareApiService;