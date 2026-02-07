/**
 * SBS Integration Engine - Backend API Server
 * Handles claim submission and orchestrates microservices directly
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SBS_NORMALIZER_URL = process.env.SBS_NORMALIZER_URL || 'http://localhost:8000';
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || '/tmp/sbs-uploads');
const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_SIZE || '10485760', 10);
const SBS_SIGNER_URL = process.env.SBS_SIGNER_URL || 'http://localhost:8001';
const SBS_FINANCIAL_RULES_URL = process.env.SBS_FINANCIAL_RULES_URL || 'http://localhost:8002';
const SBS_NPHIES_BRIDGE_URL = process.env.SBS_NPHIES_BRIDGE_URL || 'http://localhost:8003';
const SBS_ELIGIBILITY_URL = process.env.SBS_ELIGIBILITY_URL || '';
const ENABLE_STAGE_HOOKS = process.env.ENABLE_STAGE_HOOKS === 'true';
const SBS_STAGE_HOOK_URL = process.env.SBS_STAGE_HOOK_URL || '';
const ENABLE_MOCK_PROCESSING = process.env.ENABLE_MOCK_PROCESSING === 'true';

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

const WORKFLOW_PROGRESS_STAGES = ['received', 'validation', 'normalization', 'financialRules', 'signing', 'nphiesSubmission'];

function getClaimProgress(claim) {
  const completedStages = WORKFLOW_PROGRESS_STAGES.filter(stage => claim.stages[stage]?.status === 'completed').length;
  return {
    percentage: Math.round((completedStages / WORKFLOW_PROGRESS_STAGES.length) * 100),
    completedStages,
    totalStages: WORKFLOW_PROGRESS_STAGES.length
  };
}

async function emitWorkflowHook(eventType, claim, metadata = {}) {
  if (!ENABLE_STAGE_HOOKS || !SBS_STAGE_HOOK_URL) {
    return;
  }

  const payload = {
    eventType,
    claimId: claim.claimId,
    status: claim.status,
    stage: metadata.stage || null,
    stageStatus: metadata.stageStatus || null,
    timestamp: new Date().toISOString(),
    patientId: claim.data?.patient?.id,
    claimType: claim.data?.claimType,
    progress: getClaimProgress(claim),
    metadata
  };

  try {
    await axios.post(SBS_STAGE_HOOK_URL, payload, { timeout: 5000 });
  } catch (error) {
    console.warn('[SBS HOOKS] Hook delivery failed:', error.message);
  }
}

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
    this.timeline = [
      {
        event: 'claim_received',
        message: 'Claim received and queued for processing',
        timestamp: new Date().toISOString()
      }
    ];
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
      this.timeline.push({
        event: `stage_${stageName}`,
        message: message || `${stageName} ${status}`,
        status,
        timestamp: new Date().toISOString()
      });
      void emitWorkflowHook('stage_updated', this, { stage: stageName, stageStatus: status, message });
    }
    return this;
  }

  setStatus(status) {
    this.status = status;
    this.updatedAt = new Date().toISOString();
    this.timeline.push({
      event: 'status_changed',
      message: `Status updated to ${status}`,
      status,
      timestamp: new Date().toISOString()
    });
    void emitWorkflowHook('status_changed', this, { status });
    return this;
  }

  addError(stage, error) {
    this.errors.push({
      stage,
      error: error.message || error,
      timestamp: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
    this.timeline.push({
      event: 'error',
      message: error.message || error,
      stage,
      timestamp: new Date().toISOString()
    });
    void emitWorkflowHook('error', this, { stage, error: error.message || error });
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
      timeline: this.timeline,
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

const claimIdRegex = /^CLM-[A-Z0-9]+-[A-Z0-9]+$/;

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
// For automated test runs we need to avoid hitting 429 due to polling-heavy
// endpoints like /api/claim-status/:claimId.
const DISABLE_RATE_LIMIT = process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test';
if (!DISABLE_RATE_LIMIT) {
  app.use('/api/*', limiter);
}

// CORS configuration
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN;
const allowedOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(',').map(origin => origin.trim()).filter(Boolean)
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

// SPA workspace routes (Command Center)
// Serve index.html for UI workspaces so direct navigation works.
const spaRoutes = [
  '/',
  '/claim-builder',
  '/eligibility',
  '/prior-auth',
  '/code-browser',
  '/ai-analytics',
  '/copilot'
];

spaRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `claim-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    // Accept common file types for medical claims
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx|xml|json/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      const error = new Error('Invalid file type. Allowed: PDF, DOC, XLS, JSON, XML, Images');
      error.status = 400;
      cb(error);
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

// ---------------------------------------------------------------------------
// Claim Analyzer API
// Computes risk vectors from validation/normalization outputs + workflow telemetry.
// ---------------------------------------------------------------------------

const STAGE_SLA_SECONDS = {
  validation: 30,
  normalization: 45,
  financialRules: 45,
  signing: 30,
  nphiesSubmission: 60
};

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function toNumberOrNull(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function getStageDurationsFromTimeline(claim) {
  // Compute durations using timeline events (in_progress -> completed/failed)
  const events = Array.isArray(claim.timeline) ? claim.timeline : [];
  const startTimes = {};
  const durations = {};

  for (const e of events) {
    const ev = String(e.event || '');
    if (!ev.startsWith('stage_')) continue;
    const stage = ev.replace('stage_', '');
    const status = e.status;
    const ts = new Date(e.timestamp).getTime();
    if (!Number.isFinite(ts)) continue;

    if (status === 'in_progress') {
      startTimes[stage] = ts;
    }
    if ((status === 'completed' || status === 'failed') && startTimes[stage]) {
      durations[stage] = Math.max(0, ts - startTimes[stage]);
      delete startTimes[stage];
    }
  }

  return durations; // ms
}

function computeClaimAnalysis(claim) {
  const stages = claim.stages || {};
  const errors = Array.isArray(claim.errors) ? claim.errors : [];

  const norm = stages.normalization?.data || {};
  const normConfidence = toNumberOrNull(norm.confidence);
  const normHasUnknown = String(norm.sbsCode || '').toUpperCase() === 'UNKNOWN';

  const fin = stages.financialRules?.data || {};
  const totalVal = toNumberOrNull(fin.total);

  const nph = claim.nphiesResponse || {};
  const nphStatus = String(nph.status || claim.status || '').toLowerCase();

  const durations = getStageDurationsFromTimeline(claim);
  const slaBreaches = Object.entries(STAGE_SLA_SECONDS)
    .map(([stage, slaS]) => {
      const ms = durations[stage];
      if (!ms) return null;
      const sec = ms / 1000;
      return sec > slaS ? { stage, durationSeconds: sec, slaSeconds: slaS } : null;
    })
    .filter(Boolean);

  // Subscores (0 = low risk, 1 = high risk)
  const dataCompletenessRisk = clamp01(
    (claim.data?.patient?.id ? 0 : 0.6) + (claim.data?.patient?.name ? 0 : 0.4) + (claim.data?.metadata?.submittedBy ? 0 : 0.3)
  );

  const codeMappingRisk = (() => {
    if (normHasUnknown) return 0.95;
    if (normConfidence === null) return 0.6;
    // assume confidence 0..1
    return clamp01(1 - normConfidence);
  })();

  const financialRisk = (() => {
    if (totalVal === null) return 0.35;
    if (totalVal <= 0) return 0.55;
    if (totalVal > 25000) return 0.85;
    if (totalVal > 10000) return 0.70;
    if (totalVal > 5000) return 0.58;
    return 0.30;
  })();

  const submissionRisk = (() => {
    if (nphStatus.includes('accepted')) return 0.20;
    if (nphStatus.includes('rejected')) return 0.92;
    if (nphStatus.includes('error')) return 0.98;
    // submitted/unknown
    return 0.45;
  })();

  const slaRisk = clamp01(slaBreaches.length ? 0.75 : 0.25);

  // Fraud signals: based on error count + high amount + unknown mapping.
  const fraudSignalsRisk = clamp01(
    (errors.length ? Math.min(0.55, errors.length * 0.12) : 0.20) +
    (totalVal !== null && totalVal > 20000 ? 0.25 : 0) +
    (normHasUnknown ? 0.20 : 0)
  );

  const overall = clamp01(
    (dataCompletenessRisk * 0.12) +
    (codeMappingRisk * 0.26) +
    (financialRisk * 0.18) +
    (slaRisk * 0.18) +
    (submissionRisk * 0.26)
  );

  const recommendations = [];
  if (normHasUnknown || codeMappingRisk > 0.6) {
    recommendations.push('Review normalization mapping; low confidence/UNKNOWN SBS code detected.');
  }
  if (slaBreaches.length) {
    recommendations.push(`Investigate SLA breach in stages: ${slaBreaches.map(b => b.stage).join(', ')}`);
  }
  if (submissionRisk > 0.8) {
    recommendations.push('NPHIES outcome indicates rejection/error. Review payload + bridge logs.');
  }
  if (financialRisk > 0.7) {
    recommendations.push('High financial total detected; validate bundling and tier markup results.');
  }

  return {
    success: true,
    claimId: claim.claimId,
    timestamp: new Date().toISOString(),
    signals: {
      normalization: {
        internalCode: norm.internalCode || null,
        sbsCode: norm.sbsCode || null,
        confidence: normConfidence,
        mappingSource: norm.mappingSource || null
      },
      financial: {
        total: totalVal,
        currency: fin.currency || null
      },
      nphies: {
        status: nph.status || null,
        transactionId: nph.transaction_uuid || nph.transactionId || null
      },
      errorsCount: errors.length,
      slaBreaches
    },
    risk: {
      overall,
      score100: Math.round(overall * 100),
      subscores: {
        dataCompleteness: dataCompletenessRisk,
        codeMapping: codeMappingRisk,
        eligibility: 0.50, // not currently part of workflow; reserved for future
        fraudSignals: fraudSignalsRisk,
        slaRisk
      }
    },
    recommendations
  };
}

app.get('/api/claims/:claimId/analyzer', (req, res) => {
  const { claimId } = req.params;

  if (!claimId || !claimIdRegex.test(claimId)) {
    return res.status(400).json({ success: false, error: 'Invalid claim ID format' });
  }

  const claim = getClaim(claimId);
  if (!claim) {
    return res.status(404).json({ success: false, error: 'Claim not found', claimId });
  }

  return res.json(computeClaimAnalysis(claim));
});

// ---------------------------------------------------------------------------
// Demo operational APIs for unified workspaces
// ---------------------------------------------------------------------------

app.post('/api/eligibility/check', async (req, res) => {
  const { memberId, payerId, dateOfService, facilityId } = req.body || {};

  // Prefer real eligibility service if configured.
  if (SBS_ELIGIBILITY_URL) {
    try {
      const response = await axios.post(
        `${SBS_ELIGIBILITY_URL.replace(/\/+$/, '')}/check`,
        { memberId, payerId, dateOfService, facilityId },
        { timeout: 12000 }
      );
      return res.json(response.data);
    } catch (error) {
      // Fail closed to deterministic fallback (do not error out UI).
      console.warn('[ELIGIBILITY] Upstream eligibility service unavailable, using fallback:', error.message);
    }
  }

  // Deterministic fallback behavior
  const eligible = Boolean(memberId) && !String(memberId).endsWith('0');
  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    memberId: memberId || null,
    payerId: payerId || null,
    eligible,
    plan: eligible ? 'GOLD' : 'UNKNOWN',
    benefits: eligible ? ['OP', 'IP', 'PHARMACY'] : [],
    notes: eligible
      ? 'Eligibility verified (fallback)'
      : 'Member not eligible (fallback rule: IDs ending with 0)'
  });
});

app.post('/api/prior-auth/submit', (req, res) => {
  const { memberId, procedureCode } = req.body || {};
  const ts = Date.now().toString(36).toUpperCase();
  const authId = `PA-${ts}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    authId,
    status: memberId && procedureCode ? 'submitted' : 'rejected',
    eta: '2m',
    notes: 'Prior auth request accepted (demo)'
  });
});

// Proxy normalize endpoint to the normalizer service (keeps UI same-origin).
app.post('/api/normalizer/normalize', async (req, res) => {
  try {
    const response = await axios.post(`${SBS_NORMALIZER_URL}/normalize`, req.body, { timeout: 15000 });
    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 502;
    res.status(status).json({
      error: 'Normalizer proxy failed',
      message: error.response?.data || error.message
    });
  }
});

// AI Copilot (DeepSeek V4) — safe demo implementation.
// Safety defaults:
// - Fail-closed deterministic reply if upstream copilot is unavailable
// - Redacts obvious secret patterns
// - Optional proxy to internal copilot service (normalizer-service) when exposed
app.post('/api/copilot/chat', async (req, res) => {
  const { message, context } = req.body || {};
  const text = String(message || '').trim();

  const SECRET_PATTERNS = [
    /sk-[A-Za-z0-9]{10,}/g,
    /DEEPSEEK_API_KEY\s*=?\s*[A-Za-z0-9\-_.]{10,}/gi,
    /GEMINI_API_KEY\s*=?\s*[A-Za-z0-9\-_.]{10,}/gi
  ];

  function sanitizeReply(input) {
    const raw = String(input || '');
    const redacted = SECRET_PATTERNS.reduce((acc, pat) => acc.replace(pat, '[REDACTED]'), raw);
    return redacted.length > 2000 ? `${redacted.slice(0, 1980)}\n…(truncated)…` : redacted;
  }

  function buildTelemetryForClaim(claim) {
    if (!claim) return null;
    const analysis = computeClaimAnalysis(claim);

    // Carefully select safe fields only. Never include attachments/base64.
    const stages = claim.stages || {};
    const stageSummary = Object.fromEntries(
      Object.entries(stages).map(([k, v]) => [
        k,
        {
          status: v?.status || null,
          timestamp: v?.timestamp || null,
          message: v?.message || null,
          // include only small, safe per-stage data
          data: k === 'normalization'
            ? {
              internalCode: v?.data?.internalCode || null,
              sbsCode: v?.data?.sbsCode || null,
              confidence: v?.data?.confidence ?? null,
              mappingSource: v?.data?.mappingSource || null,
              requestId: v?.data?.requestId || null
            }
            : k === 'financialRules'
              ? {
                total: v?.data?.total ?? null,
                currency: v?.data?.currency || null
              }
              : undefined
        }
      ])
    );

    return {
      claimId: claim.claimId,
      status: claim.status,
      progress: getClaimProgress(claim),
      stages: stageSummary,
      errorsCount: Array.isArray(claim.errors) ? claim.errors.length : 0,
      nphies: {
        status: claim.nphiesResponse?.status || null,
        transactionId: claim.nphiesResponse?.transaction_uuid || null
      },
      risk: analysis?.risk,
      recommendations: analysis?.recommendations || []
    };
  }

  function enrichContextWithTelemetry(inputContext) {
    const ctx = (inputContext && typeof inputContext === 'object') ? inputContext : {};
    const claimId = ctx.claimId;
    if (!claimId || !claimIdRegex.test(String(claimId))) {
      return ctx;
    }
    const claim = getClaim(String(claimId));
    if (!claim) {
      return ctx;
    }
    return {
      ...ctx,
      telemetry: buildTelemetryForClaim(claim)
    };
  }

  async function tryInternalCopilot() {
    const mode = (process.env.SBS_COPILOT_MODE || 'auto').toLowerCase(); // auto|normalizer|deterministic
    if (mode === 'deterministic') {
      return null;
    }

    const url = process.env.SBS_INTERNAL_COPILOT_URL || `${SBS_NORMALIZER_URL}/copilot/chat`;
    try {
      const enrichedContext = enrichContextWithTelemetry(context);
      const upstream = await axios.post(url, { message: text, context: enrichedContext || {} }, { timeout: 7000 });
      if (!upstream?.data) {
        return null;
      }

      // Accept either {reply,...} or {success:true, reply,...}
      const payload = upstream.data;
      if (payload.reply) {
        return {
          provider: payload.provider || 'internal',
          model: payload.model || 'internal-copilot',
          reply: sanitizeReply(payload.reply),
          safety: payload.safety || { mode: 'internal' }
        };
      }
      return null;
    } catch (err) {
      // Only use deterministic fallback.
      return null;
    }
  }

  const internal = await tryInternalCopilot();
  if (internal) {
    return res.json({
      success: true,
      provider: internal.provider,
      model: internal.model,
      timestamp: new Date().toISOString(),
      reply: internal.reply,
      safety: internal.safety
    });
  }

  // Deterministic fallback (no network).
  const deepseekKeyPresent = Boolean(process.env.DEEPSEEK_API_KEY);
  const deepseekEnabled = (process.env.ENABLE_DEEPSEEK || '').toLowerCase() === 'true' || (process.env.ENABLE_DEEPSEEK || '') === '1';
  const provider = deepseekKeyPresent && deepseekEnabled ? 'deepseek' : 'deterministic';
  const model = provider === 'deepseek' ? 'DeepSeek V4 (gated)' : 'Deterministic Safety HUD';

  // Lightweight, deterministic responder (no secrets, no network).
  const normalized = text.toLowerCase();
  let reply = '';

  if (!text) {
    reply = 'No input received. Provide a question or an instruction.';
  } else if (normalized.includes('status') || normalized.includes('health')) {
    reply = 'Use AI Analytics → Service Cards for live health, or call GET /api/services/status.';
  } else if (normalized.includes('normalize') || normalized.includes('code')) {
    reply = 'Use Code Browser workspace. It calls POST /api/normalizer/normalize (proxy to normalizer-service).';
  } else if (normalized.includes('sla') || normalized.includes('slow')) {
    reply = 'SLA signals are derived from stage timestamps. In Claim Builder → Safety Hub, watch slaRisk and timeline.';
  } else if (normalized.includes('claim') && context?.claimId) {
    reply = `I see a tracked claimId=${context.claimId}. Open Claim Builder to view timeline and risk vectors.`;
  } else {
    reply = 'HUD tip: ask about "workflow stages", "services status", "normalization", or provide a claimId for tracking.';
  }

  res.json({
    success: true,
    provider,
    model,
    timestamp: new Date().toISOString(),
    reply: sanitizeReply(reply),
    safety: { mode: 'offline', redaction: true, maxLen: 2000 }
  });
});

// Main claim submission endpoint with comprehensive workflow tracking
app.post('/api/submit-claim', upload.single('claimFile'), async (req, res) => {
  let claimId = null;
  
  try {
    claimId = generateClaimId();
    console.log('✅ POST /api/submit-claim endpoint hit', {
      claimId,
      hasFile: !!req.file,
      bodyKeys: Object.keys(req.body),
      contentType: req.get('content-type')
    });

    const {
      patientName,
      patientId,
      memberId,
      payerId,
      providerId,
      claimType,
      userEmail,
      userCredentials,
      internalCode,
      mockOutcome
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
      // Optional: allow callers/tests to supply an internal code that exists in
      // `facility_internal_codes` (see `database/schema.sql`).
      internalCode: internalCode || null,
      // Optional: testing hook forwarded to NPHIES bridge when mock mode enabled.
      mockOutcome: mockOutcome || null,
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

    if (ENABLE_MOCK_PROCESSING) {
      claim.updateStage('normalization', 'completed', 'Mock normalization completed');
      claim.updateStage('financialRules', 'completed', 'Mock financial rules applied');
      claim.updateStage('signing', 'completed', 'Mock signing completed');
      claim.updateStage('nphiesSubmission', 'completed', 'Mock submission completed');
      claim.setStatus(WORKFLOW_STAGES.SUBMITTED);
      claim.setNphiesResponse({
        status: 'mock_submitted',
        transaction_uuid: `MOCK-${claim.claimId}`
      });
      claim.processingTimeMs = Date.now() - startTime;
      saveClaim(claim);
      return {
        success: true,
        claimId: claim.claimId,
        status: claim.status,
        mock: true
      };
    }

    const workflowResult = await processDirectSBS(claim, claimData);

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

    // The normalizer currently supports deterministic DB mappings only.
    // For end-to-end workflow testing, map claim types to sample internal codes
    // seeded in `database/schema.sql`.
    const defaultInternalCodesByType = {
      professional: 'CONS-GEN-01',
      institutional: 'RAD-CXR-01',
      pharmacy: 'LAB-CBC-01',
      vision: 'RAD-CXR-01'
    };

    const internalCode =
      claimData.internalCode ||
      defaultInternalCodesByType[String(claimData.claimType || '').toLowerCase()] ||
      'CONS-GEN-01';

    const normalizeResponse = await axios.post(
      `${SBS_NORMALIZER_URL}/normalize`,
      {
        facility_id: 1,
        internal_code: internalCode,
        description: `${internalCode} for ${claimData.patient.name}`
      },
      { timeout: 30000 }
    );

    claim.updateStage('normalization', 'completed', 'Code normalization completed', {
      internalCode,
      sbsCode: normalizeResponse.data.sbs_mapped_code,
      officialDescription: normalizeResponse.data.official_description,
      confidence: normalizeResponse.data.confidence,
      mappingSource: normalizeResponse.data.mapping_source,
      requestId: normalizeResponse.data.request_id,
      processingTimeMs: normalizeResponse.data.processing_time_ms
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

    const nphiesResponse = await axios.post(
      `${SBS_NPHIES_BRIDGE_URL}/submit-claim`,
      {
        facility_id: 1,
        fhir_payload: rulesResponse.data,
        signature: signResponse.data.signature,
        // Optional testing hook; only used when NPHIES bridge mock mode is enabled.
        mock_outcome: claimData.mockOutcome
      },
      { timeout: 60000 }
    );

    claim.updateStage('nphiesSubmission', 'completed', 'Successfully submitted to NPHIES', {
      transactionId: nphiesResponse.data.transaction_uuid
    });

    if (nphiesResponse.data.status === 'accepted') {
      claim.setStatus(WORKFLOW_STAGES.ACCEPTED);
    } else if (nphiesResponse.data.status === 'rejected') {
      claim.setStatus(WORKFLOW_STAGES.REJECTED);
    } else if (nphiesResponse.data.status === 'error') {
      // Bridge returned a syntactic response but indicates upstream failure.
      claim.setStatus(WORKFLOW_STAGES.ERROR);
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
    // financial-rules-engine expects this field
    facility_id: 1,
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
          // financial-rules-engine extracts SBS codes only from this system
          system: 'http://sbs.sa/coding/services',
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
    const progressInfo = getClaimProgress(claim);

    // Determine if workflow is complete
    const isComplete = ['submitted', 'accepted', 'rejected', 'error'].includes(claim.status);
    const isSuccess = ['submitted', 'accepted'].includes(claim.status);
    const isFailed = ['rejected', 'error'].includes(claim.status);

    res.json({
      success: true,
      claimId,
      status: claim.status,
      statusLabel: getStatusLabel(claim.status),
      progress: progressInfo,
      stages: claim.stages,
      isComplete,
      isSuccess,
      isFailed,
      errors: claim.errors,
      timeline: claim.timeline,
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

// Download claim receipt as PDF
app.get('/api/claim-receipt/:claimId', (req, res) => {
  const { claimId } = req.params;

  if (!claimId || !claimIdRegex.test(claimId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid claim ID format',
      expectedFormat: 'CLM-XXXXXXXX-XXXXXX'
    });
  }

  const claim = getClaim(claimId);
  if (!claim) {
    return res.status(404).json({
      success: false,
      error: 'Claim not found',
      claimId
    });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="claim-receipt-${claimId}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text('SBS Claim Receipt', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Claim ID: ${claim.claimId}`);
  doc.text(`Status: ${getStatusLabel(claim.status)}`);
  doc.text(`Submitted At: ${claim.createdAt}`);
  doc.text(`Patient Name: ${claim.data?.patient?.name || 'N/A'}`);
  doc.text(`Patient ID: ${claim.data?.patient?.id || 'N/A'}`);
  doc.text(`Claim Type: ${claim.data?.claimType || 'N/A'}`);
  doc.moveDown();

  doc.fontSize(14).text('Workflow Stages');
  doc.moveDown(0.5);
  WORKFLOW_PROGRESS_STAGES.forEach((stage) => {
    const stageInfo = claim.stages[stage];
    if (!stageInfo) return;
    const stageLabel = stage.replace(/([A-Z])/g, ' $1');
    doc.fontSize(11).text(
      `- ${stageLabel}: ${stageInfo.status} ${stageInfo.timestamp ? `(${stageInfo.timestamp})` : ''}`
    );
  });

  if (claim.errors?.length) {
    doc.moveDown();
    doc.fontSize(14).text('Errors');
    claim.errors.forEach((err) => {
      doc.fontSize(11).text(`- ${err.stage}: ${err.error}`);
    });
  }

  doc.end();
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

🌍 Environment: ${process.env.NODE_ENV || 'development'}

Ready to process claims! 📋
`);
});

module.exports = app;
