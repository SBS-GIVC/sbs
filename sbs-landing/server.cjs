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

// Security middleware with proper CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
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
    
    if (!GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not configured, returning mock response');
      return res.json({
        success: true,
        text: generateMockResponse(prompt),
        isMock: true
      });
    }

    try {
      // Call Gemini API
      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          systemInstruction: systemInstruction ? {
            parts: [{ text: systemInstruction }]
          } : undefined,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      const text = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      res.json({
        success: true,
        text: text
      });
    } catch (apiError) {
      // If Gemini API fails, provide mock response instead of error
      console.warn('⚠️ Gemini API unavailable, using mock response:', apiError.message);
      return res.json({
        success: true,
        text: generateMockResponse(prompt),
        isMock: true,
        fallbackReason: 'AI service temporarily unavailable'
      });
    }

  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
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
    const {
      patientName,
      patientId,
      memberId,
      payerId,
      providerId,
      claimType,
      userEmail
      // Note: userCredentials removed for security - authenticate server-side
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
          await fs.unlink(req.file.path);
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
    const normalizeResponse = await axios.post((process.env.NORMALIZER_URL || 'http://localhost:8000') + '/normalize', {
      data: claimData
    });
    
    // Step 2: Apply Financial Rules
    const rulesResponse = await axios.post((process.env.FINANCIAL_RULES_URL || 'http://localhost:8002') + '/apply-rules', {
      data: normalizeResponse.data
    });
    
    // Step 3: Sign
    const signResponse = await axios.post((process.env.SIGNER_URL || 'http://localhost:8001') + '/sign', {
      data: rulesResponse.data
    });
    
    // Step 4: Submit to NPHIES
    const nphiesResponse = await axios.post((process.env.NPHIES_BRIDGE_URL || 'http://localhost:8003') + '/submit', {
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
