/**
 * @fileoverview Error Handler Node for SBS Integration
 * @version 11.0
 * @brainsait Centralized error handling with bilingual support
 */

// ============================================================================
// BRAINSAIT: ERROR INFORMATION EXTRACTION
// ============================================================================

const error = $input.item.json.error || $input.item.json;
const webhookData = $('Webhook').first().json.body;

// Try to parse error if it's JSON string
let parsedError;
try {
  parsedError = typeof error.message === 'string' && error.message.startsWith('{') 
    ? JSON.parse(error.message) 
    : error;
} catch (e) {
  parsedError = error;
}

// ============================================================================
// BRAINSAIT: STRUCTURED ERROR RESPONSE
// ============================================================================

const errorResponse = {
  status: 'error',
  timestamp: new Date().toISOString(),
  facility_id: webhookData?.facility_id || 'unknown',
  claim_id: webhookData?.claim_id || webhookData?.patient_id || 'unknown',
  request_id: webhookData?.request_id || `ERR-${Date.now()}`,
  
  error: {
    code: parsedError.error_code || 'PROCESSING_ERROR',
    message_en: parsedError.message_en || error.message || 'An error occurred during claim processing',
    message_ar: parsedError.message_ar || 'حدث خطأ أثناء معالجة المطالبة',
    node: $node.name || 'unknown',
    http_status: parsedError.http_status || 500,
    details: parsedError.details || parsedError.errors || {}
  },
  
  retry_available: parsedError.retryable !== false,
  support_reference: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
};

// ============================================================================
// BRAINSAIT: ERROR CATEGORIZATION
// ============================================================================

let errorCategory = 'UNKNOWN';
let severity = 'MEDIUM';

if (errorResponse.error.code.startsWith('AUTH_')) {
  errorCategory = 'AUTHENTICATION';
  severity = 'HIGH';
} else if (errorResponse.error.code.startsWith('VAL_')) {
  errorCategory = 'VALIDATION';
  severity = 'MEDIUM';
} else if (errorResponse.error.code.startsWith('FHIR_')) {
  errorCategory = 'FHIR';
  severity = 'HIGH';
} else if (errorResponse.error.code.startsWith('HTTP_')) {
  errorCategory = 'NETWORK';
  severity = 'HIGH';
} else {
  errorCategory = 'PROCESSING';
  severity = 'HIGH';
}

errorResponse.error.category = errorCategory;
errorResponse.error.severity = severity;

// ============================================================================
// BRAINSAIT: AUDIT LOG
// ============================================================================

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'claim_processing_error',
  facility_id: webhookData?.facility_id,
  claim_id: webhookData?.claim_id,
  error_code: errorResponse.error.code,
  error_category: errorCategory,
  node: $node.name,
  support_reference: errorResponse.support_reference,
  severity: severity
}));

// ============================================================================
// BRAINSAIT: ERROR NOTIFICATION (OPTIONAL)
// ============================================================================

// Uncomment to send error notifications to external systems
/*
if (severity === 'HIGH' && $env.ERROR_NOTIFICATION_WEBHOOK) {
  try {
    await $http.request({
      method: 'POST',
      url: $env.ERROR_NOTIFICATION_WEBHOOK,
      body: {
        text: `🚨 SBS Integration Error - ${errorCategory}`,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'Facility', value: webhookData?.facility_id, short: true },
            { title: 'Error Code', value: errorResponse.error.code, short: true },
            { title: 'Message', value: errorResponse.error.message_en, short: false },
            { title: 'Support Ref', value: errorResponse.support_reference, short: true }
          ]
        }]
      }
    });
  } catch (notificationError) {
    console.log('Failed to send error notification:', notificationError.message);
  }
}
*/

// ============================================================================
// OUTPUT
// ============================================================================

return errorResponse;
