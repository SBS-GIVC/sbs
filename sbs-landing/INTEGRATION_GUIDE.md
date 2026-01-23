# GIVC Health Integration Guide

## 🎯 Quick Start

This guide explains how the GIVC Health React frontend is integrated with the SBS engine.

### Development Setup

1. **Install Dependencies**
   ```bash
   cd sbs-landing
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Run Development Servers**
   ```bash
   # Option A: Run both frontend and backend
   npm run dev:all

   # Option B: Run separately
   # Terminal 1: Backend
   npm run dev

   # Terminal 2: Frontend
   npm run dev:frontend
   ```

4. **Access Applications**
   - Frontend (React/Vite): http://localhost:3001
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health

## 📂 Project Structure

```
sbs-landing/
├── src/                          # React source code
│   ├── components/              # React components
│   │   ├── Header.jsx          # App header with navigation
│   │   ├── Footer.jsx          # App footer
│   │   ├── ClinicianTab.jsx    # Doctor/scribe interface
│   │   ├── CoderTab.jsx        # Medical coding interface
│   │   ├── ValidatorTab.jsx    # Validation & appeals
│   │   └── PipelineStep.jsx    # Pipeline status indicator
│   ├── services/               # API integration
│   │   ├── geminiService.js    # Gemini AI proxy
│   │   └── apiService.js       # Backend API client
│   ├── utils/                  # Utilities
│   │   ├── i18n.js            # Translations (EN/AR)
│   │   └── middleware.js       # SBS normalization logic
│   ├── App.jsx                 # Main React component
│   ├── main.jsx               # React entry point
│   └── index.css              # Global styles
├── index.html                  # HTML template
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind CSS config
├── postcss.config.js          # PostCSS config
├── server.js                   # Express backend server
├── package.json               # Dependencies & scripts
└── Dockerfile                 # Docker build config
```

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    GIVC Health UI                        │
│              (React - Port 3001 dev)                     │
└────────────┬────────────────────────────────────────────┘
             │
             │ HTTP Requests
             ▼
┌─────────────────────────────────────────────────────────┐
│          SBS Landing API (Express - Port 3000)          │
│  Routes:                                                 │
│  - POST /api/gemini/generate      (AI proxy)            │
│  - POST /api/submit-claim         (Claim submission)    │
│  - GET  /api/claim-status/:id     (Status tracking)     │
│  - POST /api/normalize            (Code normalization)  │
└────────────┬────────────────────────────────────────────┘
             │
             ├─────────────┬──────────────┬───────────────┐
             ▼             ▼              ▼               ▼
      Normalizer      Signer        Financial        NPHIES
      (Port 8000)   (Port 8001)   Rules (8002)   Bridge (8003)
```

## 🔌 API Integration

### 1. Gemini AI Service

**Frontend**: `src/services/geminiService.js`
```javascript
import { callGemini } from '../services/geminiService';

const response = await callGemini(
  "Generate SOAP note from: Patient has fever",
  "You are a medical documentation assistant"
);
```

**Backend**: `server.js:371-420`
```javascript
app.post('/api/gemini/generate', async (req, res) => {
  // Proxies requests to Google Gemini API
  // Hides API key from frontend
});
```

### 2. Code Normalization

**Frontend**: `src/utils/middleware.js`
```javascript
import { normalizeCode } from '../utils/middleware';

const result = await normalizeCode(
  "LAB_001",           // Internal code
  "Blood test",        // Description
  "en"                 // Language
);
// Returns: { sbs_code, desc, fee, source, confidence, rationale }
```

**Backend Integration**:
- Tries local mapping first
- Falls back to backend `/api/normalize` endpoint
- Uses AI as last resort

### 3. Claim Submission

**Frontend**: `src/services/apiService.js`
```javascript
import { APIService } from '../services/apiService';

const result = await APIService.submitClaim({
  patientName: "Ahmad Ali",
  patientId: "12345",
  services: [...]
});
```

## 🌐 Environment Variables

### Required for Frontend

Create `.env` file in `sbs-landing/`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
PORT=3000
NODE_ENV=development
```

### CORS Configuration

The backend must allow frontend origin:
```bash
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
```

## 🏗️ Build & Deploy

### Local Production Build

```bash
# Build React app
npm run build

# Output: dist/ directory

# Preview production build
npm run preview

# Run production server (serves dist/ + API)
npm start
```

### Docker Build

```bash
# Build image (multi-stage)
docker build -t givc-health .

# Run container
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e SBS_NORMALIZER_URL=http://normalizer:8000 \
  givc-health
```

### GitHub Pages Deployment

**Automated**: Pushes to `main` trigger `.github/workflows/pages.yml`

**Manual**:
```bash
# Build locally
npm run build

# Deploy dist/ to gh-pages branch
# (Use gh-pages package or manual push)
```

**Configure API URL**:
```bash
# In GitHub repo settings > Variables
PAGES_API_BASE_URL=https://your-api-domain.com
```

## 🧪 Testing Integration

### Test Gemini Proxy

```bash
curl -X POST http://localhost:3000/api/gemini/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Summarize: Patient has cough",
    "systemInstruction": "You are a medical assistant"
  }'
```

### Test Code Normalization

```bash
curl -X POST http://localhost:3000/api/normalize \
  -H "Content-Type: application/json" \
  -d '{
    "internal_code": "LAB_001",
    "description": "Complete Blood Count",
    "facility_id": 1
  }'
```

### Test Health Check

```bash
curl http://localhost:3000/health
```

## 🔧 Troubleshooting

### Issue: Frontend can't reach backend

**Solution**: Check CORS settings in `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
```

### Issue: Gemini API errors

**Solution**:
1. Verify `GEMINI_API_KEY` is set in `.env`
2. Check quota limits at https://makersuite.google.com/
3. Check model name (`GEMINI_MODEL`)

### Issue: Build fails

**Solution**:
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Docker build fails

**Solution**: Ensure all required files exist:
```bash
ls src/ index.html vite.config.js tailwind.config.js postcss.config.js
```

## 📚 Component Usage

### Using Translation (i18n)

```jsx
import { i18n } from '../utils/i18n';

function MyComponent() {
  const [lang, setLang] = useState('en');
  const t = i18n[lang];

  return <h1>{t.title}</h1>; // GIVC HEALTH
}
```

### Using Pipeline Status

```jsx
import { PipelineStep } from '../components/PipelineStep';
import { Layers } from 'lucide-react';

<PipelineStep
  label="Normalization"
  icon={Layers}
  status="loading"  // 'idle' | 'loading' | 'complete'
  active={true}
/>
```

## 🚀 Performance Tips

1. **Code Splitting**: Vite automatically splits code
2. **Lazy Loading**: Components are loaded on-demand
3. **Caching**: API responses cached in service worker (PWA)
4. **Build Optimization**: `npm run build` minifies and optimizes

## 🔐 Security Considerations

1. **API Key Protection**: Never expose `GEMINI_API_KEY` in frontend
2. **CORS**: Restrict `ALLOWED_ORIGINS` in production
3. **Input Validation**: All user inputs sanitized
4. **Rate Limiting**: Backend enforces rate limits
5. **HTTPS**: Always use HTTPS in production

## 📖 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [FHIR R4 Standard](https://hl7.org/fhir/R4/)

## 🆘 Support

- **Issues**: https://github.com/Fadil369/sbs/issues
- **Email**: support@brainsait.com
- **Documentation**: See main README.md

---

**Last Updated**: 2026-01-23
**Integration Version**: 1.0.0
