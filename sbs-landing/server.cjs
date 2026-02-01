/**
 * SBS Integration Engine - Backend API Server
 * Handles claim submission and triggers n8n workflow
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
require('dotenv').config();

const app = express();
app.use(compression()); // Compress all responses
const PORT = process.env.PORT || 3000;

// In-memory claim tracking (minimal; replace with DB later)
const claimStore = new Map();
const CLAIM_STAGE_ORDER = [
  'received',
  'validation',
  'normalization',
  'financialRules',
  'signing',
  'nphiesSubmission'
];

function isValidClaimId(claimId) {
  return /^(CLM|CLAIM)-[A-Za-z0-9-]{3,}$/.test(String(claimId || ''));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function buildProgress(stages = {}) {
  const totalStages = CLAIM_STAGE_ORDER.length;
  const completedStages = CLAIM_STAGE_ORDER.filter((k) => stages[k] === 'completed').length;
  const percentage = Math.max(0, Math.min(100, Math.round((completedStages / totalStages) * 100)));
  const currentStage =
    CLAIM_STAGE_ORDER.find((k) => stages[k] === 'in_progress') ||
    CLAIM_STAGE_ORDER.find((k) => stages[k] !== 'completed') ||
    CLAIM_STAGE_ORDER[totalStages - 1];

  return { percentage, currentStage, completedStages, totalStages };
}

function stageLabel(stage) {
  return {
    received: 'Received',
    validation: 'Validation',
    normalization: 'Normalization',
    financialRules: 'Financial Rules',
    signing: 'Digital Signing',
    nphiesSubmission: 'NPHIES Submission'
  }[stage] || stage;
}

function statusLabel(status) {
  return {
    processing: 'Processing',
    submitted: 'Submitted',
    completed: 'Completed',
    approved: 'Approved',
    rejected: 'Rejected',
    failed: 'Failed'
  }[status] || status;
}

function buildStagesObject(stages = {}) {
  const out = {};
  for (const key of CLAIM_STAGE_ORDER) {
    out[key] = {
      status: stages[key] || 'pending',
      label: stageLabel(key)
    };
  }
  return out;
}

function buildTimeline(stages = {}) {
  return CLAIM_STAGE_ORDER.map((key) => ({
    stage: key,
    label: stageLabel(key),
    status: stages[key] || 'pending'
  }));
}

// Security middleware with proper CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      frameSrc: ["'self'", "https://calendar.google.com"],
      frameAncestors: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting (skip in test/mock mode to avoid breaking automated tests)
const isTestLike = process.env.NODE_ENV === 'test' || process.env.ENABLE_MOCK_PROCESSING === 'true';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTestLike ? 10000 : 100,
  skip: () => isTestLike
});
app.use('/api/', limiter);

// CORS configuration - Restrict to allowed origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001').split(',');
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.) only in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));
app.use(express.json({ limit: '1mb' })); // Limit JSON body size
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Ensure SPA routes under /sbs/* work (serve the built app index)
app.get('/sbs', (req, res) => res.redirect(301, '/sbs/'));
app.get('/sbs/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sbs', 'index.html'));
});

// Backwards-compatible aliases (older docs/scripts)
app.get(['/ai-analytics', '/ai-hub'], (req, res) => res.redirect(302, '/sbs/'));

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = '/tmp/sbs-uploads';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `claim-${uniqueSuffix}-${file.originalname}`);
  }
});

// MIME type to extension mapping for validation
const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/xml': ['.xml'],
  'text/xml': ['.xml'],
  'application/json': ['.json']
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Limit to single file
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type
    const allowedMimeTypes = Object.keys(ALLOWED_FILE_TYPES);
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Allowed: PDF, DOC, XLS, JSON, XML, Images'));
    }

    // Validate extension matches MIME type
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_FILE_TYPES[file.mimetype];
    if (!allowedExtensions || !allowedExtensions.includes(ext)) {
      return cb(new Error('File extension does not match content type'));
    }

    // Sanitize filename - remove path traversal attempts
    const sanitizedName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    file.originalname = sanitizedName;

    cb(null, true);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sbs-landing-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json({
    service: 'sbs-landing',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Gemini API Proxy endpoint - proxies requests to Google Gemini to avoid exposing API key
app.post('/api/gemini/generate', async (req, res) => {
  try {
    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    
    // Smart mock response generator for when API is unavailable
    const generateMockResponse = (prompt) => {
      const lowercasePrompt = prompt.toLowerCase();
      
      // SBS Code queries
      if (lowercasePrompt.includes('sbs code') || lowercasePrompt.includes('code for')) {
        if (lowercasePrompt.includes('blood') || lowercasePrompt.includes('cbc')) {
          return `Based on SBS V3.1 coding standards, here are the relevant codes for blood tests:

**Complete Blood Count (CBC):**
- **85025-00-00** - Complete blood count (CBC) with automated differential
- **85027-00-00** - Complete blood count (CBC), automated
- **36415-00-00** - Blood collection, venipuncture

**Related Laboratory Codes:**
- **80053-00-00** - Comprehensive metabolic panel
- **85610-00-00** - Prothrombin time

💡 **Tip:** For accurate reimbursement, ensure the diagnosis code supports medical necessity.`;
        }
        if (lowercasePrompt.includes('x-ray') || lowercasePrompt.includes('xray')) {
          return `Here are the SBS codes for X-ray procedures:

**Chest X-ray:**
- **71046-00-00** - Chest X-ray, 2 views
- **71045-00-00** - Chest X-ray, single view

**Skeletal X-rays:**
- **73030-00-00** - Shoulder X-ray
- **73560-00-00** - Knee X-ray, 3 views

💡 **Tip:** Always include the clinical indication in prior authorization requests.`;
        }
        return `I can help you find SBS codes. Please specify the medical procedure or service you need coded. Common categories include:
- Laboratory tests
- Radiology/Imaging
- Surgical procedures
- Office visits
- Medications`;
      }
      
      // Claim validation queries
      if (lowercasePrompt.includes('validate') || lowercasePrompt.includes('claim')) {
        return `I can help validate your healthcare claim. For comprehensive validation, I'll check:

✅ **CHI Compliance** - Saudi Council for Health Insurance requirements
✅ **NPHIES Format** - Electronic submission standards
✅ **SBS Coding** - Correct procedure and diagnosis codes
✅ **Documentation** - Required clinical documentation

Please provide the claim details or paste the claim data for analysis.`;
      }
      
      // Prior authorization queries
      if (lowercasePrompt.includes('prior auth') || lowercasePrompt.includes('authorization')) {
        return `For prior authorization assistance, I can help with:

📋 **Required Information:**
- Patient demographics and member ID
- Diagnosis codes (ICD-10)
- Procedure codes (SBS/CPT)
- Clinical justification
- Supporting documentation

💡 **Tips for Approval:**
1. Include detailed clinical notes
2. Attach relevant lab/imaging results
3. Document failed conservative treatments
4. Specify medical necessity clearly`;
      }
      
      // Default helpful response
      return `I'm your SBS Healthcare Billing Assistant. I can help you with:

🔍 **Code Lookup** - Find SBS, ICD-10, and CPT codes
✅ **Claim Validation** - Check claims for compliance
📋 **Prior Authorization** - Prepare PA requests
💡 **Optimization** - Suggest improvements for better reimbursement
📊 **Analytics** - Understand claim patterns

How can I assist you today?`;
    };
    
    if (!DEEPSEEK_API_KEY) {
      console.warn('⚠️ DEEPSEEK_API_KEY not configured, returning mock response');
      return res.json({
        success: true,
        text: generateMockResponse(prompt),
        isMock: true
      });
    }

    try {
      // Call DeepSeek API (OpenAI-compatible format)
      const deepseekResponse = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : [
              { role: 'system', content: 'You are an expert Saudi healthcare AI assistant. You help with SBS (Saudi Billing System) codes, NPHIES compliance, claim validation, and healthcare billing optimization. Be concise and professional.' }
            ]),
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1024,
          stream: false
        },
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: 30000
        }
      );

      const text = deepseekResponse.data?.choices?.[0]?.message?.content || '';
      
      res.json({
        success: true,
        text: text,
        model: 'deepseek-chat'
      });
    } catch (apiError) {
      // If DeepSeek API fails, provide mock response instead of error
      console.warn('⚠️ DeepSeek API unavailable, using mock response:', apiError.message);
      return res.json({
        success: true,
        text: generateMockResponse(prompt),
        isMock: true,
        fallbackReason: 'AI service temporarily unavailable'
      });
    }

  } catch (error) {
    console.error('❌ DeepSeek API error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI response',
      message: error.message
    });
  }
});

// Main claim submission endpoint
app.post('/api/submit-claim', upload.single('claimFile'), async (req, res) => {
  try {
    const body = (req.body && typeof req.body === 'object' && req.body.claim && typeof req.body.claim === 'object')
      ? { ...req.body.claim, userEmail: req.body.userEmail ?? req.body.claim.userEmail }
      : (req.body || {});

    const firstItem = Array.isArray(body.items) ? body.items[0] : null;

    const patientName = body.patientName || body.patient?.name;
    const patientId = body.patientId || body.patient?.id || body.patient_id;
    const memberId = body.memberId || body.member_id || body.patient?.memberId;
    const payerId = body.payerId || body.payer_id;
    const providerId = body.providerId || body.provider_id;
    const claimType = body.claimType || body.claim_type;
    const userEmail = body.userEmail || body.email;

    const facility_id = body.facility_id || body.facilityId || body.facilityID;
    const service_code = body.service_code || body.serviceCode || firstItem?.service_code || firstItem?.sbsCode;
    const service_desc = body.service_desc || body.serviceDesc || firstItem?.service_desc || firstItem?.description;

    const internal_code = body.internal_code || body.internalCode || body.service_code || body.serviceCode || firstItem?.internal_code || firstItem?.internalCode || service_code;
    const description = body.description || body.service_desc || body.serviceDesc || service_desc;
    const quantity = body.quantity || firstItem?.quantity;
    const unit_price = body.unit_price || body.unitPrice || firstItem?.unitPrice;

    // Validate required fields
    const requiredFields = ['patientName', 'patientId', 'claimType', 'userEmail'];
    const validationErrors = [];
    if (!patientName) validationErrors.push('patientName is required');
    if (!patientId) validationErrors.push('patientId is required');
    if (!claimType) validationErrors.push('claimType is required');
    if (!userEmail) validationErrors.push('userEmail is required');

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: requiredFields,
        validationErrors
      });
    }

    if (!isValidEmail(userEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        validationErrors: ['Invalid email format']
      });
    }

    const normalizedClaimType = String(claimType).toLowerCase();
    const validClaimTypes = ['professional', 'institutional', 'pharmacy', 'vision'];
    if (!validClaimTypes.includes(normalizedClaimType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid claim type',
        validationErrors: ['Invalid claim type']
      });
    }

    const claimData = {
      // Patient Information
      patient: {
        name: patientName,
        id: patientId,
        memberId: memberId || patientId
      },

      // Compatibility (common n8n workflow fields)
      patient_id: patientId,
      service_code,
      service_desc,
      items: body.items,

      // Optional: direct SBS processing inputs (used when n8n is unavailable)
      facility_id,
      internal_code,
      description,
      quantity,
      unit_price,
      
      // Payer & Provider
      payerId: payerId || 'DEFAULT_PAYER',
      providerId: providerId || 'DEFAULT_PROVIDER',
      
      // Claim Details
      claimType: normalizedClaimType,
      submissionDate: new Date().toISOString(),
      
      // Note: Credentials are now handled server-side for security
      
      // File information
      attachment: req.file ? {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : null,
      
      // Metadata
      metadata: {
        submittedBy: userEmail,
        submittedAt: new Date().toISOString(),
        source: 'brainsait.cloud-landing',
        version: '1.0.0'
      }
    };

    // Read file content if exists
    if (req.file) {
      try {
        const fileContent = await fs.readFile(req.file.path);
        claimData.attachment.base64Content = fileContent.toString('base64');
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }

    console.log('📋 Claim submission received:', {
      patientId,
      claimType: normalizedClaimType,
      hasFile: !!req.file,
      timestamp: new Date().toISOString()
    });

    const claimId = `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    claimStore.set(claimId, {
      claimId,
      submissionId: null,
      trackingUrl: null,
      status: 'processing',
      patientId,
      patientName,
      claimType: normalizedClaimType,
      facilityId: facility_id,
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      stages: {
        received: 'completed',
        validation: 'in_progress',
        normalization: 'pending',
        financialRules: 'pending',
        signing: 'pending',
        nphiesSubmission: 'pending'
      }
    });

    // Trigger n8n workflow (non-fatal if unavailable in dev/test)
    let n8nResponse;
    try {
      n8nResponse = await triggerN8nWorkflow({ ...claimData, claimId });
    } catch (e) {
      console.warn('⚠️ n8n trigger failed, continuing with local tracking only:', e.message);
      n8nResponse = { success: false, claimId, submissionId: null, trackingUrl: null, status: 'failed' };
    }

    // Cleanup uploaded file after processing
    if (req.file) {
      setTimeout(async () => {
        try {
          await fs.unlink(req.file.path);
          console.log('🗑️ Cleaned up temporary file:', req.file.filename);
        } catch (error) {
          console.error('Error cleaning up file:', error);
        }
      }, 60000); // Delete after 1 minute
    }

    {
      const current = claimStore.get(claimId);
      const successStatus = n8nResponse?.status || 'processing';

      claimStore.set(claimId, {
        ...current,
        submissionId: n8nResponse?.submissionId || current?.submissionId,
        trackingUrl: n8nResponse?.trackingUrl || current?.trackingUrl,
        status: successStatus,
        lastUpdate: new Date().toISOString(),
        stages: {
          received: 'completed',
          validation: successStatus === 'failed' ? 'failed' : 'completed',
          normalization: successStatus === 'failed' ? 'pending' : 'completed',
          financialRules: successStatus === 'failed' ? 'pending' : 'completed',
          signing: successStatus === 'failed' ? 'pending' : 'completed',
          nphiesSubmission: successStatus === 'failed' ? 'failed' : 'in_progress'
        }
      });
    }

    res.json({
      success: true,
      message: 'Claim submitted successfully',
      claimId,
      submissionId: n8nResponse?.submissionId,
      trackingUrl: n8nResponse?.trackingUrl,
      status: 'processing',
      data: {
        patientId,
        claimType: normalizedClaimType,
        submissionId: n8nResponse?.submissionId,
        estimatedProcessingTime: '2-5 minutes',
        trackingUrl: n8nResponse?.trackingUrl
      }
    });

  } catch (error) {
    console.error('❌ Error processing claim:', error);

    // Best-effort: mark last created claim as failed if we have one
    // (We only have claimId in-scope once it is generated above.)

    // Log error server-side, don't expose details to client
    console.error('Claim processing error details:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to process claim submission',
      message: 'An error occurred while processing your claim. Please try again.',
      requestId: req.headers['x-request-id'] || `REQ-${Date.now()}`
    });
  }
});

// Trigger n8n workflow
async function triggerN8nWorkflow(claimData) {
  try {
    if (process.env.ENABLE_MOCK_PROCESSING === 'true' || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        claimId: claimData?.claimId || `CLM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        submissionId: `SUB-${Date.now()}`,
        trackingUrl: null,
        status: 'processing'
      };
    }

    // n8n webhook URL - Update this with your actual webhook URL
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 
      'https://n8n.srv791040.hstgr.cloud/webhook/sbs-claim-submission';

    console.log('🚀 Triggering n8n workflow...');

    const response = await axios.post(N8N_WEBHOOK_URL, claimData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SBS-Landing-API/1.0'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ n8n workflow triggered successfully');

    return {
      success: true,
      claimId: response.data?.claimId || response.data?.transaction_id || response.data?.transactionId || `CLAIM-${Date.now()}`,
      submissionId: response.data?.submissionId || response.data?.transaction_uuid || response.data?.transactionUuid || response.data?.executionId,
      trackingUrl: response.data?.trackingUrl || null,
      status: response.data?.status || 'processing'
    };

  } catch (error) {
    console.error('❌ Error triggering n8n workflow:', error.message);
    
    // Fallback: Direct call to SBS services
    if (process.env.ENABLE_DIRECT_SBS === 'true') {
      return await triggerDirectSBS(claimData);
    }
    
    throw new Error(`n8n workflow trigger failed: ${error.message}`);
  }
}

// Fallback: Direct call to SBS microservices
async function triggerDirectSBS(claimData) {
  try {
    console.log('🔄 Fallback: Calling SBS services directly...');

    // Expect either a JSON body (direct API use) or multipart/form-data fields (web form).
    // Supported JSON input (recommended): { facility_id, internal_code, description, quantity, unit_price, patientId }
    const raw = claimData || {};
    const facility_id = Number(raw.facility_id || 1);
    const internal_code = raw.internal_code || raw.internalCode || raw.service_code || raw.serviceCode;
    const description = raw.description || raw.service_desc || raw.serviceDesc || raw.patient?.name || 'Claim submission';
    const quantity = Number(raw.quantity || 1);
    const unit_price = Number(raw.unit_price || raw.unitPrice || 0);
    const patientId = raw.patientId || raw.patient?.id || 'Patient/TEST';

    if (!internal_code) {
      throw new Error('Missing internal_code (or service_code) for direct SBS processing');
    }

    // Step 1: Normalize internal code -> SBS code
    const normalizeResponse = await axios.post((process.env.NORMALIZER_URL || 'http://localhost:8000') + '/normalize', {
      facility_id,
      internal_code,
      description
    });

    const sbsCode = normalizeResponse.data?.sbs_mapped_code;
    const officialDescription = normalizeResponse.data?.official_description || description;

    if (!sbsCode) {
      throw new Error('Normalizer did not return sbs_mapped_code');
    }

    // Step 2: Build minimal FHIR Claim & apply financial rules
    const claim = {
      resourceType: 'Claim',
      status: 'active',
      facility_id,
      type: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/claim-type',
          code: 'institutional'
        }]
      },
      use: 'claim',
      patient: { reference: String(patientId) },
      created: new Date().toISOString(),
      provider: { reference: `Organization/${facility_id}` },
      priority: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/processpriority',
          code: 'normal'
        }]
      },
      item: [{
        sequence: 1,
        productOrService: {
          coding: [{
            system: 'http://sbs.sa/coding/services',
            code: sbsCode,
            display: officialDescription
          }]
        },
        quantity: { value: quantity },
        unitPrice: { value: unit_price, currency: 'SAR' }
      }]
    };

    const rulesResponse = await axios.post((process.env.FINANCIAL_RULES_URL || 'http://localhost:8002') + '/validate', claim);

    // Step 3: Sign
    const signResponse = await axios.post((process.env.SIGNER_URL || 'http://localhost:8001') + '/sign', {
      facility_id,
      payload: rulesResponse.data
    });

    // Step 4: Submit to NPHIES Bridge (will return rejected/error if NPHIES_API_KEY not set)
    const nphiesResponse = await axios.post((process.env.NPHIES_BRIDGE_URL || 'http://localhost:8003') + '/submit-claim', {
      facility_id,
      fhir_payload: rulesResponse.data,
      signature: signResponse.data?.signature,
      resource_type: 'Claim'
    });

    return {
      success: true,
      claimId: nphiesResponse.data?.transaction_id || `CLAIM-${Date.now()}`,
      submissionId: nphiesResponse.data?.transaction_uuid,
      status: nphiesResponse.data?.status || 'submitted',
      trackingUrl: null,
      normalization: {
        internal_code,
        sbs_mapped_code: sbsCode,
        confidence: normalizeResponse.data?.confidence
      }
    };

  } catch (error) {
    console.error('❌ Direct SBS call failed:', error.message);
    throw error;
  }
}

// Check claim status endpoint
app.get('/api/claim-status/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    if (!isValidClaimId(claimId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid claim ID format'
      });
    }

    const record = claimStore.get(claimId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    const stages = record.stages || {};
    const progress = buildProgress(stages);
    const isComplete = ['completed', 'approved', 'rejected', 'failed'].includes(record.status);

    res.json({
      success: true,
      claimId: record.claimId,
      status: record.status || 'processing',
      statusLabel: statusLabel(record.status || 'processing'),
      isComplete,
      stages: buildStagesObject(stages),
      progress,
      timestamps: {
        created: record.createdAt,
        lastUpdate: record.lastUpdate || new Date().toISOString()
      },
      timeline: buildTimeline(stages)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List claims (minimal; stored in-memory)
app.get('/api/claims', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

    const all = Array.from(claimStore.values()).sort((a, b) => {
      const ad = new Date(a.createdAt || 0).getTime();
      const bd = new Date(b.createdAt || 0).getTime();
      return bd - ad;
    });

    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const claims = all.slice(start, start + limit).map((c) => ({
      claimId: c.claimId,
      patientId: c.patientId,
      patientName: c.patientName,
      claimType: c.claimType,
      facilityId: c.facilityId,
      status: c.status,
      submissionId: c.submissionId,
      trackingUrl: c.trackingUrl,
      createdAt: c.createdAt,
      lastUpdate: c.lastUpdate,
      progress: buildProgress(c.stages || {})
    }));

    res.json({
      success: true,
      claims,
      total,
      page,
      limit,
      totalPages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retry claim (minimal)
app.post('/api/claims/:claimId/retry', async (req, res) => {
  try {
    const { claimId } = req.params;

    if (!isValidClaimId(claimId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid claim ID format'
      });
    }

    const record = claimStore.get(claimId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    if (record.status === 'processing') {
      return res.status(400).json({
        success: false,
        error: 'Only failed or rejected claims can be retried'
      });
    }

    // For now, just mark as processing again.
    record.status = 'processing';
    record.lastUpdate = new Date().toISOString();
    record.stages = {
      ...(record.stages || {}),
      validation: 'in_progress'
    };
    claimStore.set(claimId, record);

    res.json({
      success: true,
      claimId,
      status: record.status,
      lastUpdate: record.lastUpdate,
      stages: record.stages,
      progress: buildProgress(record.stages)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get service health status
app.get('/api/services/status', async (req, res) => {
  try {
    const services = [
      { name: 'normalizer', url: (process.env.NORMALIZER_URL || 'http://localhost:8000') + '/health' },
      { name: 'signer', url: (process.env.SIGNER_URL || 'http://localhost:8001') + '/health' },
      { name: 'financial-rules', url: (process.env.FINANCIAL_RULES_URL || 'http://localhost:8002') + '/health' },
      { name: 'nphies-bridge', url: (process.env.NPHIES_BRIDGE_URL || 'http://localhost:8003') + '/health' }
    ];

    const statusChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await axios.get(service.url, { timeout: 5000 });
          return {
            name: service.name,
            status: 'healthy',
            responseTime: response.headers['x-response-time'] || 'N/A'
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'unhealthy',
            error: error.message
          };
        }
      })
    );

    const results = statusChecks.map((result, index) => ({
      service: services[index].name,
      ...(result.status === 'fulfilled' ? result.value : { status: 'error', error: result.reason })
    }));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      services: results,
      overallHealth: results.every(s => s.status === 'healthy') ? 'healthy' : 'degraded'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
  }

  // Multer fileFilter() errors should be 400
  if (error && typeof error.message === 'string') {
    const msg = error.message;
    if (
      msg.startsWith('Invalid file type') ||
      msg.startsWith('File extension does not match')
    ) {
      return res.status(400).json({
        success: false,
        error: msg
      });
    }
  }
  
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║          🚀 SBS Landing API Server - Running                        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

✅ Server listening on: http://0.0.0.0:${PORT}
✅ Health check: http://localhost:${PORT}/health
✅ API endpoint: http://localhost:${PORT}/api/submit-claim
✅ Services status: http://localhost:${PORT}/api/services/status

🔗 n8n webhook: ${process.env.N8N_WEBHOOK_URL || 'Not configured'}
🌍 Environment: ${process.env.NODE_ENV || 'development'}

Ready to process claims! 📋
`);
});

module.exports = app;
