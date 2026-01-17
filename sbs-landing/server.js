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
app.use(cors({
  origin: ['https://your-frontend-domain.com', 'http://localhost:3001'], // Replace with your actual frontend domains
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

// Main claim submission endpoint
app.post('/api/submit-claim', upload.single('claimFile'), async (req, res) => {
  console.log('✅ POST /api/submit-claim endpoint hit', {
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
    if (!patientName || !patientId || !claimType || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
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
      claimType: claimType,
      submissionDate: new Date().toISOString(),
      
      // User Credentials (for NPHIES authentication)
      credentials: userCredentials ? JSON.parse(userCredentials) : null,
      
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
        const resolvedPath = path.resolve(req.file.path);
        if (!resolvedPath.startsWith(UPLOAD_DIR + path.sep)) {
          throw new Error('Invalid file path for uploaded file');
        }
        const fileContent = await fs.readFile(resolvedPath);
        claimData.attachment.base64Content = fileContent.toString('base64');
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }

    console.log('📋 Claim submission received:', {
      patientId,
      claimType,
      hasFile: !!req.file,
      timestamp: new Date().toISOString()
    });

    // Trigger n8n workflow
    const n8nResponse = await triggerN8nWorkflow(claimData);

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

    res.json({
      success: true,
      message: 'Claim submitted successfully',
      claimId: n8nResponse.claimId || `CLAIM-${Date.now()}`,
      status: 'processing',
      data: {
        patientId,
        submissionId: n8nResponse.submissionId,
        estimatedProcessingTime: '2-5 minutes',
        trackingUrl: n8nResponse.trackingUrl
      }
    });

  } catch (error) {
    console.error('❌ Error processing claim:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process claim submission',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Trigger n8n workflow
async function triggerN8nWorkflow(claimData) {
  try {
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
      claimId: response.data.claimId || `CLAIM-${Date.now()}`,
      submissionId: response.data.submissionId || response.data.executionId,
      trackingUrl: response.data.trackingUrl || null,
      status: response.data.status || 'processing'
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
    
    // Step 1: Normalize
    const normalizeResponse = await axios.post(`${SBS_NORMALIZER_URL}/normalize`, {
      data: claimData
    });
    
    // Step 2: Apply Financial Rules
    const rulesResponse = await axios.post(`${SBS_FINANCIAL_RULES_URL}/apply-rules`, {
      data: normalizeResponse.data
    });
    
    // Step 3: Sign
    const signResponse = await axios.post(`${SBS_SIGNER_URL}/sign`, {
      data: rulesResponse.data
    });
    
    // Step 4: Submit to NPHIES
    const nphiesResponse = await axios.post(`${SBS_NPHIES_BRIDGE_URL}/submit`, {
      data: signResponse.data,
      credentials: claimData.credentials
    });
    
    return {
      success: true,
      claimId: nphiesResponse.data.claimId,
      submissionId: nphiesResponse.data.submissionId,
      status: 'submitted',
      trackingUrl: null
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
    
    // Query n8n or SBS services for status
    // This would typically query your database or n8n executions API
    
    res.json({
      success: true,
      claimId,
      status: 'processing', // Would be fetched from database
      lastUpdate: new Date().toISOString(),
      stages: {
        validation: 'completed',
        normalization: 'completed',
        financialRules: 'completed',
        signing: 'completed',
        nphiesSubmission: 'in-progress'
      }
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
