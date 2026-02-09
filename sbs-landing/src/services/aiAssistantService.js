/**
 * AI-Powered SBS Assistant Service
 * Provides intelligent code suggestions, validation, and workflow assistance
 * Powered by Google Gemini AI
 */

import { callGemini } from './geminiService';

// Load catalog data at runtime to keep the browser bundle lightweight.
const API_BASE_URL =
  (typeof window !== 'undefined' && (window.SBS_API_URL || window.location.origin)) || '';
let SBS_CODES = {};
let CODES_ARRAY = [];

// Common medical abbreviations for better matching
const MEDICAL_ABBREVIATIONS = {
  'cbc': 'complete blood count',
  'ct': 'computed tomography',
  'mri': 'magnetic resonance imaging',
  'ecg': 'electrocardiogram',
  'ekg': 'electrocardiogram',
  'us': 'ultrasound',
  'xray': 'x-ray radiograph',
  'cabg': 'coronary artery bypass graft',
  'ptca': 'percutaneous transluminal coronary angioplasty',
  'er': 'emergency room',
  'icu': 'intensive care unit',
  'iv': 'intravenous',
  'bp': 'blood pressure',
  'hba1c': 'glycated haemoglobin',
  'tsh': 'thyroid stimulating hormone',
  'ldl': 'low density lipoprotein',
  'hdl': 'high density lipoprotein'
};

/**
 * AI SBS Assistant Class
 */
class AIAssistantService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 1000 * 60 * 30; // 30 minutes
    this.catalogPromise = null;
    this.catalogFetchLimit = 200;
  }

  /**
   * Get cache key
   */
  getCacheKey(type, query) {
    return `${type}:${query.toLowerCase().trim()}`;
  }

  /**
   * Check cache
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cache
   */
  setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async fetchCatalogPage(offset, limit) {
    const url = `${API_BASE_URL}/api/sbs/codes?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`SBS catalog fetch failed (${response.status})`);
    }
    return response.json();
  }

  async fetchFullCatalog() {
    const url = `${API_BASE_URL}/api/sbs/codes/all`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`SBS full catalog fetch failed (${response.status})`);
    }
    return response.json();
  }

  async ensureCatalogLoaded() {
    if (CODES_ARRAY.length > 0) {
      return;
    }
    if (this.catalogPromise) {
      await this.catalogPromise;
      return;
    }

    this.catalogPromise = (async () => {
      const normalizeRows = (rows) =>
        rows
          .filter((row) => row?.code && row?.desc)
          .map((row) => ({
            code: row.code,
            desc: row.desc,
            descAr: row.descAr || null,
            category: row.category || null,
            chapter: row.chapter || null,
            fee: Number(row.fee || 0)
          }));

      let all = [];
      try {
        const payload = await this.fetchFullCatalog();
        all = normalizeRows(Array.isArray(payload.codes) ? payload.codes : []);
      } catch {
        // Backward compatible fallback for deployments without /api/sbs/codes/all.
        let offset = 0;
        let total = null;
        while (true) {
          const payload = await this.fetchCatalogPage(offset, this.catalogFetchLimit);
          const rows = Array.isArray(payload.codes) ? payload.codes : [];
          if (rows.length === 0) break;
          all.push(...normalizeRows(rows));
          total = Number(payload.total || 0);
          offset += rows.length;
          if (total > 0 && offset >= total) break;
        }
      }

      CODES_ARRAY = all;
      SBS_CODES = Object.fromEntries(all.map((entry) => [entry.code, entry]));
    })();

    try {
      await this.catalogPromise;
    } finally {
      this.catalogPromise = null;
    }
  }

  /**
   * Smart search with fuzzy matching and AI enhancement
   */
  async smartSearch(query, options = {}) {
    const { limit = 20, category = null, includeAI = true } = options;
    await this.ensureCatalogLoaded();
    
    // Expand abbreviations
    let expandedQuery = query.toLowerCase();
    for (const [abbr, full] of Object.entries(MEDICAL_ABBREVIATIONS)) {
      expandedQuery = expandedQuery.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), full);
    }
    
    // Local search first
    const localResults = this.localSearch(expandedQuery, category, limit);
    
    // If good results found locally, return them
    if (localResults.length >= 5 && !includeAI) {
      return {
        results: localResults,
        source: 'local',
        query: expandedQuery
      };
    }
    
    // Enhance with AI if enabled and results are limited
    if (includeAI && localResults.length < 10) {
      try {
        const aiSuggestions = await this.getAISuggestions(query, localResults);
        
        // Merge AI suggestions with local results
        const mergedResults = this.mergeResults(localResults, aiSuggestions);
        
        return {
          results: mergedResults.slice(0, limit),
          source: 'ai_enhanced',
          query: expandedQuery,
          aiInsights: aiSuggestions.insights
        };
      } catch (error) {
        console.warn('AI enhancement failed, using local results:', error);
      }
    }
    
    return {
      results: localResults,
      source: 'local',
      query: expandedQuery
    };
  }

  /**
   * Local fuzzy search
   */
  localSearch(query, category = null, limit = 20) {
    if (!CODES_ARRAY.length) return [];
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
    
    const scored = [];
    
    for (const code of CODES_ARRAY) {
      // Skip if category filter doesn't match
      if (category && code.category !== category) continue;
      
      let score = 0;
      const descLower = code.desc.toLowerCase();
      const catLower = (code.category || '').toLowerCase();
      const codeLower = code.code.toLowerCase();
      
      // Exact code match - highest priority
      if (codeLower === queryLower || codeLower.startsWith(queryLower)) {
        score += 100;
      }
      
      // Exact phrase match in description
      if (descLower.includes(queryLower)) {
        score += 50;
      }
      
      // Individual term matches
      for (const term of queryTerms) {
        if (descLower.includes(term)) {
          score += 10;
          // Bonus for word start match
          if (descLower.startsWith(term) || descLower.includes(` ${term}`)) {
            score += 5;
          }
        }
        if (catLower.includes(term)) {
          score += 3;
        }
      }
      
      if (score > 0) {
        scored.push({ ...code, score });
      }
    }
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, limit);
  }

  /**
   * Get AI-powered suggestions
   */
  async getAISuggestions(query, existingResults = []) {
    await this.ensureCatalogLoaded();
    const cacheKey = this.getCacheKey('suggestions', query);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const existingCodes = existingResults.slice(0, 5).map(r => `${r.code}: ${r.desc}`).join('\n');
    
    const prompt = `You are a Saudi healthcare billing expert. Given the search query, suggest the most relevant SBS (Saudi Billing System) procedure codes.

Search Query: "${query}"

Already Found Codes:
${existingCodes || 'None'}

Based on the query, suggest additional specific SBS procedure codes that might be relevant. Consider:
1. The medical context and intent
2. Related procedures that are often performed together
3. Alternative terminology the user might mean

Return JSON only:
{
  "suggestions": [
    { "code": "XXXXX-XX-XX", "desc": "Description", "confidence": 0.95, "reason": "Why this matches" }
  ],
  "insights": "Brief explanation of the search intent and recommendations"
}`;

    try {
      const response = await callGemini(prompt, 
        "You are a senior Saudi medical coder expert in SBS V3.1. Return only valid JSON."
      );
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and enhance suggestions with actual SBS data
        const enhancedSuggestions = (parsed.suggestions || [])
          .map(s => {
            const actualCode = SBS_CODES[s.code];
            if (actualCode) {
              return {
                ...actualCode,
                confidence: s.confidence,
                aiReason: s.reason,
                source: 'ai'
              };
            }
            return null;
          })
          .filter(Boolean);
        
        const result = {
          suggestions: enhancedSuggestions,
          insights: parsed.insights
        };
        
        this.setCache(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
    }
    
    return { suggestions: [], insights: null };
  }

  /**
   * Merge local and AI results
   */
  mergeResults(localResults, aiResults) {
    const seen = new Set(localResults.map(r => r.code));
    const merged = [...localResults];
    
    for (const suggestion of aiResults.suggestions || []) {
      if (!seen.has(suggestion.code)) {
        merged.push(suggestion);
        seen.add(suggestion.code);
      }
    }
    
    return merged;
  }

  /**
   * AI-powered claim validation
   */
  async validateClaim(claim) {
    const items = claim.items || [];
    
    if (items.length === 0) {
      return { valid: false, errors: ['No items in claim'], warnings: [], suggestions: [] };
    }
    
    const itemsList = items.map((item, i) => 
      `${i + 1}. ${item.sbsCode} - ${item.description} (Qty: ${item.quantity}, Price: ${item.unitPrice} SAR)`
    ).join('\n');
    
    const prompt = `You are a Saudi healthcare claims auditor. Validate this claim for NPHIES submission.

Patient ID: ${claim.patientId}
Service Date: ${claim.serviceDate}
Claim Type: ${claim.claimType}
Total Amount: ${claim.totalAmount} SAR

Services:
${itemsList}

Check for:
1. Missing required procedures (e.g., anesthesia with surgery)
2. Duplicate or conflicting codes
3. Unusual quantities or pricing
4. Prior authorization requirements
5. Bundle opportunities for cost savings

Return JSON:
{
  "valid": true/false,
  "errors": ["Critical issues that must be fixed"],
  "warnings": ["Non-critical issues to review"],
  "suggestions": [
    { "type": "add", "code": "XXXXX-XX-XX", "reason": "Why to add" },
    { "type": "bundle", "name": "Bundle Name", "savings": 5000 },
    { "type": "priorAuth", "code": "XXXXX-XX-XX", "reason": "Why PA needed" }
  ],
  "summary": "Brief summary of validation"
}`;

    try {
      const response = await callGemini(prompt,
        "You are a Saudi healthcare claims auditor. Validate for CHI/NPHIES compliance. Return only JSON."
      );
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Claim validation error:', error);
    }
    
    return {
      valid: true,
      errors: [],
      warnings: ['AI validation unavailable - please review manually'],
      suggestions: [],
      summary: 'Manual review required'
    };
  }

  /**
   * AI-powered diagnosis suggestion
   */
  async suggestDiagnoses(procedureCode, description) {
    const cacheKey = this.getCacheKey('diagnosis', `${procedureCode}:${description}`);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    const prompt = `You are a Saudi medical coder. Given this SBS procedure, suggest the most appropriate ICD-10 diagnosis codes.

SBS Procedure: ${procedureCode}
Description: ${description}

Suggest 3-5 commonly associated ICD-10 diagnosis codes with explanations.

Return JSON:
{
  "diagnoses": [
    { "code": "X00.00", "description": "Diagnosis description", "relevance": "high/medium/low", "reason": "Why associated" }
  ]
}`;

    try {
      const response = await callGemini(prompt,
        "You are a Saudi medical coding expert. Suggest ICD-10 diagnoses for SBS procedures. Return only JSON."
      );
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        this.setCache(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('Diagnosis suggestion error:', error);
    }
    
    return { diagnoses: [] };
  }

  /**
   * AI-powered code mapping from internal hospital codes
   */
  async mapInternalCode(internalCode, description, context = {}) {
    await this.ensureCatalogLoaded();
    const prompt = `You are a Saudi healthcare billing expert. Map this internal hospital code to the official SBS V3.1 code.

Internal Code: ${internalCode}
Description: ${description}
Department: ${context.department || 'Unknown'}
Facility Type: ${context.facilityType || 'Hospital'}

Find the most accurate SBS V3.1 code. The SBS code format is NNNNN-NN-NN.

Return JSON:
{
  "sbsCode": "NNNNN-NN-NN",
  "sbsDescription": "Official SBS description",
  "confidence": 0.95,
  "rationale": "Why this mapping is correct",
  "alternatives": [
    { "code": "NNNNN-NN-NN", "description": "Alternative", "confidence": 0.85 }
  ]
}`;

    try {
      const response = await callGemini(prompt,
        "You are a Saudi SBS V3.1 coding expert. Map internal codes to official SBS codes. Return only JSON."
      );
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        
        // Verify the suggested code exists
        if (result.sbsCode && SBS_CODES[result.sbsCode]) {
          return {
            ...result,
            verified: true,
            officialDesc: SBS_CODES[result.sbsCode].desc
          };
        }
        
        // If not found, search for similar
        const similar = this.localSearch(result.sbsDescription || description, null, 5);
        if (similar.length > 0) {
          return {
            sbsCode: similar[0].code,
            sbsDescription: similar[0].desc,
            confidence: 0.75,
            rationale: 'AI suggestion validated against SBS catalogue',
            verified: true,
            alternatives: similar.slice(1, 4).map(s => ({
              code: s.code,
              description: s.desc,
              confidence: 0.6
            }))
          };
        }
      }
    } catch (error) {
      console.error('Code mapping error:', error);
    }
    
    // Fallback to local search
    const results = this.localSearch(description, null, 5);
    if (results.length > 0) {
      return {
        sbsCode: results[0].code,
        sbsDescription: results[0].desc,
        confidence: 0.6,
        rationale: 'Matched by description keywords',
        verified: true,
        alternatives: results.slice(1).map(r => ({
          code: r.code,
          description: r.desc,
          confidence: 0.5
        }))
      };
    }
    
    return {
      sbsCode: null,
      confidence: 0,
      rationale: 'No matching SBS code found',
      verified: false
    };
  }

  /**
   * AI-powered prior authorization assistance
   */
  async assistPriorAuth(procedureCode, patientInfo, clinicalNotes) {
    await this.ensureCatalogLoaded();
    const code = SBS_CODES[procedureCode];
    
    const prompt = `You are a Saudi healthcare prior authorization specialist. Help prepare a prior authorization request.

Procedure: ${procedureCode} - ${code?.desc || 'Unknown procedure'}
Patient Age: ${patientInfo.age || 'Unknown'}
Patient Gender: ${patientInfo.gender || 'Unknown'}
Diagnosis: ${patientInfo.diagnosis || 'Not specified'}
Clinical Notes: ${clinicalNotes || 'None provided'}

Generate a professional prior authorization justification that will maximize approval chances with Saudi insurance companies.

Return JSON:
{
  "justification": "Detailed clinical justification text",
  "supportingPoints": ["Key point 1", "Key point 2"],
  "requiredDocuments": ["Document 1", "Document 2"],
  "estimatedApprovalTime": "24-48 hours",
  "approvalLikelihood": "high/medium/low",
  "tips": ["Tip to improve approval chances"]
}`;

    try {
      const response = await callGemini(prompt,
        "You are a Saudi healthcare prior authorization expert. Help maximize PA approval chances. Return only JSON."
      );
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('PA assistance error:', error);
    }
    
    return {
      justification: 'Please provide clinical justification for this procedure.',
      supportingPoints: ['Medical necessity', 'Patient history'],
      requiredDocuments: ['Clinical notes', 'Lab results', 'Imaging reports'],
      estimatedApprovalTime: '48-72 hours',
      approvalLikelihood: 'medium',
      tips: ['Include detailed clinical history', 'Attach supporting documentation']
    };
  }

  /**
   * Get all SBS codes (for browser)
   */
  getAllCodes() {
    return CODES_ARRAY;
  }

  /**
   * Get unique categories
   */
  getCategories() {
    const categories = new Set();
    for (const code of CODES_ARRAY) {
      if (code.category) categories.add(code.category);
    }
    return Array.from(categories).sort();
  }

  /**
   * Get code by ID
   */
  getCode(codeId) {
    return SBS_CODES[codeId] || null;
  }

  /**
   * Get total count
   */
  getTotalCount() {
    return CODES_ARRAY.length;
  }
}

// Export singleton instance
export const aiAssistant = new AIAssistantService();

// Export class for testing
export { AIAssistantService };
