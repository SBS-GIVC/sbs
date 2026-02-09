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
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
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
const SUCCESS_STATUSES = new Set(['completed', 'approved', 'submitted']);
const TERMINAL_STATUSES = new Set(['completed', 'approved', 'rejected', 'failed']);

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

function isSuccessfulStatus(status) {
  return SUCCESS_STATUSES.has(String(status || '').toLowerCase());
}

function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(String(status || '').toLowerCase());
}

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `http://${value}`;
}

function buildServiceBaseUrls(envValue, defaults = []) {
  const parts = [];
  if (typeof envValue === 'string' && envValue.trim()) {
    for (const item of envValue.split(',')) {
      const cleaned = normalizeBaseUrl(item);
      if (cleaned) parts.push(cleaned);
    }
  }
  for (const item of defaults) {
    const cleaned = normalizeBaseUrl(item);
    if (cleaned) parts.push(cleaned);
  }
  return Array.from(new Set(parts));
}

function joinServiceUrl(baseUrl, routePath) {
  const cleanPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return `${baseUrl}${cleanPath}`;
}

function shouldTryNextServiceCandidate(error, retryOnStatuses) {
  const status = error?.response?.status;
  if (!status) return true;
  return retryOnStatuses.includes(status);
}

function extractErrorMessage(error, fallback = 'Request failed') {
  return (
    error?.response?.data?.detail?.message ||
    error?.response?.data?.detail?.error ||
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

async function requestWithServiceFallback(baseUrls, routePath, options = {}, behavior = {}) {
  const retryOnStatuses = Array.isArray(behavior.retryOnStatuses) && behavior.retryOnStatuses.length > 0
    ? behavior.retryOnStatuses
    : [404, 408, 429, 500, 502, 503, 504];
  let lastError = null;
  for (let i = 0; i < baseUrls.length; i++) {
    const baseUrl = baseUrls[i];
    try {
      return await axios({
        url: joinServiceUrl(baseUrl, routePath),
        timeout: 20000,
        ...options
      });
    } catch (error) {
      lastError = error;
      const hasMore = i < baseUrls.length - 1;
      if (hasMore && shouldTryNextServiceCandidate(error, retryOnStatuses)) {
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('No upstream service candidates configured');
}

const NORMALIZER_BASE_URLS = buildServiceBaseUrls(process.env.NORMALIZER_URL, [
  'http://sbs-normalizer:8000',
  'http://normalizer:8000',
  'http://localhost:8000'
]);
const SIGNER_BASE_URLS = buildServiceBaseUrls(process.env.SIGNER_URL, [
  'http://sbs-signer:8001',
  'http://signer:8001',
  'http://localhost:8001'
]);
const FINANCIAL_BASE_URLS = buildServiceBaseUrls(process.env.FINANCIAL_RULES_URL, [
  'http://sbs-financial-rules:8002',
  'http://financial-rules:8002',
  'http://localhost:8002'
]);
const NPHIES_BASE_URLS = buildServiceBaseUrls(process.env.NPHIES_BRIDGE_URL, [
  'http://sbs-nphies-bridge:8003',
  'http://nphies-bridge:8003',
  'http://localhost:8003'
]);
const SIMULATION_BASE_URLS = buildServiceBaseUrls(process.env.SIMULATION_URL || process.env.SBS_SIMULATION_URL, [
  'http://sbs-simulation:8005',
  'http://simulation:8005',
  'http://localhost:8005'
]);

// Security middleware with CSP
// NOTE: 'unsafe-inline' is required for the runtime API config in index.html
// TODO: Consider moving to nonce-based CSP for enhanced security
// 'unsafe-eval' removed - Tailwind CDN and Vite HMR don't require it in production
const isProduction = (process.env.NODE_ENV || 'development') === 'production';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // In production, unsafe-eval is NOT needed; in dev, Vite HMR may require it
      scriptSrc: isProduction
        ? ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"]
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
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
// ==============================================================================
// IoT Events API - For Arduino IoT Gateway Integration
// ==============================================================================
// Endpoint: POST /api/v1/iot/events
// Gateway: ~/sbs/arduino-iot-gateway
// Documentation: ~/sbs/INTEGRATION_ARCHITECTURE.md
// ==============================================================================

// In-memory store for IoT events (in production, use PostgreSQL)
const iotEventsStore = {
  events: [],
  stats: {
    received: 0,
    processed: 0,
    failed: 0
  },
  maxStoredEvents: 1000
};

// IoT device tokens (in production, store in database)
const validIoTTokens = new Set([
  process.env.IOT_DEVICE_TOKEN || 'dev_iot_token_12345',
  'bsk_test_gateway_token'
]);

// Rate limiter specific to IoT devices (higher limits for telemetry)
const iotLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Allow 300 requests per minute for IoT devices
  message: { error: 'IoT rate limit exceeded', retry_after_ms: 60000 }
});

/**
 * IoT Event Ingestion Endpoint
 * Receives events from Arduino IoT Gateway
 */
app.post('/api/v1/iot/events', iotLimiter, async (req, res) => {
  const requestId = req.headers['x-request-id'] || `iot-${Date.now()}`;
  
  try {
    // 1. Validate Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      iotEventsStore.stats.failed++;
      return res.status(401).json({ 
        error: 'Missing or invalid Authorization header',
        format: 'Bearer <API_TOKEN>'
      });
    }
    
    const token = authHeader.split(' ')[1];
    if (!validIoTTokens.has(token) && token !== process.env.IOT_DEVICE_TOKEN) {
      iotEventsStore.stats.failed++;
      return res.status(403).json({ error: 'Invalid device token' });
    }
    
    // 2. Parse event data
    const event = req.body;
    
    if (!event || !event.event) {
      iotEventsStore.stats.failed++;
      return res.status(400).json({ 
        error: 'Invalid event payload',
        required: ['event'],
        optional: ['node', 'ts', 'data']
      });
    }
    
    // 3. Enrich event with server metadata
    const enrichedEvent = {
      event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      received_at: new Date().toISOString(),
      node: event.node || req.headers['x-node-id'] || 'unknown',
      event_type: event.event,
      device_ts: event.ts,
      gateway_ts: event.gateway_ts,
      data: event.data || {},
      processed: false,
      facility_code: event.facility_code || 'default',
      source_ip: req.ip || req.connection?.remoteAddress
    };
    
    // 4. Store event
    iotEventsStore.events.push(enrichedEvent);
    iotEventsStore.stats.received++;
    
    if (iotEventsStore.events.length > iotEventsStore.maxStoredEvents) {
      iotEventsStore.events = iotEventsStore.events.slice(-iotEventsStore.maxStoredEvents);
    }
    
    // 5. Log alerts
    if (event.event === 'alert' || event.event === 'threshold') {
      console.log(`🚨 [IoT Alert] Node: ${enrichedEvent.node} - ${JSON.stringify(event.data)}`);
    } else {
      console.log(`📡 [IoT Event] Node: ${enrichedEvent.node} | Type: ${event.event}`);
    }
    
    iotEventsStore.stats.processed++;
    
    res.status(201).json({
      status: 'received',
      event_id: enrichedEvent.event_id,
      stored_at: enrichedEvent.received_at,
      node: enrichedEvent.node,
      next_sync_ms: 5000
    });
    
  } catch (error) {
    console.error(`❌ [IoT Error] ${requestId}:`, error.message);
    iotEventsStore.stats.failed++;
    res.status(500).json({ error: 'Failed to process IoT event', request_id: requestId, retry: true });
  }
});

// IoT Events Query Endpoint
app.get('/api/v1/iot/events', async (req, res) => {
  try {
    const { node, limit = 50, event_type } = req.query;
    let events = [...iotEventsStore.events].reverse();
    if (node) events = events.filter(e => e.node === node);
    if (event_type) events = events.filter(e => e.event_type === event_type);
    events = events.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      total: iotEventsStore.events.length,
      returned: events.length,
      stats: iotEventsStore.stats,
      events
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IoT Stats Endpoint
app.get('/api/v1/iot/stats', (req, res) => {
  const nodeStats = {};
  iotEventsStore.events.forEach(event => {
    const node = event.node || 'unknown';
    if (!nodeStats[node]) nodeStats[node] = { count: 0, last_seen: null, event_types: new Set() };
    nodeStats[node].count++;
    nodeStats[node].last_seen = event.received_at;
    nodeStats[node].event_types.add(event.event_type);
  });
  
  Object.keys(nodeStats).forEach(node => {
    nodeStats[node].event_types = [...nodeStats[node].event_types];
  });
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    gateway_endpoint: '/api/v1/iot/events',
    stats: iotEventsStore.stats,
    nodes: nodeStats,
    buffer_size: iotEventsStore.events.length,
    max_buffer: iotEventsStore.maxStoredEvents
  });
});

// IoT Dashboard Summary
app.get('/api/v1/iot/dashboard', (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = iotEventsStore.events.filter(e => new Date(e.received_at) > oneHourAgo);
    const dailyEvents = iotEventsStore.events.filter(e => new Date(e.received_at) > oneDayAgo);
    
    const eventTypeDistribution = {};
    dailyEvents.forEach(e => {
      const type = e.event_type || 'unknown';
      eventTypeDistribution[type] = (eventTypeDistribution[type] || 0) + 1;
    });
    
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const activeNodes = new Set(
      iotEventsStore.events.filter(e => new Date(e.received_at) > fiveMinutesAgo).map(e => e.node)
    );
    
    const alerts = dailyEvents.filter(e => e.event_type === 'alert');
    const criticalAlerts = alerts.filter(e => e.data?.severity === 'critical');
    
    res.json({
      success: true,
      dashboard: {
        timestamp: now.toISOString(),
        status: criticalAlerts.length > 0 ? 'warning' : 'healthy',
        system_health_score: Math.max(0, 100 - (criticalAlerts.length * 10)),
        nodes: { total: Object.keys(getNodeStats()).length, active_now: activeNodes.size, active_list: [...activeNodes] },
        events: { last_hour: recentEvents.length, last_24h: dailyEvents.length, total_stored: iotEventsStore.events.length },
        alerts: { total_24h: alerts.length, critical: criticalAlerts.length },
        event_types: eventTypeDistribution,
        processing: iotEventsStore.stats
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getNodeStats() {
  const nodeStats = {};
  iotEventsStore.events.forEach(event => {
    const node = event.node || 'unknown';
    if (!nodeStats[node]) nodeStats[node] = { count: 0, last_seen: null, event_types: new Set(), first_seen: null };
    nodeStats[node].count++;
    nodeStats[node].last_seen = event.received_at;
    if (!nodeStats[node].first_seen) nodeStats[node].first_seen = event.received_at;
    nodeStats[node].event_types.add(event.event_type);
  });
  return nodeStats;
}

// IoT Device List
app.get('/api/v1/iot/devices', (req, res) => {
  try {
    const nodeStats = getNodeStats();
    const now = new Date();
    
    const devices = Object.entries(nodeStats).map(([nodeId, stats]) => {
      const lastSeen = new Date(stats.last_seen);
      const secondsSinceLastSeen = (now - lastSeen) / 1000;
      let status = 'offline';
      if (secondsSinceLastSeen < 300) status = 'online';
      else if (secondsSinceLastSeen < 3600) status = 'idle';
      
      return {
        node_id: nodeId, status, last_seen: stats.last_seen, first_seen: stats.first_seen,
        event_count: stats.count, event_types: [...stats.event_types],
        seconds_since_last_seen: Math.round(secondsSinceLastSeen)
      };
    });
    
    devices.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
    
    res.json({
      success: true, total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      idle: devices.filter(d => d.status === 'idle').length,
      offline: devices.filter(d => d.status === 'offline').length,
      devices
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IoT Alerts List
app.get('/api/v1/iot/alerts', (req, res) => {
  try {
    const { severity, node, limit = 100, acknowledged } = req.query;
    let alerts = iotEventsStore.events.filter(e => e.event_type === 'alert').reverse();
    if (severity) alerts = alerts.filter(e => e.data?.severity === severity);
    if (node) alerts = alerts.filter(e => e.node === node);
    if (acknowledged !== undefined) {
      const isAck = acknowledged === 'true';
      alerts = alerts.filter(e => (e.data?.acknowledged || false) === isAck);
    }
    alerts = alerts.slice(0, parseInt(limit));
    
    const allAlerts = iotEventsStore.events.filter(e => e.event_type === 'alert');
    res.json({
      success: true, total: allAlerts.length, returned: alerts.length,
      severity_summary: {
        critical: allAlerts.filter(e => e.data?.severity === 'critical').length,
        warning: allAlerts.filter(e => e.data?.severity === 'warning').length,
        info: allAlerts.filter(e => e.data?.severity === 'info' || !e.data?.severity).length
      },
      alerts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge Alert
app.post('/api/v1/iot/alerts/:eventId/acknowledge', (req, res) => {
  try {
    const { eventId } = req.params;
    const { acknowledged_by } = req.body;
    const event = iotEventsStore.events.find(e => e.event_id === eventId);
    if (!event) return res.status(404).json({ error: 'Alert not found', event_id: eventId });
    if (event.event_type !== 'alert') return res.status(400).json({ error: 'Event is not an alert' });
    
    event.data = event.data || {};
    event.data.acknowledged = true;
    event.data.acknowledged_at = new Date().toISOString();
    event.data.acknowledged_by = acknowledged_by || 'system';
    
    res.json({ success: true, message: 'Alert acknowledged', event_id: eventId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// IoT Health Check
app.get('/api/v1/iot/health', (req, res) => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const recentEvents = iotEventsStore.events.filter(e => new Date(e.received_at) > fiveMinutesAgo);
  const criticalAlerts = iotEventsStore.events.filter(e => 
    e.event_type === 'alert' && e.data?.severity === 'critical' && !e.data?.acknowledged
  );
  
  let status = 'healthy';
  if (criticalAlerts.length > 0) status = 'warning';
  if (iotEventsStore.stats.failed > iotEventsStore.stats.processed * 0.1) status = 'degraded';
  
  res.json({
    status, timestamp: now.toISOString(),
    iot_subsystem: {
      uptime_status: 'running', recent_activity: recentEvents.length > 0,
      events_last_5min: recentEvents.length, unack_critical_alerts: criticalAlerts.length,
      buffer_usage: `${iotEventsStore.events.length}/${iotEventsStore.maxStoredEvents}`,
      stats: iotEventsStore.stats
    }
  });
});


// CORS configuration - Restrict to allowed origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:4173').split(',');
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
// Middleware moved to top

// Serve static files
app.use(express.static('public'));

// Ensure SPA routes under /sbs/* work (serve the built app index)
app.get('/sbs', (req, res) => res.redirect(301, '/sbs/'));
app.get('/sbs/*', (req, res) => {
  const requested = String(req.path || '').replace(/^\/sbs\/?/, '');
  // Keep explicit asset misses as true 404 instead of returning the SPA shell.
  if (requested && path.extname(requested)) {
    return res.status(404).json({
      success: false,
      error: 'Static asset not found'
    });
  }
  res.sendFile(path.join(__dirname, 'public', 'sbs', 'index.html'));
});

// Backwards-compatible aliases (older docs/scripts)
app.get(['/ai-analytics', '/ai-hub'], (req, res) => res.redirect(302, '/sbs/'));
app.get('/dashboard.html', (req, res) => res.redirect(302, '/sbs/dashboard.html'));
app.get('/tracking.html', (req, res) => {
  const claimId = req.query?.claimId ? `?claimId=${encodeURIComponent(req.query.claimId)}` : '';
  res.redirect(302, `/sbs/dashboard.html${claimId}`);
});

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
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
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
    
    // Priority 1: Use Gemini if key is provided (since endpoint is named gemini/generate)
    if (GEMINI_API_KEY) {
      try {
        const geminiResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\nUser Query: ${prompt}` }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
          }
        );

        const text = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.json({
          success: true,
          text: text,
          model: 'gemini-1.5-flash'
        });
      } catch (geminiError) {
        console.warn('⚠️ Gemini API error, falling back to DeepSeek or Mock:', geminiError.message);
      }
    }

    // Priority 2: Use DeepSeek if key is provided
    if (DEEPSEEK_API_KEY) {
      try {
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
        
        return res.json({
          success: true,
          text: text,
          model: 'deepseek-chat'
        });
      } catch (apiError) {
        console.warn('⚠️ DeepSeek API unavailable, using mock response:', apiError.message);
      }
    }

    // Priority 3: Mock Response
    console.warn('⚠️ No AI keys configured or APIs failed, returning mock response');
    return res.json({
      success: true,
      text: generateMockResponse(prompt),
      isMock: true,
      fallbackReason: (!GEMINI_API_KEY && !DEEPSEEK_API_KEY) ? 'No AI keys configured' : 'AI services temporarily unavailable'
    });

  } catch (error) {
    console.error('❌ DeepSeek API error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI response',
      message: error.message
    });
  }
});

async function handleNormalizeRequest(req, res) {
  const facility_id = Number(req.body?.facility_id || req.body?.facilityId || 1);
  const internal_code = String(
    req.body?.internal_code ||
    req.body?.internalCode ||
    req.body?.code ||
    ''
  ).trim();
  const description = String(
    req.body?.description ||
    req.body?.service_desc ||
    req.body?.serviceDesc ||
    ''
  ).trim();

  if (!internal_code) {
    return res.status(400).json({
      success: false,
      error: 'internal_code is required'
    });
  }

  try {
    const response = await requestWithServiceFallback(NORMALIZER_BASE_URLS, '/normalize', {
      method: 'POST',
      data: { facility_id, internal_code, description }
    }, {
      // 404 from normalizer means "no mapping found", which we handle below as a graceful fallback.
      retryOnStatuses: [408, 429, 500, 502, 503, 504]
    });
    return res.json(response.data);
  } catch (error) {
    // The normalizer returns 404 when no mapping exists; return a deterministic fallback.
    if (error?.response?.status === 404) {
      return res.json({
        request_id: `NRM-${Date.now()}`,
        facility_id,
        internal_code,
        sbs_mapped_code: internal_code,
        official_description: description || 'No mapping found in normalizer catalog',
        confidence: 0,
        mapping_source: 'fallback-no-match',
        processing_time_ms: 0,
        warnings: ['No mapping found in normalizer catalog, returned passthrough code']
      });
    }
    return res.status(502).json({
      success: false,
      error: 'Normalizer service unavailable',
      details: extractErrorMessage(error, 'Failed to normalize code')
    });
  }
}

function buildFallbackSimulationCatalog() {
  return {
    professional: [
      {
        internal_code: 'CONS-GEN-001',
        sbs_code: 'SBS-CONS-001',
        description_en: 'General Medical Consultation',
        standard_price: 200
      },
      {
        internal_code: 'LAB-CBC-001',
        sbs_code: 'SBS-LAB-001',
        description_en: 'Complete Blood Count (CBC)',
        standard_price: 120
      }
    ],
    institutional: [
      {
        internal_code: 'ER-ADM-001',
        sbs_code: 'SBS-ER-001',
        description_en: 'Emergency Admission Bundle',
        standard_price: 950
      }
    ],
    pharmacy: [
      {
        internal_code: 'RX-AMOX-500',
        sbs_code: 'SBS-RX-001',
        description_en: 'Amoxicillin 500mg',
        standard_price: 45
      }
    ],
    vision: [
      {
        internal_code: 'VIS-EXAM-001',
        sbs_code: 'SBS-VSN-001',
        description_en: 'Comprehensive Eye Exam',
        standard_price: 180
      }
    ]
  };
}

// Backwards-compatible health alias used by the /sbs SPA bundle.
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'sbs-landing-api',
    timestamp: new Date().toISOString()
  });
});

// Backwards-compatible endpoint expected by legacy and dashboard UI.
app.get('/api/claim-receipt/:claimId', (req, res) => {
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

  const status = String(record.status || 'processing').toLowerCase();
  const isComplete = isTerminalStatus(status);
  const isSuccess = isSuccessfulStatus(status);

  res.json({
    success: true,
    receiptId: `RCP-${claimId}`,
    claimId: record.claimId,
    status,
    statusLabel: statusLabel(status),
    issuedAt: new Date().toISOString(),
    patient: {
      id: record.patientId,
      name: record.patientName
    },
    claimType: record.claimType,
    submissionId: record.submissionId || null,
    trackingUrl: record.trackingUrl || null,
    stages: buildStagesObject(record.stages || {}),
    summary: {
      isComplete,
      isSuccess
    }
  });
});

// Risk analyzer endpoint consumed by landing analytics screens.
app.get('/api/claims/:claimId/analyzer', (req, res) => {
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

  const status = String(record.status || 'processing').toLowerCase();
  const stages = record.stages || {};
  const failedStages = CLAIM_STAGE_ORDER.filter((k) => stages[k] === 'failed').length;
  const pendingStages = CLAIM_STAGE_ORDER.filter((k) => ['pending', 'in_progress'].includes(stages[k])).length;
  const completionRatio = CLAIM_STAGE_ORDER.length === 0
    ? 0
    : CLAIM_STAGE_ORDER.filter((k) => stages[k] === 'completed').length / CLAIM_STAGE_ORDER.length;

  const dataCompleteness = Math.max(0, Math.min(1, 0.95 - (record.patientId ? 0 : 0.4) - (record.patientName ? 0 : 0.35)));
  const codeMapping = Math.max(0, Math.min(1, 0.75 + completionRatio * 0.2 - failedStages * 0.08));
  const eligibility = Math.max(0, Math.min(1, status === 'failed' ? 0.45 : 0.8));
  const fraudSignals = Math.max(0, Math.min(1, 0.25 + (status === 'failed' ? 0.18 : 0.05)));
  const slaRisk = Math.max(0, Math.min(1, 0.2 + pendingStages * 0.08 + failedStages * 0.12));

  const score100 = Math.round(((dataCompleteness + codeMapping + eligibility + fraudSignals + slaRisk) / 5) * 100);

  res.json({
    success: true,
    claimId,
    generatedAt: new Date().toISOString(),
    risk: {
      score100,
      level: score100 >= 80 ? 'low' : (score100 >= 60 ? 'medium' : 'high'),
      subscores: {
        dataCompleteness,
        codeMapping,
        eligibility,
        fraudSignals,
        slaRisk
      }
    },
    recommendations: [
      status === 'failed'
        ? 'Review signing and NPHIES submission configuration before retrying.'
        : 'Monitor pending stages and retry only if terminal failure occurs.'
    ]
  });
});

app.post('/api/copilot/chat', async (req, res) => {
  try {
    const message = String(req.body?.message || '').trim();
    const context = req.body?.context || {};

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    const prompt = [
      'You are SBS Copilot. Reply in concise operational language.',
      `User message: ${message}`,
      `Context: ${JSON.stringify(context)}`
    ].join('\n');

    const response = await axios.post(`http://127.0.0.1:${PORT}/api/gemini/generate`, {
      prompt
    }, {
      timeout: 25000
    });

    const replyText = response.data?.text || 'No response from AI provider';

    return res.json({
      success: true,
      reply: replyText,
      source: response.data?.model || (response.data?.isMock ? 'mock' : 'gemini-proxy'),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.json({
      success: true,
      reply: 'Copilot is temporarily degraded. Continue with claim submission, then verify status in dashboard.',
      source: 'fallback',
      timestamp: new Date().toISOString(),
      warning: extractErrorMessage(error, 'Copilot fallback activated')
    });
  }
});

app.post('/api/normalizer/normalize', handleNormalizeRequest);
app.post('/api/normalize', handleNormalizeRequest);

// Financial and signer aliases used by /sbs SPA bundle.
app.post('/api/validate', async (req, res) => {
  try {
    const response = await requestWithServiceFallback(FINANCIAL_BASE_URLS, '/validate', {
      method: 'POST',
      data: req.body || {}
    });
    res.json(response.data);
  } catch (error) {
    if (error?.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(502).json({
      success: false,
      error: 'Financial rules service unavailable',
      details: extractErrorMessage(error, 'Validation failed')
    });
  }
});

app.post('/api/sign', async (req, res) => {
  try {
    const body = req.body || {};
    const payload = body.payload || body.claim || body;
    const facility_id = Number(body.facility_id || body.facilityId || payload?.facility_id || 1);
    const response = await requestWithServiceFallback(SIGNER_BASE_URLS, '/sign', {
      method: 'POST',
      data: { facility_id, payload }
    });
    res.json(response.data);
  } catch (error) {
    if (error?.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(502).json({
      success: false,
      error: 'Signer service unavailable',
      details: extractErrorMessage(error, 'Signing failed')
    });
  }
});

app.post('/api/eligibility/check', (req, res) => {
  const memberId = String(req.body?.memberId || '').trim();
  const payerId = String(req.body?.payerId || '').trim();
  const dateOfService = String(req.body?.dateOfService || new Date().toISOString().slice(0, 10));

  if (!memberId) {
    return res.status(400).json({
      success: false,
      error: 'memberId is required'
    });
  }

  const denied = /deny|blocked|inactive|expired/i.test(`${memberId} ${payerId}`);
  const eligible = !denied;

  return res.json({
    success: true,
    eligible,
    plan: eligible ? 'SBS Standard Plus' : 'Member Eligibility Review Required',
    benefits: eligible ? ['consultation', 'diagnostics', 'pharmacy'] : [],
    coverage: eligible
      ? { consultation: '80%', diagnostics: '70%', pharmacy: '60%' }
      : { consultation: '0%', diagnostics: '0%', pharmacy: '0%' },
    source: 'sbs-landing-eligibility-engine',
    notes: eligible
      ? `Eligible as of ${dateOfService}`
      : 'Member requires manual payer verification before claim submission',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/prior-auth/submit', (req, res) => {
  const memberId = String(req.body?.memberId || '').trim();
  const procedureCode = String(req.body?.procedureCode || req.body?.serviceCode || '').trim();

  if (!memberId || !procedureCode) {
    return res.status(400).json({
      success: false,
      error: 'memberId and procedureCode are required'
    });
  }

  const pending = /surg|mri|ct|onc|high/i.test(procedureCode);
  const authId = `PA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return res.json({
    success: true,
    authId,
    status: pending ? 'pending_review' : 'approved',
    eta: pending ? '24-48 hours' : 'immediate',
    notes: pending
      ? 'Submitted for medical necessity review'
      : 'Auto-approved for standard policy limits',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/simulation/scenarios', async (req, res) => {
  try {
    const response = await requestWithServiceFallback(SIMULATION_BASE_URLS, '/scenarios', {
      method: 'GET'
    });
    return res.json(response.data);
  } catch (error) {
    return res.json({
      success: true,
      scenarios: [
        { code: 'success', name: 'Successful Claim', description: 'Happy-path claim submission' },
        { code: 'normalization_error', name: 'Normalization Error', description: 'Invalid or unmapped service code' },
        { code: 'signing_error', name: 'Signing Error', description: 'Missing/invalid certificate for signing' },
        { code: 'nphies_reject', name: 'NPHIES Rejection', description: 'Downstream API rejected the claim' }
      ],
      source: 'fallback'
    });
  }
});

app.get('/api/simulation/service-catalog', async (req, res) => {
  try {
    const response = await requestWithServiceFallback(SIMULATION_BASE_URLS, '/service-catalog', {
      method: 'GET'
    });
    return res.json(response.data);
  } catch (error) {
    return res.json({
      success: true,
      catalog: buildFallbackSimulationCatalog(),
      source: 'fallback'
    });
  }
});

app.post('/api/simulation/generate-test-claim', async (req, res) => {
  try {
    const response = await requestWithServiceFallback(SIMULATION_BASE_URLS, '/generate-test-claim', {
      method: 'POST',
      data: req.body || {}
    });
    return res.json(response.data);
  } catch (error) {
    const claimType = String(req.body?.claim_type || req.body?.claimType || 'professional');
    const fallbackCatalog = buildFallbackSimulationCatalog();
    const services = fallbackCatalog[claimType] || fallbackCatalog.professional;
    return res.json({
      success: true,
      source: 'fallback',
      claim_data: {
        patientName: 'Frontend Audit',
        patientId: `1${Math.floor(100000000 + Math.random() * 899999999)}`,
        memberId: `MEM-${Math.floor(100000 + Math.random() * 899999)}`,
        payerId: 'PAYER-001',
        providerId: 'PROV-001',
        claimType,
        userEmail: 'frontend.audit@example.com',
        diagnosis: { code: 'J06.9', display: 'Acute upper respiratory infection, unspecified' },
        serviceDate: new Date().toISOString(),
        services: services.slice(0, 2)
      }
    });
  }
});

app.post('/api/submit-claim-enhanced', async (req, res) => {
  try {
    const body = req.body || {};
    const services = Array.isArray(body.services) ? body.services : [];
    const firstService = services[0] || {};

    const mappedItems = services.map((service, index) => ({
      sequence: index + 1,
      internal_code: service.internalCode || service.internal_code || service.serviceCode || '',
      service_code: service.sbsCode || service.sbs_code || service.internalCode || service.internal_code || '',
      service_desc: service.description || service.description_en || '',
      description: service.description || service.description_en || '',
      quantity: Number(service.quantity || 1),
      unitPrice: Number(service.unitPrice || service.standard_price || 0)
    }));

    const submitPayload = {
      patientName: body.patientName,
      patientId: body.patientId,
      memberId: body.memberId,
      payerId: body.payerId,
      providerId: body.providerId,
      claimType: body.claimType,
      userEmail: body.userEmail,
      facility_id: Number(body.facilityId || body.facility_id || 1),
      items: mappedItems,
      internal_code: mappedItems[0]?.internal_code || '',
      service_code: mappedItems[0]?.service_code || '',
      service_desc: mappedItems[0]?.service_desc || '',
      description: mappedItems[0]?.description || '',
      quantity: Number(mappedItems[0]?.quantity || 1),
      unit_price: Number(mappedItems[0]?.unitPrice || 0)
    };

    const response = await axios.post(`http://127.0.0.1:${PORT}/api/submit-claim`, submitPayload, {
      timeout: 45000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error?.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(502).json({
      success: false,
      error: 'Enhanced claim submission failed',
      details: extractErrorMessage(error, 'Unable to submit enhanced claim')
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
          nphiesSubmission: successStatus === 'failed' ? 'failed' : (successStatus === 'completed' ? 'completed' : 'in_progress')
        }
      });
    }

    res.json({
      success: true,
      message: 'Claim submitted successfully',
      claimId,
      submissionId: n8nResponse?.submissionId,
      trackingUrl: n8nResponse?.trackingUrl,
      status: n8nResponse?.status || 'processing',
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
      'https://n8n.brainsait.cloud/webhook/sbs-claim-submission';

    console.log('🚀 Triggering n8n workflow...');

    const response = await axios.post(N8N_WEBHOOK_URL, claimData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SBS-Landing-API/1.0',
        ...(process.env.SBS_API_KEY ? { 'X-API-Key': process.env.SBS_API_KEY } : {})
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

async function triggerAutomationWorkflow(payload) {
  const workflowWebhook = process.env.N8N_AUTOMATION_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;

  if (!workflowWebhook) {
    throw new Error('N8N automation webhook is not configured');
  }

  const response = await axios.post(workflowWebhook, payload, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'SBS-Workflow-Orchestrator/1.0'
    },
    timeout: 30000
  });

  return response.data || {};
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
    const status = String(record.status || 'processing').toLowerCase();
    const isComplete = isTerminalStatus(status);
    const isSuccess = isSuccessfulStatus(status);

    res.json({
      success: true,
      claimId: record.claimId,
      status,
      statusLabel: statusLabel(status),
      isComplete,
      isSuccess,
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
    const claims = all.slice(start, start + limit).map((c) => {
      const status = String(c.status || 'processing').toLowerCase();
      const isComplete = isTerminalStatus(status);
      const isSuccess = isSuccessfulStatus(status);
      return {
        claimId: c.claimId,
        patientId: c.patientId,
        patientName: c.patientName,
        claimType: c.claimType,
        facilityId: c.facilityId,
        status,
        submissionId: c.submissionId,
        trackingUrl: c.trackingUrl,
        createdAt: c.createdAt,
        lastUpdate: c.lastUpdate,
        submittedAt: c.createdAt,
        completedAt: isComplete ? (c.lastUpdate || c.createdAt) : null,
        isComplete,
        isSuccess,
        stages: buildStagesObject(c.stages || {}),
        progress: buildProgress(c.stages || {})
      };
    });

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
      { name: 'normalizer', bases: NORMALIZER_BASE_URLS, healthPath: '/health' },
      { name: 'signer', bases: SIGNER_BASE_URLS, healthPath: '/health' },
      { name: 'financial-rules', bases: FINANCIAL_BASE_URLS, healthPath: '/health' },
      { name: 'nphies-bridge', bases: NPHIES_BASE_URLS, healthPath: '/health' }
    ];

    const statusChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await requestWithServiceFallback(service.bases, service.healthPath, {
            method: 'GET',
            timeout: 8000
          });
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

// Trigger a full simulation workflow from UI (claim upload -> nphies + PR request)
app.post('/api/workflows/simulate-claim-pipeline', async (req, res) => {
  try {
    const requestId = `WF-${Date.now()}`;
    const simulationPayload = {
      eventType: 'claim_pipeline_simulation',
      requestId,
      triggerSource: req.body?.source || 'dashboard',
      initiatedAt: new Date().toISOString(),
      workflow: {
        name: 'Claim Upload to NPHIES Submission',
        stages: [
          'claim_upload_received',
          'normalization',
          'financial_rules',
          'payload_signing',
          'nphies_submission'
        ]
      },
      automation: {
        createPullRequest: true,
        repository: process.env.REPO_NAME || 'brainsait/sbs',
        baseBranch: process.env.REPO_BASE_BRANCH || 'main',
        headBranch: process.env.REPO_HEAD_BRANCH || 'automation/claim-pipeline-simulation',
        title: 'chore: workflow simulation report and next-step automation',
        body: 'Automated simulation trigger from SBS UI. Includes claim workflow checkpoints and suggested follow-up tasks.'
      }
    };

    const automationResponse = await triggerAutomationWorkflow(simulationPayload);

    return res.json({
      success: true,
      message: 'Workflow simulation started. n8n orchestration and PR request dispatched.',
      requestId,
      executionId: automationResponse.executionId || automationResponse.id || null,
      data: automationResponse
    });
  } catch (error) {
    console.error('❌ Workflow simulation trigger failed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger workflow simulation',
      message: error.message
    });
  }
});

// ============================================================================
// MASTERLINC AGENT ENDPOINTS
// ============================================================================

// MasterLinc orchestrated claim submission
app.post('/api/submit-claim-linc', async (req, res) => {
  try {
    const claimData = req.body;
    
    // Validate required fields
    if (!claimData.patientId || !claimData.facilityId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, facilityId'
      });
    }

    const masterlincUrl = process.env.MASTERLINC_URL || 'http://localhost:4000';
    
    // Start MasterLinc workflow
    const workflowResponse = await axios.post(`${masterlincUrl}/workflows/start`, {
      workflow_type: 'claim_processing',
      data: claimData,
      requester: 'sbs-landing'
    });

    const workflowId = workflowResponse.data.workflow_id;
    
    // Store in claimStore
    const claimId = claimData.claimId || `CLM-${Date.now()}`;
    claimStore.set(claimId, {
      claimId,
      workflowId,
      patientId: claimData.patientId,
      facilityId: claimData.facilityId,
      status: 'processing',
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      stages: {
        received: 'completed'
      },
      orchestrationType: 'masterlinc'
    });

    res.json({
      success: true,
      claimId,
      workflowId,
      status: 'processing',
      message: 'Claim submitted via MasterLinc orchestration',
      trackingUrl: `/api/workflow-status/${workflowId}`
    });

  } catch (error) {
    console.error('❌ MasterLinc submission failed:', error.message);
    
    // Fallback to direct submission if MasterLinc unavailable
    if (error.code === 'ECONNREFUSED' || error.response?.status === 503) {
      console.log('⚠️ MasterLinc unavailable, falling back to direct submission');
      try {
        const directResult = await callDirectSBSPipeline(req.body);
        return res.json({
          success: true,
          ...directResult,
          fallback: true,
          message: 'Claim submitted via direct pipeline (MasterLinc unavailable)'
        });
      } catch (fallbackError) {
        return res.status(500).json({
          success: false,
          error: 'Both MasterLinc and direct submission failed',
          details: fallbackError.message
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit claim via MasterLinc',
      details: error.message
    });
  }
});

// Verify eligibility via AuthLinc
app.post('/api/verify-eligibility', async (req, res) => {
  try {
    const { patientId, insuranceId, payerId, serviceDate } = req.body;
    
    if (!patientId || !insuranceId || !payerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, insuranceId, payerId'
      });
    }

    const masterlincUrl = process.env.MASTERLINC_URL || 'http://localhost:4000';
    
    // Start eligibility check workflow
    const workflowResponse = await axios.post(`${masterlincUrl}/workflows/start`, {
      workflow_type: 'eligibility_check',
      data: {
        patient_id: patientId,
        insurance_id: insuranceId,
        payer_id: payerId,
        service_date: serviceDate
      },
      requester: 'sbs-landing'
    });

    const workflowId = workflowResponse.data.workflow_id;
    
    // Poll for result (simple implementation)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const statusResponse = await axios.get(`${masterlincUrl}/workflows/${workflowId}`);
    
    res.json({
      success: true,
      workflowId,
      eligibility: statusResponse.data.result || {
        eligible: false,
        message: 'Processing eligibility check'
      },
      status: statusResponse.data.status
    });

  } catch (error) {
    console.error('❌ Eligibility verification failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to verify eligibility',
      details: error.message
    });
  }
});

// Audit claim via ComplianceLinc
app.post('/api/audit-claim', async (req, res) => {
  try {
    const claimData = req.body;
    
    if (!claimData.claimId && !claimData.claim_data) {
      return res.status(400).json({
        success: false,
        error: 'Missing claim data'
      });
    }

    const masterlincUrl = process.env.MASTERLINC_URL || 'http://localhost:4000';
    
    // Start compliance audit workflow
    const workflowResponse = await axios.post(`${masterlincUrl}/workflows/start`, {
      workflow_type: 'compliance_audit',
      data: claimData.claim_data || claimData,
      requester: 'sbs-landing'
    });

    const workflowId = workflowResponse.data.workflow_id;
    
    // Poll for result
    await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
    
    const statusResponse = await axios.get(`${masterlincUrl}/workflows/${workflowId}`);
    
    res.json({
      success: true,
      workflowId,
      audit: statusResponse.data.result || {
        overall_status: 'processing',
        message: 'Compliance audit in progress'
      },
      status: statusResponse.data.status
    });

  } catch (error) {
    console.error('❌ Compliance audit failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to audit claim',
      details: error.message
    });
  }
});

// Get agent status from MasterLinc
app.get('/api/agents/status', async (req, res) => {
  try {
    const masterlincUrl = process.env.MASTERLINC_URL || 'http://localhost:4000';
    
    const agentsResponse = await axios.get(`${masterlincUrl}/agents`);
    
    res.json({
      success: true,
      agents: agentsResponse.data.agents,
      total: agentsResponse.data.total,
      timestamp: agentsResponse.data.timestamp
    });

  } catch (error) {
    console.error('❌ Failed to get agent status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent status',
      details: error.message,
      agents: []
    });
  }
});

// Get workflow status
app.get('/api/workflow-status/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const masterlincUrl = process.env.MASTERLINC_URL || 'http://localhost:4000';
    
    const statusResponse = await axios.get(`${masterlincUrl}/workflows/${workflowId}`);
    
    res.json({
      success: true,
      workflow: statusResponse.data
    });

  } catch (error) {
    console.error('❌ Failed to get workflow status:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow status',
      details: error.message
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

🔗 MasterLinc Integration:
   - Submit claim: http://localhost:${PORT}/api/submit-claim-linc
   - Verify eligibility: http://localhost:${PORT}/api/verify-eligibility
   - Audit claim: http://localhost:${PORT}/api/audit-claim
   - Agent status: http://localhost:${PORT}/api/agents/status
   
   🔗 n8n webhook: ${process.env.N8N_WEBHOOK_URL || 'https://n8n.brainsait.cloud/webhook/iot-events'}
   🔗 MasterLinc: ${process.env.MASTERLINC_URL || 'Not configured'}
   🌍 Environment: ${process.env.NODE_ENV || 'development'}

Ready to process claims! 📋
`);
});

module.exports = app;
