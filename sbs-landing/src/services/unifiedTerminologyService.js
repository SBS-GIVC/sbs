/**
 * Unified Terminology Service
 * Integrates multiple healthcare coding systems into a single interface
 * Supports: SBS, ICD-10-AM, ICD-11, SNOMED CT, LOINC, DRG, RxNorm
 */

// Code system definitions with FHIR canonical URLs
export const CODE_SYSTEMS = {
  SBS: {
    id: 'sbs',
    name: 'Saudi Billing System',
    uri: 'http://chi.gov.sa/sbs',
    version: '3.1',
    publisher: 'Council of Health Insurance (CHI)',
    count: 10466,
    color: '#137fec',
    icon: 'receipt_long',
    loaded: true
  },
  ICD10AM: {
    id: 'icd10am',
    name: 'ICD-10-AM',
    uri: 'http://hl7.org/fhir/sid/icd-10-am',
    version: '12th Edition',
    publisher: 'IHPA / WHO',
    count: 17000,
    color: '#ef4444',
    icon: 'diagnosis',
    loaded: false
  },
  ICD11: {
    id: 'icd11',
    name: 'ICD-11',
    uri: 'http://id.who.int/icd/release/11',
    version: '2025',
    publisher: 'WHO',
    count: 17000,
    color: '#f97316',
    icon: 'medical_information',
    loaded: false
  },
  SNOMED: {
    id: 'snomed',
    name: 'SNOMED CT',
    uri: 'http://snomed.info/sct',
    version: 'July 2025',
    publisher: 'SNOMED International',
    count: 360000,
    color: '#8b5cf6',
    icon: 'psychology',
    loaded: false
  },
  DRG: {
    id: 'drg',
    name: 'Diagnosis Related Groups',
    uri: 'http://chi.gov.sa/drg',
    version: 'AR-DRG 11.0',
    publisher: 'IHPA / CHI',
    count: 800,
    color: '#22c55e',
    icon: 'category',
    loaded: false
  },
  LOINC: {
    id: 'loinc',
    name: 'LOINC',
    uri: 'http://loinc.org',
    version: '2.81',
    publisher: 'Regenstrief Institute',
    count: 100000,
    color: '#06b6d4',
    icon: 'science',
    loaded: false
  },
  RXNORM: {
    id: 'rxnorm',
    name: 'RxNorm',
    uri: 'http://www.nlm.nih.gov/research/umls/rxnorm',
    version: 'Weekly',
    publisher: 'US NLM',
    count: 120000,
    color: '#ec4899',
    icon: 'medication',
    loaded: false
  },
  ACHI: {
    id: 'achi',
    name: 'ACHI',
    uri: 'http://hl7.org/fhir/sid/achi',
    version: '12th Edition',
    publisher: 'IHPA',
    count: 6000,
    color: '#14b8a6',
    icon: 'surgical',
    loaded: false
  }
};

// Code system category mappings
export const SYSTEM_CATEGORIES = {
  diagnosis: ['icd10am', 'icd11', 'snomed'],
  procedure: ['sbs', 'achi', 'snomed'],
  laboratory: ['loinc'],
  medication: ['rxnorm'],
  billing: ['sbs', 'drg'],
  clinical: ['snomed', 'icd10am', 'icd11']
};

/**
 * Unified Terminology Service Class
 */
class UnifiedTerminologyService {
  constructor() {
    this.systems = CODE_SYSTEMS;
    this.cache = new Map();
    this.mappings = new Map();
    
    // WHO ICD-11 API configuration
    this.icd11Config = {
      baseUrl: 'https://id.who.int/icd',
      apiUrl: 'https://id.who.int/icd/release/11/2025/mms',
      tokenUrl: 'https://icdaccessmanagement.who.int/connect/token',
      clientId: import.meta.env?.VITE_ICD11_CLIENT_ID || '',
      clientSecret: import.meta.env?.VITE_ICD11_CLIENT_SECRET || ''
    };
    
    // SNOMED Snowstorm API
    this.snomedConfig = {
      baseUrl: 'https://snowstorm.ihtsdotools.org/snowstorm/snomed-ct',
      fhirUrl: 'https://snowstorm.ihtsdotools.org/fhir'
    };
    
    // LOINC API
    this.loincConfig = {
      baseUrl: 'https://fhir.loinc.org',
      searchUrl: 'https://loinc.org/api'
    };
  }

  /**
   * Get all available code systems
   */
  getSystems() {
    return Object.values(this.systems);
  }

  /**
   * Get system by ID
   */
  getSystem(systemId) {
    return Object.values(this.systems).find(s => s.id === systemId);
  }

  /**
   * Unified search across all or selected systems
   */
  async search(query, options = {}) {
    const {
      systems = null,
      category = null,
      limit = 20,
      language = 'en',
      includeInactive = false
    } = options;

    // Determine which systems to search
    let targetSystems = Object.keys(this.systems);
    
    if (systems && systems.length > 0) {
      targetSystems = systems;
    } else if (category) {
      targetSystems = SYSTEM_CATEGORIES[category] || targetSystems;
    }

    const results = [];
    const searchPromises = [];

    for (const systemId of targetSystems) {
      const system = this.getSystem(systemId);
      if (!system) continue;

      // Search each system
      searchPromises.push(
        this.searchSystem(systemId, query, { limit, language })
          .then(codes => codes.map(code => ({
            ...code,
            system: system.id,
            systemName: system.name,
            systemUri: system.uri,
            systemColor: system.color
          })))
          .catch(err => {
            console.warn(`Search failed for ${systemId}:`, err);
            return [];
          })
      );
    }

    const allResults = await Promise.all(searchPromises);
    
    // Merge and sort by relevance
    for (const systemResults of allResults) {
      results.push(...systemResults);
    }

    // Sort by score (higher is better)
    results.sort((a, b) => (b.score || 0) - (a.score || 0));

    return {
      total: results.length,
      results: results.slice(0, limit),
      systems: targetSystems.map(id => this.getSystem(id)).filter(Boolean)
    };
  }

  /**
   * Search a specific code system
   */
  async searchSystem(systemId, query, options = {}) {
    const { limit = 20, language = 'en' } = options;

    switch (systemId) {
      case 'sbs':
        return this.searchSBS(query, limit);
      case 'icd11':
        return this.searchICD11(query, limit, language);
      case 'snomed':
        return this.searchSNOMED(query, limit);
      case 'loinc':
        return this.searchLOINC(query, limit);
      case 'icd10am':
        return this.searchICD10AM(query, limit);
      case 'drg':
        return this.searchDRG(query, limit);
      default:
        return [];
    }
  }

  /**
   * Search SBS codes (local)
   */
  async searchSBS(query, limit) {
    // Use the existing AI assistant service
    const { aiAssistant } = await import('./aiAssistantService');
    const results = aiAssistant.localSearch(query, null, limit);
    return results.map(code => ({
      code: code.code,
      display: code.desc,
      displayAr: code.descAr,
      category: code.category,
      score: code.score
    }));
  }

  /**
   * Search WHO ICD-11 API
   */
  async searchICD11(query, limit, language = 'en') {
    const cacheKey = `icd11:${query}:${language}:${limit}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Get access token
      const token = await this.getICD11Token();
      
      const response = await fetch(
        `${this.icd11Config.apiUrl}/search?q=${encodeURIComponent(query)}&subtreeFilterUsesFoundationDescendants=false&includeKeywordResult=true&useFlexisearch=true&flatResults=true&highlightingEnabled=false&medicalCodingMode=true`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Accept-Language': language,
            'API-Version': 'v2'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`ICD-11 API error: ${response.status}`);
      }

      const data = await response.json();
      const results = (data.destinationEntities || []).slice(0, limit).map(entity => ({
        code: entity.theCode,
        display: entity.title,
        definition: entity.definition,
        chapter: entity.chapter,
        score: entity.score || 0.8
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error('ICD-11 search error:', error);
      return this.mockICD11Search(query, limit);
    }
  }

  /**
   * Get ICD-11 OAuth token
   */
  async getICD11Token() {
    const tokenCacheKey = 'icd11_token';
    const cached = this.cache.get(tokenCacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const response = await fetch(this.icd11Config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.icd11Config.clientId,
        client_secret: this.icd11Config.clientSecret,
        scope: 'icdapi_access'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get ICD-11 token');
    }

    const data = await response.json();
    
    this.cache.set(tokenCacheKey, {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000) - 60000
    });

    return data.access_token;
  }

  /**
   * Search SNOMED CT via Snowstorm
   */
  async searchSNOMED(query, limit) {
    const cacheKey = `snomed:${query}:${limit}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `${this.snomedConfig.baseUrl}/MAIN/concepts?term=${encodeURIComponent(query)}&limit=${limit}&activeFilter=true`,
        {
          headers: { 'Accept': 'application/json' }
        }
      );

      if (!response.ok) {
        throw new Error(`SNOMED API error: ${response.status}`);
      }

      const data = await response.json();
      const results = (data.items || []).map(concept => ({
        code: concept.conceptId,
        display: concept.fsn?.term || concept.pt?.term,
        displayShort: concept.pt?.term,
        moduleId: concept.moduleId,
        active: concept.active,
        score: 0.9
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error('SNOMED search error:', error);
      return this.mockSNOMEDSearch(query, limit);
    }
  }

  /**
   * Search LOINC via FHIR API
   */
  async searchLOINC(query, limit) {
    const cacheKey = `loinc:${query}:${limit}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(
        `${this.loincConfig.baseUrl}/CodeSystem/$lookup?system=http://loinc.org&code=${encodeURIComponent(query)}`,
        {
          headers: { 'Accept': 'application/fhir+json' }
        }
      );

      if (!response.ok) {
        // Fall back to search
        const searchResponse = await fetch(
          `${this.loincConfig.baseUrl}/CodeSystem?_content=${encodeURIComponent(query)}&_count=${limit}`,
          { headers: { 'Accept': 'application/fhir+json' } }
        );
        
        if (!searchResponse.ok) {
          throw new Error('LOINC search failed');
        }
        
        const searchData = await searchResponse.json();
        return this.parseFHIRBundle(searchData, 'loinc');
      }

      const data = await response.json();
      const results = this.parseLOINCParameters(data);
      
      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error('LOINC search error:', error);
      return this.mockLOINCSearch(query, limit);
    }
  }

  /**
   * Search ICD-10-AM codes (local database)
   */
  async searchICD10AM(query, limit) {
    // Will be expanded when ICD-10-AM is imported
    return this.mockICD10Search(query, limit);
  }

  /**
   * Search DRG codes (local database)
   */
  async searchDRG(query, limit) {
    // Will be expanded when DRG is imported
    return this.mockDRGSearch(query, limit);
  }

  /**
   * Get cross-system mappings for a code
   */
  async getMappings(code, sourceSystem) {
    const cacheKey = `mapping:${sourceSystem}:${code}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const mappings = [];

    // Check local mapping database
    const localMappings = await this.getLocalMappings(code, sourceSystem);
    mappings.push(...localMappings);

    // Try external translation services
    if (sourceSystem === 'snomed') {
      const icdMappings = await this.translateSNOMEDtoICD(code);
      mappings.push(...icdMappings);
    }

    this.cache.set(cacheKey, mappings);
    return mappings;
  }

  /**
   * Translate SNOMED to ICD-10
   */
  async translateSNOMEDtoICD(snomedCode) {
    try {
      const response = await fetch(
        `${this.snomedConfig.fhirUrl}/ConceptMap/$translate?code=${snomedCode}&system=http://snomed.info/sct&target=http://hl7.org/fhir/sid/icd-10`,
        { headers: { 'Accept': 'application/fhir+json' } }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return this.parseTranslationResult(data);
    } catch (error) {
      console.error('SNOMED to ICD translation error:', error);
      return [];
    }
  }

  /**
   * Get local mappings from database
   */
  async getLocalMappings(code, sourceSystem) {
    // This will query the PostgreSQL mapping table when implemented
    return [];
  }

  /**
   * Parse FHIR Parameters for LOINC
   */
  parseLOINCParameters(params) {
    const results = [];
    const parameters = params.parameter || [];
    
    const code = parameters.find(p => p.name === 'code')?.valueCode;
    const display = parameters.find(p => p.name === 'display')?.valueString;
    
    if (code) {
      results.push({
        code,
        display,
        score: 1.0
      });
    }
    
    return results;
  }

  /**
   * Parse FHIR Bundle
   */
  parseFHIRBundle(bundle, system) {
    const results = [];
    const entries = bundle.entry || [];
    
    for (const entry of entries) {
      if (entry.resource) {
        results.push({
          code: entry.resource.code || entry.resource.id,
          display: entry.resource.display || entry.resource.name,
          score: entry.search?.score || 0.5
        });
      }
    }
    
    return results;
  }

  /**
   * Parse translation result
   */
  parseTranslationResult(params) {
    const mappings = [];
    const result = params.parameter?.find(p => p.name === 'result')?.valueBoolean;
    
    if (!result) return mappings;

    const matches = params.parameter?.filter(p => p.name === 'match') || [];
    
    for (const match of matches) {
      const parts = match.part || [];
      const equivalence = parts.find(p => p.name === 'equivalence')?.valueCoding?.code;
      const concept = parts.find(p => p.name === 'concept')?.valueCoding;
      
      if (concept) {
        mappings.push({
          system: concept.system,
          code: concept.code,
          display: concept.display,
          equivalence: equivalence || 'related',
          confidence: equivalence === 'equivalent' ? 1.0 : 0.8
        });
      }
    }
    
    return mappings;
  }

  // ============= MOCK DATA FOR DEVELOPMENT =============

  mockICD11Search(query, limit) {
    const mockData = [
      { code: 'BA00', display: 'Essential hypertension', chapter: 'Cardiovascular' },
      { code: 'BA01', display: 'Hypertensive heart disease', chapter: 'Cardiovascular' },
      { code: '5A11', display: 'Type 2 diabetes mellitus', chapter: 'Endocrine' },
      { code: '2A00', display: 'Acute appendicitis', chapter: 'Digestive' },
      { code: 'CA40', display: 'Acute myocardial infarction', chapter: 'Cardiovascular' },
      { code: 'KB23', display: 'Femoral neck fracture', chapter: 'Musculoskeletal' },
      { code: 'DB90', display: 'Pneumonia', chapter: 'Respiratory' },
      { code: 'FA01', display: 'Acute kidney failure', chapter: 'Genitourinary' }
    ];

    const q = query.toLowerCase();
    return mockData
      .filter(d => d.display.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
      .slice(0, limit)
      .map(d => ({ ...d, score: 0.85 }));
  }

  mockSNOMEDSearch(query, limit) {
    const mockData = [
      { code: '38341003', display: 'Hypertensive disorder' },
      { code: '73211009', display: 'Diabetes mellitus' },
      { code: '74400008', display: 'Appendicitis' },
      { code: '22298006', display: 'Myocardial infarction' },
      { code: '71620000', display: 'Fracture of femoral neck' },
      { code: '233604007', display: 'Pneumonia' },
      { code: '14669001', display: 'Acute kidney failure' },
      { code: '254837009', display: 'Malignant neoplasm of breast' }
    ];

    const q = query.toLowerCase();
    return mockData
      .filter(d => d.display.toLowerCase().includes(q) || d.code.includes(q))
      .slice(0, limit)
      .map(d => ({ ...d, score: 0.9 }));
  }

  mockLOINCSearch(query, limit) {
    const mockData = [
      { code: '2339-0', display: 'Glucose [Mass/volume] in Blood' },
      { code: '2345-7', display: 'Glucose [Mass/volume] in Serum or Plasma' },
      { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
      { code: '2093-3', display: 'Cholesterol [Mass/volume] in Serum or Plasma' },
      { code: '2571-8', display: 'Triglyceride [Mass/volume] in Serum or Plasma' },
      { code: '26453-1', display: 'Erythrocytes [#/volume] in Blood' },
      { code: '26464-8', display: 'Leukocytes [#/volume] in Blood' },
      { code: '38483-4', display: 'Creatinine [Mass/volume] in Blood' }
    ];

    const q = query.toLowerCase();
    return mockData
      .filter(d => d.display.toLowerCase().includes(q) || d.code.includes(q))
      .slice(0, limit)
      .map(d => ({ ...d, score: 0.85 }));
  }

  mockICD10Search(query, limit) {
    const mockData = [
      { code: 'I10', display: 'Essential (primary) hypertension' },
      { code: 'E11.9', display: 'Type 2 diabetes mellitus without complications' },
      { code: 'K35.80', display: 'Unspecified acute appendicitis' },
      { code: 'I21.9', display: 'Acute myocardial infarction, unspecified' },
      { code: 'S72.00', display: 'Fracture of unspecified part of neck of femur' },
      { code: 'J18.9', display: 'Pneumonia, unspecified organism' },
      { code: 'N17.9', display: 'Acute kidney failure, unspecified' },
      { code: 'C50.9', display: 'Malignant neoplasm of breast, unspecified' }
    ];

    const q = query.toLowerCase();
    return mockData
      .filter(d => d.display.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
      .slice(0, limit)
      .map(d => ({ ...d, score: 0.85 }));
  }

  mockDRGSearch(query, limit) {
    const mockData = [
      { code: 'DRG-194', display: 'Simple Pneumonia & Pleurisy w CC', weight: 0.9, avgLOS: 3.2 },
      { code: 'DRG-195', display: 'Simple Pneumonia & Pleurisy w/o CC', weight: 0.6, avgLOS: 2.1 },
      { code: 'DRG-470', display: 'Major Hip and Knee Joint Replacement', weight: 1.9, avgLOS: 2.5 },
      { code: 'DRG-291', display: 'Heart Failure & Shock w MCC', weight: 1.5, avgLOS: 4.8 },
      { code: 'DRG-292', display: 'Heart Failure & Shock w CC', weight: 1.0, avgLOS: 3.5 },
      { code: 'DRG-340', display: 'Appendectomy w Complicated Principal Diag w MCC', weight: 2.8, avgLOS: 6.5 },
      { code: 'DRG-341', display: 'Appendectomy w Complicated Principal Diag w CC', weight: 1.8, avgLOS: 4.2 },
      { code: 'DRG-342', display: 'Appendectomy w Complicated Principal Diag w/o CC', weight: 1.2, avgLOS: 2.8 }
    ];

    const q = query.toLowerCase();
    return mockData
      .filter(d => d.display.toLowerCase().includes(q) || d.code.toLowerCase().includes(q))
      .slice(0, limit)
      .map(d => ({ ...d, score: 0.85 }));
  }
}

// Export singleton
export const unifiedTerminology = new UnifiedTerminologyService();

// Export class for testing
export { UnifiedTerminologyService };
