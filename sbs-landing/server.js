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
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SBS_NORMALIZER_URL = process.env.SBS_NORMALIZER_URL || 'http://localhost:8000';
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || '/tmp/sbs-uploads');
const SBS_SIGNER_URL = process.env.SBS_SIGNER_URL || 'http://localhost:8001';
const SBS_FINANCIAL_RULES_URL = process.env.SBS_FINANCIAL_RULES_URL || 'http://localhost:8002';
const SBS_NPHIES_BRIDGE_URL = process.env.SBS_NPHIES_BRIDGE_URL || 'http://localhost:8003';

// ============================================================================
// CLAIM WORKFLOW TRACKING SYSTEM
// ============================================================================

// Workflow stages for claim processing
const WORKFLOW_STAGES = {
  RECEIVED: 'received',
  VALIDATING: 'validating',
  VALIDATED: 'validated',
  NORMALIZING: 'normalizing',
  NORMALIZED: 'normalized',
  APPLYING_RULES: 'applying_rules',
  RULES_APPLIED: 'rules_applied',
  SIGNING: 'signing',
  SIGNED: 'signed',
  SUBMITTING: 'submitting',
  SUBMITTED: 'submitted',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  ERROR: 'error'
};

// In-memory claim store for tracking workflow state.
// IMPORTANT:
// - This storage is NOT persistent and all data will be lost on server restart.
// - It is NOT suitable for production or distributed/load-balanced deployments,
//   because each process will have its own isolated Map.
// - In production, configure and use a durable shared backend (for example,
//   Redis or a database) and set SBS_CLAIM_STORE_BACKEND accordingly.
const claimStore = new Map();

// Warn if we are running in production with only the in-memory claim store.
if (process.env.NODE_ENV === 'production' && !process.env.SBS_CLAIM_STORE_BACKEND) {
  // This warning is intentionally loud to prevent accidental production use
  // of the in-memory claim tracking store.
  // eslint-disable-next-line no-console
  console.warn(
    '[SBS CLAIM TRACKER] WARNING: Using in-memory claimStore in PRODUCTION. ' +
    'Claim tracking data will be lost on restart and will not be shared ' +
    'across multiple instances. Configure a persistent backend and set ' +
    'SBS_CLAIM_STORE_BACKEND to disable this warning.'
  );
}
// Claim tracking class
class ClaimTracker {
  constructor(claimId, data) {
    this.claimId = claimId;
    this.data = data;
    this.status = WORKFLOW_STAGES.RECEIVED;
    this.stages = {
      received: { status: 'completed', timestamp: new Date().toISOString(), message: 'Claim received' },
      validation: { status: 'pending', timestamp: null, message: null },
      normalization: { status: 'pending', timestamp: null, message: null },
      financialRules: { status: 'pending', timestamp: null, message: null },
      signing: { status: 'pending', timestamp: null, message: null },
      nphiesSubmission: { status: 'pending', timestamp: null, message: null }
    };
    this.errors = [];
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.nphiesResponse = null;
    this.processingTimeMs = 0;
  }

  updateStage(stageName, status, message = null, data = null) {
    if (this.stages[stageName]) {
      this.stages[stageName] = {
        status,
        timestamp: new Date().toISOString(),
        message,
        data
      };
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  setStatus(status) {
    this.status = status;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  addError(stage, error) {
    this.errors.push({
      stage,
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
    return this;
  }

  setNphiesResponse(response) {
    this.nphiesResponse = response;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  toJSON() {
    return {
      claimId: this.claimId,
      status: this.status,
      stages: this.stages,
      errors: this.errors,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      nphiesResponse: this.nphiesResponse,
      processingTimeMs: this.processingTimeMs,
      patientId: this.data?.patient?.id,
      claimType: this.data?.claimType
    };
  }
}

// Generate unique claim ID
function generateClaimId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CLM-${timestamp}-${random}`;
}

// Get claim from store
function getClaim(claimId) {
  return claimStore.get(claimId);
}

// Save claim to store
function saveClaim(claim) {
  claimStore.set(claim.claimId, claim);
  return claim;
}

// Cleanup old claims (older than 24 hours)
function cleanupOldClaims() {
  const cutoff = Date.now() - (24 * 60 * 60 * 1000);
  for (const [claimId, claim] of claimStore.entries()) {
    if (new Date(claim.createdAt).getTime() < cutoff) {
      claimStore.delete(claimId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupOldClaims, 60 * 60 * 1000);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://apis.google.com", "https://www.gstatic.com", "https://www.google.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https://www.google.com", "https://www.gstatic.com"],
      "frame-src": ["'self'", "https://calendar.google.com", "https://accounts.google.com"],
      "connect-src": ["'self'", "https://www.googleapis.com", "https://www.google.com"],
      "form-action": ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/*', limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3001', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle OPTIONS preflight requests
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`, {
      contentType: req.get('content-type'),
      timestamp: new Date().toISOString()
    });
    next();
  });
}

// Serve static files
app.use(express.static('public'));

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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept common file types for medical claims
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|xml|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOC, XLS, JSON, XML, Images'));
    }
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

// Main claim submission endpoint with comprehensive workflow tracking
app.post('/api/submit-claim', upload.single('claimFile'), async (req, res) => {
  let claimId = null;
  
  try {
    claimId = generateClaimId();
    const startTime = Date.now();

  console.log('✅ POST /api/submit-claim endpoint hit', {
    claimId,
    hasFile: !!req.file,
    bodyKeys: Object.keys(req.body),
    contentType: req.get('content-type')
  });

  try {
    const {
      patientName,
      patientId,
      memberId,
      payerId,
      providerId,
      claimType,
      userEmail,
      userCredentials
    } = req.body;

    // Validate required fields
    const validationErrors = [];
    if (!patientName) validationErrors.push('patientName is required');
    if (!patientId) validationErrors.push('patientId is required');
    if (!claimType) validationErrors.push('claimType is required');
    if (!userEmail) validationErrors.push('userEmail is required');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (userEmail && !emailRegex.test(userEmail)) {
      validationErrors.push('Invalid email format');
    }

    // Validate claim type
    const validClaimTypes = ['professional', 'institutional', 'pharmacy', 'vision'];
    if (claimType && !validClaimTypes.includes(claimType.toLowerCase())) {
      validationErrors.push(`Invalid claim type. Must be one of: ${validClaimTypes.join(', ')}`);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        validationErrors,
        required: ['patientName', 'patientId', 'claimType', 'userEmail']
      });
    }

    const claimData = {
      // Patient Information
      patient: {
        name: patientName,
        id: patientId,
        memberId: memberId || patientId
      },

      // Payer & Provider
      payerId: payerId || 'DEFAULT_PAYER',
      providerId: providerId || 'DEFAULT_PROVIDER',

      // Claim Details
      claimType: claimType.toLowerCase(),
      submissionDate: new Date().toISOString(),

      // User Credentials (for NPHIES authentication)
      credentials: userCredentials ? (() => {
        try {
          return JSON.parse(userCredentials);
        } catch (error) {
          console.error('Invalid JSON in userCredentials:', error);
          return null;
        }
      })() : null,

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
        version: '1.0.0',
        claimId
      }
    };

    // Create claim tracker
    const claim = new ClaimTracker(claimId, claimData);
    claim.updateStage('validation', 'in_progress', 'Validating claim data');
    saveClaim(claim);

    // Read file content if exists
    if (req.file) {
      try {
        const resolvedPath = path.resolve(req.file.path);
        if (!resolvedPath.startsWith(UPLOAD_DIR + path.sep)) {
          throw new Error('Invalid file path for uploaded file');
        }
        const fileContent = await fs.readFile(resolvedPath);
        claimData.attachment.base64Content = fileContent.toString('base64');
      } catch (error) {
        console.error('Error reading file:', error);
        claim.addError('validation', `File read error: ${error.message}`);
      }
    }

    // Update validation stage
    claim.updateStage('validation', 'completed', 'Claim data validated successfully');
    claim.setStatus(WORKFLOW_STAGES.VALIDATED);
    saveClaim(claim);

    console.log('📋 Claim submission received:', {
      claimId,
      patientId,
      claimType,
      hasFile: !!req.file,
      timestamp: new Date().toISOString()
    });

    // Trigger workflow processing asynchronously
    processClaimWorkflow(claim, claimData).catch(error => {
      console.error(`❌ Error processing claim ${claimId}:`, error);
      claim.addError('workflow', error.message);
      claim.setStatus(WORKFLOW_STAGES.ERROR);
      saveClaim(claim);
    });

    // Cleanup uploaded file after processing
    if (req.file) {
      setTimeout(async () => {
        try {
          const resolvedPath = path.resolve(req.file.path);
          if (!resolvedPath.startsWith(UPLOAD_DIR + path.sep)) {
            throw new Error('Invalid file path for uploaded file');
          }
          await fs.unlink(resolvedPath);
          console.log('🗑️ Cleaned up temporary file:', req.file.filename);
        } catch (error) {
          console.error('Error cleaning up file:', error);
        }
      }, 60000); // Delete after 1 minute
    }

    // Return immediately with claim ID for tracking
    res.json({
      success: true,
      message: 'Claim submitted successfully',
      claimId,
      status: 'processing',
      data: {
        patientId,
        patientName,
        claimType,
        submittedAt: claimData.submissionDate,
        estimatedProcessingTime: '2-5 minutes',
        trackingUrl: `/api/claim-status/${claimId}`,
        statusCheckInterval: 3000 // Recommend polling every 3 seconds
      }
    });

  } catch (error) {
    console.error('❌ Error processing claim:', error);

    // Update claim if it exists
    const claim = getClaim(claimId);
    if (claim) {
      claim.addError('submission', error.message);
      claim.setStatus(WORKFLOW_STAGES.ERROR);
      saveClaim(claim);
    }

    res.status(500).json({
      success: false,
      claimId,
      error: 'Failed to process claim submission',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Async workflow processing function
async function processClaimWorkflow(claim, claimData) {
  const startTime = Date.now();

  try {
    // Stage 1: Normalization
    claim.updateStage('normalization', 'in_progress', 'Normalizing claim codes');
    claim.setStatus(WORKFLOW_STAGES.NORMALIZING);
    saveClaim(claim);

    // Try n8n first, fallback to direct services
    const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL ||
      'https://n8n.srv791040.hstgr.cloud/webhook/sbs-claim-submission';

    let workflowResult;
    try {
      workflowResult = await axios.post(N8N_WEBHOOK_URL, claimData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SBS-Landing-API/1.0',
          'X-Claim-ID': claim.claimId
        },
        timeout: 60000 // 60 second timeout for full workflow
      });

      // Update all stages as completed (n8n handles them)
      claim.updateStage('normalization', 'completed', 'Code normalization completed');
      claim.updateStage('financialRules', 'completed', 'Financial rules applied');
      claim.updateStage('signing', 'completed', 'Claim signed');
      claim.updateStage('nphiesSubmission', 'completed', 'Submitted to NPHIES');
      claim.setStatus(WORKFLOW_STAGES.SUBMITTED);
      claim.setNphiesResponse(workflowResult.data);

    } catch (n8nError) {
      console.warn('⚠️ n8n workflow failed, trying direct SBS services:', n8nError.message);

      // Fallback to direct SBS services
      if (process.env.ENABLE_DIRECT_SBS === 'true') {
        workflowResult = await processDirectSBS(claim, claimData);
      } else {
        throw n8nError;
      }
    }

    claim.processingTimeMs = Date.now() - startTime;
    saveClaim(claim);

    console.log(`✅ Claim ${claim.claimId} processed successfully in ${claim.processingTimeMs}ms`);
    return workflowResult;

  } catch (error) {
    claim.processingTimeMs = Date.now() - startTime;
    claim.addError('workflow', error.message);
    claim.setStatus(WORKFLOW_STAGES.ERROR);
    saveClaim(claim);
    throw error;
  }
}

// Direct SBS services processing with stage tracking
async function processDirectSBS(claim, claimData) {
  try {
    // Stage 1: Normalize
    claim.updateStage('normalization', 'in_progress', 'Calling normalizer service');
    saveClaim(claim);

    const normalizeResponse = await axios.post(`${SBS_NORMALIZER_URL}/normalize`, {
      facility_id: 1,
      internal_code: claimData.claimType,
      description: `${claimData.claimType} claim for ${claimData.patient.name}`
    }, { timeout: 30000 });

    claim.updateStage('normalization', 'completed', 'Code normalization completed', {
      sbsCode: normalizeResponse.data.sbs_mapped_code,
      confidence: normalizeResponse.data.confidence
    });
    claim.setStatus(WORKFLOW_STAGES.NORMALIZED);
    saveClaim(claim);

    // Stage 2: Apply Financial Rules
    claim.updateStage('financialRules', 'in_progress', 'Applying CHI financial rules');
    saveClaim(claim);

    const fhirClaim = buildFHIRClaim(claimData, normalizeResponse.data);
    const rulesResponse = await axios.post(`${SBS_FINANCIAL_RULES_URL}/validate`, fhirClaim, { timeout: 30000 });

    claim.updateStage('financialRules', 'completed', 'Financial rules applied', {
      total: rulesResponse.data.total?.value,
      currency: rulesResponse.data.total?.currency
    });
    claim.setStatus(WORKFLOW_STAGES.RULES_APPLIED);
    saveClaim(claim);

    // Stage 3: Sign
    claim.updateStage('signing', 'in_progress', 'Signing claim with facility certificate');
    saveClaim(claim);

    const signResponse = await axios.post(`${SBS_SIGNER_URL}/sign`, {
      payload: rulesResponse.data,
      facility_id: 1
    }, { timeout: 30000 });

    claim.updateStage('signing', 'completed', 'Claim signed successfully', {
      algorithm: signResponse.data.algorithm
    });
    claim.setStatus(WORKFLOW_STAGES.SIGNED);
    saveClaim(claim);

    // Stage 4: Submit to NPHIES
    claim.updateStage('nphiesSubmission', 'in_progress', 'Submitting to NPHIES');
    saveClaim(claim);

    const nphiesResponse = await axios.post(`${SBS_NPHIES_BRIDGE_URL}/submit`, {
      payload: rulesResponse.data,
      signature: signResponse.data.signature,
      facility_id: 1
    }, { timeout: 60000 });

    claim.updateStage('nphiesSubmission', 'completed', 'Successfully submitted to NPHIES', {
      transactionId: nphiesResponse.data.transaction_uuid
    });

    if (nphiesResponse.data.status === 'accepted') {
      claim.setStatus(WORKFLOW_STAGES.ACCEPTED);
    } else if (nphiesResponse.data.status === 'rejected') {
      claim.setStatus(WORKFLOW_STAGES.REJECTED);
    } else {
      claim.setStatus(WORKFLOW_STAGES.SUBMITTED);
    }

    claim.setNphiesResponse(nphiesResponse.data);
    saveClaim(claim);

    return {
      success: true,
      claimId: claim.claimId,
      submissionId: nphiesResponse.data.transaction_uuid,
      status: claim.status
    };

  } catch (error) {
    // Determine which stage failed
    const stages = ['normalization', 'financialRules', 'signing', 'nphiesSubmission'];
    for (const stage of stages) {
      if (claim.stages[stage].status === 'in_progress') {
        claim.updateStage(stage, 'failed', error.message);
        claim.addError(stage, error);
        break;
      }
    }
    throw error;
  }
}

// Build FHIR Claim resource
function buildFHIRClaim(claimData, normalizedData) {
  return {
    resourceType: 'Claim',
    status: 'active',
    type: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/claim-type',
        code: claimData.claimType
      }]
    },
    patient: {
      reference: `Patient/${claimData.patient.id}`
    },
    created: claimData.submissionDate,
    provider: {
      reference: `Organization/${claimData.providerId}`
    },
    insurer: {
      reference: `Organization/${claimData.payerId}`
    },
    priority: {
      coding: [{
        code: 'normal'
      }]
    },
    item: [{
      sequence: 1,
      productOrService: {
        coding: [{
          system: '',
          code: normalizedData.sbs_mapped_code || 'UNKNOWN',
          display: normalizedData.official_description || claimData.claimType
        }]
      },
      quantity: { value: claimData.quantity || 1 },
      unitPrice: { 
        value: claimData.unitPrice || normalizedData.unitPrice || 0, 
        currency: claimData.currency || 'SAR' 
      }
    }]
  };
}

// Check claim status endpoint - real-time workflow tracking
app.get('/api/claim-status/:claimId', async (req, res) => {
  try {
    const { claimId } = req.params;

    // Validate claim ID format
    if (!claimId || !claimIdRegex.test(claimId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid claim ID format',
        expectedFormat: 'CLM-XXXXXXXX-XXXXXX'
      });
    }

    // Get claim from store
    const claim = getClaim(claimId);

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found',
        claimId,
        message: 'The claim may have expired (claims are retained for 24 hours) or the ID is invalid.'
      });
    }

    // Calculate progress percentage
    const stageOrder = ['received', 'validation', 'normalization', 'financialRules', 'signing', 'nphiesSubmission'];
    let completedStages = 0;
    for (const stage of stageOrder) {
      if (claim.stages[stage]?.status === 'completed') {
        completedStages++;
      }
    }
    const progressPercentage = Math.round((completedStages / stageOrder.length) * 100);

    // Determine if workflow is complete
    const isComplete = ['submitted', 'accepted', 'rejected', 'error'].includes(claim.status);
    const isSuccess = ['submitted', 'accepted'].includes(claim.status);
    const isFailed = ['rejected', 'error'].includes(claim.status);

    res.json({
      success: true,
      claimId,
      status: claim.status,
      statusLabel: getStatusLabel(claim.status),
      progress: {
        percentage: progressPercentage,
        completedStages,
        totalStages: stageOrder.length
      },
      stages: claim.stages,
      isComplete,
      isSuccess,
      isFailed,
      errors: claim.errors,
      nphiesResponse: claim.nphiesResponse,
      processingTimeMs: claim.processingTimeMs,
      timestamps: {
        created: claim.createdAt,
        lastUpdate: claim.updatedAt
      },
      patient: {
        id: claim.data?.patient?.id,
        name: claim.data?.patient?.name
      },
      claimType: claim.data?.claimType
    });

  } catch (error) {
    console.error('Error fetching claim status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get human-readable status label
function getStatusLabel(status) {
  const labels = {
    received: 'Claim Received',
    validating: 'Validating Data',
    validated: 'Data Validated',
    normalizing: 'Normalizing Codes',
    normalized: 'Codes Normalized',
    applying_rules: 'Applying Financial Rules',
    rules_applied: 'Financial Rules Applied',
    signing: 'Signing Claim',
    signed: 'Claim Signed',
    submitting: 'Submitting to NPHIES',
    submitted: 'Submitted to NPHIES',
    accepted: 'Accepted by NPHIES',
    rejected: 'Rejected by NPHIES',
    error: 'Processing Error'
  };
  return labels[status] || status;
}

// List all claims (for admin/debugging)
app.get('/api/claims', (req, res) => {
  try {
    const claims = Array.from(claimStore.values()).map(claim => claim.toJSON());

    // Sort by creation date (newest first)
    claims.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const start = (page - 1) * limit;
    const paginatedClaims = claims.slice(start, start + limit);

    res.json({
      success: true,
      total: claims.length,
      page,
      limit,
      totalPages: Math.ceil(claims.length / limit),
      claims: paginatedClaims
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retry failed claim
app.post('/api/claims/:claimId/retry', async (req, res) => {
  try {
    const { claimId } = req.params;
    const claim = getClaim(claimId);

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    if (!['error', 'rejected'].includes(claim.status)) {
      return res.status(400).json({
        success: false,
        error: 'Only failed or rejected claims can be retried',
        currentStatus: claim.status
      });
    }

    // Reset stages and status for retry
    claim.setStatus(WORKFLOW_STAGES.RECEIVED);
    claim.errors = [];
    Object.keys(claim.stages).forEach(stage => {
      if (stage !== 'received') {
        claim.stages[stage] = { status: 'pending', timestamp: null, message: null };
      }
    });
    claim.stages.received = { status: 'completed', timestamp: new Date().toISOString(), message: 'Claim retry initiated' };
    saveClaim(claim);

    // Re-process the claim
    processClaimWorkflow(claim, claim.data).catch(error => {
      console.error('❌ Error retrying claim %s:', claimId, error);
      claim.addError('retry', error.message);
      claim.setStatus(WORKFLOW_STAGES.ERROR);
      saveClaim(claim);
    });

    res.json({
      success: true,
      message: 'Claim retry initiated',
      claimId,
      status: claim.status,
      trackingUrl: `/api/claim-status/${claimId}`
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
      { name: 'normalizer', url: `${SBS_NORMALIZER_URL}/health` },
      { name: 'signer', url: `${SBS_SIGNER_URL}/health` },
      { name: 'financial-rules', url: `${SBS_FINANCIAL_RULES_URL}/health` },
      { name: 'nphies-bridge', url: `${SBS_NPHIES_BRIDGE_URL}/health` }
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

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.log(`⚠️ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Error caught by middleware:', error);

  // Set content type to JSON
  res.setHeader('Content-Type', 'application/json');

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      message: error.message
    });
  }

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error'
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
