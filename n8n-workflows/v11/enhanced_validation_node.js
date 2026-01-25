/**
 * @fileoverview Enhanced Input Validation Node for SBS Integration
 * @version 11.0
 * @brainsait HIPAA-compliant validation with bilingual support
 */

// ============================================================================
// BRAINSAIT: AUTHENTICATION & AUTHORIZATION
// ============================================================================

const headers = $input.item.json.headers || {};
const body = $input.item.json.body || {};

// Validate API key
if (!headers['x-api-key']) {
  throw new Error(JSON.stringify({
    error_code: 'AUTH_001',
    message_en: 'Missing API key in request headers',
    message_ar: 'مفتاح API مفقود في رؤوس الطلب',
    http_status: 401
  }));
}

if (headers['x-api-key'] !== $env.SBS_API_KEY) {
  // BRAINSAIT: Audit failed authentication
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'authentication_failed',
    ip_address: headers['x-forwarded-for'] || 'unknown',
    user_agent: headers['user-agent'] || 'unknown',
    severity: 'HIGH'
  }));
  
  throw new Error(JSON.stringify({
    error_code: 'AUTH_002',
    message_en: 'Invalid API key',
    message_ar: 'مفتاح API غير صالح',
    http_status: 401
  }));
}

// Validate facility authorization
const facilityId = body.facility_id;
if (!facilityId) {
  throw new Error(JSON.stringify({
    error_code: 'VAL_001',
    message_en: 'Missing facility_id in request body',
    message_ar: 'معرف المنشأة مفقود في نص الطلب',
    http_status: 400
  }));
}

const authorizedFacilities = ($env.AUTHORIZED_FACILITIES || '').split(',');
if (!authorizedFacilities.includes(facilityId)) {
  // BRAINSAIT: Audit unauthorized facility access attempt
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'unauthorized_facility_access',
    facility_id: facilityId,
    ip_address: headers['x-forwarded-for'] || 'unknown',
    severity: 'HIGH'
  }));
  
  throw new Error(JSON.stringify({
    error_code: 'AUTH_003',
    message_en: `Facility ${facilityId} is not authorized`,
    message_ar: `المنشأة ${facilityId} غير مصرح لها`,
    http_status: 403
  }));
}

// ============================================================================
// BRAINSAIT: INPUT VALIDATION
// ============================================================================

const validationErrors = [];

// Required fields with bilingual labels
const requiredFields = {
  facility_id: { en: 'Facility ID', ar: 'معرف المنشأة' },
  patient_id: { en: 'Patient ID', ar: 'معرف المريض' },
  service_code: { en: 'Service Code', ar: 'رمز الخدمة' },
  service_desc: { en: 'Service Description', ar: 'وصف الخدمة' },
  unit_price: { en: 'Unit Price', ar: 'سعر الوحدة' },
  quantity: { en: 'Quantity', ar: 'الكمية' },
  encounter_date: { en: 'Encounter Date', ar: 'تاريخ المقابلة' },
  payer_id: { en: 'Payer ID', ar: 'معرف الدافع' }
};

// Check required fields
for (const [field, labels] of Object.entries(requiredFields)) {
  if (!body[field] && body[field] !== 0) {
    validationErrors.push({
      field: field,
      error_code: `VAL_REQUIRED_${field.toUpperCase()}`,
      message_en: `Missing required field: ${labels.en}`,
      message_ar: `حقل مطلوب مفقود: ${labels.ar}`
    });
  }
}

// MEDICAL: Data type validations
if (body.unit_price !== undefined) {
  const price = parseFloat(body.unit_price);
  if (isNaN(price) || price < 0) {
    validationErrors.push({
      field: 'unit_price',
      error_code: 'VAL_PRICE_INVALID',
      message_en: 'Unit price must be a non-negative number',
      message_ar: 'يجب أن يكون سعر الوحدة رقمًا غير سالب'
    });
  } else if (price > 1000000) { // Sanity check: 1M SAR
    validationErrors.push({
      field: 'unit_price',
      error_code: 'VAL_PRICE_EXCESSIVE',
      message_en: 'Unit price exceeds reasonable limit (1,000,000 SAR)',
      message_ar: 'سعر الوحدة يتجاوز الحد المعقول (1,000,000 ريال)'
    });
  }
}

if (body.quantity !== undefined) {
  const qty = parseInt(body.quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    validationErrors.push({
      field: 'quantity',
      error_code: 'VAL_QUANTITY_INVALID',
      message_en: 'Quantity must be a positive integer',
      message_ar: 'يجب أن تكون الكمية عددًا صحيحًا موجبًا'
    });
  } else if (qty > 1000) { // Sanity check
    validationErrors.push({
      field: 'quantity',
      error_code: 'VAL_QUANTITY_EXCESSIVE',
      message_en: 'Quantity exceeds reasonable limit (1000)',
      message_ar: 'الكمية تتجاوز الحد المعقول (1000)'
    });
  }
}

// MEDICAL: Saudi National ID validation
if (body.patient_national_id) {
  const nationalIdRegex = /^[12]\d{9}$/;
  if (!nationalIdRegex.test(body.patient_national_id)) {
    validationErrors.push({
      field: 'patient_national_id',
      error_code: 'VAL_NATIONAL_ID_INVALID',
      message_en: 'Invalid Saudi National ID format (must be 10 digits starting with 1 or 2)',
      message_ar: 'تنسيق الهوية الوطنية السعودية غير صالح (يجب أن يكون 10 أرقام تبدأ بـ 1 أو 2)'
    });
  }
}

// MEDICAL: Date validation
if (body.encounter_date) {
  const encounterDate = new Date(body.encounter_date);
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  
  if (isNaN(encounterDate.getTime())) {
    validationErrors.push({
      field: 'encounter_date',
      error_code: 'VAL_DATE_INVALID',
      message_en: 'Invalid date format for encounter_date (use ISO 8601)',
      message_ar: 'تنسيق التاريخ غير صالح لتاريخ المقابلة (استخدم ISO 8601)'
    });
  } else if (encounterDate > now) {
    validationErrors.push({
      field: 'encounter_date',
      error_code: 'VAL_DATE_FUTURE',
      message_en: 'Encounter date cannot be in the future',
      message_ar: 'لا يمكن أن يكون تاريخ المقابلة في المستقبل'
    });
  } else if (encounterDate < oneYearAgo) {
    validationErrors.push({
      field: 'encounter_date',
      error_code: 'VAL_DATE_TOO_OLD',
      message_en: 'Encounter date is older than 1 year',
      message_ar: 'تاريخ المقابلة أقدم من سنة واحدة'
    });
  }
}

// MEDICAL: Service code format validation (SBS format)
if (body.service_code) {
  const serviceCodeRegex = /^[A-Z0-9-]{3,20}$/;
  if (!serviceCodeRegex.test(body.service_code)) {
    validationErrors.push({
      field: 'service_code',
      error_code: 'VAL_SERVICE_CODE_INVALID',
      message_en: 'Invalid service code format',
      message_ar: 'تنسيق رمز الخدمة غير صالح'
    });
  }
}

// MEDICAL: Payer validation
if (body.payer_id) {
  const payerRegex = /^[A-Z0-9-]{5,20}$/;
  if (!payerRegex.test(body.payer_id)) {
    validationErrors.push({
      field: 'payer_id',
      error_code: 'VAL_PAYER_ID_INVALID',
      message_en: 'Invalid payer ID format',
      message_ar: 'تنسيق معرف الدافع غير صالح'
    });
  }
}

// ============================================================================
// BRAINSAIT: BUSINESS RULE VALIDATIONS
// ============================================================================

// Calculate total amount
if (body.unit_price !== undefined && body.quantity !== undefined) {
  const totalAmount = parseFloat(body.unit_price) * parseInt(body.quantity);
  
  // Check if total exceeds threshold requiring approval
  if (totalAmount > 50000) { // 50K SAR threshold
    validationErrors.push({
      field: 'total_amount',
      error_code: 'VAL_AMOUNT_REQUIRES_APPROVAL',
      message_en: `Total amount (${totalAmount.toFixed(2)} SAR) requires manager approval`,
      message_ar: `المبلغ الإجمالي (${totalAmount.toFixed(2)} ريال) يتطلب موافقة المدير`,
      severity: 'WARNING'
    });
  }
}

// ============================================================================
// BRAINSAIT: ERROR HANDLING
// ============================================================================

if (validationErrors.length > 0) {
  // Filter out warnings
  const criticalErrors = validationErrors.filter(e => e.severity !== 'WARNING');
  
  if (criticalErrors.length > 0) {
    // BRAINSAIT: Audit validation failure
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'validation_failed',
      facility_id: facilityId,
      error_count: criticalErrors.length,
      errors: criticalErrors.map(e => e.error_code),
      severity: 'MEDIUM'
    }));
    
    throw new Error(JSON.stringify({
      error_code: 'VAL_FAILED',
      message_en: 'Validation failed',
      message_ar: 'فشل التحقق',
      errors: validationErrors,
      http_status: 400
    }));
  }
}

// ============================================================================
// BRAINSAIT: SUCCESS AUDIT LOG
// ============================================================================

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'validation_success',
  facility_id: facilityId,
  patient_id: body.patient_id,
  service_code: body.service_code,
  claim_amount: body.unit_price * body.quantity,
  ip_address: headers['x-forwarded-for'] || 'unknown',
  severity: 'INFO'
}));

// ============================================================================
// OUTPUT
// ============================================================================

return {
  validation_status: 'passed',
  validation_timestamp: new Date().toISOString(),
  validated_data: body,
  warnings: validationErrors.filter(e => e.severity === 'WARNING'),
  metadata: {
    facility_id: facilityId,
    request_id: headers['x-request-id'] || `REQ-${Date.now()}`,
    api_version: 'v11.0'
  }
};
